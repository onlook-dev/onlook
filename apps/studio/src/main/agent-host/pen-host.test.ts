import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import type { Query, SDKUserMessage, query } from '@anthropic-ai/claude-agent-sdk';
import {
  CLAUDE_LOGIN_COMMAND,
  foldSessionState,
  PROJECT_SETUP_REPAIR_PROMPT,
  type AgentStateEvent,
  type ElementEvidence,
  type StudioEvent,
  type TabStatus,
} from '@studio/events';
import { agentTabStatus } from '../tabs/status.js';
import {
  cleanupTempFixtures,
  makeStateRoot,
  makeWorkspaceRoot,
  restoreWorkspaceRoot,
} from '@studio/fixtures';
import { views } from '../tabs/views.js';
import {
  initTelemetry,
  peekQueueForTesting,
  workspaceTelemetryId,
  resetTelemetryForTesting,
  setAppForTesting,
} from '../telemetry/index.js';
import { forgetProject, rememberProject, renameProject, resetWorkspaceCache } from '../workspace/store.js';
import {
  readComposerDraft,
  resetComposerDraftsCache,
  writeComposerDraft,
} from '../drafts/state.js';
import { gcSweep, readImage, registerImage, resetImagesStore } from '../images/store.js';
import { DURING_SETUP_CONTEXT } from '../../instructions/start.js';
import type { BackendState } from './backend.js';
import { AgentHost } from './index.js';
import { AgentSession } from './session.js';
import { SessionMap } from './session-map.js';
import { resetSessionsCache } from './sessions.js';
import { resetTranscriptCache } from './transcript.js';
import { AppServerSession, type SessionTransport } from './appserver/session.js';
import type { TransportHandlers } from './appserver/transport.js';

const savedStateRoot = process.env['STUDIO_STATE_ROOT'];
let scratch: string;
let codexRoot: string;

beforeAll(() => {
  scratch = mkdtempSync(join(tmpdir(), 'pen-host-'));
  codexRoot = join(scratch, 'codex');
  mkdirSync(codexRoot, { recursive: true });
  for (const name of ['codex', 'codex-code-mode-host']) {
    const path = join(codexRoot, name);
    writeFileSync(path, '#!/bin/sh\nexit 1\n');
    chmodSync(path, 0o755);
  }
});

afterAll(() => {
  if (savedStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = savedStateRoot;
  restoreWorkspaceRoot();
  resetSessionsCache();
  resetTranscriptCache();
  resetImagesStore();
  rmSync(scratch, { recursive: true, force: true });
  cleanupTempFixtures();
});

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
});

function registerWorkspace(name: string): string {
  const root = makeWorkspaceRoot({ name: `pen-host-${name}` });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: `pen-host-${name}` });
  resetWorkspaceCache();
  resetSessionsCache();
  resetTranscriptCache();
  resetComposerDraftsCache();
  const workspacePath = join(root, name, 'main');
  mkdirSync(workspacePath, { recursive: true });
  rememberProject({
    workspacePath,
    workspaceName: name,
    branchName: `test/${name}`,
    baseBranch: 'main',
    sourceRepoName: `${name}-source`,
    sourcePath: join(root, `${name}-source`),
    sourceRepoRoot: join(root, `${name}-source`),
    repoIdentity: `pen-host-${name}`,
    copiedEnvFiles: [],
  });
  // Named up front, or the first prompt carries the rename instruction as context (ONL-2181).
  renameProject(workspacePath, 'Mine', 'user');
  return workspacePath;
}

const ofType = <T extends StudioEvent['type']>(
  events: StudioEvent[],
  type: T,
): Extract<StudioEvent, { type: T }>[] =>
  events.filter((e): e is Extract<StudioEvent, { type: T }> => e.type === type);

async function drain(): Promise<void> {
  for (let i = 0; i < 6; i++) await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

let nextViewId = 9_700;

function openView(cwd: string): { states: AgentStateEvent[] } {
  const id = nextViewId++;
  const states: AgentStateEvent[] = [];
  views.register(id, cwd, {
    send: (channel, payload) => {
      if (channel === 'agent:state') states.push(payload as AgentStateEvent);
    },
  });
  cleanups.push(async () => {
    views.unregister(id);
  });
  return { states };
}

async function until(check: () => boolean): Promise<void> {
  for (let i = 0; i < 100 && !check(); i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
  }
  if (!check()) throw new Error('condition never held');
}

// ---- the Claude harness ----------------------------------------------------

type CanUseTool = (
  name: string,
  input: Record<string, unknown>,
  opts: { signal: AbortSignal; toolUseID: string; requestId: string },
) => Promise<unknown>;

function fakeSdk() {
  const feed: unknown[] = [];
  const sent: SDKUserMessage[] = [];
  let wake: (() => void) | undefined;
  let done = false;
  let failure: string | undefined;
  let interrupts = 0;

  let canUseTool: CanUseTool | undefined;
  const queryFn = ((args: { prompt: AsyncIterable<SDKUserMessage>; options?: { canUseTool?: CanUseTool } }) => {
    canUseTool = args.options?.canUseTool;
    void (async () => {
      for await (const message of args.prompt) sent.push(message);
    })();
    return {
      async *[Symbol.asyncIterator](): AsyncGenerator<unknown> {
        while (!done) {
          if (failure !== undefined) throw new Error(failure);
          const next = feed.shift();
          if (next === undefined) {
            await new Promise<void>((resolve) => {
              wake = resolve;
            });
            continue;
          }
          yield next;
        }
      },
      interrupt: async (): Promise<void> => {
        interrupts += 1;
      },
      setModel: async (): Promise<void> => undefined,
      setPermissionMode: async (): Promise<void> => undefined,
      applyFlagSettings: async (): Promise<void> => undefined,
      supportedModels: async (): Promise<never[]> => [],
      setMcpPermissionModeOverride: async (): Promise<void> => undefined,
    } as unknown as Query;
  }) as unknown as typeof query;

  return {
    queryFn,
    push(...messages: unknown[]): void {
      feed.push(...messages);
      wake?.();
      wake = undefined;
    },
    fail(message: string): void {
      failure = message;
      wake?.();
      wake = undefined;
    },
    end(): void {
      done = true;
      wake?.();
    },
    get interrupts(): number {
      return interrupts;
    },
    reached: (): string[] => sent.map((m) => String(m.message.content)),
    /** Parks a question the way the CLI does, and settles with what Studio answered it. */
    ask(input: Record<string, unknown>): Promise<unknown> {
      if (canUseTool === undefined) throw new Error('the session never handed over canUseTool');
      const answered = canUseTool('AskUserQuestion', input, {
        signal: new AbortController().signal,
        toolUseID: 'tu-ask',
        requestId: 'req-ask',
      });
      answered.catch(() => undefined);
      return answered;
    },
  };
}

const streamEvent = (event: Record<string, unknown>): unknown => ({
  type: 'stream_event',
  event,
  parent_tool_use_id: null,
  session_id: 'sdk-1',
  uuid: 'u',
});
const MESSAGE_START = (): unknown =>
  streamEvent({ type: 'message_start', message: { role: 'assistant', content: [] } });
const TEXT_START = (): unknown =>
  streamEvent({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } });
const TEXT_DELTA = (text: string): unknown =>
  streamEvent({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } });
const INIT = { type: 'system', subtype: 'init', session_id: 'sdk-1', model: 'opus', tools: [] };
const RESULT_OK = { type: 'result', subtype: 'success', duration_ms: 10 };
const RESULT_ABORTED = {
  type: 'result',
  subtype: 'error_during_execution',
  is_error: true,
  terminal_reason: 'aborted_streaming',
};

async function claudeHost(name: string, refuseSteering = true) {
  const cwd = registerWorkspace(name);
  const sdk = fakeSdk();
  const events: StudioEvent[] = [];
  const host = new AgentHost(
    false,
    new SessionMap(),
    (c, _harness, _tools, onEvent, _onConnection, onState) => {
      const session = new AgentSession({
        cwd: c,
        sessionId: `sid-${name}`,
        query: sdk.queryFn,
        onEvent: (event) => {
          events.push(event);
          onEvent(event);
        },
        onState,
        onConnection: () => undefined,
      });
      if (refuseSteering) Object.defineProperty(session, 'midTurn', { value: 'refuse' });
      return session;
    },
  );
  cleanups.push(async () => {
    await host.dispose();
    sdk.end();
  });
  await host.command({ type: 'session.start', cwd }, cwd);
  return { host, cwd, sdk, events };
}

/** A Claude turn streaming assistant text, with `second` waiting in the pen. */
async function loaded(name: string) {
  const made = await claudeHost(name);
  expect(await made.host.command({ type: 'prompt', text: 'first' }, made.cwd)).toEqual({
    accepted: true,
  });
  made.sdk.push(MESSAGE_START(), TEXT_START(), TEXT_DELTA('working on it'));
  await drain();
  const acceptance = await made.host.command({ type: 'prompt', text: 'second' }, made.cwd);
  return { ...made, acceptance };
}

// ---- the codex harness -----------------------------------------------------

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (error: Error) => void } {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function fakeWire(answer: (method: string, params: unknown) => unknown) {
  const sent: { method: string; params: unknown }[] = [];
  const answered: { id: string | number; result: unknown }[] = [];
  let handlers: TransportHandlers | undefined;
  let dead = false;
  const transport: SessionTransport = {
    request: (method, params) => {
      sent.push({ method, params });
      // Faithful to `AppServerTransport`: a dead child refuses, it does not answer (ONL-3104).
      if (dead) return Promise.reject(new Error(`cannot send ${method}: app-server has exited`));
      return Promise.resolve().then(() => answer(method, params));
    },
    notify: () => undefined,
    respond: (id, result) => {
      answered.push({ id, result });
    },
    respondError: () => undefined,
    close: () => Promise.resolve(),
  };
  return {
    connect: (given: TransportHandlers): SessionTransport => {
      handlers = given;
      return transport;
    },
    sent,
    answered,
    starts: (): { method: string; params: unknown }[] => sent.filter((s) => s.method === 'turn/start'),
    ask(method: string, id: string | number, params: unknown): void {
      handlers?.onServerRequest?.(method, id, params);
    },
    frame(frame: { method: string; params?: unknown }): void {
      handlers?.onFrame?.(JSON.stringify(frame), frame, 'notification');
    },
    exit(): void {
      dead = true;
      handlers?.onExit?.(1, null);
    },
  };
}

async function codexHost(
  name: string,
  answer: (method: string, params: unknown) => unknown = () => ({}),
  refuseSteering = true,
) {
  const cwd = registerWorkspace(name);
  const wire = fakeWire((method, params) => {
    switch (method) {
      case 'model/list':
        return { data: [] };
      case 'thread/start':
        return { thread: { id: 'thread-1' }, model: 'gpt-5.5' };
      case 'turn/start':
        return answer(method, params) ?? { turn: { id: 'turn-1' } };
      default:
        return answer(method, params) ?? {};
    }
  });
  const events: StudioEvent[] = [];
  // One list: an ordering claim about what the renderer saw cannot be read off two.
  const timeline: ({ event: StudioEvent } | { state: BackendState })[] = [];
  let session: AppServerSession | undefined;
  const host = new AgentHost(
    false,
    new SessionMap(),
    (c, _harness, tools, onEvent, onConnection, onState) => {
      session = new AppServerSession({
        cwd: c,
        codexRoot,
        captureRoot: mkdtempSync(join(scratch, 'capture-')),
        connect: wire.connect,
        tools,
        onEvent: (event) => {
          events.push(event);
          timeline.push({ event });
          onEvent(event);
        },
        onState: (state) => {
          timeline.push({ state });
          onState(state);
        },
        onConnection,
      });
      if (refuseSteering) Object.defineProperty(session, 'midTurn', { value: 'refuse' });
      return session;
    },
  );
  cleanups.push(() => host.dispose());
  await host.command({ type: 'session.start', cwd }, cwd);
  await until(() => wire.sent.some((s) => s.method === 'thread/start'));
  const live = session;
  if (live === undefined) throw new Error('the backend seam was never reached');
  return { host, cwd, wire, events, timeline, session: live };
}

describe('follow-ups steer the current turn by default (ONL-2623)', () => {
  it('Claude receives a follow-up immediately without starting another turn or holding a pen', async () => {
    const { host, cwd, sdk, events } = await claudeHost('claude-steer-default', false);
    await host.command({ type: 'prompt', text: 'first' }, cwd);
    sdk.push(MESSAGE_START(), TEXT_START(), TEXT_DELTA('working'));
    await drain();

    expect(await host.command({ type: 'prompt', text: 'make it blue' }, cwd)).toEqual({ accepted: true });
    await drain();

    expect(sdk.reached()).toEqual(['first', 'make it blue']);
    expect(host.pen(cwd)).toBeNull();
    expect(ofType(events, 'turn.started')).toHaveLength(1);
    expect(ofType(events, 'message.user').at(-1)).toMatchObject({ text: 'make it blue', delivery: 'steering' });
    expect(sdk.interrupts).toBe(0);
  });

  it('Codex sends turn/steer during the active turn without starting another turn or holding a pen', async () => {
    const { host, cwd, wire, events } = await codexHost('codex-steer-default', () => ({}), false);
    await host.command({ type: 'prompt', text: 'first' }, cwd);
    await drain();
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    await drain();

    expect(await host.command({ type: 'prompt', text: 'make it blue' }, cwd)).toEqual({ accepted: true });
    await drain();

    expect(host.pen(cwd)).toBeNull();
    expect(wire.starts()).toHaveLength(1);
    expect(wire.sent.filter((request) => request.method === 'turn/steer')).toMatchObject([
      { params: { expectedTurnId: 'turn-1', input: [{ type: 'text', text: 'make it blue' }] } },
    ]);
    expect(ofType(events, 'message.user').at(-1)).toMatchObject({ text: 'make it blue', delivery: 'steering' });
  });

  it('holds a follow-up after Stop until the stopped Claude turn has ended', async () => {
    const { host, cwd, sdk, events } = await claudeHost('claude-steer-after-stop', false);
    await host.command({ type: 'prompt', text: 'first' }, cwd);
    sdk.push(MESSAGE_START(), TEXT_START(), TEXT_DELTA('working'));
    await drain();
    await host.command({ type: 'interrupt' }, cwd);

    expect(await host.command({ type: 'prompt', text: 'make it blue' }, cwd)).toEqual({ accepted: true, held: true });
    sdk.push(RESULT_ABORTED, MESSAGE_START());
    await drain();

    expect(sdk.reached()).toEqual(['first']);
    expect(host.pen(cwd)?.text).toBe('make it blue');
    expect(ofType(events, 'turn.started')).toHaveLength(1);
    expect(sdk.interrupts).toBeGreaterThan(1);
  });

  it('holds a Codex follow-up while Stop is in flight and until the stopped turn ends', async () => {
    const stopAck = deferred<unknown>();
    const { host, cwd, wire, session } = await codexHost(
      'codex-steer-after-stop',
      (method) => method === 'turn/interrupt' ? stopAck.promise : {},
      false,
    );
    await host.command({ type: 'prompt', text: 'first' }, cwd);
    await drain();
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    await drain();
    const stopped = host.command({ type: 'interrupt' }, cwd);
    await drain();

    expect(await host.command({ type: 'prompt', text: 'make it blue' }, cwd)).toEqual({ accepted: true, held: true });
    stopAck.resolve({});
    await stopped;
    expect(await host.command({ type: 'prompt', text: 'and round the corners' }, cwd)).toEqual({ accepted: true, held: true });

    expect(session.isStreaming).toBe(true);
    expect(session.midTurn).toBe('refuse');
    expect(wire.sent.filter((request) => request.method === 'turn/steer')).toHaveLength(0);
    expect(wire.starts()).toHaveLength(1);
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'interrupted' } } });
    await drain();
    expect(host.pen(cwd)).toMatchObject({ text: 'make it blue\n\nand round the corners', verdict: 'hold' });
    expect(wire.starts()).toHaveLength(1);

    await host.command({ type: 'prompt', text: 'now continue' }, cwd);
    await drain();
    expect(session.midTurn).toBe('steer');
    expect(host.pen(cwd)).toBeNull();
    expect(wire.starts()).toHaveLength(2);
    expect(wire.starts().at(-1)).toMatchObject({ params: { input: [{ type: 'text', text: 'make it blue\n\nand round the corners\n\nnow continue' }] } });
  });
});

describe('a message sent while setup runs joins it, framed for the agent (ONL-2961)', () => {
  it('Claude: steers the setup turn at once, carrying the during-setup framing the chat never shows', async () => {
    const { host, cwd, sdk, events } = await claudeHost('claude-setup-steer', false);
    await host.studioPrompt(cwd, 'start the app');
    sdk.push(MESSAGE_START(), TEXT_START(), TEXT_DELTA('installing'));
    await drain();

    expect(await host.command({ type: 'prompt', text: 'make it blue' }, cwd)).toEqual({ accepted: true });
    await drain();

    expect(host.pen(cwd)).toBeNull();
    expect(ofType(events, 'turn.started')).toHaveLength(1);
    expect(sdk.reached().at(-1)).toBe(`make it blue\n\n${DURING_SETUP_CONTEXT}`);
    expect(ofType(events, 'message.user').at(-1)).toMatchObject({ text: 'make it blue', turnId: 't1', context: DURING_SETUP_CONTEXT });
  });

  it('Claude: frames nothing in a turn the person opened, or in the repair ask', async () => {
    const opened = await claudeHost('claude-user-steer', false);
    await opened.host.command({ type: 'prompt', text: 'first' }, opened.cwd);
    opened.sdk.push(MESSAGE_START());
    await drain();
    await opened.host.command({ type: 'prompt', text: 'make it blue' }, opened.cwd);
    await drain();
    expect(opened.sdk.reached().at(-1)).toBe('make it blue');

    const repair = await claudeHost('claude-repair-steer', false);
    await repair.host.studioPrompt(repair.cwd, PROJECT_SETUP_REPAIR_PROMPT);
    repair.sdk.push(MESSAGE_START());
    await drain();
    await repair.host.command({ type: 'prompt', text: 'use port 4000' }, repair.cwd);
    await drain();
    expect(repair.sdk.reached().at(-1)).toBe('use port 4000');
  });

  it('Claude: frames nothing once the setup turn has ended', async () => {
    const { host, cwd, sdk } = await claudeHost('claude-setup-over', false);
    await host.studioPrompt(cwd, 'start the app');
    sdk.push(MESSAGE_START(), RESULT_OK);
    await drain();

    await host.command({ type: 'prompt', text: 'make it blue' }, cwd);
    await drain();
    expect(sdk.reached().at(-1)).toBe('make it blue');
  });

  it('codex: steers the setup turn with the framing in the same input', async () => {
    const { host, cwd, wire } = await codexHost('codex-setup-steer', () => ({}), false);
    await host.studioPrompt(cwd, 'start the app');
    await until(() => wire.starts().length === 1);
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    await drain();

    expect(await host.command({ type: 'prompt', text: 'make it blue' }, cwd)).toEqual({ accepted: true });
    await drain();

    const steer = wire.sent.filter((request) => request.method === 'turn/steer');
    expect(steer).toHaveLength(1);
    expect(JSON.stringify(steer[0]?.params)).toContain(DURING_SETUP_CONTEXT.slice(0, 40));
    expect(host.pen(cwd)).toBeNull();
  });
});

describe('a non-steerable prompt waits in main (ONL-2294)', () => {
  it('a Stop with a loaded pen starts no turn, keeps the prompt, and never folds the stopped work into a later turn', async () => {
    const { host, cwd, sdk, events, acceptance } = await loaded('claude-stop');
    expect(acceptance).toEqual({ accepted: true, held: true });

    await host.command({ type: 'interrupt' }, cwd);
    sdk.push(RESULT_ABORTED);
    await drain();

    expect(sdk.reached()).toEqual(['first']);
    expect(ofType(events, 'message.user').map((u) => u.text)).toEqual(['first']);
    expect(host.pen(cwd)?.text).toBe('second');
    expect(host.pen(cwd)?.verdict).toBe('hold');

    // The CLI restarts its queued message a beat after the aborted result (ONL-2180).
    sdk.push(INIT, MESSAGE_START(), TEXT_START(), TEXT_DELTA('carrying on'));
    await drain();

    // The stragglers are the stopped turn's own tail; there is no later turn to carry them.
    const ended = events.findIndex((event) => event.type === 'turn.ended');
    expect(ended).toBeGreaterThan(-1);
    const after = events.slice(ended + 1).map((event) => event.type);
    expect(after.filter((type) => type === 'turn.started' || type === 'message.user')).toEqual([]);
    expect(ofType(events, 'message.user').map((u) => [u.text, u.turnId])).toEqual([['first', 't1']]);
    expect(host.pen(cwd)?.text).toBe('second');
    expect(host.pen(cwd)?.verdict).toBe('hold');
    expect(sdk.reached()).toEqual(['first']);
  });

  it('reaches no backend and writes no row while the turn is live', async () => {
    const { host, cwd, sdk, events, acceptance } = await loaded('claude-live');

    expect(acceptance).toEqual({ accepted: true, held: true });
    expect(sdk.reached()).toEqual(['first']);
    expect(ofType(events, 'message.user').map((u) => u.text)).toEqual(['first']);
    expect(ofType(events, 'turn.started')).toHaveLength(1);
    expect(host.pen(cwd)?.text).toBe('second');
  });

  it('goes as the next turn when the running turn completes cleanly, with nothing to mark it apart', async () => {
    const { host, cwd, sdk, events } = await loaded('claude-clean');

    sdk.push(RESULT_OK);
    await drain();

    expect(sdk.reached()).toEqual(['first', 'second']);
    expect(ofType(events, 'turn.started').map((t) => t.turnId)).toEqual(['t1', 't2']);
    const [, second] = ofType(events, 'message.user');
    expect([second?.text, second?.turnId, second?.delivery, second?.origin]).toEqual([
      'second',
      't2',
      undefined,
      'user',
    ]);
    expect(host.pen(cwd)).toBeNull();
  });

  it('keeps the prompt, with a verdict, when the turn dies in the pump', async () => {
    const { host, cwd, sdk, events } = await loaded('claude-failed');

    sdk.fail('Claude Code process exited with code 1');
    await drain();

    expect(ofType(events, 'session.error')).toHaveLength(1);
    expect(sdk.reached()).toEqual(['first']);
    expect(ofType(events, 'turn.started')).toHaveLength(1);
    expect(host.pen(cwd)?.text).toBe('second');
    expect(host.pen(cwd)?.verdict).toBe('hold');
  });

  it('holds a prompt sent after a Stop, while streaming is down but the turn is still open', async () => {
    const { host, cwd, sdk, events } = await claudeHost('claude-after-stop');
    await host.command({ type: 'prompt', text: 'first' }, cwd);
    sdk.push(MESSAGE_START());
    await drain();
    await host.command({ type: 'interrupt' }, cwd);

    expect(await host.command({ type: 'prompt', text: 'second' }, cwd)).toEqual({
      accepted: true,
      held: true,
    });
    expect(sdk.reached()).toEqual(['first']);
    expect(ofType(events, 'message.user').map((u) => u.text)).toEqual(['first']);
    expect(host.pen(cwd)?.text).toBe('second');
  });

  it('holds a send that carries only attachments, and keeps them for the release', async () => {
    const image = { id: 'img-1', mediaType: 'image/png' as const };
    const { host, cwd, sdk, events } = await claudeHost('claude-attachments');
    await host.command({ type: 'prompt', text: 'first' }, cwd);
    sdk.push(MESSAGE_START());
    await drain();

    expect(await host.command({ type: 'prompt', text: '', attachments: [image] }, cwd)).toEqual({
      accepted: true,
      held: true,
    });
    expect(host.pen(cwd)?.attachments).toEqual([image]);

    sdk.push(RESULT_OK);
    await drain();

    const [, released] = ofType(events, 'message.user');
    expect([released?.text, released?.attachments]).toEqual(['', [image]]);
  });

  it("keeps a waiting prompt's image readable through a sweep, and lets a discard collect it", async () => {
    const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 1, 2, 3, 4]);
    const { host, cwd, sdk } = await claudeHost('claude-gc');
    await host.command({ type: 'prompt', text: 'first' }, cwd);
    sdk.push(MESSAGE_START());
    await drain();

    const registered = registerImage(cwd, PNG);
    if (!registered.ok) throw new Error('the fixture image was refused');
    const { id } = registered.image;
    await host.command({ type: 'prompt', text: 'second', attachments: [registered.image] }, cwd);
    expect(host.pen(cwd)?.attachments).toEqual([registered.image]);

    gcSweep();
    expect(readImage(id)).not.toBeNull();

    const penId = host.pen(cwd)?.penId;
    expect(penId).toBeDefined();
    if (penId === undefined) throw new Error('nothing was held');
    host.penAction(cwd, { type: 'discard', penId });
    gcSweep();
    expect(readImage(id)).toBeNull();
  });

  it('a Studio prompt mid-turn steers and never joins the pen', async () => {
    const { host, cwd, sdk, events } = await claudeHost('claude-studio');
    await host.command({ type: 'prompt', text: 'first' }, cwd);
    sdk.push(MESSAGE_START());
    await drain();

    expect(await host.studioPrompt(cwd, 'start the app')).toBe(true);
    await drain();

    expect(sdk.reached()).toEqual(['first', 'start the app']);
    expect(host.pen(cwd)).toBeNull();
    expect(ofType(events, 'turn.started')).toHaveLength(1);
    expect(ofType(events, 'message.user').map((u) => [u.text, u.origin])).toEqual([
      ['first', 'user'],
      ['start the app', 'studio'],
    ]);
  });
});

describe('the same pen above codex (ONL-2294)', () => {
  async function loadedCodex(name: string) {
    const made = await codexHost(name);
    await made.host.command({ type: 'prompt', text: 'first' }, made.cwd);
    await until(() => made.wire.starts().length === 1);
    made.wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    const acceptance = await made.host.command({ type: 'prompt', text: 'second' }, made.cwd);
    return { ...made, acceptance };
  }

  const completed = (status: string): { method: string; params: unknown } => ({
    method: 'turn/completed',
    params: { turn: { id: 'turn-1', status } },
  });

  it('reaches no backend while a non-steerable turn is live', async () => {
    const { host, cwd, wire, events, session, acceptance } = await loadedCodex('codex-live');

    expect(acceptance).toEqual({ accepted: true, held: true });
    expect(wire.sent.filter((s) => s.method === 'turn/steer')).toEqual([]);
    expect(wire.starts()).toHaveLength(1);
    expect(ofType(events, 'message.user').map((u) => u.text)).toEqual(['first']);
    expect(session.midTurn).toBe('refuse');
    expect(host.pen(cwd)?.text).toBe('second');
  });

  it('goes as its own turn when the turn completes cleanly', async () => {
    const { host, cwd, wire, events } = await loadedCodex('codex-clean');

    wire.frame(completed('completed'));
    await until(() => wire.starts().length === 2);

    const release = wire.starts()[1];
    if (release === undefined) throw new Error('the pen never released');
    expect((release.params as { input: unknown }).input).toEqual([
      { type: 'text', text: 'second' },
    ]);
    expect(wire.sent.filter((s) => s.method === 'turn/steer')).toEqual([]);
    expect(ofType(events, 'message.user').map((u) => [u.text, u.delivery])).toEqual([
      ['first', undefined],
      ['second', undefined],
    ]);
    expect(host.pen(cwd)).toBeNull();
  });

  for (const status of ['interrupted', 'failed', 'unknown']) {
    it(`keeps the prompt when the turn ends \`${status}\``, async () => {
      const { host, cwd, wire } = await loadedCodex(`codex-${status}`);

      wire.frame(completed(status));
      await drain();

      expect(wire.starts()).toHaveLength(1);
      expect(wire.sent.filter((s) => s.method === 'turn/steer')).toEqual([]);
      expect(host.pen(cwd)?.text).toBe('second');
    });
  }

  it('keeps the prompt, with a verdict, when the codex transport exits', async () => {
    const { host, cwd, wire } = await loadedCodex('codex-exit');

    wire.exit();
    await drain();

    expect(wire.starts()).toHaveLength(1);
    expect(host.pen(cwd)?.text).toBe('second');
    expect(host.pen(cwd)?.verdict).toBe('hold');
  });

  it('publishes the crash state ahead of the rows it ends, and still reads held and done (ONL-3104)', async () => {
    const { host, cwd, wire, timeline } = await loadedCodex('codex-exit-order');
    wire.ask('item/commandExecution/requestApproval', 'crash-approval', { itemId: 'crash-tool', command: 'ls' });
    await drain();
    const from = timeline.length;

    wire.exit();
    await drain();

    // The crash reverses the ordinary order: the ending state is published, with the turn still
    // streaming, before the rows that end the turn reach the renderer.
    const since = timeline.slice(from);
    const ending = since.findIndex((entry) => 'state' in entry && entry.state.turnEnding === true);
    const cancelled = since.findIndex((entry) => 'event' in entry && entry.event.type === 'tool.end');
    const ended = since.findIndex((entry) => 'event' in entry && entry.event.type === 'turn.ended');
    expect(cancelled).toBeGreaterThanOrEqual(0);
    expect(ending).toBeGreaterThan(cancelled);
    expect(ended).toBeGreaterThan(ending);

    // Reading the state first must not release the pen or leave the tab reading busy.
    expect(host.pen(cwd)?.text).toBe('second');
    expect(host.pen(cwd)?.verdict).toBe('hold');
    expect(wire.starts()).toHaveLength(1);
    expect(since.reduce<TabStatus | undefined>((previous, entry) => 'state' in entry
      ? agentTabStatus(previous, {
          isStreaming: entry.state.isStreaming,
          needsAttention: entry.state.needsAttention === true,
          turnEnding: entry.state.turnEnding === true,
        })
      : previous, 'working')).toBe('done');
  });

  it('answers a prompt sent after the crash when the restart cannot run (ONL-3104)', async () => {
    const { host, cwd, wire, events } = await codexHost('codex-exit-gone', () => ({}), false);
    await host.command({ type: 'prompt', text: 'first' }, cwd);
    await drain();
    wire.exit();
    await drain();
    // The restart needs a registered project; without one the dead session is what the prompt reaches.
    forgetProject(cwd);
    const before = ofType(events, 'session.error').length;

    expect(await host.command({ type: 'prompt', text: 'are you still there' }, cwd)).toEqual({ accepted: true });
    await drain();

    expect(ofType(events, 'session.error').length).toBeGreaterThan(before);
    expect(ofType(events, 'message.user').map((row) => row.text)).toContain('are you still there');
  });

  it('keeps the prompt, with a verdict, when turn/start never starts a turn', async () => {
    const held = deferred<{ turn: { id: string } }>();
    const { host, cwd, wire, events } = await codexHost('codex-no-start', (method) =>
      method === 'turn/start' ? held.promise : undefined,
    );

    await host.command({ type: 'prompt', text: 'first' }, cwd);
    await until(() => wire.starts().length === 1);
    expect(await host.command({ type: 'prompt', text: 'second' }, cwd)).toEqual({
      accepted: true,
      held: true,
    });

    held.reject(new Error('turn/start: thread is not running'));
    await drain();

    expect(wire.starts()).toHaveLength(1);
    expect(ofType(events, 'turn.started')).toEqual([]);
    expect(host.pen(cwd)?.text).toBe('second');
    expect(host.pen(cwd)?.verdict).toBe('hold');
  });
});

describe('the waiting prompt reaches the renderer (ONL-2294)', () => {
  it("reaches the chat on a pen change the backend's own state never moved", async () => {
    const { host, cwd, sdk } = await claudeHost('claude-emit');
    const view = openView(cwd);
    await host.command({ type: 'prompt', text: 'first' }, cwd);
    sdk.push(MESSAGE_START(), TEXT_START(), TEXT_DELTA('working on it'));
    await drain();
    const settled = view.states.length;

    expect(await host.command({ type: 'prompt', text: 'second' }, cwd)).toEqual({
      accepted: true,
      held: true,
    });

    expect(view.states.length).toBeGreaterThan(settled);
    const latest = view.states.at(-1);
    expect(latest?.pen).toEqual({ penId: 1, text: 'second' });
    expect(latest?.isStreaming).toBe(true);
  });

  it('leaves the chat with nothing waiting once the prompt goes', async () => {
    const { host, cwd, sdk } = await claudeHost('claude-emit-cleared');
    const view = openView(cwd);
    await host.command({ type: 'prompt', text: 'first' }, cwd);
    sdk.push(MESSAGE_START());
    await drain();
    await host.command({ type: 'prompt', text: 'second' }, cwd);

    sdk.push(RESULT_OK);
    await drain();

    expect(view.states.at(-1)?.pen).toBeUndefined();
  });

  it("carries the latched verdict, which is what tells the chat the prompt was not sent", async () => {
    const { host, cwd, sdk } = await loaded('claude-emit-verdict');
    const view = openView(cwd);

    await host.command({ type: 'interrupt' }, cwd);
    sdk.push(RESULT_ABORTED);
    await drain();

    expect(view.states.at(-1)?.pen).toEqual({ penId: 1, text: 'second', verdict: 'hold' });
    expect(host.snapshot({}, cwd).pen?.verdict).toBe('hold');
  });

  it('a view that mounts with a prompt waiting reads it from the snapshot', async () => {
    const { host, cwd } = await loaded('claude-snapshot');

    expect(host.snapshot({}, cwd).pen).toEqual({ penId: 1, text: 'second' });
  });

  it('a re-announced view receives the waiting prompt, and the attention count beside it', async () => {
    const { host, cwd } = await loaded('claude-reannounce');
    const view = openView(cwd);

    await host.command({ type: 'session.start', cwd }, cwd);

    const latest = view.states.at(-1);
    expect(latest?.pen).toEqual({ penId: 1, text: 'second' });
    expect(latest?.needsAttention).toBe(false);
  });

  it('a take answers with the waiting prompt and empties the pen', async () => {
    const { host, cwd, sdk } = await loaded('claude-take');
    const penId = host.pen(cwd)?.penId;
    if (penId === undefined) throw new Error('nothing was held');

    expect(await host.command({ type: 'pen.take', penId }, cwd)).toEqual({
      accepted: true,
      taken: { text: 'second' },
    });
    await drain();

    expect(host.pen(cwd)).toBeNull();
    expect(sdk.reached()).toEqual(['first']);
  });

  it("a take hands the waiting prompt's attachments back with it", async () => {
    const image = { id: 'img-take', mediaType: 'image/png' as const };
    const { host, cwd, sdk } = await claudeHost('claude-take-attachments');
    await host.command({ type: 'prompt', text: 'first' }, cwd);
    sdk.push(MESSAGE_START());
    await drain();
    await host.command({ type: 'prompt', text: 'second', attachments: [image] }, cwd);
    const penId = host.pen(cwd)?.penId;
    if (penId === undefined) throw new Error('nothing was held');

    expect(await host.command({ type: 'pen.take', penId }, cwd)).toEqual({
      accepted: true,
      taken: { text: 'second', attachments: [image] },
    });
  });

  it('a take quoting a retired id takes nothing and leaves the prompt waiting', async () => {
    const { host, cwd } = await loaded('claude-take-stale');
    const penId = host.pen(cwd)?.penId;
    if (penId === undefined) throw new Error('nothing was held');

    expect(await host.command({ type: 'pen.take', penId: penId + 1 }, cwd)).toEqual({
      accepted: false,
    });
    expect(host.pen(cwd)?.text).toBe('second');
  });

  it('a discard empties the pen and sends nothing', async () => {
    const { host, cwd, sdk, events } = await loaded('claude-cmd-discard');
    const penId = host.pen(cwd)?.penId;
    if (penId === undefined) throw new Error('nothing was held');

    expect(await host.command({ type: 'pen.discard', penId }, cwd)).toEqual({ accepted: true });
    await drain();

    expect(host.pen(cwd)).toBeNull();
    expect(sdk.reached()).toEqual(['first']);
    expect(ofType(events, 'message.user').map((u) => u.text)).toEqual(['first']);
  });

  it('a prompt typed with nothing running goes at once, carrying the waiting one with it', async () => {
    const { host, cwd, sdk, events } = await loaded('claude-join-settled');
    await host.command({ type: 'interrupt' }, cwd);
    sdk.push(RESULT_ABORTED);
    await drain();
    expect(host.pen(cwd)?.verdict).toBe('hold');

    expect(await host.command({ type: 'prompt', text: 'third' }, cwd)).toEqual({ accepted: true });
    await drain();

    expect(sdk.reached()).toEqual(['first', 'second\n\nthird']);
    expect(ofType(events, 'message.user').map((u) => [u.text, u.turnId])).toEqual([
      ['first', 't1'],
      ['second\n\nthird', 't2'],
    ]);
    expect(host.pen(cwd)).toBeNull();
  });

  it('a tap with a message waiting goes alone as a tap, and the message stays waiting (ONL-2901)', async () => {
    const { host, cwd, sdk, events } = await loaded('claude-tap-passes');
    await host.command({ type: 'interrupt' }, cwd);
    sdk.push(RESULT_ABORTED);
    await drain();
    const penId = host.pen(cwd)?.penId;

    expect(await host.command({ type: 'prompt', text: 'Show the page on mobile', suggestion: { index: 0, taps: 1 } }, cwd)).toEqual({ accepted: true });
    await drain();

    expect(sdk.reached()).toEqual(['first', 'Show the page on mobile']);
    expect(ofType(events, 'message.user').map((u) => u.origin)).toEqual(['user', 'suggestion']);
    expect(host.pen(cwd)).toMatchObject({ penId, text: 'second', verdict: 'hold' });
  });

  it('a resent tap reaches the agent as a tap (ONL-2901)', async () => {
    const { host, cwd, sdk, events } = await claudeHost('claude-tap-resent');

    expect(await host.command({ type: 'prompt', text: 'Show the page on mobile', resends: 'suggestion' }, cwd)).toEqual({ accepted: true });
    await drain();

    expect(sdk.reached()).toEqual(['Show the page on mobile']);
    expect(ofType(events, 'message.user').map((u) => u.origin)).toEqual(['suggestion']);
  });

  it('a discard quoting a retired id changes nothing', async () => {
    const { host, cwd, sdk } = await loaded('claude-cmd-stale');
    const penId = host.pen(cwd)?.penId;
    if (penId === undefined) throw new Error('nothing was held');

    expect(await host.command({ type: 'pen.discard', penId: penId + 1 }, cwd)).toEqual({
      accepted: false,
    });
    await drain();

    expect(host.pen(cwd)?.text).toBe('second');
    expect(sdk.reached()).toEqual(['first']);
  });
});

describe('leaving does not lose the waiting prompt (ONL-2294)', () => {
  const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 1, 2, 3, 4]);

  /** `loaded` with the turn stopped: the prompt is still waiting and nothing is streaming. */
  async function settled(name: string) {
    const made = await loaded(name);
    await made.host.command({ type: 'interrupt' }, made.cwd);
    made.sdk.push(RESULT_ABORTED);
    await drain();
    return made;
  }

  /** The same, with the waiting prompt carrying an image whose only root is its admission hold. */
  async function withImage(name: string) {
    const made = await claudeHost(name);
    await made.host.command({ type: 'prompt', text: 'first' }, made.cwd);
    made.sdk.push(MESSAGE_START());
    await drain();
    const registered = registerImage(made.cwd, PNG);
    if (!registered.ok) throw new Error('the fixture image was refused');
    await made.host.command(
      { type: 'prompt', text: 'with a picture', attachments: [registered.image] },
      made.cwd,
    );
    await made.host.command({ type: 'interrupt' }, made.cwd);
    made.sdk.push(RESULT_ABORTED);
    await drain();
    expect(made.host.pen(made.cwd)?.attachments).toEqual([registered.image]);
    return { ...made, image: registered.image };
  }

  it('a tab close hands the prompt to the composer draft', async () => {
    const { host, cwd, sdk } = await settled('close-draft');

    await host.releaseWorkspace(cwd);

    expect(readComposerDraft(cwd)).toEqual({ text: 'second', images: [] });
    expect(host.pen(cwd)).toBeNull();
    expect(sdk.reached()).toEqual(['first']);
  });

  it('a tab close loses neither the waiting prompt nor the draft already stored', async () => {
    const { host, cwd } = await settled('close-merge');
    writeComposerDraft(cwd, { text: 'and this too', images: [] });

    await host.releaseWorkspace(cwd);

    expect(readComposerDraft(cwd).text).toBe('second\n\nand this too');
  });

  it("carries the prompt's images into the draft and leaves them readable through a sweep", async () => {
    const { host, cwd, image } = await withImage('close-image');

    await host.releaseWorkspace(cwd);
    gcSweep();

    expect(readComposerDraft(cwd)).toEqual({ text: 'with a picture', images: [image] });
    expect(readImage(image.id)).not.toBeNull();
  });

  it('carries nothing but text and images: an element snapshot describes a page the agent has since changed', async () => {
    const element: ElementEvidence = {
      kind: 'element',
      id: 'el-1',
      tag: 'div',
      domPath: 'div:nth-of-type(1)',
      outerHtmlSnippet: '<div>hero</div>',
      textContent: 'hero',
      classes: [],
      frameUrl: 'http://localhost:3000/',
    };
    const { host, cwd, sdk } = await claudeHost('close-element');
    await host.command({ type: 'prompt', text: 'first' }, cwd);
    sdk.push(MESSAGE_START());
    await drain();
    await host.command({ type: 'prompt', text: 'second', attachments: [element] }, cwd);
    expect(host.pen(cwd)?.attachments).toEqual([element]);

    await host.releaseWorkspace(cwd);

    expect(readComposerDraft(cwd)).toEqual({ text: 'second', images: [] });
  });

  it('a quit hands the prompt to the composer draft', async () => {
    const { host, cwd, sdk } = await settled('quit-draft');

    await host.dispose();

    expect(readComposerDraft(cwd).text).toBe('second');
    expect(sdk.reached()).toEqual(['first']);
  });

  it('a new chat leaves the prompt waiting, writes no draft, and sends nothing', async () => {
    const { host, cwd, sdk } = await settled('new-chat');

    expect(await host.command({ type: 'session.newChat' }, cwd)).toEqual({ accepted: true });

    expect(host.pen(cwd)?.text).toBe('second');
    expect(host.pen(cwd)?.verdict).toBe('hold');
    expect(readComposerDraft(cwd)).toEqual({ text: '', images: [] });
    expect(sdk.reached()).toEqual(['first']);
  });

  it("keeps a waiting prompt's image readable across a new chat", async () => {
    const { host, cwd, image } = await withImage('new-chat-image');

    expect(await host.command({ type: 'session.newChat' }, cwd)).toEqual({ accepted: true });
    gcSweep();

    expect(host.pen(cwd)?.attachments).toEqual([image]);
    expect(readImage(image.id)).not.toBeNull();
  });

  it('a stale-session restart leaves the prompt waiting and writes no draft', async () => {
    const { host, cwd, sdk } = await settled('stale-restart');
    host.noteClaudeSetup({ status: 'signed-out', command: CLAUDE_LOGIN_COMMAND }, { afterLogin: false });
    host.noteClaudeSetup({ status: 'signed-in', command: CLAUDE_LOGIN_COMMAND }, { afterLogin: true });

    expect(await host.studioPrompt(cwd, 'start the app')).toBe(true);
    await drain();

    expect(host.pen(cwd)?.text).toBe('second');
    expect(readComposerDraft(cwd)).toEqual({ text: '', images: [] });
    expect(sdk.reached()).toEqual(['first', 'start the app']);
  });

  it('a tab close with nothing waiting leaves the stored draft alone', async () => {
    const { host, cwd } = await claudeHost('close-empty-pen');
    writeComposerDraft(cwd, { text: 'only the composer', images: [] });

    await host.releaseWorkspace(cwd);

    expect(readComposerDraft(cwd)).toEqual({ text: 'only the composer', images: [] });
  });
});

const QUESTION_TEXT = 'Which accent should the pricing page use?';
const ASK = {
  questions: [
    {
      question: QUESTION_TEXT,
      header: 'Accent',
      multiSelect: false,
      options: [
        { label: 'Teal', description: 'The product accent' },
        { label: 'Purple', description: 'The marketing accent' },
      ],
    },
  ],
};

/** A Claude turn holding an open question. */
async function askingClaude(name: string) {
  const made = await claudeHost(name, false);
  await made.host.command({ type: 'prompt', text: 'first' }, made.cwd);
  made.sdk.push(MESSAGE_START());
  await drain();
  const answer = made.sdk.ask(ASK);
  await drain();
  expect(made.host.snapshot({}, made.cwd).questionParkedSince).toBeDefined();
  return { ...made, answer };
}

/** A codex turn holding an open question. */
async function askingCodex(name: string) {
  const made = await codexHost(name, () => ({}), false);
  await made.host.command({ type: 'prompt', text: 'first' }, made.cwd);
  await until(() => made.wire.starts().length === 1);
  made.wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
  made.wire.ask('item/tool/requestUserInput', 41, {
    threadId: 'thread-1',
    turnId: 'turn-1',
    itemId: 'call_ask',
    questions: [
      {
        id: 'accent',
        header: 'Accent',
        question: QUESTION_TEXT,
        isOther: true,
        isSecret: false,
        options: [
          { label: 'Teal', description: 'The product accent' },
          { label: 'Purple', description: 'The marketing accent' },
        ],
      },
    ],
  });
  await drain();
  expect(made.host.snapshot({}, made.cwd).questionParkedSince).toBeDefined();
  return made;
}

describe('a reply from the Project Chat composer answers an open question (ONL-2583)', () => {
  it('Claude: the reply is the answer, in the CLI\'s free-text field, and nothing waits', async () => {
    const { host, cwd, sdk, events, answer } = await askingClaude('reply-claude');

    const acceptance = await host.command(
      { type: 'prompt', text: 'use orange instead', answersQuestion: true },
      cwd,
    );

    expect(acceptance).toEqual({ accepted: true });
    expect(host.pen(cwd)).toBeNull();
    expect(await answer).toMatchObject({
      behavior: 'allow',
      updatedInput: { answers: {}, response: 'use orange instead' },
    });
    expect(ofType(events, 'message.user').map((u) => u.text)).toEqual(['first', 'use orange instead']);
    expect(sdk.reached()).toEqual(['first']);
  });

  it('Claude: a send that does not come from the composer still waits behind the question', async () => {
    const { host, cwd, sdk, answer } = await askingClaude('inline-claude');

    const acceptance = await host.command({ type: 'prompt', text: 'make the logo bigger' }, cwd);

    expect(acceptance).toEqual({ accepted: true, held: true });
    expect(host.pen(cwd)?.text).toBe('make the logo bigger');
    expect(host.snapshot({}, cwd).questionParkedSince).toBeDefined();
    expect(await Promise.race([answer.then(() => 'settled'), drain().then(() => 'open')])).toBe('open');
    expect(sdk.reached()).toEqual(['first']);
  });

  it('Claude: skip ends the turn as Stop does, and a waiting message comes back unsent', async () => {
    const { host, cwd, sdk, events, answer } = await askingClaude('skip-claude');
    await host.command({ type: 'prompt', text: 'make the logo bigger' }, cwd);

    await host.command({ type: 'interrupt', cause: 'question.skip' }, cwd);
    sdk.push(RESULT_ABORTED);
    await drain();

    expect(await answer.then(() => 'answered', (error: Error) => error.message)).toBe('Tool use aborted');
    expect(sdk.interrupts).toBeGreaterThan(0);
    expect(ofType(events, 'turn.ended')).toHaveLength(1);
    expect(ofType(events, 'permission.resolved').map((r) => r.dismissed)).toEqual([undefined]);
    expect(host.snapshot({}, cwd).isStreaming).toBe(false);
    expect(host.pen(cwd)?.text).toBe('make the logo bigger');
    expect(host.pen(cwd)?.verdict).toBe('hold');
    expect(sdk.reached()).toEqual(['first']);
  });

  it('codex: the reply is every question\'s answer, and nothing waits', async () => {
    const { host, cwd, wire, events } = await askingCodex('reply-codex');

    const acceptance = await host.command(
      { type: 'prompt', text: 'use orange instead', answersQuestion: true },
      cwd,
    );

    expect(acceptance).toEqual({ accepted: true });
    expect(host.pen(cwd)).toBeNull();
    expect(wire.answered).toEqual([
      { id: 41, result: { answers: { accent: { answers: ['use orange instead'] } } } },
    ]);
    expect(ofType(events, 'message.user').map((u) => u.text)).toEqual(['first', 'use orange instead']);
    expect(wire.starts()).toHaveLength(1);
    expect(wire.sent.filter((s) => s.method === 'turn/steer')).toEqual([]);
  });

  it('codex: a send that does not come from the composer still waits behind the question', async () => {
    const { host, cwd, wire } = await askingCodex('inline-codex');

    const acceptance = await host.command({ type: 'prompt', text: 'make the logo bigger' }, cwd);

    expect(acceptance).toEqual({ accepted: true, held: true });
    expect(host.pen(cwd)?.text).toBe('make the logo bigger');
    expect(wire.answered).toEqual([]);
  });

  it('codex: skip interrupts the turn, and a waiting message comes back unsent', async () => {
    const { host, cwd, wire, events } = await askingCodex('skip-codex');
    await host.command({ type: 'prompt', text: 'make the logo bigger' }, cwd);

    await host.command({ type: 'interrupt', cause: 'question.skip' }, cwd);
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'interrupted' } } });
    await drain();

    expect(wire.sent.filter((s) => s.method === 'turn/interrupt')).toHaveLength(1);
    expect(wire.answered).toEqual([]);
    expect(ofType(events, 'permission.resolved').map((r) => r.outcome)).toEqual(['canceled']);
    expect(ofType(events, 'permission.resolved').map((r) => r.dismissed)).toEqual([undefined]);
    expect(host.snapshot({}, cwd).isStreaming).toBe(false);
    expect(wire.starts()).toHaveLength(1);
    expect(host.pen(cwd)?.text).toBe('make the logo bigger');
    expect(host.pen(cwd)?.verdict).toBe('hold');
  });
});

describe('dismissing an open question ends the turn and leaves the next move to the person (ONL-2901)', () => {
  it('Claude: the turn is interrupted, the question closes marked dismissed, and nothing is left to resume', async () => {
    const { host, cwd, sdk, events, answer } = await askingClaude('dismiss-claude');

    expect(await host.command({ type: 'question.dismiss' }, cwd)).toEqual({ accepted: true });
    sdk.push(RESULT_ABORTED);
    await drain();

    expect(await answer.then(() => 'answered', (error: Error) => error.message)).toBe('Tool use aborted');
    expect(sdk.interrupts).toBeGreaterThan(0);
    expect(ofType(events, 'permission.resolved').map((r) => [r.outcome, r.dismissed])).toEqual([['canceled', true]]);
    expect(ofType(events, 'message.user').map((u) => u.text)).toEqual(['first']);
    expect(foldSessionState(events).interrupted).toBe(false);
    expect(host.snapshot({}, cwd).questionParkedSince).toBeUndefined();
  });

  it('codex: the turn is interrupted and the question closes marked dismissed, with nothing answered on the wire', async () => {
    const { host, cwd, wire, events } = await askingCodex('dismiss-codex');

    expect(await host.command({ type: 'question.dismiss' }, cwd)).toEqual({ accepted: true });
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'interrupted' } } });
    await drain();

    expect(wire.sent.filter((s) => s.method === 'turn/interrupt')).toHaveLength(1);
    expect(wire.answered).toEqual([]);
    expect(ofType(events, 'permission.resolved').map((r) => [r.outcome, r.dismissed])).toEqual([['canceled', true]]);
    expect(ofType(events, 'message.user').map((u) => u.text)).toEqual(['first']);
    expect(foldSessionState(events).interrupted).toBe(false);
  });

  it('is refused when no question is open, and interrupts nothing', async () => {
    const { host, cwd, sdk } = await claudeHost('dismiss-none', false);
    expect(await host.command({ type: 'question.dismiss' }, cwd)).toEqual({ accepted: false });
    expect(sdk.interrupts).toBe(0);
  });
});

describe('the funnel counts a waiting prompt only once it goes (ONL-2294)', () => {
  const ENV_KEYS = [
    'STUDIO_POSTHOG_KEY',
    'STUDIO_POSTHOG_HOST',
    'STUDIO_TELEMETRY',
    'MAIN_VITE_POSTHOG_KEY',
  ] as const;
  const savedEnv = new Map<string, string | undefined>();
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      savedEnv.set(key, process.env[key]);
      delete process.env[key];
    }
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    resetTelemetryForTesting();
    setAppForTesting({
      getPath: () => join(scratch, 'userdata'),
      getVersion: () => '0.0.0-test',
      getLocale: () => 'en-US',
      isPackaged: false,
    });
    globalThis.fetch = (() =>
      Promise.resolve(new Response('{"status":1}'))) as unknown as typeof fetch;
    initTelemetry();
  });

  afterEach(() => {
    resetTelemetryForTesting();
    setAppForTesting(undefined);
    globalThis.fetch = realFetch;
    for (const key of ENV_KEYS) {
      const value = savedEnv.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const queued = (event: string): Record<string, unknown>[] =>
    peekQueueForTesting()
      .filter((e) => e.event === event)
      .map((e) => e.properties);

  const admissions = (): string[] =>
    peekQueueForTesting()
      .map((e) => e.event)
      .filter((name) =>
        ['chat_message_sent', 'prompt_submitted', 'held_prompt_resolved'].includes(name),
      );

  const waitingPenId = (host: AgentHost, cwd: string): number => {
    const penId = host.pen(cwd)?.penId;
    if (penId === undefined) throw new Error('nothing was held');
    return penId;
  };

  it('counts the sent prompt and nothing for the one still waiting', async () => {
    const { host, cwd } = await loaded('telemetry-held');

    expect(host.pen(cwd)?.text).toBe('second');
    expect(queued('chat_message_sent').map((p) => p['prompt_chars'])).toEqual(['first'.length]);
    expect(queued('prompt_submitted').map((p) => p['prompt_chars'])).toEqual(['first'.length]);
    expect(queued('prompt_submitted').map((p) => p['source'])).toEqual(['typed']);
    expect(queued('held_prompt_resolved')).toEqual([]);
  });

  it('reports a task sent from the next-tasks card as a suggestion, with its card and how many taps it took (ONL-2977)', async () => {
    const { host, cwd } = await claudeHost('telemetry-suggestion');

    await host.command({ type: 'prompt', text: 'Show the page on mobile', suggestion: { index: 1, taps: 3 } }, cwd);

    expect(queued('prompt_submitted')).toMatchObject([{ source: 'suggestion', suggestion_index: 1, suggestion_taps: 3, is_resend: false }]);
  });

  it('reports a resent tap as a suggestion resend, with no card or taps behind it (ONL-2901)', async () => {
    const { host, cwd } = await claudeHost('telemetry-resend');

    await host.command({ type: 'prompt', text: 'Show the page on mobile', resends: 'suggestion' }, cwd);

    const [submitted] = queued('prompt_submitted');
    expect(submitted).toMatchObject({ source: 'suggestion', is_resend: true });
    expect(submitted !== undefined && ('suggestion_index' in submitted || 'suggestion_taps' in submitted)).toBe(false);
  });

  it('reports a tap that passes a waiting prompt as sent, and resolves nothing that waited (ONL-2901)', async () => {
    const { host, cwd, sdk } = await loaded('telemetry-tap-passes');
    await host.command({ type: 'interrupt' }, cwd);
    sdk.push(RESULT_ABORTED);
    await drain();

    await host.command({ type: 'prompt', text: 'Show the page on mobile', suggestion: { index: 0, taps: 1 } }, cwd);
    await drain();

    expect(queued('prompt_submitted').map((p) => p['source'])).toEqual(['typed', 'suggestion']);
    expect(queued('held_prompt_resolved')).toEqual([]);
  });

  it('reports a discarded prompt as discarded, and as sent nowhere', async () => {
    const { host, cwd } = await loaded('telemetry-discard');

    expect(await host.command({ type: 'pen.discard', penId: waitingPenId(host, cwd) }, cwd)).toEqual(
      { accepted: true },
    );

    expect(queued('held_prompt_resolved')).toMatchObject([
      { outcome: 'discarded', prompt_chars: 'second'.length, harness: 'claude' },
    ]);
    expect(typeof queued('held_prompt_resolved')[0]?.['waited_ms']).toBe('number');
    expect(queued('chat_message_sent')).toHaveLength(1);
    expect(queued('prompt_submitted')).toHaveLength(1);
  });

  it('reports a prompt the designer pulls back mid-turn as taken, and as sent nowhere', async () => {
    const { host, cwd } = await loaded('telemetry-take');
    expect(host.pen(cwd)?.verdict).toBeUndefined();

    await host.command({ type: 'pen.take', penId: waitingPenId(host, cwd) }, cwd);

    expect(queued('held_prompt_resolved')).toMatchObject([{ outcome: 'taken' }]);
    expect(queued('chat_message_sent')).toHaveLength(1);
  });

  it("reports a prompt the pen gave back as returned, not as the designer's own take", async () => {
    const { host, cwd, sdk } = await loaded('telemetry-return');
    await host.command({ type: 'interrupt' }, cwd);
    sdk.push(RESULT_ABORTED);
    await drain();
    expect(host.pen(cwd)?.verdict).toBe('hold');

    await host.command({ type: 'pen.take', penId: waitingPenId(host, cwd), auto: true }, cwd);

    expect(queued('held_prompt_resolved')).toMatchObject([
      { outcome: 'returned', prompt_chars: 'second'.length },
    ]);
    expect(queued('chat_message_sent')).toHaveLength(1);
  });

  it('reports Edit on a prompt already coming back as the designer, not as the return', async () => {
    const { host, cwd, sdk } = await loaded('telemetry-edit-while-held');
    await host.command({ type: 'interrupt' }, cwd);
    sdk.push(RESULT_ABORTED);
    await drain();
    expect(host.pen(cwd)?.verdict).toBe('hold');

    await host.command({ type: 'pen.take', penId: waitingPenId(host, cwd) }, cwd);

    expect(queued('held_prompt_resolved')).toMatchObject([{ outcome: 'taken' }]);
  });

  it('reports the release, then the send it became', async () => {
    const { host, cwd, sdk } = await loaded('telemetry-release');

    sdk.push(RESULT_OK);
    await drain();

    expect(host.pen(cwd)).toBeNull();
    expect(admissions()).toEqual([
      'chat_message_sent',
      'prompt_submitted',
      'held_prompt_resolved',
      'chat_message_sent',
      'prompt_submitted',
    ]);
    expect(queued('held_prompt_resolved')).toMatchObject([
      { outcome: 'released', prompt_chars: 'second'.length },
    ]);
  });

  it('reports the waiting prompt as sent when a fresh prompt carries it out', async () => {
    const { host, cwd, sdk } = await loaded('telemetry-joined');
    await host.command({ type: 'interrupt' }, cwd);
    sdk.push(RESULT_ABORTED);
    await drain();
    expect(host.pen(cwd)?.text).toBe('second');

    await host.command({ type: 'prompt', text: 'third' }, cwd);
    await drain();

    expect(host.pen(cwd)).toBeNull();
    expect(queued('held_prompt_resolved')).toMatchObject([
      { outcome: 'sent', prompt_chars: 'second\n\nthird'.length },
    ]);
    expect(queued('chat_message_sent')).toHaveLength(2);
  });

  it('counts how an open question ended, without its words (ONL-2583)', async () => {
    const replied = await askingClaude('question-replied');
    await replied.host.command({ type: 'prompt', text: 'use orange instead', answersQuestion: true }, replied.cwd);
    const skipped = await askingCodex('question-skipped');
    await skipped.host.command({ type: 'interrupt', cause: 'question.skip' }, skipped.cwd);

    expect(queued('question_ended')).toMatchObject([
      { outcome: 'replied', harness: 'claude', question_count: 1 },
      { outcome: 'skipped', harness: 'codex', question_count: 1 },
    ]);
    const serialized = JSON.stringify(queued('question_ended'));
    expect(serialized).not.toContain('orange');
    expect(serialized).not.toContain('accent');
  });

  it('names the project by its hash: no prompt text, no path, no branch', async () => {
    const { host, cwd } = await loaded('telemetry-scrub');

    await host.command({ type: 'pen.discard', penId: waitingPenId(host, cwd) }, cwd);

    const [resolved] = queued('held_prompt_resolved');
    expect(resolved?.['project_id']).toBe(workspaceTelemetryId('pen-host-telemetry-scrub'));
    const serialized = JSON.stringify(resolved);
    expect(serialized).not.toContain('second');
    expect(serialized).not.toContain(cwd);
    expect(serialized).not.toContain('test/telemetry-scrub');
    expect(serialized).not.toContain('pen-host-telemetry-scrub');
  });
});
