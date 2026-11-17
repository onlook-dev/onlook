import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { EventLog } from '../event-log.js';
import type { TurnSummary } from '../event-log.js';
import { foldSessionState } from '@studio/events';
import type { AgentConnection, StudioEvent } from '@studio/events';
import { APPSERVER_PRESENTATION } from './presentation.js';
import { CAPTURE_FRAME_TOOL_NAME } from '../tool-names.js';
import {
  CODE_BY_CODEX_ERROR,
  tokenUsage,
  commandResult,
  createAppServerTurnState,
  handleAppServerFrame,
} from './translate.js';

function drive(
  frames: Record<string, unknown>[],
  presentation?: typeof APPSERVER_PRESENTATION,
): {
  events: StudioEvent[];
  unmapped: Map<string, number>;
  summaries: TurnSummary[];
} {
  const events: StudioEvent[] = [];
  const summaries: TurnSummary[] = [];
  const log = new EventLog({
    sessionId: 'test',
    cwd: '/tmp/test',
    emit: (event) => {
      events.push(event);
    },
    ...(presentation === undefined ? {} : { presentation }),
  });
  const account = {};
  let state = createAppServerTurnState();
  for (const frame of frames) {
    // `NEW_TURN` is what `run()` does on every prompt: a fresh turn state, the same account state.
    if (frame === NEW_TURN) {
      state = createAppServerTurnState();
      continue;
    }
    handleAppServerFrame(log, frame, state, {
      account,
      onTurnEnded: (summary) => {
        summaries.push(summary);
      },
    });
  }
  return { events, unmapped: log.unmappedTypes, summaries };
}

/** A marker frame, not a protocol method: it stands for the turn-state reset between prompts. */
const NEW_TURN: Record<string, unknown> = { method: '__new_turn__' };

const turnStarted = { method: 'turn/started', params: { turn: { id: 't1' } } };
const turnCompleted = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  method: 'turn/completed',
  params: { turn: { id: 't1', status: 'completed', error: null, durationMs: 13816, ...over } },
});
const started = (item: Record<string, unknown>): Record<string, unknown> => ({
  method: 'item/started',
  params: { item },
});
const completed = (item: Record<string, unknown>): Record<string, unknown> => ({
  method: 'item/completed',
  params: { item },
});
const types = (events: StudioEvent[]): string[] => events.map((e) => e.type);

describe('block identity comes from the server-minted item id', () => {
  it('keeps bundled MCP servers unrowed without changing aggregate use', () => {
    const log = new EventLog({ sessionId: 'test', cwd: '/tmp/test', emit: () => {}, presentation: APPSERVER_PRESENTATION });
    const state = createAppServerTurnState();
    const options = { connectors: true, internalMcpServers: new Set(['pencil']) };
    handleAppServerFrame(log, turnStarted, state, options);
    for (const server of ['studio', 'codex_apps', 'codex_app', 'cua_repl', 'node_repl', 'pencil']) {
      const item = { id: server, type: 'mcpToolCall', server, tool: 'run' };
      handleAppServerFrame(log, started(item), state, options);
      handleAppServerFrame(log, completed({ ...item, status: 'completed' }), state, options);
    }
    expect(log.events.filter((event) => event.type === 'tool.start')).toHaveLength(0);
    expect(log.turnTally()?.mcpToolCallCount).toBe(5);
  });

  it('stopping a connector call settles its visible row instead of leaving it spinning', () => {
    const log = new EventLog({ sessionId: 'test', cwd: '/tmp/test', emit: () => {}, presentation: APPSERVER_PRESENTATION });
    const state = createAppServerTurnState();
    handleAppServerFrame(log, turnStarted, state, { connectors: true });
    handleAppServerFrame(log, started({ id: 'mcp', type: 'mcpToolCall', server: 'figma', tool: 'get_design_context' }), state, { connectors: true });
    handleAppServerFrame(log, turnCompleted({ status: 'interrupted' }), state, { connectors: true });
    expect(log.events.filter((event) => event.type === 'tool.end').map((event) => event.status)).toEqual(['canceled']);
    expect(state.openToolCalls.size).toBe(0);
  });

  it.each([false, true])('external MCP rows respect connectors=%s and preserve aggregate MCP use', (connectors) => {
    const log = new EventLog({ sessionId: 'test', cwd: '/tmp/test', emit: () => {}, presentation: APPSERVER_PRESENTATION });
    const state = createAppServerTurnState();
    const items = [
      { id: 'read', type: 'mcpToolCall', server: 'figma', tool: 'get_design_context' },
      { id: 'write', type: 'mcpToolCall', server: 'figma', tool: 'generate_figma_design' },
      { id: 'search', type: 'mcpToolCall', server: 'mobbin', tool: 'search_screens' },
    ];
    handleAppServerFrame(log, turnStarted, state, { connectors });
    for (const item of items) {
      handleAppServerFrame(log, started(item), state, { connectors });
      handleAppServerFrame(log, completed({ ...item, status: 'completed', result: { content: [{ type: 'text', text: 'Design reference' }] } }), state, { connectors });
    }
    expect(log.events.filter((event) => event.type === 'tool.start')).toHaveLength(connectors ? 3 : 0);
    if (connectors) {
      expect(log.events.filter((event) => event.type === 'tool.start').map((event) => event.title)).toEqual(['figma', 'figma', 'mobbin']);
      expect(log.events.filter((event) => event.type === 'tool.end').map((event) => event.result)).toEqual(['Design reference', 'Design reference', 'Design reference']);
    }
    const tally = log.turnTally();
    expect(tally?.mcpToolCallCount).toBe(3);
    expect(tally?.toolCallCount).toBe(0);
  });

  it('opens, streams and closes a text block', () => {
    const { events } = drive([
      turnStarted,
      started({ type: 'agentMessage', id: 'msg_1' }),
      { method: 'item/agentMessage/delta', params: { itemId: 'msg_1', delta: 'Hel' } },
      { method: 'item/agentMessage/delta', params: { itemId: 'msg_1', delta: 'lo' } },
      completed({ type: 'agentMessage', id: 'msg_1', text: 'Hello' }),
      turnCompleted(),
    ]);
    expect(types(events)).toEqual([
      'turn.started',
      'text.start',
      'text.delta',
      'text.delta',
      'text.end',
      'turn.ended',
    ]);
    const deltas = events.filter((e) => e.type === 'text.delta');
    expect(deltas.map((e) => (e as { delta: string }).delta).join('')).toBe('Hello');
    const blockIds = new Set(deltas.map((e) => (e as { blockId: string }).blockId));
    expect(blockIds.size).toBe(1);
  });

  it('keeps two interleaved items in separate blocks', () => {
    const { events } = drive([
      turnStarted,
      started({ type: 'reasoning', id: 'rs_1' }),
      started({ type: 'agentMessage', id: 'msg_1' }),
      { method: 'item/reasoning/summaryTextDelta', params: { itemId: 'rs_1', delta: 'thinking' } },
      { method: 'item/agentMessage/delta', params: { itemId: 'msg_1', delta: 'answer' } },
    ]);
    const thinking = events.find((e) => e.type === 'thinking.delta') as { blockId: string };
    const text = events.find((e) => e.type === 'text.delta') as { blockId: string };
    expect(thinking.blockId).not.toBe(text.blockId);
  });

  it('drops a delta for a block that was never opened', () => {
    const { events } = drive([
      turnStarted,
      { method: 'item/agentMessage/delta', params: { itemId: 'never-opened', delta: 'x' } },
    ]);
    expect(types(events)).toEqual(['turn.started']);
  });

  it('separates consecutive summary parts of one reasoning item (ONL-2382)', () => {
    const { events } = drive([
      turnStarted,
      started({ type: 'reasoning', id: 'rs_1' }),
      { method: 'item/reasoning/summaryPartAdded', params: { itemId: 'rs_1', summaryIndex: 0 } },
      { method: 'item/reasoning/summaryTextDelta', params: { itemId: 'rs_1', summaryIndex: 0, delta: 'Planning' } },
      { method: 'item/reasoning/summaryPartAdded', params: { itemId: 'rs_1', summaryIndex: 1 } },
      { method: 'item/reasoning/summaryTextDelta', params: { itemId: 'rs_1', summaryIndex: 1, delta: 'Preparing' } },
    ]);
    const text = events
      .filter((e) => e.type === 'thinking.delta')
      .map((e) => (e as { delta: string }).delta)
      .join('');
    expect(text).toBe('Planning\n\nPreparing');
  });

  it('handles both reasoning delta channels', () => {
    for (const method of ['item/reasoning/summaryTextDelta', 'item/reasoning/textDelta']) {
      const { events } = drive([
        turnStarted,
        started({ type: 'reasoning', id: 'rs_1' }),
        { method, params: { itemId: 'rs_1', delta: 'why' } },
      ]);
      expect(types(events)).toContain('thinking.delta');
    }
  });
});

describe('command execution becomes a tool row', () => {
  it('announces on started and completes on completed', () => {
    const { events } = drive([
      turnStarted,
      started({ type: 'commandExecution', id: 'call_1', command: 'rg --files', status: 'inProgress' }),
      completed({
        type: 'commandExecution',
        id: 'call_1',
        command: 'rg --files',
        status: 'completed',
        exitCode: 0,
        aggregatedOutput: './README.md\n',
      }),
    ]);
    expect(types(events)).toEqual(['turn.started', 'tool.start', 'tool.end']);
    expect(events[2]).toMatchObject({ status: 'completed', isError: false });
  });

  it('reads failure from the EXPLICIT status — not only the exit code', () => {
    expect(commandResult({ status: 'failed', aggregatedOutput: 'boom' })).toEqual({
      text: 'boom',
      isError: true,
    });
  });

  it.each([null, undefined, 0, 1])('keeps a declined command denied with exit code %s', (exitCode) => {
    const { events, summaries } = drive([
      turnStarted,
      started({ type: 'commandExecution', id: 'call_1', command: 'npm install' }),
      completed({ type: 'commandExecution', id: 'call_1', status: 'declined', exitCode }),
      turnCompleted(),
    ]);
    expect(events.find((event) => event.type === 'tool.end')).toMatchObject({
      status: 'denied',
      isError: false,
    });
    const group = foldSessionState(events).items.find((item) => item.kind === 'tools');
    expect(group?.kind === 'tools' ? group.calls[0]?.status : undefined).toBe('denied');
    expect(summaries[0]).toMatchObject({ deniedToolCount: 1, failedToolCount: 0 });
  });

  it('falls back to the exit code when status is one this version does not name', () => {
    expect(commandResult({ status: 'somethingNew', exitCode: 2, aggregatedOutput: 'nope' })).toEqual({
      text: 'nope',
      isError: true,
    });
  });

  it('treats exit 0 with no status as success', () => {
    expect(commandResult({ exitCode: 0, aggregatedOutput: 'ok' })).toEqual({
      text: 'ok',
      isError: false,
    });
  });
});

describe('the turn ends natively — nothing is synthesized', () => {
  it('carries the SERVER duration, not a wall-clock subtraction', () => {
    const { events } = drive([turnStarted, turnCompleted()]);
    const ended = events.find((e) => e.type === 'turn.ended') as { durationMs?: number };
    expect(ended.durationMs).toBe(13816);
  });

  it('a failed turn ends through the same notification, with the error surfaced', () => {
    const { events } = drive([
      turnStarted,
      turnCompleted({ status: 'failed', error: { message: 'model unavailable' } }),
    ]);
    expect(types(events)).toEqual(['turn.started', 'session.error', 'turn.ended']);
    expect(events[1]).toMatchObject({ message: 'model unavailable' });
    expect(events[2]).toMatchObject({ stopReason: 'failed' });
  });

  it('does not emit session.error for a completed turn', () => {
    const { events } = drive([turnStarted, turnCompleted()]);
    expect(types(events)).not.toContain('session.error');
  });
});

describe('an interrupted turn leaves nothing spinning', () => {
  it('closes a text block the interrupt left open', () => {
    const { events } = drive([
      turnStarted,
      started({ type: 'agentMessage', id: 'msg_1' }),
      { method: 'item/agentMessage/delta', params: { itemId: 'msg_1', delta: 'half a sen' } },
      turnCompleted({ status: 'interrupted', durationMs: 6011 }),
    ]);
    expect(types(events)).toEqual([
      'turn.started',
      'text.start',
      'text.delta',
      'text.end',
      'turn.ended',
    ]);
    expect(events[4]).toMatchObject({ stopReason: 'interrupted', durationMs: 6011 });
  });

  it('cancels a tool call the interrupt left open', () => {
    const { events } = drive([
      turnStarted,
      started({ type: 'commandExecution', id: 'call_1', command: 'sleep 100' }),
      turnCompleted({ status: 'interrupted' }),
    ]);
    const end = events.find((e) => e.type === 'tool.end');
    expect(end).toMatchObject({ status: 'canceled' });
  });

  it('does not double-close an item that completed normally', () => {
    const { events } = drive([
      turnStarted,
      started({ type: 'agentMessage', id: 'msg_1' }),
      completed({ type: 'agentMessage', id: 'msg_1', text: 'done' }),
      turnCompleted(),
    ]);
    expect(events.filter((e) => e.type === 'text.end')).toHaveLength(1);
  });
});

describe('a file change announces a tool row', () => {
  it('opens a row on started and closes it on completed', () => {
    // The approval card groups under the row this mints; without it the card renders nowhere.
    const change = { path: '/w/NOTES.md', kind: { type: 'add' }, diff: '@@ +1 @@\n+hello' };
    const { events } = drive([
      turnStarted,
      started({ type: 'fileChange', id: 'call_1', status: 'inProgress', changes: [change] }),
      completed({ type: 'fileChange', id: 'call_1', status: 'completed', changes: [change] }),
    ]);
    expect(types(events)).toEqual(['turn.started', 'tool.start', 'tool.update', 'tool.end']);
    expect(events[1]).toMatchObject({ toolCallId: 'call_1' });
    expect(events[3]).toMatchObject({ status: 'completed' });
    expect(JSON.stringify(events[3])).toContain('NOTES.md');
  });

  it('a completed file change counts toward the turn (ONL-2286), a failed one does not', () => {
    const change = { path: '/w/NOTES.md', kind: { type: 'add' }, diff: '@@ +1 @@\n+hello' };
    const { events } = drive(
      [
        turnStarted,
        started({ type: 'fileChange', id: 'call_1', status: 'inProgress', changes: [change] }),
        completed({ type: 'fileChange', id: 'call_1', status: 'completed', changes: [change] }),
        started({ type: 'fileChange', id: 'call_2', changes: [{ ...change, path: '/w/OTHER.md' }] }),
        completed({ type: 'fileChange', id: 'call_2', status: 'failed', changes: [] }),
        turnCompleted(),
      ],
      APPSERVER_PRESENTATION,
    );
    const ended = events.find((e) => e.type === 'turn.ended') as { filesChanged?: number };
    expect(ended.filesChanged).toBe(1);
  });

  it('marks a failed file change as failed', () => {
    const { events } = drive([
      turnStarted,
      started({ type: 'fileChange', id: 'call_1', changes: [] }),
      completed({ type: 'fileChange', id: 'call_1', status: 'failed', changes: [] }),
    ]);
    expect(events.at(-1)).toMatchObject({ type: 'tool.end', status: 'failed' });
  });

  it('publishes targets from patch updates during the turn and keeps a stopped change stopped', () => {
    const changes = [{ path: '/tmp/test/a.ts', kind: { type: 'update' } }, { path: '/tmp/test/new.ts', kind: { type: 'add' } }];
    const frames = [turnStarted, started({ type: 'fileChange', id: 'patch', changes: [] }),
      { method: 'item/fileChange/patchUpdated', params: { itemId: 'patch', changes } }];
    const live = drive(frames, APPSERVER_PRESENTATION);
    expect(foldSessionState(live.events).touchedFiles).toEqual([{ path: 'a.ts', status: 'editing' }, { path: 'new.ts', status: 'editing' }]);
    const stopped = drive([...frames, turnCompleted({ status: 'interrupted' }), completed({ type: 'fileChange', id: 'patch', status: 'completed', changes })], APPSERVER_PRESENTATION);
    expect(foldSessionState(stopped.events).touchedFiles).toEqual([{ path: 'a.ts', status: 'stopped' }, { path: 'new.ts', status: 'stopped' }]);
    expect(stopped.events.filter((event) => event.type === 'tool.end')).toHaveLength(1);
  });

  it('learns final targets from completion when the initial patch was empty', () => {
    const { events } = drive([turnStarted, started({ type: 'fileChange', id: 'patch', changes: [] }),
      completed({ type: 'fileChange', id: 'patch', status: 'completed', changes: [{ path: '/tmp/test/new.ts', kind: { type: 'add' } }] })], APPSERVER_PRESENTATION);
    expect(foldSessionState(events).touchedFiles).toEqual([{ path: 'new.ts', status: 'created', hasSuccessfulChange: true }]);
  });

  it.each(['delete', 'move'] as const)('uses the revised %s operation for an already announced path', (operation) => {
    const initial = [{ path: '/tmp/test/a.ts', kind: { type: 'update' } }];
    const revised = [{ path: '/tmp/test/a.ts', kind: operation === 'delete' ? { type: 'delete' } : { type: 'update', move_path: '/tmp/test/b.ts' } }];
    const { events } = drive([turnStarted, started({ type: 'fileChange', id: 'patch', changes: initial }),
      { method: 'item/fileChange/patchUpdated', params: { itemId: 'patch', changes: revised } },
      completed({ type: 'fileChange', id: 'patch', status: 'completed', changes: revised })], APPSERVER_PRESENTATION);
    expect(foldSessionState(events).touchedFiles).toEqual([
      { path: 'a.ts', status: 'deleted', hasSuccessfulChange: true }, ...(operation === 'move' ? [{ path: 'b.ts', status: 'created' as const, hasSuccessfulChange: true }] : []),
    ]);
  });
});

describe('a dynamic tool call ends with the tool’s own verdict (ONL-2304)', () => {
  const call = (over: Record<string, unknown>): Record<string, unknown> => ({
    type: 'dynamicToolCall',
    id: 'call_1',
    tool: CAPTURE_FRAME_TOOL_NAME,
    arguments: { frame_id: 'f1' },
    status: 'inProgress',
    ...over,
  });
  const FAILED_TEXT = 'Studio could not capture that: the page did not respond in time';

  it('success:false ends failed with the text as the error, whatever codex calls the status', () => {
    const { events } = drive([
      turnStarted,
      started(call({})),
      completed(call({ status: 'completed', success: false, contentItems: [{ type: 'inputText', text: FAILED_TEXT }] })),
    ]);
    expect(events[2]).toMatchObject({ type: 'tool.end', status: 'failed', isError: true });
    expect(JSON.stringify(events[2])).toContain('did not respond');
  });

  it('status:failed ends failed; success:true ends completed (inverse)', () => {
    const failed = drive([turnStarted, started(call({})), completed(call({ status: 'failed', success: null, contentItems: null }))]);
    expect(failed.events[2]).toMatchObject({ type: 'tool.end', status: 'failed' });
    const done = drive([
      turnStarted,
      started(call({})),
      completed(call({ status: 'completed', success: true, contentItems: [{ type: 'inputText', text: 'Screenshot of frame f1' }] })),
    ]);
    expect(done.events[2]).toMatchObject({ type: 'tool.end', status: 'completed' });
    expect((done.events[2] as { isError?: boolean }).isError).toBeFalsy();
  });
});

describe('the drift counter', () => {
  it('counts an unknown notification instead of dropping it', () => {
    const { unmapped } = drive([{ method: 'turn/diff/updated', params: {} }]);
    expect(unmapped.get('turn/diff/updated')).toBe(1);
  });

  it('counts an unrendered item type by name, not as a bare method', () => {
    const { unmapped } = drive([turnStarted, started({ type: 'webSearch', id: 'ws_1' })]);
    expect(unmapped.get('item/started:webSearch')).toBe(1);
  });

  it('does NOT count the deliberate non-renders', () => {
    const { unmapped, events } = drive([
      turnStarted,
      started({ type: 'userMessage', id: 'um_1' }),
      completed({ type: 'userMessage', id: 'um_1' }),
      { method: 'mcpServer/startupStatus/updated', params: {} },
      { method: 'hook/started', params: {} },
      { method: 'thread/tokenUsage/updated', params: {} },
    ]);
    expect([...unmapped.keys()]).toEqual([]);
    expect(types(events)).toEqual(['turn.started']);
  });

  it('reads context from the LAST request, never the thread accumulator (ONL-2381)', () => {
    const tokens = tokenUsage({
      last: { inputTokens: 40_000, cachedInputTokens: 38_000, outputTokens: 1_000, totalTokens: 41_000 },
      total: { inputTokens: 2_900_000, outputTokens: 10_000, totalTokens: 2_910_000 },
      modelContextWindow: 258_400,
    });
    expect(tokens?.context).toBe(41_000);
    expect(tokens?.total).toBe(41_000);
    expect(tokens?.threadTotal).toBe(2_910_000);
    expect(tokens?.contextWindow).toBe(258_400);
  });
});

describe("the codex rate limit the translate used to drop (ONL-2197)", () => {
  const update = (rateLimits: Record<string, unknown>) => ({
    method: 'account/rateLimits/updated',
    params: { rateLimits },
  });

  it('carries both windows and counts as no drift', () => {
    const { events, unmapped } = drive([
      update({
        primary: { usedPercent: 41, resetsAt: 1_790_000_000, windowDurationMins: 300 },
        secondary: { usedPercent: 7 },
      }),
    ]);

    const limits = events.filter((event) => event.type === 'usage.limits');
    expect(limits).toHaveLength(1);
    const [event] = limits;
    if (event?.type !== 'usage.limits') throw new Error('shape');
    expect(event.windows).toEqual([
      { kind: 'primary', usedPercent: 41, resetsAt: 1_790_000_000, windowDurationMins: 300 },
      { kind: 'secondary', usedPercent: 7 },
    ]);
    expect(unmapped.size).toBe(0);
  });

  it('a rolling update that omits a window leaves the observed value alone, across a turn', () => {
    const { events } = drive([
      update({ primary: { usedPercent: 41 }, secondary: { usedPercent: 7 } }),
      // The prompt that made the old code forget: the snapshot lived on the turn state.
      NEW_TURN,
      update({ primary: { usedPercent: 55 }, secondary: null }),
    ]);

    const last = events.filter((event) => event.type === 'usage.limits').at(-1);
    if (last?.type !== 'usage.limits') throw new Error('shape');
    expect(last.windows).toEqual([
      { kind: 'primary', usedPercent: 55 },
      { kind: 'secondary', usedPercent: 7 },
    ]);
  });

  it('a re-sent window keeps the fields the update omits', () => {
    const { events } = drive([
      update({ limitName: 'Weekly limit', primary: { usedPercent: 41, resetsAt: 1_790_000_000 } }),
      NEW_TURN,
      update({ primary: { usedPercent: 55 } }),
    ]);

    const last = events.filter((event) => event.type === 'usage.limits').at(-1);
    if (last?.type !== 'usage.limits') throw new Error('shape');
    expect(last.windows[0]).toEqual({
      kind: 'primary',
      label: 'Weekly limit',
      usedPercent: 55,
      resetsAt: 1_790_000_000,
    });
  });

  it('drops a label that does not look like a label, and keeps the window', () => {
    const { events } = drive([
      update({ limitName: '/Users/wren/secret-repo', primary: { usedPercent: 41 } }),
    ]);

    const [event] = events.filter((item) => item.type === 'usage.limits');
    if (event?.type !== 'usage.limits') throw new Error('shape');
    expect(event.windows[0]).toEqual({ kind: 'primary', usedPercent: 41 });
    expect(event.windows[0]).not.toHaveProperty('label');
  });

  it('leaves an unreported reset absent rather than present-as-undefined', () => {
    const { events } = drive([update({ primary: { usedPercent: 41 } })]);

    const [event] = events.filter((item) => item.type === 'usage.limits');
    if (event?.type !== 'usage.limits') throw new Error('shape');
    expect(event.windows[0]).not.toHaveProperty('resetsAt');
    expect(event.windows[0]).not.toHaveProperty('windowDurationMins');
  });

  it('opens and closes no turn: it is account-scoped', () => {
    const { events } = drive([update({ primary: { usedPercent: 1 } })]);

    expect(events.map((event) => event.type)).toEqual(['usage.limits']);
  });

  it('a usage-limited turn ending is its own code, a broken one is not', () => {
    const limited = drive([
      {
        method: 'turn/completed',
        params: { turn: { status: 'failed', error: { message: 'x', codexErrorInfo: 'usageLimitExceeded' } } },
      },
    ]);
    const broken = drive([
      { method: 'turn/completed', params: { turn: { status: 'failed', error: { message: 'x' } } } },
    ]);

    const code = (result: { events: StudioEvent[] }) => {
      const error = result.events.find((event) => event.type === 'session.error');
      if (error?.type !== 'session.error') throw new Error('shape');
      return error.code;
    };
    expect(code(limited)).toBe('usage_limit_exceeded');
    expect(code(broken)).toBe('unknown');
  });
});

describe('a credential the API refuses ends the turn signed out (ONL-2114)', () => {
  // codex 0.156.1 sends `RefreshTokenFailed` as `unauthorized`, and a 401 with no recovery left as `other`.
  const REFRESH_REFUSED = {
    message:
      'Your access token could not be refreshed because your refresh token was revoked. Please log out and sign in again.',
    codexErrorInfo: 'unauthorized',
    additionalDetails: null,
  };
  const NO_CREDENTIAL = {
    message:
      'unexpected status 401 Unauthorized: Missing bearer or basic authentication in header, url: https://api.openai.com/v1/responses, cf-ray: 9a1b2c3d4e5f6789-SJC, request id: req_0123',
    codexErrorInfo: 'other',
    additionalDetails: null,
  };
  const failed = (error: unknown): Record<string, unknown> => ({
    method: 'turn/completed',
    params: { turn: { id: 't1', status: 'failed', error } },
  });

  function end(frame: Record<string, unknown>): { code?: string; connections: AgentConnection[] } {
    const events: StudioEvent[] = [];
    const connections: AgentConnection[] = [];
    const log = new EventLog({ sessionId: 'test', cwd: '/tmp/test', emit: (event) => events.push(event) });
    handleAppServerFrame(log, turnStarted, createAppServerTurnState(), {});
    handleAppServerFrame(log, frame, createAppServerTurnState(), {
      onConnection: (connection) => connections.push(connection),
    });
    const error = events.find((event) => event.type === 'session.error');
    return { ...(error?.type === 'session.error' && error.code !== undefined ? { code: error.code } : {}), connections };
  }

  it.each([
    ['a refresh token codex could not renew', REFRESH_REFUSED],
    ['a request the API answered 401 with no recovery left', NO_CREDENTIAL],
  ])('%s is `unauthenticated`, and reports codex signed out', (_label, error) => {
    expect(end(failed(error))).toEqual({
      code: 'unauthenticated',
      connections: [{ status: 'unauthenticated', harness: 'codex' }],
    });
  });

  it.each([
    ['another status on the same shape', { ...NO_CREDENTIAL, message: 'unexpected status 500 Internal Server Error: boom' }],
    ['a 401 quoted later in the message', { message: 'stream disconnected: upstream said 401', codexErrorInfo: 'other' }],
    ['a usage limit', { message: 'usage limit reached', codexErrorInfo: 'usageLimitExceeded' }],
  ])('%s leaves the connection alone', (_label, error) => {
    const { code, connections } = end(failed(error));
    expect(code).not.toBe('unauthenticated');
    expect(connections).toEqual([]);
  });

  it('a turn that completes reports nothing', () => {
    expect(end(turnCompleted())).toEqual({ connections: [] });
  });
});

describe('the telemetry summary a codex turn reports (ONL-2463)', () => {
  const change = { path: '/w/NOTES.md', kind: { type: 'add' }, diff: '@@ +1 @@\n+hello' };
  const edit = (id: string): Record<string, unknown>[] => [
    started({ type: 'fileChange', id, status: 'inProgress', changes: [change] }),
    completed({ type: 'fileChange', id, status: 'completed', changes: [change] }),
  ];

  it('sources the summary from the turn tally', () => {
    const { summaries } = drive(
      [turnStarted, ...edit('call_1'), turnCompleted()],
      APPSERVER_PRESENTATION,
    );
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({ turnId: 't1', filesChanged: 1, stopReason: 'completed' });
  });

  it('reports no changed file when the turn ran no tool', () => {
    const { summaries } = drive([turnStarted, turnCompleted()], APPSERVER_PRESENTATION);
    expect(summaries[0]?.filesChanged).toBe(0);
  });

  it('carries the interrupted and failed statuses through as the stop reason', () => {
    const { summaries: stopped } = drive([turnStarted, turnCompleted({ status: 'interrupted' })]);
    expect(stopped[0]?.stopReason).toBe('interrupted');
    const { summaries: failed } = drive([turnStarted, turnCompleted({ status: 'failed' })]);
    expect(failed[0]?.stopReason).toBe('failed');
  });

  it('refuses a turn that never began, so no t0 row reaches a dashboard (ONL-2180)', () => {
    const { summaries, events } = drive([turnCompleted()]);
    expect(summaries).toEqual([]);
    expect(types(events)).toContain('turn.ended');
  });

  it('reports one summary when the same turn completes twice', () => {
    const { summaries } = drive([turnStarted, turnCompleted(), turnCompleted()]);
    expect(summaries).toHaveLength(1);
  });

  it('refuses a status the protocol does not declare, and never ships its text', () => {
    const { summaries, events } = drive([
      turnStarted,
      turnCompleted({ status: 'weird-provider-value' }),
    ]);
    expect(summaries).toEqual([]);
    expect(JSON.stringify(summaries)).not.toContain('weird-provider-value');
    // Renderer-facing, so it keeps what the protocol sent.
    expect(JSON.stringify(events)).toContain('weird-provider-value');
  });

  it('refuses a missing status and an in-progress one', () => {
    const { summaries: missing } = drive([turnStarted, turnCompleted({ status: undefined })]);
    expect(missing).toEqual([]);
    const { summaries: running } = drive([turnStarted, turnCompleted({ status: 'inProgress' })]);
    expect(running).toEqual([]);
  });
});

describe('a patch the user declined landed nothing (ONL-2463)', () => {
  const change = { path: '/w/NOTES.md', kind: { type: 'add' }, diff: '@@ +1 @@\n+hello' };
  const patch = (status: string): Record<string, unknown>[] => [
    started({ type: 'fileChange', id: 'call_1', status: 'inProgress', changes: [change] }),
    completed({ type: 'fileChange', id: 'call_1', status, changes: [change] }),
  ];

  it('ends the row denied and counts no changed target', () => {
    const { events, summaries } = drive(
      [turnStarted, ...patch('declined'), turnCompleted()],
      APPSERVER_PRESENTATION,
    );
    const ended = events.find((e) => e.type === 'tool.end') as { status?: string };
    expect(ended.status).toBe('denied');
    expect(summaries[0]?.filesChanged).toBe(0);
  });

  it('leaves an applied patch and a failed one exactly as they were', () => {
    const { events: applied, summaries: appliedSummaries } = drive(
      [turnStarted, ...patch('completed'), turnCompleted()],
      APPSERVER_PRESENTATION,
    );
    expect((applied.find((e) => e.type === 'tool.end') as { status?: string }).status).toBe('completed');
    expect(appliedSummaries[0]?.filesChanged).toBe(1);

    const { events: failed } = drive([turnStarted, ...patch('failed')], APPSERVER_PRESENTATION);
    expect((failed.find((e) => e.type === 'tool.end') as { status?: string }).status).toBe('failed');
  });

  it('does not mistake a declined patch for a write the metric cannot see', () => {
    const { summaries } = drive(
      [turnStarted, ...patch('declined'), turnCompleted()],
      APPSERVER_PRESENTATION,
    );
    expect(summaries[0]?.executeTargets).toBe(0);
  });
});

describe('a codex failure reports a codex reason (ONL-2463)', () => {
  const failed = (
    error: Record<string, unknown>,
  ): { code?: string; status: number | null | undefined; events: StudioEvent[] } => {
    const events: StudioEvent[] = [];
    const log = new EventLog({ sessionId: 'test', cwd: '/tmp/test', emit: (e) => events.push(e) });
    const state = createAppServerTurnState();
    let code: string | undefined;
    let status: number | null | undefined;
    const opts = {
      account: {},
      onError: (c: string, s: number | null) => {
        code = c;
        status = s;
      },
    };
    handleAppServerFrame(log, turnStarted, state, opts);
    handleAppServerFrame(
      log,
      { method: 'turn/completed', params: { turn: { id: 't1', status: 'failed', error } } },
      state,
      opts,
    );
    return { code, status, events };
  };

  it('a failed turn with no error still ends on a row, with no error code reported (ONL-2903)', () => {
    const events: StudioEvent[] = [];
    const log = new EventLog({ sessionId: 'test', cwd: '/tmp/test', emit: (e) => events.push(e) });
    const state = createAppServerTurnState();
    const codes: string[] = [];
    const opts = { account: {}, onError: (code: string) => codes.push(code) };
    handleAppServerFrame(log, turnStarted, state, opts);
    handleAppServerFrame(log, { method: 'turn/completed', params: { turn: { id: 't1', status: 'failed' } } }, state, opts);
    expect(events.filter((event) => event.type === 'session.error').map((event) => event.type === 'session.error' && event.code)).toEqual(['unknown']);
    expect(codes).toEqual([]);
  });

  it('names a context-window failure, the codex counterpart of a long prompt', () => {
    expect(failed({ message: 'too long', codexErrorInfo: 'contextWindowExceeded' }).code).toBe(
      'prompt_too_long',
    );
  });

  it('names a plain rate limit, which used to fall through to unknown', () => {
    expect(failed({ message: 'slow down', codexErrorInfo: 'rateLimitExceeded' }).code).toBe('rate_limited');
  });

  it('names unavailable flex capacity as an API failure', () => {
    expect(failed({ message: 'capacity unavailable', codexErrorInfo: 'flexUnavailable' }).code).toBe('api_error');
  });

  it('names every error string the pinned codex protocol declares, so a bump cannot fall into unknown unseen', () => {
    const dir = fileURLToPath(new URL('./protocol/', import.meta.url));
    const [file] = readdirSync(dir).filter((name) => name.endsWith('.protocol.json'));
    const protocol = JSON.parse(readFileSync(`${dir}${file!}`, 'utf8')) as {
      definitions: { CodexErrorInfo: { anyOf: Array<{ enum?: string[] }> } };
    };
    const declared = protocol.definitions.CodexErrorInfo.anyOf.flatMap((variant) => variant.enum ?? []);
    expect(declared.length).toBeGreaterThan(0);
    expect(declared.filter((name) => !(name in CODE_BY_CODEX_ERROR))).toEqual([]);
  });

  it('names a model codex cannot find as a model failure', () => {
    expect(failed({ message: 'model not found', codexErrorInfo: 'modelNotFound' }).code).toBe('model_error');
  });

  it('names unavailable policy capacity as an API failure', () => {
    expect(failed({ message: 'capacity unavailable', codexErrorInfo: 'policyCapacityUnavailable' }).code).toBe('api_error');
  });

  it('keeps repeated approval denials out of API and account failures', () => {
    expect(failed({ message: 'too many denials', codexErrorInfo: 'tooManyDenials' }).code).toBe('unknown');
  });
  it('folds a Codex account snapshot into the weekly ending', () => {
    const resetsAt = Math.floor(Date.now() / 1000) + 86400;
    const { events } = drive([
      turnStarted,
      { method: 'account/rateLimits/updated', params: { rateLimits: { secondary: { usedPercent: 100, windowDurationMins: 10080, resetsAt } } } },
      turnCompleted({ status: 'failed', error: { message: 'Limit reached', codexErrorInfo: 'usageLimitExceeded' } }),
    ]);
    const state = foldSessionState(events);
    const row = state.items.find((item) => item.kind === 'error');
    expect(row?.kind === 'error' ? row.limit : undefined).toEqual({ window: 'weekly', resetsAt });
    expect(state.limits?.[0]?.usedPercent).toBe(100);
  });
  it('names billing failures without changing other API statuses', () => {
    expect(failed({ message: 'Insufficient credits', codexErrorInfo: 'other' }).code).toBe('billing_error');
    expect(failed({ message: 'Payment required', codexErrorInfo: { httpConnectionFailed: { httpStatusCode: 402 } } }).code).toBe('billing_error');
    expect(failed({ message: 'Unavailable', codexErrorInfo: { httpConnectionFailed: { httpStatusCode: 503 } } }).code).toBe('api_error');
  });

  it('reports the HTTP status a stream failure declares', () => {
    const { code, status } = failed({
      message: 'stream died',
      codexErrorInfo: { responseStreamDisconnected: { httpStatusCode: 503 } },
    });
    expect(status).toBe(503);
    // A transport failure is an API error, and it used to report `unknown` while carrying this status.
    expect(code).toBe('api_error');
  });

  it('reports a null status where the variant declares none', () => {
    expect(failed({ message: 'x', codexErrorInfo: 'badRequest' }).status).toBeNull();
  });

  it('still reports unknown for a variant this vocabulary does not carry', () => {
    expect(failed({ message: 'x', codexErrorInfo: 'cyberPolicy' }).code).toBe('unknown');
  });

  it('keeps the message on the transcript row and off what the error reports', () => {
    const { events } = failed({ message: 'model unavailable', codexErrorInfo: 'internalServerError' });
    const error = events.find((e) => e.type === 'session.error');
    expect(error).toMatchObject({ message: 'model unavailable', code: 'api_error' });
  });

  it('carries the status onto the row too, not only into telemetry (ONL-2495)', () => {
    const { events } = failed({
      message: 'stream died',
      codexErrorInfo: { responseStreamDisconnected: { httpStatusCode: 503 } },
    });
    const error = events.find((e) => e.type === 'session.error');
    if (error?.type !== 'session.error') throw new Error('shape');
    expect(error.apiErrorStatus).toBe(503);
  });

  it('leaves the status off the row where the variant declares none', () => {
    const { events } = failed({ message: 'x', codexErrorInfo: 'badRequest' });
    const error = events.find((e) => e.type === 'session.error');
    if (error?.type !== 'session.error') throw new Error('shape');
    expect(error.apiErrorStatus).toBeUndefined();
  });
});

describe('a codex retry raises the notice a Claude retry raises (ONL-2491)', () => {
  const retry = (error: Record<string, unknown>, willRetry = true): Record<string, unknown> => ({
    method: 'error',
    params: { error, willRetry, threadId: 'thread-1', turnId: 't1' },
  });
  // The real wire shape: the attempt exists only inside the sentence, beside a denominator the notice never shows.
  const DISCONNECTED = {
    message: 'Reconnecting... 2/5',
    codexErrorInfo: { responseStreamDisconnected: { httpStatusCode: 503 } },
    additionalDetails: null,
  };
  const retrying = (events: StudioEvent[]): StudioEvent[] =>
    events.filter((event) => event.type === 'session.retrying');

  it('carries the status of the attempt that failed, and no attempt number', () => {
    const { events, unmapped } = drive([turnStarted, retry(DISCONNECTED)]);
    const [event] = retrying(events);
    expect(event).toMatchObject({ type: 'session.retrying', status: 503 });
    expect(event !== undefined && 'attempt' in event).toBe(false);
    expect([...unmapped.keys()]).toEqual([]);
  });

  it('reports a null status where the attempt got no HTTP response', () => {
    const { events } = drive([
      turnStarted,
      retry({ message: 'retrying', codexErrorInfo: 'serverOverloaded' }),
    ]);
    expect(retrying(events)).toMatchObject([{ status: null }]);
  });

  it('a notification that will NOT retry keeps the path it had, and raises no notice', () => {
    const { events, unmapped } = drive([turnStarted, retry(DISCONNECTED, false)]);
    expect(retrying(events)).toEqual([]);
    expect(unmapped.get('error')).toBe(1);
  });

  it('the notice the projection shows is cleared by the output that follows', () => {
    const { events } = drive([turnStarted, retry(DISCONNECTED)]);
    expect(foldSessionState(events).retrying).toEqual({ status: 503 });

    const { events: recovered } = drive([
      turnStarted,
      retry(DISCONNECTED),
      started({ type: 'agentMessage', id: 'msg_1' }),
      { method: 'item/agentMessage/delta', params: { itemId: 'msg_1', delta: 'back' } },
    ]);
    expect(foldSessionState(recovered).retrying).toBeUndefined();
  });
});
