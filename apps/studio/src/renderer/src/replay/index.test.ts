import { expect, mock, test } from 'bun:test';
import type { TelemetryConfig } from '@studio/events';

const calls: unknown[][] = [];
let receiveIdentity: (config: TelemetryConfig) => void = () => {};
let receiveSession: (session: string) => void = () => {};
let session = 0;
const sdk = {
  __request_queue: [],
  _send_request: () => {},
  init: () => {},
  identify: (distinctId: string) => calls.push(['identify', distinctId]),
  reset: (device: boolean) => { calls.push(['reset', device]); receiveSession(`session-${++session}`); },
  register: (properties: unknown) => calls.push(['register', properties]),
  // The real one answers a new subscriber with the session it already holds (posthog-js sessionid.js).
  onSessionId: (listener: typeof receiveSession) => { receiveSession = listener; listener(`session-${session}`); },
  opt_out_capturing: () => { calls.push(['out']); },
  opt_in_capturing: () => {},
  stopSessionRecording: () => { calls.push(['stop']); },
  set_config: () => {},
};
mock.module('posthog-js/dist/module.no-external', () => ({ default: sdk }));
mock.module('posthog-js/dist/posthog-recorder', () => ({}));

test('the replay SDK resets its session and device before adopting main’s anonymous identity', async () => {
  const originalWindow = globalThis.window;
  const initial: TelemetryConfig = {
    enabled: true, key: 'phc_test', host: 'http://127.0.0.1', distinctId: 'user_A',
    isIdentified: true, identityRevision: 0, sessionId: 'initial-session',
  };
  const storage = new Map<string, string>();
  globalThis.window = {
    // The boot reads the SDK's own store before initializing it, so the composition root is not exercised through a `catch`.
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
    },
    studio: {
      telemetryConfig: async () => initial,
      onTelemetryIdentityChanged: (listener: typeof receiveIdentity) => { receiveIdentity = listener; return () => {}; },
      telemetrySession: (report: unknown) => calls.push(['session', report]),
    },
  } as unknown as Window & typeof globalThis;
  try {
    const { initReplay } = await import('./index.js');
    await initReplay();
    receiveIdentity({ ...initial, distinctId: 'anonymous-between', isIdentified: false, identityRevision: 1 });
    receiveIdentity({ ...initial, distinctId: 'anonymous-for-B', isIdentified: false, identityRevision: 2 });
    receiveIdentity({ ...initial, distinctId: 'user_B', identityRevision: 3 });
    expect(calls).toEqual([
      // The session the boot already holds, reported before any identity moves.
      ['session', { sessionId: 'session-0' }],
      ['reset', true], ['session', { sessionId: 'session-1' }],
      ['register', { distinct_id: 'anonymous-between', $device_id: 'anonymous-between' }],
      ['reset', true], ['session', { sessionId: 'session-2' }],
      ['register', { distinct_id: 'anonymous-for-B', $device_id: 'anonymous-for-B' }],
      ['identify', 'user_B'],
    ]);
    receiveIdentity({ enabled: false });
    expect(calls.slice(-2)).toEqual([['out'], ['stop']]);
  } finally {
    globalThis.window = originalWindow;
  }
});
