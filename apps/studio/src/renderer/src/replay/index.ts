/* The import pair below is the strict-CSP contract: `module.no-external` is the
   SDK with no remote-code loader, and the side-effect `posthog-recorder` import
   registers `initSessionRecording` on `__PosthogExtensions__`. Together they
   keep `script-src 'self'` true. */

import posthog from 'posthog-js/dist/module.no-external';
import 'posthog-js/dist/posthog-recorder';
import { replayConsentController } from './start.js';
import { replayStore } from './store.js';
import { replayRequestConsent, type ReplayTransportSdk } from './request-consent.js';
import type { TelemetryConfig } from '@studio/events';
import { studio } from '../bridge.js';

let started = false;

export function isReplayRecording(): boolean {
  if (!started) return false;
  try {
    return posthog.sessionRecordingStarted();
  } catch {
    return false;
  }
}

/** Called only on the product surface — the developer instruments are not user
 * sessions and never record. */
export async function initReplay(): Promise<void> {
  if (started) return;
  started = true;

  let config: TelemetryConfig;
  const pending: TelemetryConfig[] = [];
  let mirror: ((config: TelemetryConfig) => void) | undefined;
  const unsubscribe = studio().onTelemetryIdentityChanged((next) => {
    if (mirror === undefined) pending.push(next);
    else mirror(next);
  });
  try {
    config = await studio().telemetryConfig();
  } catch {
    unsubscribe();
    // A broken channel disables replay rather than initializing on a guess.
    return;
  }

  // A throwing SDK boot degrades to "no recorder" rather than escaping as an
  // unhandled rejection; `started` stays true, so a failed boot is not retried.
  try {
    const requestConsent = replayRequestConsent(posthog as unknown as ReplayTransportSdk);
    const replayConsent = replayConsentController(posthog, replayStore, (sessionId) => { studio().telemetrySession({ sessionId }); });
    mirror = (next) => {
      requestConsent(next.enabled);
      replayConsent(next);
    };
    mirror(pending.at(-1) ?? config);
    // Deliberately never unsubscribed otherwise: this module lives as long as the renderer.
    pending.length = 0;
  } catch {
    unsubscribe();
    // No recorder. Deliberately nothing else: same posture as a broken channel.
  }
}
