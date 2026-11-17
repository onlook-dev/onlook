/* The real pinned SDK, because the identity a replay rides is decided inside posthog-js. The product's own specifier
   (`dist/module.no-external`) is module-mocked process-wide by the boot suite, so this loads that package's root entry (ONL-2882). */

import { afterAll, afterEach, beforeEach, expect, test } from 'bun:test';
import type { EnabledTelemetryConfig, TelemetryConfig } from '@studio/events';
import '../testing/dom.js';
import { REPLAY_PERSISTENCE_NAME, replayInitPlan } from './derive.js';
import { startReplay, type ReplaySdk } from './start.js';
import { replayStore } from './store.js';

interface CapturedEvent {
  event: string;
  properties: Record<string, unknown>;
}

interface PostHogLike {
  init: (key: string, options: Record<string, unknown>, name: string) => PostHogLike;
  get_distinct_id: () => string;
  get_property: (key: string) => unknown;
  identify: (distinctId: string) => void;
  reset: (resetDevice: boolean) => void;
  register: (properties: Record<string, unknown>) => void;
  onSessionId: (listener: (sessionId: string) => void) => () => void;
  capture: (event: string) => void;
}

const ownFetch = globalThis.fetch;
// Installed before the SDK loads: it reads `fetch` off the global once, at its own module scope.
globalThis.fetch = Object.assign(async () => new Response(JSON.stringify({ sessionRecording: false, featureFlags: {}, supportedCompression: [] }), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
}), { preconnect: ownFetch.preconnect }) as typeof fetch;

const posthog = (await import('posthog-js')).default as unknown as PostHogLike;

afterAll(() => {
  globalThis.fetch = ownFetch;
});

const LAUNCH_SESSION = '01920000-0000-7000-8000-000000000001';
const ENTRY = `ph_${REPLAY_PERSISTENCE_NAME}`;

const CONFIG: EnabledTelemetryConfig = {
  enabled: true, key: 'phc_unset', host: 'https://collector.invalid',
  distinctId: 'install-anonymous', isIdentified: false, identityRevision: 0, sessionId: LAUNCH_SESSION,
};

let instances = 0;
let launch = 0;
let token: string;
let live: PostHogLike | undefined;
/** Every instance a test started: the product names the store, so instances of different tests share one, and each test clears its own. */
let booted: PostHogLike[];
let captured: CapturedEvent[];
let reported: Array<string | null>;
/** What the recorder extension held when posthog-js constructed it, which it does inside `init`. */
let recorderSaw: Array<{ distinctId: string; cachedEnable: unknown }>;

/** Stands in for the recorder, whose real class this suite does not load: the product imports it for its side effect. */
class RecorderWatch {
  constructor(instance: PostHogLike) {
    recorderSaw.push({
      distinctId: instance.get_distinct_id(),
      cachedEnable: instance.get_property('$session_recording_remote_config'),
    });
  }
  initialize(): void {}
  startIfEnabledOrStop(): void {}
  stopRecording(): void {}
  onRemoteConfig(): void {}
}

beforeEach(() => {
  instances += 1;
  // One token per test for instance names the SDK will accept twice; the store is named by the product, so it is cleared instead.
  token = `phc_identity_${instances}`;
  localStorage.removeItem(ENTRY);
  booted = [];
  live = undefined;
  captured = [];
  reported = [];
  recorderSaw = [];
});

afterEach(() => {
  for (const instance of booted) instance.reset(true);
});

function started(): PostHogLike {
  if (live === undefined) throw new Error('the SDK was never initialized');
  return live;
}

/** What a launch before this one left in the renderer's own store. */
function seed(stored: Record<string, unknown>): void {
  localStorage.setItem(ENTRY, JSON.stringify(stored));
}

function stored(): Record<string, unknown> {
  const raw = localStorage.getItem(ENTRY);
  return raw === null ? {} : JSON.parse(raw) as Record<string, unknown>;
}

function initialize(options: Record<string, unknown>): void {
  launch += 1;
  live = posthog.init(token, {
    ...options,
    // None of these touch identity: no timer reaches the network after the test, happy-dom's driven navigator
    // stops dropping captures, and no device-model lookup writes to the store after it.
    request_batching: false,
    opt_out_useragent_filter: true,
    disableDeviceModel: true,
    __extensionClasses: { sessionRecording: RecorderWatch },
    // In the init options, so it sees what `init` captures of its own accord; a hook attached afterwards cannot.
    before_send: (event: CapturedEvent | null) => {
      if (event !== null) captured.push(event);
      return event;
    },
  }, `replay_${instances}_${launch}`);
  booted.push(started());
}

const sdk: ReplaySdk = {
  init: (_key, options) => { initialize(options as unknown as Record<string, unknown>); },
  identify: (distinctId) => { started().identify(distinctId); },
  reset: (resetDevice) => { started().reset(resetDevice); },
  register: (properties) => { started().register(properties); },
  onSessionId: (listener) => { started().onSessionId(listener); },
};

function boot(config: EnabledTelemetryConfig): (next: TelemetryConfig) => void {
  const mirror = startReplay(sdk, replayStore, { ...config, key: token }, (sessionId) => { reported.push(sessionId); });
  if (mirror === undefined) throw new Error('replay did not start');
  return mirror;
}

/** The SDK's effective identity, read off an ordinary capture the way a recorder's own events carry it. */
function attribution(): Record<string, unknown> {
  started().capture('replay_probe');
  const probe = captured.filter((event) => event.event === 'replay_probe').at(-1);
  if (probe === undefined) throw new Error('the probe was never captured');
  return probe.properties;
}

/** The stored id the last `$identify` joined to the account, or `undefined` when it joined nothing. */
function linkedBy(): string | undefined {
  const identify = captured.filter((event) => event.event === '$identify').at(-1);
  const anon = identify?.properties['$anon_distinct_id'];
  return typeof anon === 'string' ? anon : undefined;
}

function deviceId(): unknown {
  return started().get_property('$device_id');
}

test('the SDK keeps a person it already identified through a bootstrap naming another, so asking is not enough', () => {
  seed({ distinct_id: 'user_B', $device_id: 'device_B', $user_state: 'identified', $user_id: 'user_B' });
  const plan = replayInitPlan({ ...CONFIG, key: token, distinctId: 'user_A', isIdentified: true });
  if (plan === null) throw new Error('no plan');

  // The ask alone, with nothing settled first: this is the behavior the boot's own reconciliation exists for.
  initialize(plan.options as unknown as Record<string, unknown>);

  expect(started().get_distinct_id()).toBe('user_B');
});

test('the SDK links a stored anonymous id to the account inside init, where no repair can reach it', () => {
  // What a launch no account owned would leave behind if it persisted anything.
  seed({ distinct_id: 'launch-1', $device_id: 'launch-1', $user_state: 'anonymous' });
  const plan = replayInitPlan({ ...CONFIG, key: token, distinctId: 'user_A', isIdentified: true });
  if (plan === null) throw new Error('no plan');

  initialize(plan.options as unknown as Record<string, unknown>);

  // The `$identify` naming the stored id went out inside `init`, and by the time anything could read what
  // the SDK holds, the id already agrees with what the boot asked for.
  expect(linkedBy()).toBe('launch-1');
  expect(started().get_distinct_id()).toBe('user_A');
  expect(deviceId()).toBe('launch-1');
  expect(stored()['$user_state']).toBe('identified');
});

test('the recorder is constructed inside init already holding this launch’s own account', () => {
  // Signed in as B on a launch that recorded: the stored enable is what starts the recorder again.
  seed({
    distinct_id: 'user_B', $device_id: 'device_B', $user_state: 'identified', $user_id: 'user_B',
    $session_recording_remote_config: { enabled: true },
  });

  let atInit: Record<string, unknown> | undefined;
  const watched: ReplaySdk = { ...sdk, init: (key, options) => { atInit = stored(); sdk.init(key, options); } };
  const mirror = startReplay(watched, replayStore, { ...CONFIG, key: token, distinctId: 'user_A', isIdentified: true },
    (sessionId) => { reported.push(sessionId); });
  if (mirror === undefined) throw new Error('replay did not start');

  // posthog-js builds and starts its extensions inside `init`, before it even applies the bootstrap identity,
  // so the store this boot leaves is the only thing that decides whose session the recorder's first frame is.
  expect(recorderSaw).toEqual([{ distinctId: 'user_A', cachedEnable: undefined }]);
  // The store it read, as the boot left it.
  expect(atInit?.['distinct_id']).toBe('user_A');
  expect(atInit?.['$user_id']).toBeUndefined();
  expect(attribution()['distinct_id']).toBe('user_A');
  expect(JSON.stringify(captured)).not.toContain('user_B');
});

test('a store that will not hold this launch’s own identity records nothing at all', () => {
  seed({ distinct_id: 'user_B', $device_id: 'device_B', $user_state: 'identified', $user_id: 'user_B' });
  const refused = { read: replayStore.read, replace: () => false };

  const mirror = startReplay(sdk, refused, { ...CONFIG, key: token, distinctId: 'user_A', isIdentified: true }, () => {});

  expect(mirror).toBeUndefined();
  expect(live).toBeUndefined();
  expect(recorderSaw).toEqual([]);
});

test('an identity the shipped build left under its own name is not one this boot can link', () => {
  // Before this change the SDK named the store from the project token, and mirrored the identity into a cookie.
  const legacy = `ph_${token}_posthog`;
  const left = { distinct_id: 'user_B', $device_id: 'device_B', $user_state: 'identified', $user_id: 'user_B' };
  localStorage.setItem(legacy, JSON.stringify(left));
  document.cookie = `${legacy}=${encodeURIComponent(JSON.stringify(left))}; path=/`;
  try {
    boot({ ...CONFIG, distinctId: 'user_A', isIdentified: true });

    expect(started().get_distinct_id()).toBe('user_A');
    expect(linkedBy()).toBeUndefined();
    expect(deviceId()).not.toBe('device_B');
    expect(JSON.stringify(captured)).not.toContain('user_B');
    expect(attribution()['distinct_id']).toBe('user_A');
  } finally {
    localStorage.removeItem(legacy);
  }
});

test('a boot the provider already answered for records as that account, never as the one the SDK kept', () => {
  seed({ distinct_id: 'user_B', $device_id: 'device_B', $user_state: 'identified', $user_id: 'user_B' });

  boot({ ...CONFIG, distinctId: 'user_A', isIdentified: true });

  expect(started().get_distinct_id()).toBe('user_A');
  const properties = attribution();
  expect(properties['distinct_id']).toBe('user_A');
  // Identified, so the account's own replay still rides its person.
  expect(properties['$process_person_profile']).toBe(true);
  // Nothing of the kept person was left to link, so the boot emits no `$identify` of its own at all.
  expect(linkedBy()).toBeUndefined();
  expect(JSON.stringify(captured)).not.toContain('user_B');
  expect(JSON.stringify(captured)).not.toContain('device_B');
  expect(JSON.stringify(stored())).not.toContain('user_B');
  // Main is told the id the recording carries, from the launch's own onwards, so its events stamp the same session (ONL-2343).
  expect(reported[0]).toBe(LAUNCH_SESSION);
  expect(properties['$session_id']).toBe(reported.at(-1));
});

test('an account signing in on a later launch never takes the person an earlier launch left behind', () => {
  // An ordinary anonymous launch left the install's own identity where the next launch reads it.
  seed({ distinct_id: 'install-anonymous', $device_id: 'install-anonymous', $user_state: 'anonymous' });

  // A launch no account owned, which main then confirmed as A: main links the install's own id to A, and this launch keeps nothing of itself.
  boot({ ...CONFIG, distinctId: 'launch-1', unowned: true })(
    { ...CONFIG, distinctId: 'user_A', isIdentified: true, linkableAnonymousId: 'install-anonymous', identityRevision: 1 });
  expect(stored()['distinct_id']).toBe('install-anonymous');

  // A relaunch A answers for, which is where the recorder hands the install's own person to that account and quits holding it.
  boot({ ...CONFIG, distinctId: 'user_A', isIdentified: true, linkableAnonymousId: 'install-anonymous' });
  expect(linkedBy()).toBe('install-anonymous');
  expect(stored()['distinct_id']).toBe('user_A');
  expect(stored()['$device_id']).toBe('install-anonymous');

  // Signed out and into B somewhere this recorder never ran — the mixed record of ONL-2882 — and B is confirmed before it boots.
  captured = [];
  boot({ ...CONFIG, distinctId: 'user_B', isIdentified: true, linkableAnonymousId: 'rotated-anonymous' });

  expect(started().get_distinct_id()).toBe('user_B');
  expect(attribution()['distinct_id']).toBe('user_B');
  // Neither A's person nor the id A took is linked to B, carried by anything B's launch emits, or left for the launch after it.
  expect(linkedBy()).toBeUndefined();
  expect(JSON.stringify(captured)).not.toContain('install-anonymous');
  expect(JSON.stringify(captured)).not.toContain('user_A');
  expect(typeof deviceId()).toBe('string');
  expect(deviceId()).not.toBe('install-anonymous');
  expect(JSON.stringify(stored())).not.toContain('install-anonymous');
  expect(JSON.stringify(stored())).not.toContain('user_A');
  expect(stored()['distinct_id']).toBe('user_B');
});

test('a launch no account owns leaves nothing of itself behind for a later launch to link', () => {
  const kept = { distinct_id: 'install-anonymous', $device_id: 'install-anonymous', $user_state: 'anonymous' };
  seed(kept);

  boot({ ...CONFIG, distinctId: 'launch-1', unowned: true });

  const held = attribution();
  expect(held['distinct_id']).toBe('launch-1');
  // Nobody's id is nobody: the launch makes no person of its own.
  expect(held['$process_person_profile']).toBe(false);
  // Nothing of this launch reaches the store, so no later bootstrap can find an id of its to link to an account.
  expect(stored()).toEqual(kept);
  expect(document.cookie).not.toContain(ENTRY);
});

test('a launch no account owns is not given to the account that answers later', () => {
  const mirror = boot({ ...CONFIG, distinctId: 'launch-1', unowned: true });
  expect(attribution()['distinct_id']).toBe('launch-1');

  mirror({ ...CONFIG, distinctId: 'user_A', isIdentified: true, identityRevision: 1 });

  expect(started().get_distinct_id()).toBe('user_A');
  expect(linkedBy()).not.toBe('launch-1');
  expect(attribution()['distinct_id']).toBe('user_A');
});

test('the install’s own anonymous person is the one the answering account takes with it', () => {
  seed({ distinct_id: 'install-anonymous', $device_id: 'install-anonymous', $user_state: 'anonymous' });

  const mirror = boot({ ...CONFIG });
  expect(started().get_distinct_id()).toBe('install-anonymous');

  mirror({ ...CONFIG, distinctId: 'user_A', isIdentified: true, identityRevision: 1 });

  expect(linkedBy()).toBe('install-anonymous');
  expect(started().get_distinct_id()).toBe('user_A');
  // The install's own device survived: nothing reset it out from under the link.
  expect(stored()['$device_id']).toBe('install-anonymous');
});

test('a boot whose account main says already took the stored anonymous id keeps that person', () => {
  seed({ distinct_id: 'install-anonymous', $device_id: 'install-anonymous', $user_state: 'anonymous' });

  boot({ ...CONFIG, distinctId: 'user_A', isIdentified: true, linkableAnonymousId: 'install-anonymous' });

  // Left where the SDK makes the link itself, inside `init`, which is the one link main says this account is owed.
  expect(linkedBy()).toBe('install-anonymous');
  expect(started().get_distinct_id()).toBe('user_A');
  expect(deviceId()).toBe('install-anonymous');
});

test('a launch main names no account for carries nothing of the person the SDK still holds', () => {
  // Signed in as B, quit without signing out: the id is rewritten by the bootstrap, the person is not.
  seed({ distinct_id: 'user_B', $device_id: 'device_B', $user_state: 'identified', $user_id: 'user_B' });

  boot({ ...CONFIG, distinctId: 'fresh-anonymous' });

  expect(started().get_property('$user_id')).toBeUndefined();
  const properties = attribution();
  expect(properties['distinct_id']).toBe('fresh-anonymous');
  expect(JSON.stringify(captured)).not.toContain('user_B');
});
