import type { TelemetryConfig } from '@studio/events';
import {
  createReplayIdentityMirror,
  replayInitPlan,
  storeNeedsReplacing,
  type ReplayInitPlan,
} from './derive.js';
import type { ReplayStore } from './store.js';

/** The slice of the SDK the boot drives, so the boot itself can be exercised against the pinned SDK (ONL-2882). */
export interface ReplaySdk {
  init: (key: string, options: ReplayInitPlan['options']) => void;
  identify: (distinctId: string) => void;
  reset: (resetDevice: boolean) => void;
  register: (properties: Record<string, unknown>) => void;
  onSessionId: (listener: (sessionId: string) => void) => void;
}

export interface ConsentReplaySdk extends ReplaySdk {
  opt_out_capturing: () => void;
  opt_in_capturing: (options: { captureEventName: false }) => void;
  stopSessionRecording: () => void;
  set_config: (options: { disable_session_recording: boolean }) => void;
}

export function replayConsentController(
  sdk: ConsentReplaySdk,
  store: ReplayStore,
  reportSession: (sessionId: string | null) => void,
): (config: TelemetryConfig) => void {
  let mirror: ((next: TelemetryConfig) => void) | undefined;
  let enabled = false;
  return (config) => {
    if (!config.enabled) {
      if (mirror !== undefined) {
        sdk.opt_out_capturing();
        sdk.stopSessionRecording();
      }
      enabled = false;
      return;
    }
    if (mirror === undefined) {
      mirror = startReplay(sdk, store, config, reportSession);
      if (mirror === undefined) return;
    } else {
      mirror(config);
    }
    if (!enabled) {
      sdk.opt_in_capturing({ captureEventName: false });
      sdk.set_config({ disable_session_recording: false });
    }
    enabled = true;
  };
}

/** `undefined` means nothing records — the fail-closed direction. */
export function startReplay(
  sdk: ReplaySdk,
  store: ReplayStore,
  config: TelemetryConfig,
  reportSession: (sessionId: string | null) => void,
): ((next: TelemetryConfig) => void) | undefined {
  const plan = replayInitPlan(config);
  if (plan === null || !config.enabled) return undefined;
  // Before `init`, which links a stored anonymous id to the account and starts a recorder the store's own config enables (ONL-2882).
  if (plan.options.persistence !== 'memory' && storeNeedsReplacing(config, store.read())
    && !store.replace({ distinctId: config.distinctId, identified: config.isIdentified })) {
    return undefined;
  }
  sdk.init(plan.key, plan.options);
  // A subscription registered before anything rotates the recording's id: both an idle rotation and a later sign-in do, and main stamps its own events with the id the recording holds (ONL-2343).
  sdk.onSessionId((sessionId) => { reportSession(sessionId === '' ? null : sessionId); });
  const adopt = (distinctId?: string): void => {
    sdk.reset(true);
    if (distinctId !== undefined) sdk.register({ distinct_id: distinctId, $device_id: distinctId });
  };
  return createReplayIdentityMirror(config, (distinctId) => sdk.identify(distinctId), adopt);
}
