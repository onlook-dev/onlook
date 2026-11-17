import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import type { AppLike } from './index.js';
import { readStateFile } from '../state/file.js';
import * as stateFiles from '../state/file.js';

const { clearIdentity, readIdentity, resetIdentityCache, writeIdentity } = await import('../identity/store.js');
const {
  flush,
  capture,
  currentDistinctId,
  currentTelemetryConfig,
  identifyPerson,
  initTelemetry,
  onTelemetryIdentityChanged,
  peekQueueForTesting,
  resetTelemetryForTesting,
  resetTelemetryIdentity,
  setAppForTesting,
  shutdownTelemetry,
} = await import('./index.js');

const made: string[] = [];

function makeRoot(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `studio-telemetry-${name}-`));
  made.push(root);
  return root;
}

function fakeApp(userData: string): AppLike {
  return {
    getPath: () => userData,
    getVersion: () => '0.0.0-test',
    getLocale: () => 'en-US',
    isPackaged: false,
  };
}

const ENV_KEYS = [
  'STUDIO_STATE_ROOT',
  'STUDIO_POSTHOG_KEY',
  'STUDIO_POSTHOG_HOST',
  'STUDIO_TELEMETRY',
  'MAIN_VITE_POSTHOG_KEY',
] as const;
const originalEnv = new Map<string, string | undefined>(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

function queuedSets(): Array<Record<string, unknown>> {
  return peekQueueForTesting()
    .filter((event) => event.event === '$set')
    .map((event) => event.properties);
}

let userData: string;

function persistedInstallId(): string {
  const file = readStateFile(join(userData, 'install-id'), 1);
  if (file.kind !== 'data' || typeof file.data !== 'string') throw new Error('missing install UUID');
  expect(file.version).toBe(1);
  expect(file.data).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  return file.data;
}

beforeEach(() => {
  resetTelemetryForTesting();
  resetIdentityCache();
  for (const key of ENV_KEYS) delete process.env[key];
  process.env['STUDIO_STATE_ROOT'] = makeRoot('state');
  userData = makeRoot('userdata');
  setAppForTesting(fakeApp(userData));
});

afterEach(() => {
  resetTelemetryForTesting();
  setAppForTesting(undefined);
  for (const key of ENV_KEYS) {
    const value = originalEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

describe('launch-load identification', () => {
  it('a stored identity queues exactly one $set — email + identity_source, nothing else', () => {
    writeIdentity({ email: '  Wren@Example.com ', source: 'manual' });
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';

    initTelemetry();

    const sets = queuedSets();
    expect(sets).toHaveLength(1);
    expect(sets[0]).toEqual({
      $set: { email: 'wren@example.com', identity_source: 'manual' },
    });
    expect(peekQueueForTesting().map((event) => event.event)).toEqual(['app_opened', '$set']);
  });

  it('no stored identity queues no $set and nothing breaks', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    expect(queuedSets()).toHaveLength(0);
    expect(peekQueueForTesting().map((event) => event.event)).toEqual(['app_opened']);
  });
});

describe('the once-per-launch dedupe', () => {
  it('the same identity again is silent; a different email re-sends', () => {
    writeIdentity({ email: 'wren@example.com', source: 'manual' });
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    identifyPerson({ email: 'wren@example.com', source: 'manual' });
    expect(queuedSets()).toHaveLength(1);

    identifyPerson({ email: 'juno@example.com', source: 'manual' });
    const sets = queuedSets();
    expect(sets).toHaveLength(2);
    expect(sets[1]).toEqual({
      $set: { email: 'juno@example.com', identity_source: 'manual' },
    });
  });

  it('the same email through a different door (source change) re-sends', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    identifyPerson({ email: 'wren@example.com', source: 'manual' });
    identifyPerson({ email: 'wren@example.com', source: 'provider' });
    const sets = queuedSets();
    expect(sets).toHaveLength(2);
    expect(sets[1]).toEqual({
      $set: { email: 'wren@example.com', identity_source: 'workos' },
    });
  });
});

describe('the guards', () => {
  it('no key: initTelemetry is a no-op and identifyPerson queues nothing', () => {
    writeIdentity({ email: 'wren@example.com', source: 'manual' });
    initTelemetry();

    expect(peekQueueForTesting()).toHaveLength(0);
    identifyPerson({ email: 'wren@example.com', source: 'manual' });
    expect(peekQueueForTesting()).toHaveLength(0);
  });
});

describe('the verified-door identification ($identify)', () => {
  it('queues a BARE $identify: install UUID as $anon_distinct_id, the two $set keys, no super props', () => {
    const identity = writeIdentity({ email: 'wren@example.com', source: 'provider', subject: 'user_01TEST' });
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    // The record alone names nobody; the provider's answer does (ONL-2882).
    identifyPerson(identity);

    const installId = persistedInstallId();
    const identify = peekQueueForTesting().find((event) => event.event === '$identify');
    expect(identify?.properties).toEqual({
      $anon_distinct_id: installId,
      $set: { email: 'wren@example.com', identity_source: 'workos' },
    });
  });

  it('the dedupe holds: a second notify of the identical record is silent', () => {
    writeIdentity({ email: 'wren@example.com', source: 'provider', subject: 'user_01TEST' });
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    identifyPerson({ email: 'wren@example.com', source: 'provider', subject: 'user_01TEST' });
    identifyPerson({ email: 'wren@example.com', source: 'provider', subject: 'user_01TEST' });

    const identifies = peekQueueForTesting().filter((event) => event.event === '$identify');
    expect(identifies).toHaveLength(1);
  });

  it('a stored workos record identifies nothing on its own: no $identify, no $set, no distinct id', () => {
    writeIdentity({ email: 'wren@example.com', source: 'provider', subject: 'user_01TEST' });
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    expect(peekQueueForTesting().map((event) => event.event)).toEqual(['app_opened']);
    expect(currentDistinctId()).toBeUndefined();
  });
});

describe('the merge guard ($merge_dangerously)', () => {
  const WORKOS_IDENTITY = {
    email: 'wren@example.com',
    source: 'provider',
    subject: 'user_01TEST',
    previousSubject: 'neon_abc123',
  } as const;

  it('external id present: exactly one merge, alias = the external id, queued after $identify', () => {
    const identity = writeIdentity({ ...WORKOS_IDENTITY });
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    identifyPerson(identity);

    const events = peekQueueForTesting();
    expect(events.map((event) => event.event)).toEqual([
      'app_opened',
      '$identify',
      '$merge_dangerously',
    ]);
    expect(events[2]!.properties).toEqual({ alias: 'neon_abc123' });
  });

  it('a relaunch after the merge re-sends $identify but NEVER a second merge (the persisted marker)', () => {
    const identity = writeIdentity({ ...WORKOS_IDENTITY });
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    identifyPerson(identity);
    expect(peekQueueForTesting().some((event) => event.event === '$merge_dangerously')).toBe(true);

    resetTelemetryForTesting();
    resetIdentityCache();
    initTelemetry();
    identifyPerson(identity);

    const events = peekQueueForTesting().map((event) => event.event);
    expect(events).toContain('$identify');
    expect(events).not.toContain('$merge_dangerously');
  });

  it('external id absent: identify, no merge', () => {
    const identity = writeIdentity({ email: 'wren@example.com', source: 'provider', subject: 'user_01TEST' });
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    identifyPerson(identity);

    const events = peekQueueForTesting().map((event) => event.event);
    expect(events).toContain('$identify');
    expect(events).not.toContain('$merge_dangerously');
  });

  it("never fires for source 'manual', even with a stale external id on the record", () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    identifyPerson({
      email: 'wren@example.com',
      source: 'manual',
      previousSubject: 'neon_abc123',
    });

    const events = peekQueueForTesting().map((event) => event.event);
    expect(events).toEqual(['app_opened', '$set']);
  });
});

describe('the wire', () => {
  let server: Server;
  let batches: Array<{ api_key: string; batch: Array<Record<string, unknown>> }>;

  beforeEach(async () => {
    batches = [];
    server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        batches.push(
          JSON.parse(Buffer.concat(chunks).toString('utf8')) as (typeof batches)[number],
        );
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end('{"status":1}');
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('no port');
    process.env['STUDIO_POSTHOG_HOST'] = `http://127.0.0.1:${String(address.port)}`;
  });

  afterEach(() => {
    server.close();
    server.closeAllConnections();
  });

  it('every event — the $set included — carries the install UUID, before and after identify', async () => {
    writeIdentity({ email: 'wren@example.com', source: 'manual' });
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    await flush();

    const installId = persistedInstallId();
    expect(batches).toHaveLength(1);
    const first = batches[0]!;
    expect(first.api_key).toBe('phc_test');
    expect(first.batch.map((event) => event['event'])).toEqual(['app_opened', '$set']);
    for (const event of first.batch) expect(event['distinct_id']).toBe(installId);

    identifyPerson({ email: 'juno@example.com', source: 'provider' });
    await flush();
    expect(batches).toHaveLength(2);
    const second = batches[1]!;
    expect(second.batch).toHaveLength(1);
    expect(second.batch[0]!['event']).toBe('$set');
    expect(second.batch[0]!['distinct_id']).toBe(installId);
    expect(second.batch[0]!['properties']).toEqual({
      $set: { email: 'juno@example.com', identity_source: 'workos' },
    });
  });

  it('a mid-session WorkOS sign-in: pre-sign-in events keep the install UUID, everything after rides the workos id', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    identifyPerson({
      email: 'wren@example.com',
      source: 'provider',
      subject: 'user_01TEST',
      previousSubject: 'neon_abc123',
    });
    // Lets the switch-triggered flush land before the drain.
    await Bun.sleep(25);
    await flush();

    const installId = persistedInstallId();
    expect(batches).toHaveLength(2);
    const before = batches[0]!;
    expect(before.batch.map((event) => event['event'])).toEqual(['app_opened']);
    for (const event of before.batch) expect(event['distinct_id']).toBe(installId);

    const after = batches[1]!;
    expect(after.batch.map((event) => event['event'])).toEqual([
      '$identify',
      '$merge_dangerously',
    ]);
    for (const event of after.batch) expect(event['distinct_id']).toBe('user_01TEST');
    expect((after.batch[0]!['properties'] as Record<string, unknown>)['$anon_distinct_id']).toBe(
      installId,
    );
    expect(after.batch[1]!['properties']).toEqual({ alias: 'neon_abc123' });
  });

  it('account switches never identify B with the anonymous id already linked to A', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    identifyPerson({ email: 'a@example.com', source: 'provider', subject: 'user_A' });
    await flush();
    identifyPerson({ email: 'b@example.com', source: 'provider', subject: 'user_B' });
    await flush();
    const identifies = batches.flatMap((batch) => batch.batch).filter((event) => event['event'] === '$identify');
    expect(identifies).toHaveLength(2);
    const first = identifies[0]!['properties'] as Record<string, unknown>;
    const second = identifies[1]!['properties'] as Record<string, unknown>;
    expect(second['$anon_distinct_id']).not.toBe(first['$anon_distinct_id']);
    expect(second['$anon_distinct_id']).not.toBe('user_A');
  });

  it('an empty session clear before the first sign-in keeps the tour anonymous id linkable', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    capture('tour_opened', { source: 'first_run' });
    await flush();
    const installId = persistedInstallId();
    expect(readIdentity()).toBeNull();
    resetTelemetryIdentity();
    identifyPerson(writeIdentity({ email: 'first@example.com', source: 'provider', subject: 'user_first' }));
    capture('tour_closed', { step: 'canvas', completed: false });
    await flush();
    const events = batches.flatMap((batch) => batch.batch);
    expect(events.find((event) => event['event'] === 'tour_opened')?.['distinct_id']).toBe(installId);
    expect(events.find((event) => event['event'] === '$identify')?.['properties']).toMatchObject({ $anon_distinct_id: installId });
    expect(events.find((event) => event['event'] === 'tour_closed')?.['distinct_id']).toBe('user_first');
  });

  for (const restart of [false, true]) {
    it(`same-account sign-in rejoins the post-sign-out anonymous id${restart ? ' after restart' : ''}`, async () => {
      process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
      initTelemetry();
      const account = writeIdentity({ email: 'a@example.com', source: 'provider', subject: 'user_A' });
      identifyPerson(account);
      resetTelemetryIdentity();
      clearIdentity();
      const anonymous = currentDistinctId();
      capture('tour_opened', { source: 'first_run' });
      await flush();
      if (restart) {
        resetTelemetryForTesting();
        resetIdentityCache();
        initTelemetry();
      }
      resetTelemetryIdentity();
      identifyPerson(writeIdentity(account));
      capture('tour_closed', { step: 'canvas', completed: false });
      await flush();
      const events = batches.flatMap((batch) => batch.batch);
      const identifies = events.filter((event) => event['event'] === '$identify');
      expect(events.find((event) => event['event'] === 'tour_opened')?.['distinct_id']).toBe(anonymous);
      expect(identifies.at(-1)?.['properties']).toMatchObject({ $anon_distinct_id: anonymous });
      expect(events.find((event) => event['event'] === 'tour_closed')?.['distinct_id']).toBe('user_A');
      expect(events.some((event) => event['event'] === '$merge_dangerously')).toBe(false);
    });
  }

  it('first sign-in links the captured install id when another launch writes a no-account reset', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const installId = persistedInstallId();
    capture('tour_opened', { source: 'first_run' });
    await flush();
    expect(readIdentity()).toBeNull();
    stateFiles.writeStateFile(join(userData, 'telemetry-anonymous-id'), 1, {
      id: '594afc62-3b64-421e-9ed8-3d7989696021',
      reset: true,
    });
    resetTelemetryIdentity();
    expect(currentTelemetryConfig()).toMatchObject({ distinctId: installId, isIdentified: false });
    capture('tour_closed', { step: 'canvas', completed: false });
    identifyPerson(writeIdentity({ email: 'first@example.com', source: 'provider', subject: 'user_first' }));
    await flush();

    const events = batches.flatMap((batch) => batch.batch);
    const beforeSignIn = events.filter((event) => event['event'] !== '$identify');
    expect(beforeSignIn.map((event) => event['distinct_id'])).toEqual([installId, installId, installId]);
    const identified = events.filter((event) => event['event'] === '$identify');
    expect(identified).toHaveLength(1);
    expect(identified[0]?.['distinct_id']).toBe('user_first');
    expect(identified[0]?.['properties']).toMatchObject({ $anon_distinct_id: installId });
    expect(currentTelemetryConfig()).toMatchObject({ distinctId: 'user_first', linkableAnonymousId: installId });
  });

  for (const ownership of [{ identifiedAs: 'user_A' }, { signedOutFrom: 'user_A' }]) {
    it(`first sign-in respects another launch's ${Object.keys(ownership)[0]} account boundary`, async () => {
      process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
      initTelemetry();
      const installId = persistedInstallId();
      stateFiles.writeStateFile(join(userData, 'telemetry-anonymous-id'), 1, {
        id: installId,
        reset: true,
        ...ownership,
      });
      currentTelemetryConfig();
      capture('tour_opened', { source: 'first_run' });
      identifyPerson(writeIdentity({ email: 'b@example.com', source: 'provider', subject: 'user_B' }));
      await flush();

      const events = batches.flatMap((batch) => batch.batch);
      expect(events.find((event) => event['event'] === 'tour_opened')?.['distinct_id']).toBe(installId);
      const identified = events.find((event) => event['event'] === '$identify');
      expect(identified?.['distinct_id']).toBe('user_B');
      expect((identified!['properties'] as Record<string, unknown>)['$anon_distinct_id']).not.toBe(installId);
      expect((identified!['properties'] as Record<string, unknown>)['$anon_distinct_id']).not.toBe('user_A');
    });
  }

  it('first sign-in cannot claim invalid late anonymous state', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const installId = persistedInstallId();
    stateFiles.writeStateFile(join(userData, 'telemetry-anonymous-id'), 1, null);
    identifyPerson(writeIdentity({ email: 'b@example.com', source: 'provider', subject: 'user_B' }));
    await flush();

    const identified = batches.flatMap((batch) => batch.batch).find((event) => event['event'] === '$identify');
    expect(identified?.['distinct_id']).toBe('user_B');
    expect((identified!['properties'] as Record<string, unknown>)['$anon_distinct_id']).not.toBe(installId);
  });

  it('A sign-out B sign-in keeps people and intervening anonymous events separate and rejoins A', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const person = (user: string) => writeIdentity({ email: `${user}@example.com`, source: 'provider', subject: user, previousSubject: `legacy_${user}` });
    identifyPerson(person('user_A'));
    capture('app_opened', { is_first_launch: false, locale: 'en-US' });
    const sessionA = currentTelemetryConfig();
    clearIdentity();
    resetTelemetryIdentity();
    const signedOut = currentTelemetryConfig();
    expect(signedOut.enabled).toBe(true);
    if (!signedOut.enabled || !sessionA.enabled) throw new Error('telemetry disabled');
    expect(signedOut.isIdentified).toBe(false);
    expect(signedOut.sessionId).not.toBe(sessionA.sessionId);
    capture('app_opened', { is_first_launch: false, locale: 'en-US' });
    identifyPerson(person('user_B'));
    capture('app_opened', { is_first_launch: false, locale: 'en-US' });
    clearIdentity();
    resetTelemetryIdentity();
    identifyPerson(person('user_A'));
    capture('app_opened', { is_first_launch: false, locale: 'en-US' });
    await flush();
    const events = batches.flatMap((batch) => batch.batch);
    const openings = events.filter((event) => event['event'] === 'app_opened');
    expect(openings.slice(1).map((event) => event['distinct_id'])).toEqual(['user_A', signedOut.distinctId, 'user_B', 'user_A']);
    expect((openings[2]!['properties'] as Record<string, unknown>)['$process_person_profile']).toBe(false);
    const identifies = events.filter((event) => event['event'] === '$identify');
    expect(identifies.map((event) => event['distinct_id'])).toEqual(['user_A', 'user_B', 'user_A']);
    for (const event of identifies) expect((event['properties'] as Record<string, unknown>)['$anon_distinct_id']).not.toBe(signedOut.distinctId);
    const merges = events.filter((event) => event['event'] === '$merge_dangerously');
    expect(merges).toHaveLength(1);
    expect(merges[0]!['distinct_id']).toBe('user_A');
  });

  it('sign-out survives restart and a self-reported email stays a set on the new anonymous id', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    writeIdentity({ email: 'a@example.com', source: 'provider', subject: 'user_A' });
    initTelemetry();
    clearIdentity();
    resetTelemetryIdentity();
    const signedOut = currentTelemetryConfig();
    await flush();
    resetTelemetryForTesting();
    resetIdentityCache();
    initTelemetry();
    const restarted = currentTelemetryConfig();
    expect(readIdentity()).toBeNull();
    expect(restarted.enabled && restarted.distinctId).toBe(signedOut.enabled && signedOut.distinctId);
    identifyPerson(writeIdentity({ email: 'self@example.com', source: 'manual' }));
    expect(peekQueueForTesting().filter((event) => event.event === '$identify')).toEqual([]);
    expect(queuedSets()).toEqual([{ $set: { email: 'self@example.com', identity_source: 'manual' } }]);
    await flush();
  });

  it('a different account after restart cannot claim the post-sign-out anonymous id', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    identifyPerson(writeIdentity({ email: 'a@example.com', source: 'provider', subject: 'user_A' }));
    resetTelemetryIdentity();
    clearIdentity();
    const anonymous = currentDistinctId();
    capture('tour_opened', { source: 'first_run' });
    await flush();
    resetTelemetryForTesting();
    resetIdentityCache();
    initTelemetry();
    identifyPerson(writeIdentity({ email: 'b@example.com', source: 'provider', subject: 'user_B', previousSubject: 'legacy_B' }));
    await flush();
    const events = batches.flatMap((batch) => batch.batch);
    const identifiedB = events.find((event) => event['event'] === '$identify' && event['distinct_id'] === 'user_B');
    expect(identifiedB).toBeDefined();
    expect((identifiedB!['properties'] as Record<string, unknown>)['$anon_distinct_id']).not.toBe(anonymous);
    expect(events.some((event) => event['event'] === '$merge_dangerously')).toBe(false);
  });

  it('a legacy reset without a recorded account stays separate on first sign-in', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    stateFiles.writeStateFile(join(userData, 'telemetry-anonymous-id'), 1, { id: 'legacy-anonymous', reset: true });
    initTelemetry();
    expect(currentDistinctId()).toBe('legacy-anonymous');
    identifyPerson(writeIdentity({ email: 'a@example.com', source: 'provider', subject: 'user_A', previousSubject: 'legacy_A' }));
    await flush();
    const events = batches.flatMap((batch) => batch.batch);
    const identified = events.find((event) => event['event'] === '$identify');
    expect(identified).toBeDefined();
    expect((identified!['properties'] as Record<string, unknown>)['$anon_distinct_id']).not.toBe('legacy-anonymous');
    expect(events.some((event) => event['event'] === '$merge_dangerously')).toBe(false);
  });

  it('relaunching B never reuses A’s install identity or reopens the legacy merge', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const personA = writeIdentity({ email: 'a@example.com', source: 'provider', subject: 'user_A' });
    identifyPerson(personA);
    const personB = writeIdentity({ email: 'b@example.com', source: 'provider', subject: 'user_B', previousSubject: 'legacy_B' });
    identifyPerson(personB);
    await flush();
    const firstB = batches.flatMap((batch) => batch.batch).find((event) => event['event'] === '$identify' && event['distinct_id'] === 'user_B');
    const anonymousForB = (firstB!['properties'] as Record<string, unknown>)['$anon_distinct_id'];
    resetTelemetryForTesting();
    initTelemetry();
    identifyPerson(personB);
    await flush();
    const forB = batches.flatMap((batch) => batch.batch).filter((event) => event['event'] === '$identify' && event['distinct_id'] === 'user_B');
    expect(forB).toHaveLength(2);
    expect((forB[1]!['properties'] as Record<string, unknown>)['$anon_distinct_id']).toBe(anonymousForB);
    expect(batches.flatMap((batch) => batch.batch).some((event) => event['event'] === '$merge_dangerously')).toBe(false);
  });

  it('failed anonymous-state writes never relink a prior account after restart', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    identifyPerson(writeIdentity({ email: 'a@example.com', source: 'provider', subject: 'user_A' }));
    await flush();
    const originalWrite = stateFiles.writeStateFile;
    const writes = spyOn(stateFiles, 'writeStateFile').mockImplementation((path, ...args) => {
      if (path === join(userData, 'telemetry-anonymous-id')) return false;
      return originalWrite(path, ...args);
    });
    try {
      clearIdentity();
      resetTelemetryIdentity();
      await flush();
      resetTelemetryForTesting();
      resetIdentityCache();
      initTelemetry();
      const anonymous = currentTelemetryConfig();
      expect(anonymous.enabled && anonymous.distinctId).not.toBe(persistedInstallId());
      identifyPerson(writeIdentity({ email: 'b@example.com', source: 'provider', subject: 'user_B' }));
      await flush();
      const identifiesB = batches.flatMap((batch) => batch.batch).filter((event) => event['event'] === '$identify' && event['distinct_id'] === 'user_B');
      expect(identifiesB).toHaveLength(1);
      expect(identifiesB[0]!['properties']).not.toHaveProperty('$anon_distinct_id');
    } finally {
      writes.mockRestore();
    }
  });

  it('failed first identification persistence resets replay before it can consume the install id', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const configs: ReturnType<typeof currentTelemetryConfig>[] = [];
    const unsubscribe = onTelemetryIdentityChanged((config) => configs.push(config));
    const originalWrite = stateFiles.writeStateFile;
    const writes = spyOn(stateFiles, 'writeStateFile').mockImplementation((path, ...args) => {
      if (path === join(userData, 'telemetry-anonymous-id')) throw new Error('disk refused write');
      return originalWrite(path, ...args);
    });
    try {
      identifyPerson(writeIdentity({ email: 'a@example.com', source: 'provider', subject: 'user_A' }));
      await flush();
      expect(configs).toHaveLength(2);
      const reset = configs[0]!;
      expect(reset.enabled && reset.isIdentified).toBe(false);
      expect(reset.enabled && reset.distinctId).not.toBe(persistedInstallId());
      const identified = configs[1]!;
      expect(identified.enabled && identified.distinctId).toBe('user_A');
      expect(identified.enabled && identified.isIdentified).toBe(true);
    } finally {
      unsubscribe();
      writes.mockRestore();
    }
  });

  it('the pre-feature install: the launch keeps the install UUID, the refresh backfill identifies the SAME launch', async () => {
    writeIdentity({ email: 'wren@example.com', source: 'provider' });
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    identifyPerson({ email: 'wren@example.com', source: 'provider', subject: 'user_01TEST' });
    await Bun.sleep(25);
    await flush();

    const installId = persistedInstallId();
    expect(batches).toHaveLength(2);
    const before = batches[0]!;
    expect(before.batch.map((event) => event['event'])).toEqual(['app_opened']);
    for (const event of before.batch) expect(event['distinct_id']).toBe(installId);

    const after = batches[1]!;
    expect(after.batch.map((event) => event['event'])).toEqual(['$identify']);
    expect(after.batch[0]!['distinct_id']).toBe('user_01TEST');
  });

  it('a relaunch the provider answers for: every event — app_opened and the quit-time flush — rides the account', async () => {
    const identity = writeIdentity({ email: 'wren@example.com', source: 'provider', subject: 'user_01TEST' });
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    identifyPerson(identity);

    await shutdownTelemetry();

    expect(batches).toHaveLength(1);
    const only = batches[0]!;
    expect(only.batch.map((event) => event['event'])).toEqual([
      'app_opened',
      '$identify',
      'app_closed',
    ]);
    for (const event of only.batch) expect(event['distinct_id']).toBe('user_01TEST');
    const closed = only.batch[2]!['properties'] as Record<string, unknown>;
    expect(typeof closed['duration_ms']).toBe('number');
    expect(closed['session_duration_seconds']).toBe(Math.round((closed['duration_ms'] as number) / 1000));
  });
});
