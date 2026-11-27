import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest, test } from 'bun:test';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import { foldSessionState } from '@studio/events';
import type { AgentConnection, ElementEvidence, PromptOrigin, StudioEvent } from '@studio/events';
import type { BackendState } from '../backend.js';
import type { SessionEndSummary, TurnSummary } from '../event-log.js';
import { t } from '@studio/i18n';
import { resetImagesStore } from '../../images/store.js';
import { resetUserEnvForTests } from '../../env/shell-env.js';
import { rememberAppServerThread, resetSessionsCache } from '../sessions.js';
import { prepareCodexForSession, registerCodexHost } from '../../codex/index.js';
import type { LoginOutcome } from '../../codex/login.js';
import { resetTranscriptCache } from '../transcript.js';
import { QUESTION_TOOL } from '../reduce.js';
import { TurnNotifications } from '../turn-notifications.js';
import { AppServerSession, type AppServerSessionOptions, type SessionTransport } from './session.js';
import { inertToolSinks } from './tools.js';
import type { TransportHandlers } from './transport.js';
import { DELETE_PROJECT_FILE_TOOL_NAME, PROJECT_SETUP_TOOL_NAMES, UNDO_CANVAS_TOOL_NAME } from '../tool-names.js';
import { initializeProjectSetup, resetProjectSetupForTesting } from '../../project-setup/service.js';
import { createSetupState, emptyRecord, versionDefinition } from '../../project-setup/state.js';
import { canClearProjectCaptures, capturePath, clearProjectCaptures, readCaptureFile } from './capture.js';

function interceptConnectorPolls() {
  const scheduled: (() => void)[] = [];
  const nativeTimeout = globalThis.setTimeout;
  const schedule = jest.spyOn(globalThis, 'setTimeout').mockImplementation(((callback: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) => {
    const timer = nativeTimeout(callback, delay, ...args);
    if (delay === 5000) {
      const unref = timer.unref.bind(timer);
      let captured = false;
      timer.unref = () => {
        if (!captured) {
          captured = true;
          clearTimeout(timer);
          scheduled.push(() => callback(...args));
        }
        return unref();
      };
    }
    return timer;
  }) as typeof setTimeout);
  return {
    async next(): Promise<() => void> {
      for (let attempt = 0; attempt < 50 && scheduled.length === 0; attempt += 1) {
        await new Promise<void>((resolve) => nativeTimeout(resolve, 0));
      }
      const poll = scheduled.shift();
      if (poll === undefined) throw new Error('Connector inventory did not schedule its next poll');
      return poll;
    },
    restore(): void { schedule.mockRestore(); },
  };
}

const savedStateRoot = process.env['STUDIO_STATE_ROOT'];
const savedFlags = process.env['STUDIO_FLAGS'];
beforeEach(() => { process.env['STUDIO_FLAGS'] = 'connectors'; });
afterEach(() => {
  if (savedFlags === undefined) delete process.env['STUDIO_FLAGS'];
  else process.env['STUDIO_FLAGS'] = savedFlags;
});
let scratch: string;
let codexRoot: string;

beforeAll(() => {
  process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: 'appserver-session' });
  resetSessionsCache();
  resetTranscriptCache();
  scratch = mkdtempSync(join(tmpdir(), 'appserver-session-'));
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
  resetSessionsCache();
  resetTranscriptCache();
  resetImagesStore();
  rmSync(scratch, { recursive: true, force: true });
  cleanupTempFixtures();
});

interface Sent {
  method: string;
  params: unknown;
  timeoutMs?: number;
}

/** `hold` leaves a request unanswered, the way a codex that dies before replying does. */
function fakeWire(
  answer: (method: string, params: unknown) => unknown,
  hold: (method: string) => boolean = () => false,
) {
  const sent: Sent[] = [];
  const answered: { id: string | number; result: unknown }[] = [];
  const refused: (string | number)[] = [];
  const unanswered: ((reason: Error) => void)[] = [];
  let dead = false;
  let handlers: TransportHandlers | undefined;
  // Faithful to `AppServerTransport`: a dead child refuses every later request, and the
  // teardown that killed it rejects the ones already in flight first (ONL-3104).
  const bury = (reason: string): void => {
    dead = true;
    for (const reject of unanswered.splice(0)) reject(new Error(reason));
  };
  const transport: SessionTransport = {
    request: (method, params, timeoutMs) => {
      sent.push({ method, params, ...(timeoutMs === undefined ? {} : { timeoutMs }) });
      if (dead) return Promise.reject(new Error(`cannot send ${method}: app-server has exited`));
      if (hold(method)) return new Promise<unknown>((_resolve, reject) => unanswered.push(reject));
      return Promise.resolve().then(() => answer(method, params));
    },
    notify: () => undefined,
    respond: (id, result) => {
      answered.push({ id, result });
    },
    respondError: (id) => {
      refused.push(id);
    },
    close: () => {
      bury('the ChatGPT agent was closed');
      return Promise.resolve();
    },
  };
  return {
    connect: (given: TransportHandlers): SessionTransport => {
      handlers = given;
      return transport;
    },
    sent,
    answered,
    refused,
    frame(frame: { method: string; params?: unknown }): void {
      handlers?.onFrame?.(JSON.stringify(frame), frame, 'notification');
    },
    ask(method: string, id: string | number, params: unknown): void {
      handlers?.onServerRequest?.(method, id, params);
    },
    exit(): void {
      bury('the ChatGPT agent exited (code=0, signal=null)');
      handlers?.onExit?.(0, null);
    },
  };
}

const HANDSHAKE = (method: string): unknown => {
  switch (method) {
    case 'initialize':
      return {};
    case 'model/list':
      return { data: [] };
    case 'thread/start':
      return { thread: { id: 'thread-1' }, model: 'gpt-5.5' };
    case 'turn/start':
      return { turn: { id: 'turn-1' } };
    case 'turn/interrupt':
      return {};
    default:
      return {};
  }
};

it('keeps the accepted prompt available for Retry when Codex starts the turn after the user row', async () => {
  const { wire, session, emitted } = await openedSession(HANDSHAKE);
  expect(session.prompt('Polish the notes layout.')).toBe(true);
  await until(() => wire.sent.some((request) => request.method === 'turn/start'));
  wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
  wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'failed', error: { message: 'Service unavailable', codexErrorInfo: { httpConnectionFailed: { httpStatusCode: 503 } } } } } });
  const failure = foldSessionState(emitted).items.find((item) => item.kind === 'error');
  expect(failure).toMatchObject({ code: 'api_error', apiErrorStatus: 503, retry: { text: 'Polish the notes layout.' } });
});

describe("where ChatGPT saves this chat (ONL-2903)", () => {
  it('reads the thread path, and an absent one leaves none', async () => {
    for (const [path, expected] of [['/codex/sessions/rollout-1.jsonl', '/codex/sessions/rollout-1.jsonl'], [null, undefined]] as const) {
      const cwd = mkdtempSync(join(scratch, 'thread-path-cwd-'));
      const wire = fakeWire((method) => method === 'thread/start' ? { thread: { id: 'thread-1', path }, model: 'gpt-5.5' } : HANDSHAKE(method));
      const emitted: StudioEvent[] = [];
      const session = new AppServerSession({ cwd, codexRoot, captureRoot: mkdtempSync(join(scratch, 'thread-path-capture-')), connect: wire.connect, onEvent: (event) => emitted.push(event), onState: () => undefined, onConnection: () => undefined });
      cleanups.push(() => session.close());
      session.open();
      await until(() => emitted.some((event) => event.type === 'session.settings' && event.permissionModes !== undefined));
      expect(session.transcriptPath).toBe(expected);
    }
  });
});

describe('warm connector inventory', () => {
  it.each(['figma', 'mobbin'] as const)('sends current %s status on start and steer after external sign-in and an authentication failure', async (provider) => {
    const label = provider === 'figma' ? 'Figma' : 'Mobbin';
    const polls = interceptConnectorPolls();
    let activeSession: AppServerSession | undefined;
    try {
      let connected = false;
      let inventoryReads = 0;
      const { wire, session, emitted } = await openedSession((method) => {
        if (method !== 'mcpServerStatus/list') return HANDSHAKE(method);
        inventoryReads += 1;
        return { data: [{ name: 'design-alias', httpOrigin: provider === 'figma' ? 'https://mcp.figma.com' : 'https://api.mobbin.com', runtimeStatus: connected ? 'connected' : 'authenticationRequired', authStatus: connected ? 'oAuth' : 'notLoggedIn' }] };
      });
      activeSession = session;
      await until(() => foldSessionState(emitted).connectors?.servers[0]?.state === 'needs-sign-in');
      const refresh = await polls.next();
      expect(inventoryReads).toBe(1);
      expect(session.prompt(`Use ${label} for the header`)).toBe(true);
      await until(() => startsSent(wire) === 1);
      const start = wire.sent.find((item) => item.method === 'turn/start')?.params as { input: unknown[] };
      expect(JSON.stringify(start.input)).toContain(`${label}: needs sign-in`);
      wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });

      connected = true;
      refresh();
      await until(() => foldSessionState(emitted).connectors?.servers[0]?.state === 'connected');
      await polls.next();
      expect(inventoryReads).toBe(2);
      expect(session.prompt(`Try ${label} again`)).toBe(true);
      await until(() => wire.sent.some((item) => item.method === 'turn/steer'));
      const steer = wire.sent.find((item) => item.method === 'turn/steer')?.params as { input: unknown[]; expectedTurnId: string };
      expect(steer.expectedTurnId).toBe('turn-1');
      expect(JSON.stringify(steer.input)).toContain(`${label}: connected`);

      const item = { id: 'expired-connector', type: 'mcpToolCall', server: 'design-alias', tool: 'read_design', arguments: {} };
      wire.frame({ method: 'item/started', params: { item } });
      wire.frame({ method: 'item/completed', params: { item: { ...item, status: 'failed', result: { content: [{ type: 'text', text: '401 Unauthorized' }] } } } });
      const signInMessage = t('chat.connectors.tool.signInRequired', { connector: label });
      expect(foldSessionState(emitted).connectors?.servers).toEqual([{ id: 'design-alias', name: 'design-alias', featured: provider, state: 'needs-sign-in' }]);
      expect(ofType(emitted, 'tool.end')).toContainEqual(expect.objectContaining({ toolCallId: 'expired-connector', status: 'failed', result: signInMessage }));
      expect(ofType(emitted, 'tool.update')).toContainEqual(expect.objectContaining({ toolCallId: 'expired-connector', title: signInMessage }));
      expect(session.prompt(`Read ${label} once more`)).toBe(true);
      await until(() => wire.sent.filter((entry) => entry.method === 'turn/steer').length === 2);
      const retry = wire.sent.filter((entry) => entry.method === 'turn/steer').at(-1)?.params as { input: unknown[] };
      expect(JSON.stringify(retry.input)).toContain(`${label}: needs sign-in`);
      expect(startsSent(wire)).toBe(1);
      expect(wire.sent.some((entry) => entry.method === 'mcpServer/oauth/login' || entry.method === 'config/batchWrite')).toBe(false);
    } finally {
      polls.restore();
      await activeSession?.close();
    }
  });

  it('omits connector context from start and steer and leaves authentication failures unrowed with the flag off', async () => {
    delete process.env['STUDIO_FLAGS'];
    const { wire, session, emitted } = await openedSession(HANDSHAKE);
    expect(session.prompt('Use Figma and Mobbin for the header')).toBe(true);
    await until(() => startsSent(wire) === 1);
    const start = wire.sent.find((item) => item.method === 'turn/start')?.params as { input: unknown[] };
    expect(start.input).toEqual([{ type: 'text', text: 'Use Figma and Mobbin for the header' }]);
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    const item = { id: 'flag-off-connector', type: 'mcpToolCall', server: 'figma', tool: 'read_design', arguments: {} };
    wire.frame({ method: 'item/started', params: { item } });
    wire.frame({ method: 'item/completed', params: { item: { ...item, status: 'failed', result: { content: [{ type: 'text', text: '401 Unauthorized' }] } } } });
    expect(session.prompt('Try Figma again')).toBe(true);
    await until(() => wire.sent.some((entry) => entry.method === 'turn/steer'));
    expect(wire.sent.find((entry) => entry.method === 'turn/steer')?.params).toEqual({ threadId: 'thread-1', expectedTurnId: 'turn-1', input: [{ type: 'text', text: 'Try Figma again' }] });
    expect(foldSessionState(emitted).connectors).toBeUndefined();
    expect(ofType(emitted, 'tool.start').some((event) => event.toolCallId === item.id)).toBe(false);
    expect(ofType(emitted, 'tool.update').some((event) => event.toolCallId === item.id)).toBe(false);
    expect(ofType(emitted, 'tool.end').some((event) => event.toolCallId === item.id)).toBe(false);
    expect(wire.sent.some((entry) => entry.method === 'mcpServerStatus/list' || entry.method === 'mcpServer/oauth/login')).toBe(false);
  });

  it('connectors flag off never reads Codex inventory or starts extra threads', async () => {
    delete process.env['STUDIO_FLAGS'];
    const cwd = mkdtempSync(join(scratch, 'connectors-off-cwd-'));
    const wire = fakeWire(HANDSHAKE);
    const session = new AppServerSession({ cwd, codexRoot, captureRoot: mkdtempSync(join(scratch, 'connectors-off-capture-')), connect: wire.connect, onEvent: () => undefined, onState: () => undefined, onConnection: () => undefined });
    cleanups.push(() => session.close());
    session.open();
    await until(() => wire.sent.some((item) => item.method === 'thread/start'));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(wire.sent.some((item) => item.method === 'mcpServerStatus/list')).toBe(false);
    expect(session.addConnector('figma')).toBe(false);
    expect(session.addConnector('mobbin')).toBe(false);
    expect(wire.sent.some((item) => item.method === 'config/batchWrite' || item.method === 'mcpServer/oauth/login')).toBe(false);
    expect(wire.sent.filter((item) => item.method === 'thread/start')).toHaveLength(1);
  });
  it('rejects repeated pagination cursors without publishing a partial inventory', async () => {
    const cwd = mkdtempSync(join(scratch, 'cursor-cwd-'));
    let reads = 0;
    const wire = fakeWire((method) => {
      if (method !== 'mcpServerStatus/list') return HANDSHAKE(method);
      reads += 1;
      if (reads > 3) throw new Error('bounded fixture');
      return { data: [{ name: 'partial', authStatus: 'unsupported', runtimeStatus: 'connected' }], nextCursor: 'repeated' };
    });
    const emitted: StudioEvent[] = [];
    const session = new AppServerSession({ cwd, codexRoot, captureRoot: mkdtempSync(join(scratch, 'cursor-capture-')), connect: wire.connect, onEvent: (event) => emitted.push(event), onState: () => undefined, onConnection: () => undefined });
    cleanups.push(() => session.close());
    session.open();
    await until(() => foldSessionState(emitted).connectors?.unavailable === true);
    expect(reads).toBe(2);
    expect(foldSessionState(emitted).connectors?.servers).toEqual([]);
  });
  it('uses the active thread for every page and publishes before a prompt', async () => {
    const cwd = mkdtempSync(join(scratch, 'connectors-cwd-'));
    const wire = fakeWire((method, params) => {
      if (method !== 'mcpServerStatus/list') return HANDSHAKE(method);
      const page = params as { cursor?: string };
      return page.cursor === undefined ? { data: [{ name: 'renamed', authStatus: 'oAuth', runtimeStatus: 'connected', httpOrigin: 'https://mcp.figma.com' }], nextCursor: 'page-2' } : { data: [{ name: 'Search', authStatus: 'notLoggedIn', runtimeStatus: 'failed', toolsError: 'secret' }], nextCursor: null };
    });
    const emitted: StudioEvent[] = [];
    const session = new AppServerSession({ cwd, codexRoot, captureRoot: mkdtempSync(join(scratch, 'connectors-capture-')), connect: wire.connect, onEvent: (event) => emitted.push(event), onState: () => undefined, onConnection: () => undefined });
    cleanups.push(() => session.close());
    session.open();
    await until(() => foldSessionState(emitted).connectors?.servers.length === 2);
    const reads = wire.sent.filter((item) => item.method === 'mcpServerStatus/list');
    expect(reads.map((item) => item.params)).toEqual([{ threadId: 'thread-1', detail: 'toolsAndAuthOnly' }, { threadId: 'thread-1', detail: 'toolsAndAuthOnly', cursor: 'page-2' }]);
    expect(reads.every((item) => item.timeoutMs === 15000)).toBe(true);
    expect(wire.sent.filter((item) => item.method === 'thread/start')).toHaveLength(1);
    expect(wire.sent.some((item) => item.method === 'turn/start')).toBe(false);
    expect(foldSessionState(emitted).connectors?.servers.map((server) => server.state)).toEqual(['connected', 'needs-sign-in']);
    expect(JSON.stringify(foldSessionState(emitted).connectors)).not.toContain('secret');
    wire.exit();
    expect(foldSessionState(emitted).connectors).toEqual({ servers: [], unavailable: true });
  });
});

describe('Codex skill discovery and invocation', () => {
  it('steers a question answer with its selected skill and context intact', async () => {
    const cwd = mkdtempSync(join(scratch, 'question-skills-cwd-'));
    const skill = { name: 'brand', description: 'Use the palette', path: join(cwd, '.agents/skills/brand/SKILL.md'), enabled: true };
    const wire = fakeWire((method) => method === 'skills/list' ? { data: [{ cwd, skills: [skill], errors: [] }] } : HANDSHAKE(method));
    const session = new AppServerSession({ cwd, codexRoot, captureRoot: mkdtempSync(join(scratch, 'question-skills-capture-')), connect: wire.connect, onEvent: () => undefined, onState: () => undefined, onConnection: () => undefined });
    cleanups.push(() => session.close());
    session.open();
    await until(() => wire.sent.some((item) => item.method === 'thread/start'));
    session.prompt('first');
    await until(() => wire.sent.some((item) => item.method === 'turn/start'));
    askUserInput(wire, 'brand-question', 'brand-question-tool', [RAW_QUESTION]);
    expect(session.answerQuestion('Use violet in the header', [{ kind: 'skill', name: 'brand', description: 'Use the palette', agent: 'codex', path: skill.path }], 'Keep the footer quiet')).toBe(true);
    await until(() => wire.sent.some((item) => item.method === 'turn/steer'));
    const input = (wire.sent.find((item) => item.method === 'turn/steer')!.params as { input: unknown[] }).input;
    expect(input).toContainEqual({ type: 'skill', name: 'brand', path: skill.path });
    expect(JSON.stringify(input)).toContain('Use violet in the header');
    expect(JSON.stringify(input)).toContain('Keep the footer quiet');
  });

  it('uses scoped enabled metadata, sends typed skills and refreshes on change', async () => {
    const cwd = mkdtempSync(join(scratch, 'skills-cwd-'));
    const skill = { name: 'brand', description: 'Use the palette', path: join(cwd, '.agents/skills/brand/SKILL.md'), enabled: true };
    let skills = [skill, { ...skill, name: 'disabled', enabled: false }];
    const emitted: StudioEvent[] = [];
    const wire = fakeWire((method) => method === 'skills/list' ? { data: [{ cwd, skills, errors: [] }] } : HANDSHAKE(method));
    const session = new AppServerSession({ cwd, codexRoot, captureRoot: mkdtempSync(join(scratch, 'skills-capture-')), connect: wire.connect, onEvent: (event) => emitted.push(event), onState: () => undefined, onConnection: () => undefined });
    cleanups.push(() => session.close());
    session.open();
    await until(() => wire.sent.some((item) => item.method === 'thread/start'));
    expect(foldSessionState(emitted).skills?.map((item) => item.name)).toEqual(['brand']);
    const attachment = { kind: 'skill' as const, name: 'brand', description: 'Use the palette', agent: 'codex' as const, path: skill.path };
    expect(session.prompt('header please', [attachment])).toBe(true);
    await until(() => wire.sent.some((item) => item.method === 'turn/start'));
    const turn = wire.sent.find((item) => item.method === 'turn/start');
    expect(turn).toBeDefined();
    const input = (turn!.params as { input: unknown[] }).input;
    expect(input).toContainEqual({ type: 'skill', name: 'brand', path: skill.path });
    skills = [{ ...skill, name: 'audit' }];
    wire.frame({ method: 'skills/changed' });
    await until(() => foldSessionState(emitted).skills?.[0]?.name === 'audit');
    expect(session.prompt('again', [attachment])).toBe(false);
    skills = [];
    await session.refreshSkills();
    expect(foldSessionState(emitted).skills).toEqual([]);
  });
});

const ofType = <T extends StudioEvent['type']>(
  emitted: StudioEvent[],
  type: T,
): Extract<StudioEvent, { type: T }>[] =>
  emitted.filter((e): e is Extract<StudioEvent, { type: T }> => e.type === type);

/** Throws rather than yielding `undefined`, which `toEqual` accepts as a passing shape. */
const idOf = (row: { messageId?: string } | undefined): string => {
  if (row?.messageId === undefined) throw new Error('row has no messageId');
  return row.messageId;
};

async function until(check: () => boolean): Promise<void> {
  for (let i = 0; i < 50 && !check(); i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
  }
  if (!check()) throw new Error('condition never held');
}

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  jest.useRealTimers();
  for (const cleanup of cleanups.splice(0)) await cleanup();
});

/** A transcript as it comes off disk: `restore()` restamps the session, ids and sequence. */
const savedConversation = (cwd: string): StudioEvent[] => [
  { type: 'session.started', sessionId: 'a-earlier', cwd, eventId: 'e1', seq: 1, ts: 1, harnessId: 'codex' },
  { type: 'message.user', sessionId: 'a-earlier', cwd, eventId: 'e2', seq: 2, ts: 2, turnId: 't1', messageId: 'm1', text: 'Make the hero two columns' },
  { type: 'text.start', sessionId: 'a-earlier', cwd, eventId: 'e3', seq: 3, ts: 3, blockId: 'b1' },
  { type: 'text.end', sessionId: 'a-earlier', cwd, eventId: 'e4', seq: 4, ts: 4, blockId: 'b1', text: 'Done — two columns at desktop widths' },
];

/** The last prompt before the update: its turn died with the runtime, so the failed turn is still open above the refusal. */
const failedLastTurn = (cwd: string): StudioEvent[] => [
  { type: 'message.user', sessionId: 'a-earlier', cwd, eventId: 'f1', seq: 5, ts: 5, turnId: 't2', messageId: 'm2', text: 'Keep this project working' },
  { type: 'session.error', sessionId: 'a-earlier', cwd, eventId: 'f2', seq: 6, ts: 6, message: t('chat.codex.notRunning'), code: 'unknown' },
  { type: 'turn.ended', sessionId: 'a-earlier', cwd, eventId: 'f3', seq: 7, ts: 7, turnId: 't2', stopReason: 'failed' },
];

/** Opens a project whose stored thread codex no longer has, and settles after the fresh thread opens. */
async function refusedResume(cwd: string, threadId: string, restoredEvents: StudioEvent[], typed?: string) {
  rememberAppServerThread(cwd, threadId);
  const wire = fakeWire((method) => {
    if (method === 'thread/resume') throw new Error('no such thread');
    return HANDSHAKE(method);
  });
  const emitted: StudioEvent[] = [];
  const { promise: prepared, resolve: finish } = Promise.withResolvers<void>();
  const session = new AppServerSession({
    cwd,
    codexRoot,
    captureRoot: mkdtempSync(join(scratch, 'refused-resume-capture-')),
    restoredEvents,
    // Held only for a typed prompt, which must reach the log before the thread is settled.
    ...(typed === undefined ? {} : { prepare: () => prepared }),
    // Present so the greeting the assertions rule out is one this session could have pushed.
    workspace: { sourceRepoName: 'notes', workspaceName: 'notes', branchName: 'onlook/notes', baseBranch: 'main' },
    connect: wire.connect,
    onEvent: (event) => emitted.push(event),
    onState: () => undefined,
    onConnection: () => undefined,
  });
  cleanups.push(() => session.close());
  session.open();
  if (typed !== undefined) expect(session.prompt(typed)).toBe(true);
  finish();
  // Pushed just below the refusal branch, so its arrival settles what that branch did and did not add.
  await until(() => ofType(emitted, 'session.settings').some((event) => event.permissionModes !== undefined));
  return { wire, emitted, session };
}

/** Carried by the stopped prompt only, so the wire can be checked for an attachment that rode along behind it. */
const STOPPED_ELEMENT: ElementEvidence = {
  kind: 'element',
  id: 'hero-heading',
  tag: 'h1',
  domPath: 'body > main:nth-of-type(1) > h1:nth-of-type(1)',
  outerHtmlSnippet: '<h1>Ship the hero</h1>',
  textContent: 'Ship the hero',
  classes: ['hero'],
  frameUrl: 'http://localhost:3000/',
};

describe('a ChatGPT sign-in that owns setup', () => {
  it('lets a project opened behind it send a prompt instead of waiting the login out (ONL-3107)', async () => {
    const savedCodexRoot = process.env['STUDIO_CODEX_ROOT'];
    delete process.env['STUDIO_CODEX_ROOT'];
    if (savedCodexRoot !== undefined) cleanups.push(async () => { process.env['STUDIO_CODEX_ROOT'] = savedCodexRoot; });
    // Never settles on its own: the user is still on the ChatGPT page, where the login may sit for its full ten minutes.
    const completed = Promise.withResolvers<LoginOutcome>();
    const opened = Promise.withResolvers<void>();
    const codexHost = registerCodexHost({
      startLogin: async () => ({ authUrl: 'https://example.test/auth', loginId: 'fixture', completed: completed.promise, cancel: async () => { completed.resolve({ success: false }); } }),
      openExternal: async () => { opened.resolve(); },
      validate: async () => { throw new Error('the login owns setup'); },
      acquire: async () => { throw new Error('the login owns setup'); },
    });
    codexHost.signIn();
    await opened.promise;

    const wire = fakeWire(HANDSHAKE);
    const emitted: StudioEvent[] = [];
    const session = new AppServerSession({
      cwd: mkdtempSync(join(scratch, 'signing-in-cwd-')),
      codexRoot,
      captureRoot: mkdtempSync(join(scratch, 'signing-in-capture-')),
      prepare: prepareCodexForSession,
      connect: wire.connect,
      onEvent: (event) => emitted.push(event),
      onState: () => undefined,
      onConnection: () => undefined,
    });
    cleanups.push(() => session.close());
    // Leaves no login owning the module-level host for whatever runs next in this file.
    cleanups.push(() => codexHost.cancelSignIn());
    session.open();
    expect(session.prompt('Make the hero bigger')).toBe(true);
    await until(() => wire.sent.some((request) => request.method === 'turn/start'));
    expect(codexHost.current()).toStrictEqual({ status: 'signing-in', authUrl: 'https://example.test/auth' });
    expect(ofType(emitted, 'session.error')).toHaveLength(0);
  });
});

describe('a runtime upgrade during project startup', () => {
  it('waits for installation before checking health or sending a queued prompt', async () => {
    const root = mkdtempSync(join(scratch, 'upgraded-codex-'));
    const wire = fakeWire(HANDSHAKE);
    const emitted: StudioEvent[] = [];
    const { promise: prepared, resolve: finish } = Promise.withResolvers<void>();
    const session = new AppServerSession({
      cwd: mkdtempSync(join(scratch, 'upgraded-cwd-')),
      codexRoot: root,
      captureRoot: mkdtempSync(join(scratch, 'upgraded-capture-')),
      prepare: () => prepared,
      connect: wire.connect,
      onEvent: (event) => emitted.push(event),
      onState: () => undefined,
      onConnection: () => undefined,
    });
    cleanups.push(() => session.close());
    session.open();
    expect(session.prompt('Continue our design')).toBe(true);
    await Promise.resolve();
    expect(wire.sent).toHaveLength(0);
    expect(ofType(emitted, 'session.error')).toHaveLength(0);
    for (const name of ['codex', 'codex-code-mode-host']) {
      const path = join(root, name);
      writeFileSync(path, '#!/bin/sh\nexit 1\n');
      chmodSync(path, 0o755);
    }
    finish();
    await until(() => wire.sent.some((request) => request.method === 'turn/start'));
    expect(ofType(emitted, 'session.error')).toHaveLength(0);
  });

  it('reports the turn an install failure abandoned, instead of leaving it open (ONL-2863)', async () => {
    const wire = fakeWire(HANDSHAKE);
    const emitted: StudioEvent[] = [];
    const turns: TurnSummary[] = [];
    const { promise: prepared, reject: failInstall } = Promise.withResolvers<void>();
    const session = new AppServerSession({
      cwd: mkdtempSync(join(scratch, 'failed-upgrade-cwd-')),
      codexRoot,
      captureRoot: mkdtempSync(join(scratch, 'failed-upgrade-capture-')),
      prepare: () => prepared,
      connect: wire.connect,
      onEvent: (event) => emitted.push(event),
      onState: () => undefined,
      onTurnEnded: (summary) => turns.push(summary),
      onConnection: () => undefined,
    });
    cleanups.push(() => session.close());
    session.open();
    expect(session.prompt('Keep going on the hero')).toBe(true);
    failInstall(new Error('the download did not finish'));
    // The turn opened with the prompt; the download it waited on is the one ONL-2925 introduced.
    await until(() => turns.length > 0);
    expect(turns.map((summary) => summary.stopReason)).toEqual(['error']);
    expect(ofType(emitted, 'turn.ended').at(-1)?.stopReason).toBe('error');
    expect(session.isTurnLive).toBe(false);
  });

  it('drops a prompt stopped while its runtime installs, and sends the next one', async () => {
    const wire = fakeWire(HANDSHAKE);
    const emitted: StudioEvent[] = [];
    const states: BackendState[] = [];
    const turns: TurnSummary[] = [];
    const { promise: prepared, resolve: finish } = Promise.withResolvers<void>();
    const session = new AppServerSession({
      cwd: mkdtempSync(join(scratch, 'stopped-upgrade-cwd-')),
      codexRoot,
      captureRoot: mkdtempSync(join(scratch, 'stopped-upgrade-capture-')),
      prepare: () => prepared,
      connect: wire.connect,
      onEvent: (event) => emitted.push(event),
      onState: (state) => states.push(state),
      onTurnEnded: (summary) => turns.push(summary),
      onConnection: () => undefined,
    });
    cleanups.push(() => session.close());
    session.open();
    expect(session.prompt('Keep going on the hero')).toBe(true);
    expect(session.isTurnLive).toBe(true);
    await session.interrupt();
    // Stop settles here, not when the download ends: the row would otherwise stay live for the whole install.
    expect(session.isTurnLive).toBe(false);
    expect(states.at(-1)?.isStreaming).toBe(false);
    expect(idOf(ofType(emitted, 'message.delivery').at(-1))).toBe(idOf(ofType(emitted, 'message.user').at(-1)));
    expect(ofType(emitted, 'message.delivery').at(-1)?.outcome).toBe('discarded');
    // The turn opened with the prompt, so Stop closes its books here too, and as a Stop rather than a provider fault (ONL-2863).
    expect(turns.map((summary) => summary.stopReason)).toEqual(['interrupted']);
    expect(ofType(emitted, 'turn.ended').at(-1)?.stopReason).toBe('interrupted');
    finish();
    await until(() => wire.sent.some((request) => request.method === 'thread/start'));
    expect(session.isTurnLive).toBe(false);
    expect(states.at(-1)?.isStreaming).toBe(false);
    expect(ofType(emitted, 'session.error')).toHaveLength(0);
    // The run it parked wakes with the books already closed, so it reports nothing a second time.
    expect(turns).toHaveLength(1);

    // The next prompt's own turn is the settled point: by the time it reaches the wire the stopped one has long resumed, so one `turn/start` is the whole claim.
    expect(session.prompt('Try the footer instead')).toBe(true);
    await until(() => wire.sent.some((request) => request.method === 'turn/start'));
    const started = wire.sent.filter((request) => request.method === 'turn/start');
    expect(started).toHaveLength(1);
    expect(JSON.stringify(started[0]?.params)).toContain('Try the footer instead');
    expect(JSON.stringify(wire.sent)).not.toContain('Keep going on the hero');
  });

  it('leaves the next prompt working when the one stopped before readiness wakes', async () => {
    const { promise: turnAnswer, resolve: answerTurn } = Promise.withResolvers<unknown>();
    const wire = fakeWire((method) => (method === 'turn/start' ? turnAnswer : HANDSHAKE(method)));
    const emitted: StudioEvent[] = [];
    const states: BackendState[] = [];
    const turns: TurnSummary[] = [];
    const { promise: prepared, resolve: finish } = Promise.withResolvers<void>();
    const session = new AppServerSession({
      cwd: mkdtempSync(join(scratch, 'stale-run-cwd-')),
      codexRoot,
      captureRoot: mkdtempSync(join(scratch, 'stale-run-capture-')),
      prepare: () => prepared,
      connect: wire.connect,
      onEvent: (event) => emitted.push(event),
      onState: (state) => states.push(state),
      onTurnEnded: (summary) => turns.push(summary),
      onConnection: () => undefined,
    });
    cleanups.push(() => session.close());
    session.open();
    expect(session.prompt('Keep going on the hero', [STOPPED_ELEMENT])).toBe(true);
    await session.interrupt();
    // Both before the install resolves: the stopped run is still parked on readiness when this one takes the row.
    expect(session.prompt('Try the footer instead')).toBe(true);
    expect(session.isTurnLive).toBe(true);
    finish();
    await until(() => wire.sent.some((request) => request.method === 'turn/start'));
    // The stopped run woke and found its place in line taken; the unit it gives back is not this turn's.
    expect(session.isTurnLive).toBe(true);
    expect(states.at(-1)?.isStreaming).toBe(true);
    const started = wire.sent.filter((request) => request.method === 'turn/start');
    expect(started).toHaveLength(1);
    expect(JSON.stringify(started[0]?.params)).toContain('Try the footer instead');
    expect(JSON.stringify(wire.sent)).not.toContain('Keep going on the hero');
    expect(JSON.stringify(wire.sent)).not.toContain(STOPPED_ELEMENT.outerHtmlSnippet);
    // The books the stale run gave back are the count's, not the turn's: only its own Stop is
    // reported, and the turn this prompt opened is still running.
    expect(turns.map((summary) => summary.stopReason)).toEqual(['interrupted']);
    expect(ofType(emitted, 'turn.ended')).toHaveLength(1);
    answerTurn({ turn: { id: 'turn-1' } });
    wire.frame({ method: 'turn/completed', params: { turn: { status: 'completed' } } });
    await until(() => !session.isStreaming);
    expect(session.isTurnLive).toBe(false);
    expect(turns).toHaveLength(2);
    expect(ofType(emitted, 'session.error')).toHaveLength(0);
  });

  it('leaves the next prompt working when a turn codex ended settles the one still waiting to start', async () => {
    const { promise: threadAnswer, resolve: openThread } = Promise.withResolvers<unknown>();
    const wire = fakeWire((method) => (method === 'thread/start' ? threadAnswer : HANDSHAKE(method)));
    const emitted: StudioEvent[] = [];
    const session = new AppServerSession({
      cwd: mkdtempSync(join(scratch, 'completed-wake-cwd-')),
      codexRoot,
      captureRoot: mkdtempSync(join(scratch, 'completed-wake-capture-')),
      connect: wire.connect,
      onEvent: (event) => emitted.push(event),
      onState: () => undefined,
      onConnection: () => undefined,
    });
    cleanups.push(() => session.close());
    session.open();
    await until(() => wire.sent.some((request) => request.method === 'thread/start'));
    expect(session.prompt('Keep going on the hero')).toBe(true);
    // The thread's last turn ends while this prompt is still parked: not a Stop, and the same unit.
    wire.frame({ method: 'turn/completed', params: { turn: { status: 'aborted' } } });
    expect(session.isTurnLive).toBe(false);
    expect(session.prompt('Try the footer instead')).toBe(true);
    expect(session.isTurnLive).toBe(true);
    openThread({ thread: { id: 'thread-1' } });
    await until(() => wire.sent.some((request) => request.method === 'turn/start'));
    expect(session.isTurnLive).toBe(true);
    expect(wire.sent.filter((request) => request.method === 'turn/start')).toHaveLength(1);
    expect(JSON.stringify(wire.sent)).not.toContain('Keep going on the hero');
    expect(ofType(emitted, 'session.error')).toHaveLength(0);
  });

  it('steers a prompt sent while the replacement turn is still unanswered, rather than opening a second one', async () => {
    const { promise: turnAnswer, resolve: answerTurn } = Promise.withResolvers<unknown>();
    const wire = fakeWire((method) => (method === 'turn/start' ? turnAnswer : HANDSHAKE(method)));
    const emitted: StudioEvent[] = [];
    const { promise: prepared, resolve: finish } = Promise.withResolvers<void>();
    const session = new AppServerSession({
      cwd: mkdtempSync(join(scratch, 'stale-steer-cwd-')),
      codexRoot,
      captureRoot: mkdtempSync(join(scratch, 'stale-steer-capture-')),
      prepare: () => prepared,
      connect: wire.connect,
      onEvent: (event) => emitted.push(event),
      onState: () => undefined,
      onConnection: () => undefined,
    });
    cleanups.push(() => session.close());
    session.open();
    expect(session.prompt('Keep going on the hero')).toBe(true);
    await session.interrupt();
    expect(session.prompt('Try the footer instead')).toBe(true);
    finish();
    await until(() => wire.sent.some((request) => request.method === 'turn/start'));
    // Codex has not answered `turn/start` yet, so this one belongs to that turn and not to one of its own.
    expect(session.prompt('And tighten the spacing')).toBe(true);
    answerTurn({ turn: { id: 'turn-1' } });
    await until(() =>
      wire.sent.some((request) => request.method === 'turn/steer') ||
      wire.sent.filter((request) => request.method === 'turn/start').length > 1);
    expect(wire.sent.filter((request) => request.method === 'turn/start')).toHaveLength(1);
    expect(wire.sent.filter((request) => request.method === 'turn/steer')).toHaveLength(1);
    // One turn was asked for, so one `turn/completed` owes nothing further.
    wire.frame({ method: 'turn/completed', params: { turn: { status: 'completed' } } });
    await until(() => !session.isStreaming);
    expect(session.isTurnLive).toBe(false);
    expect(ofType(emitted, 'message.delivery').map((event) => event.outcome)).not.toContain('refused');
  });

  it('does not spend the steer window on the install, so a second prompt is not refused', async () => {
    const { promise: turnAnswer, resolve: answerTurn } = Promise.withResolvers<unknown>();
    const wire = fakeWire((method) => (method === 'turn/start' ? turnAnswer : HANDSHAKE(method)));
    const emitted: StudioEvent[] = [];
    const { promise: prepared, resolve: finish } = Promise.withResolvers<void>();
    const session = new AppServerSession({
      cwd: mkdtempSync(join(scratch, 'slow-upgrade-cwd-')),
      codexRoot,
      captureRoot: mkdtempSync(join(scratch, 'slow-upgrade-capture-')),
      prepare: () => prepared,
      connect: wire.connect,
      onEvent: (event) => emitted.push(event),
      onState: () => undefined,
      onConnection: () => undefined,
    });
    cleanups.push(() => session.close());
    session.open();
    expect(session.prompt('Start on the hero')).toBe(true);
    expect(session.prompt('And the footer')).toBe(true);
    // Holds the direction only: `addressable()` arms a real timer, so no clock mock here can make
    // `STEER_ADDRESSABLE_MS` elapse during the install, and this cannot pin the window itself (ONL-2925).
    finish();
    await until(() => wire.sent.some((request) => request.method === 'turn/start'));
    answerTurn({ turn: { id: 'turn-1' } });
    await until(() =>
      wire.sent.some((request) => request.method === 'turn/steer') ||
      ofType(emitted, 'message.delivery').some((event) => event.outcome === 'refused'));
    expect(ofType(emitted, 'message.delivery').map((event) => event.outcome)).not.toContain('refused');
    expect(wire.sent.filter((request) => request.method === 'turn/steer')).toHaveLength(1);
    expect(ofType(emitted, 'session.error')).toHaveLength(0);
  });

  it('shows the saved conversation before a prompt typed while the runtime installs', async () => {
    const cwd = mkdtempSync(join(scratch, 'restore-order-cwd-'));
    rememberAppServerThread(cwd, 'thread-1');
    const wire = fakeWire((method) => (method === 'thread/resume' ? { thread: { id: 'thread-1' } } : HANDSHAKE(method)));
    const emitted: StudioEvent[] = [];
    const { promise: prepared, resolve: finish } = Promise.withResolvers<void>();
    const session = new AppServerSession({
      cwd,
      codexRoot,
      captureRoot: mkdtempSync(join(scratch, 'restore-order-capture-')),
      restoredEvents: savedConversation(cwd),
      prepare: () => prepared,
      connect: wire.connect,
      onEvent: (event) => emitted.push(event),
      onState: () => undefined,
      onConnection: () => undefined,
    });
    cleanups.push(() => session.close());
    session.open();
    expect(session.prompt('Keep this project working')).toBe(true);
    finish();
    await until(() => wire.sent.some((request) => request.method === 'turn/start'));
    const texts = foldSessionState(emitted).items.flatMap((item) => (item.kind === 'user' ? [item.text] : []));
    expect(texts).toEqual(['Make the hero two columns', 'Keep this project working']);
  });

  it('keeps the saved conversation on screen when codex refuses to resume it, and says so', async () => {
    const cwd = mkdtempSync(join(scratch, 'refused-resume-cwd-'));
    const { emitted } = await refusedResume(cwd, 'thread-1', [...savedConversation(cwd), ...failedLastTurn(cwd)]);
    const state = foldSessionState(emitted);
    expect(state.items.flatMap((item) => (item.kind === 'user' ? [item.text] : []))).toEqual(['Make the hero two columns', 'Keep this project working']);
    // Through the fold, not the wire: a second error row under a turn that already failed is swallowed.
    expect(state.items.at(-1)).toMatchObject({ kind: 'boundary', message: t('chat.codex.cannotContinue') });
    expect(state.items.filter((item) => item.kind === 'boundary')).toHaveLength(1);
    // The refusal is routine, so it raises no agent error of its own.
    expect(ofType(emitted, 'session.error').map((event) => event.message)).toEqual([t('chat.codex.notRunning')]);
    // The greeting belongs to an empty chat; under the rows it would read as their continuation.
    expect(ofType(emitted, 'session.welcome')).toHaveLength(0);
  });

  it('tells a prompt typed during the install that it is the one starting the new conversation', async () => {
    const cwd = mkdtempSync(join(scratch, 'refused-after-prompt-cwd-'));
    const { emitted } = await refusedResume(cwd, 'thread-1', savedConversation(cwd), 'Keep this project working');
    const state = foldSessionState(emitted);
    // The prompt is above the row, because nothing knew the thread was gone when it was accepted.
    expect(state.items.map((item) => item.kind)).toEqual(['user', 'assistant-text', 'user', 'boundary']);
    expect(state.items.at(-1)).toMatchObject({ message: t('chat.codex.cannotContinueAfterPrompt') });
  });

  it('marks each conversation it loses, and marks a replayed loss once', async () => {
    const first = mkdtempSync(join(scratch, 'second-loss-cwd-'));
    const carried: StudioEvent[] = [
      ...savedConversation(first),
      { type: 'session.boundary', sessionId: 'a-earlier', cwd: first, eventId: 'e5', seq: 5, ts: 5, message: t('chat.codex.cannotContinue'), threadId: 'thread-1' },
      { type: 'message.user', sessionId: 'a-earlier', cwd: first, eventId: 'e6', seq: 6, ts: 6, turnId: 't2', messageId: 'm2', text: 'Now the footer' },
    ];
    const lostAgain = foldSessionState((await refusedResume(first, 'thread-2', carried)).emitted);
    expect(lostAgain.items.map((item) => item.kind)).toEqual(['user', 'assistant-text', 'boundary', 'user', 'boundary']);

    const again = mkdtempSync(join(scratch, 'replayed-loss-cwd-'));
    const replayed = foldSessionState((await refusedResume(again, 'thread-1', [
      ...savedConversation(again),
      { type: 'session.boundary', sessionId: 'a-earlier', cwd: again, eventId: 'e5', seq: 5, ts: 5, message: t('chat.codex.cannotContinue'), threadId: 'thread-1' },
    ])).emitted);
    expect(replayed.items.filter((item) => item.kind === 'boundary')).toHaveLength(1);
  });

  it('does not connect after the project closes while its runtime is downloading', async () => {
    const wire = fakeWire(HANDSHAKE);
    const emitted: StudioEvent[] = [];
    const connections: AgentConnection[] = [];
    const { promise: prepared, resolve: finish } = Promise.withResolvers<void>();
    const session = new AppServerSession({
      cwd: mkdtempSync(join(scratch, 'closed-upgrade-cwd-')),
      codexRoot,
      captureRoot: mkdtempSync(join(scratch, 'closed-upgrade-capture-')),
      prepare: () => prepared,
      connect: wire.connect,
      onEvent: (event) => emitted.push(event),
      onState: () => undefined,
      onConnection: (connection) => connections.push(connection),
    });
    session.open();
    expect(session.prompt('Continue after the update')).toBe(true);
    await session.close();
    const connectionsAtClose = connections.length;
    finish();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(wire.sent).toHaveLength(0);
    expect(ofType(emitted, 'session.error')).toHaveLength(0);
    expect(connections).toHaveLength(connectionsAtClose);
  });
});

async function runningTurn(steerAnswer: (params: unknown) => unknown, connections: AgentConnection[] = []) {
  const wire = fakeWire((method, params) =>
    method === 'turn/steer' ? steerAnswer(params) : HANDSHAKE(method),
  );
  const emitted: StudioEvent[] = [];
  const states: BackendState[] = [];
  const cwd = mkdtempSync(join(scratch, 'cwd-'));
  const session = new AppServerSession({
    cwd,
    codexRoot,
    captureRoot: mkdtempSync(join(scratch, 'capture-')),
    connect: wire.connect,
    onEvent: (event) => emitted.push(event),
    onState: (state) => states.push(state),
    onConnection: (connection) => connections.push(connection),
  });
  cleanups.push(() => session.close());
  session.open();
  await until(() => wire.sent.some((s) => s.method === 'thread/start'));

  expect(session.prompt('first')).toBe(true);
  await until(() => wire.sent.some((s) => s.method === 'turn/start'));
  wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
  expect(session.isStreaming).toBe(true);
  return { wire, emitted, states, session };
}

describe('the posture the codex thread opens with (ONL-2190)', () => {
  it('security marks the Codex project untrusted before the server starts', async () => {
    resetUserEnvForTests(async () => ({}));
    cleanups.push(async () => resetUserEnvForTests());
    const wire = fakeWire(HANDSHAKE);
    const cwd = mkdtempSync(join(scratch, 'untrusted-project-'));
    let config: Record<string, string> | undefined;
    const session = new AppServerSession({
      cwd, codexRoot, captureRoot: scratch,
      connect: async (handlers, spawn) => {
        config = (await spawn()).config;
        return wire.connect(handlers);
      },
      onEvent: () => {}, onState: () => {}, onConnection: () => {},
    });
    cleanups.push(() => session.close());
    session.open();
    await until(() => wire.sent.some((entry) => entry.method === 'thread/start'));
    expect(config?.[`projects.${JSON.stringify(cwd)}.trust_level`]).toBe('"untrusted"');
  });
  it('gives captures Project ownership so cleanup finds them without a legacy thread id', async () => {
    const wire = fakeWire(HANDSHAKE);
    const cwd = mkdtempSync(join(scratch, 'capture-owner-'));
    const captureRoot = mkdtempSync(join(scratch, 'owned-capture-'));
    const session = new AppServerSession({
      cwd, codexRoot, captureRoot, connect: wire.connect,
      onEvent: () => {}, onState: () => {}, onConnection: () => {},
    });
    cleanups.push(() => session.close());
    session.open();
    await until(() => readCaptureFile(capturePath(captureRoot, 'thread-1')!).header !== undefined);
    expect(readCaptureFile(capturePath(captureRoot, 'thread-1')!).header?.projectKey).toBeDefined();
    expect(canClearProjectCaptures(captureRoot, cwd)).toBe(true);
    clearProjectCaptures(captureRoot, cwd);
    wire.frame({ method: 'account/updated', params: {} });
    expect(readCaptureFile(capturePath(captureRoot, 'thread-1')!).header).toBeUndefined();
  });
  it('declares all artifact tools and the single-document schema on a fresh conversation', async () => {
    const wire = fakeWire(HANDSHAKE);
    const session = new AppServerSession({
      cwd: mkdtempSync(join(scratch, 'fresh-artifact-tools-')),
      codexRoot,
      captureRoot: mkdtempSync(join(scratch, 'capture-artifacts-')),
      tools: inertToolSinks(),
      onEvent: () => {}, onState: () => {}, onConnection: () => {},
      connect: wire.connect,
    });
    cleanups.push(() => session.close());
    session.open();
    await until(() => wire.sent.some((request) => request.method === 'thread/start'));
    const params = wire.sent.find((request) => request.method === 'thread/start')?.params as {dynamicTools: {name: string; inputSchema: {properties: {pages?: {minItems: number; maxItems: number}}}}[]};
    const names = params.dynamicTools.map((tool) => tool.name);
    for (const name of ['create_artifact', 'read_artifact', 'set_artifact', 'import_artifact', 'place_artifact', 'fork_artifact']) expect(names).toContain(name);
    for (const name of ['create_artifact', 'set_artifact']) {
      expect(params.dynamicTools.find((tool) => tool.name === name)?.inputSchema.properties.pages).toMatchObject({minItems: 1, maxItems: 1});
    }
  });
  it('routes approvals to the user, on a fresh thread and on a resume', async () => {
    const { wire } = await runningTurn(() => ({ turnId: 'turn-1' }));
    const start = wire.sent.find((s) => s.method === 'thread/start');
    const params = start?.params as Record<string, unknown> | undefined;
    // Unset, codex resolves `auto_review` and a subagent answers instead of the user.
    expect(params?.approvalsReviewer).toBe('user');
    // `never` would make codex refuse every host tool with no request at all.
    expect(params?.approvalPolicy).toBe('on-request');
  });

  it('offers approve and deny only, with no always-allow to remember', async () => {
    const { wire, emitted } = await runningTurn(() => ({ turnId: 'turn-1' }));
    wire.ask('item/commandExecution/requestApproval', 'srv-1', {
      itemId: 'item-1',
      command: 'git push --force origin main',
      cwd: '/tmp/x',
      reason: 'network access required',
    });
    await until(() => emitted.some((e) => e.type === 'permission.requested'));
    const asked = emitted.find((e) => e.type === 'permission.requested');
    expect(asked?.options.map((o) => o.kind)).toEqual(['allow_once', 'reject_once']);
    expect(asked?.destructiveClass).toBe('force_push');
  });
});

describe('connector tool approvals (ONL-3087)', () => {
  const request = {
    threadId: 'thread-1',
    turnId: 'turn-1',
    serverName: 'codex_apps',
    mode: 'form',
    message: 'Allow Figma to import the selected designs?',
    requestedSchema: { type: 'object', properties: {} },
    _meta: {
      codex_approval_kind: 'mcp_tool_call',
      connector_name: 'Figma',
      tool_name: 'import_designs',
      tool_params: { fileKey: 'test-file' },
    },
  };

  for (const [optionId, action, status] of [
    ['allow_once', 'accept', 'completed'],
    ['reject_once', 'decline', 'denied'],
  ] as const) {
    test(`${optionId} answers the Figma request only after the user decides`, async () => {
      const { wire, emitted, session } = await runningTurn(() => ({ turnId: 'turn-1' }));
      wire.ask('mcpServer/elicitation/request', 0, request);
      expect(wire.answered).toEqual([]);
      const approval = emitted.find((event) => event.type === 'permission.requested');
      expect(approval).toBeDefined();
      if (approval === undefined) return;
      expect(approval.description).toBe(request.message);
      expect(approval.options.map((option) => option.kind)).toEqual(['allow_once', 'reject_once']);
      const folded = foldSessionState(emitted);
      expect(folded.awaitingApproval).toHaveLength(1);
      expect(folded.awaitingApproval[0]?.input).toMatchObject({ server: 'Figma', tool: 'import_designs', arguments: { fileKey: 'test-file' } });
      expect(session.respond(approval.requestId, 'allow_always')).toBe(false);
      expect(wire.answered).toEqual([]);
      expect(session.respond(approval.requestId, optionId)).toBe(true);
      expect(wire.answered).toEqual([{ id: 0, result: { action, content: null } }]);
      expect(foldSessionState(emitted).awaitingApproval).toHaveLength(0);
      expect(emitted.filter((event) => event.type === 'tool.end').find((event) => event.toolCallId === approval.toolCallId)?.status).toBe(status);
      expect(session.respond(approval.requestId, optionId)).toBe(false);
    });
  }

  test('simultaneous requests stay independent and Stop retires the remaining card', async () => {
    const { wire, emitted, session } = await runningTurn(() => ({ turnId: 'turn-1' }));
    wire.ask('mcpServer/elicitation/request', 1, request);
    wire.ask('mcpServer/elicitation/request', '1', request);
    const approvals = emitted.filter((event) => event.type === 'permission.requested');
    expect(approvals).toHaveLength(2);
    expect(new Set(approvals.map((event) => event.toolCallId)).size).toBe(2);
    session.respond(approvals[0]!.requestId, 'allow_once');
    expect(foldSessionState(emitted).awaitingApproval).toHaveLength(1);
    await session.interrupt();
    expect(foldSessionState(emitted).awaitingApproval).toHaveLength(0);
    expect(emitted.filter((event) => event.type === 'permission.resolved').map((event) => event.outcome)).toEqual(['allow_once', 'canceled']);
  });

  test('a reused wire id gets a fresh consent row with the new arguments', async () => {
    const { wire, emitted, session } = await runningTurn(() => ({ turnId: 'turn-1' }));
    wire.ask('mcpServer/elicitation/request', 1, request);
    const first = emitted.find((event) => event.type === 'permission.requested')!;
    session.respond(first.requestId, 'allow_once');
    wire.ask('mcpServer/elicitation/request', 1, { ...request, _meta: { ...request._meta, tool_params: { fileKey: 'new-file' } } });
    const current = foldSessionState(emitted).awaitingApproval;
    expect(current).toHaveLength(1);
    expect(current[0]?.toolCallId).not.toBe(first.toolCallId);
    expect(current[0]?.input).toMatchObject({ arguments: { fileKey: 'new-file' } });
  });
});

describe('a held codex approval reaches a terminal state (ONL-2190)', () => {
  async function held() {
    const made = await runningTurn(() => ({ turnId: 'turn-1' }));
    made.wire.ask('item/commandExecution/requestApproval', 'srv-1', {
      itemId: 'item-1',
      command: 'git push --force origin main',
      cwd: '/tmp/x',
      reason: 'network access required',
    });
    await until(() => made.emitted.some((e) => e.type === 'permission.requested'));
    return made;
  }

  it('an interrupt with a card open resolves it canceled', async () => {
    const { session, emitted } = await held();
    await session.interrupt();
    const resolved = emitted.find((e) => e.type === 'permission.resolved');
    expect(resolved?.outcome).toBe('canceled');
  });

  it('a close with a card open resolves it canceled, so a restored fold has nothing to answer', async () => {
    const { session, emitted } = await held();
    await session.close();
    const resolved = emitted.find((e) => e.type === 'permission.resolved');
    expect(resolved?.outcome).toBe('canceled');
    expect(foldSessionState(emitted).awaitingApproval).toHaveLength(0);
  });
});

describe('a prompt while a codex turn runs (ONL-2180)', () => {
  it('is accepted, sent as turn/steer against the running turn, and delivered at the next item', async () => {
    const { wire, emitted, states, session } = await runningTurn(() => ({ turnId: 'turn-1' }));

    expect(session.prompt('second')).toBe(true);
    const [, second] = ofType(emitted, 'message.user');
    expect(second?.delivery).toBe('steering');
    expect(second?.turnId).toBe(ofType(emitted, 'turn.started')[0]?.turnId);
    expect(ofType(emitted, 'turn.started')).toHaveLength(1);

    const steer = wire.sent.find((s) => s.method === 'turn/steer');
    expect(steer?.params).toEqual({
      threadId: 'thread-1',
      expectedTurnId: 'turn-1',
      input: [{ type: 'text', text: 'second' }],
    });
    expect(wire.sent.filter((s) => s.method === 'turn/start')).toHaveLength(1);

    await until(() => wire.sent.some((s) => s.method === 'turn/steer'));
    expect(ofType(emitted, 'message.delivery')).toEqual([]);
    wire.frame({
      method: 'item/started',
      params: { item: { type: 'agentMessage', id: 'item-2' } },
    });
    expect(ofType(emitted, 'message.delivery').map((d) => [d.messageId, d.outcome])).toEqual([
      [idOf(second), 'delivered'],
    ]);
    expect(session.midTurn).toBe('steer');
    expect(states.every((s) => s.midTurn === 'steer')).toBe(true);
    expect(ofType(emitted, 'session.error')).toEqual([]);
  });

  it('settles `refused`, says why from the catalog, and refuses the rest of that turn', async () => {
    const { wire, emitted, states, session } = await runningTurn(() => {
      throw new Error('turn/steer: activeTurnNotSteerable (review)');
    });

    expect(session.prompt('second')).toBe(true);
    const [, second] = ofType(emitted, 'message.user');
    await until(() => ofType(emitted, 'message.delivery').length > 0);

    expect(ofType(emitted, 'message.delivery').map((d) => [d.messageId, d.outcome])).toEqual([
      [idOf(second), 'refused'],
    ]);
    const [error] = ofType(emitted, 'session.error');
    expect(error?.code).toBe('unknown');
    expect(error?.message).toBe(t('chat.codex.midTurnRefused'));
    expect(session.midTurn).toBe('refuse');
    expect(states.at(-1)).toEqual({
      isStreaming: true,
      midTurn: 'refuse',
      needsAttention: false,
      turnWaitedMs: 0,
      isTurnLive: true,
    });

    expect(session.prompt('third')).toBe(false);
    expect(wire.sent.filter((s) => s.method === 'turn/steer')).toHaveLength(1);
    wire.frame({ method: 'item/started', params: { item: { type: 'agentMessage', id: 'item-3' } } });
    expect(ofType(emitted, 'message.delivery')).toHaveLength(1);

    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'completed' } } });
    expect(session.prompt('fourth')).toBe(true);
  });

  it('takes Studio’s own mid-turn prompt on the next turn after a refusal (ONL-2519)', async () => {
    let steers = 0;
    const { wire, emitted, session } = await runningTurn(() => {
      steers += 1;
      if (steers === 1) throw new Error('turn/steer: activeTurnNotSteerable (review)');
      return { turnId: 'turn-2' };
    });

    expect(session.prompt('second')).toBe(true);
    await until(() => session.midTurn === 'refuse');
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'completed' } } });
    expect(session.isStreaming).toBe(false);

    expect(session.prompt('third')).toBe(true);
    await until(() => startsSent(wire) === 2);
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-2' } } });
    expect(session.isStreaming).toBe(true);
    expect(session.midTurn).toBe('steer');

    expect(session.prompt('the dev server is on 3000', [], undefined, 'studio')).toBe(true);
    await until(() => wire.sent.filter((s) => s.method === 'turn/steer').length === 2);
    expect(wire.sent.filter((s) => s.method === 'turn/steer').at(-1)?.params).toEqual({
      threadId: 'thread-1',
      expectedTurnId: 'turn-2',
      input: [{ type: 'text', text: 'the dev server is on 3000' }],
    });
    expect(startsSent(wire)).toBe(2);
    expect(ofType(emitted, 'message.user').map((u) => u.text)).toEqual([
      'first',
      'second',
      'third',
      'the dev server is on 3000',
    ]);
  });

  it('a steer refused after the turn ended is stale: no downgrade, no error, and the text runs as its own turn', async () => {
    const { wire, emitted, states, session } = await runningTurn(() => {
      throw new Error('turn/steer: no active turn');
    });

    expect(session.prompt('second')).toBe(true);
    const [, second] = ofType(emitted, 'message.user');
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'completed' } } });
    expect(session.isStreaming).toBe(false);
    await until(() => wire.sent.filter((s) => s.method === 'turn/start').length === 2);

    const rerun = wire.sent.filter((s) => s.method === 'turn/start')[1];
    if (rerun === undefined) throw new Error('the text never ran as its own turn');
    expect((rerun.params as { input: unknown }).input).toEqual([{ type: 'text', text: 'second' }]);
    expect(ofType(emitted, 'message.delivery').map((d) => [d.messageId, d.outcome])).toEqual([
      [idOf(second), 'delivered'],
    ]);
    expect(ofType(emitted, 'session.error')).toEqual([]);
    expect(session.midTurn).toBe('steer');
    expect(states.every((s) => s.midTurn === 'steer')).toBe(true);
  });

  it('an accepted steer the turn ends without echoing settles `delivered` at the boundary, and the next turn speaks for nothing', async () => {
    const { wire, emitted, session } = await runningTurn(() => ({ turnId: 'turn-1' }));

    expect(session.prompt('second')).toBe(true);
    const [, second] = ofType(emitted, 'message.user');
    await until(() => wire.sent.some((s) => s.method === 'turn/steer'));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(ofType(emitted, 'message.delivery')).toEqual([]);

    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'completed' } } });
    expect(ofType(emitted, 'message.delivery').map((d) => [d.messageId, d.outcome])).toEqual([
      [idOf(second), 'delivered'],
    ]);

    expect(session.prompt('third')).toBe(true);
    await until(() => wire.sent.filter((s) => s.method === 'turn/start').length === 2);
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-2' } } });
    wire.frame({ method: 'item/started', params: { item: { type: 'agentMessage', id: 'item-9' } } });
    expect(ofType(emitted, 'message.delivery')).toHaveLength(1);
    expect(session.midTurn).toBe('steer');
  });

  it('carries no claim on a Studio-origin prompt, and still steers it', async () => {
    const { wire, emitted, session } = await runningTurn(() => ({ turnId: 'turn-1' }));

    expect(session.prompt('start the app', [], undefined, 'studio')).toBe(true);
    await until(() => wire.sent.some((s) => s.method === 'turn/steer'));
    const users = ofType(emitted, 'message.user');
    expect(users.map((u) => [u.origin, u.delivery])).toEqual([
      ['user', undefined],
      ['studio', undefined],
    ]);
    wire.frame({ method: 'item/started', params: { item: { type: 'agentMessage', id: 'item-2' } } });
    expect(ofType(emitted, 'message.delivery')).toEqual([]);
  });

  it('Stop and close settle the undelivered row `discarded`', async () => {
    const stopped = await runningTurn(() => ({ turnId: 'turn-1' }));
    expect(stopped.session.prompt('second')).toBe(true);
    const [, second] = ofType(stopped.emitted, 'message.user');
    await stopped.session.interrupt();
    expect(stopped.wire.sent.at(-1)).toEqual({
      method: 'turn/interrupt',
      params: { threadId: 'thread-1', turnId: 'turn-1' },
    });
    expect(ofType(stopped.emitted, 'message.delivery').map((d) => [d.messageId, d.outcome])).toEqual([
      [idOf(second), 'discarded'],
    ]);

    const closed = await runningTurn(() => ({ turnId: 'turn-1' }));
    expect(closed.session.prompt('second')).toBe(true);
    const [, closedSecond] = ofType(closed.emitted, 'message.user');
    await closed.session.close();
    expect(ofType(closed.emitted, 'message.delivery').map((d) => [d.messageId, d.outcome])).toEqual([
      [idOf(closedSecond), 'discarded'],
    ]);
  });
});

function deferred<T>() {
  let settle!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    settle = resolve;
  });
  return { promise, settle };
}

async function openedSession(
  answer: (method: string, params: unknown) => unknown = HANDSHAKE,
  extra: Partial<AppServerSessionOptions> = {},
) {
  const wire = fakeWire(answer);
  const emitted: StudioEvent[] = [];
  const states: BackendState[] = [];
  const session = new AppServerSession({
    cwd: mkdtempSync(join(scratch, 'cwd-')),
    codexRoot,
    captureRoot: mkdtempSync(join(scratch, 'capture-')),
    connect: wire.connect,
    onEvent: (event) => emitted.push(event),
    onState: (state) => states.push(state),
    onConnection: () => undefined,
    ...extra,
  });
  cleanups.push(() => session.close());
  session.open();
  await until(() => wire.sent.some((s) => s.method === 'thread/start'));
  return { wire, emitted, states, session };
}

const startsSent = (wire: { sent: Sent[] }): number =>
  wire.sent.filter((s) => s.method === 'turn/start').length;

const failedToStart = (emitted: StudioEvent[]) =>
  ofType(emitted, 'session.error').filter((row) => row.message === t('chat.codex.failedToStart'));

/** Opened without awaiting the handshake: these tests act while startup is still in flight. */
function startingSession(wire: { connect: AppServerSessionOptions['connect'] }, name: string) {
  const emitted: StudioEvent[] = [];
  const codes: string[] = [];
  const record: { ended?: SessionEndSummary } = {};
  const session = new AppServerSession({
    cwd: mkdtempSync(join(scratch, `${name}-`)),
    codexRoot,
    captureRoot: mkdtempSync(join(scratch, `${name}-capture-`)),
    connect: wire.connect,
    onEvent: (event) => emitted.push(event),
    onState: () => undefined,
    onConnection: () => undefined,
    onError: (code) => codes.push(code),
    onEnded: (summary) => { record.ended = summary; },
  });
  cleanups.push(() => session.close());
  session.open();
  return { session, emitted, codes, get ended(): SessionEndSummary | undefined { return record.ended; } };
}

describe('unanswered Codex turns and user resumes', () => {
  it('transport exit discards a pending steer and its late refusal cannot rerun the prompt', async () => {
    let refuse: ((error: Error) => void) | undefined;
    const { wire, session, emitted } = await runningTurn(() => new Promise((_resolve, reject) => { refuse = reject; }));
    expect(session.prompt('pending steer')).toBe(true);
    await until(() => refuse !== undefined);
    const message = ofType(emitted, 'message.user').at(-1);
    wire.exit();
    expect(ofType(emitted, 'message.delivery')).toContainEqual(expect.objectContaining({
      messageId: idOf(message), outcome: 'discarded',
    }));
    expect([session.isStreaming, session.isTurnLive]).toEqual([false, false]);
    refuse?.(new Error('transport exited'));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(startsSent(wire)).toBe(1);
  });

  it('a crash leaves a steer codex already took reading delivered, not discarded', async () => {
    const { wire, session, emitted } = await runningTurn(() => ({}));
    expect(session.prompt('also make it blue')).toBe(true);
    const steer = idOf(ofType(emitted, 'message.user').at(-1));
    await until(() => wire.sent.some((s) => s.method === 'turn/steer'));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    wire.exit();

    expect(ofType(emitted, 'message.delivery').filter((row) => row.messageId === steer))
      .toEqual([expect.objectContaining({ messageId: steer, outcome: 'delivered' })]);
  });

  it('late frames after close cannot append events or revive work', async () => {
    const { wire, session, emitted } = await openedSession();
    session.prompt('first');
    await until(() => startsSent(wire) === 1);
    await session.close();
    const count = emitted.length;
    wire.frame({ method: 'turn/started', params: { turn: { id: 'late' } } });
    wire.frame({ method: 'thread/status/changed', params: { threadId: 'thread-1', status: { type: 'active' } } });
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'late', status: 'completed' } } });
    wire.ask('item/commandExecution/requestApproval', 'late-approval', { itemId: 'late-tool', command: 'ls' });
    wire.ask('item/tool/requestUserInput', 'late-question', { itemId: 'late-question', questions: [] });
    wire.ask('item/tool/call', 'late-call', { callId: 'late-call', tool: 'read_file', arguments: {} });
    expect(emitted).toHaveLength(count);
    expect(session.needsAttention).toBe(false);
    expect([session.isStreaming, session.isTurnLive]).toEqual([false, false]);
  });

  it.each([['idle', false], ['with a prompt typed', true]] as const)(
    'an app-server that dies during startup reports the failure once, %s',
    async (_label, typed) => {
      const wire = fakeWire(HANDSHAKE, (method) => method === 'thread/start');
      const startup = startingSession(wire, 'startup-exit');
      const { session, emitted } = startup;
      await until(() => wire.sent.some((sent) => sent.method === 'thread/start'));
      let message: string | undefined;
      if (typed) {
        expect(session.prompt('pending startup')).toBe(true);
        message = idOf(ofType(emitted, 'message.user').at(-1));
      }
      wire.exit();
      await until(() => failedToStart(emitted).length > 0);
      expect(failedToStart(emitted)).toEqual([expect.objectContaining({ code: 'spawn_failed' })]);
      expect(startup.codes).toContain('spawn_failed');
      // Nothing reached the dead child, and the typed prompt reads undelivered rather than sent.
      expect(startsSent(wire)).toBe(0);
      if (message !== undefined) {
        expect(ofType(emitted, 'message.delivery'))
          .toContainEqual(expect.objectContaining({ messageId: message, outcome: 'discarded' }));
      }
      expect([session.isStreaming, session.isTurnLive]).toEqual([false, false]);
      await session.close();
      expect(startup.ended?.reason).toBe('error');
    },
  );

  it('a close during startup is a teardown, not a startup failure', async () => {
    const wire = fakeWire(HANDSHAKE, (method) => method === 'thread/start');
    const startup = startingSession(wire, 'startup-close');
    await until(() => wire.sent.some((sent) => sent.method === 'thread/start'));
    await startup.session.close();
    wire.exit();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(failedToStart(startup.emitted)).toEqual([]);
    expect(startup.codes).toEqual([]);
    expect(startup.ended?.reason).toBe('completed');
  });

  it('a crash mid-turn raises no failed-turn notification, in any tab', async () => {
    const delivered: StudioEvent[] = [];
    const emitted: StudioEvent[] = [];
    const notifications = new TurnNotifications((event) => delivered.push(event));
    let host: AppServerSession | undefined;
    const { wire, session } = await openedSession(HANDSHAKE, {
      onEvent: (event) => { emitted.push(event); notifications.observe(event, host); },
      onState: (state) => { if (host !== undefined) notifications.update(host, state); },
    });
    host = session;
    session.prompt('first');
    await until(() => startsSent(wire) === 1);
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    wire.exit();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    // The crash row and Retry are the surface; a background tab must not also be told the turn failed.
    expect(delivered.filter((event) => event.type === 'turn.ended')).toEqual([]);
    // `isError` is what tells project setup an agent failure from a missing app (ONL-3343).
    expect(emitted).toContainEqual(expect.objectContaining({ type: 'turn.ended', stopReason: 'provider_error', isError: true }));
  });

  it('a prompt sent after the transport exited is refused out loud, not in silence', async () => {
    const { wire, session, emitted } = await openedSession();
    wire.exit();
    await until(() => ofType(emitted, 'session.settings').some((row) => row.connectors?.unavailable === true));
    const before = ofType(emitted, 'session.error').length;
    // The host restarts a stale session first; when that bails the dead one still answers the user.
    expect(session.prompt('are you still there')).toBe(true);
    await until(() => ofType(emitted, 'session.error').length > before);
    expect(ofType(emitted, 'session.error').at(-1)?.message).toContain('app-server has exited');
  });

  it('an interrupt during teardown stays pending until its interrupted turn completes', async () => {
    let interrupt: Promise<void> | undefined;
    let interruptOnTeardown = false;
    const published: BackendState[] = [];
    const { wire, session } = await openedSession(HANDSHAKE, {
      onState: (state) => {
        published.push(state);
        if (!interruptOnTeardown || !state.turnEnding) return;
        interruptOnTeardown = false;
        interrupt = session.interrupt();
      },
    });
    session.prompt('first');
    await until(() => startsSent(wire) === 1);
    wire.ask('item/commandExecution/requestApproval', 'approval-teardown', { itemId: 'tool-teardown', command: 'ls' });
    const beforeTeardown = published.length;
    interruptOnTeardown = true;
    await session.interrupt();
    await interrupt;
    expect(interrupt).toBeDefined();
    expect(session.isTurnLive).toBe(true);
    const interrupts = wire.sent.filter((sent) => sent.method === 'turn/interrupt').length;
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    await until(() => wire.sent.filter((sent) => sent.method === 'turn/interrupt').length > interrupts);
    expect(wire.sent.filter((sent) => sent.method === 'turn/interrupt').at(-1)?.params)
      .toEqual({ threadId: 'thread-1', turnId: 'turn-1' });
    expect(published.slice(beforeTeardown).filter((state) => state.isStreaming && !state.needsAttention)
      .every((state) => state.turnEnding)).toBe(true);
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'interrupted' } } });
    expect([session.isStreaming, session.isTurnLive]).toEqual([false, false]);
  });

  it('ends a crashed Codex turn once without reporting a later phantom stall', async () => {
    for (const hadStall of [false, true]) {
      const turns: TurnSummary[] = [];
      const stalls: string[] = [];
      const { session, wire, emitted } = await openedSession(HANDSHAKE, {
        onTurnStalled: (turnId) => stalls.push(turnId),
        onTurnEnded: (summary) => turns.push(summary),
      });
      jest.useFakeTimers();
      session.prompt('first');
      for (let tick = 0; tick < 4; tick += 1) await new Promise<void>((resolve) => setImmediate(resolve));
      wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
      if (hadStall) jest.advanceTimersByTime(120_000);
      wire.exit();
      expect(turns).toHaveLength(1);
      expect(turns[0]).toMatchObject({ stopReason: 'provider_error', hadProviderStall: hadStall });
      expect(ofType(emitted, 'turn.ended')).toHaveLength(1);
      expect(ofType(emitted, 'turn.ended')[0]).toMatchObject({ isError: true });
      jest.advanceTimersByTime(240_000);
      expect(stalls).toHaveLength(hadStall ? 1 : 0);
      jest.useRealTimers();
      await session.close();
      expect(turns).toHaveLength(1);
    }
  });

  it('ends a locally accepted turn as error when Codex refuses to start it', async () => {
    const turns: TurnSummary[] = [];
    const { session, emitted } = await openedSession((method) => {
      if (method === 'turn/start') throw new Error('refused');
      return HANDSHAKE(method);
    }, { onTurnEnded: (summary) => turns.push(summary) });
    session.prompt('first');
    await until(() => turns.length === 1);
    expect(turns[0]).toMatchObject({ turnId: 't1', stopReason: 'error', hadProviderStall: false });
    expect(emitted.filter((row) => row.type === 'turn.ended')).toHaveLength(1);
    await session.close();
    expect(turns).toHaveLength(1);
  });

  it('records a turn before Codex answers and keeps the same id when its start notification arrives', async () => {
    const starts: string[] = [];
    const turns: TurnSummary[] = [];
    const { session, wire, emitted } = await openedSession(HANDSHAKE, {
      onTurnStarted: (turnId, origin) => starts.push(`${turnId}:${origin}`),
      onTurnEnded: (summary) => turns.push(summary),
    });
    session.prompt('continue', [], undefined, 'user', { origin: 'studio' });
    expect(starts).toEqual(['t1:user']);
    expect(emitted.filter((row) => row.type === 'message.user').at(-1)).toMatchObject({ origin: 'studio', turnId: 't1' });
    await until(() => startsSent(wire) === 1);
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    expect(starts).toEqual(['t1:user']);
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'completed' } } });
    expect(turns).toHaveLength(1);
    expect(turns[0]).toMatchObject({ turnId: 't1', origin: 'user' });
  });
});

describe('the live-turn fact the codex session publishes (ONL-2294)', () => {
  for (const origin of ['user', 'studio'] as const) for (const next of ['idle', 'continuation'] as const) {
    it(`retains ${origin} skill input when a continuation gap resolves to ${next} (ONL-2596)`, async () => {
      const cwd = mkdtempSync(join(scratch, 'gap-skills-'));
      const skill = { name: 'brand', description: 'Use the palette', path: join(cwd, '.agents/skills/brand/SKILL.md'), enabled: true };
      const summaries: TurnSummary[] = [];
      let starts = 0;
      const { wire, session, emitted } = await openedSession(method => {
        if (method === 'skills/list') return { data: [{ cwd, skills: [skill], errors: [] }] };
        if (method === 'turn/start') return { turn: { id: `turn-${++starts}` } };
        return HANDSHAKE(method);
      }, { cwd, onTurnEnded: summary => summaries.push(summary) });
      await until(() => foldSessionState(emitted).skills?.length === 1);
      session.prompt('first');
      await until(() => startsSent(wire) === 1);
      wire.frame({ method: 'thread/status/changed', params: { threadId: 'thread-1', status: { type: 'active', activeFlags: [] } } });
      wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
      wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'completed' } } });
      expect(session.prompt('Use brand in the header', [{ kind: 'skill', name: 'brand', description: skill.description, agent: 'codex', path: skill.path }], 'Keep the footer quiet', origin)).toBe(true);
      if (next === 'idle') wire.frame({ method: 'thread/status/changed', params: { threadId: 'thread-1', status: { type: 'idle' } } });
      else wire.frame({ method: 'turn/started', params: { turn: { id: 'continuation-1' } } });
      const method = next === 'idle' ? 'turn/start' : 'turn/steer';
      await until(() => next === 'idle' ? startsSent(wire) === 2 : wire.sent.some(frame => frame.method === method));
      const input = (wire.sent.filter(frame => frame.method === method).at(-1)!.params as { input: unknown[] }).input;
      expect(input).toContainEqual({ type: 'skill', name: 'brand', path: skill.path });
      expect(JSON.stringify(input)).toContain('Use brand in the header');
      expect(JSON.stringify(input)).toContain('Keep the footer quiet');
      expect(ofType(emitted, 'session.error')).toHaveLength(0);
      if (next === 'idle') {
        wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-2' } } });
        wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-2', status: 'completed' } } });
        await until(() => !session.isStreaming);
        expect(summaries.map(summary => summary.origin)).toEqual(['user', origin]);
      }
    });
  }

  it('holds a prompt in the continuation gap and steers the next turn (ONL-2596)', async () => {
    const { wire, session, emitted } = await openedSession();
    session.prompt('first');
    await until(() => startsSent(wire) === 1);
    wire.frame({ method: 'thread/status/changed', params: { threadId: 'thread-1', status: { type: 'active', activeFlags: [] } } });
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'completed' } } });
    expect(session.prompt('adjust the spacing')).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(ofType(emitted, 'message.delivery')).toHaveLength(0);
    expect(session.midTurn).toBe('steer');
    wire.frame({ method: 'turn/started', params: { turn: { id: 'continuation-1' } } });
    await until(() => wire.sent.some(frame => frame.method === 'turn/steer'));
    expect(wire.sent.find(frame => frame.method === 'turn/steer')?.params).toMatchObject({ expectedTurnId: 'continuation-1' });
    expect(startsSent(wire)).toBe(1);
    expect(ofType(emitted, 'session.error')).toHaveLength(0);
  });

  it('starts a queued gap prompt as a fresh turn if the thread becomes idle (ONL-2596)', async () => {
    const { wire, session, emitted, states } = await openedSession();
    session.prompt('first');
    await until(() => startsSent(wire) === 1);
    wire.frame({ method: 'thread/status/changed', params: { threadId: 'thread-1', status: { type: 'active', activeFlags: [] } } });
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'completed' } } });
    expect(session.prompt('adjust the spacing')).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(ofType(emitted, 'message.delivery')).toHaveLength(0);
    wire.frame({ method: 'thread/status/changed', params: { threadId: 'thread-1', status: { type: 'idle' } } });
    await until(() => startsSent(wire) === 2);
    expect(ofType(emitted, 'message.delivery').map(event => event.outcome)).toEqual(['delivered']);
    expect(ofType(emitted, 'session.error')).toHaveLength(0);
    expect(states.filter(state => !state.isStreaming)).toHaveLength(0);
  });

  it('retries a stale steer against the continuation instead of refusing it (ONL-2596)', async () => {
    let rejectSteer: ((error: Error) => void) | undefined;
    let attempts = 0;
    const { wire, emitted, session } = await runningTurn(() => {
      attempts += 1;
      if (attempts > 1) return { turnId: 'continuation-1' };
      return new Promise((_resolve, reject) => { rejectSteer = reject; });
    });
    wire.frame({ method: 'thread/status/changed', params: { threadId: 'thread-1', status: { type: 'active', activeFlags: [] } } });
    expect(session.prompt('adjust the spacing')).toBe(true);
    await until(() => rejectSteer !== undefined);
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'completed' } } });
    rejectSteer?.(new Error('turn/steer: no active turn'));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(ofType(emitted, 'message.delivery')).toHaveLength(0);
    wire.frame({ method: 'turn/started', params: { turn: { id: 'continuation-1' } } });
    await until(() => attempts === 2);
    expect(wire.sent.filter(frame => frame.method === 'turn/steer').at(-1)?.params).toMatchObject({ expectedTurnId: 'continuation-1' });
    expect(startsSent(wire)).toBe(1);
    expect(ofType(emitted, 'session.error')).toHaveLength(0);
  });

  it('keeps both gap prompts when idle opens a replacement turn (ONL-2596)', async () => {
    let starts = 0;
    const { wire, session, emitted, states } = await openedSession((method) => {
      if (method === 'turn/start') return { turn: { id: `turn-${++starts}` } };
      return HANDSHAKE(method);
    });
    session.prompt('first');
    await until(() => startsSent(wire) === 1);
    wire.frame({ method: 'thread/status/changed', params: { threadId: 'thread-1', status: { type: 'active', activeFlags: [] } } });
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'completed' } } });
    session.prompt('adjust spacing');
    session.prompt('and color');
    wire.frame({ method: 'thread/status/changed', params: { threadId: 'thread-1', status: { type: 'idle' } } });
    await until(() => wire.sent.some(frame => frame.method === 'turn/steer'));
    expect(startsSent(wire)).toBe(2);
    expect(wire.sent.find(frame => frame.method === 'turn/steer')?.params).toMatchObject({ expectedTurnId: 'turn-2' });
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-2', status: 'completed' } } });
    await until(() => ofType(emitted, 'message.delivery').length === 2);
    expect(ofType(emitted, 'message.delivery').map(event => event.outcome)).toEqual(['delivered', 'delivered']);
    expect(ofType(emitted, 'session.error')).toHaveLength(0);
    expect(session.midTurn).toBe('steer');
    expect(states.filter(state => !state.isStreaming)).toHaveLength(1);
  });

  it.each(['user', 'studio'] as const)('does not restart a stopped %s prompt after a delayed steer rejection (ONL-2596)', async origin => {
    let rejectSteer: ((error: Error) => void) | undefined;
    const { wire, session, emitted } = await runningTurn(() => new Promise((_resolve, reject) => { rejectSteer = reject; }));
    expect(session.prompt('adjust the spacing', [], undefined, origin)).toBe(true);
    await until(() => rejectSteer !== undefined);
    await session.interrupt();
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'interrupted' } } });
    rejectSteer?.(new Error('turn/steer: no active turn'));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(startsSent(wire)).toBe(1);
    expect(session.isStreaming).toBe(false);
    expect(ofType(emitted, 'session.error')).toHaveLength(0);
    expect(ofType(emitted, 'message.delivery').map(event => event.outcome)).toEqual(origin === 'user' ? ['discarded'] : []);
  });

  it('starts a Studio gap prompt as a fresh Studio turn when the thread becomes idle (ONL-2596)', async () => {
    const summaries: TurnSummary[] = [];
    let starts = 0;
    const { wire, session, emitted } = await openedSession(method => {
      if (method === 'turn/start') return { turn: { id: `turn-${++starts}` } };
      return HANDSHAKE(method);
    }, { onTurnEnded: summary => summaries.push(summary) });
    session.prompt('first');
    await until(() => startsSent(wire) === 1);
    wire.frame({ method: 'thread/status/changed', params: { threadId: 'thread-1', status: { type: 'active', activeFlags: [] } } });
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'completed' } } });
    expect(session.prompt('server started', [], undefined, 'studio')).toBe(true);
    wire.frame({ method: 'thread/status/changed', params: { threadId: 'thread-1', status: { type: 'idle' } } });
    await until(() => startsSent(wire) === 2);
    expect(session.isStreaming).toBe(true);
    expect(wire.sent.filter(frame => frame.method === 'turn/start').at(-1)?.params).toMatchObject({ input: [{ type: 'text', text: 'server started' }] });
    expect(ofType(emitted, 'message.delivery')).toHaveLength(0);
    expect(ofType(emitted, 'session.error')).toHaveLength(0);
    expect(session.midTurn).toBe('steer');
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-2' } } });
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-2', status: 'completed' } } });
    await until(() => !session.isStreaming);
    expect(summaries.map(summary => summary.origin)).toEqual(['user', 'studio']);
  });

  it('does not call a waiting gap prompt delivered before its steer reaches the wire (ONL-2596)', async () => {
    const { wire, session, emitted } = await openedSession();
    session.prompt('first');
    await until(() => startsSent(wire) === 1);
    wire.frame({ method: 'thread/status/changed', params: { threadId: 'thread-1', status: { type: 'active', activeFlags: [] } } });
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'completed' } } });
    session.prompt('adjust spacing');
    wire.frame({ method: 'turn/started', params: { turn: { id: 'continuation-1' } } });
    wire.frame({ method: 'item/started', params: { item: { type: 'agentMessage', id: 'before-steer' } } });
    expect(ofType(emitted, 'message.delivery')).toHaveLength(0);
    await until(() => wire.sent.some(frame => frame.method === 'turn/steer'));
    wire.frame({ method: 'item/started', params: { item: { type: 'agentMessage', id: 'after-steer' } } });
    expect(ofType(emitted, 'message.delivery').map(event => event.outcome)).toEqual(['delivered']);
  });

  for (const action of ['interrupt', 'close'] as const) {
    it(`${action} discards a prompt waiting in the continuation gap (ONL-2596)`, async () => {
      const { wire, session, emitted } = await openedSession();
      session.prompt('first');
      await until(() => startsSent(wire) === 1);
      wire.frame({ method: 'thread/status/changed', params: { threadId: 'thread-1', status: { type: 'active', activeFlags: [] } } });
      wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
      wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'completed' } } });
      session.prompt('adjust the spacing');
      await session[action]();
      wire.frame({ method: 'turn/started', params: { turn: { id: 'continuation-1' } } });
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(ofType(emitted, 'message.delivery').map(event => event.outcome)).toEqual(['discarded']);
      expect(wire.sent.filter(frame => frame.method === 'turn/steer')).toHaveLength(0);
      expect(startsSent(wire)).toBe(1);
      expect(ofType(emitted, 'session.error')).toHaveLength(0);
    });
  }

  it('keeps Working across a completed turn while its thread remains active (ONL-2596)', async () => {
    const { wire, session, states } = await openedSession();
    session.prompt('first');
    await until(() => startsSent(wire) === 1);
    wire.frame({ method: 'thread/status/changed', params: { threadId: 'thread-1', status: { type: 'active', activeFlags: [] } } });
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'completed' } } });
    expect(session.isStreaming).toBe(true);
    expect(session.isTurnLive).toBe(true);
    expect(states.filter(state => !state.isStreaming)).toHaveLength(0);
    wire.frame({ method: 'turn/started', params: { turn: { id: 'continuation-1' } } });
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'continuation-1', status: 'completed' } } });
    expect(session.isStreaming).toBe(true);
    wire.frame({ method: 'thread/status/changed', params: { threadId: 'thread-1', status: { type: 'idle' } } });
    expect(session.isStreaming).toBe(false);
    expect(session.isTurnLive).toBe(false);
    expect(states.filter(state => !state.isStreaming)).toHaveLength(1);
    expect(startsSent(wire)).toBe(1);
  });

  it('counts an unsolicited turn even without thread status notifications (ONL-2596)', async () => {
    const { wire, session } = await openedSession();
    wire.frame({ method: 'turn/started', params: { turn: { id: 'continuation-1' } } });
    expect(session.isTurnLive).toBe(true);
    expect(session.isStreaming).toBe(true);
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'continuation-1', status: 'completed' } } });
    expect(session.isTurnLive).toBe(false);
    expect(session.isStreaming).toBe(false);
  });

  it('applies Stop in the gap to the next continuation turn (ONL-2596)', async () => {
    const { wire, session } = await openedSession();
    session.prompt('first');
    await until(() => startsSent(wire) === 1);
    wire.frame({ method: 'thread/status/changed', params: { threadId: 'thread-1', status: { type: 'active', activeFlags: [] } } });
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'completed' } } });
    await session.interrupt();
    wire.frame({ method: 'turn/started', params: { turn: { id: 'continuation-1' } } });
    await until(() => wire.sent.some(frame => frame.method === 'turn/interrupt'));
    expect(wire.sent.find(frame => frame.method === 'turn/interrupt')?.params).toEqual({ threadId: 'thread-1', turnId: 'continuation-1' });
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'continuation-1', status: 'interrupted' } } });
    expect(session.isStreaming).toBe(false);
  });

  it('ignores another thread’s status and settles an interrupted active thread (ONL-2596)', async () => {
    const { wire, session } = await openedSession();
    session.prompt('first');
    await until(() => startsSent(wire) === 1);
    wire.frame({ method: 'thread/status/changed', params: { threadId: 'thread-1', status: { type: 'active', activeFlags: [] } } });
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    wire.frame({ method: 'thread/status/changed', params: { threadId: 'other-thread', status: { type: 'idle' } } });
    expect(session.isStreaming).toBe(true);
    await session.interrupt();
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'interrupted' } } });
    expect(session.isStreaming).toBe(false);
    expect(session.isTurnLive).toBe(false);
  });

  it('rises on the accept, before codex has named the turn, and falls at turn/completed', async () => {
    const { wire, session, states } = await openedSession();
    expect(session.isTurnLive).toBe(false);

    expect(session.prompt('first')).toBe(true);
    await until(() => wire.sent.some((s) => s.method === 'turn/start'));
    expect(session.isTurnLive).toBe(true);
    expect(states.at(-1)?.isTurnLive).toBe(true);

    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'completed' } } });
    expect(session.isTurnLive).toBe(false);
    expect(states.at(-1)?.isTurnLive).toBe(false);
  });

  it('falls before the `turn.ended` row is pushed, which is the opposite of Claude', async () => {
    const order: string[] = [];
    const { wire, session } = await openedSession(HANDSHAKE, {
      onEvent: (event) => order.push(`event:${event.type}`),
      onState: (state) => order.push(`live:${String(state.isTurnLive)}`),
    });
    expect(session.prompt('first')).toBe(true);
    await until(() => wire.sent.some((s) => s.method === 'turn/start'));
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'completed' } } });

    expect(order.lastIndexOf('live:false')).toBeLessThan(order.lastIndexOf('event:turn.ended'));
  });

  it('names a crash mid-turn and asks the host to restart, without reporting an error code', async () => {
    let exited = 0;
    const codes: string[] = [];
    const { wire, session, emitted } = await openedSession(HANDSHAKE, { onExited: () => (exited += 1), onError: (code) => codes.push(code) });
    expect(session.prompt('first')).toBe(true);
    await until(() => wire.sent.some((s) => s.method === 'turn/start'));
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    wire.exit();
    expect(emitted.filter((event) => event.type === 'session.error').map((event) => event.type === 'session.error' && event.code)).toEqual(['spawn_failed']);
    expect([exited, codes]).toEqual([1, []]);
  });

  it('an idle exit restarts quietly, and an exit after close says nothing', async () => {
    let exited = 0;
    const idle = await openedSession(HANDSHAKE, { onExited: () => (exited += 1) });
    idle.wire.exit();
    expect([exited, idle.emitted.some((event) => event.type === 'session.error')]).toEqual([1, false]);

    const closed = await openedSession(HANDSHAKE, { onExited: () => (exited += 1) });
    await closed.session.close();
    closed.wire.exit();
    expect([exited, closed.emitted.some((event) => event.type === 'session.error')]).toEqual([1, false]);
  });

  it('falls when the child exits with a turn still owed', async () => {
    const { wire, session } = await openedSession();
    expect(session.prompt('first')).toBe(true);
    await until(() => wire.sent.some((s) => s.method === 'turn/start'));

    wire.exit();
    expect(session.isTurnLive).toBe(false);
  });

  for (const termination of ['systemError', 'notLoaded', 'exit'] as const) {
    it(`marks ${termination} after a primitive completion as abnormal settlement`, async () => {
      const { wire, session, states } = await openedSession();
      expect(session.prompt('first')).toBe(true);
      await until(() => wire.sent.some((sent) => sent.method === 'turn/start'));
      wire.frame({ method: 'thread/status/changed', params: { threadId: 'thread-1', status: { type: 'active' } } });
      wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
      wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'completed' } } });
      expect(session.isTurnLive).toBe(true);
      if (termination === 'exit') wire.exit();
      else wire.frame({ method: 'thread/status/changed', params: { threadId: 'thread-1', status: { type: termination } } });
      expect(states.at(-1)).toMatchObject({ isTurnLive: false, isStreaming: false, turnEnding: true });
    });
  }

  it('does not mark a synchronously released prompt as abnormal settlement', async () => {
    const states: BackendState[] = [];
    let release: (() => void) | undefined;
    const { wire, session } = await openedSession(HANDSHAKE, {
      onState: (state) => {
        states.push(state);
        if (!state.isTurnLive && state.turnEnding && release !== undefined) {
          const prompt = release;
          release = undefined;
          prompt();
        }
      },
    });
    session.prompt('first');
    await until(() => wire.sent.some((sent) => sent.method === 'turn/start'));
    wire.frame({ method: 'thread/status/changed', params: { threadId: 'thread-1', status: { type: 'active' } } });
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'completed' } } });
    release = () => { expect(session.prompt('released')).toBe(true); };
    wire.frame({ method: 'thread/status/changed', params: { threadId: 'thread-1', status: { type: 'systemError' } } });
    expect(states.at(-1)).toMatchObject({ isTurnLive: true, isStreaming: true });
    expect(states.at(-1)?.turnEnding).toBeUndefined();
  });
});

describe('the working row leaves Done when the prompt is accepted (ONL-2383)', () => {
  it('reports streaming on accept, before codex has said anything at all', async () => {
    const { session, states } = await openedSession();

    expect(session.prompt('first')).toBe(true);
    expect(session.isStreaming).toBe(true);
    expect(states.at(-1)).toEqual({
      isStreaming: true,
      midTurn: 'steer',
      needsAttention: false,
      turnWaitedMs: 0,
      isTurnLive: true,
    });
  });

  it('the inbound turn/started adds no second report — the dedupe holds', async () => {
    const { wire, session, states } = await openedSession();

    expect(session.prompt('first')).toBe(true);
    await until(() => startsSent(wire) === 1);
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });

    expect(states.filter((s) => s.isStreaming)).toHaveLength(1);
    expect(session.isStreaming).toBe(true);
  });

  it('settles once at turn/completed, and the next prompt raises Working again', async () => {
    const { wire, session, states } = await openedSession();

    expect(session.prompt('first')).toBe(true);
    await until(() => startsSent(wire) === 1);
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'completed' } } });

    expect(session.isStreaming).toBe(false);
    expect(states.filter((s) => !s.isStreaming)).toHaveLength(1);

    expect(session.prompt('second')).toBe(true);
    expect(session.isStreaming).toBe(true);
    await until(() => startsSent(wire) === 2);
  });

  it('a prompt sent before the turn is addressable steers it — never a second turn/start', async () => {
    const gate = deferred<unknown>();
    const { wire, emitted, session } = await openedSession((method) =>
      method === 'turn/start' ? gate.promise : HANDSHAKE(method),
    );

    expect(session.prompt('first')).toBe(true);
    await until(() => startsSent(wire) === 1);
    expect(session.prompt('second')).toBe(true);

    gate.settle({ turn: { id: 'turn-1' } });
    await until(() => wire.sent.some((s) => s.method === 'turn/steer'));

    expect(wire.sent.find((s) => s.method === 'turn/steer')?.params).toEqual({
      threadId: 'thread-1',
      expectedTurnId: 'turn-1',
      input: [{ type: 'text', text: 'second' }],
    });
    expect(startsSent(wire)).toBe(1);
    expect(ofType(emitted, 'session.error')).toEqual([]);
    expect(session.midTurn).toBe('steer');
  });

  it('a prompt waits for the replacement turn after a late refused steer', async () => {
    const nextStart = deferred<unknown>();
    let starts = 0;
    const { wire, emitted, session } = await openedSession((method) => {
      if (method === 'turn/start' && ++starts === 2) return nextStart.promise;
      if (method === 'turn/steer' && starts === 1) throw new Error('turn/steer: no active turn');
      return HANDSHAKE(method);
    });
    expect(session.prompt('first')).toBe(true);
    await until(() => startsSent(wire) === 1);
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    expect(session.prompt('second')).toBe(true);
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'completed' } } });
    await until(() => startsSent(wire) === 2);

    expect(session.prompt('third')).toBe(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    expect(ofType(emitted, 'session.error')).toEqual([]);
    nextStart.settle({ turn: { id: 'turn-2' } });
    await until(() => wire.sent.filter((s) => s.method === 'turn/steer').length === 2);
    expect(wire.sent.filter((s) => s.method === 'turn/steer').at(-1)?.params).toEqual({
      threadId: 'thread-1', expectedTurnId: 'turn-2', input: [{ type: 'text', text: 'third' }],
    });
    expect(startsSent(wire)).toBe(2);
    expect(session.midTurn).toBe('steer');
  });

  it('a refused turn/start settles the row rather than stranding it on Working', async () => {
    const { wire, emitted, session } = await openedSession((method) => {
      if (method === 'turn/start') throw new Error('turn/start: thread is busy');
      return HANDSHAKE(method);
    });

    expect(session.prompt('first')).toBe(true);
    expect(session.isStreaming).toBe(true);
    await until(() => startsSent(wire) === 1);
    await until(() => !session.isStreaming);

    expect(ofType(emitted, 'session.error').at(-1)?.message).toContain('thread is busy');
  });

  it('a codex that dies mid-turn settles the row', async () => {
    const { wire, session } = await openedSession();

    expect(session.prompt('first')).toBe(true);
    await until(() => startsSent(wire) === 1);
    wire.exit();

    expect(session.isStreaming).toBe(false);
  });

  it('a close while a prompt waits for an addressable turn neither hangs nor errors', async () => {
    const gate = deferred<unknown>();
    const { wire, emitted, session } = await openedSession((method) =>
      method === 'turn/start' ? gate.promise : HANDSHAKE(method),
    );

    expect(session.prompt('first')).toBe(true);
    await until(() => startsSent(wire) === 1);
    expect(session.prompt('second')).toBe(true);

    await session.close();
    gate.settle({ turn: { id: 'turn-1' } });
    await until(() => !session.isStreaming);

    expect(wire.sent.some((s) => s.method === 'turn/steer')).toBe(false);
    expect(ofType(emitted, 'message.delivery').map((d) => d.outcome)).toEqual(['discarded']);
  });
});

const RAW_QUESTION = {
  id: 'display_choice',
  header: 'Preference',
  question: 'Which option do you prefer?',
  isOther: true,
  isSecret: false,
  options: [
    { label: 'tabs', description: 'Use tabs.' },
    { label: 'windows', description: 'Use windows.' },
  ],
};

function askUserInput(
  wire: ReturnType<typeof fakeWire>,
  requestId: string | number,
  itemId: string,
  questions: unknown[],
): void {
  wire.ask('item/tool/requestUserInput', requestId, {
    threadId: 'thread-1',
    turnId: 'turn-1',
    itemId,
    questions,
    isBlocking: false,
    autoResolutionMs: null,
  });
}

function permissionRequested(events: StudioEvent[]) {
  const [request] = ofType(events, 'permission.requested');
  if (request === undefined) throw new Error('no permission.requested');
  return request;
}

const toolEnds = (events: StudioEvent[]) =>
  ofType(events, 'tool.end').map((e) => [e.toolCallId, e.status]);

describe('AppServerSession — structured questions (ONL-2215)', () => {
  test('mints exactly one tool row and one permission.requested, with the mapped questions, and holds the row open until answered', async () => {
    const { wire, emitted } = await openedSession();

    askUserInput(wire, 0, 'call_1', [RAW_QUESTION]);

    expect(ofType(emitted, 'tool.start').map((e) => [e.toolCallId, e.name])).toEqual([['call_1', QUESTION_TOOL]]);
    expect(ofType(emitted, 'permission.requested')).toHaveLength(1);
    const request = permissionRequested(emitted);
    expect(request.toolCallId).toBe('call_1');
    expect(request.questions).toEqual([
      {
        question: 'Which option do you prefer?',
        header: 'Preference',
        options: [
          { label: 'tabs', description: 'Use tabs.' },
          { label: 'windows', description: 'Use windows.' },
        ],
      },
    ]);

    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'interrupted' } } });
    expect(toolEnds(emitted)).toEqual([['call_1', 'canceled']]);
  });

  test('respond() answers with the codex-keyed shape and closes the row', async () => {
    const { wire, emitted, session } = await openedSession();
    askUserInput(wire, 0, 'call_2', [RAW_QUESTION]);
    const request = permissionRequested(emitted);

    session.respond(request.requestId, 'allow', { 'Which option do you prefer?': 'tabs' });

    expect(wire.answered).toEqual([{ id: 0, result: { answers: { display_choice: { answers: ['tabs'] } } } }]);
    expect(toolEnds(emitted)).toEqual([['call_2', 'completed']]);
  });

  test('a question with fewer than two real options soft-fails instead of rendering an empty picker', async () => {
    const { wire, emitted } = await openedSession();

    askUserInput(wire, 1, 'call_3', [{ id: 'q', header: 'H', question: 'Q?', options: [] }]);

    expect(wire.refused).toEqual([1]);
    expect(ofType(emitted, 'permission.requested')).toEqual([]);
  });
});

describe('AppServerSession — the setup card a project without a working setup never sees (ONL-2499)', () => {
  const registered = new Set<string>();
  let project: (setup: 'verified' | 'none') => string;

  beforeAll(() => {
    const stateDir = mkdtempSync(join(scratch, 'codex-approval-state-'));
    const state = createSetupState(() => stateDir);
    const version = versionDefinition({
      prepare: '',
      install: { script: 'bun install', inputs: ['package.json'], outputs: ['node_modules'] },
      servers: [{ id: 'web', cwd: '.', start: 'bun run dev', port: 3000 }],
    });
    // One cwd per session: codex resumes a remembered thread instead of starting one when a cwd comes back.
    project = (setup) => {
      const cwd = mkdtempSync(join(scratch, 'codex-approval-project-'));
      if (setup === 'verified') state.write(cwd, { ...emptyRecord(), saved: version, verified: version });
      registered.add(cwd);
      return cwd;
    };
    resetProjectSetupForTesting();
    initializeProjectSetup({ state, allowed: (cwd) => registered.has(cwd), report: async () => undefined });
  });

  const callSetup = async (cwd: string, tool: string) => {
    const made = await openedSession(HANDSHAKE, { tools: inertToolSinks(), cwd });
    made.wire.ask('item/tool/call', 11, {
      threadId: 'thread-1',
      turnId: 'turn-1',
      callId: 'call_setup',
      tool,
      arguments: {},
    });
    return made;
  };

  test('runs save and run without raising a request, and still mints the row', async () => {
    for (const tool of [PROJECT_SETUP_TOOL_NAMES.save, PROJECT_SETUP_TOOL_NAMES.run]) {
      const { wire, emitted } = await callSetup(project('none'), tool);
      expect(ofType(emitted, 'permission.requested')).toEqual([]);
      expect(ofType(emitted, 'tool.start').map((e) => [e.toolCallId, e.name, e.status])).toEqual([
        ['call_setup', tool, 'in_progress'],
      ]);
      await until(() => wire.answered.length > 0);
      expect(wire.answered).toMatchObject([{ id: 11 }]);
    }
  });

  test('raises the request once the project has a verified setup', async () => {
    const { emitted } = await callSetup(project('verified'), PROJECT_SETUP_TOOL_NAMES.save);
    expect(ofType(emitted, 'permission.requested').map((e) => e.toolName)).toEqual([
      PROJECT_SETUP_TOOL_NAMES.save,
    ]);
  });
});

describe('AppServerSession — destructive project file deletion approval', () => {
  for (const decision of ['allow_once', 'reject_once'] as const) {
    test(`waits for ${decision} before reaching the deletion sink`, async () => {
      const paths: string[] = [];
      const { wire, emitted, session } = await openedSession(HANDSHAKE, {
        tools: {
          ...inertToolSinks(),
          onDeleteProjectFile: (path) => {
            paths.push(path);
            return { ok: true, path };
          },
        },
      });
      wire.ask('item/tool/call', 2606, {
        threadId: 'thread-1', turnId: 'turn-1', callId: 'delete_2606',
        tool: DELETE_PROJECT_FILE_TOOL_NAME, arguments: { path: 'src/old.ts' },
      });
      const request = permissionRequested(emitted);
      expect(request.toolName).toBe(DELETE_PROJECT_FILE_TOOL_NAME);
      expect(paths).toEqual([]);
      expect(wire.answered).toEqual([]);
      session.respond(request.requestId, decision);
      await until(() => wire.answered.length > 0);
      expect(paths).toEqual(decision === 'allow_once' ? ['src/old.ts'] : []);
      expect(wire.answered).toMatchObject([{ id: 2606, result: { success: decision === 'allow_once' } }]);
    });
  }
});

describe('AppServerSession — a declined host tool ends denied (ONL-2304)', () => {
  test('the deny branch ends the row denied, tells codex the call failed, and the item/completed that follows cannot turn it failed', async () => {
    const { wire, emitted, session } = await openedSession(HANDSHAKE, { tools: inertToolSinks() });
    wire.ask('item/tool/call', 7, {
      threadId: 'thread-1',
      turnId: 'turn-1',
      callId: 'call_7',
      tool: UNDO_CANVAS_TOOL_NAME,
      arguments: {},
    });
    const request = permissionRequested(emitted);
    expect(request.toolCallId).toBe('call_7');

    session.respond(request.requestId, 'reject_once');
    wire.frame({
      method: 'item/completed',
      params: { item: { type: 'dynamicToolCall', id: 'call_7', tool: UNDO_CANVAS_TOOL_NAME, status: 'completed', success: false } },
    });

    expect(wire.answered).toMatchObject([{ id: 7, result: { success: false } }]);
    expect(toolEnds(emitted)).toEqual([['call_7', 'denied']]);
    expect(ofType(emitted, 'permission.resolved')).toMatchObject([{ toolCallId: 'call_7', outcome: 'deny' }]);
  });
});

describe('the attention fact the codex session publishes (ONL-2455)', () => {
  const firstRequestId = (events: StudioEvent[]): string => permissionRequested(events).requestId;

  const askApproval = (wire: ReturnType<typeof fakeWire>, requestId: number, itemId: string): void => {
    wire.ask('item/commandExecution/requestApproval', requestId, {
      threadId: 'thread-1',
      turnId: 'turn-1',
      itemId,
      command: 'ls',
      cwd: '/tmp/workspace',
    });
  };

  test('says attention while a question is parked, and not once it is answered', async () => {
    const { wire, session, emitted, states } = await openedSession();

    askUserInput(wire, 0, 'call_1', [RAW_QUESTION]);
    expect(session.needsAttention).toBe(true);
    expect(states.at(-1)).toEqual({
      isStreaming: false,
      midTurn: 'steer',
      needsAttention: true,
      questionParkedSince: expect.any(Number),
      turnWaitedMs: 0,
      isTurnLive: false,
    });

    session.respond(firstRequestId(emitted), 'allow', { 'Which option do you prefer?': 'tabs' });
    expect(session.needsAttention).toBe(false);
    expect(states.at(-1)).toEqual({
      isStreaming: false,
      midTurn: 'steer',
      needsAttention: false,
      questionParkedSince: undefined,
      turnWaitedMs: expect.any(Number),
      isTurnLive: false,
    });
  });

  test('publishes it on its own, because streaming never moved', async () => {
    const { wire, states } = await openedSession();
    const before = states.length;

    askApproval(wire, 3, 'call_3');

    expect(states).toHaveLength(before + 1);
    expect(states.at(-1)?.isStreaming).toBe(false);
    expect(states.at(-1)?.needsAttention).toBe(true);
  });

  test('says it for a parked approval until the answer, declined included', async () => {
    const { wire, session, emitted, states } = await openedSession();

    askApproval(wire, 4, 'call_4');
    expect(session.needsAttention).toBe(true);

    session.respond(firstRequestId(emitted), 'reject_once');
    expect(session.needsAttention).toBe(false);
    expect(states.at(-1)?.needsAttention).toBe(false);
  });

  test('says it for a host tool held for approval', async () => {
    const { wire, session, emitted } = await openedSession(HANDSHAKE, { tools: inertToolSinks() });

    wire.ask('item/tool/call', 5, {
      threadId: 'thread-1',
      turnId: 'turn-1',
      callId: 'call_5',
      tool: UNDO_CANVAS_TOOL_NAME,
      arguments: {},
    });
    expect(session.needsAttention).toBe(true);

    session.respond(firstRequestId(emitted), 'reject_once');
    expect(session.needsAttention).toBe(false);
  });

  test('is the count, not the last one: answering one of two keeps attention and re-says nothing', async () => {
    const { wire, session, emitted, states } = await openedSession();

    askApproval(wire, 6, 'call_6');
    askApproval(wire, 7, 'call_7');
    const afterBoth = states.length;

    session.respond(firstRequestId(emitted), 'allow_once');
    expect(session.needsAttention).toBe(true);
    expect(states).toHaveLength(afterBoth);
  });

  it('drops it at the turn boundary, which ends the row the card hangs on', async () => {
    const { wire, session, states } = await runningTurn(() => ({ turnId: 'turn-1' }));

    askApproval(wire, 9, 'call_9');
    expect(session.needsAttention).toBe(true);
    expect(states.at(-1)?.needsAttention).toBe(true);

    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'aborted' } } });
    expect(session.needsAttention).toBe(false);
    expect(states.at(-1)?.needsAttention).toBe(false);
  });

  it('drops it on an interrupt, which is what Stop leaves behind', async () => {
    const { wire, session } = await runningTurn(() => ({ turnId: 'turn-1' }));

    askApproval(wire, 10, 'call_10');
    expect(session.needsAttention).toBe(true);

    await session.interrupt();
    expect(session.needsAttention).toBe(false);
  });

  test('drops it when close clears what was parked', async () => {
    const { wire, session, states } = await openedSession();

    askApproval(wire, 8, 'call_8');
    expect(session.needsAttention).toBe(true);

    await session.close();
    expect(session.needsAttention).toBe(false);
    expect(states.at(-1)?.needsAttention).toBe(false);
  });
});

describe('the rate-limit snapshot the session holds (ONL-2197)', () => {
  it('keeps a newer sparse notification that arrives before the snapshot continuation', async () => {
    const resetsAt = Math.floor(Date.now() / 1000) + 86400;
    const wire = fakeWire((method) => {
      if (method !== 'account/rateLimits/read') return HANDSHAKE(method);
      wire.frame({ method: 'account/rateLimits/updated', params: { rateLimits: { secondary: { usedPercent: 100 } } } });
      return { rateLimits: { secondary: { usedPercent: 99, windowDurationMins: 10080, resetsAt } } };
    });
    const emitted: StudioEvent[] = [];
    const session = new AppServerSession({
      cwd: mkdtempSync(join(scratch, 'snapshot-order-')), codexRoot,
      captureRoot: mkdtempSync(join(scratch, 'snapshot-order-capture-')), connect: wire.connect,
      onEvent: (event) => emitted.push(event), onState: () => undefined, onConnection: () => undefined,
    });
    cleanups.push(() => session.close());
    session.open();
    await until(() => wire.sent.some((request) => request.method === 'thread/start'));
    expect(foldSessionState(emitted).limits).toEqual([{ kind: 'secondary', usedPercent: 100, windowDurationMins: 10080, resetsAt }]);
  });

  it('reads the weekly limit before the first refused turn after opening', async () => {
    const resetsAt = Math.floor(Date.now() / 1000) + 86400;
    const { wire, emitted, session } = await openedSession((method) => method === 'account/rateLimits/read'
      ? { rateLimits: { secondary: { usedPercent: 100, windowDurationMins: 10080, resetsAt } } }
      : HANDSHAKE(method));
    expect(wire.sent.filter((request) => request.method === 'account/rateLimits/read')).toHaveLength(1);
    expect(session.prompt('Try again')).toBe(true);
    await until(() => startsSent(wire) === 1);
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'failed', error: { codexErrorInfo: 'usageLimitExceeded', message: 'You have hit your usage limit.' } } } });
    const row = foldSessionState(emitted).items.find((item) => item.kind === 'error');
    expect(row?.kind === 'error' ? row.code : undefined).toBe('usage_limit_exceeded');
    expect(row?.kind === 'error' ? row.limit : undefined).toEqual({ window: 'weekly', resetsAt });
  });

  it('can open and send when the account snapshot is unavailable', async () => {
    const { session, wire } = await openedSession((method) => {
      if (method === 'account/rateLimits/read') throw new Error('Not available for this account');
      return HANDSHAKE(method);
    });
    expect(session.prompt('Continue')).toBe(true);
    await until(() => startsSent(wire) === 1);
  });

  it('survives the turn it was reported in, because it is account state and not turn state', async () => {
    const { wire, emitted, session } = await runningTurn(() => ({ turnId: 'turn-1' }));

    wire.frame({
      method: 'account/rateLimits/updated',
      params: {
        rateLimits: {
          limitName: 'Weekly limit',
          primary: { usedPercent: 40, windowDurationMins: 300, resetsAt: 1790000000 },
        },
      },
    });
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1' } } });
    await until(() => !session.isStreaming);

    expect(session.prompt('second')).toBe(true);
    await until(() => wire.sent.filter((s) => s.method === 'turn/start').length === 2);
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-2' } } });
    wire.frame({
      // Sparse by contract: an omitted field is unavailable, not cleared.
      method: 'account/rateLimits/updated',
      params: { rateLimits: { primary: { usedPercent: 55 } } },
    });

    const windows = ofType(emitted, 'usage.limits').at(-1)?.windows ?? [];
    const primary = windows.find((window) => window.kind === 'primary');
    expect(primary?.usedPercent).toBe(55);
    expect(primary?.label).toBe('Weekly limit');
    expect(primary?.resetsAt).toBe(1790000000);
  });
});

describe('a turn codex fails on a refused credential (ONL-2114)', () => {
  const REFUSED =
    'unexpected status 401 Unauthorized: Missing bearer or basic authentication in header, url: https://api.openai.com/v1/responses, cf-ray: x, request id: y';

  it('reports codex signed out after the connect it reported on open', async () => {
    const connections: AgentConnection[] = [];
    const { wire, emitted, session } = await runningTurn(() => ({}), connections);

    // Real codex retries first; each retry is an `error` notification that does not end the turn.
    wire.frame({
      method: 'error',
      params: {
        error: { message: 'Reconnecting... 2/5', codexErrorInfo: { responseStreamDisconnected: { httpStatusCode: 401 } }, additionalDetails: REFUSED },
        willRetry: true,
        threadId: 'thread-1',
        turnId: 'turn-1',
      },
    });
    wire.frame({
      method: 'turn/completed',
      params: { turn: { id: 'turn-1', status: 'failed', error: { message: REFUSED, codexErrorInfo: 'other', additionalDetails: null } } },
    });
    await until(() => !session.isStreaming);

    expect(connections).toEqual([
      { status: 'ok', harness: 'codex' },
      { status: 'unauthenticated', harness: 'codex' },
    ]);
    expect(ofType(emitted, 'session.error').map((error) => error.code)).toEqual(['unauthenticated']);
  });

  it('a turn that completes adds nothing to the connect', async () => {
    const connections: AgentConnection[] = [];
    const { wire, session } = await runningTurn(() => ({}), connections);

    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'completed' } } });
    await until(() => !session.isStreaming);

    expect(connections).toEqual([{ status: 'ok', harness: 'codex' }]);
  });
});

describe('every abandoned codex request writes a terminal outcome (ONL-2190)', () => {
  test('a held host tool call is retired by close, and a later answer reports it was not accepted', async () => {
    const { wire, emitted, session } = await openedSession(HANDSHAKE, { tools: inertToolSinks() });
    wire.ask('item/tool/call', 7, {
      threadId: 'thread-1',
      turnId: 'turn-1',
      callId: 'call_7',
      tool: UNDO_CANVAS_TOOL_NAME,
      arguments: {},
    });
    const request = permissionRequested(emitted);

    await session.close();

    expect(ofType(emitted, 'permission.resolved')).toMatchObject([
      { toolCallId: 'call_7', outcome: 'canceled' },
    ]);
    expect(toolEnds(emitted)).toEqual([['call_7', 'canceled']]);
    expect(foldSessionState(emitted).awaitingApproval).toHaveLength(0);
    expect(session.respond(request.requestId, 'allow_once')).toBe(false);
  });

  test('a parked question is retired the same way', async () => {
    const { wire, emitted, session } = await openedSession();
    askUserInput(wire, 0, 'call_1', [RAW_QUESTION]);
    const request = permissionRequested(emitted);

    await session.close();

    expect(ofType(emitted, 'permission.resolved')).toMatchObject([
      { toolCallId: 'call_1', outcome: 'canceled' },
    ]);
    expect(foldSessionState(emitted).awaitingApproval).toHaveLength(0);
    expect(session.respond(request.requestId, 'allow_once')).toBe(false);
  });
});

describe('the permission mode codex publishes (ONL-2190)', () => {
  test('accepts the one posture it enforces and refuses every other', async () => {
    const { session } = await openedSession();
    expect(await session.setPermissionMode('danger-full-access')).toBe(true);
    for (const mode of ['default', 'acceptEdits', 'auto', 'plan', 'read-only', 'workspace-write'] as const) {
      expect(await session.setPermissionMode(mode)).toBe(false);
    }
  });
});

describe('a codex model pick (ONL-2542)', () => {
  test('offers GPT-6.2 Sol and Astra and uses the catalog default for the next turn', async () => {
    const { session, emitted, wire } = await openedSession((method, params) => {
      if (method === 'model/list') return {
        data: [
          { id: 'gpt-6.2-sol', displayName: 'GPT-6.2 Sol', isDefault: true },
          { id: 'gpt-6.2-astra', displayName: 'GPT-6.2 Astra', isDefault: false },
        ],
      };
      if (method === 'thread/start') return { thread: { id: 'thread-1' }, model: (params as { model: string }).model };
      return HANDSHAKE(method);
    });
    expect(foldSessionState(emitted)).toMatchObject({
      model: 'gpt-6.2-sol',
      models: [
        { value: 'gpt-6.2-sol', displayName: 'GPT-6.2 Sol' },
        { value: 'gpt-6.2-astra', displayName: 'GPT-6.2 Astra' },
      ],
    });
    session.prompt('Update the heading.');
    await until(() => startsSent(wire) === 1);
    expect(wire.sent.find((request) => request.method === 'turn/start')?.params).toMatchObject({ model: 'gpt-6.2-sol' });
  });

  test('keeps a saved model when the catalog default changes to Sol', async () => {
    const { emitted } = await openedSession((method, params) => {
      if (method === 'model/list') return {
        data: [{ id: 'gpt-6.2-sol', displayName: 'GPT-6.2 Sol', isDefault: true }],
      };
      if (method === 'thread/start') return { thread: { id: 'thread-1' }, model: (params as { model: string }).model };
      return HANDSHAKE(method);
    }, { model: 'gpt-6.1-sol' });
    expect(foldSessionState(emitted).model).toBe('gpt-6.1-sol');
  });

  test('offers GPT 6.1 Sol with its reported efforts and sends the selected model on the next turn (ONL-2741)', async () => {
    const { session, emitted, wire } = await openedSession((method) => method === 'model/list' ? {
      data: [{
        id: 'gpt-6.1-sol',
        displayName: 'GPT-6.1-Sol',
        supportedReasoningEfforts: [{ reasoningEffort: 'medium' }, { reasoningEffort: 'high' }],
      }],
    } : HANDSHAKE(method));
    expect(foldSessionState(emitted).models).toEqual([{
      value: 'gpt-6.1-sol',
      displayName: 'GPT-6.1-Sol',
      supportsEffort: true,
      supportedEffortLevels: ['medium', 'high'],
    }]);
    expect(await session.setModel('gpt-6.1-sol')).toStrictEqual({ accepted: true });
    session.prompt('Use the selected model.');
    await until(() => startsSent(wire) === 1);
    expect(wire.sent.find((request) => request.method === 'turn/start')?.params).toMatchObject({ model: 'gpt-6.1-sol' });
  });

  test('is accepted and announced at once, since codex checks the model per turn', async () => {
    const { session, emitted } = await openedSession();
    expect(await session.setModel('gpt-5.5')).toStrictEqual({ accepted: true });
    expect(foldSessionState(emitted).model).toBe('gpt-5.5');
  });
});

describe('what the session reports about a finished turn (ONL-2463)', () => {
  it('reports Codex retry notifications without inventing an attempt count (ONL-2524)', async () => {
    const summaries: TurnSummary[] = [];
    const { wire, session } = await openedSession(HANDSHAKE, { onTurnEnded: summary => summaries.push(summary) });
    session.prompt('first');
    await until(() => startsSent(wire) === 1);
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    wire.frame({ method: 'error', params: { willRetry: true, error: { message: 'Reconnecting', codexErrorInfo: { responseStreamDisconnected: { httpStatusCode: 503 } } } } });
    wire.frame({ method: 'turn/completed', params: { turn: { id: 'turn-1', status: 'completed' } } });
    expect(summaries[0]).toMatchObject({ retryAttempts: null, retryObservedCount: 1, retryLastStatus: 503 });
  });

  const turnEnded = async (
    origin: PromptOrigin,
  ): Promise<{ summaries: TurnSummary[]; wire: ReturnType<typeof fakeWire> }> => {
    const summaries: TurnSummary[] = [];
    const { wire, session } = await openedSession(HANDSHAKE, {
      onTurnEnded: (summary) => summaries.push(summary),
    });
    expect(session.prompt('make the hero cobalt', [], undefined, origin)).toBe(true);
    await until(() => wire.sent.some((s) => s.method === 'turn/start'));
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    wire.frame({
      method: 'turn/completed',
      params: { turn: { id: 'turn-1', status: 'completed', error: null } },
    });
    return { summaries, wire };
  };

  it('stamps the turn with the origin of the prompt that opened it', async () => {
    const typed = await turnEnded('user');
    expect(typed.summaries).toHaveLength(1);
    expect(typed.summaries[0]?.origin).toBe('user');

    const sent = await turnEnded('studio');
    expect(sent.summaries[0]?.origin).toBe('studio');

    const tapped = await turnEnded('suggestion');
    expect(tapped.summaries[0]?.origin).toBe('suggestion');
  });

  it('reports the session end once, before the transport is torn down', async () => {
    const ends: SessionEndSummary[] = [];
    const closes: string[] = [];
    const { session } = await openedSession(HANDSHAKE, {
      onEnded: (end) => {
        ends.push(end);
        closes.push('ended');
      },
    });
    await session.close();
    await session.close();
    expect(ends).toHaveLength(1);
    expect(ends[0]?.reason).toBe('completed');
    expect(typeof ends[0]?.durationMs).toBe('number');
  });

  it('ends a session that could not start with the error reason, and reports the code', async () => {
    // No thread is started on this path, so the session is built directly rather than through the opener.
    const ends: SessionEndSummary[] = [];
    const codes: string[] = [];
    const connections: AgentConnection[] = [];
    const wire = fakeWire(HANDSHAKE);
    const session = new AppServerSession({
      cwd: mkdtempSync(join(scratch, 'cwd-')),
      codexRoot,
      captureRoot: mkdtempSync(join(scratch, 'capture-')),
      connect: wire.connect,
      onEvent: () => undefined,
      onState: () => undefined,
      onConnection: (connection) => connections.push(connection),
      setupProblem: 'codex is not installed',
      onEnded: (end) => ends.push(end),
      onError: (code) => codes.push(code),
    });
    session.open();
    await until(() => codes.length > 0);
    expect(codes).toEqual(['cli_missing']);
    expect(connections.at(-1)).toEqual({ status: 'cli_missing', harness: 'codex' });
    await session.close();
    expect(ends[0]?.reason).toBe('error');
  });
});

describe('a refused steer re-runs with its own origin (ONL-2463)', () => {
  it.each(['user', 'studio'] as const)('preserves %s origin instead of inheriting the target turn', async origin => {
    const summaries: TurnSummary[] = [];
    let refuse = false;
    const { wire, session } = await openedSession(
      (method) => {
        if (method === 'turn/steer' && refuse) throw new Error('turn already completed');
        return HANDSHAKE(method);
      },
      { onTurnEnded: (summary) => summaries.push(summary) },
    );

    const initialOrigin = origin === 'user' ? 'studio' : 'user';
    expect(session.prompt('get it serving', [], undefined, initialOrigin)).toBe(true);
    await until(() => wire.sent.some((s) => s.method === 'turn/start'));
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });

    refuse = true;
    expect(session.prompt('make the hero cobalt', [], undefined, origin)).toBe(true);
    wire.frame({
      method: 'turn/completed',
      params: { turn: { id: 'turn-1', status: 'completed', error: null } },
    });
    await until(() => wire.sent.filter((s) => s.method === 'turn/start').length === 2);
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-2' } } });
    wire.frame({
      method: 'turn/completed',
      params: { turn: { id: 'turn-2', status: 'completed', error: null } },
    });

    await until(() => summaries.length === 2);
    expect(summaries[0]?.origin).toBe(initialOrigin);
    expect(summaries[1]?.origin).toBe(origin);
  });
});

// codex asks through `request_user_input` since ONL-2494, so a turn that pauses on a question is
// the ordinary shape rather than an edge case.
describe('a turn that stops to ask still reports one turn (ONL-2463, ONL-2494)', () => {
  const RAW_ASK = {
    question: 'Which option do you prefer?',
    header: 'Preference',
    options: [
      { label: 'tabs', description: 'Use tabs.' },
      { label: 'windows', description: 'Use windows.' },
    ],
  };

  it('does not end the turn at the question, and the question is not an edit', async () => {
    const summaries: TurnSummary[] = [];
    const { wire, emitted, session } = await openedSession(HANDSHAKE, {
      onTurnEnded: (summary) => summaries.push(summary),
    });
    expect(session.prompt('set up the layout')).toBe(true);
    await until(() => wire.sent.some((s) => s.method === 'turn/start'));
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });

    askUserInput(wire, 0, 'call_1', [RAW_ASK]);
    await until(() => emitted.some((e) => e.type === 'permission.requested'));
    // The question alone ends nothing: the turn is still the agent's.
    expect(summaries).toHaveLength(0);

    const request = permissionRequested(emitted);
    expect(session.respond(request.requestId, 'allow', { 'Which option do you prefer?': 'tabs' })).toBe(true);
    wire.frame({
      method: 'turn/completed',
      params: { turn: { id: 'turn-1', status: 'completed', error: null } },
    });
    await until(() => summaries.length >= 1);

    // One turn, and the answered question is a tool call rather than a changed file.
    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.filesChanged).toBe(0);
    expect(summaries[0]?.executeTargets).toBe(0);
    expect(summaries[0]?.toolCallCount).toBeGreaterThan(0);
  });

  it('ends the session sensibly when the question is never answered', async () => {
    const summaries: TurnSummary[] = [];
    const ends: SessionEndSummary[] = [];
    const { wire, emitted, session } = await openedSession(HANDSHAKE, {
      onTurnEnded: (summary) => summaries.push(summary),
      onEnded: (end) => ends.push(end),
    });
    expect(session.prompt('set up the layout')).toBe(true);
    await until(() => wire.sent.some((s) => s.method === 'turn/start'));
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    askUserInput(wire, 0, 'call_1', [RAW_ASK]);

    await session.close();

    // The row is retired rather than left open, and a retired question is not a completed edit.
    expect(toolEnds(emitted)).toContainEqual(['call_1', 'canceled']);
    expect(ends).toHaveLength(1);
    expect(ends[0]?.reason).toBe('interrupted');
    // The turn the user walked away from is reported as the interrupt it was, not as an edit.
    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.stopReason).toBe('session_closed');
    expect(summaries[0]?.filesChanged).toBe(0);
  });
});

describe('a turn the teardown killed still reports (ONL-2463)', () => {
  it('reports it interrupted, separably from a user Stop, and never as an edit', async () => {
    const summaries: TurnSummary[] = [];
    const { wire, session } = await openedSession(HANDSHAKE, {
      onTurnEnded: (summary) => summaries.push(summary),
    });
    expect(session.prompt('start the long one')).toBe(true);
    await until(() => wire.sent.some((s) => s.method === 'turn/start'));
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });

    // No `turn/completed`: the user quit while it ran.
    await session.close();

    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.stopReason).toBe('session_closed');
    expect(summaries[0]?.filesChanged).toBe(0);
  });

  it('adds nothing for a turn that already reported', async () => {
    const summaries: TurnSummary[] = [];
    const { wire, session } = await openedSession(HANDSHAKE, {
      onTurnEnded: (summary) => summaries.push(summary),
    });
    expect(session.prompt('a short one')).toBe(true);
    await until(() => wire.sent.some((s) => s.method === 'turn/start'));
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    wire.frame({
      method: 'turn/completed',
      params: { turn: { id: 'turn-1', status: 'completed', error: null } },
    });
    await until(() => summaries.length >= 1);

    await session.close();

    // The tally reports once, so the close finds nothing left to report (ONL-2180).
    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.stopReason).toBe('completed');
  });
});

describe('the pause the codex session publishes while it holds a question (ONL-2295)', () => {
  const firstRequestId = (events: StudioEvent[]): string => permissionRequested(events).requestId;

  const askApproval = (wire: ReturnType<typeof fakeWire>, requestId: number, itemId: string): void => {
    wire.ask('item/commandExecution/requestApproval', requestId, {
      threadId: 'thread-1',
      turnId: 'turn-1',
      itemId,
      command: 'ls',
      cwd: '/tmp/workspace',
    });
  };

  test('names the moment it parked, and clears it on the answer', async () => {
    const { wire, session, emitted, states } = await openedSession();

    askUserInput(wire, 0, 'call_1', [RAW_QUESTION]);
    expect(states.at(-1)?.questionParkedSince).toEqual(expect.any(Number));

    session.respond(firstRequestId(emitted), 'allow', { 'Which option do you prefer?': 'tabs' });
    expect(states.at(-1)?.questionParkedSince).toBeUndefined();
    expect(states.at(-1)?.turnWaitedMs).toEqual(expect.any(Number));
  });

  test('does not pause for a plain approval', async () => {
    const { wire, states } = await openedSession();

    askApproval(wire, 7, 'call_7');

    expect(states.at(-1)?.needsAttention).toBe(true);
    expect(states.at(-1)?.questionParkedSince).toBeUndefined();
  });

  test('does not pause for a question codex sent with no answerable option', async () => {
    const { wire, states } = await openedSession();

    askUserInput(wire, 8, 'call_8', [{ ...RAW_QUESTION, options: [] }]);

    expect(states.at(-1)?.questionParkedSince).toBeUndefined();
  });

  test('stays paused until the last of two questions is answered', async () => {
    const { wire, session, emitted, states } = await openedSession();

    askUserInput(wire, 0, 'call_1', [RAW_QUESTION]);
    const parkedAt = states.at(-1)?.questionParkedSince;
    askUserInput(wire, 1, 'call_2', [RAW_QUESTION]);
    expect(states.at(-1)?.questionParkedSince).toBe(parkedAt);

    const requests = emitted.filter((e) => e.type === 'permission.requested');
    const [first, second] = requests as Extract<StudioEvent, { type: 'permission.requested' }>[];
    session.respond(second?.requestId ?? '', 'allow', { 'Which option do you prefer?': 'tabs' });
    expect(states.at(-1)?.questionParkedSince).toBe(parkedAt);

    session.respond(first?.requestId ?? '', 'allow', { 'Which option do you prefer?': 'tabs' });
    expect(states.at(-1)?.questionParkedSince).toBeUndefined();
  });

  test('leaves nothing parked when an interrupt lands on an open question', async () => {
    const { wire, session, states } = await openedSession();

    askUserInput(wire, 0, 'call_1', [RAW_QUESTION]);
    expect(states.at(-1)?.questionParkedSince).toEqual(expect.any(Number));

    await session.interrupt();

    expect(states.at(-1)?.questionParkedSince).toBeUndefined();
  });
});

describe('what the codex turn reports about the wait it held (ONL-2295)', () => {
  const RAW_PICK = {
    id: 'display_choice',
    header: 'Preference',
    question: 'Which option do you prefer?',
    isOther: true,
    isSecret: false,
    options: [
      { label: 'tabs', description: 'Use tabs.' },
      { label: 'windows', description: 'Use windows.' },
    ],
  };

  /** Real, and short: the park stamps `Date.now()` inside the session, so there is no clock to drive. */
  const held = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 20));

  async function parked() {
    const made = await openedSession();
    expect(made.session.prompt('set up the layout')).toBe(true);
    await until(() => made.wire.sent.some((s) => s.method === 'turn/start'));
    made.wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    askUserInput(made.wire, 0, 'call_1', [RAW_PICK]);
    await until(() => made.emitted.some((e) => e.type === 'permission.requested'));
    return made;
  }

  const complete = (wire: ReturnType<typeof fakeWire>): void => {
    wire.frame({
      method: 'turn/completed',
      params: { turn: { id: 'turn-1', status: 'completed', error: null } },
    });
  };

  test('the answered turn carries the wait it banked', async () => {
    const { wire, emitted, session } = await parked();
    await held();

    const request = permissionRequested(emitted);
    expect(session.respond(request.requestId, 'allow', { 'Which option do you prefer?': 'tabs' })).toBe(true);
    complete(wire);
    await until(() => emitted.some((e) => e.type === 'turn.ended'));

    const ended = ofType(emitted, 'turn.ended').at(-1);
    expect(ended?.waitedMs ?? 0).toBeGreaterThanOrEqual(15);
  });

  test('a turn that ends on the question still banks the open wait', async () => {
    const { wire, emitted } = await parked();
    await held();

    // Never answered: the turn boundary is what banks it, or the settled row counts the wait as work.
    complete(wire);
    await until(() => emitted.some((e) => e.type === 'turn.ended'));

    const ended = ofType(emitted, 'turn.ended').at(-1);
    expect(ended?.waitedMs ?? 0).toBeGreaterThanOrEqual(15);
  });

  test('a turn that held no question reports a zero wait', async () => {
    const { wire, emitted, session } = await openedSession();
    expect(session.prompt('just do it')).toBe(true);
    await until(() => wire.sent.some((s) => s.method === 'turn/start'));
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    complete(wire);
    await until(() => emitted.some((e) => e.type === 'turn.ended'));

    expect(ofType(emitted, 'turn.ended').at(-1)?.waitedMs).toBe(0);
  });

  test('the turn after an answered question opens with the wait zeroed', async () => {
    const { wire, emitted, session, states } = await parked();
    await held();
    const request = permissionRequested(emitted);
    session.respond(request.requestId, 'allow', { 'Which option do you prefer?': 'tabs' });
    complete(wire);
    await until(() => emitted.some((e) => e.type === 'turn.ended'));
    expect(states.at(-1)?.turnWaitedMs ?? 0).toBeGreaterThanOrEqual(15);

    expect(session.prompt('now the next thing')).toBe(true);
    await until(() => wire.sent.filter((s) => s.method === 'turn/start').length >= 2);
    wire.frame({ method: 'turn/started', params: { turn: { id: 'turn-2' } } });
    await until(() => (states.at(-1)?.turnWaitedMs ?? -1) === 0);

    // The row rises a round trip before `turn/started` resets the bank; without a publish there
    // the renderer anchors the new turn on the previous turn's wait and reads 0.0s for its length.
    expect(states.at(-1)?.turnWaitedMs).toBe(0);
  });
});
