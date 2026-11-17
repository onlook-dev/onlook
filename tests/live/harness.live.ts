// Spends tokens and rewrites `tests/live/recordings/`, which a harness version bump leaves stale until this runs (ONL-2445).

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, describe, it } from 'node:test';
import { foldSessionState } from '@studio/events';
import type { AgentConnection, HarnessId, StudioEvent } from '@studio/events';
import type { AgentBackend } from '../../apps/studio/src/main/agent-host/backend.js';
import type { AgentSessionOptions } from '../../apps/studio/src/main/agent-host/session.js';
import type { StudioToolSinks } from '../../apps/studio/src/main/agent-host/studio-tools.js';
import { machineCodexCacheRoot } from '../../apps/studio/src/main/codex/paths.js';
import { leaks, writeRecordings } from './recording.js';
import { divergence } from './replay-divergence.js';
import { liveClaudeEnv } from '../apparatus/src/live-claude-env.js';
import { recordingSinks, toolsPrompt } from './tool-fixture.js';

const CLAUDE_MODEL = 'haiku';
const CODEX_MODEL = process.env['CODEX_MODEL'] ?? 'gpt-6-luna';
const CODEWORD = 'ZEPHYR-7742';
const TURN_MS = 180_000;
const RECORDINGS = join(dirname(fileURLToPath(import.meta.url)), 'recordings');

type Scenario = 'tools' | 'interrupt' | 'resume';

const made: string[] = [];
function scratch(tag: string, under = tmpdir()): string {
  const dir = mkdtempSync(join(under, `studio-harness-${tag}-`));
  made.push(dir);
  return dir;
}

const workspaceRoot = scratch('workspaces');
process.env['STUDIO_WORKSPACE_ROOT'] = workspaceRoot;
process.env['STUDIO_STATE_ROOT'] = scratch('state');
// Reuses the operator's installed codex instead of 111MB per run; an acquire still lands in scratch.
process.env['STUDIO_CODEX_CACHE_ROOT'] ??= machineCodexCacheRoot();
const claudeConfigDir = scratch('claude-config');
delete process.env['OPENAI_API_KEY'];
delete process.env['CODEX_API_KEY'];
delete process.env['CODEX_ACCESS_TOKEN'];

after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

function scratchRepo(): string {
  const dir = scratch('cwd', workspaceRoot);
  writeFileSync(join(dir, 'index.js'), "console.log('harness check');\n");
  const git = (...args: string[]): void => {
    execFileSync('git', args, { cwd: dir, stdio: 'ignore', env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null' } });
  };
  git('init', '-q');
  git('-c', 'user.email=harness@onlook.test', '-c', 'user.name=harness', 'commit', '-q', '--allow-empty', '-m', 'fixture');
  return dir;
}

interface ToolLedger {
  sinks: StudioToolSinks;
  calls: string[];
}

const handlersOf = (ledger: ToolLedger): Set<string> => new Set(ledger.calls.map((call) => call.slice(0, call.indexOf('('))));

interface Live {
  session: AgentBackend;
  events: StudioEvent[];
  connection: AgentConnection;
}

interface HarnessDriver {
  name: HarnessId;
  unavailable(): Promise<string | undefined>;
  open(cwd: string, ledger: ToolLedger, resumeOf?: Live): Promise<Live>;
  replay?(cwd: string, ledger: ToolLedger, path: string): Promise<Live>;
  drain(): unknown[];
}

function sinksFor(events: StudioEvent[], state: { connection: AgentConnection }, respond: () => AgentBackend) {
  return {
    onEvent: (event: StudioEvent) => {
      events.push(event);
      if (event.type === 'permission.requested') {
        const allow = event.options.find((option) => option.kind === 'allow_once') ?? event.options[0];
        if (allow !== undefined) respond().respond(event.requestId, allow.optionId);
      }
    },
    onState: () => undefined,
    onConnection: (next: AgentConnection) => {
      state.connection = next;
    },
  };
}

function claudeDriver(): HarnessDriver {
  const raw: unknown[] = [];
  const ids = new WeakMap<Live, string>();
  async function start(options: Partial<AgentSessionOptions> & Pick<AgentSessionOptions, 'cwd'> & {
    query: NonNullable<AgentSessionOptions['query']>;
  }, ledger: ToolLedger): Promise<Live> {
    const { AgentSession } = await import('../../apps/studio/src/main/agent-host/session.js');
    const { userEnv } = await import('../../apps/studio/src/main/env/shell-env.js');
    const loginEnv = await userEnv();
    const events: StudioEvent[] = [];
    const state = { connection: { status: 'unknown' } as AgentConnection };
    const session: AgentBackend = new AgentSession({
      model: CLAUDE_MODEL,
      ...options,
      query: (params) => options.query({
        ...params,
        options: { ...params.options, env: liveClaudeEnv(claudeConfigDir, loginEnv, params.options?.env) },
      }),
      ...ledger.sinks,
      ...sinksFor(events, state, () => session),
    }) as AgentBackend;
    session.open();
    return {
      session,
      events,
      get connection() {
        return state.connection;
      },
    };
  }
  return {
    name: 'claude',
    async unavailable() {
      const { probeConnection } = await import('../../apps/studio/src/main/agent-host/connection.js');
      const probe = await probeConnection();
      return probe.status === 'ok' ? undefined : `the Claude CLI or its login is not usable here (probe said "${probe.status}")`;
    },
    async open(cwd, ledger, resumeOf) {
      const { recordingQuery } = await import('../../apps/studio/src/main/agent-host/recorded-stream.js');
      const sessionId = resumeOf === undefined ? crypto.randomUUID() : (ids.get(resumeOf) as string);
      const live = await start(
        {
          cwd,
          ...(resumeOf === undefined ? { sessionId } : { resume: sessionId }),
          query: recordingQuery((message) => raw.push(message)),
        },
        ledger,
      );
      ids.set(live, sessionId);
      return live;
    },
    async replay(cwd, ledger, path) {
      const { replayedQuery } = await import('../../apps/studio/src/main/agent-host/replayed-stream.js');
      return start({ cwd, sessionId: crypto.randomUUID(), query: replayedQuery(path) }, ledger);
    },
    drain: () => raw.splice(0),
  };
}

function codexDriver(): HarnessDriver {
  const raw: unknown[] = [];
  return {
    name: 'codex',
    async unavailable() {
      const { codexRoot } = await import('../../apps/studio/src/main/agent-host/appserver/index.js');
      const { probeCodexInstall } = await import('../../apps/studio/src/main/agent-host/codex-connection.js');
      const { CODEX_VERSION } = await import('../../apps/studio/src/main/codex/paths.js');
      if (probeCodexInstall(codexRoot()).status !== 'ok') {
        const { acquireCodex } = await import('../../apps/studio/src/main/codex/acquire.js');
        const acquired = await acquireCodex({ cacheRoot: scratch('codex') });
        if (acquired.outcome !== 'ok') return `codex ${CODEX_VERSION} is not installed and could not be acquired (${JSON.stringify(acquired)})`;
        console.error(`[harness] codex ${CODEX_VERSION} acquired into a scratch root for this run`);
        process.env['STUDIO_CODEX_ROOT'] = acquired.root;
      }
      const home = process.env['CODEX_HOME'] ?? join(homedir(), '.codex');
      if (!existsSync(join(home, 'auth.json'))) return `codex has no subscription login (${join(home, 'auth.json')} is absent)`;
      return undefined;
    },
    async open(cwd, ledger) {
      const { createAppServerSession } = await import('../../apps/studio/src/main/agent-host/appserver/index.js');
      const { AppServerTransport } = await import('../../apps/studio/src/main/agent-host/appserver/transport.js');
      const events: StudioEvent[] = [];
      const state = { connection: { status: 'unknown' } as AgentConnection };
      const session: AgentBackend = createAppServerSession({
        cwd,
        model: CODEX_MODEL,
        tools: ledger.sinks,
        connect: async (handlers, spawn) =>
          new AppServerTransport(await spawn(), {
            ...handlers,
            onFrame: (line, frame, kind) => {
              raw.push(frame);
              handlers.onFrame?.(line, frame, kind);
            },
          }),
        ...sinksFor(events, state, () => session),
      });
      session.open();
      return {
        session,
        events,
        get connection() {
          return state.connection;
        },
      };
    },
    drain: () => raw.splice(0),
  };
}

async function until<T>(read: () => T | undefined, what: string, ms = TURN_MS): Promise<T> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const value = read();
    if (value !== undefined) return value;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`timed out after ${String(ms)}ms waiting for ${what}`);
}

async function turn(live: Live, prompt: string, ms = TURN_MS): Promise<StudioEvent[]> {
  const from = live.events.length;
  assert.ok(live.session.prompt(prompt), 'the session refused the prompt');
  await until(
    () => live.events.slice(from).find((e) => e.type === 'turn.ended' || e.type === 'session.error'),
    'the turn to end',
    ms,
  );
  const events = live.events.slice(from);
  const failure = events.find((event) => event.type === 'session.error');
  assert.equal(failure, undefined, failure?.type === 'session.error' ? failure.message : undefined);
  return events;
}

interface Outcome {
  tools?: StudioEvent[];
  toolsHandlers?: string[];
  interrupt?: { events: StudioEvent[]; interruptedAfterMs: number; endedAfterMs: number };
  resume?: StudioEvent[];
  registered?: string[];
  expected: string[];
  ledger: ToolLedger;
  cwd: string;
  recordings: Partial<Record<Scenario, unknown[]>>;
  failure?: Error;
}

async function exercise(driver: HarnessDriver): Promise<Outcome> {
  const { studioToolDefinitions } = await import('../../apps/studio/src/main/agent-host/studio-tools.js');
  const ledger = recordingSinks();
  const expected = studioToolDefinitions(ledger.sinks).map((definition) => definition.name);
  const prompt = toolsPrompt(expected);
  const cwd = scratchRepo();
  const outcome: Outcome = { expected, ledger, cwd, recordings: {} };
  let first: Live | undefined;
  let second: Live | undefined;
  try {
    first = await driver.open(cwd, ledger);
    outcome.tools = await turn(first, prompt);
    outcome.toolsHandlers = [...ledger.calls];
    outcome.recordings.tools = driver.drain();

    const from = first.events.length;
    const asked = Date.now();
    assert.ok(first.session.prompt('Write the whole numbers from 1 to 400, one per line, and nothing else.'));
    await until(() => first?.events.slice(from).find((e) => e.type === 'text.delta'), 'a streamed text delta to interrupt', 60_000);
    const interruptedAfterMs = Date.now() - asked;
    const stopped = Date.now();
    await first.session.interrupt();
    await until(
      () => first?.events.slice(from).find((e) => e.type === 'turn.ended' || e.type === 'session.error'),
      'the interrupted turn to end',
      30_000,
    );
    outcome.interrupt = { events: first.events.slice(from), interruptedAfterMs, endedAfterMs: Date.now() - stopped };
    await first.session.close();
    outcome.recordings.interrupt = driver.drain();

    second = await driver.open(cwd, ledger, first);
    outcome.resume = await turn(second, 'What was the codeword I gave you? Reply with only the codeword.');
    await second.session.close();
    outcome.recordings.resume = driver.drain();
  } catch (error) {
    outcome.failure = error as Error;
    await first?.session.close().catch(() => undefined);
    await second?.session.close().catch(() => undefined);
  }
  const init = (outcome.recordings.tools ?? []).find(
    (m) => (m as { type?: string; subtype?: string }).type === 'system' && (m as { subtype?: string }).subtype === 'init',
  ) as { tools?: string[] } | undefined;
  if (init?.tools !== undefined) outcome.registered = init.tools;
  return outcome;
}

interface Replayed {
  events: StudioEvent[];
  ledger: ToolLedger;
  failure?: Error;
}

async function replayTools(replay: NonNullable<HarnessDriver['replay']>, run: Outcome, path: string): Promise<Replayed> {
  const ledger = recordingSinks();
  let opened: Live | undefined;
  try {
    opened = await replay(run.cwd, ledger, path);
    return { events: await turn(opened, toolsPrompt(run.expected), 30_000), ledger };
  } catch (error) {
    return { events: opened?.events ?? [], ledger, failure: error as Error };
  } finally {
    await opened?.session.close().catch(() => undefined);
  }
}

function spoken(events: readonly StudioEvent[]): string {
  return foldSessionState(events)
    .items.flatMap((item) => (item.kind === 'assistant-text' ? [item.text] : []))
    .join('');
}

interface Spend {
  input: number;
  cachedInput: number;
  output: number;
  costUsd?: number;
  ms: number;
}

/** Read from the raw stream: each harness's own count, not Studio's reduction of it. */
function spendOf(harness: HarnessId, recordings: Partial<Record<Scenario, unknown[]>>, ms: number): Spend {
  const messages = Object.values(recordings).flat() as Record<string, any>[];
  if (harness === 'claude') {
    const results = messages.filter((m) => m['type'] === 'result');
    const sum = (read: (u: Record<string, number>) => number) =>
      results.reduce((n, r) => n + read((r['usage'] ?? {}) as Record<string, number>), 0);
    return {
      input: sum((u) => (u['input_tokens'] ?? 0) + (u['cache_creation_input_tokens'] ?? 0) + (u['cache_read_input_tokens'] ?? 0)),
      cachedInput: sum((u) => u['cache_read_input_tokens'] ?? 0),
      output: sum((u) => u['output_tokens'] ?? 0),
      costUsd: Math.max(0, ...results.map((r) => Number(r['total_cost_usd'] ?? 0))),
      ms,
    };
  }
  const totals = messages
    .filter((m) => m['method'] === 'thread/tokenUsage/updated')
    .map((m) => (m['params']?.['tokenUsage']?.['total'] ?? {}) as Record<string, number>);
  const last = totals.reduce<Record<string, number>>((a, b) => ((b['totalTokens'] ?? 0) > (a['totalTokens'] ?? 0) ? b : a), {});
  return { input: last['inputTokens'] ?? 0, cachedInput: last['cachedInputTokens'] ?? 0, output: last['outputTokens'] ?? 0, ms };
}

const spent: Record<string, Spend> = {};

for (const driver of [claudeDriver(), codexDriver()]) {
  describe(`the ${driver.name} harness`, () => {
    let skip: string | undefined;
    let run: Outcome;
    let written: string[] = [];
    let replayed: Replayed | undefined;
    const toolsRecording = join(RECORDINGS, driver.name, 'tools.jsonl');

    before(async () => {
      skip = await driver.unavailable();
      if (skip !== undefined) {
        console.error(`\n⚠️  ${driver.name} harness check SKIPPED — ${skip}. NOTHING RAN for ${driver.name}.\n`);
        return;
      }
      const started = Date.now();
      run = await exercise(driver);
      spent[driver.name] = spendOf(driver.name, run.recordings, Date.now() - started);
      written = writeRecordings(RECORDINGS, driver.name, run.recordings as Record<string, unknown[]>);
      if (driver.replay !== undefined && run.tools !== undefined) replayed = await replayTools(driver.replay, run, toolsRecording);
    });

    it('runs every scenario to its end', (t) => {
      if (skip !== undefined) return t.skip(skip);
      if (run.failure !== undefined) throw run.failure;
    });

    it('writes recordings that carry nothing of this machine', (t) => {
      if (skip !== undefined) return t.skip(skip);
      const found = written.flatMap((path) => leaks(readFileSync(path, 'utf8')).map((what) => `${path}: ${what}`));
      assert.deepEqual(found, [], `a recording carries ${found.join('; ')}`);
    });

    it('calls every tool Studio registers, and each answer reaches the event log', (t) => {
      if (skip !== undefined) return t.skip(skip);
      const events = run.tools ?? [];
      const unanswered = run.expected.filter((name) => {
        const started = events.filter(
          (e): e is Extract<StudioEvent, { type: 'tool.start' }> =>
            e.type === 'tool.start' && (e.name === name || e.name.endsWith(`__${name}`)),
        );
        return !started.some((s) => events.some((e) => e.type === 'tool.end' && e.toolCallId === s.toolCallId));
      });
      assert.deepEqual(unanswered, [], `tools never called or never answered: ${unanswered.join(', ')}`);
      const reached = handlersOf(run.ledger);
      assert.deepEqual([...reached].sort(), [...run.expected].sort(), 'the reached sinks do not match every registered tool');
    });

    it('registers every Studio tool with the harness, as the harness reports it', (t) => {
      if (skip !== undefined) return t.skip(skip);
      if (run.registered === undefined) return t.skip(`${driver.name} reports no registered tool list; the call check above stands in`);
      const missing = run.expected.filter((name) => !run.registered?.some((r) => r.endsWith(`__${name}`)));
      assert.deepEqual(missing, [], `registered nowhere in the harness's own list: ${missing.join(', ')}`);
    });

    it('replays the fresh tools recording through Studio to the same handlers and the same event log', (t) => {
      if (skip !== undefined) return t.skip(skip);
      if (driver.replay === undefined) return t.skip(`${driver.name} replay is not built; nothing replayed`);
      assert.ok(run.tools !== undefined && run.toolsHandlers !== undefined && replayed !== undefined, 'the live tools turn never ran, so nothing was replayed');
      const diverged = [
        ...(replayed.failure === undefined ? [] : [`the replayed turn never ended: ${replayed.failure.message}`]),
        ...divergence({ events: run.tools, handlers: run.toolsHandlers }, { events: replayed.events, handlers: replayed.ledger.calls }),
      ];
      assert.deepEqual(diverged, [], `replaying ${toolsRecording} parted from the live turn:\n  ${diverged.join('\n  ')}`);
    });

    it('round-trips a permission request for a tool that asks', (t) => {
      if (skip !== undefined) return t.skip(skip);
      const events = run.tools ?? [];
      const requested = events.filter((e) => e.type === 'permission.requested');
      assert.ok(requested.length > 0, 'no permission was requested, though undo_canvas and redo_canvas ask');
      for (const request of requested) {
        if (request.type !== 'permission.requested') continue;
        assert.ok(
          events.some((e) => e.type === 'permission.resolved' && e.requestId === request.requestId),
          `permission ${request.toolName} was never resolved`,
        );
        const end = events.find((e) => e.type === 'tool.end' && e.toolCallId === request.toolCallId);
        assert.ok(end?.type === 'tool.end' && end.status !== 'denied', `${request.toolName} ran as ${String(end?.type === 'tool.end' ? end.status : 'unanswered')} after an allow`);
      }
    });

    it('streams text as deltas, and the chat shows what streamed', (t) => {
      if (skip !== undefined) return t.skip(skip);
      const events = run.resume ?? [];
      const types = events.map((e) => e.type).join(' ');
      const deltas = events.flatMap((e) => (e.type === 'text.delta' ? [e.delta] : []));
      assert.ok(deltas.length > 0, `the resumed turn streamed no text delta. Events: ${types}`);
      assert.equal(spoken(events), deltas.join(''), `the projected chat text differs from what streamed. Events: ${types}`);
    });

    it('stops a streaming turn on interrupt', (t) => {
      if (skip !== undefined) return t.skip(skip);
      const interrupt = run.interrupt;
      assert.ok(interrupt !== undefined, 'the interrupt scenario never ran');
      const text = interrupt.events.flatMap((e) => (e.type === 'text.delta' ? [e.delta] : [])).join('');
      assert.doesNotMatch(text, /\b400\b/, 'the turn ran to the end despite the interrupt');
      assert.ok(interrupt.events.some((e) => e.type === 'turn.ended'), 'the interrupted turn never ended');
      assert.ok(!interrupt.events.some((e) => e.type === 'session.error'), 'the interrupt errored the session');
    });

    it('resumes the session and recalls what the first turn established', (t) => {
      if (skip !== undefined) return t.skip(skip);
      const text = spoken(run.resume ?? []);
      assert.match(text, new RegExp(CODEWORD), `the resumed session did not recall the codeword. Said: ${text}`);
    });
  });
}

after(() => {
  for (const [name, s] of Object.entries(spent)) {
    console.error(
      `[harness] ${name}: ${String(s.input)} input (${String(s.cachedInput)} cached), ${String(s.output)} output` +
        `${s.costUsd === undefined ? '' : `, $${s.costUsd.toFixed(4)} by the SDK's own count`}, ${(s.ms / 1000).toFixed(1)}s`,
    );
  }
});
