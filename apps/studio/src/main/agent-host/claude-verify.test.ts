import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import { FILE_ONLY_KEYS } from '@studio/events';
import { fakeElapsed, outcome } from '@studio/fixtures';
import type { Query, query } from '@anthropic-ai/claude-agent-sdk';
import { agentVerifyPin } from '../diagnostics/gate.js';
import {
  configureLogExport,
  flushLog,
  peekLinesForTesting,
  recordLinesForTesting,
  resetLogForTesting,
} from '../log/index.js';
import {
  VERIFY_BUDGET_MS,
  verifyClaudeTurn,
  verifyScratchSettledForTests,
  type ClaudeVerifyVerdict,
} from './claude-verify.js';

const SESSION = { session_id: 'sdk-1', uuid: '01920000-0000-7000-8000-00000000000a' };

/** Captured at 0.3.284: a failing turn's result is subtype `success` with `is_error: true` (ONL-2080). */
const RESULT = (over: Record<string, unknown> = {}): unknown => ({
  type: 'result',
  subtype: 'success',
  is_error: true,
  duration_ms: 412,
  duration_api_ms: 380,
  num_turns: 1,
  total_cost_usd: 0,
  result: 'API Error',
  permission_denials: [],
  errors: [],
  ...SESSION,
  ...over,
});

const ASSISTANT = (kind: string): unknown => ({
  type: 'assistant',
  message: {
    id: 'msg_1',
    role: 'assistant',
    model: 'claude-sonnet-4-5',
    content: [{ type: 'text', text: 'API Error' }],
    stop_reason: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  },
  parent_tool_use_id: null,
  error: kind,
  ...SESSION,
});

const LIMIT_EVENT = (status: 'rejected' | 'allowed', resetsAt: number): unknown => ({
  type: 'rate_limit_event',
  rate_limit_info: { rateLimitType: 'five_hour', status, resetsAt, utilization: status === 'rejected' ? 1 : 0.4 },
  ...SESSION,
});

const RETRY = (kind: string, status: number | null): unknown => ({
  type: 'system',
  subtype: 'api_retry',
  attempt: 1,
  error: kind,
  error_status: status,
  ...SESSION,
});

interface Script {
  /** Yielded before the hang, so a retry can precede a child that never answers. */
  messages?: unknown[];
  throws?: unknown;
  /** Waits for `release()`; `ignoresAbort` models the child that outlives `abort()` by about two seconds. */
  hangs?: boolean;
  ignoresAbort?: boolean;
}

function fakeSdk(script: Script = {}) {
  let seen: Record<string, unknown> | undefined;
  let open: (() => void) | undefined;
  let announce: (() => void) | undefined;
  const released = new Promise<void>((resolve) => {
    open = resolve;
  });
  const opened = new Promise<void>((resolve) => {
    announce = resolve;
  });
  const queryFn = ((args: { prompt: unknown; options: Record<string, unknown> }) => {
    seen = args.options;
    const abort = args.options['abortController'] as AbortController | undefined;
    const q = {
      async *[Symbol.asyncIterator](): AsyncGenerator<unknown> {
        announce?.();
        for (const message of script.messages ?? []) yield message;
        if (script.hangs === true) {
          let aborted = false;
          await new Promise<void>((resolve) => {
            void released.then(resolve);
            if (script.ignoresAbort === true || abort === undefined) return;
            const fire = (): void => {
              aborted = true;
              resolve();
            };
            if (abort.signal.aborted) fire();
            else abort.signal.addEventListener('abort', fire, { once: true });
          });
          if (aborted) throw Object.assign(new Error('Claude Code process aborted'), { errorClass: 'aborted' });
        }
        if (script.throws !== undefined) throw script.throws;
      },
    };
    return q as unknown as Query;
  }) as unknown as typeof query;
  return {
    queryFn,
    opened,
    get options(): Record<string, unknown> | undefined {
      return seen;
    },
    get cwd(): string {
      const cwd = seen?.['cwd'];
      if (typeof cwd !== 'string') throw new Error('the turn was never opened');
      return cwd;
    },
    release: (): void => open?.(),
  };
}

const ENV = { PATH: '/usr/bin', HOME: '/u/x' };

async function verdictFor(script: Script, over: Record<string, unknown> = {}): Promise<ClaudeVerifyVerdict> {
  const sdk = fakeSdk(script);
  const verdict = await verifyClaudeTurn({ env: ENV, query: sdk.queryFn, ...over });
  await verifyScratchSettledForTests();
  return verdict;
}

const savedPin = process.env['STUDIO_AGENT_VERIFY'];
afterEach(() => {
  if (savedPin === undefined) delete process.env['STUDIO_AGENT_VERIFY'];
  else process.env['STUDIO_AGENT_VERIFY'] = savedPin;
});

describe('the failure guard (ONL-2080)', () => {
  it('a result with is_error false is ok', async () => {
    expect(await verdictFor({ messages: [RESULT({ is_error: false, result: 'ok' })] })).toEqual({ outcome: 'ok' });
  });

  it('a subtype that is not success fails even with is_error absent', async () => {
    const verdict = await verdictFor({
      messages: [RESULT({ subtype: 'error_during_execution', is_error: undefined, result: null })],
    });
    expect(verdict.outcome).toBe('failed');
  });
});

describe('the family read from structure (ONL-2496)', () => {
  it('authentication_failed with no status is turn-signed-out, on both captured sentences', async () => {
    for (const sentence of [
      'Not logged in · Please run /login',
      'Failed to authenticate: OAuth session expired and could not be refreshed',
    ]) {
      expect(
        await verdictFor({
          messages: [ASSISTANT('authentication_failed'), RESULT({ terminal_reason: 'api_error', result: sentence })],
        }),
      ).toMatchObject({ outcome: 'failed', detail: 'turn-signed-out', sentence });
    }
  });

  it('an auth failure behind a retried 5xx is still turn-signed-out (ONL-2496)', async () => {
    // The kind and the status arrive on different messages; pairing them across read a sign-in as a wait.
    const sentence = 'Not logged in · Please run /login';
    expect(
      await verdictFor({
        messages: [
          RETRY('server_error', 500),
          ASSISTANT('authentication_failed'),
          RESULT({ terminal_reason: 'api_error', result: sentence }),
        ],
      }),
    ).toMatchObject({ outcome: 'failed', detail: 'turn-signed-out', sentence });
  });

  // In order: what the account can fix, then a limit with a window behind it, then the service's own trouble (ONL-2903).
  it('reads each failing shape as the cause a person can act on', async () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    const rows: [string, unknown[], string][] = [
      ['billing kind', [ASSISTANT('billing_error'), RESULT({ api_error_status: 400 })], 'turn-billing'],
      ['HTTP 402', [ASSISTANT('unknown'), RESULT({ api_error_status: 402 })], 'turn-billing'],
      ['credits sentence', [RESULT({ result: 'Credit balance is too low' })], 'turn-billing'],
      ['auth 401', [ASSISTANT('authentication_failed'), RESULT({ api_error_status: 401 })], 'turn-sign-in-rejected'],
      ['auth 403', [ASSISTANT('authentication_failed'), RESULT({ api_error_status: 403 })], 'turn-sign-in-rejected'],
      ['cloud credential', [ASSISTANT('cloud_credential_error'), RESULT()], 'turn-provider-refused'],
      ['missing model', [ASSISTANT('model_not_found'), RESULT({ api_error_status: 404 })], 'turn-provider-refused'],
      ['statusless server error', [ASSISTANT('server_error'), RESULT()], 'turn-provider-refused'],
      ['blocking_limit', [RESULT({ terminal_reason: 'blocking_limit' })], 'turn-usage-limit'],
      ['budget_exhausted', [RESULT({ terminal_reason: 'budget_exhausted' })], 'turn-usage-limit'],
      ['429 with a rejected window', [LIMIT_EVENT('rejected', future), ASSISTANT('rate_limit'), RESULT({ api_error_status: 429 })], 'turn-usage-limit'],
      ['429 with no rejected window', [LIMIT_EVENT('allowed', future), ASSISTANT('rate_limit'), RESULT({ api_error_status: 429 })], 'turn-rate-limited'],
      ['429 with no window at all', [ASSISTANT('rate_limit'), RESULT({ api_error_status: 429 })], 'turn-rate-limited'],
      ['529 overloaded', [ASSISTANT('overloaded'), RESULT({ api_error_status: 529 })], 'turn-service-error'],
      ['statusless overload', [ASSISTANT('overloaded'), RESULT()], 'turn-service-error'],
      ['500', [ASSISTANT('server_error'), RESULT({ api_error_status: 500 })], 'turn-service-error'],
    ];
    for (const [name, messages, detail] of rows) {
      const verdict = await verdictFor({ messages });
      expect([name, (verdict as { detail?: string }).detail]).toEqual([name, detail]);
    }
  });

  it("carries the limit's reset, the status and Claude's own words for the person's screen", async () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    expect(await verdictFor({ messages: [LIMIT_EVENT('rejected', future), ASSISTANT('rate_limit'), RESULT({ api_error_status: 429, result: 'limit hit' })] })).toMatchObject({
      detail: 'turn-usage-limit',
      facts: { limit: { window: 'session', resetsAt: future }, diagnostic: { kind: 'rate_limit', status: 429 }, sentence: 'limit hit' },
    });
    const refused = await verdictFor({ messages: [ASSISTANT('unknown'), RESULT({ api_error_status: 400, result: 'API Error: Your organization has disabled Claude Code access.' })] });
    expect(refused).toMatchObject({ detail: 'turn-agent-error', facts: { sentence: 'API Error: Your organization has disabled Claude Code access.' } });
  });

  it('an unknown kind with a 400 is turn-agent-error', async () => {
    expect(await verdictFor({ messages: [ASSISTANT('unknown'), RESULT({ api_error_status: 400 })] })).toMatchObject({
      outcome: 'failed',
      detail: 'turn-agent-error',
    });
  });

  it('a startup failure with a null result is turn-agent-error and does not throw on the absent sentence', async () => {
    expect(
      await verdictFor({
        messages: [
          RESULT({
            subtype: 'error_during_execution',
            startup_failure_reason: 'proxy_invalid',
            result: null,
            api_error_status: null,
          }),
        ],
      }),
    ).toEqual({ outcome: 'failed', detail: 'turn-agent-error' });
  });

  it('a startup failure outranks an error kind', async () => {
    expect(
      await verdictFor({
        messages: [
          ASSISTANT('rate_limit'),
          RESULT({ subtype: 'error_during_execution', startup_failure_reason: 'gateway_access_denied', result: null }),
        ],
      }),
    ).toMatchObject({ detail: 'turn-agent-error' });
  });
});

describe('a throw (ONL-2496)', () => {
  it('a missing executable is a launch failure, distinct from every turn family', async () => {
    const verdict = await verdictFor({
      throws: Object.assign(new Error('Claude Code executable not found'), { errorClass: 'executable_not_found' }),
    });
    expect(verdict).toEqual({
      outcome: 'launch-failed',
      errorClass: 'executable_not_found',
      sentence: 'Claude Code executable not found',
    });
  });

  it('a throw after the caller aborted is cancelled and carries no family', async () => {
    const sdk = fakeSdk({ hangs: true });
    const abort = new AbortController();
    const running = verifyClaudeTurn({ env: ENV, query: sdk.queryFn, signal: abort.signal });
    await sdk.opened;
    abort.abort();
    const verdict = await running;
    await verifyScratchSettledForTests();
    expect(verdict).toEqual({ outcome: 'cancelled' });
  });

  it('a signal already aborted opens no turn at all', async () => {
    const sdk = fakeSdk();
    const abort = new AbortController();
    abort.abort();
    const verdict = await verifyClaudeTurn({ env: ENV, query: sdk.queryFn, signal: abort.signal });
    expect(verdict).toEqual({ outcome: 'cancelled' });
    expect(sdk.options).toBeUndefined();
  });

  it('an abort while the scratch directory is being made still cancels (ONL-2496)', async () => {
    const sdk = fakeSdk({ messages: [RESULT({ is_error: false, result: 'ok' })] });
    const abort = new AbortController();
    const running = verifyClaudeTurn({ env: ENV, query: sdk.queryFn, signal: abort.signal });
    // Synchronous, so the signal trips while `mkdtemp` is pending: a listener added after that await never replays it.
    abort.abort();
    expect(await running).toEqual({ outcome: 'cancelled' });
    expect(sdk.options).toBeUndefined();
    await verifyScratchSettledForTests();
  });

  it('a synchronous refusal from query() is a launch failure, not an unhandled throw (ONL-2496)', async () => {
    const refusing = ((): never => {
      throw Object.assign(new Error('Claude Code executable not found'), { errorClass: 'executable_not_found' });
    }) as unknown as typeof query;
    const verdict = await verifyClaudeTurn({ env: ENV, query: refusing });
    await verifyScratchSettledForTests();
    expect(verdict).toEqual({
      outcome: 'launch-failed',
      errorClass: 'executable_not_found',
      sentence: 'Claude Code executable not found',
    });
  });
});

describe('the host clock (ONL-2496)', () => {
  const advance = (ms: number): void => {
    jest.advanceTimersByTime(ms);
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  it('elapsing with no terminal message is turn-no-answer, and the scratch cwd outlives the verdict', async () => {
    // The clock is faked before the turn opens: a timer registered first stays real.
    jest.useFakeTimers();
    const sdk = fakeSdk({ hangs: true, ignoresAbort: true });
    const running = verifyClaudeTurn({ env: ENV, query: sdk.queryFn });
    await sdk.opened;
    const took = await fakeElapsed(running, { advance, limitMs: VERIFY_BUDGET_MS * 2 });
    jest.useRealTimers();

    expect(took).toBeDefined();
    // The claim is that the clock ended it, not the exact tick: a tight tolerance only measures the host's load.
    expect(took ?? Infinity).toBeLessThan(VERIFY_BUDGET_MS * 2);
    expect(await running).toEqual({ outcome: 'failed', detail: 'turn-no-answer' });
    // The child has not settled, so the cwd it was handed is still there (ONL-2496).
    expect(existsSync(sdk.cwd)).toBe(true);
    sdk.release();
    await verifyScratchSettledForTests();
    expect(existsSync(sdk.cwd)).toBe(false);
  });

  it('a cancel inside the budget wins over the clock, so Cancel never reports a failure (ONL-2496)', async () => {
    jest.useFakeTimers();
    const sdk = fakeSdk({ hangs: true, ignoresAbort: true });
    const abort = new AbortController();
    const running = verifyClaudeTurn({ env: ENV, query: sdk.queryFn, signal: abort.signal, budgetMs: 500 });
    await sdk.opened;
    abort.abort();
    expect(await fakeElapsed(running, { advance, limitMs: 2_000 })).toBeDefined();
    jest.useRealTimers();
    expect(await running).toEqual({ outcome: 'cancelled' });
    sdk.release();
    await verifyScratchSettledForTests();
  });

  it('a retry that already named a kind outranks the clock', async () => {
    jest.useFakeTimers();
    const sdk = fakeSdk({ messages: [RETRY('rate_limit', 429)], hangs: true, ignoresAbort: true });
    const running = verifyClaudeTurn({ env: ENV, query: sdk.queryFn, budgetMs: 500 });
    await sdk.opened;
    expect(await fakeElapsed(running, { advance, limitMs: 2_000 })).toBeDefined();
    jest.useRealTimers();
    sdk.release();
    expect(await running).toEqual({ outcome: 'failed', detail: 'turn-rate-limited', facts: { diagnostic: { kind: 'rate_limit', status: 429 } } });
    await verifyScratchSettledForTests();
  });
});

describe('the scratch cwd (ONL-2496)', () => {
  it('is gone after a success, a failure and an abort', async () => {
    const ok = fakeSdk({ messages: [RESULT({ is_error: false, result: 'ok' })] });
    await verifyClaudeTurn({ env: ENV, query: ok.queryFn });
    await verifyScratchSettledForTests();
    expect(existsSync(ok.cwd)).toBe(false);

    const bad = fakeSdk({ messages: [ASSISTANT('rate_limit'), RESULT({ api_error_status: 429 })] });
    await verifyClaudeTurn({ env: ENV, query: bad.queryFn });
    await verifyScratchSettledForTests();
    expect(existsSync(bad.cwd)).toBe(false);

    const hung = fakeSdk({ hangs: true });
    const abort = new AbortController();
    const running = verifyClaudeTurn({ env: ENV, query: hung.queryFn, signal: abort.signal });
    await hung.opened;
    abort.abort();
    await running;
    await verifyScratchSettledForTests();
    expect(existsSync(hung.cwd)).toBe(false);
  });
});

describe('the turn carries no tool, no setting and no history (ONL-2496)', () => {
  it('sets the options the verification needs and pins no model', async () => {
    const sdk = fakeSdk({ messages: [RESULT({ is_error: false, result: 'ok' })] });
    await verifyClaudeTurn({ env: ENV, query: sdk.queryFn, executablePath: '/a/claude' });
    await verifyScratchSettledForTests();
    const options = sdk.options ?? {};
    expect(options['tools']).toEqual([]);
    expect(options['mcpServers']).toEqual({});
    expect(options['strictMcpConfig']).toBe(true);
    expect(options['settingSources']).toEqual([]);
    expect(options['settings']).toEqual({ disableAllHooks: true });
    expect(options['persistSession']).toBe(false);
    expect(options['thinking']).toEqual({ type: 'disabled' });
    expect(options['maxTurns']).toBe(1);
    expect(options['permissionMode']).toBe('dontAsk');
    expect(options['permissionPrompts']).toBe('none');
    expect(options['pathToClaudeCodeExecutable']).toBe('/a/claude');
    expect(typeof options['systemPrompt']).toBe('string');
    expect('model' in options).toBe(false);
    expect('maxBudgetUsd' in options).toBe(false);
  });

  it('puts the three bounding values on the turn env, over the caller value', async () => {
    const sdk = fakeSdk({ messages: [RESULT({ is_error: false, result: 'ok' })] });
    await verifyClaudeTurn({ env: { ...ENV, API_TIMEOUT_MS: '600000' }, query: sdk.queryFn });
    await verifyScratchSettledForTests();
    expect(sdk.options?.['env']).toMatchObject({
      PATH: '/usr/bin',
      CLAUDE_CODE_MAX_RETRIES: '1',
      API_TIMEOUT_MS: '8000',
      CLAUDE_CODE_STARTUP_FAILURE_RESULTS: '1',
    });
  });
});

describe('the STUDIO_AGENT_VERIFY pin (ONL-2496)', () => {
  it('answers its verdict without opening a turn, and marks itself pinned', async () => {
    const sdk = fakeSdk({ messages: [RESULT({ is_error: false })] });
    process.env['STUDIO_AGENT_VERIFY'] = 'ok';
    expect(await verifyClaudeTurn({ env: ENV, query: sdk.queryFn })).toEqual({ outcome: 'ok', pinned: true });
    process.env['STUDIO_AGENT_VERIFY'] = 'turn-provider-refused';
    expect(await verifyClaudeTurn({ env: ENV, query: sdk.queryFn })).toEqual({
      outcome: 'failed',
      detail: 'turn-provider-refused',
      pinned: true,
    });
    expect(sdk.options).toBeUndefined();
  });

  it('throws on a value it does not recognise', async () => {
    const sdk = fakeSdk({ messages: [RESULT({ is_error: false })] });
    process.env['STUDIO_AGENT_VERIFY'] = 'turn-signed-ouy';
    expect(await outcome(verifyClaudeTurn({ env: ENV, query: sdk.queryFn }))).toThrow(/STUDIO_AGENT_VERIFY/);
  });

  it('a packaged build carries no pin, whatever the environment says (ONL-2496)', () => {
    expect(agentVerifyPin({ packaged: false, env: { STUDIO_AGENT_VERIFY: 'ok' } })).toBe('ok');
    // `CODING.md`: a shipped build appends no debugging switch and carries no gate flag. No binary seat reopens it.
    for (const env of [
      { STUDIO_AGENT_VERIFY: 'ok' },
      { STUDIO_AGENT_VERIFY: 'ok', STUDIO_STATE_ROOT: '/s', STUDIO_CLAUDE_BIN: join('/s', 'claude-shim', 'claude.mjs') },
      { STUDIO_AGENT_VERIFY: 'ok', STUDIO_CLAUDE_BIN: '/usr/local/bin/claude' },
      { STUDIO_AGENT_VERIFY: 'ok', STUDIO_STATE_ROOT: '/s', STUDIO_CLAUDE_BIN: '/s/claude-shim/../../usr/bin/claude' },
    ]) {
      expect(agentVerifyPin({ packaged: true, env })).toBeUndefined();
    }
  });
});

describe('the log line (ONL-2496)', () => {
  const made: string[] = [];
  const savedStateRoot = process.env['STUDIO_STATE_ROOT'];
  const realFetch = globalThis.fetch;
  let root: string;

  beforeEach(() => {
    resetLogForTesting();
    root = mkdtempSync(join(tmpdir(), 'studio-verify-log-'));
    made.push(root);
    process.env['STUDIO_STATE_ROOT'] = root;
    recordLinesForTesting();
  });

  afterEach(() => {
    resetLogForTesting();
    globalThis.fetch = realFetch;
    if (savedStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
    else process.env['STUDIO_STATE_ROOT'] = savedStateRoot;
    for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('carries the discriminators as scalars, and the CLI sentence reaches the file and not the export', async () => {
    const bodies: string[] = [];
    configureLogExport({ key: 'phc_test', host: 'https://ingest.example.test' });
    globalThis.fetch = ((_url: string, init: { body: string }) => {
      bodies.push(init.body);
      return Promise.resolve(new Response('{}'));
    }) as unknown as typeof fetch;

    const sentence = 'API Error: 403 credentials from account 123456789012 were refused by gateway.corp:8443';
    await verdictFor({
      messages: [
        ASSISTANT('authentication_failed'),
        RESULT({ api_error_status: 403, terminal_reason: 'api_error', result: sentence }),
      ],
    });

    const line = peekLinesForTesting().at(-1);
    expect(line?.['detail']).toBe('turn-sign-in-rejected');
    expect(line?.['error_kind']).toBe('authentication_failed');
    expect(line?.['api_error_status']).toBe(403);
    expect(line?.['terminal_reason']).toBe('api_error');

    const file = readFileSync(join(root, 'logs', 'studio.log'), 'utf8');
    expect(file).toContain('gateway.corp:8443');
    await flushLog();
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).not.toContain('gateway.corp');
    expect(bodies[0]).not.toContain('123456789012');
    // The key, not the wording: a rename that lifted the sentence out of `FILE_ONLY_KEYS` would ship it (ONL-2496).
    expect(FILE_ONLY_KEYS.has('cli_sentence')).toBe(true);
  });

  it('keeps the launch failure class off the exporter: the SDK does not declare it (ONL-2496)', async () => {
    const bodies: string[] = [];
    configureLogExport({ key: 'phc_test', host: 'https://ingest.example.test' });
    globalThis.fetch = ((_url: string, init: { body: string }) => {
      bodies.push(init.body);
      return Promise.resolve(new Response('{}'));
    }) as unknown as typeof fetch;

    await verdictFor({
      throws: Object.assign(new Error('spawn /opt/corp/claude ENOENT'), { errorClass: 'executable_not_found' }),
    });

    expect(peekLinesForTesting().at(-1)?.['error_class']).toBe('executable_not_found');
    expect(readFileSync(join(root, 'logs', 'studio.log'), 'utf8')).toContain('executable_not_found');
    await flushLog();
    expect(bodies[0]).not.toContain('executable_not_found');
    expect(FILE_ONLY_KEYS.has('error_class')).toBe(true);
  });
});
