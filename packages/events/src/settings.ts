import type { EffortLevel, ModelChoice } from './events.js';
import type { HarnessId } from './models.js';
import type { NotificationSoundPreference } from './notification-sounds.js';
import type { NotificationPreference } from './notifications.js';

export interface SettingsState {
  telemetryConsent?: 'unknown' | 'accepted' | 'declined' | 'removed';
  analyticsEnabled?: boolean;
  notifications?: NotificationPreference;
  experimentalCodePanel?: boolean;
  notificationSound?: NotificationSoundPreference;
  /** Absent means no default anywhere; never inferred into `claude`, so the pane can tell "chose Claude" from "never chose" (ONL-2120). */
  harness?: HarnessId;
  /** Absent means unresolved, so every broadcast carries it and no live view resurrects a resolved card (ONL-2443). */
  discoverCtaResolved?: boolean;
  /** The composer's one-time Tips pill, gone for good once dismissed (ONL-2744). */
  tipsPillDismissed?: boolean;
  connectorsNoticeDismissed?: boolean;
  /** The first-run tour has been closed once; it opens on its own only before that. */
  tourSeen?: boolean;
  /** Absent until the first launch with tip moments stamps it; Reset tips writes `projects: 0` (ONL-2960). */
  tipsBaseline?: TipsBaseline;
}

export interface TipsBaseline {
  at: string;
  projects: number;
}

export function tipsBaseline(value: unknown): TipsBaseline | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const { at, projects } = value as Record<string, unknown>;
  return typeof at === 'string' && typeof projects === 'number' && Number.isInteger(projects) && projects >= 0 ? { at, projects } : undefined;
}

export interface SetHarnessRequest {
  harness: HarnessId;
}

export interface HarnessDefaults {
  model?: string;
  effort?: EffortLevel;
  models: ModelChoice[];
}

export type SettingsDefaults = Record<HarnessId, HarnessDefaults>;

/** Absent leaves the field alone; `null` clears it. */
export interface DefaultPatch {
  model?: string | null;
  effort?: EffortLevel | null;
}

export interface SetDefaultRequest extends DefaultPatch {
  harness: HarnessId;
}
