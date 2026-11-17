import { beforeEach, expect, test } from 'bun:test';
import type { TelemetryConfig } from '@studio/events';
import type { PersistedReplayIdentity } from './derive.js';
import { replayConsentController, startReplay, type ConsentReplaySdk, type ReplaySdk } from './start.js';
import type { ReplayStore } from './store.js';

const ENABLED: TelemetryConfig = {
  enabled: true, key: 'phc_test', host: 'https://collector.invalid',
  distinctId: 'install-anonymous', isIdentified: false, identityRevision: 0, sessionId: 'launch-session',
};

let calls: unknown[][] = [];
let reported: Array<string | null> = [];
let rotations = 0;
/** What the store holds when this boot reads it. */
let disk: PersistedReplayIdentity | 'unreadable' | undefined;
let writes: PersistedReplayIdentity[] = [];
let writable = true;
/** What the SDK carries in this launch: an id, and the person it identified while holding it. */
let held: { distinctId: string; person?: string } | undefined;
/** The stored id each `$identify` inside `init` joined to the account. */
let linked: string[] = [];
let announce: (sessionId: string) => void = () => {};

const sdk: ReplaySdk = {
  init: (_key, options) => {
    const asked = options.bootstrap?.distinctID;
    if (asked === undefined) return;
    const existing = options.persistence === 'memory' || disk === 'unreadable' ? undefined : disk;
    if (options.bootstrap?.isIdentifiedID === true && existing !== undefined && existing.distinctId !== asked) {
      // The pinned SDK keeps a person it has already identified, and links a stored anonymous id to the account — both inside `init`.
      // Stricter than the real branch, which also requires the stored state to say `anonymous` exactly (posthog-core.js), so the product's decision stays on the safe side.
      if (existing.identified) held = { distinctId: existing.distinctId, person: existing.distinctId };
      else {
        linked.push(existing.distinctId);
        held = { distinctId: asked, person: asked };
      }
      return;
    }
    // Any other bootstrap takes the id it is given, and leaves the person behind it where it is.
    held = { distinctId: asked, ...(existing?.identified === true ? { person: existing.distinctId } : {}) };
  },
  identify: (distinctId) => { calls.push(['identify', distinctId]); held = { distinctId, person: distinctId }; },
  reset: (resetDevice) => {
    calls.push(['reset', resetDevice]);
    rotations += 1;
    held = { distinctId: `rotated-${rotations}` };
    announce(`session-${rotations}`);
  },
  register: (properties) => {
    calls.push(['register', properties]);
    const next = properties['distinct_id'];
    if (typeof next === 'string') held = { distinctId: next };
  },
  onSessionId: (listener) => { announce = listener; listener(`session-${rotations}`); },
};

const store: ReplayStore = {
  read: () => disk,
  replace: (identity) => {
    if (!writable) return false;
    writes.push(identity);
    disk = identity;
    return true;
  },
};

function boot(config: TelemetryConfig): (next: TelemetryConfig) => void {
  const mirror = startReplay(sdk, store, config, (sessionId) => { reported.push(sessionId); });
  if (mirror === undefined) throw new Error('replay did not start');
  return mirror;
}

beforeEach(() => {
  calls = [];
  reported = [];
  rotations = 0;
  disk = undefined;
  writes = [];
  writable = true;
  held = undefined;
  linked = [];
  announce = () => {};
});

test('a store holding another identified person is this launch’s own before the SDK can keep it', () => {
  disk = { distinctId: 'user_B', identified: true };

  boot({ ...ENABLED, distinctId: 'user_A', isIdentified: true });

  expect(writes).toEqual([{ distinctId: 'user_A', identified: true }]);
  expect(held).toEqual({ distinctId: 'user_A', person: 'user_A' });
  // Nothing was left to repair, so nothing records under the other person and no rotation throws a recording away.
  expect(calls).toEqual([]);
  expect(reported).toEqual(['session-0']);
});

test('a boot the store already agrees with rewrites nothing', () => {
  disk = { distinctId: 'user_A', identified: true };

  boot({ ...ENABLED, distinctId: 'user_A', isIdentified: true });

  expect(writes).toEqual([]);
  expect(calls).toEqual([]);
  expect(reported).toEqual(['session-0']);
});

test('a launch main names no account for keeps none of the person the store still carries', () => {
  // Signed in as B, quit without signing out: a bootstrap rewrites the id, and would leave the person behind it.
  disk = { distinctId: 'user_B', identified: true };

  boot({ ...ENABLED });

  expect(writes).toEqual([{ distinctId: 'install-anonymous', identified: false }]);
  expect(held).toEqual({ distinctId: 'install-anonymous' });
  expect(calls).toEqual([]);
});

test('the anonymous id main says this account has taken is the one the bootstrap may link', () => {
  disk = { distinctId: 'install-anonymous', identified: false };

  boot({ ...ENABLED, distinctId: 'user_A', isIdentified: true, linkableAnonymousId: 'install-anonymous' });

  expect(writes).toEqual([]);
  expect(linked).toEqual(['install-anonymous']);
});

test('an anonymous id main does not say this account has taken is gone before the bootstrap can link it', () => {
  // Left by a launch whose account was confirmed while this one recorded nowhere, so it is already somebody's.
  disk = { distinctId: 'launch-1-anonymous', identified: false };

  boot({ ...ENABLED, distinctId: 'user_B', isIdentified: true, linkableAnonymousId: 'install-anonymous' });

  expect(linked).toEqual([]);
  expect(writes).toEqual([{ distinctId: 'user_B', identified: true }]);
  expect(held).toEqual({ distinctId: 'user_B', person: 'user_B' });
});

test('an account that may link nothing links nothing', () => {
  disk = { distinctId: 'install-anonymous', identified: false };

  boot({ ...ENABLED, distinctId: 'user_A', isIdentified: true });

  expect(linked).toEqual([]);
  expect(writes).toEqual([{ distinctId: 'user_A', identified: true }]);
});

test('a store nothing can read is replaced rather than booted from', () => {
  disk = 'unreadable';

  boot({ ...ENABLED, distinctId: 'user_A', isIdentified: true });

  expect(writes).toEqual([{ distinctId: 'user_A', identified: true }]);
  expect(held).toEqual({ distinctId: 'user_A', person: 'user_A' });
});

test('a store that will not take this launch’s own identity records nothing at all', () => {
  disk = 'unreadable';
  writable = false;

  expect(startReplay(sdk, store, { ...ENABLED, distinctId: 'user_A', isIdentified: true }, () => {})).toBeUndefined();

  expect(held).toBeUndefined();
  expect(reported).toEqual([]);
});

test('a launch no account owns leaves the store as it found it', () => {
  disk = { distinctId: 'install-anonymous', identified: false };

  boot({ ...ENABLED, distinctId: 'launch-1', unowned: true });

  expect(writes).toEqual([]);
  expect(disk).toEqual({ distinctId: 'install-anonymous', identified: false });
  expect(held).toEqual({ distinctId: 'launch-1' });
});

test('the install’s own anonymous person is the one the account takes with it', () => {
  disk = { distinctId: 'install-anonymous', identified: false };

  const mirror = boot({ ...ENABLED });
  expect(calls).toEqual([]);

  mirror({ ...ENABLED, distinctId: 'user_A', isIdentified: true, identityRevision: 1 });

  // No reset: the id the SDK holds is this install's own, and `$identify` links it to the account.
  expect(calls).toEqual([['identify', 'user_A']]);
});

test('a launch no account owns is never the one the answering account takes with it', () => {
  const mirror = boot({ ...ENABLED, distinctId: 'launch-1', unowned: true });

  expect(held).toEqual({ distinctId: 'launch-1' });
  expect(calls).toEqual([]);

  mirror({ ...ENABLED, distinctId: 'user_A', isIdentified: true, identityRevision: 1 });

  // Reset first: the launch id is nobody's, so `$identify` must leave it behind rather than link it.
  expect(calls).toEqual([['reset', true], ['identify', 'user_A']]);
  expect(held).toEqual({ distinctId: 'user_A', person: 'user_A' });
});

test('a launch no account owns and an account that never answers keeps the launch its own', () => {
  const mirror = boot({ ...ENABLED, distinctId: 'launch-1', unowned: true });
  mirror({ ...ENABLED, distinctId: 'launch-1', unowned: true, identityRevision: 1 });

  expect(calls).toEqual([]);
  expect(held).toEqual({ distinctId: 'launch-1' });
});

test('a disabled config starts nothing at all', () => {
  expect(startReplay(sdk, store, { enabled: false }, () => {})).toBeUndefined();
  expect(held).toBeUndefined();
  expect(calls).toEqual([]);
  expect(reported).toEqual([]);
});

test('consent can start disabled, enable replay, stop it, and enable it again', () => {
  const privacyCalls: string[] = [];
  const privacySdk: ConsentReplaySdk = {
    ...sdk,
    opt_out_capturing: () => { privacyCalls.push('out'); },
    opt_in_capturing: (options) => { expect(options.captureEventName).toBe(false); privacyCalls.push('in'); },
    stopSessionRecording: () => { privacyCalls.push('stop'); },
    set_config: (options) => { expect(options.disable_session_recording).toBe(false); privacyCalls.push('resume'); },
  };
  const update = replayConsentController(privacySdk, store, () => {});
  update({ enabled: false });
  expect(held).toBeUndefined();
  expect(privacyCalls).toEqual([]);
  update(ENABLED);
  expect(held?.distinctId).toBe(ENABLED.enabled ? ENABLED.distinctId : '');
  update({ enabled: false });
  expect(privacyCalls).toEqual(['in', 'resume', 'out', 'stop']);
  update({ ...ENABLED, distinctId: 'user_B', isIdentified: true, identityRevision: 1 });
  expect(held).toEqual({ distinctId: 'user_B', person: 'user_B' });
  expect(privacyCalls).toEqual(['in', 'resume', 'out', 'stop', 'in', 'resume']);
});
