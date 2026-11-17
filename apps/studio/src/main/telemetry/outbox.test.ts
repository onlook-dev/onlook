import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import type { AppLike } from './index.js';

const { resetIdentityCache } = await import('../identity/store.js');
const { peekLinesForTesting, recordLinesForTesting, resetLogForTesting } = await import('../log/index.js');
const { capture, flush, initTelemetry, peekQueueForTesting, resetTelemetryForTesting, setAppForTesting } =
  await import('./index.js');
const { batchGrant, enforceCap, outboxDir, pendingBatches, readBatch, removeBatch, resetOutboxForTesting, writeBatch } = await import('./outbox.js');

const GRANT = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';

const made: string[] = [];

function makeRoot(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `studio-outbox-${name}-`));
  made.push(root);
  return root;
}

function fakeApp(userData: string): AppLike {
  return { getPath: () => userData, getVersion: () => '0.0.0-test', getLocale: () => 'en-US', isPackaged: false };
}

const ENV_KEYS = ['STUDIO_STATE_ROOT', 'STUDIO_POSTHOG_KEY', 'STUDIO_POSTHOG_HOST', 'STUDIO_TELEMETRY', 'AGENT_HEADLESS'] as const;
const originalEnv = new Map<string, string | undefined>(ENV_KEYS.map((key) => [key, process.env[key]]));

let posted: Array<{ api_key: string; batch: Array<{ event: string; uuid: string; distinct_id: string }> }> = [];
let answers: Array<number | 'offline'> = [];
const realFetch = globalThis.fetch;

function scriptFetch(): void {
  globalThis.fetch = ((_url: string, init: { body: string }) => {
    posted.push(JSON.parse(init.body));
    const answer = answers.shift() ?? 200;
    if (answer === 'offline') return Promise.reject(new Error('offline'));
    return Promise.resolve(new Response('{"status":1}', { status: answer }));
  }) as unknown as typeof fetch;
}

const warnings = (): string[] =>
  peekLinesForTesting()
    .filter((line) => line.subsystem === 'telemetry' && line.level === 'warn')
    .map((line) => JSON.stringify(line));

beforeEach(() => {
  resetTelemetryForTesting();
  resetIdentityCache();
  for (const key of ENV_KEYS) delete process.env[key];
  process.env['STUDIO_STATE_ROOT'] = makeRoot('state');
  process.env['STUDIO_POSTHOG_KEY'] = 'phc_secret_token';
  process.env['STUDIO_POSTHOG_HOST'] = 'https://ingest.example.test';
  setAppForTesting(fakeApp(makeRoot('userdata')));
  posted = [];
  answers = [];
  scriptFetch();
  resetLogForTesting();
  recordLinesForTesting();
});

afterEach(() => {
  resetLogForTesting();
  resetTelemetryForTesting();
  setAppForTesting(undefined);
  globalThis.fetch = realFetch;
  for (const key of ENV_KEYS) {
    const value = originalEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

const files = (): string[] => (existsSync(outboxDir()) ? readdirSync(outboxDir()).sort() : []);

describe('write-ahead', () => {
  it('rejects malformed persisted event shapes before replay can inspect them', () => {
    mkdirSync(outboxDir(), { recursive: true });
    const path = join(outboxDir(), 'malformed.json');
    const valid = { event: 'usage', properties: {}, timestamp: '2026-11-03T00:00:00.000Z', uuid: 'uuid', distinct_id: 'person' };
    for (const event of [null, 7, { ...valid, event: 7 }, { ...valid, properties: null }, { ...valid, properties: [] }, { ...valid, distinct_id: undefined }, { ...valid, uuid: undefined }, { ...valid, timestamp: undefined }]) {
      writeFileSync(path, JSON.stringify({ version: 1, data: { batch: [valid, event] } }));
      expect(readBatch(path)).toBeUndefined();
    }
  });

  it('preserves future batches on replay, retention, erase, and a colliding first write', async () => {
    mkdirSync(outboxDir(), { recursive: true });
    const path = join(outboxDir(), `future-000001-g${GRANT}.json`);
    const bytes = '{"version":99,"data":{"batch":[{"event":"future"}]}}\n';
    writeFileSync(path, bytes);
    resetOutboxForTesting();
    expect(writeBatch('future', [], GRANT)).toBeUndefined();
    expect(readBatch(path)).toBeUndefined();
    removeBatch(path);
    expect(enforceCap([path], 0)).toEqual({ kept: [path], dropped: 0, droppedBatches: [] });
    initTelemetry();
    await flush();
    expect(readFileSync(path, 'utf8')).toBe(bytes);
    expect(posted.flatMap((request) => request.batch).some((event) => event.event === 'future')).toBe(false);
  });

  it('reads legacy outbox batches and writes the ordinary versioned envelope', () => {
    mkdirSync(outboxDir(), { recursive: true });
    const legacyPath = join(outboxDir(), 'legacy.json');
    const batch = [{ event: 'legacy', properties: {}, timestamp: '2026-10-15T00:00:00.000Z', uuid: 'uuid', distinct_id: 'person' }];
    writeFileSync(legacyPath, JSON.stringify({ batch }));
    expect(readBatch(legacyPath)).toEqual(batch);
    const next = writeBatch('versioned', batch, GRANT)!;
    expect(JSON.parse(readFileSync(next, 'utf8'))).toEqual({ version: 1, data: { batch } });
  });
  it('an offline send leaves the batch on disk — without the key or the host — and a later flush sends it once', async () => {
    initTelemetry();
    answers = ['offline'];
    await flush();
    expect(files()).toHaveLength(1);
    const raw = readFileSync(join(outboxDir(), files()[0]!), 'utf8');
    expect(raw).not.toContain('phc_secret_token');
    expect(raw).not.toContain('ingest.example.test');
    expect(raw).toContain('app_opened');
    expect(statSync(join(outboxDir(), files()[0]!)).mode & 0o777).toBe(0o600);

    answers = [200];
    await flush();
    expect(files()).toHaveLength(0);
    expect(posted).toHaveLength(2);
    expect(posted[1]!.batch.map((event) => event.uuid)).toEqual(posted[0]!.batch.map((event) => event.uuid));
    expect(posted[1]!.batch[0]!.distinct_id).toBe(posted[0]!.batch[0]!.distinct_id);
    expect(posted[1]!.api_key).toBe('phc_secret_token');
  });

  it('a 500 keeps the batch, a 429 keeps it, a 400 removes it and names the status', async () => {
    initTelemetry();
    answers = [500];
    await flush();
    expect(files()).toHaveLength(1);
    answers = [429];
    await flush();
    expect(files()).toHaveLength(1);
    answers = [400];
    await flush();
    expect(files()).toHaveLength(0);
    expect(warnings().at(-1)).toContain('"status":400');
  });

  it('a poison batch does not wedge the one behind it', async () => {
    initTelemetry();
    answers = ['offline'];
    await flush();
    capture('frame_tool_armed', {});
    answers = ['offline'];
    await flush();
    expect(files()).toHaveLength(2);
    answers = [413, 200];
    await flush();
    expect(files()).toHaveLength(0);
    expect(posted.at(-1)!.batch.map((event) => event.event)).toEqual(['frame_tool_armed']);
  });

  it('pending batches replay in capture order before the new one, and stop at the first retryable failure', async () => {
    initTelemetry();
    answers = ['offline'];
    await flush();
    capture('frame_tool_armed', {});
    answers = ['offline'];
    await flush();
    capture('text_tool_armed', {});
    answers = [200, 'offline'];
    await flush();
    expect(files()).toHaveLength(2);
    expect(posted.slice(-2).map((body) => body.batch[0]!.event)).toEqual(['app_opened', 'frame_tool_armed']);
    answers = [200, 200];
    await flush();
    expect(files()).toHaveLength(0);
    expect(posted.slice(-2).map((body) => body.batch[0]!.event)).toEqual(['frame_tool_armed', 'text_tool_armed']);
  });

  it('a relaunch replays what the last launch left', async () => {
    initTelemetry();
    answers = ['offline'];
    await flush();
    expect(files()).toHaveLength(1);
    const leftover = readBatch(join(outboxDir(), files()[0]!));
    resetTelemetryForTesting();
    resetIdentityCache();
    answers = [200];
    initTelemetry();
    await flush();
    expect(files()).toHaveLength(0);
    const uuids = posted.slice(-2).map((body) => body.batch.map((event) => event.uuid));
    expect(uuids[0]).toEqual(leftover!.map((event) => event.uuid));
    expect(posted.at(-1)!.batch.map((event) => event.event)).toEqual(['app_opened']);
  });

  it('every event carries a uuid, and the in-memory queue is empty after a failed send', async () => {
    initTelemetry();
    capture('frame_tool_armed', {});
    for (const event of peekQueueForTesting()) expect(event.uuid).toMatch(/^[0-9a-f-]{36}$/);
    answers = ['offline'];
    await flush();
    expect(peekQueueForTesting()).toHaveLength(0);
  });

  it('an unwritable outbox still sends once and never throws', async () => {
    initTelemetry();
    mkdirSync(outboxDir(), { recursive: true });
    chmodSync(outboxDir(), 0o500);
    try {
      answers = [200];
      await flush();
      expect(posted).toHaveLength(1);
    } finally {
      chmodSync(outboxDir(), 0o700);
    }
  });
});

describe('overlapping flushes', () => {
  it('a third caller arriving mid-pass still gets its own batch sent (ONL-2343 review)', async () => {
    initTelemetry();
    let release = (): void => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let seen = 0;
    globalThis.fetch = ((_url: string, init: { body: string }) => {
      posted.push(JSON.parse(init.body));
      seen += 1;
      return seen === 1
        ? gate.then(() => new Response('{"status":1}'))
        : Promise.resolve(new Response('{"status":1}'));
    }) as unknown as typeof fetch;

    const first = flush();
    capture('frame_tool_armed', {});
    const second = flush();
    capture('text_tool_armed', {});
    const third = flush();
    release();
    await Promise.all([first, second, third]);

    expect(files()).toEqual([]);
    const events = posted.flatMap((body) => body.batch).map((event) => event.event);
    expect(events).toContain('frame_tool_armed');
    expect(events).toContain('text_tool_armed');
  });
});

describe('the cap', () => {
  it('drops the oldest files until under the cap and reports the dropped event count', () => {
    const batch = (event: string) => [{ event, properties: {}, timestamp: 't', uuid: 'u', distinct_id: 'd' }];
    writeBatch('launch', batch('one'), GRANT);
    writeBatch('launch', batch('two'), GRANT);
    writeBatch('launch', batch('six'), GRANT);
    const size = statSync(pendingBatches()[0]!).size;
    const { kept, dropped } = enforceCap(pendingBatches(), size * 2);
    expect(dropped).toBe(1);
    expect(kept.map((path) => readBatch(path)![0]!.event)).toEqual(['two', 'six']);
    expect(pendingBatches()).toEqual(kept);
  });

  it('hands back what it evicted, so a lost identity merge can still be said out loud', () => {
    const batch = (event: string) => [{ event, properties: {}, timestamp: 't', uuid: 'u', distinct_id: 'd' }];
    writeBatch('launch', batch('$merge_dangerously'), GRANT);
    writeBatch('launch', batch('two'), GRANT);
    writeBatch('launch', batch('six'), GRANT);
    const size = statSync(pendingBatches()[0]!).size;
    const { droppedBatches } = enforceCap(pendingBatches(), size * 2);
    expect(droppedBatches.flat().map((event) => event.event)).toEqual(['$merge_dangerously']);
  });

  it('carries the consent grant in the name, and reads a name carrying none as no grant', () => {
    const batch = [{ event: 'one', properties: {}, timestamp: 't', uuid: 'u', distinct_id: 'd' }];
    const stamped = writeBatch('launch', batch, GRANT)!;
    expect(stamped.endsWith(`-000001-g${GRANT}.json`)).toBe(true);
    expect(batchGrant(stamped)).toBe(GRANT);
    expect(batchGrant(join(outboxDir(), 'legacy.json'))).toBeUndefined();
    expect(batchGrant(join(outboxDir(), 'launch-000001.json'))).toBeUndefined();
    expect(batchGrant(join(outboxDir(), 'launch-000001-gnot-a-grant.json'))).toBeUndefined();
  });

  it('a file that is not a batch is not ours to send', () => {
    mkdirSync(outboxDir(), { recursive: true });
    writeFileSync(join(outboxDir(), 'launch-000001.json'), '{"api_key":"nope"}');
    expect(readBatch(join(outboxDir(), 'launch-000001.json'))).toBeUndefined();
  });
});
