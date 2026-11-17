import { foldSessionState, type StudioEvent } from '@studio/events';
import { afterEach, describe, expect, it, jest } from 'bun:test';
import { APPSERVER_PRESENTATION } from './appserver/presentation.js';
import { EventLog } from './event-log.js';
import { CREATE_PROJECT_TAB_TOOL, CREATE_PROJECT_TAB_TOOL_NAME, SET_FRAME_URL_TOOL, SET_FRAME_URL_TOOL_NAME, STUDIO_MCP_SERVER } from './tool-names.js';

const CWD = '/tmp/studio-workspace';

afterEach(() => jest.useRealTimers());

it.each([false, true])('connector row targets include the server only with connectors=%s', (enabled) => {
  for (const presentation of [undefined, APPSERVER_PRESENTATION]) {
    const log = new EventLog({ sessionId: 's1', cwd: CWD, emit: () => {}, presentation, connectorToolNames: () => enabled });
    const name = presentation ? 'mcpToolCall' : 'mcp__mobbin__search_screens';
    const input = presentation ? { server: 'mobbin', tool: 'search_screens' } : {};
    log.ensureToolStart('search', name, input, 'in_progress', { source: 'stream' });
    log.ensureToolStart('search', name, input, 'in_progress', { source: 'assistant' });
    const rows = log.events.filter((event) => event.type === 'tool.start' || event.type === 'tool.update');
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(row.target).toBe(enabled ? 'mobbin: search screens' : 'search screens');
  }
});

it('connector rows resolve exact external namespaces without renaming internal Studio tools', () => {
  for (const presentation of [undefined, APPSERVER_PRESENTATION]) {
    const log = new EventLog({ sessionId: 's1', cwd: CWD, emit: () => {}, presentation, connectorToolNames: () => true });
    log.setMcpServerNames(['studio', 'studio__private']);
    for (const server of ['studio__private', 'studio']) {
      const name = presentation ? 'mcpToolCall' : `mcp__${server}__search_screens`;
      const input = presentation ? { server, tool: 'search_screens' } : {};
      log.ensureToolStart(server, name, input, 'in_progress', { source: 'stream' });
      log.ensureToolStart(server, name, input, 'in_progress', { source: 'assistant' });
      const rows = log.events.filter((event) => event.type === 'tool.start' || event.type === 'tool.update').filter((event) => event.toolCallId === server);
      for (const row of rows) expect(row.target).toBe(server === 'studio' ? 'search screens' : 'studio__private: search screens');
    }
  }
});

it('external MCP counts reset and deduplicate without changing existing tool totals', () => {
  const log = new EventLog({ sessionId: 's1', cwd: CWD, emit: () => {} });
  log.noteMcpToolCall('outside', 'private-server');
  log.beginTurn();
  log.ensureToolStart('external', 'mcp__private-server__private_tool', {}, 'pending', { source: 'stream', provisional: true });
  log.ensureToolStart('external', 'mcp__private-server__private_tool', {}, 'in_progress', { source: 'assistant' });
  log.noteMcpToolCall('external', 'private-server');
  log.noteMcpToolCall('codex', 'private-server');
  log.noteMcpToolCall('codex', 'private-server');
  log.noteMcpToolCall('studio', STUDIO_MCP_SERVER);
  log.noteMcpToolCall('missing', undefined);
  log.noteMcpToolCall('empty', '');
  log.noteMcpToolCall('similar', `${STUDIO_MCP_SERVER}-private`);
  expect(log.turnTally()).toMatchObject({ mcpToolCallCount: 3, toolCallCount: 1 });
  expect(log.turnTally()).toBeUndefined();
  log.noteMcpToolCall('after', 'private-server');
  log.beginTurn();
  expect(log.turnTally()).toMatchObject({ mcpToolCallCount: 0, toolCallCount: 0 });
});

it('MCP consent rows do not count as another tool invocation (ONL-3087)', () => {
  const log = new EventLog({ sessionId: 's1', cwd: CWD, emit: () => {}, presentation: APPSERVER_PRESENTATION });
  log.beginTurn();
  log.ensureToolStart('real-call', 'mcpToolCall', { server: 'figma', tool: 'import_designs' }, 'in_progress', { source: 'stream' });
  log.ensureToolStart('consent', 'mcpToolCall', { server: 'Figma', tool: 'import_designs' }, 'in_progress', { source: 'permission', approvalOnly: true });
  log.endTool('consent', 'denied');
  log.endTool('real-call', 'completed');
  expect(log.turnTally()).toMatchObject({ mcpToolCallCount: 1, toolCallCount: 1, deniedToolCount: 0 });
});

it('external MCP resolves the longest registered namespace and retains it across turns', () => {
  const log = new EventLog({ sessionId: 's1', cwd: CWD, emit: () => {} });
  log.setMcpServerNames([STUDIO_MCP_SERVER, `${STUDIO_MCP_SERVER}__private`]);
  for (const id of ['first', 'second']) {
    log.beginTurn();
    log.ensureToolStart(id, `mcp__${STUDIO_MCP_SERVER}__private__tool`, {}, 'in_progress', { source: 'assistant' });
    expect(log.turnTally()).toMatchObject({ mcpToolCallCount: 1, toolCallCount: 1 });
  }
});

describe('turn observability', () => {
  it('resets silence on provider activity and excludes running tools and designer approvals', () => {
    jest.useFakeTimers();
    const stalls: string[] = [];
    const log = new EventLog({ sessionId: 's1', cwd: CWD, emit: () => {}, onTurnStalled: (turnId) => stalls.push(turnId) });
    log.beginTurn();
    jest.advanceTimersByTime(119_999);
    log.push({ type: 'thinking.delta', blockId: 'b1', delta: 'private reasoning' });
    jest.advanceTimersByTime(119_999);
    expect(stalls).toEqual([]);
    log.ensureToolStart('bash', 'Bash', { command: 'private command' }, 'in_progress', { source: 'assistant' });
    jest.advanceTimersByTime(240_000);
    expect(stalls).toEqual([]);
    log.push({ type: 'permission.requested', requestId: 'p1', toolCallId: 'bash', toolName: 'Bash', input: {}, options: [] });
    log.endTool('bash', 'completed');
    jest.advanceTimersByTime(240_000);
    expect(stalls).toEqual([]);
    log.push({ type: 'permission.resolved', requestId: 'p1', toolCallId: 'bash', outcome: 'allow_once' });
    jest.advanceTimersByTime(120_000);
    expect(stalls).toEqual(['t1']);
    expect(log.turnTally()?.hadProviderStall).toBe(true);
    log.beginTurn();
    jest.advanceTimersByTime(120_000);
    expect(stalls).toEqual(['t1', 't2']);
    log.turnTally();
    log.beginTurn();
    log.push({ type: 'turn.ended', turnId: log.turnId });
    jest.advanceTimersByTime(240_000);
    expect(log.turnTally()?.hadProviderStall).toBe(false);
    expect(stalls).toEqual(['t1', 't2']);
  });

  it('records a silent turn once without ending it, and remembers the stall after recovery', () => {
    jest.useFakeTimers();
    const starts: string[] = [];
    const stalls: number[] = [];
    const log = new EventLog({
      sessionId: 's1', cwd: CWD, emit: () => {},
      onTurnStarted: (turnId) => starts.push(turnId),
      onTurnStalled: (_turnId, silentMs) => stalls.push(silentMs),
    });
    log.beginTurn();
    expect(starts).toEqual(['t1']);
    jest.advanceTimersByTime(119_999);
    expect(stalls).toEqual([]);
    jest.advanceTimersByTime(1);
    expect(stalls).toEqual([120_000]);
    log.push({ type: 'text.delta', blockId: 'b1', delta: 'Recovered' });
    jest.advanceTimersByTime(120_000);
    expect(stalls).toHaveLength(1);
    expect(log.turnTally()).toMatchObject({ hadProviderStall: true });
    jest.advanceTimersByTime(120_000);
    expect(stalls).toHaveLength(1);
  });

  it('does not count a turn waiting on Studio against the provider, and measures it from the hand-off (ONL-2925)', () => {
    jest.useFakeTimers();
    const stalls: string[] = [];
    const log = new EventLog({ sessionId: 's1', cwd: CWD, emit: () => {}, onTurnStalled: (turnId) => stalls.push(turnId) });
    log.beginTurn();
    log.holdTurnSilence();
    jest.advanceTimersByTime(600_000);
    expect(stalls).toEqual([]);
    expect(log.turnTally()?.hadProviderStall).toBe(false);

    log.beginTurn();
    log.holdTurnSilence();
    jest.advanceTimersByTime(600_000);
    log.releaseTurnSilence();
    jest.advanceTimersByTime(119_999);
    expect(stalls).toEqual([]);
    jest.advanceTimersByTime(1);
    expect(stalls).toEqual(['t2']);
  });

  it('stays quiet when a discarded run releases a turn that already ended (ONL-2925)', () => {
    jest.useFakeTimers();
    const stalls: string[] = [];
    const log = new EventLog({ sessionId: 's1', cwd: CWD, emit: () => {}, onTurnStalled: (turnId) => stalls.push(turnId) });
    log.beginTurn();
    log.holdTurnSilence();
    log.turnTally();
    log.releaseTurnSilence();
    jest.advanceTimersByTime(600_000);
    expect(stalls).toEqual([]);
  });

  it('does not mistake an unfinished tool announcement for a running tool', () => {
    jest.useFakeTimers();
    const stalls: string[] = [];
    const log = new EventLog({ sessionId: 's1', cwd: CWD, emit: () => {}, onTurnStalled: (turnId) => stalls.push(turnId) });
    log.beginTurn();
    log.ensureToolStart('partial', 'Bash', {}, 'pending', { source: 'stream', provisional: true });
    jest.advanceTimersByTime(120_000);
    expect(stalls).toEqual(['t1']);
    log.turnTally();
    log.beginTurn();
    log.ensureToolStart('running', 'Bash', {}, 'pending', { source: 'stream', provisional: true });
    log.ensureToolStart('running', 'Bash', { command: 'build' }, 'in_progress', { source: 'hook' });
    jest.advanceTimersByTime(240_000);
    expect(stalls).toEqual(['t1']);
    log.endTool('running', 'completed');
    jest.advanceTimersByTime(120_000);
    expect(stalls).toEqual(['t1', 't2']);
    log.turnTally();
  });

  it('records failed frame inspection attempts without counting unrelated MCP tools', () => {
    for (const presentation of [undefined, APPSERVER_PRESENTATION]) {
      const log = new EventLog({ sessionId: 's1', cwd: CWD, emit: () => {}, presentation });
      log.beginTurn();
      log.ensureToolStart('unrelated', 'mcp__other__capture_frame', {}, 'in_progress', { source: 'assistant' });
      expect(log.turnTally()).toMatchObject({ attemptedFrameInspection: false });
      for (const tool of ['capture_frame', 'evaluate_in_frame', 'list_frames']) {
        log.beginTurn();
        log.ensureToolStart(tool, presentation === APPSERVER_PRESENTATION ? tool : `mcp__studio__${tool}`, {}, 'in_progress', { source: 'assistant' });
        log.endTool(tool, 'failed');
        expect(log.turnTally()).toMatchObject({ attemptedFrameInspection: true });
      }
    }
  });

  it('counts frame inspection when Codex names a provisionally announced tool later', () => {
    const log = new EventLog({ sessionId: 's1', cwd: CWD, emit: () => {}, presentation: APPSERVER_PRESENTATION });
    log.beginTurn();
    log.ensureToolStart('call', 'dynamicToolCall', {}, 'pending', { source: 'stream', provisional: true });
    log.ensureToolStart('call', 'capture_frame', {}, 'in_progress', { source: 'hook' });
    log.endTool('call', 'failed');
    expect(log.turnTally()).toMatchObject({ attemptedFrameInspection: true, toolCallCount: 1 });
  });

  it('does not carry a late duplicate frame attempt into the next turn', () => {
    const { log } = makeLog();
    log.beginTurn();
    log.ensureToolStart('old', 'mcp__studio__capture_frame', {}, 'in_progress', { source: 'hook' });
    log.endTool('old', 'failed');
    expect(log.turnTally()?.attemptedFrameInspection).toBe(true);
    log.beginTurn();
    log.ensureToolStart('old', 'mcp__studio__capture_frame', {}, 'in_progress', { source: 'assistant' });
    expect(log.turnTally()?.attemptedFrameInspection).toBe(false);
  });
});

function makeLog(): { log: EventLog; emitted: StudioEvent[] } {
  const emitted: StudioEvent[] = [];
  const log = new EventLog({
    sessionId: 's1',
    cwd: CWD,
    emit: (event) => emitted.push(event),
  });
  return { log, emitted };
}

const ofType = <T extends StudioEvent['type']>(
  emitted: StudioEvent[],
  type: T,
): Extract<StudioEvent, { type: T }>[] =>
  emitted.filter((e): e is Extract<StudioEvent, { type: T }> => e.type === type);

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('announce-once', () => {
  it('emits one tool.start across all three paths, and never downgrades its status', () => {
    const { log, emitted } = makeLog();
    const path = `${CWD}/src/app.ts`;

    // The first announce carries the thinnest input, so status and input are pinned to different arrivals.
    const first = log.ensureToolStart(
      't1',
      'Edit',
      { file_path: path },
      'in_progress',
      { source: 'assistant' },
    );
    const second = log.ensureToolStart(
      't1',
      'Edit',
      { file_path: path, old_string: 'a', new_string: 'b\nc' },
      'pending',
      { source: 'permission' },
    );
    const third = log.ensureToolStart(
      't1',
      'Edit',
      { file_path: path, old_string: 'a', new_string: 'b\nc' },
      'pending',
      { source: 'hook' },
    );

    expect([first, second, third]).toEqual([true, false, false]);

    const starts = ofType(emitted, 'tool.start');
    expect(starts).toHaveLength(1);
    expect(starts[0]?.status).toBe('in_progress');
    expect(starts[0]?.source).toBe('assistant');
    expect(log.hasAnnounced('t1')).toBe(true);

    const updates = ofType(emitted, 'tool.update');
    expect(updates).toHaveLength(2);

    // The key, not `undefined`: a spread downstream turns `status: undefined` into a downgrade.
    for (const update of updates) {
      expect('status' in update).toBe(false);
    }

    expect(starts[0]?.input).toEqual({ file_path: path });
    expect(updates[0]?.input).toEqual({ file_path: path, old_string: 'a', new_string: 'b\nc' });
    expect(updates[0]?.title).toBe('Edit');
    expect(updates[0]?.target).toBe('src/app.ts');

    log.endTool('t1', 'completed');
    const [end] = ofType(emitted, 'tool.end');
    expect(end?.additions).toBe(2);
    expect(end?.deletions).toBe(1);
  });
});

describe('provisional announce (ONL-2142)', () => {
  it('makes the row exist without owning its lifecycle or its clock', async () => {
    const { log, emitted } = makeLog();
    const path = `${CWD}/a.ts`;

    expect(
      log.ensureToolStart('t1', 'Write', {}, 'pending', { source: 'stream', provisional: true }),
    ).toBe(true);
    expect(log.openToolCalls()).toEqual(['t1']);

    await sleep(120);
    log.ensureToolStart('t1', 'Write', { file_path: path, content: 'x' }, 'pending', {
      source: 'permission',
    });
    log.ensureToolStart('t1', 'Write', { file_path: path, content: 'x' }, 'in_progress', {
      source: 'assistant',
    });
    log.endTool('t1', 'completed');

    expect(ofType(emitted, 'tool.start')).toHaveLength(1);
    const updates = ofType(emitted, 'tool.update');
    expect(updates.map((u) => 'status' in u)).toEqual([true, false]);
    expect(updates[0]?.status).toBe('pending');
    const [end] = ofType(emitted, 'tool.end');
    expect(end?.durationMs).toBeDefined();
    expect(end?.durationMs ?? Infinity).toBeLessThan(100);
  });

  it('neither resurrects an ended row nor lets a late provisional announce clobber input', () => {
    const { log, emitted } = makeLog();
    const input = { file_path: `${CWD}/a.ts`, content: 'x' };

    log.ensureToolStart('t1', 'Write', input, 'in_progress', { source: 'hook' });
    expect(
      log.ensureToolStart('t1', 'Write', {}, 'pending', { source: 'stream', provisional: true }),
    ).toBe(false);
    expect(ofType(emitted, 'tool.update')).toHaveLength(0);

    log.ensureToolStart('t2', 'Write', {}, 'pending', { source: 'stream', provisional: true });
    log.cancelOpenToolCalls('Interrupted');
    log.ensureToolStart('t2', 'Write', input, 'in_progress', { source: 'assistant' });
    const [late] = ofType(emitted, 'tool.update');
    expect(late?.toolCallId).toBe('t2');
    expect(late && 'status' in late).toBe(false);
  });

  it('reports no duration for a call that ended while still provisional', () => {
    const { log, emitted } = makeLog();
    log.ensureToolStart('t1', 'Write', {}, 'pending', { source: 'stream', provisional: true });
    log.endTool('t1', 'canceled');
    const [end] = ofType(emitted, 'tool.end');
    expect(end?.status).toBe('canceled');
    expect(end?.durationMs).toBeUndefined();
  });
});

describe('restore', () => {
  it('re-emits stored rows live with their original time, which tells them apart from new ones (ONL-3174)', () => {
    const emitted: StudioEvent[] = [];
    const log = new EventLog({ sessionId: 'now', cwd: '/w', emit: (event) => emitted.push(event) });
    log.restore([{ type: 'session.error', message: '', code: 'rate_limited', sessionId: 'earlier', cwd: '/w', eventId: 'e9', seq: 9, ts: 1 } as StudioEvent]);
    log.push({ type: 'session.error', message: '', code: 'rate_limited' });
    expect(emitted.map((event) => [event.type, event.ts === 1])).toEqual([['session.error', true], ['session.error', false]]);
  });
  it('treats oversized numeric IDs as opaque without poisoning the allocators (ONL-2702)', () => {
    const { log } = makeLog();
    const base = { sessionId: 'old', seq: 0, ts: 1, eventId: 'old' };
    log.restore([
      { ...base, type: 'turn.started', turnId: `t${'9'.repeat(400)}` },
      { ...base, type: 'text.start', blockId: `b${'9'.repeat(400)}` },
      { ...base, type: 'turn.ended', turnId: 't9007199254740993' },
      { ...base, type: 'text.end', blockId: 'b9007199254740993', text: 'saved' },
    ]);
    expect(log.beginTurn()).toBe('t1');
    expect(log.beginTurn()).toBe('t2');
    expect(log.openBlock('root:0')).toBe('b1');
    expect(log.openBlock('root:0')).toBe('b2');
  });

  it('continues past sparse local IDs on any restored turn or block row (ONL-2702)', () => {
    const { log, emitted } = makeLog();
    const base = { sessionId: 'old', cwd: '/old', seq: 0, ts: 1, eventId: 'old' };
    const rows: StudioEvent[] = [
      { ...base, type: 'message.user', turnId: 't900', messageId: 'm900', text: 'saved prompt' },
      { ...base, type: 'turn.ended', turnId: 't7' },
      { ...base, type: 'thinking.delta', blockId: 'b4000', delta: 'saved thought' },
      { ...base, type: 'text.end', blockId: 'b19', text: 'saved response' },
    ];

    log.restore(rows);

    expect(emitted).toEqual(rows.map((row, index) => ({
      ...row,
      sessionId: 's1',
      cwd: CWD,
      eventId: `e${index + 1}`,
      seq: index + 1,
    })));
    expect(log.events).toEqual(emitted);
    expect(log.beginTurn()).toBe('t901');
    expect(log.beginTurn()).toBe('t902');
    expect(log.openBlock('root:0', 'text')).toBe('b4001');
    expect(log.openBlock('root:0', 'thinking')).toBe('b4002');
    expect(rows[0]).toMatchObject({ sessionId: 'old', turnId: 't900' });
    expect(rows[2]).toMatchObject({ sessionId: 'old', blockId: 'b4000' });
  });

  it.each(['text', 'thinking'] as const)(
    'keeps restored and fresh %s blocks distinct in the transcript (ONL-2702)',
    (kind) => {
      const { log: saved } = makeLog();
      const savedTurnId = saved.beginTurn();
      saved.push({ type: 'turn.started', turnId: savedTurnId });
      const savedBlockId = saved.openBlock('root:0', kind);
      saved.push({ type: `${kind}.start`, blockId: savedBlockId });
      saved.push({ type: `${kind}.end`, blockId: savedBlockId, text: 'saved' });
      saved.push({ type: 'turn.ended', turnId: savedTurnId });

      const { log } = makeLog();
      log.restore(saved.events);
      const turnId = log.beginTurn();
      log.push({ type: 'turn.started', turnId });
      const blockId = log.openBlock('root:0', kind);
      log.push({ type: `${kind}.start`, blockId });
      log.push({ type: `${kind}.delta`, blockId, delta: 'fresh' });
      log.push({ type: `${kind}.end`, blockId, text: 'fresh' });

      expect(turnId).toBe('t2');
      expect(blockId).toBe('b2');
      expect(foldSessionState(log.events).items).toMatchObject([
        { id: 'b1', kind: `assistant-${kind}`, text: 'saved', isStreaming: false },
        { id: 'b2', kind: `assistant-${kind}`, text: 'fresh', isStreaming: false },
      ]);
    },
  );

  it('never moves counters backward across repeated, empty or lower-ID restores (ONL-2702)', () => {
    const { log } = makeLog();
    const base = { sessionId: 'old', seq: 0, ts: 1, eventId: 'old' };
    const rows: StudioEvent[] = [
      { ...base, type: 'turn.started', turnId: 't50' },
      { ...base, type: 'text.start', blockId: 'b60' },
    ];
    log.restore(rows);
    expect(log.beginTurn()).toBe('t51');
    expect(log.openBlock('root:0')).toBe('b61');

    log.restore(rows);
    log.restore([]);
    log.restore([
      { ...base, type: 'turn.started', turnId: 't3' },
      { ...base, type: 'thinking.start', blockId: 'b4' },
    ]);
    expect(log.beginTurn()).toBe('t52');
    expect(log.openBlock('root:0')).toBe('b62');

    log.restore([
      { ...base, type: 'turn.started', turnId: 't80' },
      { ...base, type: 'thinking.end', blockId: 'b90', text: 'saved' },
    ]);
    expect(log.beginTurn()).toBe('t81');
    expect(log.openBlock('root:0')).toBe('b91');
  });

  it('does not treat foreign IDs or tool call IDs as local counters (ONL-2702)', () => {
    const { log } = makeLog();
    const base = { sessionId: 'old', seq: 0, ts: 1, eventId: 'old' };
    log.restore([
      { ...base, type: 'turn.started', turnId: 'turn-900' },
      { ...base, type: 'turn.ended', turnId: 't900-other' },
      { ...base, type: 'text.end', blockId: 'block-900', text: 'saved' },
      { ...base, type: 'thinking.end', blockId: 'b900-other', text: 'saved' },
      { ...base, type: 'tool.end', toolCallId: 't900', status: 'completed' },
      { ...base, type: 'tool.end', toolCallId: 'b900', status: 'completed' },
    ]);

    expect(log.beginTurn()).toBe('t1');
    expect(log.openBlock('root:0')).toBe('b1');
  });

  it('settles a row persisted open by a process that never closed', () => {
    const { log, emitted } = makeLog();
    const base = { sessionId: 'old', seq: 0, ts: 1 };
    log.restore([
      { ...base, eventId: 'e1', type: 'tool.start', toolCallId: 'open', name: 'Write', kind: 'write', title: 'Write', status: 'pending', source: 'stream' },
      { ...base, eventId: 'e2', type: 'tool.start', toolCallId: 'done', name: 'Bash', kind: 'shell', title: 'Bash', status: 'in_progress', source: 'hook' },
      { ...base, eventId: 'e3', type: 'tool.end', toolCallId: 'done', status: 'completed' },
    ] as StudioEvent[]);

    const ends = ofType(emitted, 'tool.end');
    expect(ends.map((e) => [e.toolCallId, e.status])).toEqual([
      ['done', 'completed'],
      ['open', 'canceled'],
    ]);
    expect(log.openToolCalls()).toEqual([]);
  });

  it('settles a mid-turn row persisted with its claim still open as `discarded` (ONL-2180)', () => {
    const { log, emitted } = makeLog();
    const base = { sessionId: 'old', seq: 0, ts: 1 };
    log.restore([
      { ...base, eventId: 'e1', type: 'message.user', turnId: 't1', messageId: 'm1', text: 'first', origin: 'user' },
      { ...base, eventId: 'e2', type: 'message.user', turnId: 't1', messageId: 'm2', text: 'second', origin: 'user', delivery: 'steering' },
      { ...base, eventId: 'e3', type: 'message.delivery', messageId: 'm2', outcome: 'delivered' },
      { ...base, eventId: 'e4', type: 'message.user', turnId: 't1', messageId: 'm3', text: 'third', origin: 'user', delivery: 'waiting' },
    ] as StudioEvent[]);

    expect(ofType(emitted, 'message.delivery').map((d) => [d.messageId, d.outcome])).toEqual([
      ['m2', 'delivered'],
      ['m3', 'discarded'],
    ]);
  });

  it("replays a session.settings row without its model catalog, so the host's sink cannot memoise a dead runtime's list", () => {
    const { log, emitted } = makeLog();
    log.restore([
      {
        sessionId: 'old',
        seq: 4,
        ts: 1,
        eventId: 'e1',
        type: 'session.settings',
        model: 'gpt-5.5',
        effort: 'high',
        models: [{ value: 'gpt-5.5', displayName: 'gpt-5.5' }],
      },
    ] as StudioEvent[]);

    const replayed = ofType(emitted, 'session.settings')[0];
    expect(replayed?.models).toBeUndefined();
    expect(replayed).toMatchObject({ model: 'gpt-5.5', effort: 'high' });
    expect(log.events[0]).toEqual(replayed as StudioEvent);
  });

  it('a LIVE session.settings still carries its catalog — the positive control for the case above', () => {
    const { log, emitted } = makeLog();
    log.push({ type: 'session.settings', models: [{ value: 'opus', displayName: 'Claude Opus' }] });

    expect(ofType(emitted, 'session.settings')[0]?.models).toEqual([{ value: 'opus', displayName: 'Claude Opus' }]);
  });
});

describe('identity (ONL-2203)', () => {
  it('stamps cwd on a pushed event, for the router to address by', () => {
    const { log, emitted } = makeLog();
    log.ensureToolStart('t1', 'Bash', { command: 'ls' }, 'in_progress', { source: 'hook' });

    expect(emitted[0]?.cwd).toBe(CWD);
  });

  it('stamps cwd on a restored event too, not just fresh ones', () => {
    const { log, emitted } = makeLog();
    log.restore([
      {
        sessionId: 'old',
        cwd: '/somewhere/else',
        seq: 0,
        ts: 1,
        eventId: 'e1',
        type: 'tool.start',
        toolCallId: 'done',
        name: 'Bash',
        kind: 'execute',
        title: 'Bash',
        status: 'completed',
        source: 'hook',
      } as StudioEvent,
    ]);

    expect(emitted[0]?.cwd).toBe(CWD);
  });
});

describe('terminal-once', () => {
  it("drops the SDK's synthesized denial result after a real terminal status", () => {
    const { log, emitted } = makeLog();
    log.ensureToolStart('t1', 'Edit', { file_path: `${CWD}/a.ts` }, 'in_progress', {
      source: 'permission',
    });

    log.endTool('t1', 'denied', { errorMessage: 'The user rejected this edit' });

    log.endTool('t1', 'failed', {
      result: 'User denied this action.',
      isError: true,
      errorMessage: 'User denied this action.',
    });

    const ends = ofType(emitted, 'tool.end');
    expect(ends).toHaveLength(1);
    expect(ends[0]?.status).toBe('denied');
    expect(ends[0]?.isError).toBeUndefined();

    // Asserting only `status === 'denied'` passes when a second event's wrong result arrived later.
    expect(JSON.stringify(emitted)).not.toContain('User denied this action.');

    expect(log.hasEnded('t1')).toBe(true);
    expect(log.openToolCalls()).toEqual([]);
  });
});

describe('duration arithmetic', () => {
  it('reports ranMs as durationMs minus the summed wait, clamped at 0', async () => {
    const { log, emitted } = makeLog();

    log.ensureToolStart('t1', 'Bash', { command: 'ls' }, 'in_progress', { source: 'hook' });
    log.addWaited('t1', 3);
    log.addWaited('t1', 4);
    await sleep(25);
    log.endTool('t1', 'completed');

    const [normal] = ofType(emitted, 'tool.end');
    expect(normal?.waitedMs).toBe(7);
    // Bun's timer can fire early and `Date.now()` truncates: `>= 25` against `sleep(25)` failed at 24 under load.
    const TIMER_SLACK_MS = 5;
    expect(normal?.durationMs).toBeGreaterThanOrEqual(25 - TIMER_SLACK_MS);
    expect(normal?.ranMs).toBe((normal?.durationMs ?? 0) - 7);
    // Positive control: this path did not clamp.
    expect(normal?.ranMs).toBeGreaterThan(0);

    log.ensureToolStart('t2', 'Read', { file_path: `${CWD}/a.ts` }, 'in_progress', {
      source: 'hook',
    });
    log.addWaited('t2', 10_000);
    log.endTool('t2', 'completed');

    const clamped = ofType(emitted, 'tool.end')[1];
    expect(clamped?.waitedMs).toBe(10_000);
    expect((clamped?.durationMs ?? 0) - (clamped?.waitedMs ?? 0)).toBeLessThan(0);
    expect(clamped?.ranMs).toBe(0);
  });
});

describe('block slots', () => {
  it('mints a fresh id per slot open, because the SDK index restarts per message', () => {
    const { log } = makeLog();

    const firstMessage = log.openBlock('root:0');
    expect(log.currentBlock('root:0')).toBe(firstMessage);

    const secondMessage = log.openBlock('root:0');
    expect(secondMessage).not.toBe(firstMessage);
    expect(log.currentBlock('root:0')).toBe(secondMessage);

    const sibling = log.openBlock('root:1');
    const subagent = log.openBlock('tool_abc:0');
    expect(new Set([firstMessage, secondMessage, sibling, subagent]).size).toBe(4);
    expect(log.currentBlock('root:0')).toBe(secondMessage);

    expect(log.currentBlock('root:9')).toBeUndefined();
  });
});

describe('turn accounting (ONL-2180)', () => {
  it('reports a begun turn once — a second result before the next beginTurn has nothing to say', () => {
    const { log } = makeLog();
    expect(log.turnTally()).toBeUndefined();

    log.beginTurn();
    log.push({ type: 'message.user', turnId: log.turnId, text: 'hello' });
    const first = log.turnTally();
    expect(first?.turnId).toBe('t1');
    expect(first?.promptChars).toBe(5);

    expect(log.turnTally()).toBeUndefined();

    log.beginTurn();
    expect(log.turnTally()?.turnId).toBe('t2');
    expect(log.turnCount).toBe(2);
  });

  it('keeps a folded prompt in the running turn — no beginTurn, same turnId, chars on the same tally', () => {
    const { log } = makeLog();
    log.beginTurn();
    log.push({ type: 'message.user', turnId: log.turnId, text: 'first' });
    log.push({ type: 'message.user', turnId: log.turnId, text: 'second', delivery: 'steering' });
    log.push({ type: 'message.delivery', messageId: 'm2', outcome: 'delivered' });
    expect(log.turnId).toBe('t1');
    expect(log.turnCount).toBe(1);
    expect(log.turnTally()?.promptChars).toBe(11);
  });
});

describe('files changed (ONL-2286)', () => {
  it('announces a Claude streamed path before full input and preserves cancellation on late announcements', () => {
    const { log } = makeLog();
    log.beginTurn();
    log.push({ type: 'turn.started', turnId: log.turnId });
    log.ensureToolStart('write', 'Write', {}, 'in_progress', { source: 'stream', provisional: true });
    log.openToolBlock('slot', 'write');
    log.streamToolInput('slot', `{"file_path":"${CWD}/new.ts","content":"unfinished`);
    expect(foldSessionState(log.events).touchedFiles).toEqual([{ path: 'new.ts', status: 'editing' }]);
    log.endTool('write', 'canceled');
    log.ensureToolStart('write', 'Write', { file_path: `${CWD}/new.ts`, content: 'done' }, 'in_progress', { source: 'hook' });
    log.endTool('write', 'completed');
    expect(foldSessionState(log.events).touchedFiles).toEqual([{ path: 'new.ts', status: 'stopped' }]);
  });

  it('counts distinct completed edit and delete targets, and nothing else', () => {
    const { log } = makeLog();
    log.beginTurn();
    const file = `${CWD}/src/Button.tsx`;
    log.ensureToolStart('e1', 'Edit', { file_path: file, old_string: 'a', new_string: 'b' }, 'in_progress', { source: 'hook' });
    log.endTool('e1', 'completed');
    log.ensureToolStart('w1', 'Write', { file_path: file, content: 'x' }, 'in_progress', { source: 'hook' });
    log.endTool('w1', 'completed');
    log.ensureToolStart('r1', 'Read', { file_path: `${CWD}/README.md` }, 'in_progress', { source: 'hook' });
    log.endTool('r1', 'completed');
    log.ensureToolStart('e2', 'Edit', { file_path: `${CWD}/src/Other.tsx`, old_string: 'a', new_string: 'b' }, 'pending', { source: 'permission' });
    log.endTool('e2', 'denied');
    expect(log.turnFilesChanged).toBe(1);
    expect(log.turnTally()?.filesChanged).toBe(1);
  });

  it('is zero for a turn with no tool calls, and resets at the next turn', () => {
    const { log } = makeLog();
    log.beginTurn();
    expect(log.turnFilesChanged).toBe(0);
    log.ensureToolStart('e1', 'Edit', { file_path: `${CWD}/a.ts`, old_string: 'a', new_string: 'b' }, 'in_progress', { source: 'hook' });
    log.endTool('e1', 'completed');
    expect(log.turnFilesChanged).toBe(1);
    log.beginTurn();
    expect(log.turnFilesChanged).toBe(0);
  });

  it('counts every distinct path of a codex patch, while its row still names the first (ONL-2856)', () => {
    const emitted: StudioEvent[] = [];
    const log = new EventLog({ sessionId: 's1', cwd: CWD, emit: (event) => emitted.push(event), presentation: APPSERVER_PRESENTATION });
    log.beginTurn();
    const update = (path: string) => ({ path: `${CWD}/${path}`, kind: { type: 'update' }, diff: '@@' });
    const patch = { type: 'fileChange', id: 'f1', status: 'completed', changes: [update('src/a.ts'), update('src/b.ts'), update('src/a.ts')] };
    log.ensureToolStart('f1', 'fileChange', patch, 'in_progress', { source: 'stream' });
    log.endTool('f1', 'completed');
    const second = { type: 'fileChange', id: 'f2', status: 'completed', changes: [update('src/b.ts'), update('src/c.ts')] };
    log.ensureToolStart('f2', 'fileChange', second, 'in_progress', { source: 'stream' });
    log.endTool('f2', 'completed');

    expect(log.turnTally()?.filesChanged).toBe(3);
    expect(ofType(emitted, 'tool.start').map((event) => event.target)).toEqual(['src/a.ts', 'src/b.ts']);
  });

  it('does not count pointing a frame at a URL or opening a project tab as a changed file, on either harness (ONL-2857)', () => {
    const claude = makeLog();
    claude.log.beginTurn();
    claude.log.ensureToolStart('u1', SET_FRAME_URL_TOOL, { frameId: 'f', url: 'http://localhost:3000/about' }, 'in_progress', { source: 'hook' });
    claude.log.endTool('u1', 'completed');
    claude.log.ensureToolStart('t1', CREATE_PROJECT_TAB_TOOL, { name: 'Try' }, 'in_progress', { source: 'hook' });
    claude.log.endTool('t1', 'completed');
    claude.log.ensureToolStart('u2', SET_FRAME_URL_TOOL, { frameId: 'f', url: 'nope' }, 'in_progress', { source: 'hook' });
    claude.log.endTool('u2', 'failed');
    claude.log.ensureToolStart('e1', 'Edit', { file_path: `${CWD}/a.ts`, old_string: 'a', new_string: 'b' }, 'in_progress', { source: 'hook' });
    claude.log.endTool('e1', 'completed');

    const claudeTally = claude.log.turnTally();
    expect(claudeTally?.filesChanged).toBe(1);
    expect(claudeTally?.hadFailedEdit).toBe(false);
    expect(ofType(claude.emitted, 'tool.start').map((event) => event.kind)).toEqual(['edit', 'edit', 'edit', 'edit']);

    const codex = new EventLog({ sessionId: 's2', cwd: CWD, emit: () => undefined, presentation: APPSERVER_PRESENTATION });
    codex.beginTurn();
    codex.ensureToolStart('u1', 'dynamicToolCall', { tool: SET_FRAME_URL_TOOL_NAME, arguments: { frameId: 'f', url: '/about' } }, 'in_progress', { source: 'stream' });
    codex.endTool('u1', 'completed');
    codex.ensureToolStart('t1', 'dynamicToolCall', { tool: CREATE_PROJECT_TAB_TOOL_NAME, arguments: { name: 'Try' } }, 'in_progress', { source: 'stream' });
    codex.endTool('t1', 'completed');

    expect(codex.turnTally()?.filesChanged).toBe(0);
  });
});

describe('replay', () => {
  it('returns exactly the suffix after sinceSeq, and agrees with what was emitted', () => {
    const { log, emitted } = makeLog();
    for (let n = 1; n <= 5; n += 1) {
      log.push({ type: 'text.delta', blockId: 'b1', delta: `${n}` });
    }

    expect(log.lastSeq).toBe(5);
    expect(log.since()).toEqual(emitted);

    expect(log.since(2).map((e) => e.seq)).toEqual([3, 4, 5]);
    expect(log.since(0).map((e) => e.seq)).toEqual([1, 2, 3, 4, 5]);

    expect(log.since(5)).toEqual([]);
    expect(log.since(99)).toEqual([]);
  });
});

describe('the wait a turn spends holding a question (ONL-2295)', () => {
  it('reports no anchor and a zero wait on a turn that never asked', () => {
    const { log } = makeLog();
    log.beginTurn();

    expect(log.questionParkedSince).toBeUndefined();
    expect(log.turnWaitedMs).toBe(0);
    expect(log.turnTally()?.waitedMs).toBe(0);
  });

  it('holds the anchor while parked and banks the wait on the answer', () => {
    const { log } = makeLog();
    log.beginTurn();

    log.parkQuestion(1_000);
    expect(log.questionParkedSince).toBe(1_000);
    // Still settled at zero mid-pause: the open interval is the anchor's to report, not the total's.
    expect(log.turnWaitedMs).toBe(0);

    log.unparkQuestion(91_000);
    expect(log.questionParkedSince).toBeUndefined();
    expect(log.turnWaitedMs).toBe(90_000);
  });

  it('keeps the earliest park when a second question arrives', () => {
    const { log } = makeLog();
    log.beginTurn();

    log.parkQuestion(1_000);
    log.parkQuestion(5_000);

    expect(log.questionParkedSince).toBe(1_000);
    log.unparkQuestion(11_000);
    expect(log.turnWaitedMs).toBe(10_000);
  });

  it('adds both waits of a turn that paused twice', () => {
    const { log } = makeLog();
    log.beginTurn();

    log.parkQuestion(1_000);
    log.unparkQuestion(4_000);
    log.parkQuestion(10_000);
    log.unparkQuestion(17_000);

    expect(log.turnWaitedMs).toBe(10_000);
  });

  it('starts the next turn at zero, so one turn cannot discount another', () => {
    const { log } = makeLog();
    log.beginTurn();
    log.parkQuestion(1_000);
    log.unparkQuestion(91_000);

    log.beginTurn();

    expect(log.turnWaitedMs).toBe(0);
    expect(log.questionParkedSince).toBeUndefined();
  });

  it('unparking what was never parked banks nothing', () => {
    const { log } = makeLog();
    log.beginTurn();

    log.unparkQuestion(50_000);

    expect(log.turnWaitedMs).toBe(0);
  });

  it('never banks a negative wait when the clock runs backwards', () => {
    const { log } = makeLog();
    log.beginTurn();

    log.parkQuestion(90_000);
    log.unparkQuestion(1_000);

    expect(log.turnWaitedMs).toBe(0);
  });
});
