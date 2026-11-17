import { handle } from '../ipc/bridge.js';
import {
  HARNESS_IDS,
  IPC_INVOKE,
  type DefaultPatch,
  type HarnessId,
  type SetDefaultRequest,
  type SetHarnessRequest,
  type SettingsDefaults,
  type SettingsState,
} from '@studio/events';
import { noteHarnessDefaultChanged } from '../agent-host/index.js';
import { rememberDefault } from '../agent-host/preferences.js';
import { storedHarness } from '../agent-host/sessions.js';
import { broadcastSettingsChanged, settingsDefaults, settingsState } from './changed.js';
import { analyticsEnabled, dismissTipsPill, markTourSeen, resetTips, resolveDiscoverCta, setAnalyticsEnabled, setExperimentalCodePanel, setSettingsHarness, setNotificationSoundSettings } from './state.js';
import { dismissConnectorsNotice } from './state.js';
import { capture, refreshTelemetryConsent } from '../telemetry/index.js';
import { recordAgentDefaultChanged, recordExperimentalToggled } from './telemetry.js';
import { log } from '../log/index.js';
import { registerNotificationHandlers } from '../notifications/index.js';

const logger = log('settings');

function requireHarness(channel: string, value: unknown): HarnessId {
  const harness = HARNESS_IDS.find((candidate) => candidate === value);
  if (harness === undefined) {
    throw new Error(`${channel}: "${String(value)}" is not a HarnessId.`);
  }
  return harness;
}

function field<T extends string>(channel: string, name: string, value: unknown): T | null | undefined {
  if (value === undefined || value === null || typeof value === 'string') return value as T | null | undefined;
  throw new Error(`${channel}: ${name} must be a string, null or absent.`);
}

export function registerSettingsHandlers(): void {
  registerNotificationHandlers();
  handle(IPC_INVOKE.settingsState, (): SettingsState => settingsState());

  handle(IPC_INVOKE.settingsSetAnalytics, (_event, enabled: unknown): SettingsState => {
    try {
      if (setAnalyticsEnabled(enabled)) refreshTelemetryConsent();
    } catch (error) {
      // A withdrawal holds for this launch even when it could not be saved, so collection stops and every Tab is told before the failure is reported (ONL-2904).
      if (!analyticsEnabled()) {
        refreshTelemetryConsent();
        broadcastSettingsChanged();
      }
      throw error;
    }
    const next = settingsState();
    broadcastSettingsChanged(next);
    return next;
  });

  handle(IPC_INVOKE.settingsSetCodePanel, (_event, enabled: unknown): SettingsState => {
    const moved = setExperimentalCodePanel(enabled);
    const next = settingsState();
    if (moved) {
      broadcastSettingsChanged(next);
      recordExperimentalToggled(next.experimentalCodePanel === true);
    }
    return next;
  });

  handle(IPC_INVOKE.settingsSetNotificationSound, (_event, request: unknown): SettingsState => {
    const preference = setNotificationSoundSettings(request);
    const next = settingsState();
    broadcastSettingsChanged(next);
    capture('notification_sound_changed', { enabled: preference.enabled, sound: preference.sound });
    return next;
  });

  handle(IPC_INVOKE.settingsSetHarness, (_event, req: SetHarnessRequest): SettingsState => {
    const harness = requireHarness('settings:setHarness', req?.harness);
    const moved = setSettingsHarness(harness);
    // Not awaited: the probe waits on its pass condition and the pane's answer must not.
    if (moved) {
      recordAgentDefaultChanged({ harness, setting: 'harness' });
      void noteHarnessDefaultChanged().catch((err: unknown) => {
        logger.error('re-probe after a default change failed', { error: err });
      });
    }
    const next = settingsState();
    if (moved) broadcastSettingsChanged(next);
    return next;
  });

  handle(IPC_INVOKE.settingsDismissTipsPill, (): SettingsState => {
    dismissTipsPill();
    const next = settingsState();
    broadcastSettingsChanged(next);
    return next;
  });

  handle(IPC_INVOKE.settingsDismissConnectorsNotice, (): SettingsState => {
    dismissConnectorsNotice();
    const next = settingsState();
    broadcastSettingsChanged(next);
    return next;
  });

  handle(IPC_INVOKE.settingsMarkTourSeen, (): SettingsState => {
    markTourSeen();
    const next = settingsState();
    broadcastSettingsChanged(next);
    return next;
  });

  handle(IPC_INVOKE.settingsResetTips, (): SettingsState => {
    resetTips();
    const next = settingsState();
    broadcastSettingsChanged(next);
    return next;
  });

  handle(IPC_INVOKE.settingsResolveDiscoverCta, (): SettingsState => {
    resolveDiscoverCta();
    const next = settingsState();
    broadcastSettingsChanged(next);
    return next;
  });

  handle(IPC_INVOKE.settingsDefaults, (): SettingsDefaults => settingsDefaults());

  handle(IPC_INVOKE.settingsSetDefault, (_event, req: SetDefaultRequest): SettingsDefaults => {
    const harness = requireHarness('settings:setDefault', req?.harness);
    const patch: DefaultPatch = {
      model: field('settings:setDefault', 'model', req?.model),
      effort: field('settings:setDefault', 'effort', req?.effort),
    };
    if (rememberDefault(storedHarness(harness), patch)) {
      recordAgentDefaultChanged({ harness, setting: 'model', ...patch });
      broadcastSettingsChanged();
    }
    return settingsDefaults();
  });
}
