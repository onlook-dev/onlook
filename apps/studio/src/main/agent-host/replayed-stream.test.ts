import { afterEach, describe, expect, it } from 'bun:test';
import { fileURLToPath } from 'node:url';
import type { StudioEvent } from '@studio/events';
import { replayedQuery } from './replayed-stream.js';
import { AgentSession } from './session.js';
import { join } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import { readProjectAttachment } from '../images/store.js';
import { STARTER_PORT_RANGE } from '../starter/port.js';

const TOOLS_TURN = fileURLToPath(new URL('../../../../../tests/live/recordings/claude/tools.jsonl', import.meta.url));
const LIVE = 'answered by this run';

const sessions: AgentSession[] = [];

it('replayed connector controls use only a loopback fixture and preserve the SDK control contract', async () => {
  const calls: string[] = [];
  const server = Bun.serve({ hostname: '127.0.0.1', port: 0, async fetch(request): Promise<Response> {
    const { method, input } = await request.json() as { method: string; input: { name?: string } };
    calls.push(method);
    return Response.json(method === 'mcpAuthenticate' ? { authUrl: `http://127.0.0.1:${server.port}/authorize/${input.name}`, requiresUserAction: true } : method === 'mcpServerStatus' ? [{ name: 'mobbin', status: 'needs-auth' }] : {});
  } });
  const path = join(makeStateRoot({ name: 'replayed-controls' }), 'controls.jsonl');
  writeFileSync(path, `${JSON.stringify({ type: 'replay.controls', url: `http://127.0.0.1:${server.port}` })}\n`);
  async function* silent(): AsyncGenerator<never> { yield* []; }
  try {
    const replay = replayedQuery(path)({ prompt: silent() }) as ReturnType<ReturnType<typeof replayedQuery>> & { mcpAuthenticate(name: string): Promise<{ requiresUserAction: boolean }> };
    expect(await replay.mcpServerStatus()).toEqual([{ name: 'mobbin', status: 'needs-auth' }]);
    await replay.reloadPlugins();
    expect(await replay.mcpAuthenticate('mobbin')).toMatchObject({ requiresUserAction: true });
    expect(calls).toEqual(['mcpServerStatus', 'reloadPlugins', 'mcpAuthenticate']);
    writeFileSync(path, JSON.stringify({ type: 'replay.controls', url: 'https://provider.test' }));
    expect(() => replayedQuery(path)({ prompt: silent() })).toThrow('loopback');
  } finally { await server.stop(true); }
});
afterEach(async () => {
  await Promise.all(sessions.splice(0).map((session) => session.close()));
  cleanupTempFixtures();
});

it('replayed Claude questions wait for the live answer instead of returning the recorded one', async () => {
  const path = join(makeStateRoot({ name: 'replayed-question' }), 'question.jsonl');
  writeFileSync(path, [
    { type: 'assistant', message: { id: 'ask', content: [{ type: 'tool_use', id: 'question', name: 'AskUserQuestion', input: { questions: [{ question: 'Which layout?', header: 'Layout', multiSelect: true, options: [{ label: 'Grid', description: 'Compact' }, { label: 'List', description: 'Spacious' }] }] } }] }, parent_tool_use_id: null },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'question', content: 'RECORDED ANSWER' }] }, parent_tool_use_id: null },
    { type: 'result', subtype: 'success', is_error: false, result: 'Done', usage: { input_tokens: 0, output_tokens: 0 }, duration_ms: 0, duration_api_ms: 0, num_turns: 1 },
  ].map((row) => JSON.stringify(row)).join('\n'));
  const events: StudioEvent[] = [];
  let settle: () => void = () => undefined;
  const ended = new Promise<void>((resolve) => { settle = resolve; });
  const session: AgentSession = new AgentSession({ cwd: '/replay', sessionId: 'question-replay', query: replayedQuery(path), onState: () => undefined, onConnection: () => undefined, onEvent: (event) => {
    events.push(event);
    if (event.type === 'permission.requested') session.respond(event.requestId, 'allow', { 'Which layout?': 'Grid, List' });
    if (event.type === 'turn.ended' || event.type === 'session.error') settle();
  } });
  sessions.push(session);
  session.prompt('Ask about layout');
  await ended;
  expect(events.some((event) => event.type === 'permission.requested' && event.questions?.[0]?.multiSelect === true)).toBe(true);
  expect(events.find((event) => event.type === 'permission.resolved')?.answers).toEqual({ 'Which layout?': 'Grid, List' });
  expect(events.some((event) => event.type === 'tool.end' && event.result?.includes('Grid, List'))).toBe(true);
  expect(events.some((event) => event.type === 'tool.end' && event.result?.includes('RECORDED ANSWER'))).toBe(false);
});

function replayedSession(answerPermission: (toolName: string) => 'allow' | 'deny') {
  const events: StudioEvent[] = [];
  const calls: string[] = [];
  const declined = (name: string) => () => {
    calls.push(name);
    return Promise.resolve({ ok: false as const, reason: LIVE });
  };
  let ended: (event: StudioEvent) => void = () => undefined;
  const settled = new Promise<StudioEvent>((resolve) => {
    ended = resolve;
  });
  const session: AgentSession = new AgentSession({
    cwd: '/replay',
    sessionId: 'replay',
    query: replayedQuery(TOOLS_TURN),
    onEvent: (event) => {
      events.push(event);
      if (event.type === 'permission.requested') session.respond(event.requestId, answerPermission(event.toolName));
      if (event.type === 'turn.ended' || event.type === 'session.error') ended(event);
    },
    onState: () => undefined,
    onConnection: () => undefined,
    onCreateFrame: (request) => {
      calls.push(`create_frame ${request.url}`);
      return Promise.resolve({ ok: false as const, reason: LIVE });
    },
    onUndoCanvas: declined('undo_canvas'),
    onRedoCanvas: declined('redo_canvas'),
  });
  sessions.push(session);
  return { session, events, calls, settled };
}

const RECORDED_PROJECT = '11111111-1111-4111-8111-111111111111';
const LIVE_PROJECT = '22222222-2222-4222-8222-222222222222';
const DONE = { type: 'result', subtype: 'success', is_error: false, result: 'Done', usage: { input_tokens: 0, output_tokens: 0 }, duration_ms: 0, duration_api_ms: 0, num_turns: 1 };

function writeRecording(dir: string, rows: unknown[]): string {
  const path = join(dir, 'turn.jsonl');
  writeFileSync(path, rows.map((row) => JSON.stringify(row)).join('\n'));
  return path;
}

function createFrameTurn(url: string, recordedAnswer: string): unknown[] {
  return [
    { type: 'assistant', message: { id: 'frame', content: [{ type: 'tool_use', id: 'frame-tool', name: 'mcp__studio__create_frame', input: { url, name: 'Home', doing: 'Adding', done: 'Added' } }] }, parent_tool_use_id: null },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'frame-tool', content: [{ type: 'text', text: recordedAnswer }] }] }, parent_tool_use_id: null },
  ];
}

async function replay(options: Omit<ConstructorParameters<typeof AgentSession>[0], 'sessionId' | 'onState' | 'onConnection' | 'onEvent'>): Promise<StudioEvent[]> {
  const events: StudioEvent[] = [];
  let settle: () => void = () => undefined;
  const ended = new Promise<void>((resolve) => { settle = resolve; });
  const session = new AgentSession({
    ...options,
    sessionId: 'replayed-run',
    onState: () => undefined,
    onConnection: () => undefined,
    onEvent: (event) => {
      events.push(event);
      if (event.type === 'turn.ended' || event.type === 'session.error') settle();
    },
  });
  sessions.push(session);
  session.prompt('go');
  await ended;
  return events;
}

describe('a replay carried onto this run', () => {
  it('keeps recorded file edits and live connector results in the same replay', async () => {
    const root = makeStateRoot({ name: 'replayed-connectors-and-edits' });
    const cwd = join(root, 'worktree');
    mkdirSync(cwd, { recursive: true });
    const calls: unknown[] = [];
    const server = Bun.serve({ hostname: '127.0.0.1', port: 0, async fetch(request): Promise<Response> {
      calls.push(await request.json());
      return Response.json({ content: [{ type: 'text', text: LIVE }], isError: false });
    } });
    const path = writeRecording(root, [
      { type: 'replay.controls', url: `http://127.0.0.1:${server.port}` },
      { type: 'system', subtype: 'init', cwd: '/recorded/site', session_id: 'recorded' },
      { type: 'assistant', message: { id: 'tools', content: [
        { type: 'tool_use', id: 'write', name: 'Write', input: { file_path: '/recorded/site/index.html', content: 'written by the replay' } },
        { type: 'tool_use', id: 'search', name: 'mcp__mobbin__search', input: { query: 'onboarding' } },
      ] }, parent_tool_use_id: null },
      { type: 'user', message: { content: [
        { type: 'tool_result', tool_use_id: 'write', content: 'File created' },
        { type: 'tool_result', tool_use_id: 'search', content: 'recorded connector answer' },
      ] }, parent_tool_use_id: null },
      DONE,
    ]);
    async function* prompt() { yield { type: 'user', message: { role: 'user', content: 'go' }, parent_tool_use_id: null, session_id: 'replay-test' } as const; }
    try {
      const messages = [];
      for await (const message of replayedQuery(path)({ prompt: prompt(), options: { cwd } })) messages.push(message);
      expect(readFileSync(join(cwd, 'index.html'), 'utf8')).toBe('written by the replay');
      expect(calls).toEqual([{ method: 'tools/call', input: { name: 'mcp__mobbin__search', input: { query: 'onboarding' } } }]);
      expect(JSON.stringify(messages)).toContain(LIVE);
      expect(JSON.stringify(messages)).not.toContain('recorded connector answer');
    } finally { await server.stop(true); }
  });

  it('writes a recorded edit into this worktree after a Studio answer taught it the id the worktree path also carries', async () => {
    const root = makeStateRoot({ name: 'replayed-blank' });
    const cwd = join(root, `blank-${LIVE_PROJECT}`, 'site');
    mkdirSync(cwd, { recursive: true });
    const recordedCwd = `/recorded/blank-${RECORDED_PROJECT}/site`;
    const path = writeRecording(root, [
      { type: 'system', subtype: 'init', cwd: recordedCwd, session_id: 'recorded' },
      ...createFrameTurn('http://localhost:5173', `Studio added a frame: {"id":"${RECORDED_PROJECT}"}`),
      { type: 'assistant', message: { id: 'write', content: [{ type: 'tool_use', id: 'write-tool', name: 'Write', input: { file_path: `${recordedCwd}/index.html`, content: 'written by the replay' } }] }, parent_tool_use_id: null },
      { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'write-tool', content: 'File created' }] }, parent_tool_use_id: null },
      DONE,
    ]);
    await replay({ cwd, query: replayedQuery(path), onCreateFrame: () => Promise.resolve({ ok: true as const, node: { id: LIVE_PROJECT } }) });
    expect(readFileSync(join(cwd, 'index.html'), 'utf8')).toBe('written by the replay');
  });

  it("points a recorded frame at this run's starter page when the recording names the recording run's", async () => {
    const root = makeStateRoot({ name: 'replayed-starter' });
    const urls: (string | undefined)[] = [];
    const path = writeRecording(root, [...createFrameTurn(`http://localhost:${String(STARTER_PORT_RANGE.first)}`, 'Studio added a frame.'), DONE]);
    const live = STARTER_PORT_RANGE.first + 37;
    await replay({
      cwd: root,
      query: replayedQuery(path, { starterPortFor: (cwd) => (cwd === root ? live : undefined) }),
      onCreateFrame: (request) => {
        urls.push(request.url);
        return Promise.resolve({ ok: false as const, reason: LIVE });
      },
    });
    expect(urls).toEqual([`http://localhost:${String(live)}`]);
  });

  it("answers a call on a frame, or the list of frames, once this run can reach those pages, as a live model's latency would have let them load (ONL-2977)", async () => {
    const root = makeStateRoot({ name: 'replayed-frame-page' });
    const path = writeRecording(root, [
      { type: 'assistant', message: { id: 'list', content: [{ type: 'tool_use', id: 'list-tool', name: 'mcp__studio__list_frames', input: {} }] }, parent_tool_use_id: null },
      { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'list-tool', content: [{ type: 'text', text: '[]' }] }] }, parent_tool_use_id: null },
      { type: 'assistant', message: { id: 'eval', content: [{ type: 'tool_use', id: 'eval-tool', name: 'mcp__studio__evaluate_in_frame', input: { frame_id: 'f1', script: '1' } }] }, parent_tool_use_id: null },
      { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'eval-tool', content: [{ type: 'text', text: '1' }] }] }, parent_tool_use_id: null },
      DONE,
    ]);
    const order: string[] = [];
    const ready = new Set<string>();
    await replay({
      cwd: root,
      query: replayedQuery(path, {
        framePagesLive: (cwd, frameIds) => {
          const asked = frameIds.join(',') || 'every frame';
          order.push(`checked ${asked}`);
          const settled = cwd === root && ready.has(asked);
          ready.add(asked);
          return Promise.resolve(settled);
        },
      }),
      onListFrames: () => {
        order.push('listed');
        return Promise.resolve([]);
      },
      onEvaluateInFrame: (request) => {
        order.push(`ran ${request.frameId}`);
        return Promise.resolve({ ok: true as const, value: '1' });
      },
    });
    expect(order).toEqual(['checked every frame', 'checked every frame', 'listed', 'checked f1', 'checked f1', 'ran f1']);
  });
});

describe('a session on a replayed stream', () => {
  it.each([false, true])('replayed capture_frame keeps live images or reports a refused capture (refused: %s)', async (refused) => {
    const cwd = makeStateRoot({ name: 'replayed-capture' });
    const path = join(cwd, 'capture.jsonl');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1sAAAAASUVORK5CYII=', 'base64');
    writeFileSync(path, [
      { type: 'assistant', message: { id: 'capture', content: [{ type: 'tool_use', id: 'capture-tool', name: 'mcp__studio__capture_frame', input: { frame_id: 'live-frame' } }] }, parent_tool_use_id: null },
      { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'capture-tool', content: 'RECORDED CAPTURE' }] }, parent_tool_use_id: null },
      { type: 'result', subtype: 'success', is_error: false, result: 'Done', usage: { input_tokens: 0, output_tokens: 0 }, duration_ms: 0, duration_api_ms: 0, num_turns: 1 },
    ].map((row) => JSON.stringify(row)).join('\n'));
    const events: StudioEvent[] = [];
    const captures: string[] = [];
    let settle: () => void = () => undefined;
    const ended = new Promise<void>((resolve) => { settle = resolve; });
    const session = new AgentSession({
      cwd,
      sessionId: 'capture-replay',
      query: replayedQuery(path),
      onState: () => undefined,
      onConnection: () => undefined,
      onEvent: (event) => {
        events.push(event);
        if (event.type === 'turn.ended' || event.type === 'session.error') settle();
      },
      onCaptureFrame: async ({ frameId }) => {
        captures.push(frameId);
        return refused ? { ok: false, reason: 'Frame unavailable' } : { ok: true, pngBase64: png.toString('base64') };
      },
    });
    sessions.push(session);
    session.prompt('Capture the frame');
    await ended;

    expect(events.some((event) => event.type === 'session.error')).toBe(false);
    expect(captures).toEqual(['live-frame']);
    const result = events.find((event) => event.type === 'tool.end' && event.toolCallId === 'capture-tool');
    expect(result?.type).toBe('tool.end');
    if (result?.type !== 'tool.end') throw new Error('Missing capture tool result');
    expect(result.result).not.toContain('RECORDED CAPTURE');
    if (refused) {
      expect(result.status).toBe('failed');
      expect(result.images).toBeUndefined();
      expect(result.result).toContain('Frame unavailable');
      return;
    }
    expect(result.status).toBe('completed');
    expect(result.images).toHaveLength(1);
    expect(result.result).toContain('Screenshot of frame live-frame');
    const image = result.images![0]!;
    expect(image.mediaType).toBe('image/png');
    expect(readProjectAttachment(cwd, image.id)?.bytes).toEqual(png);
  });

  it("runs Studio's own tool handlers on the recorded input, and the chat shows their live answers", async () => {
    const { session, events, calls, settled } = replayedSession(() => 'allow');
    session.prompt('call every tool');
    expect((await settled).type).toBe('turn.ended');

    expect(calls).toContain('create_frame http://localhost:5173');
    const results = events.flatMap((event) => (event.type === 'tool.end' ? [event.result ?? ''] : []));
    expect(results.some((result) => result.includes(LIVE))).toBe(true);
    expect(results.some((result) => result.includes('harness check'))).toBe(false);
  });

  it('asks before a Studio tool the session does not auto-approve, and a denied call never runs', async () => {
    const { session, events, calls, settled } = replayedSession((toolName) => (toolName.endsWith('undo_canvas') ? 'deny' : 'allow'));
    session.prompt('call every tool');
    await settled;

    const asked = events.flatMap((event) => (event.type === 'permission.requested' ? [event.toolName] : []));
    expect(asked.some((name) => name.endsWith('undo_canvas'))).toBe(true);
    expect(calls).not.toContain('undo_canvas');
    expect(calls).toContain('redo_canvas');
  });

  it('fails the session, naming the recording, when a prompt has no recorded turn left', async () => {
    const first = replayedSession(() => 'allow');
    first.session.prompt('call every tool');
    await first.settled;
    const errors: StudioEvent[] = [];
    const next = new Promise<StudioEvent>((resolve) => {
      const seen = first.events.length;
      const poll = setInterval(() => {
        const error = first.events.slice(seen).find((event) => event.type === 'session.error');
        if (error !== undefined) {
          clearInterval(poll);
          resolve(error);
        }
      }, 5);
    });
    first.session.prompt('one more');
    errors.push(await next);
    expect(errors[0]?.type === 'session.error' && errors[0].message).toContain('tools.jsonl');
  });
});
