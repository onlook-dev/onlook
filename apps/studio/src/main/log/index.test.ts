import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { otlpBody } from './export.js';
import {
  configureLogExport,
  flushLog,
  initLog,
  log,
  peekLinesForTesting,
  recordLinesForTesting,
  resetLogForTesting,
  scrubFields,
  setLogCorrelation,
  writeLine,
} from './index.js';
import { receiveRendererLog } from './ipc.js';

const made: string[] = [];
const savedStateRoot = process.env['STUDIO_STATE_ROOT'];

function makeRoot(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `studio-log-${name}-`));
  made.push(root);
  return root;
}

const IDS = {
  installId: 'install-1',
  launchId: '01920000-0000-7000-8000-000000000001',
  sessionId: '01920000-0000-7000-8000-000000000001',
  distinctId: 'install-1',
  appVersion: '0.0.0-test',
  releaseChannel: 'dev',
};

let root: string;
const realFetch = globalThis.fetch;
const filePath = (): string => join(root, 'logs', 'studio.log');
const fileLines = (): Array<Record<string, unknown>> =>
  readFileSync(filePath(), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);

beforeEach(() => {
  resetLogForTesting();
  root = makeRoot('state');
  process.env['STUDIO_STATE_ROOT'] = root;
  recordLinesForTesting();
});

afterEach(() => {
  resetLogForTesting();
  globalThis.fetch = realFetch;
  if (savedStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = savedStateRoot;
});

afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

describe('a line', () => {
  it('carries level, subsystem, msg, the ids and the field, as one JSON row', () => {
    setLogCorrelation(IDS);
    log('workspace').info('cut', { head_matches: true });
    const [row] = fileLines();
    expect(row).toEqual({
      ts: expect.any(String),
      level: 'info',
      subsystem: 'workspace',
      msg: 'cut',
      process: 'main',
      install_id: 'install-1',
      launch_id: IDS.launchId,
      session_id: IDS.sessionId,
      app_version: '0.0.0-test',
      release_channel: 'dev',
      head_matches: true,
    });
    expect(statSync(filePath()).mode & 0o777).toBe(0o600);
  });

  it('writes the ids known at the time, and none before any exist', () => {
    log('boot').info('early');
    expect(fileLines()[0]).not.toHaveProperty('launch_id');
    setLogCorrelation(IDS);
    log('boot').info('late');
    expect(fileLines()[1]).toHaveProperty('launch_id', IDS.launchId);
  });

  it('is on disk before the call returns', () => {
    log('x').info('now');
    expect(existsSync(filePath())).toBe(true);
    expect(readFileSync(filePath(), 'utf8')).toContain('"msg":"now"');
  });
});

describe('the privacy guardrail', () => {
  it('scrubs a path in the message, a field, and an Error field', () => {
    log('git').warn('failed at /Users/wren/repo/src/x.ts', {
      where: 'file:///Users/wren/repo/out/main/index.js',
      error: new Error('open /Users/wren/repo/.env'),
    });
    const raw = readFileSync(filePath(), 'utf8');
    expect(raw).not.toContain('/Users/');
    expect(raw).not.toContain('wren');
    const [row] = fileLines();
    expect(row['msg']).toBe('failed at <path>');
    expect(row['where']).toBe('<path>');
    expect((row['error'] as { message: string }).message).toBe('open <path>');
  });

  it('drops content-named fields and keeps the scalar facts', () => {
    expect(scrubFields({ text: 'hello', prompt: 'x', content: 'y', status: 'ok', nested: { delta: 'z', count: 2 } })).toEqual({
      status: 'ok',
      nested: { count: 2 },
    });
  });

  it('drops a field that would shadow a stamped line key (ONL-2343 review)', () => {
    expect(scrubFields({ level: 'debug', session_id: 'forged', process: 'chrome', ok: 1 })).toEqual({ ok: 1 });
    setLogCorrelation(IDS);
    log('x').error('real', { level: 'debug', session_id: 'forged' } as never);
    const row = fileLines()[0]!;
    expect(row['level']).toBe('error');
    expect(row['session_id']).toBe(IDS.sessionId);
  });

  it('truncates a long string field', () => {
    log('x').info('long', { note: 'a'.repeat(2_000) });
    const note = fileLines()[0]!['note'] as string;
    expect(note.length).toBeLessThan(2_000);
    expect(note.endsWith('…')).toBe(true);
  });

  it('a remote url and a branch inside git stderr reach the file, never the export', async () => {
    setLogCorrelation(IDS);
    const bodies: string[] = [];
    configureLogExport({ key: 'phc_test', host: 'https://ingest.example.test' });
    globalThis.fetch = ((_url: string, init: { body: string }) => {
      bodies.push(init.body);
      return Promise.resolve(new Response('{}'));
    }) as unknown as typeof fetch;
    log('workspace').warn('worktree add failed', { stderr: "fatal: 'origin/feature-x' at https://github.com/org/repo.git" });
    expect(fileLines()[0]!['stderr']).toBe("fatal: 'origin/feature-x' at <path>");
    await flushLog();
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).not.toContain('feature-x');
    expect(bodies[0]).not.toContain('stderr');
  });
});

describe('the sinks never throw', () => {
  it('an unwritable directory: every level returns, and writes resume once it can', () => {
    mkdirSync(join(root, 'logs'), { recursive: true });
    chmodSync(join(root, 'logs'), 0o500);
    try {
      expect(() => log('x').error('boom')).not.toThrow();
      expect(() => log('x').debug('quiet')).not.toThrow();
    } finally {
      chmodSync(join(root, 'logs'), 0o700);
    }
    log('x').info('after');
    expect(fileLines().map((row) => row['msg'])).toEqual(['after']);
  });
});

describe('a closed stderr', () => {
  it('stops the mirror instead of feeding the error reporter, and says so once', () => {
    const written: string[] = [];
    const pipe = new PassThrough();
    pipe.on('data', (chunk: Buffer) => written.push(chunk.toString()));
    initLog({ mirror: true }, pipe as unknown as NodeJS.WriteStream);
    log('x').info('before');
    expect(written).toHaveLength(1);

    expect(() => pipe.emit('error', Object.assign(new Error('write EPIPE'), { code: 'EPIPE' }))).not.toThrow();
    expect(() => pipe.emit('error', Object.assign(new Error('write EPIPE'), { code: 'EPIPE' }))).not.toThrow();
    log('x').info('after');
    expect(written).toHaveLength(1);
    expect(fileLines().map((row) => row['msg'])).toEqual(['before', 'a write to stderr failed', 'after']);
  });

  it('is heard on a packaged build, which mirrors nothing (ONL-2944)', () => {
    const pipe = new PassThrough();
    initLog({ mirror: false }, pipe as unknown as NodeJS.WriteStream);

    expect(() => pipe.emit('error', Object.assign(new Error('EPIPE: broken pipe, write'), { code: 'EPIPE' }))).not.toThrow();
    const [row] = fileLines();
    expect(row).toMatchObject({ level: 'warn', subsystem: 'log', msg: 'a write to stderr failed', owner: 'environment', code: 'EPIPE' });
    expect(row!['error']).toMatchObject({ type: 'Error', message: 'EPIPE: broken pipe, write' });
  });

  it('keeps the failure legible when it is not a closed pipe and carries no code', () => {
    const pipe = new PassThrough();
    initLog({ mirror: false }, pipe as unknown as NodeJS.WriteStream);

    expect(() => pipe.emit('error', new RangeError('stderr went sideways'))).not.toThrow();
    const [row] = fileLines();
    expect(row).toMatchObject({ msg: 'a write to stderr failed', owner: 'environment' });
    expect(row).not.toHaveProperty('code');
    expect(row!['error']).toMatchObject({ type: 'RangeError', message: 'stderr went sideways' });
  });

  it('a listener that cannot read the error still swallows it', () => {
    const pipe = new PassThrough();
    initLog({ mirror: false }, pipe as unknown as NodeJS.WriteStream);
    const hostile = Object.defineProperty({}, 'code', {
      get() {
        throw new Error('getter');
      },
    });

    expect(() => pipe.emit('error', hostile)).not.toThrow();
  });
});

describe('the PostHog Logs mirror', () => {
  it('sends OTLP whose attributes carry the same ids the events do, and drops on failure without throwing', async () => {
    setLogCorrelation({ ...IDS, distinctId: 'user_workos123' });
    const bodies: string[] = [];
    let fail = false;
    globalThis.fetch = ((_url: string, init: { body: string; headers: Record<string, string> }) => {
      bodies.push(init.body);
      expect(init.headers['Authorization']).toBe('Bearer phc_test');
      return fail ? Promise.reject(new Error('offline')) : Promise.resolve(new Response('{}'));
    }) as unknown as typeof fetch;
    configureLogExport({ key: 'phc_test', host: 'https://ingest.example.test' });
    log('agent-host').info('turn ended', { turn_count: 3 });
    await flushLog();
    expect(bodies).toHaveLength(1);
    const body = JSON.parse(bodies[0]!) as { resourceLogs: Array<{ scopeLogs: Array<{ logRecords: Array<{ body: { stringValue: string }; attributes: Array<{ key: string; value: Record<string, unknown> }> }> }> }> };
    const record = body.resourceLogs[0]!.scopeLogs[0]!.logRecords[0]!;
    expect(record.body.stringValue).toBe('turn ended');
    const attrs = Object.fromEntries(record.attributes.map((a) => [a.key, Object.values(a.value)[0]]));
    expect(attrs['posthogDistinctId']).toBe('user_workos123');
    expect(attrs['sessionId']).toBe(IDS.sessionId);
    expect(attrs['installId']).toBe('install-1');
    expect(attrs['turn_count']).toBe('3');
    fail = true;
    log('agent-host').info('again');
    expect(await flushLog()).toBeUndefined();
    log('agent-host').info('third');
    fail = false;
    await flushLog();
    expect(bodies).toHaveLength(3);
    expect(bodies[2]).toContain('third');
    expect(bodies[2]).not.toContain('again');
  });

  it('a refusing mirror says so in the file, once per status (ONL-2343 review)', async () => {
    setLogCorrelation(IDS);
    let status = 401;
    globalThis.fetch = (() => Promise.resolve(new Response('no', { status }))) as unknown as typeof fetch;
    configureLogExport({ key: 'phc_test', host: 'https://ingest.example.test' });
    log('x').info('one');
    await flushLog();
    log('x').info('two');
    await flushLog();
    const refusals = (): Array<Record<string, unknown>> =>
      fileLines().filter((row) => row['subsystem'] === 'log' && row['status'] !== undefined);
    expect(refusals()).toHaveLength(1);
    expect(refusals()[0]!['status']).toBe(401);

    status = 413;
    log('x').info('three');
    await flushLog();
    expect(refusals()).toHaveLength(2);
  });

  it('with no target, fetch is never called', async () => {
    let calls = 0;
    globalThis.fetch = (() => {
      calls += 1;
      return Promise.resolve(new Response('{}'));
    }) as unknown as typeof fetch;
    log('x').info('unsent');
    await flushLog();
    expect(calls).toBe(0);
  });

  it('otlpBody types its attribute values', () => {
    const body = otlpBody([{ ts: 1, level: 'warn', msg: 'm', attributes: { a: 'x', b: 2, c: true, d: 1.5 } }]) as {
      resourceLogs: Array<{ scopeLogs: Array<{ logRecords: Array<{ severityText: string; attributes: Array<{ key: string; value: unknown }> }> }> }>;
    };
    const record = body.resourceLogs[0]!.scopeLogs[0]!.logRecords[0]!;
    expect(record.severityText).toBe('WARN');
    expect(record.attributes).toEqual([
      { key: 'a', value: { stringValue: 'x' } },
      { key: 'b', value: { intValue: '2' } },
      { key: 'c', value: { boolValue: true } },
      { key: 'd', value: { doubleValue: 1.5 } },
    ]);
  });
});

describe('the renderer door', () => {
  it('a valid line lands with its process; an off-union level or a non-string subsystem is dropped', () => {
    receiveRendererLog({ process: 'tab', level: 'warn', subsystem: 'canvas', msg: 'frame gone', fields: { frame_count: 2 } });
    receiveRendererLog({ process: 'tab', level: 'fatal', subsystem: 'canvas', msg: 'x' } as unknown as Parameters<typeof receiveRendererLog>[0]);
    receiveRendererLog({ process: 'tab', level: 'warn', subsystem: 42, msg: 'x' } as unknown as Parameters<typeof receiveRendererLog>[0]);
    receiveRendererLog({ process: 'guest', level: 'warn', subsystem: 'x', msg: 'x' } as unknown as Parameters<typeof receiveRendererLog>[0]);
    receiveRendererLog(null as unknown as Parameters<typeof receiveRendererLog>[0]);
    const rows = peekLinesForTesting();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ process: 'tab', level: 'warn', subsystem: 'canvas', msg: 'frame gone', frame_count: 2 });
  });

  it('a renderer line passes the same guardrail as a main line', () => {
    writeLine('chrome', 'info', 'chrome', 'at /Users/wren/x', { prompt: 'secret', n: 1 });
    const [row] = peekLinesForTesting();
    expect(row!['msg']).toBe('at <path>');
    expect(row).not.toHaveProperty('prompt');
    expect(row!['n']).toBe(1);
  });

  it('a renderer cannot park a thousand keys on one line', () => {
    const wide: Record<string, unknown> = {};
    for (let i = 0; i < 1_000; i += 1) wide[`k${String(i)}`] = i;
    receiveRendererLog({ process: 'tab', level: 'warn', subsystem: 'canvas', msg: 'wide', fields: wide });
    const [row] = peekLinesForTesting();
    const extras = Object.keys(row!).filter((key) => key.startsWith('k'));
    expect(extras.length).toBeLessThan(1_000);
    expect(extras.length + (row!['fields_dropped'] as number)).toBe(1_000);
  });

  it('a nested stderr never reaches the exporter, only the file lane at the top level', () => {
    writeLine('main', 'warn', 'install', 'failed', {
      stderr: 'fatal: origin/feature-x',
      attempt: { stderr: 'fatal: origin/other-branch', code: 1 },
    });
    const [row] = peekLinesForTesting();
    expect(row!['stderr']).toBe('fatal: origin/feature-x');
    expect(row!['attempt']).toEqual({ code: 1 });
    expect(JSON.stringify(row)).not.toContain('other-branch');
  });

  it('a subsystem that is not lowercase kebab is written as unknown', () => {
    writeLine('main', 'info', '/Users/wren', 'x');
    expect(peekLinesForTesting()[0]!['subsystem']).toBe('unknown');
  });
});
