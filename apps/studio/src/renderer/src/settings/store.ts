import { create } from 'zustand';
import type { DefaultPatch, HarnessId, SettingsDefaults, SettingsState, NotificationAction, NotificationPreference, TipsPillDismissSource } from '@studio/events';
import { DEFAULT_NOTIFICATIONS, notificationPreference } from '@studio/events';
import { DEFAULT_NOTIFICATION_SOUND, notificationSoundPreference, type NotificationSoundPreference } from '@studio/events';
import { telemetryProjectFields } from '../workspace/store.js';
import { NO_DEFAULTS } from './derive.js';
import { applyTipsBaseline, clearTipRecords } from '../tips/early.js';
import { studio } from '../bridge.js';
import { mirror } from '../mirror.js';
import { ignoreRefusal } from '../refusal.js';

/** Absent in main means a session opens on Claude (ONL-2120); the pane shows that resolution. */
const DISPLAY_DEFAULT_HARNESS: HarnessId = 'claude';

interface SettingsStore {
  telemetryConsent: SettingsState['telemetryConsent'];
  analyticsEnabled: boolean;
  isAnalyticsSaving: boolean;
  analyticsSaveFailed: boolean;
  setAnalytics: (enabled: boolean) => Promise<void>;
  notifications: NotificationPreference;
  notificationAction: (action: NotificationAction) => Promise<void>;
  experimentalCodePanel: boolean;
  isCodePanelSaving: boolean;
  codePanelSaveFailed: boolean;
  setCodePanel: (enabled: boolean) => Promise<void>;
  notificationSound: NotificationSoundPreference;
  setNotificationSound: (preference: NotificationSoundPreference) => Promise<void>;
  harness: HarnessId;
  defaults: SettingsDefaults;
  /** False until a payload from main has landed, so a false `discoverCtaResolved` is not read as an answer (ONL-2443). */
  isPrimed: boolean;
  discoverCtaResolved: boolean;
  tipsPillDismissed: boolean;
  connectorsNoticeDismissed: boolean;
  /** Holds for the launch once seen, so a reset brings the tour back on the next launch rather than over the screen. */
  tourSeen: boolean;
  /** The click's own answer, outliving the screen that took it: a refused or declined write must not bring the card back on the next visit (ONL-2443). */
  isDiscoverResolvedInSession: boolean;
  apply: (state: SettingsState) => void;
  applyDefaults: (defaults: SettingsDefaults) => void;
  /** Holds main's answer, never the request: under a `STUDIO_HARNESS` pin the two differ. */
  setHarness: (harness: HarnessId) => Promise<void>;
  setDefault: (harness: HarnessId, patch: DefaultPatch) => Promise<void>;
  resolveDiscoverCta: () => Promise<void>;
  /** Once per install: unprimed or already dismissed, it writes and reports nothing. */
  dismissTipsPill: (source: TipsPillDismissSource) => Promise<void>;
  dismissConnectorsNotice: () => Promise<void>;
  markTourSeen: () => Promise<void>;
  resetTips: () => Promise<void>;
}

let settingsRevision = 0;

/** The one owner of the defaults' order: every ask, read or write, is numbered as it leaves, and an answer older than one already shown is dropped. */
const defaultsAsks = { sent: 0, shown: 0 };

function askDefaults(): (defaults: SettingsDefaults) => void {
  const ask = ++defaultsAsks.sent;
  return (defaults) => {
    if (ask < defaultsAsks.shown) return;
    defaultsAsks.shown = ask;
    useSettingsStore.getState().applyDefaults(defaults);
  };
}

const useSettingsStore = create<SettingsStore>()((set) => ({
  telemetryConsent: undefined,
  analyticsEnabled: true,
  isAnalyticsSaving: false,
  analyticsSaveFailed: false,
  setAnalytics: async (enabled) => {
    if (useSettingsStore.getState().isAnalyticsSaving) return;
    set({ isAnalyticsSaving: true, analyticsSaveFailed: false });
    const revision = settingsRevision;
    try {
      const answer = await studio().settingsSetAnalytics(enabled);
      if (revision === settingsRevision) useSettingsStore.getState().apply(answer);
    } catch {
      set({ analyticsSaveFailed: true });
    } finally {
      set({ isAnalyticsSaving: false });
    }
  },
  notifications: { ...DEFAULT_NOTIFICATIONS },
  notificationAction: async (action) => {
    const revision = settingsRevision;
    const answer = await studio().notificationAction(action);
    if (revision === settingsRevision) useSettingsStore.getState().apply(answer);
  },
  experimentalCodePanel: false,
  isCodePanelSaving: false,
  codePanelSaveFailed: false,
  setCodePanel: async (enabled) => {
    if (useSettingsStore.getState().isCodePanelSaving) return;
    set({ isCodePanelSaving: true, codePanelSaveFailed: false });
    const revision = settingsRevision;
    try {
      const answer = await studio().settingsSetCodePanel(enabled);
      if (revision === settingsRevision) useSettingsStore.getState().apply(answer);
    } catch {
      set({ codePanelSaveFailed: true });
    } finally {
      set({ isCodePanelSaving: false });
    }
  },
  notificationSound: { ...DEFAULT_NOTIFICATION_SOUND },
  harness: DISPLAY_DEFAULT_HARNESS,
  defaults: NO_DEFAULTS,
  isPrimed: false,
  discoverCtaResolved: false,
  tipsPillDismissed: false,
  connectorsNoticeDismissed: false,
  tourSeen: false,
  isDiscoverResolvedInSession: false,
  apply: (state) => {
    settingsRevision += 1;
    applyTipsBaseline(state.tipsBaseline);
    set({
      analyticsEnabled: state.analyticsEnabled !== false,
      telemetryConsent: state.telemetryConsent,
      experimentalCodePanel: state.experimentalCodePanel === true,
      notificationSound: notificationSoundPreference(state.notificationSound),
      notifications: notificationPreference(state.notifications),
      isPrimed: true,
      harness: state.harness ?? DISPLAY_DEFAULT_HARNESS,
      discoverCtaResolved: state.discoverCtaResolved === true,
      tipsPillDismissed: state.tipsPillDismissed === true,
      connectorsNoticeDismissed: state.connectorsNoticeDismissed === true || useSettingsStore.getState().connectorsNoticeDismissed,
      tourSeen: state.tourSeen === true || useSettingsStore.getState().tourSeen,
    });
  },
  applyDefaults: (defaults) => {
    // Every re-read allocates a fresh object; an unchanged payload must not notify.
    if (JSON.stringify(useSettingsStore.getState().defaults) === JSON.stringify(defaults)) return;
    set({ defaults });
  },
  setHarness: async (harness) => {
    const answer = await studio().settingsSetHarness({ harness }).catch(ignoreRefusal('settings', 'set harness'));
    if (answer !== undefined) useSettingsStore.getState().apply(answer);
  },
  setNotificationSound: async (preference) => {
    useSettingsStore.getState().apply(await studio().settingsSetNotificationSound(preference));
  },
  setDefault: async (harness, patch) => {
    const show = askDefaults();
    const answer = await studio().settingsSetDefault({ harness, ...patch }).catch(ignoreRefusal('settings', 'set default'));
    if (answer !== undefined) show(answer);
  },
  dismissTipsPill: async (source) => {
    const current = useSettingsStore.getState();
    if (!current.isPrimed || current.tipsPillDismissed) return;
    set({ tipsPillDismissed: true });
    studio().telemetryEvent({ event: 'tips_pill_dismissed', properties: { ...telemetryProjectFields(), source } });
    useSettingsStore.getState().apply(await studio().settingsDismissTipsPill());
  },
  dismissConnectorsNotice: async () => {
    set({ connectorsNoticeDismissed: true });
    const revision = settingsRevision;
    const answer = await studio().settingsDismissConnectorsNotice();
    if (revision === settingsRevision) useSettingsStore.getState().apply(answer);
  },
  markTourSeen: async () => {
    set({ tourSeen: true });
    useSettingsStore.getState().apply(await studio().settingsMarkTourSeen());
  },
  resetTips: async () => {
    clearTipRecords();
    const answer = await studio().settingsResetTips();
    set({ connectorsNoticeDismissed: false, isDiscoverResolvedInSession: false });
    useSettingsStore.getState().apply(answer);
  },
  /* Rejects rather than swallowing: the card's one call site logs the refusal through the shared helper, and a second swallow here would make that unreachable (ONL-2443). */
  resolveDiscoverCta: async () => {
    set({ isDiscoverResolvedInSession: true });
    useSettingsStore.getState().apply(await studio().settingsResolveDiscoverCta());
  },
}));

export { useSettingsStore };

async function readDefaults(): Promise<void> {
  const show = askDefaults();
  const defaults = await studio().settingsDefaults().catch(ignoreRefusal('settings', 'defaults read'));
  if (defaults !== undefined) show(defaults);
}

let priming: Promise<void> | undefined;

/** `settings:changed` also fires on a catalog write its payload does not carry, so the handler re-reads defaults. */
export function primeSettings(): Promise<void> {
  priming ??= (async () => {
    const state = mirror({
      name: ['settings', 'state read'],
      read: () => studio().settingsState(),
      subscribe: (listener) =>
        studio().onSettingsChanged((next) => {
          listener(next);
          void readDefaults();
        }),
      apply: (next) => {
        useSettingsStore.getState().apply(next);
      },
    });
    await Promise.all([state.primed, readDefaults()]);
  })();
  return priming;
}

export function resetSettingsPrimeForTests(): void {
  priming = undefined;
  defaultsAsks.sent = 0;
  defaultsAsks.shown = 0;
  useSettingsStore.setState({ connectorsNoticeDismissed: false, tourSeen: false });
  const { apply, applyDefaults } = useSettingsStore.getState();
  apply({});
  applyDefaults(NO_DEFAULTS);
  useSettingsStore.setState({ isPrimed: false, isDiscoverResolvedInSession: false, isCodePanelSaving: false, codePanelSaveFailed: false, isAnalyticsSaving: false, analyticsSaveFailed: false });
}
