import {
  HARNESS_IDS,
  isRecord,
  isNotificationSoundPreference,
  notificationPreference,
  type NotificationPreference,
  notificationSoundPreference,
  type NotificationSoundPreference,
  type HarnessId,
  type SettingsState,
  tipsBaseline,
  type TipsBaseline,
} from '@studio/events';
import { forced } from '../onboarding/forced.js';
import { mintGrant } from '../telemetry/grant.js';
import { isSourceBuild, telemetryIncluded } from '../telemetry/build.js';
import { stateRoot, stateRootOverridden } from '../state/root.js';
import { defineDomain } from '../state/store.js';
import { canWriteStateFile } from '../state/file.js';
import { join } from 'node:path';

const domain = defineDomain<SettingsState>({
  name: 'settings',
  version: 1,
  fallback: () => ({}),
  readFuture: (data) => isRecord(data) && data.analyticsEnabled === false ? { analyticsEnabled: false } : {},
});

// A write clears the store's fallback flag and a failed one lands nothing, so what this launch already knows about consent is held here until a consent write lands (ONL-2904).
let consentDenied = false;
let sourceDeclinedForLaunch = false;

/** A version-matched file skips `migrate`, so the read normalises (ONL-2120). */
export function settingsHarness(): HarnessId | undefined {
  const state = domain.read() as Partial<SettingsState> | null;
  const value: unknown = state?.harness;
  return HARNESS_IDS.find((candidate) => candidate === value);
}

export function discoverCtaResolved(): boolean {
  const state = domain.read() as Partial<SettingsState> | null;
  return state?.discoverCtaResolved === true;
}

/** A hand-edited file holds any shape, and an array spreads into indexed keys just as a scalar does (ONL-2443). */
function fields(current: unknown): SettingsState {
  return isRecord(current) && !Array.isArray(current) ? (current as SettingsState) : {};
}

function withoutHarness(current: unknown): SettingsState {
  const { harness: _harness, ...rest } = fields(current);
  return rest;
}

/** The profile, not the override: every e2e, driver and proof walk forces a first run into an isolated state root and still has to prove the dismissal survives (ONL-2443). */
export function resolveDiscoverCta(): void {
  if (forced() !== undefined && !stateRootOverridden()) return;
  domain.update((current) => ({ ...fields(current), discoverCtaResolved: true }));
}

export function tipsPillDismissed(): boolean {
  const state = domain.read() as Partial<SettingsState> | null;
  return state?.tipsPillDismissed === true;
}

export function dismissTipsPill(): void {
  domain.update((current) => ({ ...fields(current), tipsPillDismissed: true }));
}

export function connectorsNoticeDismissed(): boolean {
  return fields(domain.read()).connectorsNoticeDismissed === true;
}

export function dismissConnectorsNotice(): void {
  domain.update((current) => ({ ...fields(current), connectorsNoticeDismissed: true }));
}

export function tourSeen(): boolean {
  const state = domain.read() as Partial<SettingsState> | null;
  return state?.tourSeen === true;
}

export function markTourSeen(): void {
  domain.update((current) => ({ ...fields(current), tourSeen: true }));
}

export function resetTips(now: Date = new Date()): void {
  domain.update((current) => {
    const { discoverCtaResolved: _resolved, tipsPillDismissed: _pill, connectorsNoticeDismissed: _connectors, tourSeen: _tour, ...kept } = fields(current);
    const rest = { ...kept, tipsBaseline: { at: now.toISOString(), projects: 0 } };
    if (rest.notifications === undefined) return rest;
    const { snoozedUntil: _snoozed, ...notifications } = notificationPreference(rest.notifications);
    return { ...rest, notifications: { ...notifications, invitation: notifications.enabled ? notifications.invitation : 'unseen' } };
  });
}

function isFirstRunOnOwnProfile(): boolean {
  return forced() === false && !stateRootOverridden();
}

export function storedTipsBaseline(): TipsBaseline | undefined {
  if (isFirstRunOnOwnProfile()) return undefined;
  return tipsBaseline(fields(domain.read()).tipsBaseline);
}

/** Once per install; a forced first run on the person's own profile writes nothing (ONL-2960). */
export function stampTipsBaseline(projects: () => number, now: Date = new Date()): void {
  if (isFirstRunOnOwnProfile() || domain.degraded() || storedTipsBaseline() !== undefined) return;
  try {
    domain.update((current) => ({ ...fields(current), tipsBaseline: { at: now.toISOString(), projects: projects() } }));
  } catch {
    domain.reset();
  }
}

export function clearDiscoverCta(): void {
  domain.update((current) => {
    const { discoverCtaResolved: _resolved, ...rest } = fields(current);
    return rest;
  });
}

/** Non-throwing: `completeOnboarding` passes a raw IPC value, and a first run must not fail here (ONL-2120). */
export function setSettingsHarness(harness: HarnessId): boolean {
  const next = HARNESS_IDS.find((candidate) => candidate === harness);
  if (settingsHarness() === next) return false;
  domain.update((current) =>
    next === undefined ? withoutHarness(current) : { ...withoutHarness(current), harness: next },
  );
  return true;
}

export function clearSettingsHarness(): void {
  domain.update(withoutHarness);
}

export function resetSettingsCache(): void {
  consentDenied = false;
  sourceDeclinedForLaunch = false;
  domain.reset();
}

export function notificationSoundSettings(): NotificationSoundPreference | undefined {
  const value: unknown = fields(domain.read()).notificationSound;
  return value === undefined ? undefined : notificationSoundPreference(value);
}

export function experimentalCodePanel(): boolean {
  return fields(domain.read()).experimentalCodePanel === true;
}

export function analyticsEnabled(): boolean {
  if (!telemetryIncluded()) return false;
  if (consentDenied) return false;
  // A read that fell back cannot say consent was given (ONL-2904).
  if (domain.degraded()) {
    consentDenied = true;
    return false;
  }
  const state = fields(domain.read());
  return state.analyticsEnabled !== false && (!isSourceBuild() || state.telemetryConsent === 'accepted');
}

export function telemetryConsent(): SettingsState['telemetryConsent'] {
  if (!telemetryIncluded()) return 'removed';
  if (!isSourceBuild()) return undefined;
  if (sourceDeclinedForLaunch) return 'declined';
  if (domain.degraded()) return 'unknown';
  const answer = fields(domain.read()).telemetryConsent;
  return answer === 'accepted' || answer === 'declined' ? answer : 'unknown';
}

/** The stored preference says off, as against a read that could not say (ONL-2904). */
export function analyticsWithdrawn(): boolean {
  return !domain.degraded() && fields(domain.read()).analyticsEnabled === false;
}

/** The file states the choice, as against standing on the default (ONL-2904). */
export function analyticsChoiceStored(): boolean {
  return !domain.degraded() && typeof fields(domain.read()).analyticsEnabled === 'boolean';
}

/** Records the standing default when the file names none and can take one (ONL-2904). */
export function storeAnalyticsDefault(): void {
  if (!OFFICIAL_BUILD) return;
  if (!analyticsEnabled() || analyticsChoiceStored()) return;
  // The write caches before it persists, so a refused one would leave the choice stored in memory and nowhere else (ONL-2904).
  if (!canWriteStateFile(join(stateRoot(), 'settings.json'), 1)) return;
  try {
    domain.update((current) => ({ ...fields(current), analyticsEnabled: true }));
  } catch {
    domain.reset();
  }
}

export function setAnalyticsEnabled(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('Invalid analytics preference');
  if (!telemetryIncluded()) return false;
  if (!sourceDeclinedForLaunch && analyticsEnabled() === value && analyticsChoiceStored() && (!isSourceBuild() || telemetryConsent() === (value ? 'accepted' : 'declined'))) return false;
  // A withdrawal holds for this launch whatever the disk then does; only consent waits on a durable write (ONL-2904).
  if (!value) {
    consentDenied = true;
    sourceDeclinedForLaunch = isSourceBuild();
  }
  if (!canWriteStateFile(join(stateRoot(), 'settings.json'), 1)) throw new Error('Analytics preference cannot be saved');
  const granted = mintGrant();
  // Consent returns only under a grant no batch on disk can carry; a withdrawal rotates where it can and never waits on it (ONL-2904).
  if (value && granted === undefined) throw new Error('Analytics preference cannot be saved');
  try {
    domain.update((current) => ({ ...fields(current), analyticsEnabled: value, ...(isSourceBuild() ? { telemetryConsent: value ? 'accepted' as const : 'declined' as const } : {}) }));
  } catch (error) {
    domain.reset();
    throw error;
  }
  // The file now names the choice, so it answers for consent again.
  consentDenied = false;
  sourceDeclinedForLaunch = false;
  return true;
}

export function setExperimentalCodePanel(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('Invalid Code panel preference');
  if (experimentalCodePanel() === value) return false;
  try {
    domain.update((current) => ({ ...fields(current), experimentalCodePanel: value }));
  } catch (error) {
    domain.reset();
    throw error;
  }
  return true;
}

export function setNotificationSoundSettings(value: unknown): NotificationSoundPreference {
  if (!isNotificationSoundPreference(value)) throw new Error('Invalid notification sound preference');
  const next = notificationSoundPreference(value);
  try {
    domain.update((current) => ({ ...fields(current), notificationSound: next }));
  } catch (error) {
    domain.reset();
    throw error;
  }
  return next;
}

export function notificationSettings(): NotificationPreference {
  return notificationPreference(fields(domain.read()).notifications);
}

export function saveNotificationSettings(preference: NotificationPreference): void {
  try {
    domain.update((current) => ({ ...fields(current), notifications: notificationPreference(preference) }));
  } catch (error) {
    domain.reset();
    throw error;
  }
}
import { OFFICIAL_BUILD } from '../build-kind.js';
