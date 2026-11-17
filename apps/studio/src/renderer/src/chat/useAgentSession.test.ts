import { describe, expect, it } from 'bun:test';
import {
  emptyState,
  foldSessionState,
  type AgentSnapshot,
  type AgentSnapshotRequest,
  type PenView,
  type StudioEvent,
  type TranscriptItem,
} from '@studio/events';
import { appendEvents, emptyBuffer, resetBuffer } from './eventBuffer.js';
import { isForeignSession, keepRowIdentities, keepTouchedFileIdentities, readAnnouncedSession, samePause, withLiveFacts } from './useAgentSession.js';

const A = '/tmp/workspaces/teal-skylark';
const B = '/tmp/workspaces/amber-swift';

it('keeps touched-file identity through unrelated text and replaces it on an actual file-state change', () => {
  const previous = [{ path: 'src/a.ts', status: 'editing' as const }];
  expect(keepTouchedFileIdentities([{ ...previous[0]! }], previous)).toBe(previous);
  expect(keepTouchedFileIdentities([{ path: 'src/a.ts', status: 'edited' }], previous)).not.toBe(previous);
  expect(keepTouchedFileIdentities([], previous)).toEqual([]);
});

describe('isForeignSession', () => {
  it('is foreign while the announced session is still the project the user left', () => {
    expect(isForeignSession({ expectedCwd: B, sessionCwd: A })).toBe(true);
  });

  it('is not foreign once the announcement catches up', () => {
    expect(isForeignSession({ expectedCwd: B, sessionCwd: B })).toBe(false);
  });

  it('treats either unknown as not foreign', () => {
    expect(isForeignSession({ sessionCwd: A })).toBe(false);
    expect(isForeignSession({ expectedCwd: A })).toBe(false);
    expect(isForeignSession({})).toBe(false);
  });
});

describe('readAnnouncedSession (ONL-2456)', () => {
  const SESSION = 'live-session';
  const models = [{ value: 'opus', displayName: 'Opus 5.5' }];
  const row = (seq: number): StudioEvent =>
    seq === 2
      ? { type: 'session.settings', models, model: 'opus', sessionId: SESSION, cwd: A, eventId: `e${seq}`, seq, ts: 0 }
      : { type: 'turn.started', turnId: `t${seq}`, sessionId: SESSION, cwd: A, eventId: `e${seq}`, seq, ts: 0 };
  const log = [1, 2, 3, 4, 5].map(row);

  function fakeRead(): { read: (req: AgentSnapshotRequest) => Promise<AgentSnapshot>; asked: AgentSnapshotRequest[] } {
    const asked: AgentSnapshotRequest[] = [];
    return {
      asked,
      read: async (req) => {
        asked.push(req);
        const since = req.sinceSeq ?? 0;
        return {
          sessionId: SESSION,
          cwd: A,
          events: log.filter((event) => event.seq > since),
          isStreaming: false,
          midTurn: 'steer',
          lastSeq: 5,
          connection: { status: 'ok' },
        };
      },
    };
  }

  it('a chat holding nothing of the announced session reads its whole log in one ask, model list included', async () => {
    const { read, asked } = fakeRead();

    const fill = await readAnnouncedSession(read, emptyBuffer, SESSION);
    const caughtUp = fill(resetBuffer(emptyBuffer, SESSION));

    expect(asked).toEqual([{ sinceSeq: 0 }]);
    expect(caughtUp.events.map((event) => event.seq)).toEqual([1, 2, 3, 4, 5]);
    expect(foldSessionState(caughtUp.events).models).toEqual(models);
  });

  it('a live row that landed before the answer keeps the rows below it', async () => {
    const { read } = fakeRead();

    const fill = await readAnnouncedSession(read, emptyBuffer, SESSION);
    const caughtUp = fill(appendEvents(resetBuffer(emptyBuffer, SESSION), [row(5)]));

    expect(caughtUp.events.map((event) => event.seq)).toEqual([1, 2, 3, 4, 5]);
    expect(caughtUp.lastSeq).toBe(5);
  });

  it('a re-announce of the session the chat already holds asks only past its last row', async () => {
    const { read, asked } = fakeRead();
    const held = appendEvents(emptyBuffer, log.slice(0, 3));

    const fill = await readAnnouncedSession(read, held, SESSION);
    const caughtUp = fill(resetBuffer(held, SESSION));

    expect(asked).toEqual([{ sinceSeq: 3 }]);
    expect(caughtUp.events.map((event) => event.seq)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('samePause (ONL-2295)', () => {
  it('keeps the same reference when the pause did not move', () => {
    const held = { questionParkedSince: 1_700_000_000_000, turnWaitedMs: 4_000 };
    expect(samePause(held, { questionParkedSince: 1_700_000_000_000, turnWaitedMs: 4_000 })).toBe(held);
  });

  it('keeps the same reference when an approval parks and the pause is untouched', () => {
    const idle = { turnWaitedMs: 0 };
    // Main emits on `needsAttention` alone, which this state does not carry.
    expect(samePause(idle, { turnWaitedMs: undefined })).toBe(idle);
  });

  it('answers a new state when the question parks', () => {
    const idle = { turnWaitedMs: 0 };
    const parked = samePause(idle, { questionParkedSince: 1_700_000_000_000, turnWaitedMs: 0 });
    expect(parked).not.toBe(idle);
    expect(parked.questionParkedSince).toBe(1_700_000_000_000);
  });

  it('answers a new state when the answer banks the wait', () => {
    const parked = { questionParkedSince: 1_700_000_000_000, turnWaitedMs: 0 };
    const resumed = samePause(parked, { turnWaitedMs: 90_000 });
    expect(resumed).not.toBe(parked);
    expect(resumed).toEqual({ questionParkedSince: undefined, turnWaitedMs: 90_000 });
  });

  it('reads an absent wait as zero rather than carrying the one before it', () => {
    const banked = { turnWaitedMs: 90_000 };
    expect(samePause(banked, {})).toEqual({ questionParkedSince: undefined, turnWaitedMs: 0 });
  });
});

describe('withLiveFacts (ONL-2294)', () => {
  const pen: PenView = { penId: 2, text: 'and widen the gutters' };
  const folded = { ...emptyState, lastSeq: 4 };

  it('keeps a Working timer anchor across a primitive completion while main remains busy (ONL-2596)', () => {
    const base = { sessionId: 'continuation', cwd: A };
    const events: StudioEvent[] = [
      { ...base, eventId: 'start', seq: 1, ts: 1000, type: 'turn.started', turnId: 'turn-1' },
      { ...base, eventId: 'end', seq: 2, ts: 2000, type: 'turn.ended', turnId: 'turn-1' },
    ];
    const ended = foldSessionState(events);
    expect(ended.turnStartedAt).toBeUndefined();
    expect(withLiveFacts(ended, { isStreaming: true, midTurn: 'steer', isForeign: false }, events).turnStartedAt).toBe(1000);
    expect(withLiveFacts(ended, { isStreaming: false, midTurn: 'steer', isForeign: false }, events).turnStartedAt).toBeUndefined();
    expect(withLiveFacts(ended, { isStreaming: true, midTurn: 'steer', isForeign: true }, events).turnStartedAt).toBeUndefined();
    events.push({ ...base, eventId: 'next', seq: 3, ts: 3000, type: 'turn.started', turnId: 'turn-2' });
    expect(withLiveFacts(foldSessionState(events), { isStreaming: true, midTurn: 'steer', isForeign: false }, events).turnStartedAt).toBe(3000);
  });

  it('shows Working from an accepted prompt before a turn has been named (ONL-2596)', () => {
    const events: StudioEvent[] = [{ sessionId: 'pending', eventId: 'prompt', seq: 1, ts: 1000, type: 'message.user', turnId: 'pending', text: 'first', origin: 'user' }];
    expect(withLiveFacts(foldSessionState(events), { isStreaming: true, midTurn: 'steer', isForeign: false }, events).turnStartedAt).toBe(1000);
  });

  it('carries the waiting prompt the fold knows nothing about', () => {
    const state = withLiveFacts(folded, { isStreaming: true, midTurn: 'steer', pen, isForeign: false });

    expect(state.pen).toEqual(pen);
    expect([state.isStreaming, state.lastSeq]).toEqual([true, 4]);
  });

  it('shows nothing waiting while the announced session is the project the user left', () => {
    const state = withLiveFacts(folded, { isStreaming: true, midTurn: 'steer', pen, isForeign: true });

    expect(state.pen).toBeUndefined();
    expect(state.isStreaming).toBe(false);
  });

  it('shows nothing waiting when the pen is empty', () => {
    const state = withLiveFacts(folded, { isStreaming: false, midTurn: 'refuse', isForeign: false });

    expect(state.pen).toBeUndefined();
    expect(state.midTurn).toBe('refuse');
  });

  it('lays the pause over the fold, and shows none of it on a foreign session (ONL-2295)', () => {
    const pause = { questionParkedSince: 1_700_000_000_000, turnWaitedMs: 4_000 };

    expect(withLiveFacts(folded, { isStreaming: true, midTurn: 'steer', pause, isForeign: false })).toMatchObject(pause);
    expect(
      withLiveFacts(folded, { isStreaming: true, midTurn: 'steer', pause, isForeign: true }).questionParkedSince,
    ).toBeUndefined();
  });
});

function counting<T>(run: () => T): { value: T; serialised: number } {
  const original = JSON.stringify;
  let serialised = 0;
  JSON.stringify = ((...args: Parameters<typeof JSON.stringify>): string => {
    serialised++;
    return original(...args);
  }) as typeof JSON.stringify;
  try {
    return { value: run(), serialised };
  } finally {
    JSON.stringify = original;
  }
}

function pushing() {
  let buffer = emptyBuffer;
  let held = keepRowIdentities([], new Map())[1];
  return {
    flush(batch: readonly StudioEvent[]) {
      buffer = appendEvents(buffer, batch);
      const folded = foldSessionState(buffer.events);
      const counted = counting(() => keepRowIdentities(folded.items, held));
      held = counted.value[1];
      return { items: counted.value[0], serialised: counted.serialised, held };
    },
  };
}

const isStreamingRow = (row: TranscriptItem): boolean =>
  (row.kind === 'assistant-text' || row.kind === 'assistant-thinking') && row.isStreaming;

type Pushed<E> = E extends unknown ? Omit<E, 'sessionId' | 'cwd' | 'eventId' | 'seq' | 'ts' | 'raw'> : never;

describe('keepRowIdentities (ONL-2650)', () => {
  let seq = 0;
  const event = (fields: Pushed<StudioEvent>): StudioEvent => {
    seq++;
    return { sessionId: 'rows', cwd: A, eventId: `e${String(seq)}`, seq, ts: 1_000, ...fields } as StudioEvent;
  };

  /** Both openings: Claude pushes `turn.started` before the prompt and codex pushes it after (ONL-2383). */
  const twoTurns = (opening: 'turn-first' | 'prompt-first'): StudioEvent[] => {
    const started: Pushed<StudioEvent> = { type: 'turn.started', turnId: 't1' };
    const prompt: Pushed<StudioEvent> = { type: 'message.user', turnId: 't1', messageId: 'm1', text: 'widen the gutters', delivery: 'waiting' };
    return [
      ...(opening === 'turn-first' ? [event(started), event(prompt)] : [event(prompt), event(started)]),
      event({ type: 'message.delivery', messageId: 'm1', outcome: 'delivered' }),
      event({ type: 'thinking.start', blockId: 'b0' }),
      event({ type: 'thinking.delta', blockId: 'b0', delta: 'the gutters are' }),
      event({ type: 'thinking.end', blockId: 'b0', text: 'the gutters are tight' }),
      event({ type: 'tool.start', toolCallId: 'tc1', name: 'Read', kind: 'read', title: 'Read page.tsx', status: 'in_progress' }),
      event({ type: 'tool.start', toolCallId: 'tc2', name: 'Edit', kind: 'edit', title: 'Edit page.tsx', status: 'in_progress', input: { edits: [{ line: 12, text: 'gap: 24px' }] } }),
      event({ type: 'permission.requested', toolCallId: 'tc2', requestId: 'r1', toolName: 'Edit', options: [{ optionId: 'allow', label: 'Allow', kind: 'allow_once' }] }),
      event({ type: 'permission.resolved', toolCallId: 'tc2', requestId: 'r1', outcome: 'allow_once' }),
      event({ type: 'tool.end', toolCallId: 'tc2', status: 'completed', result: 'applied', additions: 1 }),
      event({ type: 'text.start', blockId: 'b1' }),
      event({ type: 'text.delta', blockId: 'b1', delta: 'The gutters ' }),
      event({ type: 'tool.end', toolCallId: 'tc1', status: 'completed', result: 'page.tsx', durationMs: 40 }),
      event({ type: 'text.delta', blockId: 'b1', delta: 'are wider.' }),
      event({ type: 'text.end', blockId: 'b1', text: 'The gutters are wider.' }),
      event({ type: 'turn.ended', turnId: 't1', durationMs: 4_200, tokens: { input: 90, output: 12 } }),
      event({ type: 'turn.started', turnId: 't2' }),
      event({ type: 'message.user', turnId: 't2', messageId: 'm2', text: 'again, tighter' }),
      event({ type: 'session.error', message: 'rate limited', code: 'rate_limited' }),
      event({ type: 'usage.limits', windows: [{ kind: 'seven_day', status: 'rejected', resetsAt: 10_000 }] }),
    ];
  };

  it('keeps a row identical exactly while its value is unchanged, flush by flush, and serialises nothing', () => {
    for (const opening of ['turn-first', 'prompt-first'] as const) {
      const events = twoTurns(opening);
      const session = pushing();
      let seen = new Map<string, { row: TranscriptItem; json: string }>();
      let serialised = 0;
      let kept = 0;
      let rewritten = 0;

      for (const pushed of events) {
        const flush = session.flush([pushed]);
        serialised += flush.serialised;
        for (const row of flush.items) {
          const before = seen.get(row.id);
          if (before === undefined) continue;
          if (isStreamingRow(row)) {
            expect(row).not.toBe(before.row);
            continue;
          }
          const unchanged = JSON.stringify(row) === before.json;
          expect(row === before.row).toBe(unchanged);
          if (unchanged) kept++;
          else rewritten++;
        }
        seen = new Map(flush.items.map((row) => [row.id, { row, json: JSON.stringify(row) }]));
      }

      expect(session.flush([]).items.map((row) => row.kind)).toEqual(['user', 'assistant-thinking', 'tools', 'assistant-text', 'user', 'error']);
      expect([serialised, kept > 0, rewritten > 0]).toEqual([0, true, true]);
    }
  });

  it('drops the identity of a queued prompt when its delivery settles, delivered included', () => {
    const session = pushing();
    const queued = event({ type: 'message.user', turnId: 't1', messageId: 'm1', text: 'widen the gutters', delivery: 'waiting' });
    const [waiting] = session.flush([queued]).items;
    expect(waiting).toMatchObject({ kind: 'user', delivery: 'waiting' });

    const [stillWaiting] = session.flush([event({ type: 'turn.started', turnId: 't1' })]).items;
    expect(stillWaiting).toBe(waiting);

    const [refused] = session.flush([event({ type: 'message.delivery', messageId: 'm1', outcome: 'refused' })]).items;
    expect(refused).not.toBe(waiting);
    expect(refused).toMatchObject({ delivery: 'refused' });

    const [delivered] = session.flush([event({ type: 'message.delivery', messageId: 'm1', outcome: 'delivered' })]).items;
    expect(delivered).not.toBe(refused);
    expect(delivered !== undefined && 'delivery' in delivered).toBe(false);
  });

  it('drops the identity of a settled tool group when a result lands against one of its calls', () => {
    const session = pushing();
    session.flush([
      event({ type: 'tool.start', toolCallId: 'tc1', name: 'Bash', kind: 'execute', title: 'Run tests', status: 'in_progress' }),
    ]);
    const closed = session.flush([
      event({ type: 'text.start', blockId: 'b1' }),
      event({ type: 'text.end', blockId: 'b1', text: 'still running' }),
    ]);
    expect(closed.items[0]).toMatchObject({ kind: 'tools' });

    const landed = session.flush([
      event({ type: 'tool.end', toolCallId: 'tc1', status: 'completed', result: '34 pass', durationMs: 900 }),
    ]);
    expect(landed.items[0]).not.toBe(closed.items[0]);
    expect(landed.items[0]).toMatchObject({ kind: 'tools', calls: [{ result: '34 pass' }] });
    expect(landed.items[1]).toBe(closed.items[1]);
  });

  it('drops the identity of a tool call whose input matched only through the prototype chain', () => {
    /* `JSON.parse` makes `__proto__` an OWN key; reading it on a row that has none answers `Object.prototype`, which carries no enumerable key of its own (ONL-2650). */
    const parsed = (json: string): Record<string, unknown> => JSON.parse(json) as Record<string, unknown>;
    const toolRow = (input: Record<string, unknown>): TranscriptItem =>
      ({
        kind: 'tools',
        id: 'tools-1',
        calls: [{ toolCallId: 'tc1', name: 'Bash', kind: 'execute', title: 'Run tests', status: 'completed', input }],
      }) as unknown as TranscriptItem;

    const stale = toolRow(parsed('{"__proto__":{}}'));
    const [[held], carried] = keepRowIdentities([stale], new Map());
    expect(held).toBe(stale);

    const landed = toolRow(parsed('{"command":"echo changed"}'));
    const [[shown]] = keepRowIdentities([landed], carried);
    expect(shown).toBe(landed);
    expect(shown).not.toBe(stale);
  });

  it('holds a boundary row still, and lets go when its notice changes', () => {
    const boundary = (message: string): TranscriptItem => ({ kind: 'boundary', id: 'b-1', message });

    const message = 'The conversation before this point is no longer in context.';
    const notice = boundary(message);
    const [[first], carried] = keepRowIdentities([notice], new Map());
    expect(first).toBe(notice);
    expect(keepRowIdentities([boundary(message)], carried)[0][0]).toBe(notice);

    const [[reworded]] = keepRowIdentities([boundary('A new chat started here.')], carried);
    expect(reworded).not.toBe(notice);
  });

  it('drops the identity of a settled reply when turn.ended stamps its duration and tokens', () => {
    const session = pushing();
    session.flush([event({ type: 'turn.started', turnId: 't1' })]);
    const [reply] = session.flush([
      event({ type: 'text.start', blockId: 'b1' }),
      event({ type: 'text.end', blockId: 'b1', text: 'the gutters are wider' }),
    ]).items;
    expect(reply).toMatchObject({ kind: 'assistant-text', isStreaming: false });

    const [stamped] = session.flush([
      event({ type: 'turn.ended', turnId: 't1', durationMs: 4_200, tokens: { input: 90, output: 12 } }),
    ]).items;
    expect(stamped).not.toBe(reply);
    expect(stamped).toMatchObject({ durationMs: 4_200, tokens: { input: 90, output: 12 } });
  });

  it('drops the identity of the tail error row when usage.limits names the window it hit', () => {
    const session = pushing();
    session.flush([event({ type: 'turn.started', turnId: 't1' })]);
    const guessed = session.flush([
      event({ type: 'session.error', message: 'rate limited', code: 'rate_limited' }),
    ]).items;
    expect(guessed[0]).toMatchObject({ kind: 'error', limit: { window: 'unknown' } });

    const named = session.flush([
      event({ type: 'usage.limits', windows: [{ kind: 'seven_day', status: 'rejected', resetsAt: 10_000 }] }),
    ]).items;
    expect(named[0]).not.toBe(guessed[0]);
    expect(named[0]).toMatchObject({ limit: { window: 'weekly', resetsAt: 10_000 } });
  });

  it('never caches a still-streaming reply, so a growing one pays nothing per flush', () => {
    const session = pushing();
    const first = session.flush([
      event({ type: 'text.start', blockId: 'b1' }),
      event({ type: 'text.delta', blockId: 'b1', delta: 'the ' }),
    ]);
    expect(first.items[0]).toMatchObject({ isStreaming: true, text: 'the ' });
    expect(first.held.has('b1')).toBe(false);

    const second = session.flush([event({ type: 'text.delta', blockId: 'b1', delta: 'gutters' })]);
    expect(second.items[0]).not.toBe(first.items[0]);
    expect(second.held.has('b1')).toBe(false);
    expect(second.serialised).toBe(0);
  });

  it('reads a change nested deep in the input of a tool call without naming the field', () => {
    const session = pushing();
    const input = { edits: [{ range: { start: { line: 12, column: 3 } }, text: 'gap: 24px' }] };
    const [group] = session.flush([
      event({ type: 'tool.start', toolCallId: 'tc1', name: 'Edit', kind: 'edit', title: 'Edit page.tsx', status: 'in_progress', input }),
    ]).items;

    const [reread] = session.flush([
      event({ type: 'tool.update', toolCallId: 'tc1', input: { edits: [{ range: { start: { line: 12, column: 3 } }, text: 'gap: 24px' }] } }),
    ]).items;
    expect(reread).toBe(group);

    const [moved] = session.flush([
      event({ type: 'tool.update', toolCallId: 'tc1', input: { edits: [{ range: { start: { line: 12, column: 4 } }, text: 'gap: 24px' }] } }),
    ]).items;
    expect(moved).not.toBe(group);
  });

  it('reads a key the fold rewrote to undefined as absent, the answer the serialisation gave', () => {
    const call = { toolCallId: 'tc1', name: 'Read', kind: 'read' as const, title: 'Read page.tsx', status: 'completed' as const, displayStatus: 'completed' as const, startedAt: 1_000 };
    const settled: TranscriptItem = { kind: 'tools', id: 'g1', calls: [{ ...call }] };
    // `permission.resolved` assigns `undefined` rather than deleting the key; the serialisation dropped it.
    const resolved: TranscriptItem = { kind: 'tools', id: 'g1', calls: [{ ...call, permission: undefined }] };

    const [[before], held] = keepRowIdentities([settled], new Map());
    const [[after]] = keepRowIdentities([resolved], held);

    expect(before).toBe(settled);
    expect(after).toBe(before);
  });
});
