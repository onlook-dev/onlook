import { useCallback, useState } from 'react';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import type { HarnessId } from '@studio/events';
import { isBusy, markFor } from '@studio/onboarding-ui';
import type { HarnessTileState } from '@studio/onboarding-ui';
import { ShimmerText } from '@studio/chat-ui';

import { setupStrings, SetupDialogHost } from '../agent-setup/SetupDialogHost.js';
import { TILE_GLYPHS } from '../agent-setup/glyphs.js';
import { claudeTileState, codexTileState } from '../agents/mapping.js';
import { useAgentSetupStore } from '../agent-setup/store.js';
import { t } from '@studio/i18n';
import type { StringKey } from '@studio/i18n';
import { OnboardingAccount, OnboardingFooter } from './OnboardingParts.js';
import { OnboardingShell } from './OnboardingShell.js';

const COLUMN_WIDTH = 528;

const ROLES: readonly StringKey[] = [
  'onboarding.about.role.designer',
  'onboarding.about.role.developer',
  'onboarding.about.role.founder',
  'onboarding.about.role.product',
  'onboarding.about.role.other',
];
const SOURCES: readonly StringKey[] = [
  'onboarding.about.source.x',
  'onboarding.about.source.linkedin',
  'onboarding.about.source.friend',
  'onboarding.about.source.github',
  'onboarding.about.source.youtube',
  'onboarding.about.source.ai',
  'onboarding.about.source.other',
];

export function ChoiceChip({ label, isSelected, onSelect, leading, trailing }: { label: React.ReactNode; isSelected: boolean; onSelect: () => void; leading?: React.ReactNode; trailing?: React.ReactNode }): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      className="about-chip"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 'var(--size-element-md)',
        padding: leading === undefined ? '0 var(--spacing-3)' : '0 var(--spacing-3) 0 10px',
        borderRadius: 'var(--radius-element)',
        ...({ cornerShape: 'superellipse(1.5)' } as React.CSSProperties),
        border: 0,
        font: 'inherit',
        fontSize: 14,
        cursor: 'pointer',
      }}
    >
      {leading}
      {label}
      {trailing}
    </button>
  );
}

export const MARK_RULES = `.about-chip{background:rgba(255,255,255,0.08);color:var(--color-text-primary)}.about-chip:hover{background:rgba(255,255,255,0.14)}.about-chip:active{background:rgba(255,255,255,0.18)}.about-chip[aria-pressed=true]{background:var(--color-text-primary);color:#000}.about-chip[aria-pressed=true]:hover{background:color-mix(in srgb,var(--color-text-primary) 88%,transparent)}.about-chip-mark{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;flex:none}.about-chip-mark>*{display:flex;align-items:center;justify-content:center}.about-chip-mark svg{display:block;width:20px;height:20px}`;

const MARK_COLOR = { attention: 'var(--color-icon-red)', connected: 'var(--color-icon-green)' } as const;

function AgentChip({ tile, name, glyph, onSelect }: { tile: HarnessTileState; name: string; glyph: React.ReactNode; onSelect: () => void }): React.JSX.Element | null {
  if (tile.kind !== 'harness') return null;
  const mark = markFor(tile);
  const busy = tile.state !== 'idle' && isBusy(tile.state);
  return (
    <ChoiceChip
      label={busy ? <ShimmerText isActive type="body" hasGlow={false}>{name}</ShimmerText> : name}
      isSelected={mark === 'connected'}
      onSelect={onSelect}
      leading={<span aria-hidden="true" className="about-chip-mark">{glyph}</span>}
      trailing={mark === 'attention' ? <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: MARK_COLOR.attention }} /> : undefined}
    />
  );
}

function Question({ title, children }: { title: StringKey; children: React.ReactNode }): React.JSX.Element {
  return (
    <VStack width="100%" gap={3} align="start">
      <Text type="body" weight="medium" color="primary">
        {t(title)}
      </Text>
      {children}
    </VStack>
  );
}

function ChipRow({ options, value, onChange }: { options: readonly StringKey[]; value: StringKey | null; onChange: (next: StringKey | null) => void }): React.JSX.Element {
  return (
    <HStack gap={2} style={{ flexWrap: 'wrap' }}>
      {options.map((option) => (
        <ChoiceChip key={option} label={t(option)} isSelected={value === option} onSelect={() => { onChange(value === option ? null : option); }} />
      ))}
    </HStack>
  );
}

export interface AboutYouStepProps {
  onContinue: () => void;
  onBack?: () => void;
  aside?: React.ReactNode;
}

export function AboutYouStep({ onContinue, onBack, aside }: AboutYouStepProps): React.JSX.Element {
  const [role, setRole] = useState<StringKey | null>(null);
  const [source, setSource] = useState<StringKey | null>(null);
  const [open, setOpen] = useState<HarnessId | null>(null);
  const [otherAgent, setOtherAgent] = useState(false);
  const claude = useAgentSetupStore((s) => s.claude);
  const claudeSettled = useAgentSetupStore((s) => s.claudeSettled);
  const codex = useAgentSetupStore((s) => s.codex);
  const codexSignInAttempted = useAgentSetupStore((s) => s.codexSignInAttempted);
  const touched = useAgentSetupStore((s) => s.touched);
  const facts = { claude, claudeSettled, codex, codexSignInAttempted, touched };
  const strings = setupStrings().ui;

  const tap = useCallback((harness: HarnessId): void => {
    setOpen(harness);
    const { tapClaude, tapCodex } = useAgentSetupStore.getState();
    void (harness === 'claude' ? tapClaude('onboarding') : tapCodex());
  }, []);

  return (
    <>
      <style href="about-chip-mark" precedence="medium">{MARK_RULES}</style>
      <OnboardingShell data-testid="onboarding-about" aside={aside} headerEnd={<OnboardingAccount />}>
        {/* Built like the agent step: heading, then the asks, then the shared footer. */}
        <VStack width="100%" gap={8} align="start" style={{ maxWidth: COLUMN_WIDTH }}>
          <h1 data-testid="onboarding-heading" style={{ margin: 0, textWrap: 'balance', fontSize: 40, lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 'var(--font-weight-normal)', color: 'var(--color-text-primary)' }}>
            {t('onboarding.about.title')}
          </h1>
          <VStack width="100%" gap={6} align="start">
            <Question title="onboarding.about.role.title">
              <ChipRow options={ROLES} value={role} onChange={setRole} />
            </Question>
            <Question title="onboarding.about.agent.title">
              <HStack gap={2} style={{ flexWrap: 'wrap' }}>
                <AgentChip tile={claudeTileState(facts)} name={strings.harnessName.claude} glyph={TILE_GLYPHS.claude} onSelect={() => { tap('claude'); }} />
                <AgentChip tile={codexTileState(facts)} name={strings.harnessName.codex} glyph={TILE_GLYPHS.codex} onSelect={() => { tap('codex'); }} />
                {/* OpenCode, Cursor and the rest: nothing to set up here yet, so it records the answer like any other bubble. */}
                <ChoiceChip label={t('onboarding.about.agent.other')} isSelected={otherAgent} onSelect={() => { setOtherAgent(!otherAgent); }}
                  leading={<span aria-hidden="true" className="about-chip-mark">{TILE_GLYPHS.other}</span>} />
              </HStack>
            </Question>
            <Question title="onboarding.about.source.title">
              <ChipRow options={SOURCES} value={source} onChange={setSource} />
            </Question>
          </VStack>
        </VStack>
        <OnboardingFooter
          hasBack={onBack !== undefined}
          {...(onBack === undefined ? {} : { onBack })}
          isContinueEnabled={role !== null || source !== null || otherAgent || Object.values(touched).some(Boolean)}
          onContinue={onContinue}
        />
      </OnboardingShell>
      {open === null ? null : (
        <SetupDialogHost key={open} harness={open} entryPoint="onboarding" onClose={() => { setOpen(null); }}
          onSwitchHarness={() => { tap(open === 'claude' ? 'codex' : 'claude'); }} />
      )}
    </>
  );
}
