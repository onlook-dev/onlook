import { describe, expect, it } from 'bun:test';
import type {
  ModelChoice,
  SessionState,
  StudioEvent,
  ToolCallView,
  ToolKind,
  ToolStatus,
} from './events.js';
import { isElementEvidence } from './elements.js';
import { foldSessionState, resendOfLastPrompt } from './session-state.js';
import { retriesAsSetupAsk, SETUP_REPAIR_CONTEXT_OPENING } from './project-setup.js';
import { rateLimitHit } from './events.js';

/** Distributive on purpose: a plain `Omit<StudioEvent, …>` collapses the union and lets a fixture omit `toolCallId`. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type Input = DistributiveOmit<StudioEvent, 'sessionId' | 'eventId' | 'seq' | 'ts'>;

function log(...inputs: Input[]): StudioEvent[] {
  return inputs.map(
    (input, index) =>
      ({
        ...input,
        sessionId: 's1',
        eventId: `e${index + 1}`,
        seq: index + 1,
        ts: 1_700_000_000_000 + index,
      }) as StudioEvent,
  );
}

it('preserves original context on user transcript rows for message Retry', () => {
  const attachments = [{ id: 'image', mediaType: 'image/png' as const }];
  const state = foldSessionState(log({ type: 'message.user', turnId: 'turn', text: 'Match this image', attachments, context: 'Frame: Header' }));
  expect(state.items[0]).toMatchObject({ kind: 'user', text: 'Match this image', attachments, context: 'Frame: Header' });
  expect(foldSessionState(log({ type: 'message.user', turnId: 'turn', text: 'Plain prompt' })).items[0]).not.toHaveProperty('context');
});

it('marks a hidden Studio prompt so the chat draws nothing, and never offers it as a retry', () => {
  const state = foldSessionState(
    log(
      { type: 'turn.started', turnId: 't1' },
      { type: 'message.user', turnId: 't1', text: 'Studio opened this turn', origin: 'studio', hidden: true },
      { type: 'turn.ended', turnId: 't1', stopReason: 'api_error' },
      { type: 'session.error', message: 'fetch failed', code: 'unknown' },
    ),
  );
  expect(state.items[0]).toMatchObject({ kind: 'user', origin: 'studio', hidden: true });
  const row = state.items.find((i) => i.kind === 'error');
  if (row?.kind !== 'error') throw new Error('expected an error item');
  expect(row.retry).toBeUndefined();
});

describe('what a stopped or failed turn can send again (ONL-2901)', () => {
  const failed = (row: Input): SessionState => foldSessionState(
    log(
      { type: 'turn.started', turnId: 't1' },
      row,
      { type: 'turn.ended', turnId: 't1', stopReason: 'error_during_execution' },
      { type: 'session.error', message: 'error_during_execution', code: 'unknown' },
      { type: 'session.error', message: 'Claude Code returned an error result', code: 'unknown' },
    ),
  );
  const resume: Input = { type: 'message.user', turnId: 't1', text: 'continue', origin: 'studio' };
  const opening: Input = { type: 'message.user', turnId: 't1', text: 'Studio opened this turn', origin: 'studio', hidden: true };

  it('offers no retry for a prompt in Studio’s own words, hidden or shown, and still draws one failure for it', () => {
    for (const row of [resume, opening]) {
      const errors = failed(row).items.filter((item) => item.kind === 'error');
      expect(errors).toHaveLength(1);
      expect(errors[0]?.kind === 'error' ? errors[0].retry : 'none').toBeUndefined();
    }
  });

  it('stops and resends the person’s prompt, a tap and a repair ask, and nothing Studio wrote', () => {
    const last = (row: Input) => resendOfLastPrompt(foldSessionState(log({ type: 'turn.started', turnId: 't1' }, row)).items);
    expect(last({ type: 'message.user', turnId: 't1', text: 'make it blue' })).toEqual({ text: 'make it blue' });
    expect(last({ type: 'message.user', turnId: 't1', text: 'Show it on mobile', origin: 'suggestion' })).toEqual({ text: 'Show it on mobile', origin: 'suggestion' });
    const ask = { text: 'My app didn’t start. Can you help?', context: `${SETUP_REPAIR_CONTEXT_OPENING}\n\n{}`, origin: 'studio' as const };
    expect(last({ type: 'message.user', turnId: 't1', ...ask })).toEqual(ask);
    expect(last(resume)).toBeUndefined();
    expect(last(opening)).toBeUndefined();
    expect(resendOfLastPrompt([])).toBeUndefined();
  });
});

it.each([true, false])('retains a failed prompt in either turn-opening order, user-first=%s', (userFirst) => {
  const prompt: Input = { type: 'message.user', turnId: 'turn', text: 'Match this image', attachments: [{ id: 'image', mediaType: 'image/png' }], context: 'Frame: Header' };
  const started: Input = { type: 'turn.started', turnId: 'turn' };
  const state = foldSessionState(log(...(userFirst ? [prompt, started] : [started, prompt]), { type: 'session.error', code: 'api_error', apiErrorStatus: 503, message: 'Service unavailable' }));
  expect(state.items.find((item) => item.kind === 'error')).toMatchObject({ retry: { text: 'Match this image', attachments: [{ id: 'image', mediaType: 'image/png' }], context: 'Frame: Header' } });
});

it('never offers the previous turn prompt when a new turn fails before receiving a prompt', () => {
  const state = foldSessionState(log(
    { type: 'message.user', turnId: 'previous', text: 'Old prompt' },
    { type: 'turn.started', turnId: 'previous' },
    { type: 'turn.ended', turnId: 'previous', stopReason: 'end_turn' },
    { type: 'turn.started', turnId: 'next' },
    { type: 'session.error', code: 'api_error', apiErrorStatus: 503, message: 'Service unavailable' },
  ));
  expect(state.items.find((item) => item.kind === 'error')).not.toHaveProperty('retry');
});

function startTool(
  toolCallId: string,
  fields: { name?: string; kind?: ToolKind; title?: string; target?: string; status?: ToolStatus } = {},
): Input {
  return {
    type: 'tool.start',
    toolCallId,
    name: fields.name ?? 'Read',
    kind: fields.kind ?? 'read',
    title: fields.title ?? 'Read',
    target: fields.target,
    status: fields.status ?? 'in_progress',
  };
}

describe('stopped-turn resume state', () => {
  it('distinguishes interrupted endings and keeps them through a transcript reload', () => {
    expect(foldSessionState(log({ type: 'session.ended', reason: 'interrupted' })).interrupted).toBe(true);
    expect(foldSessionState(log({ type: 'session.ended', reason: 'completed' })).interrupted).toBe(false);
    expect(foldSessionState(log({ type: 'session.ended', reason: 'error' })).interrupted).toBe(false);
  });

  it('clears interruption when the next prompt arrives', () => {
    expect(foldSessionState(log({ type: 'session.ended', reason: 'interrupted' }, { type: 'message.user', turnId: 'next', text: 'continue', origin: 'studio' })).interrupted).toBe(false);
  });

  it('recognizes interrupted turn results on both Harnesses and does not lose them on orderly shutdown', () => {
    expect(foldSessionState(log({ type: 'turn.ended', turnId: 't1', stopReason: 'interrupted' }, { type: 'session.ended', reason: 'completed' })).interrupted).toBe(true);
    expect(foldSessionState(log({ type: 'turn.ended', turnId: 't1', stopReason: 'completed' })).interrupted).toBe(false);
    expect(foldSessionState(log({ type: 'turn.ended', turnId: 't1', stopReason: 'failed' })).interrupted).toBe(false);
  });
});

describe('answered question transcript', () => {
  it('retains raw Other answers while clearing the actionable permission, including after reload', () => {
    const questions = [{ question: 'Which layout?', header: 'Layout', options: [{ label: 'Grid', description: 'Tiles' }, { label: 'List', description: 'Rows' }] }];
    const events = log(
      { type: 'tool.start', toolCallId: 'q1', name: 'AskUserQuestion', title: 'Question', kind: 'other', status: 'in_progress' },
      { type: 'permission.requested', requestId: 'r1', toolCallId: 'q1', toolName: 'AskUserQuestion', options: [{ optionId: 'allow', label: 'Allow', kind: 'allow_once' }], questions },
      { type: 'permission.resolved', requestId: 'r1', toolCallId: 'q1', outcome: 'allow_once', answers: { 'Which layout?': 'A custom layout' } },
    );
    const state = foldSessionState(JSON.parse(JSON.stringify(events)) as StudioEvent[]);
    const call = state.items.flatMap((item) => item.kind === 'tools' ? item.calls : []).find((tool) => tool.toolCallId === 'q1');
    expect(call?.permission).toBeUndefined();
    expect(call?.answeredQuestions).toEqual({ questions, answers: { 'Which layout?': 'A custom layout' } });
    expect(state.awaitingApproval).toEqual([]);
  });
});

describe('dismissed question transcript (ONL-2901)', () => {
  const questions = [{ question: 'Which layout?', header: 'Layout', options: [{ label: 'Grid', description: 'Tiles' }, { label: 'List', description: 'Rows' }] }];
  const asked: Input[] = [
    { type: 'turn.started', turnId: 't1' },
    { type: 'tool.start', toolCallId: 'q1', name: 'AskUserQuestion', title: 'Question', kind: 'other', status: 'in_progress' },
    { type: 'permission.requested', requestId: 'r1', toolCallId: 'q1', toolName: 'AskUserQuestion', options: [{ optionId: 'allow', label: 'Allow', kind: 'allow_once' }], questions },
  ];
  const questionCall = (state: SessionState) =>
    state.items.flatMap((item) => item.kind === 'tools' ? item.calls : []).find((tool) => tool.toolCallId === 'q1');

  it('keeps the dismissed questions on the call, including after reload', () => {
    const events = log(...asked, { type: 'permission.resolved', requestId: 'r1', toolCallId: 'q1', outcome: 'canceled', dismissed: true });
    const state = foldSessionState(JSON.parse(JSON.stringify(events)) as StudioEvent[]);
    expect(questionCall(state)?.dismissedQuestions).toEqual(questions);
    expect(questionCall(state)?.permission).toBeUndefined();
  });

  it('leaves the turn a dismissal interrupted with nothing to resume', () => {
    const events = log(
      ...asked,
      { type: 'permission.resolved', requestId: 'r1', toolCallId: 'q1', outcome: 'canceled', dismissed: true },
      { type: 'turn.ended', turnId: 't1', stopReason: 'interrupted' },
      { type: 'session.ended', reason: 'interrupted' },
    );
    expect(foldSessionState(events).interrupted).toBe(false);
  });

  it('still offers to resume a question stopped without a dismissal', () => {
    const events = log(
      ...asked,
      { type: 'permission.resolved', requestId: 'r1', toolCallId: 'q1', outcome: 'canceled' },
      { type: 'turn.ended', turnId: 't1', stopReason: 'interrupted' },
    );
    expect(foldSessionState(events).interrupted).toBe(true);
    expect(questionCall(foldSessionState(events))?.dismissedQuestions).toBeUndefined();
  });

  it('offers to resume a later turn stopped after the dismissal', () => {
    const events = log(
      ...asked,
      { type: 'permission.resolved', requestId: 'r1', toolCallId: 'q1', outcome: 'canceled', dismissed: true },
      { type: 'turn.ended', turnId: 't1', stopReason: 'interrupted' },
      { type: 'message.user', turnId: 't2', text: 'Use a grid', origin: 'user' },
      { type: 'turn.started', turnId: 't2' },
      { type: 'turn.ended', turnId: 't2', stopReason: 'interrupted' },
    );
    expect(foldSessionState(events).interrupted).toBe(true);
  });
});

const OPTIONS = [
  { optionId: 'allow', label: 'Approve', kind: 'allow_once' as const },
  { optionId: 'deny', label: 'Deny', kind: 'reject_once' as const },
];

function call(state: SessionState, toolCallId: string): ToolCallView {
  for (const item of state.items) {
    if (item.kind !== 'tools') continue;
    const found = item.calls.find((c) => c.toolCallId === toolCallId);
    if (found) return found;
  }
  throw new Error(`no rendered tool call ${toolCallId} in ${state.items.length} items`);
}

const kinds = (state: SessionState): string[] => state.items.map((item) => item.kind);

describe('plan windows survive the fold and belong to the failed turn', () => {
  it('a late rejected window fills an unnamed card but never rewrites a known ending', () => {
    const state = foldSessionState(log(
      { type: 'session.error', code: 'rate_limited', message: '' },
      { type: 'usage.limits', windows: [{ kind: 'seven_day', status: 'rejected', resetsAt: 2_000_000_000 }] },
    ));
    const row = state.items[0];
    expect(row?.kind === 'error' ? row.limit : undefined).toEqual({ window: 'weekly', resetsAt: 2_000_000_000 });
  });
  it("reads a 429 API failure against the account's windows, early or late, as a limit is (ONL-2903)", () => {
    const early = foldSessionState(log(
      { type: 'usage.limits', windows: [{ kind: 'five_hour', status: 'rejected', resetsAt: 2_000_000_000 }] },
      { type: 'session.error', code: 'api_error', apiErrorStatus: 429, message: 'API Error: 429' },
    ));
    const late = foldSessionState(log(
      { type: 'session.error', code: 'api_error', apiErrorStatus: 429, message: 'API Error: 429' },
      { type: 'usage.limits', windows: [{ kind: 'five_hour', status: 'rejected', resetsAt: 2_000_000_000 }] },
    ));
    const other = foldSessionState(log({ type: 'session.error', code: 'api_error', apiErrorStatus: 529, message: '' }));
    const limitOf = (state: SessionState) => (state.items[0]?.kind === 'error' ? state.items[0].limit : undefined);
    expect([limitOf(early), limitOf(late), limitOf(other)]).toEqual([
      { window: 'session', resetsAt: 2_000_000_000 },
      { window: 'session', resetsAt: 2_000_000_000 },
      undefined,
    ]);
  });
  it('a billing row carries no Retry: the same send hits the same bill (ONL-2454)', () => {
    const state = foldSessionState(log(
      { type: 'turn.started', turnId: 't1' },
      { type: 'message.user', turnId: 't1', text: 'Build the page' },
      { type: 'session.error', code: 'billing_error', message: 'API Error: 402' },
    ));
    const row = state.items.find((item) => item.kind === 'error');
    expect(row?.kind === 'error' ? row.retry : undefined).toBeUndefined();
  });
  it('keeps reported windows and freezes the hit for the ended turn', () => {
    const windows = [{ kind: 'five_hour', status: 'rejected' as const, usedPercent: 100, resetsAt: 2_000_000_000 }];
    const state = foldSessionState(log(
      { type: 'usage.limits', windows },
      { type: 'message.user', turnId: 't1', text: 'Build the page' },
      { type: 'session.error', code: 'rate_limited', message: 'provider limit' },
      { type: 'usage.limits', windows: [{ kind: 'seven_day', usedPercent: 25 }] },
    ));
    const row = state.items.find((item) => item.kind === 'error');
    expect(row?.kind === 'error' ? row.limit : undefined).toEqual({ window: 'session', resetsAt: 2_000_000_000 });
    expect(state.limits).toEqual([...windows, { kind: 'seven_day', usedPercent: 25 }]);
  });
  it('recognizes both Codex slots from their reported duration, not slot names', () => {
    for (const kind of ['primary', 'secondary']) {
      expect(rateLimitHit([{ kind, usedPercent: 100, windowDurationMins: 10080 }], 0).window).toBe('weekly');
      expect(rateLimitHit([{ kind, usedPercent: 100, windowDurationMins: 300 }], 0).window).toBe('session');
    }
  });
  it('uses the longer blocking window and never calls an allowed window exhausted', () => {
    expect(rateLimitHit([{ kind: 'five_hour', status: 'rejected', resetsAt: 100 }, { kind: 'seven_day', status: 'rejected', resetsAt: 200 }], 0).window).toBe('weekly');
    expect(rateLimitHit([{ kind: 'seven_day', status: 'allowed', usedPercent: 25 }, { kind: 'five_hour', status: 'rejected', resetsAt: 1 }], 2)).toEqual({ window: 'unknown' });
  });
});

describe('a projected user row keeps who sent it (ONL-2198)', () => {
  const base = (seq: number) => ({ sessionId: 's', cwd: '/w', eventId: `e-${String(seq)}`, seq, ts: 0 });

  it('carries `origin` through, so a consumer can tell a Studio push from a typed prompt', () => {
    const { items } = foldSessionState([
      { type: 'message.user', turnId: 't', text: 'typed', origin: 'user', ...base(1) },
      { type: 'message.user', turnId: 't', text: 'pushed', origin: 'studio', ...base(2) },
    ] as StudioEvent[]);

    const rows = items.filter((item) => item.kind === 'user');
    expect(rows.map((row) => (row.kind === 'user' ? row.origin : undefined))).toEqual(['user', 'studio']);
  });

  it('leaves `origin` absent when the event carries none, rather than inventing one', () => {
    const { items } = foldSessionState([
      { type: 'message.user', turnId: 't', text: 'typed', ...base(1) },
    ] as StudioEvent[]);

    const row = items[0];
    expect(row?.kind).toBe('user');
    expect(row !== undefined && row.kind === 'user' && 'origin' in row).toBe(false);
  });
});

describe('a message sent into a running turn (ONL-2961)', () => {
  const base = (seq: number) => ({ sessionId: 's', cwd: '/w', eventId: `e-${String(seq)}`, seq, ts: 0 });
  const joined = (items: SessionState['items']) => items.flatMap((item) => (item.kind === 'user' ? [item.joinsTurn === true] : []));

  it('marks a row that joined the turn its predecessor opened, and not one that opened a new turn', () => {
    const { items } = foldSessionState([
      { type: 'message.user', turnId: 't1', text: 'set up', origin: 'studio', ...base(1) },
      { type: 'message.user', turnId: 't1', text: 'make it blue', ...base(2) },
      { type: 'message.user', turnId: 't2', text: 'now round it', ...base(3) },
    ] as StudioEvent[]);
    expect(joined(items)).toEqual([false, true, false]);
  });

  it('never joins across a new chat, where turn ids are compared afresh', () => {
    const { items } = foldSessionState([
      { type: 'message.user', turnId: 't1', text: 'set up', origin: 'studio', ...base(1) },
      { type: 'session.boundary', message: 'New chat', ...base(2) },
      { type: 'message.user', turnId: 't1', text: 'hello', ...base(3) },
    ] as StudioEvent[]);
    expect(joined(items)).toEqual([false, false]);
  });
});

describe('tool groups', () => {
  it('stay contiguous — any non-tool event closes the open run', () => {
    const events = log(
      startTool('t1', { name: 'Read', title: 'Read', target: 'a.ts' }),
      startTool('t2', { name: 'Grep', kind: 'search', title: 'Grep', target: 'TODO' }),
      { type: 'message.user', turnId: 't1', text: 'and now?' },
      startTool('t3', { name: 'Edit', kind: 'edit', title: 'Edit', target: 'a.ts' }),
    );

    const state = foldSessionState(events);

    expect(kinds(state)).toEqual(['tools', 'user', 'tools']);

    const [first, , second] = state.items;
    if (first?.kind !== 'tools' || second?.kind !== 'tools') throw new Error('shape');
    expect(first.calls.map((c) => c.toolCallId)).toEqual(['t1', 't2']);
    expect(second.calls.map((c) => c.toolCallId)).toEqual(['t3']);
  });

  it('upserts a repeated tool.start instead of minting a second row', () => {
    const events = log(
      startTool('t1', { name: 'Edit', kind: 'edit', title: 'Edit', status: 'in_progress' }),
      startTool('t1', {
        name: 'Edit',
        kind: 'edit',
        title: 'Edit',
        target: 'src/app.ts',
        status: 'pending',
      }),
    );

    const state = foldSessionState(events);

    expect(kinds(state)).toEqual(['tools']);
    const [group] = state.items;
    if (group?.kind !== 'tools') throw new Error('shape');
    expect(group.calls).toHaveLength(1);

    expect(call(state, 't1').target).toBe('src/app.ts');

    expect(call(state, 't1').status).toBe('in_progress');
    expect(call(state, 't1').displayStatus).toBe('in_progress');
  });
});

describe('the permission round trip', () => {
  it('goes requested -> awaiting_approval -> resolved -> cleared', () => {
    const events = log(
      startTool('t1', { name: 'Edit', kind: 'edit', title: 'Edit', status: 'in_progress' }),
      {
        type: 'permission.requested',
        requestId: 'r1',
        toolCallId: 't1',
        toolName: 'Edit',
        title: 'Claude wants to edit app.ts',
        options: OPTIONS,
      },
      { type: 'permission.resolved', requestId: 'r1', toolCallId: 't1', outcome: 'allow_once' },
    );

    const before = foldSessionState(events.slice(0, 1));
    expect(before.awaitingApproval).toEqual([]);
    expect(call(before, 't1').displayStatus).toBe('in_progress');

    const asking = foldSessionState(events.slice(0, 2));
    expect(asking.awaitingApproval.map((c) => c.toolCallId)).toEqual(['t1']);
    expect(call(asking, 't1').displayStatus).toBe('awaiting_approval');
    expect(call(asking, 't1').permission?.requestId).toBe('r1');
    expect(call(asking, 't1').status).toBe('in_progress');

    const answered = foldSessionState(events);
    expect(answered.awaitingApproval).toEqual([]);
    expect(call(answered, 't1').permission).toBeUndefined();
    expect(call(answered, 't1').displayStatus).toBe('in_progress');
  });

  it('marks an unresolved request stale at tool.end, and stops offering it', () => {
    const events = log(
      startTool('t1', { name: 'Bash', kind: 'execute', title: 'Bash', status: 'in_progress' }),
      {
        type: 'permission.requested',
        requestId: 'r1',
        toolCallId: 't1',
        toolName: 'Bash',
        options: OPTIONS,
      },
      { type: 'tool.end', toolCallId: 't1', status: 'canceled' },
    );

    const asking = foldSessionState(events.slice(0, 2));
    expect(asking.awaitingApproval).toHaveLength(1);

    const ended = foldSessionState(events);
    expect(ended.awaitingApproval).toEqual([]);
    expect(call(ended, 't1').displayStatus).toBe('canceled');

    expect(call(ended, 't1').permission?.requestId).toBe('r1');
    expect(call(ended, 't1').permission?.stale).toBe(true);
  });
});

describe('streamed text', () => {
  it('renders a delta with no start, which is the shape a replay arrives in', () => {
    const events = log(
      { type: 'text.delta', blockId: 'b7', delta: 'Hel' },
      { type: 'text.delta', blockId: 'b7', delta: 'lo' },
      { type: 'text.end', blockId: 'b7', text: '' },
    );

    const streaming = foldSessionState(events.slice(0, 2));
    expect(streaming.items).toEqual([
      {
        kind: 'assistant-text',
        id: 'b7',
        text: 'Hello',
        isStreaming: true,
        startedAt: 1_700_000_000_000,
      },
    ]);

    const closed = foldSessionState(events);
    expect(closed.items).toEqual([
      {
        kind: 'assistant-text',
        id: 'b7',
        text: 'Hello',
        isStreaming: false,
        startedAt: 1_700_000_000_000,
      },
    ]);
  });

  it("stamps assistant-text's startedAt from text.start, never assistant-thinking", () => {
    const events = log(
      { type: 'thinking.start', blockId: 'b1' },
      { type: 'text.start', blockId: 'b2' },
      { type: 'text.delta', blockId: 'b2', delta: 'hi' },
    );

    const state = foldSessionState(events);
    const thinking = state.items.find((i) => i.kind === 'assistant-thinking');
    const text = state.items.find((i) => i.kind === 'assistant-text');
    expect(thinking && 'startedAt' in thinking).toBe(false);
    expect(text?.kind === 'assistant-text' ? text.startedAt : null).toBe(1_700_000_000_001);
  });

  it('is closed by turn.ended, so nothing is left blinking', () => {
    const events = log(
      { type: 'turn.started', turnId: 't1' },
      { type: 'thinking.start', blockId: 'b1' },
      { type: 'thinking.delta', blockId: 'b1', delta: 'hmm' },
      { type: 'text.start', blockId: 'b2' },
      { type: 'text.delta', blockId: 'b2', delta: 'partial' },
      { type: 'turn.ended', turnId: 't1', stopReason: 'success' },
    );

    const open = foldSessionState(events.slice(0, 5));
    expect(open.isStreaming).toBe(true);
    expect(open.items.map((i) => ('isStreaming' in i ? i.isStreaming : null))).toEqual([
      false,
      true,
    ]);

    const done = foldSessionState(events);
    expect(done.isStreaming).toBe(false);
    expect(done.items.map((i) => ('isStreaming' in i ? i.isStreaming : null))).toEqual([
      false,
      false,
    ]);
    expect(done.items.map((i) => ('text' in i ? i.text : null))).toEqual(['hmm', 'partial']);
  });

  it('stamps assistant-text with the closing turn.ended duration, never assistant-thinking', () => {
    const events = log(
      { type: 'turn.started', turnId: 't1' },
      { type: 'thinking.start', blockId: 'b1' },
      { type: 'text.start', blockId: 'b2' },
      { type: 'text.delta', blockId: 'b2', delta: 'hi' },
      { type: 'text.end', blockId: 'b2', text: 'hi' },
      { type: 'turn.ended', turnId: 't1', durationMs: 9042 },
    );

    const done = foldSessionState(events);
    const thinking = done.items.find((i) => i.kind === 'assistant-thinking');
    const text = done.items.find((i) => i.kind === 'assistant-text');
    expect(thinking && 'durationMs' in thinking).toBe(false);
    expect(text?.kind === 'assistant-text' ? text.durationMs : null).toBe(9042);
  });

  it('takes the question wait out of the stamped duration, so the settled row cannot jump (ONL-2295)', () => {
    const events = log(
      { type: 'turn.started', turnId: 't1' },
      { type: 'text.start', blockId: 'b2' },
      { type: 'text.end', blockId: 'b2', text: 'hi' },
      { type: 'turn.ended', turnId: 't1', durationMs: 120_000, waitedMs: 90_000 },
    );

    const text = foldSessionState(events).items.find((i) => i.kind === 'assistant-text');
    expect(text?.kind === 'assistant-text' ? text.durationMs : null).toBe(30_000);
  });

  it('never stamps a negative duration when the measured wait outruns the turn', () => {
    // The wait is stamped from our clock and the duration from the backend's, so they can cross.
    const events = log(
      { type: 'turn.started', turnId: 't1' },
      { type: 'text.start', blockId: 'b2' },
      { type: 'text.end', blockId: 'b2', text: 'hi' },
      { type: 'turn.ended', turnId: 't1', durationMs: 30_000, waitedMs: 45_000 },
    );

    const text = foldSessionState(events).items.find((i) => i.kind === 'assistant-text');
    expect(text?.kind === 'assistant-text' ? text.durationMs : null).toBe(0);
  });

  it('stamps the whole duration when the turn waited on nothing', () => {
    const events = log(
      { type: 'turn.started', turnId: 't1' },
      { type: 'text.start', blockId: 'b2' },
      { type: 'text.end', blockId: 'b2', text: 'hi' },
      { type: 'turn.ended', turnId: 't1', durationMs: 9042, waitedMs: 0 },
    );

    const text = foldSessionState(events).items.find((i) => i.kind === 'assistant-text');
    expect(text?.kind === 'assistant-text' ? text.durationMs : null).toBe(9042);
  });

  it('leaves durationMs unset when the turn never reports one', () => {
    const events = log(
      { type: 'turn.started', turnId: 't1' },
      { type: 'text.start', blockId: 'b2' },
      { type: 'text.end', blockId: 'b2', text: 'hi' },
      { type: 'turn.ended', turnId: 't1' },
    );

    const done = foldSessionState(events);
    const text = done.items.find((i) => i.kind === 'assistant-text');
    expect(text?.kind === 'assistant-text' ? text.durationMs : undefined).toBeUndefined();
  });
});

describe('session.settings', () => {
  it('merges, and reads `null` and `undefined` as different operations', () => {
    const models: ModelChoice[] = [
      { value: 'opus', displayName: 'Opus', supportsEffort: true },
      { value: 'sonnet', displayName: 'Sonnet' },
    ];
    const events = log(
      { type: 'session.settings', models, model: 'opus', effort: 'high' },
      { type: 'session.settings', model: 'sonnet' },
      { type: 'session.settings', effort: null },
    );

    const first = foldSessionState(events.slice(0, 1));
    expect(first.model).toBe('opus');
    expect(first.effort).toBe('high');
    expect(first.models).toHaveLength(2);

    const modelChanged = foldSessionState(events.slice(0, 2));
    expect(modelChanged.model).toBe('sonnet');
    expect(modelChanged.effort).toBe('high');
    expect(modelChanged.models).toHaveLength(2);

    const effortCleared = foldSessionState(events);
    expect(effortCleared.effort).toBeUndefined();
    expect(effortCleared.model).toBe('sonnet');
    expect(effortCleared.models).toHaveLength(2);
  });
});

describe('image references (ONL-1881)', () => {
  const REF = {
    id: 'ws1a2b/img-1',
    mediaType: 'image/png' as const,
    width: 800,
    height: 600,
  };

  it('carries mixed image and element attachments, discriminated by kind (ONL-1779)', () => {
    const EVIDENCE = {
      kind: 'element' as const,
      id: 'el-1',
      tag: 'button',
      domPath: 'body:nth-of-type(1) > button:nth-of-type(2)',
      outerHtmlSnippet: '<button class="cta">Buy</button>',
      textContent: 'Buy',
      classes: ['cta'],
      frameUrl: 'http://localhost:3000/',
    };
    const state = foldSessionState(
      log({
        type: 'message.user',
        turnId: 't1',
        text: 'make this button teal',
        attachments: [REF, EVIDENCE],
      }),
    );
    const user = state.items.find((i) => i.kind === 'user');
    if (user?.kind !== 'user') throw new Error('expected a user item');
    expect(user.attachments).toHaveLength(2);
    expect(user.attachments?.filter(isElementEvidence)).toEqual([EVIDENCE]);
    expect(user.attachments?.[0]).toEqual(REF);
  });

  it('carries tool-result images onto the ToolCallView', () => {
    const state = foldSessionState(
      log(
        startTool('t-read', { name: 'Read', kind: 'read', title: 'Read logo.png' }),
        {
          type: 'tool.end',
          toolCallId: 't-read',
          status: 'completed',
          images: [REF],
        },
      ),
    );

    const group = state.items.find((i) => i.kind === 'tools');
    if (group?.kind !== 'tools') throw new Error('expected a tools item');
    expect(group.calls[0]?.images).toEqual([REF]);
  });
});

describe('the signed-out error row (ONL-2187)', () => {
  it('drops the row for an unauthenticated failure — the sign-in card explains it', () => {
    const state = foldSessionState(
      log({ type: 'session.error', message: 'Please run claude login', code: 'unauthenticated' }),
    );
    expect(state.items.filter((i) => i.kind === 'error')).toHaveLength(0);
  });

  it('keeps the event itself, so a reader outside the transcript still sees the failure', () => {
    const state = foldSessionState(
      log({ type: 'session.error', message: 'Please run claude login', code: 'unauthenticated' }),
    );
    expect(state.error).toEqual({ message: 'Please run claude login', code: 'unauthenticated' });
  });

  it('keeps the row for every other code', () => {
    const state = foldSessionState(log({ type: 'session.error', message: 'no binary', code: 'cli_missing' }));
    const rows = state.items.filter((i) => i.kind === 'error');
    expect(rows).toHaveLength(1);
    if (rows[0]?.kind !== 'error') throw new Error('expected an error item');
    expect(rows[0].message).toBe('no binary');
    expect(rows[0].code).toBe('cli_missing');
  });

  it('keeps the row when there is no code at all', () => {
    const state = foldSessionState(log({ type: 'session.error', message: 'something broke' }));
    expect(state.items.filter((i) => i.kind === 'error')).toHaveLength(1);
  });

  it('offers the failed turn’s prompt as retry, keeping a Studio ask or a tap as one, and nothing when no prompt preceded it', () => {
    const state = foldSessionState(
      log(
        { type: 'turn.started', turnId: 't1' },
        {
          type: 'message.user',
          turnId: 't1',
          text: 'make the header blue',
          attachments: [{ kind: 'frame', name: 'Home' }],
          context: '<selected-frames>Home</selected-frames>',
        },
        { type: 'turn.ended', turnId: 't1', stopReason: 'api_error' },
        { type: 'session.error', message: 'fetch failed', code: 'unknown' },
      ),
    );
    const row = state.items.find((i) => i.kind === 'error');
    if (row?.kind !== 'error') throw new Error('expected an error item');
    expect(row.retry).toEqual({
      text: 'make the header blue',
      attachments: [{ kind: 'frame', name: 'Home' }],
      context: '<selected-frames>Home</selected-frames>',
    });

    const asked = foldSessionState(
      log(
        { type: 'turn.started', turnId: 't1' },
        { type: 'message.user', turnId: 't1', text: 'My app didn’t start. Can you help?', context: `${SETUP_REPAIR_CONTEXT_OPENING}\n\n{}`, origin: 'studio' },
        { type: 'turn.ended', turnId: 't1', stopReason: 'api_error' },
        { type: 'session.error', message: 'fetch failed', code: 'unknown' },
      ),
    );
    const askedRow = asked.items.find((i) => i.kind === 'error');
    if (askedRow?.kind !== 'error' || askedRow.retry === undefined) throw new Error('expected a retry');
    expect(askedRow.retry).toEqual({ text: 'My app didn’t start. Can you help?', context: `${SETUP_REPAIR_CONTEXT_OPENING}\n\n{}`, origin: 'studio' });
    expect(retriesAsSetupAsk(askedRow.retry)).toBe(true);
    expect(retriesAsSetupAsk({ context: `${SETUP_REPAIR_CONTEXT_OPENING}\n\n{}` })).toBe(false);

    const tapped = foldSessionState(
      log(
        { type: 'turn.started', turnId: 't1' },
        { type: 'message.user', turnId: 't1', text: 'Show the page on mobile', context: 'one of the tasks you suggested', origin: 'suggestion' },
        { type: 'turn.ended', turnId: 't1', stopReason: 'api_error' },
        { type: 'session.error', message: 'fetch failed', code: 'unknown' },
      ),
    );
    const tappedRow = tapped.items.find((i) => i.kind === 'error');
    if (tappedRow?.kind !== 'error') throw new Error('expected an error item');
    expect(tappedRow.retry).toEqual({ text: 'Show the page on mobile', context: 'one of the tasks you suggested', origin: 'suggestion' });

    const cold = foldSessionState(log({ type: 'session.error', message: 'no binary', code: 'cli_missing' }));
    const coldRow = cold.items.find((i) => i.kind === 'error');
    if (coldRow?.kind !== 'error') throw new Error('expected an error item');
    expect(coldRow.retry).toBeUndefined();

    const twice = foldSessionState(
      log(
        { type: 'turn.started', turnId: 't1' },
        { type: 'message.user', turnId: 't1', text: 'go' },
        { type: 'turn.ended', turnId: 't1', stopReason: 'error_during_execution' },
        { type: 'session.error', message: 'error_during_execution', code: 'unknown' },
        { type: 'session.error', message: 'Claude Code returned an error result', code: 'unknown' },
      ),
    );
    expect(twice.items.filter((i) => i.kind === 'error')).toHaveLength(1);

    const later = foldSessionState(
      log(
        { type: 'turn.started', turnId: 't1' },
        { type: 'message.user', turnId: 't1', text: 'first' },
        { type: 'turn.ended', turnId: 't1' },
        { type: 'turn.started', turnId: 't2' },
        { type: 'session.error', message: 'died before the prompt logged', code: 'unknown' },
      ),
    );
    const laterRow = later.items.find((i) => i.kind === 'error');
    if (laterRow?.kind !== 'error') throw new Error('expected an error item');
    expect(laterRow.retry).toBeUndefined();
  });

  it('leaves earlier transcript items alone', () => {
    const state = foldSessionState(
      log(
        { type: 'message.user', turnId: 't1', text: 'make the header blue' },
        { type: 'session.error', message: 'Please run claude login', code: 'unauthenticated' },
      ),
    );
    expect(state.items.some((i) => i.kind === 'user')).toBe(true);
    expect(state.items.filter((i) => i.kind === 'error')).toHaveLength(0);
  });

  it('keeps the row a refused credential earns — no card explains that one (ONL-2491)', () => {
    const state = foldSessionState(
      log(
        { type: 'turn.started', turnId: 't1' },
        { type: 'message.user', turnId: 't1', text: 'make the header blue' },
        { type: 'turn.ended', turnId: 't1', stopReason: 'api_error' },
        {
          type: 'session.error',
          message: 'The security token included in the request is invalid',
          code: 'credential_rejected',
        },
      ),
    );
    const rows = state.items.filter((i) => i.kind === 'error');
    expect(rows).toHaveLength(1);
    if (rows[0]?.kind !== 'error') throw new Error('expected an error item');
    expect(rows[0].message).toBe('The security token included in the request is invalid');
    expect(rows[0].code).toBe('credential_rejected');
    // The prompt still rides the row; whether it may be offered as Retry is the panel's read of the code.
    expect(rows[0].retry).toEqual({ text: 'make the header blue' });
  });
});

describe('the turn a failure landed on (ONL-2187)', () => {
  // The host's real order: the result closes the turn, then the classified error follows (`reduce.ts`).
  const signedOutTurn: Input[] = [
    { type: 'message.user', turnId: 't1', text: 'make the header blue' },
    { type: 'turn.started', turnId: 't1' },
    { type: 'turn.ended', turnId: 't1', stopReason: 'api_error' },
    { type: 'session.error', message: 'Not logged in · Please run /login', code: 'unauthenticated' },
  ];

  it('names the turn a session.error followed, with its code', () => {
    const state = foldSessionState(log(...signedOutTurn));
    expect(state.failedTurn).toEqual({ turnId: 't1', code: 'unauthenticated' });
  });

  it('holds no turn for a failure before any turn — that one is proactive, not a dead prompt', () => {
    const state = foldSessionState(
      log({ type: 'session.error', message: 'Not logged in · Please run /login', code: 'unauthenticated' }),
    );
    expect(state.error?.code).toBe('unauthenticated');
    expect(state.failedTurn).toBeUndefined();
  });

  it('also names a turn the pump threw out of, where no turn.ended ever arrives', () => {
    const state = foldSessionState(
      log(
        { type: 'turn.started', turnId: 't1' },
        { type: 'session.error', message: 'boom', code: 'unknown' },
      ),
    );
    expect(state.failedTurn).toEqual({ turnId: 't1', code: 'unknown' });
  });

  it('is cleared by the next turn.started and survives a successful turn.ended alone', () => {
    const cleared = foldSessionState(log(...signedOutTurn, { type: 'turn.started', turnId: 't2' }));
    expect(cleared.failedTurn).toBeUndefined();
    const clean = foldSessionState(
      log(
        { type: 'turn.started', turnId: 't1' },
        { type: 'turn.ended', turnId: 't1', stopReason: 'success' },
      ),
    );
    expect(clean.failedTurn).toBeUndefined();
  });
});

describe('the row that closes a conversation the agent cannot continue (ONL-2925)', () => {
  /** A prompt the agent never started a turn for: its row and its failure still own the turn when the log resumes. */
  const failedTurn: Input[] = [
    { type: 'message.user', turnId: 't1', text: 'make the header blue' },
    { type: 'session.error', message: 'ChatGPT is not running.', code: 'unknown' },
    { type: 'turn.ended', turnId: 't1', stopReason: 'failed' },
  ];
  const lost = 'ChatGPT can’t continue this conversation. Your next message starts a new one.';

  it('is drawn under a turn that already failed, where a second error row would be swallowed', () => {
    const state = foldSessionState(
      log(
        ...failedTurn,
        { type: 'session.started', cwd: '/w', harnessId: 'codex' },
        { type: 'session.boundary', message: lost, threadId: 'thread-1' },
      ),
    );
    expect(state.items.map((item) => item.kind)).toEqual(['user', 'error', 'boundary']);
    expect(state.items.at(-1)).toEqual({ kind: 'boundary', id: 'e5', message: lost });
    // A second `session.error` in the same place is suppressed, which is why this row is not one.
    const asError = foldSessionState(
      log(...failedTurn, { type: 'session.started', cwd: '/w', harnessId: 'codex' }, { type: 'session.error', message: lost, code: 'unknown' }),
    );
    expect(asError.items.map((item) => item.kind)).toEqual(['user', 'error']);
  });

  it('leaves the failure above it behind, so the next one is drawn and is this conversation’s', () => {
    const state = foldSessionState(
      log(
        ...failedTurn,
        { type: 'session.boundary', message: lost, threadId: 'thread-1' },
        { type: 'message.user', turnId: 't2', text: 'and the footer' },
        { type: 'session.error', message: 'Something else broke', code: 'unknown' },
      ),
    );
    // Without the boundary clearing the earlier row, this one is swallowed by the same dedupe.
    expect(state.items.map((item) => item.kind)).toEqual(['user', 'error', 'boundary', 'user', 'error']);
    expect(state.items.at(-1)).toMatchObject({ retry: { text: 'and the footer' } });
    // The dead conversation's failure is not this session's state.
    expect(state.failedTurn).toBeUndefined();
  });

  it('keeps a prompt still in flight answerable, since the new conversation takes it', () => {
    const state = foldSessionState(
      log(
        { type: 'message.user', turnId: 't1', text: 'keep this working' },
        { type: 'session.boundary', message: lost, threadId: 'thread-1' },
        { type: 'session.error', message: 'That turn failed', code: 'unknown' },
      ),
    );
    expect(state.items.at(-1)).toMatchObject({ kind: 'error', retry: { text: 'keep this working' } });
  });

  it('draws every conversation ending it is given, in order', () => {
    const state = foldSessionState(
      log(
        { type: 'message.user', turnId: 't1', text: 'first' },
        { type: 'session.boundary', message: lost, threadId: 'thread-1' },
        { type: 'message.user', turnId: 't2', text: 'second' },
        { type: 'session.boundary', message: lost, threadId: 'thread-2' },
      ),
    );
    // Which endings reach the log is the session's call; the fold draws each one it receives.
    expect(state.items.map((item) => item.kind)).toEqual(['user', 'boundary', 'user', 'boundary']);
  });
});

describe('the mid-turn delivery chip (ONL-2180)', () => {
  const user = (state: SessionState, index: number) => {
    const item = state.items[index];
    if (item?.kind !== 'user') throw new Error(`item ${String(index)} is ${String(item?.kind)}`);
    return item;
  };

  const steered: Input[] = [
    { type: 'turn.started', turnId: 't1' },
    { type: 'message.user', turnId: 't1', messageId: 'm1', text: 'first' },
    { type: 'text.start', blockId: 'b1' },
    { type: 'message.user', turnId: 't1', messageId: 'm2', text: 'second', delivery: 'steering' },
  ];

  it('carries the claim onto the row, and none onto a row that made none', () => {
    const state = foldSessionState(log(...steered));
    expect(user(state, 0).delivery).toBeUndefined();
    expect(user(state, 2).delivery).toBe('steering');
  });

  it('clears the chip on `delivered` and keeps the failed outcomes, on the RIGHT row', () => {
    const delivered = foldSessionState(
      log(...steered, { type: 'message.delivery', messageId: 'm2', outcome: 'delivered' }),
    );
    expect(user(delivered, 2).delivery).toBeUndefined();
    expect('delivery' in user(delivered, 2)).toBe(false);

    for (const outcome of ['refused', 'discarded'] as const) {
      const state = foldSessionState(log(...steered, { type: 'message.delivery', messageId: 'm2', outcome }));
      expect(user(state, 2).delivery).toBe(outcome);
      expect(user(state, 0).delivery).toBeUndefined();
    }
  });

  it('keeps the latest outcome, and ignores a settlement for a row it never saw', () => {
    const state = foldSessionState(
      log(
        ...steered,
        { type: 'message.delivery', messageId: 'm2', outcome: 'delivered' },
        { type: 'message.delivery', messageId: 'm2', outcome: 'discarded' },
        { type: 'message.delivery', messageId: 'm-unknown', outcome: 'refused' },
      ),
    );
    expect(user(state, 2).delivery).toBe('discarded');
    expect(state.items).toHaveLength(3);
  });

  it('is not a row and not a boundary: it leaves an open tool group and thought alone', () => {
    const state = foldSessionState(
      log(
        { type: 'message.user', turnId: 't1', messageId: 'm1', text: 'first' },
        { type: 'thinking.start', blockId: 'th1' },
        startTool('c1'),
        { type: 'message.delivery', messageId: 'm1', outcome: 'delivered' },
        startTool('c2'),
      ),
    );
    expect(kinds(state)).toEqual(['user', 'assistant-thinking', 'tools']);
    const group = state.items[2];
    if (group?.kind !== 'tools') throw new Error('shape');
    expect(group.calls.map((c) => c.toolCallId)).toEqual(['c1', 'c2']);
  });
});

describe('steered messages at pickup (ONL-3306)', () => {
  const sent: Input[] = [
    { type: 'turn.started', turnId: 'turn' },
    { type: 'message.user', turnId: 'turn', text: 'Review the layout' },
    startTool('read'),
    { type: 'message.user', turnId: 'turn', messageId: 'steer', text: 'Use warmer colors', delivery: 'steering' },
    startTool('inspect'),
  ];

  it('keeps a pending steer visible below continuing work without splitting the tool group', () => {
    const state = foldSessionState(log(...sent));
    expect(kinds(state)).toEqual(['user', 'tools', 'user']);
    expect(state.items[1]).toMatchObject({ calls: [{ toolCallId: 'read' }, { toolCallId: 'inspect' }] });
    expect(state.items[2]).toMatchObject({ text: 'Use warmer colors', delivery: 'steering' });
  });

  it('anchors the steer at pickup before the response and new tools, including on replay', () => {
    const events = log(
      ...sent,
      { type: 'message.delivery', messageId: 'steer', outcome: 'delivered' },
      { type: 'text.start', blockId: 'answer' },
      { type: 'text.delta', blockId: 'answer', delta: 'I will use warmer colors.' },
      startTool('edit'),
      { type: 'message.delivery', messageId: 'steer', outcome: 'delivered' },
    );
    const state = foldSessionState(events);
    expect(kinds(state)).toEqual(['user', 'tools', 'user', 'assistant-text', 'tools']);
    expect(state.items[2]).toMatchObject({ id: 'e4', text: 'Use warmer colors', joinsTurn: true });
    expect(state.items[2]).not.toHaveProperty('delivery');
    expect(state.items[3]).toMatchObject({ text: 'I will use warmer colors.' });
    expect(foldSessionState(JSON.parse(JSON.stringify(events)) as StudioEvent[])).toEqual(state);
  });

  it('preserves multiple steers, their metadata and the outcome of a stopped turn', () => {
    const attachments = [{ id: 'reference', mediaType: 'image/png' as const }];
    const state = foldSessionState(log(
      ...sent,
      { type: 'message.user', turnId: 'turn', messageId: 'next', text: 'Keep the spacing', attachments, context: 'Selected heading', delivery: 'steering' },
      { type: 'message.delivery', messageId: 'steer', outcome: 'delivered' },
      startTool('edit'),
      { type: 'message.delivery', messageId: 'next', outcome: 'discarded' },
    ));
    expect(kinds(state)).toEqual(['user', 'tools', 'user', 'tools', 'user']);
    expect(state.items[2]).toMatchObject({ text: 'Use warmer colors' });
    expect(state.items[4]).toMatchObject({ text: 'Keep the spacing', attachments, context: 'Selected heading', delivery: 'discarded' });
  });

  it('keeps streaming text and thinking indices valid while steers await pickup', () => {
    const state = foldSessionState(log(
      { type: 'turn.started', turnId: 'turn' },
      { type: 'thinking.start', blockId: 'thought' },
      { type: 'text.start', blockId: 'answer' },
      { type: 'message.user', turnId: 'turn', messageId: 'first', text: 'Warmer colors', delivery: 'steering' },
      { type: 'thinking.delta', blockId: 'thought', delta: 'Still checking' },
      { type: 'text.delta', blockId: 'answer', delta: 'Checking the layout.' },
      { type: 'message.user', turnId: 'turn', messageId: 'second', text: 'More spacing', delivery: 'steering' },
      { type: 'message.delivery', messageId: 'first', outcome: 'delivered' },
      { type: 'message.delivery', messageId: 'second', outcome: 'delivered' },
      { type: 'text.end', blockId: 'answer', text: 'Checking the layout.' },
    ));
    expect(kinds(state)).toEqual(['assistant-thinking', 'assistant-text', 'user', 'user']);
    expect(state.items[0]).toMatchObject({ text: 'Still checking', isStreaming: false });
    expect(state.items[1]).toMatchObject({ text: 'Checking the layout.', isStreaming: false });
    expect(state.items[2]).toMatchObject({ text: 'Warmer colors' });
    expect(state.items[3]).toMatchObject({ text: 'More spacing' });
  });
});

describe('an event type this fold does not know (ONL-2353)', () => {
  it('is recorded once per type and leaves the transcript as it was', () => {
    const known: StudioEvent = { type: 'turn.started', turnId: 't1', sessionId: 's1', eventId: 'e1', seq: 1, ts: 0 };
    const future = { type: 'future.thing', sessionId: 's1', eventId: 'e2', seq: 2, ts: 0 } as unknown as StudioEvent;
    const again = { type: 'future.thing', sessionId: 's1', eventId: 'e3', seq: 3, ts: 0 } as unknown as StudioEvent;
    const state = foldSessionState([known, future, again]);
    expect(state.unknownEventTypes).toEqual(['future.thing']);
    expect(state.items).toEqual(foldSessionState([known]).items);
    expect(state.lastSeq).toBe(3);
    expect(foldSessionState([known]).unknownEventTypes).toBeUndefined();
  });
});

describe('a usage.limits event is known, not drift (ONL-2197)', () => {
  it('folds without landing in the unknown-type counter that reports SDK drift', () => {
    const state = foldSessionState([
      {
        type: 'usage.limits',
        windows: [{ kind: 'primary', usedPercent: 41, resetsAt: 1_790_000_000 }],
        sessionId: 's',
        eventId: 'e1',
        seq: 1,
        ts: 0,
      },
    ] as StudioEvent[]);

    // The default arm is the SDK-drift counter; a known type landing there is a false positive.
    expect(state.unknownEventTypes).toBeUndefined();
    expect(state.items).toEqual([]);
  });
});

describe('a provider retry is a level signal, never a row (ONL-2491)', () => {
  const retry = (attempt?: number, status: number | null = 529): Input => ({
    type: 'session.retrying',
    ...(attempt === undefined ? {} : { attempt }),
    status,
    kind: 'overloaded',
  });

  it('stands at the end of the log, with the turn still live and the transcript untouched', () => {
    const state = foldSessionState(log({ type: 'turn.started', turnId: 't1' }, retry(2)));

    expect(state.retrying).toEqual({ attempt: 2, status: 529, kind: 'overloaded' });
    expect(state.items).toEqual([]);
    expect(state.isStreaming).toBe(true);
    expect(state.error).toBeUndefined();
    expect(state.failedTurn).toBeUndefined();
  });

  it('is a known type, not SDK drift', () => {
    expect(foldSessionState(log(retry(1))).unknownEventTypes).toBeUndefined();
  });

  it('keeps the first retry time across consecutive attempts and unrelated updates (ONL-2880)', () => {
    const events = log(
      { type: 'turn.started', turnId: 't1' },
      retry(1),
      { type: 'usage.limits', windows: [{ kind: 'primary', usedPercent: 92 }] },
      retry(2),
    );
    const state = foldSessionState(events);

    expect(state.retryingSince).toBe(events[1]?.ts);
    expect(state.retrying?.attempt).toBe(2);
  });

  it('starts a fresh grace period after activity or a new turn (ONL-2880)', () => {
    for (const reset of [
      { type: 'text.start', blockId: 'b1' },
      { type: 'thinking.start', blockId: 'th1' },
      startTool('c1'),
      { type: 'turn.started', turnId: 't2' },
      { type: 'turn.ended', turnId: 't1' },
      { type: 'session.error', message: 'Failed' },
    ] satisfies Input[]) {
      const events = log({ type: 'turn.started', turnId: 't1' }, retry(1), reset);
      expect(foldSessionState(events).retryingSince).toBeUndefined();
      const next = log({ type: 'turn.started', turnId: 't1' }, retry(1), reset, retry(3));
      expect(foldSessionState(next).retryingSince).toBe(next[3]?.ts);
    }
  });

  it('preserves a first retry stamped at epoch zero (ONL-2880)', () => {
    const events = log(retry(1), retry(2)).map((event, index) => ({ ...event, ts: index * 5_000 }));
    expect(foldSessionState(events).retryingSince).toBe(0);
  });

  it('carries no attempt when the backend counted none', () => {
    expect(foldSessionState(log(retry())).retrying).toEqual({ status: 529, kind: 'overloaded' });
  });

  it('clears the moment the agent produces text', () => {
    const state = foldSessionState(
      log({ type: 'turn.started', turnId: 't1' }, retry(1), { type: 'text.start', blockId: 'b1' }),
    );

    expect(state.retrying).toBeUndefined();
  });

  it('clears when the turn ends', () => {
    const state = foldSessionState(
      log({ type: 'turn.started', turnId: 't1' }, retry(1), { type: 'turn.ended', turnId: 't1' }),
    );

    expect(state.retrying).toBeUndefined();
  });

  it('stands through a rate-limit update, which arrives during exactly this storm', () => {
    const state = foldSessionState(
      log({ type: 'turn.started', turnId: 't1' }, retry(1), {
        type: 'usage.limits',
        windows: [{ kind: 'primary', usedPercent: 92 }],
      }),
    );

    expect(state.retrying?.attempt).toBe(1);
  });

  it('rises again on a second storm, naming the newer attempt', () => {
    const state = foldSessionState(
      log(
        { type: 'turn.started', turnId: 't1' },
        retry(1),
        { type: 'text.start', blockId: 'b1' },
        { type: 'tool.end', toolCallId: 'c1', status: 'completed' },
        retry(4, 500),
      ),
    );

    expect(state.retrying).toEqual({ attempt: 4, status: 500, kind: 'overloaded' });
  });
});

describe('the anchor a turn that has heard nothing leaves (ONL-2491)', () => {
  it('survives every event that is not agent activity', () => {
    const events = log(
      { type: 'turn.started', turnId: 't1' },
      { type: 'message.user', turnId: 't1', text: 'make the header blue' },
      { type: 'session.settings', model: 'claude-opus-5' },
      { type: 'session.started', cwd: '/w' },
    );

    // `session.started` proves the CLI booted, not that the provider answered.
    expect(foldSessionState(events).silentSince).toBe(events[0]?.ts);
  });

  it('is cleared by the first streamed text', () => {
    const events = log({ type: 'turn.started', turnId: 't1' }, { type: 'text.start', blockId: 'b1' });

    expect(foldSessionState(events).silentSince).toBeUndefined();
  });

  it('is cleared by a tool call and stays clear, so a long tool call is never silence', () => {
    const events = log({ type: 'turn.started', turnId: 't1' }, startTool('c1'));

    expect(foldSessionState(events).silentSince).toBeUndefined();
  });

  it('is set only from turn.started, whichever order the backend pushes the pair in', () => {
    const events = log(
      { type: 'message.user', turnId: 't1', text: 'hi' },
      { type: 'turn.started', turnId: 't1' },
    );

    expect(foldSessionState(events).silentSince).toBe(events[1]?.ts);
  });

  it('is cleared when the turn ends', () => {
    const events = log({ type: 'turn.started', turnId: 't1' }, { type: 'turn.ended', turnId: 't1' });

    expect(foldSessionState(events).silentSince).toBeUndefined();
  });

  it('stands beside a retry, so the renderer decides which notice shows', () => {
    const events = log({ type: 'turn.started', turnId: 't1' }, {
      type: 'session.retrying',
      attempt: 1,
      status: 529,
    });

    const state = foldSessionState(events);
    expect(state.silentSince).toBe(events[0]?.ts);
    expect(state.retrying?.attempt).toBe(1);
  });

  it('reports a restored transcript’s days-old turn.started as the anchor it is', () => {
    const old = 1_600_000_000_000;
    const state = foldSessionState([
      { type: 'turn.started', turnId: 't1', sessionId: 's', eventId: 'e1', seq: 1, ts: old },
    ] as StudioEvent[]);

    expect(state.silentSince).toBe(old);
  });
});
