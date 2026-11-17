// Not in index.ts: the agent host announces here and index.ts imports the agent host, so merging makes an import cycle (ONL-2115).

import {
  IPC_EMIT,
  type HarnessDefaults,
  type HarnessId,
  type SettingsDefaults,
  type SettingsState,
} from '@studio/events';
import { catalogFor, defaultPreference } from '../agent-host/preferences.js';
import { storedHarness } from '../agent-host/sessions.js';
import { broadcastToRenderers } from '../tabs/broadcast.js';
import { resolvedHarness } from './resolve.js';
import { analyticsEnabled, discoverCtaResolved, tipsPillDismissed, tourSeen, experimentalCodePanel, notificationSoundSettings, notificationSettings } from './state.js';
import { connectorsNoticeDismissed } from './state.js';
import { storedTipsBaseline, telemetryConsent } from './state.js';

// `resolvedHarness` stays the sole source of `harness`: the stored field is one of three, and a
// whole-domain read would drop the `STUDIO_HARNESS` pin and the onboarding-record fallback (ONL-2120).
export function settingsState(): SettingsState {
  const harness = resolvedHarness();
  const notificationSound = notificationSoundSettings();
  const notifications = notificationSettings();
  const tipsBaseline = storedTipsBaseline();
  return {
    analyticsEnabled: analyticsEnabled(),
    telemetryConsent: telemetryConsent(),
    ...(notifications.enabled || notifications.invitation !== 'unseen' || notifications.delivery !== 'unconfirmed' ? { notifications } : {}),
    experimentalCodePanel: experimentalCodePanel(),
    ...(notificationSound === undefined ? {} : { notificationSound }),
    ...(harness === undefined ? {} : { harness }),
    ...(discoverCtaResolved() ? { discoverCtaResolved: true } : {}),
    ...(tipsPillDismissed() ? { tipsPillDismissed: true } : {}),
    ...(connectorsNoticeDismissed() ? { connectorsNoticeDismissed: true } : {}),
    ...(tourSeen() ? { tourSeen: true } : {}),
    ...(tipsBaseline === undefined ? {} : { tipsBaseline }),
  };
}

function defaultsFor(id: HarnessId): HarnessDefaults {
  const stored = storedHarness(id);
  return { ...defaultPreference(stored), models: catalogFor(stored) };
}

export function settingsDefaults(): SettingsDefaults {
  return { claude: defaultsFor('claude'), codex: defaultsFor('codex') };
}

export function broadcastSettingsChanged(state: SettingsState = settingsState()): void {
  broadcastToRenderers(IPC_EMIT.settingsChanged, state);
}
