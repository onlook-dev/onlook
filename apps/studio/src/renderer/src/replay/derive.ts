import type { EnabledTelemetryConfig, TelemetryConfig } from '@studio/events';
// This type import makes a misspelled privacy option a compile error instead of a silently ignored key.
import type { PostHogConfig } from 'posthog-js/dist/module.no-external';

export interface ReplayInitPlan {
  key: string;
  options: Partial<PostHogConfig>;
}

/** Names the SDK's store, so the boot and the SDK cannot disagree about where the identity is: the token spelling is the SDK's to normalize, this is not (posthog-js `parseName`). */
export const REPLAY_PERSISTENCE_NAME = 'studio-replay';

/** Put this on any element the recorder must not snapshot. Deliberately NOT the SDK's own `ph-no-capture`: a marker it blocks by default would leave the rule below unfalsifiable (ONL-2471). */
export const REPLAY_BLOCK_ATTRIBUTE = 'data-replay-block';

const REPLAY_BLOCK_SELECTOR = `img, [${REPLAY_BLOCK_ATTRIBUTE}]`;

/** `null` means DO NOT INITIALIZE — the fail-closed direction. */
export function replayInitPlan(config: TelemetryConfig): ReplayInitPlan | null {
  if (!config.enabled) return null;
  return {
    key: config.key,
    options: {
      api_host: config.host,
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_external_dependency_loading: true,
      // An unset capture option defers to the project's settings, shared with the web app (ONL-2533).
      capture_exceptions: false,
      capture_performance: false,
      enable_recording_console_log: false,
      sanitize_properties: sanitizeReplayProperties,
      session_recording: {
        maskAllInputs: true,
        // `'*'` is how this SDK spells "mask all text".
        maskTextSelector: '*',
        // Masking never reaches an `<img>`, whose `src` rides the DOM snapshot `sanitize_properties` never sees (ONL-2471).
        blockSelector: REPLAY_BLOCK_SELECTOR,
        captureCanvas: { recordCanvas: false },
        recordHeaders: false,
        recordBody: false,
        maskCapturedNetworkRequestFn: maskReplayRequest,
      },
      bootstrap: {
        distinctID: config.distinctId,
        isIdentifiedID: config.isIdentified,
        sessionID: config.sessionId,
      },
      // `memory` leaves a launch no account owns nothing for a later bootstrap to link; one store, not the SDK's default pair, leaves the boot one place to settle (ONL-2882).
      persistence: config.unowned === true ? 'memory' : 'localStorage',
      persistence_name: REPLAY_PERSISTENCE_NAME,
    },
  };
}

/** The identity the SDK's store holds, which it reads inside `init`. */
export interface PersistedReplayIdentity {
  distinctId: string;
  identified: boolean;
}

/** Whether the store holds something that has to go before `init` (ONL-2882). */
export function storeNeedsReplacing(
  config: EnabledTelemetryConfig,
  persisted: PersistedReplayIdentity | 'unreadable' | undefined,
): boolean {
  if (persisted === undefined) return false;
  // An entry nothing can read is not one this launch wrote, and `init` is past asking.
  if (persisted === 'unreadable') return true;
  if (persisted.distinctId === config.distinctId) return persisted.identified !== config.isIdentified;
  // Main names the one anonymous id this account has taken; any other is some other launch's person.
  return !(config.isIdentified && !persisted.identified && persisted.distinctId === config.linkableAnonymousId);
}

const FILE_URL = /file:\/\/[^\s"']*/g;

function scrubFileUrls(value: string): string {
  return value.replaceAll(FILE_URL, 'app://studio');
}

export function sanitizeReplayProperties(
  properties: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value !== 'string') {
      sanitized[key] = value;
    } else if (value.includes('file://')) {
      sanitized[key] = scrubFileUrls(value);
    } else if (key.endsWith('pathname') && value.startsWith('/')) {
      // `$pathname` is the disk path with the scheme already stripped.
      sanitized[key] = '/';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/** The recorder runs every URL it stores through this, the recording's own page URL included. */
export function maskReplayRequest<T extends { name: string }>(request: T): T {
  return { ...request, name: scrubFileUrls(request.name) };
}

export function createReplayIdentityMirror(
  initial: TelemetryConfig,
  identify: (distinctId: string) => void,
  reset: (distinctId?: string) => void,
): (config: TelemetryConfig) => void {
  let previous = initial;
  return (config) => {
    if (!config.enabled) return;
    if (previous.enabled && config.identityRevision <= previous.identityRevision) return;
    if (previous.enabled && previous.distinctId === config.distinctId && previous.isIdentified === config.isIdentified) {
      previous = config;
      return;
    }
    if (!config.isIdentified) reset(config.distinctId);
    else {
      // Reset first, or `$identify` links the id it leaves to the account (ONL-2882).
      if (previous.enabled && (previous.isIdentified || previous.unowned === true)) reset();
      identify(config.distinctId);
    }
    previous = config;
  };
}
