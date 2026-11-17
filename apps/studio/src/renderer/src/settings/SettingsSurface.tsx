import { useCallback, useMemo, useState } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import type { DefaultPatch, EffortLevel, HarnessId } from '@studio/events';
import { SetupDialogHost } from '../agent-setup/SetupDialogHost.js';
import { useAgentSetupStore } from '../agent-setup/store.js';
import { claudeBillingLabel } from '../agents/mapping.js';
import { agentSetupStrings } from '../agent-setup/strings.js';
import { useNotificationControls } from '../notifications/NotificationSurfaces.js';
import { useFlag } from '../flags/store.js';
import { carriesEffort, offersTipsReset, selectedDefaults, type SelectedDefaults } from './derive.js';
import { readinessByHarness } from './readiness.js';
import { SettingsSections } from './SettingsPane.js';
import type { ResetTipsRowProps } from './rows.js';
import { useSettingsStore } from './store.js';
import { ExperimentalPane, SettingsNavigation, type SettingsPaneId } from './ExperimentalPane.js';

export function redetectForSetup(harness: HarnessId): void {
  const { claude, tapClaude, tapCodex } = useAgentSetupStore.getState();
  if (harness === 'claude' && (claude.status === 'signing-in' || claude.status === 'awaiting-code')) return;
  void (harness === 'claude' ? tapClaude('settings') : tapCodex());
}

export type SetDefault = (harness: HarnessId, patch: DefaultPatch) => void | Promise<void>;

/** A model that cannot carry the stored effort clears it in the same write: the disabled effort row cannot. */
export function pickDefaultModel(setDefault: SetDefault, harness: HarnessId, selected: SelectedDefaults, value: string | null): void {
  const carries = carriesEffort(selected.options, value, selected.effort);
  void setDefault(harness, { model: value, ...(carries ? {} : { effort: null }) });
}

function pickDefaultEffort(setDefault: SetDefault, harness: HarnessId, value: EffortLevel | null): void {
  void setDefault(harness, { effort: value });
}

export function SettingsSurface(): React.JSX.Element {
  const notifications = useNotificationControls();
  const analyticsEnabled = useSettingsStore((state) => state.analyticsEnabled);
  const telemetryConsent = useSettingsStore((state) => state.telemetryConsent);
  const setAnalytics = useSettingsStore((state) => state.setAnalytics);
  const isAnalyticsSaving = useSettingsStore((state) => state.isAnalyticsSaving);
  const analyticsSaveFailed = useSettingsStore((state) => state.analyticsSaveFailed);
  const [pane, setPane] = useState<SettingsPaneId>('general');
  const codeEnabled = useSettingsStore((state) => state.experimentalCodePanel);
  const setCodePanel = useSettingsStore((state) => state.setCodePanel);
  const isSaving = useSettingsStore((state) => state.isCodePanelSaving);
  const saveFailed = useSettingsStore((state) => state.codePanelSaveFailed);
  const harness = useSettingsStore((s) => s.harness);
  const setHarness = useSettingsStore((s) => s.setHarness);
  const defaults = useSettingsStore((s) => s.defaults);
  const setDefault = useSettingsStore((s) => s.setDefault);
  const claudeStatus = useAgentSetupStore((s) => s.claude.status);
  const claudeDetail = useAgentSetupStore((s) => s.claude.detail);
  const claudePlan = useAgentSetupStore((s) => s.claude.plan ?? s.claudeSettled?.plan);
  const codexStatus = useAgentSetupStore((s) => s.codex.status);
  const readiness = useMemo(
    () => readinessByHarness(claudeStatus, codexStatus, claudeDetail),
    [claudeStatus, codexStatus, claudeDetail],
  );
  const selected = useMemo(() => selectedDefaults(defaults, harness), [defaults, harness]);
  const [open, setOpen] = useState<HarnessId | null>(null);
  const resetTips = useSettingsStore((s) => s.resetTips);
  const isTipsResetOffered = offersTipsReset({ promptTip: useFlag('prompt-tip'), inviteTip: useFlag('invite-tip'), blankFirstMoment: useFlag('blank-first-moment') });
  const [tipsState, setTipsState] = useState<ResetTipsRowProps['state']>('idle');
  const onResetTips = useCallback((): void => {
    setTipsState('resetting');
    resetTips().then(() => setTipsState('done'), () => setTipsState('failed'));
  }, [resetTips]);

  const onAgentChange = useCallback(
    (agent: HarnessId): void => {
      void setHarness(agent);
    },
    [setHarness],
  );
  const onSetUp = useCallback((harness: HarnessId): void => {
    setOpen(harness);
    redetectForSetup(harness);
  }, []);
  const close = useCallback((): void => setOpen(null), []);

  const models = {
    value: selected.model,
    options: selected.options,
    onChange: (value: string | null): void => pickDefaultModel(setDefault, harness, selected, value),
  };
  const effort = {
    value: selected.effort,
    levels: selected.levels,
    onChange: (value: EffortLevel | null): void => pickDefaultEffort(setDefault, harness, value),
  };

  return (
    <VStack gap={6}>
      <SettingsNavigation value={pane} onChange={setPane} />
      {pane === 'experimental' ? (
        <ExperimentalPane value={codeEnabled} onChange={(enabled) => void setCodePanel(enabled)} isSaving={isSaving} saveFailed={saveFailed} />
      ) : <SettingsSections
        agent={harness}
        notifications={notifications}
        analytics={{ consent: telemetryConsent, value: analyticsEnabled, onChange: (enabled) => void setAnalytics(enabled), isSaving: isAnalyticsSaving, saveFailed: analyticsSaveFailed }}
        readiness={readiness}
        billingLabel={claudePlan === undefined ? undefined : claudeBillingLabel(claudePlan, agentSetupStrings())}
        onAgentChange={onAgentChange}
        onSetUp={onSetUp}
        models={models}
        effort={effort}
        {...(isTipsResetOffered ? { tips: { state: tipsState, onReset: onResetTips } } : {})}
      />}
      {open === null ? null : (
        <SetupDialogHost
          key={open}
          harness={open}
          entryPoint="settings"
          onClose={close}
          onSwitchHarness={() => onSetUp(open === 'claude' ? 'codex' : 'claude')}
        />
      )}
    </VStack>
  );
}
