import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import type { ScrubbedException } from '@studio/events';
import type { PostHog } from 'posthog-js/dist/module.no-external';
import type { AppLike } from '../telemetry/index.js';

const { resetIdentityCache } = await import('../identity/store.js');
const { flush, initTelemetry, peekQueueForTesting, resetTelemetryForTesting, setAppForTesting } = await import('../telemetry/index.js');
const { peekLinesForTesting, recordLinesForTesting, resetLogForTesting } = await import('../log/index.js');
const { captureError, fingerprintFor, installProcessHooks, resetErrorsForTesting, recordProcessExit, setProcessCrashContextReader } = await import('./index.js');
const { claimRunningMarker, readRunningContext, updateRunningContext } = await import('./crash-marker.js');
const { installProcessCrashHooks, resetProcessCrashHooksForTesting } = await import('./processes.js');
const { reportUpdateFailure } = await import('../updater/check.js');

const made: string[] = [];
const ENV_KEYS = ['STUDIO_STATE_ROOT', 'STUDIO_POSTHOG_KEY', 'STUDIO_TELEMETRY', 'AGENT_HEADLESS'] as const;
const originalEnv = new Map<string, string | undefined>(ENV_KEYS.map((key) => [key, process.env[key]]));
const realFetch = globalThis.fetch;
const postedEvents: Array<{ event: string; properties: Record<string, unknown> }> = [];

function makeRoot(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `studio-errors-${name}-`));
  made.push(root);
  return root;
}

function fakeApp(userData: string): AppLike {
  return { getPath: () => userData, getVersion: () => '0.0.0-test', getLocale: () => 'en-US', isPackaged: false };
}

beforeEach(() => {
  resetTelemetryForTesting();
  resetLogForTesting();
  resetErrorsForTesting();
  resetProcessCrashHooksForTesting();
  resetIdentityCache();
  for (const key of ENV_KEYS) delete process.env[key];
  process.env['STUDIO_STATE_ROOT'] = makeRoot('state');
  process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
  setAppForTesting(fakeApp(makeRoot('userdata')));
  postedEvents.length = 0;
  globalThis.fetch = ((_url: string, init: { body: string }) => {
    const body = JSON.parse(init.body) as { batch: typeof postedEvents };
    postedEvents.push(...body.batch);
    return Promise.resolve(new Response('{"status":1}'));
  }) as unknown as typeof fetch;
  recordLinesForTesting();
  initTelemetry();
});

afterEach(() => {
  resetTelemetryForTesting();
  resetLogForTesting();
  resetErrorsForTesting();
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

const exceptions = () => peekQueueForTesting().filter((event) => event.event === '$exception');
const errorLines = () => peekLinesForTesting().filter((line) => line['owner'] !== undefined);

it('Windows main exceptions keep a scrubbed JavaScript stack in error tracking', async () => {
  const platform = Object.getOwnPropertyDescriptor(process, 'platform')!;
  try {
    Object.defineProperty(process, 'platform', { ...platform, value: 'win32' });
    const target = new EventEmitter();
    installProcessHooks(target as unknown as Parameters<typeof installProcessHooks>[0]);
    const error = new TypeError('failed at C:\\private\\project\\file.ts');
    error.stack = 'TypeError: failed\n    at boot (C:\\private\\Onlook\\resources\\app.asar\\out\\main\\index.js:12:8)';
    target.emit('uncaughtException', error, 'uncaughtException');
    await flush();
    const exception = postedEvents.find(({ event }) => event === '$exception')?.properties;
    expect(exception).toMatchObject({ process_type: 'main', $exception_type: 'TypeError' });
    expect(exception?.['$exception_list']).toMatchObject([{ stacktrace: { frames: [{ filename: 'app://studio/out/main/index.js', lineno: 12, colno: 8 }] } }]);
    expect(JSON.stringify(exception)).not.toContain('private');
  } finally {
    Object.defineProperty(process, 'platform', platform);
  }
});

it('GPU and utility crashes carry their native reason and code without inventing a JavaScript stack', async () => {
  await recordProcessExit({ process_class: 'gpu', reason: 'crashed', exit_code: -1073741819 });
  await recordProcessExit({ process_class: 'utility', reason: 'oom', exit_code: 1 });
  const events = [...postedEvents, ...peekQueueForTesting()];
  const nativeExceptions = events.filter(({ event }) => event === '$exception');
  expect(nativeExceptions).toHaveLength(2);
  expect(nativeExceptions.map(({ properties }) => properties['process_type'])).toEqual(['gpu', 'utility']);
  expect(events.filter(({ event }) => event === 'crash_detected')).toEqual([]);
  expect(nativeExceptions.map(({ properties }) => [properties['reason'], properties['exit_code']])).toEqual([['crashed', -1073741819], ['oom', 1]]);
  expect(events.filter(({ event }) => event === 'process_gone').map(({ properties }) => [properties['process_class'], properties['reason'], properties['exit_code']])).toEqual([['gpu', 'crashed', -1073741819], ['utility', 'oom', 1]]);
  for (const exception of nativeExceptions) {
    const list = exception.properties['$exception_list'] as Record<string, unknown>[];
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ type: 'NativeProcessCrash' });
    expect(list[0]).not.toHaveProperty('stacktrace');
  }
});

it('live child crashes include the current screen and active creation checkpoint', async () => {
  claimRunningMarker('0199e1e0-0000-7000-8000-000000000001', '2.0.0');
  updateRunningContext('onboarding_screen_shown', { screen: 'import' });
  updateRunningContext('workspace_creation_flow', { step: 'started', outcome: 'started' });
  setProcessCrashContextReader(readRunningContext);
  await recordProcessExit({ process_class: 'utility', reason: 'crashed', exit_code: 3 });
  const events = [...postedEvents, ...peekQueueForTesting()];
  expect(events.filter(({ event }) => event === 'crash_detected')).toEqual([]);
  const reports = events.filter(({ event }) => event === '$exception');
  expect(reports).toHaveLength(1);
  for (const report of reports) expect(report.properties).toMatchObject({ last_event: 'workspace_creation_flow', last_screen: 'import', during_workspace_creation: true });
});

it('process crash hooks observe startup exits before performance sampling and install only once', async () => {
  const target = new EventEmitter();
  installProcessCrashHooks(target as unknown as Parameters<typeof installProcessCrashHooks>[0]);
  installProcessCrashHooks(target as unknown as Parameters<typeof installProcessCrashHooks>[0]);
  expect(target.listenerCount('child-process-gone')).toBe(1);
  expect(target.listenerCount('render-process-gone')).toBe(1);
  target.emit('child-process-gone', {}, { type: 'GPU', reason: 'crashed', exitCode: 3 });
  target.emit('child-process-gone', {}, { type: 'Utility', reason: 'oom', exitCode: 1 });
  target.emit('render-process-gone', {}, { id: 99, getType: () => 'window' }, { reason: 'crashed', exitCode: 2 });
  await flush();
  const events = [...postedEvents, ...peekQueueForTesting()];
  expect(events.filter(({ event }) => event === 'crash_detected')).toEqual([]);
  expect(events.filter(({ event }) => event === 'process_gone').map(({ properties }) => properties['process_class'])).toEqual(['gpu', 'utility', 'tab']);
  expect(events.filter(({ event }) => event === '$exception').map(({ properties }) => [properties['$exception_type'], properties['process_type']])).toEqual([['NativeProcessCrash', 'gpu'], ['NativeProcessCrash', 'utility'], ['NativeProcessCrash', 'renderer']]);
});

it('intentional child termination and a user app crash are not Onlook exceptions', () => {
  recordProcessExit({ process_class: 'tab', reason: 'killed', exit_code: 0 });
  recordProcessExit({ process_class: 'frame', reason: 'crashed', exit_code: 1 });
  recordProcessExit({ process_class: 'dev_server', reason: 'crashed', exit_code: 1 });
  expect(exceptions()).toEqual([]);
  expect(peekQueueForTesting().filter(({ event }) => event === 'crash_detected')).toEqual([]);
  expect(peekQueueForTesting().filter(({ event }) => event === 'process_gone')).toHaveLength(3);
});

describe('update-check network failures', () => {
  it.each([
    'ERR_NETWORK_IO_SUSPENDED',
    'ERR_SSL_PROTOCOL_ERROR',
    'ERR_EMPTY_RESPONSE',
    'ERR_CONTENT_LENGTH_MISMATCH',
    'ERR_FUTURE_NETWORK_FAILURE',
  ])('keeps %s in update_check_failed without creating an Error Tracking issue', (code) => {
    reportUpdateFailure('check', new Error(`net::${code} (-1)`));
    expect(exceptions()).toHaveLength(0);
    expect(peekQueueForTesting().filter((event) => event.event === 'update_check_failed')).toMatchObject([
      { properties: { stage: 'check', reason: code } },
    ]);
    expect(errorLines()).toMatchObject([{ subsystem: 'updater', owner: 'environment', level: 'warn' }]);
  });

  it('still files non-network updater bugs and records the failed check', () => {
    reportUpdateFailure('check', new TypeError('updater state is missing'));
    expect(exceptions()).toHaveLength(1);
    expect(peekQueueForTesting().filter((event) => event.event === 'update_check_failed')).toMatchObject([
      { properties: { stage: 'check', reason: 'other' } },
    ]);
  });
});

describe('the owner gate', () => {
  it('ours: one $exception with a fingerprint, the ids, a scrubbed stack, and an error line', () => {
    captureError(new TypeError('cannot open /Users/wren/repo/.env'), { owner: 'ours', subsystem: 'workspace', mechanism: 'ipc' });
    const [event] = exceptions();
    expect(event).toBeDefined();
    const props = event!.properties;
    expect(props['$exception_type']).toBe('TypeError');
    expect(props['$exception_message']).toBe('cannot open <path>');
    expect(props['$exception_fingerprint']).toBe(fingerprintFor('workspace', { type: 'TypeError', value: 'cannot open <path>' }));
    expect(props['subsystem']).toBe('workspace');
    expect(props['mechanism']).toBe('ipc');
    expect(typeof props['$session_id']).toBe('string');
    expect(JSON.stringify(props)).not.toContain('/Users/');
    const [line] = errorLines();
    expect(line).toMatchObject({ level: 'error', subsystem: 'workspace', msg: 'cannot open <path>', owner: 'ours', error_type: 'TypeError' });
  });

  it('environment and user_app: a warn line and no issue; expected: an info line', () => {
    captureError(new Error('git hook timed out'), { owner: 'environment', subsystem: 'workspace' });
    captureError(new Error('dev server answered 500'), { owner: 'user_app', subsystem: 'server' });
    captureError(new Error('refused: no base ref'), { owner: 'expected', subsystem: 'workspace' });
    expect(exceptions()).toHaveLength(0);
    expect(errorLines().map((line) => [line.level, line['owner']])).toEqual([
      ['warn', 'environment'],
      ['warn', 'user_app'],
      ['info', 'expected'],
    ]);
  });

  it("a git failure's remote and raw stderr stay out of the issue", () => {
    captureError(new Error("fatal: 'origin/feature-x' not found at https://github.com/org/repo.git"), {
      owner: 'ours',
      subsystem: 'workspace',
      stderr: "fatal: 'origin/feature-x' not found at https://github.com/org/repo.git",
    });
    const props = JSON.stringify(exceptions()[0]!.properties);
    expect(props).not.toContain('github.com');
    expect(props).not.toContain('org/repo');
    expect(props).not.toContain('feature-x');
    expect(exceptions()[0]!.properties['stderr']).toBeUndefined();
    expect(errorLines()[0]!.msg).not.toContain('feature-x');
  });

  it('two git failures that differ only in the branch are one issue', () => {
    captureError(new Error("fatal: couldn't find remote ref feature-x"), { owner: 'ours', subsystem: 'workspace' });
    captureError(new Error("fatal: couldn't find remote ref fix-login"), { owner: 'ours', subsystem: 'workspace' });
    const [a, b] = exceptions().map((event) => event.properties['$exception_fingerprint']);
    expect(a).toBe(b);
  });

  it('a thrown string and an already-scrubbed report both land', () => {
    captureError('boom at /Users/wren/x', { owner: 'ours', subsystem: 'x' });
    captureError({ type: 'RangeError', value: 'renderer said so' }, { owner: 'ours', subsystem: 'renderer', mechanism: 'renderer' });
    expect(exceptions().map((event) => event.properties['$exception_message'])).toEqual(['boom at <path>', 'renderer said so']);
  });

  it('with no key, the line is still written and nothing is queued', () => {
    resetTelemetryForTesting();
    delete process.env['STUDIO_POSTHOG_KEY'];
    initTelemetry();
    captureError(new Error('quiet'), { owner: 'ours', subsystem: 'x' });
    expect(exceptions()).toHaveLength(0);
    expect(errorLines().at(-1)?.msg).toBe('quiet');
  });
});

type PostHogException = Parameters<NonNullable<PostHog['exceptionObserver']>['captureException']>[0]['$exception_list'][number];

describe("the frames PostHog's processing accepts (ONL-2532)", () => {
  it("every frame main sends has PostHog's frame shape, platform included", () => {
    captureError(new TypeError('boom'), { owner: 'ours', subsystem: 'workspace' });
    const sent = exceptions()[0]!.properties['$exception_list'] as ScrubbedException[];
    const accepted: PostHogException[] = sent;
    const frames = accepted.flatMap((exception) => exception.stacktrace?.frames ?? []);
    expect(frames.length).toBeGreaterThan(0);
    expect(new Set(frames.map((frame) => frame.platform))).toEqual(new Set(['node:javascript']));
  });
});

describe('fingerprintFor', () => {
  it('separates two messages from one module and joins the same message with different digits', () => {
    const a = fingerprintFor('tabs', { type: 'Error', value: 'view 12 gone' });
    const b = fingerprintFor('tabs', { type: 'Error', value: 'view 99 gone' });
    const c = fingerprintFor('tabs', { type: 'Error', value: 'load failed' });
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(fingerprintFor('other', { type: 'Error', value: 'view 12 gone' })).not.toEqual(a);
  });
});

describe('installProcessHooks', () => {
  it('keeps known network and disk failures out of issues without hiding unknown errors', async () => {
    const posted: Array<{ batch: Array<{ event: string; properties: Record<string, unknown> }> }> = [];
    globalThis.fetch = ((_url: string, init: { body: string }) => {
      posted.push(JSON.parse(init.body));
      return Promise.resolve(new Response('{"status":1}'));
    }) as unknown as typeof fetch;
    const emitter = new EventEmitter();
    installProcessHooks(emitter as unknown as Parameters<typeof installProcessHooks>[0]);
    emitter.emit('unhandledRejection', new Error('net::ERR_INTERNET_DISCONNECTED'));
    emitter.emit('unhandledRejection', Object.assign(new Error('cannot save /Users/wren/repo/file.ts'), { code: 'ENOSPC' }));
    emitter.emit('uncaughtException', new TypeError('real bug at /Users/wren/repo/file.ts'), 'uncaughtException');
    await Bun.sleep(10);
    expect(errorLines().map((line) => line['owner'])).toEqual(['environment', 'environment', 'ours']);
    const sent = posted.flatMap((body) => body.batch).filter((event) => event.event === '$exception');
    expect(sent).toHaveLength(1);
    expect(sent[0]!.properties['$exception_type']).toBe('TypeError');
    expect(JSON.stringify(sent)).not.toContain('/Users/');
  });

  it('captures an uncaught exception and an unhandled rejection as ours, flushed at once, once per process', async () => {
    const posted: Array<{ batch: Array<{ event: string; properties: Record<string, unknown> }> }> = [];
    globalThis.fetch = ((_url: string, init: { body: string }) => {
      posted.push(JSON.parse(init.body));
      return Promise.resolve(new Response('{"status":1}'));
    }) as unknown as typeof fetch;
    const emitter = new EventEmitter();
    installProcessHooks(emitter as unknown as Parameters<typeof installProcessHooks>[0]);
    installProcessHooks(emitter as unknown as Parameters<typeof installProcessHooks>[0]);
    expect(emitter.listenerCount('uncaughtException')).toBe(1);
    expect(emitter.listenerCount('unhandledRejection')).toBe(1);
    emitter.emit('uncaughtException', new Error('main threw'), 'uncaughtException');
    emitter.emit('unhandledRejection', new Error('nobody caught this'));
    await Bun.sleep(10);
    const sent = posted.flatMap((body) => body.batch).filter((event) => event.event === '$exception');
    expect(sent.map((event) => [event.properties['$exception_message'], event.properties['mechanism']])).toEqual([
      ['main threw', 'uncaughtException'],
      ['nobody caught this', 'unhandled-rejection'],
    ]);
  });

  it('a thrown value that cannot be stringified is reported, not fatal', () => {
    const emitter = new EventEmitter();
    installProcessHooks(emitter as unknown as Parameters<typeof installProcessHooks>[0]);
    expect(() => emitter.emit('uncaughtException', Object.create(null), 'uncaughtException')).not.toThrow();
    const hostile = new Error('x');
    Object.defineProperty(hostile, 'message', {
      get() {
        throw new Error('getter');
      },
    });
    expect(() => emitter.emit('unhandledRejection', hostile)).not.toThrow();
    expect(errorLines().at(-1)?.owner).toBe('ours');
  });
});
