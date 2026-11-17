import { afterAll, afterEach, beforeEach, expect, mock, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { StudioIdentity } from '@studio/events';
import { clearIdentity, resetIdentityCache, writeIdentity } from '../identity/store.js';
import { readStateFile } from '../state/file.js';
import { pendingBatches, readBatch, type OutboxEvent } from './outbox.js';
import {
  capture,
  currentDistinctId,
  currentTelemetryConfig,
  flush,
  identifyPerson,
  initTelemetry,
  peekQueueForTesting,
  receiveWebAttribution,
  resetTelemetryForTesting,
  resetTelemetryIdentity,
  setAppForTesting,
} from './index.js';

mock.module('../workspace/store.js', () => ({ knownProject: () => undefined }));

// Credentials belong to A; the record on disk names B. Only the provider can say which is this session's.
const ACCOUNT_A: StudioIdentity = { email: 'a@example.com', source: 'provider', subject: 'user_A', previousSubject: 'legacy_a' };
const ACCOUNT_B: StudioIdentity = { email: 'b@example.com', source: 'provider', subject: 'user_B', previousSubject: 'legacy_b' };

const KEYS = ['STUDIO_STATE_ROOT', 'STUDIO_POSTHOG_KEY', 'STUDIO_POSTHOG_HOST', 'STUDIO_TELEMETRY', 'MAIN_VITE_POSTHOG_KEY', 'AGENT_HEADLESS', 'STUDIO_TELEMETRY_HEADLESS', 'STUDIO_FLAGS', 'MAIN_VITE_FLAG_DEFAULTS'] as const;
const saved = new Map<string, string | undefined>(KEYS.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;
const made: string[] = [];

let root: string;
let sent: OutboxEvent[];
let status: number;

interface StoredAnonymous { id: string; reset: boolean; identifiedAs?: string }

function anonymous(): StoredAnonymous | null {
  const file = readStateFile(join(root, 'telemetry-anonymous-id'), 1);
  return file.kind === 'data' ? file.data as StoredAnonymous : null;
}

function installId(): string {
  const file = readStateFile(join(root, 'install-id'), 1);
  if (file.kind !== 'data' || typeof file.data !== 'string') throw new Error('no install id');
  return file.data;
}

function mergeMarked(): boolean {
  return readStateFile(join(root, 'posthog-merge-completed.json'), 1).kind === 'data';
}

/** What survives a kill: a drained batch leaves the outbox only once PostHog took it. */
function persisted(): OutboxEvent[] {
  return pendingBatches().flatMap((path) => readBatch(path) ?? []);
}

function named(events: readonly OutboxEvent[], event: string): OutboxEvent[] {
  return events.filter((entry) => entry.event === event);
}

function property(event: OutboxEvent | undefined, key: string): string {
  const value = event?.properties[key];
  if (typeof value !== 'string') throw new Error(`no ${key}`);
  return value;
}

function enabledConfig(): Extract<ReturnType<typeof currentTelemetryConfig>, { enabled: true }> {
  const config = currentTelemetryConfig();
  if (!config.enabled) throw new Error('telemetry disabled');
  return config;
}

function expectNoTraceOf(account: StudioIdentity): void {
  const everything = JSON.stringify([sent, persisted(), peekQueueForTesting(), anonymous()]);
  expect(everything).not.toContain(account.subject!);
  expect(everything).not.toContain(account.email);
  expect(everything).not.toContain(account.previousSubject!);
}

const webParams = (): URLSearchParams => new URLSearchParams({ ph_id: 'web-anonymous-id', utm_source: 'test' });

beforeEach(() => {
  resetTelemetryForTesting();
  resetIdentityCache();
  for (const key of KEYS) delete process.env[key];
  root = mkdtempSync(join(tmpdir(), 'studio-startup-identity-'));
  made.push(root);
  process.env['STUDIO_STATE_ROOT'] = root;
  process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
  process.env['STUDIO_POSTHOG_HOST'] = 'https://collector.invalid';
  setAppForTesting({ getPath: () => root, getVersion: () => '0.0.0-test', getLocale: () => 'en-US', isPackaged: false });
  sent = [];
  status = 200;
  globalThis.fetch = Object.assign(async (input: unknown, init?: RequestInit) => {
    if (String(input).endsWith('/batch/')) {
      const body = JSON.parse(String(init?.body)) as { batch: OutboxEvent[] };
      sent.push(...body.batch);
    }
    return new Response('{}', { status });
  }, { preconnect: originalFetch.preconnect }) as typeof fetch;
});

afterEach(() => {
  resetTelemetryForTesting();
  setAppForTesting(undefined);
  globalThis.fetch = originalFetch;
  for (const key of KEYS) {
    const value = saved.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

afterAll(() => {
  resetIdentityCache();
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

test('a launch holds every event until the provider names the account, and sends none of them for the record it found', async () => {
  writeIdentity({ ...ACCOUNT_B });
  initTelemetry();

  expect(currentDistinctId()).toBeUndefined();
  expect(peekQueueForTesting().map((event) => event.event)).toEqual(['app_opened']);
  expect(sent).toEqual([]);
  expect(persisted()).toEqual([]);
  expect(mergeMarked()).toBe(false);
  expect(anonymous()).toBeNull();
  expectNoTraceOf(ACCOUNT_B);

  // The provider authenticates A, and the refresh repairs the record to the account it named.
  identifyPerson(writeIdentity({ ...ACCOUNT_A }));
  await flush();

  for (const event of sent) expect(event.distinct_id).toBe('user_A');
  expect(named(sent, 'app_opened')).toHaveLength(1);
  expect(named(sent, '$identify')[0]?.properties).toEqual({
    $anon_distinct_id: installId(),
    $set: { email: 'a@example.com', identity_source: 'workos' },
  });
  expect(named(sent, '$merge_dangerously').map((event) => event.properties)).toEqual([{ alias: 'legacy_a' }]);
  expect(mergeMarked()).toBe(true);
  expect(anonymous()?.identifiedAs).toBe('user_A');
  expectNoTraceOf(ACCOUNT_B);
});

test('the account the server confirms is the one the record named: the launch rides it, with the one merge it is owed', async () => {
  writeIdentity({ ...ACCOUNT_B });
  initTelemetry();

  identifyPerson({ ...ACCOUNT_B });
  await flush();

  const launch = named(sent, 'app_opened')[0];
  expect(launch?.distinct_id).toBe('user_B');
  // The wait costs the launch no person: the held event is still processed into the account it waited for.
  expect(launch?.properties['$process_person_profile']).toBeUndefined();
  expect(named(sent, '$identify')[0]?.properties).toEqual({
    $anon_distinct_id: installId(),
    $set: { email: 'b@example.com', identity_source: 'workos' },
  });
  expect(named(sent, '$merge_dangerously').map((event) => event.properties)).toEqual([{ alias: 'legacy_b' }]);
  expect(mergeMarked()).toBe(true);
  expect(anonymous()?.identifiedAs).toBe('user_B');
});

test('verification that never answers: the launch leaves under its own id, and no account is linked, merged or marked', async () => {
  // A collector that keeps refusing: the batch stays in the durable outbox, which is where a kept event is read.
  status = 500;
  writeIdentity({ ...ACCOUNT_B });
  initTelemetry();

  // The flush is the bound: offline, unavailable or refused, the launch does not wait past it.
  await flush();

  const kept = persisted();
  expect(kept.map((event) => event.event)).toEqual(['app_opened']);
  const launch = kept[0]!;
  expect(launch.distinct_id).toBe(property(launch, 'launch_id'));
  expect(launch.distinct_id).not.toBe(installId());
  // An id no account owns is nobody, so it is not made into a person either.
  expect(launch.properties['$process_person_profile']).toBe(false);
  expect(mergeMarked()).toBe(false);
  expect(anonymous()).toBeNull();
  expect(enabledConfig().isIdentified).toBe(false);
  // The id the recorder rides is nobody's too, so the renderer links it to no account either.
  expect(enabledConfig().unowned).toBe(true);
  expectNoTraceOf(ACCOUNT_B);
});

test('session cleanup before verification leaves the abandoned launch unowned when the same account returns', async () => {
  writeIdentity({ ...ACCOUNT_A });
  initTelemetry();
  identifyPerson({ ...ACCOUNT_A });
  await flush();
  resetTelemetryForTesting();
  resetIdentityCache();
  sent = [];
  initTelemetry();
  expect(currentDistinctId()).toBeUndefined();
  const launch = enabledConfig().distinctId;
  resetTelemetryIdentity();
  clearIdentity();
  const signedOut = currentDistinctId();
  if (signedOut === undefined) throw new Error('Expected a post-clear anonymous identity');
  capture('frame_tool_armed', {});
  identifyPerson(writeIdentity({ ...ACCOUNT_A }));
  await flush();
  const opening = named(sent, 'app_opened')[0];
  expect(opening?.distinct_id).toBe(launch);
  expect(opening?.properties['$process_person_profile']).toBe(false);
  expect(named(sent, 'frame_tool_armed')[0]?.distinct_id).toBe(signedOut);
  expect(named(sent, '$identify')[0]?.properties['$anon_distinct_id']).toBe(signedOut);
  expect(named(sent, '$identify')[0]?.properties['$anon_distinct_id']).not.toBe(launch);
  expect(named(sent, '$merge_dangerously')).toHaveLength(0);
});

test('an answer that arrives after the flush costs the launch its attribution, and gives it to no one else', async () => {
  writeIdentity({ ...ACCOUNT_B });
  initTelemetry();

  await flush();
  const launch = named(sent, 'app_opened')[0]!;
  expect(launch.distinct_id).toBe(property(launch, 'launch_id'));
  expect(launch.distinct_id).not.toBe(installId());
  expect(launch.properties['$process_person_profile']).toBe(false);
  expect(mergeMarked()).toBe(false);

  identifyPerson(writeIdentity({ ...ACCOUNT_A }));
  await flush();

  // The account gets the install's own anonymous history, not the launch id that rode no person.
  expect(named(sent, '$identify')[0]?.properties).toEqual({
    $anon_distinct_id: installId(),
    $set: { email: 'a@example.com', identity_source: 'workos' },
  });
  expect(named(sent, '$identify')[0]?.distinct_id).toBe('user_A');
  expect(named(sent, '$merge_dangerously').map((event) => event.properties)).toEqual([{ alias: 'legacy_a' }]);
  expect(mergeMarked()).toBe(true);
  expect(anonymous()?.identifiedAs).toBe('user_A');
  expectNoTraceOf(ACCOUNT_B);
});

test('a launch with no account to wait for owns its own id, and the recorder may link it', async () => {
  initTelemetry();

  const config = enabledConfig();
  // The install's own anonymous id, which a later sign-in is allowed to take with it.
  expect(config.distinctId).toBe(installId());
  expect(config.isIdentified).toBe(false);
  expect(config.unowned).toBeUndefined();
  // No account has taken it yet, so there is no link for the recorder to make on anyone's behalf.
  expect(config.linkableAnonymousId).toBeUndefined();
  await flush();
  expect(named(sent, 'app_opened')[0]?.distinct_id).toBe(installId());
});

test('an event captured after the wait ended still rides no person when the account finally answers', async () => {
  writeIdentity({ ...ACCOUNT_B });
  initTelemetry();

  // The flush ended the wait, so what follows is captured under an id no account owns.
  await flush();
  const launch = property(named(sent, 'app_opened')[0], 'launch_id');
  sent = [];
  capture('frame_tool_armed', {});

  identifyPerson(writeIdentity({ ...ACCOUNT_A }));
  await flush();

  const held = named(sent, 'frame_tool_armed')[0];
  expect(held?.distinct_id).toBe(launch);
  // Naming the account does not reach back: the id this event rode is still nobody's, and a person there would be nobody's.
  expect(held?.properties['$process_person_profile']).toBe(false);
  // The account takes the install's own anonymous history, never the launch id these events rode.
  expect(named(sent, '$identify')[0]?.properties['$anon_distinct_id']).toBe(installId());
  expect(JSON.stringify(named(sent, '$identify').concat(named(sent, '$merge_dangerously')))).not.toContain(launch);
  const config = enabledConfig();
  expect(config).toMatchObject({ distinctId: 'user_A', isIdentified: true });
  expect(config.unowned).toBeUndefined();
  expectNoTraceOf(ACCOUNT_B);
});

test('an install already linked to the account the record names still never attributes the launch to it', async () => {
  // The development build signed in as B and shares this userData, so the install's anonymous person is already B's.
  writeIdentity({ ...ACCOUNT_B });
  initTelemetry();
  identifyPerson({ ...ACCOUNT_B });
  await flush();
  const linked = anonymous();
  expect(linked?.identifiedAs).toBe('user_B');
  sent = [];

  // The signed build relaunches: B's record, A's credentials.
  resetTelemetryForTesting();
  resetIdentityCache();
  initTelemetry();
  expect(currentDistinctId()).toBeUndefined();

  identifyPerson(writeIdentity({ ...ACCOUNT_A }));
  await flush();

  for (const event of sent) expect(event.distinct_id).not.toBe('user_B');
  const identify = named(sent, '$identify')[0]!;
  expect(identify.distinct_id).toBe('user_A');
  const claimed = property(identify, '$anon_distinct_id');
  expect(claimed).not.toBe(linked?.id);
  expect(named(sent, 'app_opened')[0]?.distinct_id).toBe(claimed);
  // The marker B spent is never reset, so A takes no second irreversible merge.
  expect(named(sent, '$merge_dangerously')).toEqual([]);
  expect(mergeMarked()).toBe(true);
});

test('the recorder is told the one anonymous id the confirmed account took, and only once it is taken', async () => {
  writeIdentity({ ...ACCOUNT_B });
  initTelemetry();

  // Nothing is named yet, so the recorder is told of no id any account may take.
  expect(enabledConfig().linkableAnonymousId).toBeUndefined();

  identifyPerson(writeIdentity({ ...ACCOUNT_A }));
  await flush();

  const config = enabledConfig();
  // The same id main linked itself, so a recording of this install's own anonymous history joins that account and no other.
  expect(config.linkableAnonymousId).toBe(installId());
  expect(config.linkableAnonymousId).toBe(property(named(sent, '$identify')[0], '$anon_distinct_id'));
});

test('an anonymous id another account took is never the one the recorder is told it may link', async () => {
  // The development build signed in as B and shares this userData, so the install's anonymous person is already B's.
  writeIdentity({ ...ACCOUNT_B });
  initTelemetry();
  identifyPerson({ ...ACCOUNT_B });
  await flush();
  const taken = anonymous();
  expect(taken?.identifiedAs).toBe('user_B');

  // The signed build relaunches: B's record, A's credentials.
  resetTelemetryForTesting();
  resetIdentityCache();
  initTelemetry();
  identifyPerson(writeIdentity({ ...ACCOUNT_A }));
  await flush();

  const config = enabledConfig();
  expect(config.linkableAnonymousId).not.toBe(taken?.id);
  expect(config.linkableAnonymousId).toBe(anonymous()?.id);
  expect(anonymous()?.identifiedAs).toBe('user_A');
});

test('a web handoff arriving before the answer links to the account the provider names, never the record’s', async () => {
  process.env['STUDIO_FLAGS'] = 'web-attribution-link';
  writeIdentity({ ...ACCOUNT_B });
  initTelemetry();

  receiveWebAttribution(webParams());
  expect(currentDistinctId()).toBeUndefined();
  expect(sent).toEqual([]);

  identifyPerson(writeIdentity({ ...ACCOUNT_A }));
  await flush();

  const linked = sent.filter((event) => event.event === 'web_attribution_linked');
  expect(linked.map((event) => event.distinct_id)).toEqual(['user_A']);
  expect(linked[0]?.properties['website_person_id']).toBe('web-anonymous-id');
  expect(sent.some((event) => event.properties['$anon_distinct_id'] === 'web-anonymous-id')).toBe(false);
  expectNoTraceOf(ACCOUNT_B);
});
