import { useCallback, useEffect, useState } from 'react';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { Text } from '@astryxdesign/core/Text';
import { GlyphSlot } from '@studio/chat-ui';
import { t } from '@studio/i18n';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { isSetupHarnessId, type HarnessId, type SetupEntryPoint } from '@studio/events';
import { HarnessTile } from '@studio/onboarding-ui';
import { markFor } from '@studio/onboarding-ui/state';
import { OnboardingAccount, OnboardingDisplayHeading, OnboardingFooter, OnboardingHeading } from '../onboarding/OnboardingParts.js';
import { OnboardingShell } from '../onboarding/OnboardingShell.js';
import { canContinue, skipsDetectedSetup } from './gate.js';
import { sendTelemetry } from '../canvas/telemetry.js';
import { TILE_GLYPHS } from './glyphs.js';
import { claudeTileState, codexTileState } from '../agents/mapping.js';
import { SetupDialogHost, setupStrings } from './SetupDialogHost.js';
import { useAgentSetupStore, type AgentSetupState } from './store.js';
import { useSettingsStore } from '../settings/store.js';

export type ConnectFacts = Pick<AgentSetupState, 'claude' | 'claudeSettled' | 'codex' | 'codexSignInAttempted' | 'touched'>;

interface ConnectFooterProps {
  hasBack?: boolean;
  onBack?: () => void;
  onSkip?: () => void;
}

/** The CLIs this machine already has: nothing to install and nothing to sign in to. */
export const CLI_AGENTS = ['opencode', 'freebuff'] as const;
export type CliAgent = (typeof CLI_AGENTS)[number];

export interface ConnectStepViewProps extends ConnectFooterProps {
  facts: ConnectFacts;
  isContinueEnabled: boolean;
  onTap: (harness: HarnessId) => void;
  onContinue: (preferred?: HarnessId) => void;
  aside?: React.ReactNode;
  preferred?: HarnessId;
  onMakePreferred?: (harness: HarnessId) => void;
  /** Given, the screen offers the local CLIs beside the two managed agents. */
  cliHarness?: CliAgent;
  onPickCli?: (harness: CliAgent) => void;
}

export function ConnectStepView({ facts, isContinueEnabled: enabled, onTap, onContinue, hasBack = false, onBack, onSkip, aside, preferred, onMakePreferred, cliHarness, onPickCli }: ConnectStepViewProps): React.JSX.Element {
  const strings = setupStrings().ui;
  const split = aside !== undefined;
  const claudeTile = claudeTileState(facts);
  const codexTile = codexTileState(facts);
  const hasChoice = [claudeTile, codexTile].filter((tile) => markFor(tile) === 'connected').length > 1;
  const preference = (harness: HarnessId): { isPreferred?: boolean; onMakePreferred?: () => void } =>
    !split || !hasChoice ? {} : { isPreferred: preferred === harness, ...(onMakePreferred ? { onMakePreferred: () => onMakePreferred(harness) } : {}) };
  return (
    <OnboardingShell data-testid="onboarding-agents" aside={aside} headerEnd={split ? <OnboardingAccount /> : undefined}>
      <VStack width="100%" gap={8} align="start">
        {split
          ? <OnboardingDisplayHeading title="onboarding.agents.title" subtitle="onboarding.agents.subtitle" />
          : <OnboardingHeading title="onboarding.agents.title" subtitle="onboarding.agents.subtitle" />}
        {/* Beside a picture the agents stack as rows, so each one's loading and done states read down the list. */}
        <HStack width="100%" align="stretch" data-testid="onboarding-agent-row"
          gap={split ? 0 : 2}
          style={split ? { flexDirection: 'column', border: '0.5px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' } : undefined}>
          <HarnessTile tile={claudeTile} strings={strings} glyphs={TILE_GLYPHS} onSelect={() => onTap('claude')} {...preference('claude')} layout={split ? 'row' : 'tile'} testId="onboarding-tile-claude" />
          <HarnessTile tile={codexTile} strings={strings} glyphs={TILE_GLYPHS} onSelect={() => onTap('codex')} {...preference('codex')} layout={split ? 'row' : 'tile'} hasDivider={split} testId="onboarding-tile-codex" />
          <HarnessTile tile={{ kind: 'coming-soon', id: 'other' }} strings={strings} glyphs={TILE_GLYPHS} layout={split ? 'row' : 'tile'} hasDivider={split} testId="onboarding-tile-coming-soon-other" />
        </HStack>
        {onPickCli === undefined ? null : (
          // A second row, not another tile: these need no setup, so they read as a shortcut.
          <VStack width="100%" gap={2} data-testid="onboarding-cli-agents">
            {CLI_AGENTS.map((harness) => (
              <ClickableCard
                key={harness}
                label={t(`agent.name.${harness}`)}
                variant={cliHarness === harness ? 'gray' : 'transparent'}
                onClick={() => onPickCli(harness)}
                data-testid={`onboarding-tile-${harness}`}
                data-state={cliHarness === harness ? 'picked' : 'idle'}
                style={{ width: '100%', border: 'var(--border-width) solid var(--color-border)', borderRadius: 12 }}
              >
                <HStack gap={3} align="center" width="100%" padding={3}>
                  <GlyphSlot size={20}>{TILE_GLYPHS[harness]}</GlyphSlot>
                  <Text type="body" weight="medium" color="primary" style={{ flex: 1 }}>
                    {t(`agent.name.${harness}`)}
                  </Text>
                  {cliHarness === harness ? <Text type="supporting" color="secondary">{strings.manage}</Text> : null}
                </HStack>
              </ClickableCard>
            ))}
          </VStack>
        )}
      </VStack>
      <OnboardingFooter
        hasBack={hasBack}
        {...(onBack === undefined ? {} : { onBack })}
        {...(onSkip === undefined ? {} : { onSkip })}
        isContinueEnabled={enabled}
        onContinue={onContinue}
      />
    </OnboardingShell>
  );
}

export interface ConnectStepProps extends ConnectFooterProps {
  entryPoint: SetupEntryPoint;
  onContinue: (preferred?: HarnessId) => void;
  aside?: React.ReactNode;
}

export function ConnectStep({ entryPoint, onContinue, hasBack, onBack, onSkip, aside }: ConnectStepProps): React.JSX.Element {
  const claude = useAgentSetupStore((s) => s.claude);
  const claudeSettled = useAgentSetupStore((s) => s.claudeSettled);
  const codex = useAgentSetupStore((s) => s.codex);
  const codexSignInAttempted = useAgentSetupStore((s) => s.codexSignInAttempted);
  const touched = useAgentSetupStore((s) => s.touched);
  const [open, setOpen] = useState<HarnessId | null>(null);
  const [first, setFirst] = useState<HarnessId | undefined>(undefined);
  const savedPreferred = useSettingsStore((s) => s.isPrimed ? s.harness : undefined);
  // Seeded from Settings, so a person already on a CLI is not asked to choose again.
  const [cli, setCli] = useState<CliAgent | undefined>(() => CLI_AGENTS.find((harness) => harness === savedPreferred));
  const setPreferred = useSettingsStore((s) => s.setHarness);

  const tap = useCallback(
    (harness: HarnessId): void => {
      if (skipsDetectedSetup(useAgentSetupStore.getState(), harness)) sendTelemetry({ event: 'agent_setup_skipped', properties: { provider: harness, entry_point: entryPoint } });
      setOpen(harness);
      const { tapClaude, tapCodex } = useAgentSetupStore.getState();
      void (harness === 'claude' ? tapClaude(entryPoint) : tapCodex());
    },
    [entryPoint],
  );
  const close = useCallback((): void => setOpen(null), []);

  const facts: ConnectFacts = { claude, claudeSettled, codex, codexSignInAttempted, touched };
  const connected = (['claude', 'codex'] as const).filter((harness) => markFor(harness === 'claude' ? claudeTileState(facts) : codexTileState(facts)) === 'connected');
  const firstConnected = connected[0];
  useEffect(() => {
    if (first === undefined && firstConnected !== undefined) setFirst(firstConnected);
  }, [first, firstConnected]);
  const firstSetup = first !== undefined && isSetupHarnessId(first) ? first : undefined;
  const preferred =
    savedPreferred !== undefined && isSetupHarnessId(savedPreferred) && connected.includes(savedPreferred)
      ? savedPreferred
      : firstSetup !== undefined && connected.includes(firstSetup)
        ? firstSetup
        : firstConnected;
  return (
    <>
      <ConnectStepView
        facts={facts}
        isContinueEnabled={cli !== undefined || canContinue(facts)}
        cliHarness={cli}
        onPickCli={(harness) => {
          setCli(harness);
          void setPreferred(harness);
        }}
        onTap={tap}
        onContinue={() => onContinue(cli ?? preferred)}
        aside={aside}
        {...(preferred === undefined ? {} : { preferred })}
        onMakePreferred={(harness) => {
          void setPreferred(harness);
        }}
        {...(hasBack === undefined ? {} : { hasBack })}
        {...(onBack === undefined ? {} : { onBack })}
        {...(onSkip === undefined ? {} : { onSkip })}
      />
      {open === null ? null : (
        <SetupDialogHost
          key={open}
          harness={open}
          entryPoint={entryPoint}
          onClose={close}
          onSwitchHarness={() => tap(open === 'claude' ? 'codex' : 'claude')}
        />
      )}
    </>
  );
}
