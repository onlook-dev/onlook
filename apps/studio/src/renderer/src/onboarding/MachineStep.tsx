import { Button } from '@astryxdesign/core/Button';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden';
import { machineHasFailure, MACHINE_AGENT_HELP, type HarnessId, type MachineCheckId } from '@studio/events';
import { CopyBlock } from '@studio/onboarding-ui';
import { CircleCheckIcon, CodeBracketsGlyph, ConsoleIcon, CopyIcon, FolderIcon, GlyphLoadingCircle, GlyphOpenPrompt, WindowGlyph } from '../icons/glyphs.js';
import { t } from '@studio/i18n';
import { OnboardingAccount, OnboardingDisplayHeading, OnboardingFooter, OnboardingHeading } from './OnboardingParts.js';
import { OnboardingShell } from './OnboardingShell.js';
import { machineDetail, machineRows, type MachineRecovery, type MachineRow, type MachineState } from './machine-rows.js';
import { chooseMachineFolder, closeMachineDetail, copyMachineCommand, installMachineTools, openMachineDetail, openMachineHelp, recheckMachineCheck, useMachineStore } from './machine-store.js';
import type { SetupHarnessId } from '@studio/events';
import { useConnectedAgents } from './agents.js';

const CHECK_ICONS = { git: CodeBracketsGlyph, workspace: FolderIcon, port: WindowGlyph, helper: ConsoleIcon } as const;
const ACTION_LABELS = { install: 'machine.install', choose: 'machine.choose', fix: 'machine.fix' } as const;
/** White for what Onlook does for you, muted for what you choose or have to sort out (ONL-3111). */
const ACTION_VARIANTS = { install: 'primary', choose: 'secondary', fix: 'secondary' } as const;
/** Named as the person knows them: Codex's agent signs in with ChatGPT. */
const AGENT_LABELS: Record<SetupHarnessId, 'machine.open.claude' | 'machine.open.chatgpt'> = { claude: 'machine.open.claude', codex: 'machine.open.chatgpt' };
/** With the focus-ring padding below it, the title sits 24px under the wordmark, where the prototype draws it (ONL-3111). */
const HEADER_DROP = 'var(--spacing-5)';
// The prototype's rhythm needs room the window's own 600px floor does not have; there the screen keeps the tighter one it had (ONL-3111).
const COMPACT_RULES = '@media (max-height:720px){.machine-column{margin-top:0 !important;gap:var(--spacing-3) !important}.machine-row{min-height:56px !important;padding-block:var(--spacing-2) !important;padding-inline:var(--spacing-3) !important}}';
const ROW_GLYPH = { width: 20, height: 20, flexShrink: 0 } as const;
/** The copy control reads beside the line, not beside the row icons. */
const BLOCK_GLYPH = { width: 16, height: 16, flexShrink: 0 } as const;
const MARK_GLYPH = { width: 18, height: 18, flexShrink: 0 } as const;
const PHASE_WORDS = {
  checking: 'machine.checking', ready: 'machine.ready', unconfirmed: 'machine.unconfirmed',
  'needs-action': 'machine.needsAction', acting: 'machine.checking', failed: 'machine.notReady',
} as const;

export interface MachineStepViewProps extends MachineState {
  aside?: React.ReactNode;
  onContinue: () => void;
  onBack?: () => void;
  onInstall: () => void;
  onChoose: () => void;
  onFix: (id: MachineCheckId) => void;
  onCheckAgain: () => void;
  onCloseDetail: () => void;
  onCopy: (command: string) => Promise<boolean>;
  onHelp: () => void;
  onOpenAgent: (harness: HarnessId) => void;
  /** The agents this person connected a screen ago: where the prompt is meant to be pasted. None, and the detail view offers no app to open. */
  agents?: readonly HarnessId[];
}

function CheckRow({ row, busy, onInstall, onChoose, onFix }: {
  row: MachineRow;
  /** Another row is already acting, and the screen takes one action at a time (ONL-3111). */
  busy: boolean;
  onInstall: () => void;
  onChoose: () => void;
  onFix: (id: MachineCheckId) => void;
}): React.JSX.Element {
  const Subject = CHECK_ICONS[row.id];
  const press: Record<MachineRecovery, () => void> = { install: onInstall, choose: onChoose, fix: () => { onFix(row.id); } };
  return (
    <HStack width="100%" gap={5} align="center" paddingBlock={3} paddingInline={4} className="machine-row" data-testid={`machine-check-${row.id}`} data-phase={row.phase}
      style={{ border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-page)', minHeight: 64 }}>
      <span aria-hidden="true" style={{ display: 'flex', color: 'var(--color-text-secondary)' }}><Subject style={ROW_GLYPH} /></span>
      <VStack width="100%" gap={0.5} align="start" style={{ minWidth: 0 }}>
        <Text type="body">{t(row.name)}</Text>
        <Text color="secondary" style={{ overflowWrap: 'anywhere' }}>{t(row.line)}</Text>
      </VStack>
      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {row.recovery !== undefined ? (
          <Button label={t(ACTION_LABELS[row.recovery])} variant={ACTION_VARIANTS[row.recovery]} size="sm" isDisabled={busy}
            onClick={press[row.recovery]} data-testid={`machine-action-${row.id}`} />
        ) : row.phase === 'unconfirmed' ? (
          <Text color="secondary">{t('machine.unconfirmed')}</Text>
        ) : row.phase === 'ready' ? (
          <CircleCheckIcon style={MARK_GLYPH} aria-hidden="true" />
        ) : (
          <GlyphLoadingCircle size={18} aria-hidden="true" />
        )}
        {/* The row draws its state as a mark or a button, so the word for it stays in the live region as text. */}
        {row.phase === 'unconfirmed' ? null : (
          <VisuallyHidden data-testid={`machine-status-${row.id}`}>{t(PHASE_WORDS[row.phase])}</VisuallyHidden>
        )}
      </span>
    </HStack>
  );
}

function CheckDetail({ state, agents, onCopy, onHelp, onOpenAgent }: {
  state: MachineState;
  agents: readonly HarnessId[];
  onCopy: (command: string) => Promise<boolean>;
  onHelp: () => void;
  onOpenAgent: (harness: HarnessId) => void;
}): React.JSX.Element | null {
  const detail = machineDetail(state);
  if (detail === undefined) return null;
  const prompt = t(detail.prompt);
  return (
    <VStack width="100%" gap={4} align="start" data-testid="machine-detail">
      <VStack width="100%" gap={2} align="start">
        <Text type="large">{t(detail.title)}</Text>
        <Text color="secondary" style={{ lineHeight: 1.5 }}>{t(detail.body)}</Text>
      </VStack>
      <CopyBlock
        text={prompt}
        copyLabel={t('machine.copy')}
        copiedLabel={t('machine.copied')}
        copyGlyph={<CopyIcon />}
        copiedGlyph={<CircleCheckIcon style={BLOCK_GLYPH} aria-hidden="true" />}
        onCopy={() => onCopy(prompt)}
        actions={agents.map((harness) => ({
          id: harness,
          label: t(AGENT_LABELS[harness as SetupHarnessId]),
          copiesFirst: true,
          onPress: () => { onOpenAgent(harness as SetupHarnessId); },
        }))}
        testId="machine-copy-block"
      />
      {detail.helpLabel === undefined ? null : (
        <Button label={t(detail.helpLabel)} endContent={<GlyphOpenPrompt size={14} />}
          variant="ghost" size="sm" onClick={onHelp} data-testid="machine-help"
          style={{ paddingInline: 0, textDecoration: 'underline' }} />
      )}
      {state.notice === undefined ? null : <output><Text color="secondary">{t(state.notice)}</Text></output>}
    </VStack>
  );
}

export function MachineStepView(props: MachineStepViewProps): React.JSX.Element {
  const { aside, onContinue, onBack, onInstall, onChoose, onFix, onCheckAgain, onCloseDetail, onCopy, onHelp, onOpenAgent, agents = [], ...state } = props;
  const detail = machineDetail(state);
  const blocked = machineHasFailure(state.snapshot.checks);
  const busy = state.action !== undefined;
  return (
    <OnboardingShell data-testid="onboarding-machine" aside={aside} headerEnd={aside === undefined ? undefined : <OnboardingAccount />}>
      {/* One box for the heading and whatever follows it, so the title does not move when a detail view opens (ONL-3111). */}
      <style href="machine-column" precedence="medium">{COMPACT_RULES}</style>
      <VStack width="100%" gap={6} align="start" className="machine-column" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 4, marginInline: -4, marginTop: HEADER_DROP, marginBottom: -4 }}>
        {aside === undefined
          ? <OnboardingHeading title="machine.title" subtitle="machine.subtitle" />
          : <OnboardingDisplayHeading title="machine.title" subtitle="machine.subtitle" />}
        {detail === undefined ? (
          <VStack width="100%" gap={2} align="stretch" aria-live="polite" aria-busy={state.checking || busy}>
            {machineRows(state).map((row) => (
              <CheckRow key={row.id} row={row} busy={busy} onInstall={onInstall} onChoose={onChoose} onFix={onFix} />
            ))}
          </VStack>
        ) : (
          <CheckDetail state={state} agents={agents} onCopy={onCopy} onHelp={onHelp} onOpenAgent={onOpenAgent} />
        )}
      </VStack>
      <VStack width="100%" gap={3} align="start" style={{ flexShrink: 0 }}>
        {detail !== undefined || state.notice === undefined ? null : <output><Text color="secondary">{t(state.notice)}</Text></output>}
        {detail === undefined ? (
          <OnboardingFooter hasBack={onBack !== undefined} onBack={onBack} isContinueEnabled={!blocked} onContinue={onContinue} />
        ) : (
          <HStack width="100%" justify="between" align="center" data-testid="onboarding-footer">
            <Button label={t('onboarding.back')} variant="secondary" size="md" onClick={onCloseDetail} data-testid="onboarding-back" />
            {/* Stays the one filled control while it runs, as the design draws it; the press is dropped rather than the button dimmed. */}
            <Button label={t(busy ? 'machine.checking' : 'machine.again')} icon={busy ? <GlyphLoadingCircle size={16} /> : undefined}
              variant="primary" size="md" onClick={busy ? undefined : onCheckAgain} data-testid="machine-check-again" />
          </HStack>
        )}
      </VStack>
    </OnboardingShell>
  );
}

export function MachineStep(props: { aside?: React.ReactNode; onContinue: () => void; onBack?: () => void }): React.JSX.Element {
  const state = useMachineStore();
  const detail = machineDetail(state);
  const agents = useConnectedAgents();
  return (
    <MachineStepView {...props} {...state} agents={agents}
      onInstall={() => { void installMachineTools(); }}
      onChoose={() => { void chooseMachineFolder(); }}
      onFix={openMachineDetail}
      onCheckAgain={() => { if (detail !== undefined) void recheckMachineCheck(detail.id, detail.again); }}
      onCloseDetail={closeMachineDetail}
      onCopy={copyMachineCommand}
      onHelp={() => { if (detail?.help !== undefined) void openMachineHelp(detail.help); }}
      onOpenAgent={(harness) => { const help = MACHINE_AGENT_HELP[harness]; if (help !== undefined) void openMachineHelp(help); }} />
  );
}
