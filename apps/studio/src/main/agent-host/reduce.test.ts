import { foldSessionState, type ImageRef, type StudioEvent } from '@studio/events';
import { describe, expect, it } from 'bun:test';
import { EventLog } from './event-log.js';
import {
  forgetTurnState,
  handleSdkMessage,
  parseQuestions,
  retryWasCredentialShaped,
  permissionOptions,
  toolKind,
  type CostSample,
} from './reduce.js';
import { t } from '@studio/i18n';

function makeLog(): { log: EventLog; emitted: StudioEvent[] } {
  const emitted: StudioEvent[] = [];
  const log = new EventLog({
    sessionId: 's1',
    cwd: '/tmp/studio-workspace',
    emit: (event) => emitted.push(event),
  });
  return { log, emitted };
}

const types = (emitted: StudioEvent[]): string[] => emitted.map((e) => e.type);

describe('parseQuestions', () => {
  it('drops what cannot be answered and keeps what can, from the same payload', () => {
    // Every rejection beside one survivor: an all-malformed payload passes a validator that returns nothing.
    const questions = parseQuestions({
      questions: [
        {
          // Rejected: one option.
          question: 'Ship it?',
          header: 'Ship',
          options: [{ label: 'Yes', description: 'do it' }],
        },
        {
          // Rejected: two of three options lack a string label.
          question: 'Which accent?',
          header: 'Accent',
          options: [
            { label: 'Blue', description: 'cool' },
            { description: 'no label' },
            { label: 42, description: 'not a string' },
          ],
        },
        {
          // Rejected: no question text.
          header: 'Nameless',
          options: [
            { label: 'A', description: '' },
            { label: 'B', description: '' },
          ],
        },
        {
          // Rejected: options is not a list.
          question: 'How many?',
          options: 'lots',
        },
        {
          // Kept.
          question: 'Which layout should the settings page use?',
          options: [
            { label: 'Tabs', description: 'grouped across the top' },
            { label: 'Sidebar', description: 'grouped down the side', preview: '<b>x</b>' },
            { label: 'One page' },
          ],
        },
      ],
    });

    expect(questions).toHaveLength(1);
    const [kept] = questions ?? [];
    expect(kept?.question).toBe('Which layout should the settings page use?');
    expect(kept?.options.map((o) => o.label)).toEqual(['Tabs', 'Sidebar', 'One page']);
    expect(kept?.options[2]?.description).toBe('');
    expect(kept?.options[1]?.preview).toBe('<b>x</b>');
    expect(kept?.header).toBe('Which layout');
    expect(kept?.multiSelect).toBe(false);
  });

  it('returns undefined when nothing survives, so the caller degrades to approve/deny', () => {
    // `undefined`, not `[]`: an empty array draws a picker with no questions.
    expect(parseQuestions({ questions: [{ question: 'Only one?', options: [{ label: 'A' }] }] })).toBeUndefined();
    expect(parseQuestions({ questions: [] })).toBeUndefined();
    expect(parseQuestions({ questions: 'nope' })).toBeUndefined();
    expect(parseQuestions({})).toBeUndefined();
    expect(parseQuestions(undefined)).toBeUndefined();
  });
});

describe('toolKind', () => {
  it('falls back to the MCP verb when it has no name it knows', () => {
    expect(toolKind('mcp__figma__get_node')).toBe('read');
    expect(toolKind('mcp__notion__list_pages')).toBe('read');
    expect(toolKind('mcp__linear__create_issue')).toBe('edit');
    expect(toolKind('mcp__linear__update_issue')).toBe('edit');
    expect(toolKind('mcp__studio__duplicate_frames')).toBe('edit');
    expect(toolKind('mcp__studio__undo_canvas')).toBe('edit');
    expect(toolKind('mcp__studio__redo_canvas')).toBe('edit');
    expect(toolKind('mcp__db__delete_row')).toBe('delete');
    expect(toolKind('mcp__fs__rename_file')).toBe('move');
    expect(toolKind('mcp__repo__search_code')).toBe('search');
    expect(toolKind('mcp__shell__run_command')).toBe('execute');
    expect(toolKind('mcp__http__fetch_url')).toBe('fetch');

    expect(toolKind('mcp__fs__rm_path')).toBe('delete');
    expect(toolKind('mcp__fs__mv')).toBe('move');

    expect(toolKind('mcp__delete__describe_thing')).toBe('other');
    expect(toolKind('mcp__x__fetch_file')).toBe('read');
    expect(toolKind('mcp__x__fetch_page')).toBe('fetch');

    expect(toolKind('mcp__x__frobnicate')).toBe('other');
    expect(toolKind('SomeToolShippedNextWeek')).toBe('other');

    // The control: a heuristic-first implementation reads `Task` as `other`.
    expect(toolKind('Task')).toBe('think');
    expect(toolKind('Bash')).toBe('execute');
    expect(toolKind('WebSearch')).toBe('fetch');
  });
});

describe('turn end', () => {
  it('reads context from the LAST assistant message of the turn, never the summed result usage (ONL-2381)', () => {
    const { log, emitted } = makeLog();
    const request = (input: number, read: number, write: number, output: number) => ({
      type: 'assistant',
      message: {
        content: [],
        usage: {
          input_tokens: input,
          cache_read_input_tokens: read,
          cache_creation_input_tokens: write,
          output_tokens: output,
        },
      },
    });
    handleSdkMessage(log, request(10, 20_000, 40_000, 100), {});
    handleSdkMessage(log, request(5, 65_000, 200, 200), {});
    handleSdkMessage(log, request(1_000, 30_000, 2_000, 500), {});
    handleSdkMessage(
      log,
      {
        type: 'result',
        subtype: 'success',
        num_turns: 3,
        usage: {
          input_tokens: 1_015,
          cache_read_input_tokens: 115_000,
          cache_creation_input_tokens: 42_200,
          output_tokens: 800,
        },
        modelUsage: { 'claude-opus-4-7': { contextWindow: 200_000, inputTokens: 1_015 } },
      },
      {},
    );
    const [ended] = emitted.filter((e) => e.type === 'turn.ended');
    if (ended?.type !== 'turn.ended') throw new Error('shape');
    expect(ended.tokens).toEqual({
      input: 1_000,
      cachedInput: 30_000,
      cacheWriteInput: 2_000,
      output: 500,
      context: 33_000,
      contextWindow: 200_000,
    });

    const silent = makeLog();
    handleSdkMessage(
      silent.log,
      { type: 'result', subtype: 'success', usage: { input_tokens: 9, cache_read_input_tokens: 9 } },
      {},
    );
    const [bare] = silent.emitted.filter((e) => e.type === 'turn.ended');
    if (bare?.type !== 'turn.ended') throw new Error('shape');
    expect(bare.tokens).toBeUndefined();
  });

  it('carries the files-changed count, zero when nothing changed (ONL-2286)', () => {
    const { log, emitted } = makeLog();
    handleSdkMessage(log, { type: 'result', subtype: 'success' }, {});
    const [ended] = emitted.filter((e) => e.type === 'turn.ended');
    if (ended?.type !== 'turn.ended') throw new Error('shape');
    expect(ended.filesChanged).toBe(0);
  });

  it('clamps the cost delta, because it is a difference of two reported numbers', () => {
    const { log, emitted } = makeLog();
    const samples: CostSample[] = [];

    // The ordinary case first, or an implementation that reports 0 for every turn satisfies the clamp.
    handleSdkMessage(
      log,
      { type: 'result', subtype: 'success', total_cost_usd: 0.75, duration_ms: 1200 },
      { previousTotalCostUsd: 0.25, onCost: (sample) => samples.push(sample) },
    );

    const [normal] = emitted.filter((e) => e.type === 'turn.ended');
    if (normal?.type !== 'turn.ended') throw new Error('shape');
    expect(normal.totalCostUsd).toBe(0.75);
    expect(normal.costDeltaUsd).toBe(0.5);
    expect(samples).toEqual([{ totalCostUsd: 0.75, costDeltaUsd: 0.5 }]);

    const lower = makeLog();
    const lowerSamples: CostSample[] = [];
    handleSdkMessage(
      lower.log,
      { type: 'result', subtype: 'success', total_cost_usd: 0.5 },
      { previousTotalCostUsd: 0.9, onCost: (sample) => lowerSamples.push(sample) },
    );
    const [clamped] = lower.emitted.filter((e) => e.type === 'turn.ended');
    if (clamped?.type !== 'turn.ended') throw new Error('shape');
    expect(clamped.costDeltaUsd).toBe(0);
    expect(lowerSamples).toEqual([{ totalCostUsd: 0.5, costDeltaUsd: 0 }]);

    const silent = makeLog();
    const silentSamples: CostSample[] = [];
    handleSdkMessage(
      silent.log,
      { type: 'result', subtype: 'success' },
      { onCost: (sample) => silentSamples.push(sample) },
    );
    const [absent] = silent.emitted.filter((e) => e.type === 'turn.ended');
    if (absent?.type !== 'turn.ended') throw new Error('shape');
    expect(absent.totalCostUsd).toBeUndefined();
    expect(absent.costDeltaUsd).toBeUndefined();
    expect(silentSamples).toEqual([]);
  });

  it('reads an interrupt as an interrupt, and raises no error for it', () => {
    const stopped = makeLog();
    handleSdkMessage(
      stopped.log,
      { type: 'result', subtype: 'error_during_execution', result: 'aborted' },
      { interrupted: true },
    );

    expect(types(stopped.emitted)).toEqual(['turn.ended']);
    const [ended] = stopped.emitted;
    if (ended?.type !== 'turn.ended') throw new Error('shape');
    expect(ended.stopReason).toBe('interrupted');
    expect(stopped.emitted.some((e) => e.type === 'session.error')).toBe(false);

    // The negative control: the same message without the flag still surfaces.
    const failed = makeLog();
    handleSdkMessage(failed.log, {
      type: 'result',
      subtype: 'error_during_execution',
      result: 'the tool crashed',
    });

    expect(types(failed.emitted)).toEqual(['turn.ended', 'session.error']);
    const [failedTurn, error] = failed.emitted;
    if (failedTurn?.type !== 'turn.ended' || error?.type !== 'session.error') {
      throw new Error('shape');
    }
    expect(failedTurn.stopReason).toBe('error_during_execution');
    // The provider's prose, not the subtype token the row used to show instead of it (ONL-2495).
    expect(error.message).toBe('the tool crashed');
    expect(error.detail).toBe('the tool crashed');

    const ok = makeLog();
    handleSdkMessage(ok.log, { type: 'result', subtype: 'success' });
    expect(types(ok.emitted)).toEqual(['turn.ended']);
  });

  it('reads a success-subtype result with is_error as a failed turn, and raises the auth state (ONL-2080)', () => {
    const signedOut = makeLog();
    const raised: Array<{ status: string; detail?: string; harness?: string }> = [];
    handleSdkMessage(
      signedOut.log,
      {
        type: 'result',
        subtype: 'success',
        is_error: true,
        terminal_reason: 'api_error',
        result: 'Not logged in · Please run /login',
      },
      { onConnection: (connection) => raised.push(connection) },
    );

    expect(types(signedOut.emitted)).toEqual(['turn.ended', 'session.error']);
    const [turn, error] = signedOut.emitted;
    if (turn?.type !== 'turn.ended' || error?.type !== 'session.error') throw new Error('shape');
    expect(turn.stopReason).toBe('api_error');
    expect(error.code).toBe('unauthenticated');
    expect(error.message).toBe('Not logged in · Please run /login');
    expect(raised).toEqual([
      { status: 'unauthenticated', detail: 'Not logged in · Please run /login', harness: 'claude' },
    ]);

    // `unknown`, not rate-limited: that code comes from `terminal_reason`, never this string (ONL-2197).
    const other = makeLog();
    const untouched: unknown[] = [];
    handleSdkMessage(
      other.log,
      { type: 'result', subtype: 'success', is_error: true, result: 'Rate limit reached' },
      { onConnection: (connection) => untouched.push(connection) },
    );
    expect(types(other.emitted)).toEqual(['turn.ended', 'session.error']);
    const [, otherError] = other.emitted;
    if (otherError?.type !== 'session.error') throw new Error('shape');
    expect(otherError.code).toBe('unknown');
    expect(untouched).toEqual([]);
  });

  it('cancels a row the stream announced when Stop ends the turn before its result (ONL-2142)', () => {
    const { log, emitted } = makeLog();
    handleSdkMessage(log, {
      type: 'stream_event',
      event: {
        index: 0,
        type: 'content_block_start',
        content_block: { type: 'tool_use', id: 'toolu_w', name: 'Write', input: {} },
      },
    });
    handleSdkMessage(
      log,
      { type: 'result', subtype: 'error_during_execution', result: 'aborted' },
      { interrupted: true },
    );

    expect(types(emitted)).toEqual(['tool.start', 'tool.end', 'turn.ended']);
    const [, end] = emitted;
    if (end?.type !== 'tool.end') throw new Error('shape');
    expect(end.status).toBe('canceled');

    const ended = makeLog();
    handleSdkMessage(ended.log, {
      type: 'stream_event',
      event: {
        index: 0,
        type: 'content_block_start',
        content_block: { type: 'tool_use', id: 'toolu_w', name: 'Write', input: {} },
      },
    });
    handleSdkMessage(ended.log, { type: 'result', subtype: 'error_max_turns' });
    const [, endedRow] = ended.emitted;
    if (endedRow?.type !== 'tool.end') throw new Error('shape');
    expect(endedRow.status).toBe('canceled');

    // The negative control: a row that already ended is not ended again.
    const settled = makeLog();
    settled.log.ensureToolStart('toolu_1', 'Bash', { command: 'ls' }, 'in_progress', {
      source: 'hook',
    });
    settled.log.endTool('toolu_1', 'completed');
    handleSdkMessage(settled.log, { type: 'result', subtype: 'success' });
    expect(types(settled.emitted)).toEqual(['tool.start', 'tool.end', 'turn.ended']);
  });

  it('ends an aborted tool as canceled, not failed, when the host asked to stop (ONL-2231)', () => {
    const aborted = (): Record<string, unknown> => ({
      type: 'user',
      message: {
        content: [{ type: 'tool_result', tool_use_id: 'toolu_s', is_error: true, content: 'Command was aborted before completion' }],
      },
    });
    const stopped = makeLog();
    stopped.log.ensureToolStart('toolu_s', 'Bash', { command: 'sleep 300' }, 'in_progress', { source: 'hook' });
    handleSdkMessage(stopped.log, aborted(), { interrupted: true });
    const end = stopped.emitted.find((e) => e.type === 'tool.end');
    if (end?.type !== 'tool.end') throw new Error('shape');
    expect(end.status).toBe('canceled');
    expect(end.errorMessage).toBe('Command was aborted before completion');

    // The negative control: the same result with nobody stopping is the failure it says.
    const failed = makeLog();
    failed.log.ensureToolStart('toolu_s', 'Bash', { command: 'sleep 300' }, 'in_progress', { source: 'hook' });
    handleSdkMessage(failed.log, aborted());
    const failedEnd = failed.emitted.find((e) => e.type === 'tool.end');
    if (failedEnd?.type !== 'tool.end') throw new Error('shape');
    expect(failedEnd.status).toBe('failed');
  });

  it("reads the SDK's own abort reasons as an interrupt, with or without the host's flag (ONL-2180)", () => {
    for (const terminalReason of ['aborted_streaming', 'aborted_tools']) {
      const { log, emitted } = makeLog();
      handleSdkMessage(log, {
        type: 'result',
        subtype: 'error_during_execution',
        is_error: true,
        terminal_reason: terminalReason,
      });
      expect(types(emitted)).toEqual(['turn.ended']);
      const [ended] = emitted;
      if (ended?.type !== 'turn.ended') throw new Error('shape');
      expect(ended.stopReason).toBe('interrupted');
    }

    // The negative control: any other reason is still the failure it says.
    const failed = makeLog();
    handleSdkMessage(failed.log, {
      type: 'result',
      subtype: 'error_during_execution',
      is_error: true,
      terminal_reason: 'tool_error',
      result: 'the tool crashed',
    });
    expect(types(failed.emitted)).toEqual(['turn.ended', 'session.error']);
    const [failedTurn] = failed.emitted;
    if (failedTurn?.type !== 'turn.ended') throw new Error('shape');
    expect(failedTurn.stopReason).toBe('tool_error');
  });
});

describe('a denial that never reached canUseTool', () => {
  it('ends the tool row and says which command was refused', () => {
    const { log, emitted } = makeLog();

    handleSdkMessage(log, {
      type: 'system',
      subtype: 'permission_denied',
      tool_name: 'Bash',
      tool_use_id: 'toolu_1',
      tool_input: { command: 'cat .env' },
      decision_reason_type: 'subcommandResults',
      message: 'Permission to use Bash with command cat .env has been denied.',
    });

    expect(types(emitted)).toEqual(['tool.start', 'tool.end']);
    const [start, end] = emitted;
    if (start?.type !== 'tool.start' || end?.type !== 'tool.end') throw new Error('shape');
    expect(start.name).toBe('Bash');
    expect(end.status).toBe('denied');
    expect(end.errorMessage).toBe(
      'Permission to use Bash with command cat .env has been denied.',
    );
    expect(log.unmappedTypes.size).toBe(0);
  });

  it('refines the row a hook already announced instead of duplicating it', () => {
    const { log, emitted } = makeLog();
    log.ensureToolStart('toolu_1', 'Bash', { command: 'cat .env' }, 'in_progress', {
      source: 'hook',
    });

    handleSdkMessage(log, {
      type: 'system',
      subtype: 'permission_denied',
      tool_name: 'Bash',
      tool_use_id: 'toolu_1',
      message: 'denied',
    });

    expect(types(emitted)).toEqual(['tool.start', 'tool.update', 'tool.end']);
    expect(emitted.filter((e) => e.type === 'tool.start')).toHaveLength(1);
  });

  it('still counts an unknown system subtype as drift', () => {
    // The negative control: the case above must not pass by no longer recording unmapped subtypes.
    const { log } = makeLog();
    handleSdkMessage(log, { type: 'system', subtype: 'something_new' });
    expect(log.unmappedTypes.get('system:something_new')).toBe(1);
  });
});

describe('SDK drift', () => {
  it('does not count a system message the reducer deliberately drops', () => {
    const { log, emitted } = makeLog();
    for (const subtype of ['session_state_changed', 'hook_started', 'informational']) {
      handleSdkMessage(log, { type: 'system', subtype });
    }
    expect(emitted).toEqual([]);
    expect([...log.unmappedTypes.keys()]).toEqual([]);
  });
});

describe('a streamed reply', () => {
  const at = (index: number, event: Record<string, unknown>, parent: string | null = null): Record<string, unknown> => ({
    type: 'stream_event',
    event: { index, ...event },
    parent_tool_use_id: parent,
  });
  const textStart = (index: number, parent: string | null = null): Record<string, unknown> =>
    at(index, { type: 'content_block_start', content_block: { type: 'text', text: '' } }, parent);
  const thinkingStart = (index: number): Record<string, unknown> =>
    at(index, { type: 'content_block_start', content_block: { type: 'thinking', thinking: '', signature: '' } });
  const textDelta = (index: number, text: string, parent: string | null = null): Record<string, unknown> =>
    at(index, { type: 'content_block_delta', delta: { type: 'text_delta', text } }, parent);
  const thinkingDelta = (index: number, thinking: string): Record<string, unknown> =>
    at(index, { type: 'content_block_delta', delta: { type: 'thinking_delta', thinking } });
  const signature = (index: number): Record<string, unknown> =>
    at(index, { type: 'content_block_delta', delta: { type: 'signature_delta', signature: 'sig' } });
  const stop = (index: number, parent: string | null = null): Record<string, unknown> =>
    at(index, { type: 'content_block_stop' }, parent);

  function streamed(messages: Record<string, unknown>[]): StudioEvent[] {
    const { log, emitted } = makeLog();
    for (const msg of messages) handleSdkMessage(log, msg);
    return emitted;
  }
  const rows = (emitted: StudioEvent[]): { kind: string; text?: string }[] =>
    foldSessionState(emitted).items.map((item) => ({ kind: item.kind, ...('text' in item ? { text: item.text } : {}) }));

  it('reaches the transcript as its deltas in arrival order, the thinking in a row of its own', () => {
    const emitted = streamed([
      thinkingStart(0),
      thinkingDelta(0, 'Reading '),
      thinkingDelta(0, 'the header.'),
      signature(0),
      stop(0),
      textStart(1),
      textDelta(1, 'Hello'),
      textDelta(1, ', world'),
      stop(1),
    ]);

    expect(rows(emitted)).toEqual([
      { kind: 'assistant-thinking', text: 'Reading the header.' },
      { kind: 'assistant-text', text: 'Hello, world' },
    ]);
  });

  it('stops the thinking row streaming when its block stops, before the turn ends, keeping what it streamed', () => {
    const emitted = streamed([thinkingStart(0), thinkingDelta(0, 'Reading the header.'), signature(0), stop(0)]);

    expect(foldSessionState(emitted).items).toMatchObject([
      { kind: 'assistant-thinking', text: 'Reading the header.', isStreaming: false },
    ]);
  });

  it('keeps two sub-agents streaming at the same index each in their own row', () => {
    const emitted = streamed([
      textStart(0, 'toolu_a'),
      textStart(0, 'toolu_b'),
      textDelta(0, 'Alpha ', 'toolu_a'),
      textDelta(0, 'Beta ', 'toolu_b'),
      textDelta(0, 'one', 'toolu_a'),
      textDelta(0, 'two', 'toolu_b'),
      stop(0, 'toolu_a'),
      stop(0, 'toolu_b'),
    ]);

    expect(rows(emitted)).toEqual([
      { kind: 'assistant-text', text: 'Alpha one' },
      { kind: 'assistant-text', text: 'Beta two' },
    ]);
  });
});

describe('a streamed tool_use block (ONL-2142)', () => {
  const CWD = '/tmp/studio-workspace';
  const stream = (event: Record<string, unknown>): Record<string, unknown> => ({
    type: 'stream_event',
    event: { index: 1, ...event },
  });
  const delta = (partial_json: string): Record<string, unknown> =>
    stream({ type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json } });

  it('announces the row at block start and names its target once the stream reaches it', () => {
    const { log, emitted } = makeLog();

    handleSdkMessage(
      log,
      stream({
        type: 'content_block_start',
        content_block: { type: 'tool_use', id: 'toolu_w', name: 'Write', input: {} },
      }),
    );
    expect(types(emitted)).toEqual(['tool.start']);
    const [start] = emitted;
    if (start?.type !== 'tool.start') throw new Error('shape');
    expect(start.status).toBe('pending');
    expect(start.source).toBe('stream');
    expect(start.name).toBe('Write');
    expect(start.target).toBeFalsy();

    handleSdkMessage(log, delta('{"file_pa'));
    expect(types(emitted)).toEqual(['tool.start']);
    handleSdkMessage(log, delta(`th": "${CWD}/catalog.ts", "content": "export const`));
    expect(types(emitted)).toEqual(['tool.start', 'tool.update']);
    const [, update] = emitted;
    if (update?.type !== 'tool.update') throw new Error('shape');
    expect(update.toolCallId).toBe('toolu_w');
    expect(update.target).toBe('catalog.ts');
    expect(update.title).toBe('Write');
    expect('status' in update).toBe(false);

    handleSdkMessage(log, delta(' catalog = [];"}'));
    handleSdkMessage(log, stream({ type: 'content_block_stop' }));
    expect(types(emitted)).toEqual(['tool.start', 'tool.update']);

    const input = { file_path: `${CWD}/catalog.ts`, content: 'export const catalog = [];' };
    handleSdkMessage(log, {
      type: 'assistant',
      message: { content: [{ type: 'tool_use', id: 'toolu_w', name: 'Write', input }] },
    });
    expect(types(emitted)).toEqual(['tool.start', 'tool.update', 'tool.update']);
    const refined = emitted[2];
    if (refined?.type !== 'tool.update') throw new Error('shape');
    expect(refined.status).toBe('in_progress');
    expect(refined.input).toEqual(input);

    handleSdkMessage(log, {
      type: 'user',
      message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_w', content: 'ok' }] },
    });
    expect(types(emitted)).toEqual(['tool.start', 'tool.update', 'tool.update', 'tool.end']);
    expect(emitted.filter((e) => e.type === 'tool.start')).toHaveLength(1);
  });

  it('never names a target from an unterminated string', () => {
    const { log, emitted } = makeLog();
    handleSdkMessage(
      log,
      stream({
        type: 'content_block_start',
        content_block: { type: 'tool_use', id: 'toolu_b', name: 'Bash', input: {} },
      }),
    );
    handleSdkMessage(log, delta('{"command": "rm -rf ./dist && bun run bui'));
    expect(types(emitted)).toEqual(['tool.start']);
    handleSdkMessage(log, delta('ld"}'));
    expect(types(emitted)).toEqual(['tool.start', 'tool.update']);
    const [, update] = emitted;
    if (update?.type !== 'tool.update') throw new Error('shape');
    expect(update.target).toBe('rm -rf ./dist && bun run build');
  });
});

describe('image capture at tool results (ONL-1881)', () => {
  const B64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  function capturing(): {
    capture: (bytes: Uint8Array) => ImageRef | null;
    captured: Uint8Array[];
  } {
    const captured: Uint8Array[] = [];
    let n = 0;
    return {
      captured,
      capture: (bytes) => {
        captured.push(bytes);
        n += 1;
        return { id: `blob-${String(n)}`, mediaType: 'image/png' };
      },
    };
  }

  function imageResult(toolUseId: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      type: 'user',
      message: {
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUseId,
            content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: B64 } }],
          },
        ],
      },
      ...extra,
    };
  }

  it('captures the delivered bytes and puts the ref on tool.end', () => {
    const { log, emitted } = makeLog();
    const { capture, captured } = capturing();
    handleSdkMessage(log, imageResult('toolu_img'), { captureImage: capture });

    expect(captured).toHaveLength(1);
    expect(Buffer.from(captured[0] ?? []).equals(Buffer.from(B64, 'base64'))).toBe(true);
    const end = emitted.find((e) => e.type === 'tool.end');
    if (end?.type !== 'tool.end') throw new Error('expected tool.end');
    expect(end.images).toEqual([{ id: 'blob-1', mediaType: 'image/png' }]);
    expect(end.status).toBe('completed');
  });

  it('joins tool_use_result.file metadata only for a single-image message', () => {
    const { log, emitted } = makeLog();
    const { capture } = capturing();
    handleSdkMessage(
      log,
      imageResult('toolu_img', {
        tool_use_result: {
          type: 'image',
          file: {
            base64: B64,
            type: 'image/png',
            originalSize: 5_000_000,
            dimensions: { originalWidth: 5000, originalHeight: 3000, displayWidth: 2000, displayHeight: 1200 },
          },
        },
      }),
      { captureImage: capture },
    );
    const end = emitted.find((e) => e.type === 'tool.end');
    if (end?.type !== 'tool.end') throw new Error('expected tool.end');
    expect(end.images?.[0]).toEqual({
      id: 'blob-1',
      mediaType: 'image/png',
      width: 2000,
      height: 1200,
      originalSize: 5_000_000,
    });
  });

  it('skips the metadata join when a message batches two image results', () => {
    const { log, emitted } = makeLog();
    const { capture } = capturing();
    handleSdkMessage(
      log,
      {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'toolu_a',
              content: [{ type: 'image', source: { type: 'base64', data: B64 } }],
            },
            {
              type: 'tool_result',
              tool_use_id: 'toolu_b',
              content: [{ type: 'image', source: { type: 'base64', data: B64 } }],
            },
          ],
        },
        tool_use_result: {
          type: 'image',
          file: { base64: B64, type: 'image/png', dimensions: { displayWidth: 2000 } },
        },
      },
      { captureImage: capture },
    );
    const ends = emitted.filter((e) => e.type === 'tool.end');
    expect(ends).toHaveLength(2);
    for (const end of ends) {
      if (end.type !== 'tool.end') continue;
      expect(end.images).toHaveLength(1);
      expect(end.images?.[0]?.width).toBeUndefined();
    }
  });

  it('tolerates absent dimensions — the ref simply omits them', () => {
    const { log, emitted } = makeLog();
    const { capture } = capturing();
    handleSdkMessage(
      log,
      imageResult('toolu_gif', {
        tool_use_result: { type: 'image', file: { base64: B64, type: 'image/gif' } },
      }),
      { captureImage: capture },
    );
    const end = emitted.find((e) => e.type === 'tool.end');
    if (end?.type !== 'tool.end') throw new Error('expected tool.end');
    expect(end.images?.[0]?.width).toBeUndefined();
    expect(end.images?.[0]?.height).toBeUndefined();
  });

  it('captures nothing from a text result, even one mentioning image paths', () => {
    const { log, emitted } = makeLog();
    const { capture, captured } = capturing();
    handleSdkMessage(
      log,
      {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'toolu_svg',
              content: [{ type: 'text', text: '<svg/> — see also assets/hero.png' }],
            },
          ],
        },
      },
      { captureImage: capture },
    );
    expect(captured).toHaveLength(0);
    const end = emitted.find((e) => e.type === 'tool.end');
    if (end?.type !== 'tool.end') throw new Error('expected tool.end');
    expect(end.images).toBeUndefined();
    expect(end.result).toContain('assets/hero.png');
  });

  it('degrades gracefully on a malformed image block — no capture, no crash', () => {
    const { log, emitted } = makeLog();
    const { capture, captured } = capturing();
    handleSdkMessage(
      log,
      {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'toolu_bad',
              content: [{ type: 'image', source: { type: 'base64' } }, { type: 'text', text: 'still here' }],
            },
          ],
        },
      },
      { captureImage: capture },
    );
    expect(captured).toHaveLength(0);
    const end = emitted.find((e) => e.type === 'tool.end');
    if (end?.type !== 'tool.end') throw new Error('expected tool.end');
    expect(end.images).toBeUndefined();
    expect(end.result).toContain('still here');
  });

  it('completes the tool row when the capture declines', () => {
    const { log, emitted } = makeLog();
    handleSdkMessage(log, imageResult('toolu_declined'), { captureImage: () => null });
    const end = emitted.find((e) => e.type === 'tool.end');
    if (end?.type !== 'tool.end') throw new Error('expected tool.end');
    expect(end.status).toBe('completed');
    expect(end.images).toBeUndefined();
  });

  it('drops the bytes silently when no capture is injected', () => {
    const { log, emitted } = makeLog();
    handleSdkMessage(log, imageResult('toolu_legacy'));
    const end = emitted.find((e) => e.type === 'tool.end');
    if (end?.type !== 'tool.end') throw new Error('expected tool.end');
    expect(end.images).toBeUndefined();
    expect(end.result).not.toContain(B64);
  });
});

describe('the rate limit the reducer used to drop (ONL-2197)', () => {
  it('maps a rate_limit_event onto a typed window and counts as no drift', () => {
    const { log, emitted } = makeLog();
    handleSdkMessage(log, {
      type: 'rate_limit_event',
      rate_limit_info: {
        status: 'allowed_warning',
        rateLimitType: 'seven_day_opus',
        utilization: 82,
        resetsAt: 1_790_000_000,
      },
    });

    expect(types(emitted)).toEqual(['usage.limits']);
    const [event] = emitted;
    if (event?.type !== 'usage.limits') throw new Error('shape');
    expect(event.windows).toEqual([
      { kind: 'seven_day_opus', usedPercent: 82, resetsAt: 1_790_000_000, status: 'allowed_warning' },
    ]);
    expect(log.unmappedTypes.size).toBe(0);
  });

  it('leaves an unreported utilization absent, never zero', () => {
    const { log, emitted } = makeLog();
    handleSdkMessage(log, {
      type: 'rate_limit_event',
      rate_limit_info: { status: 'allowed', rateLimitType: 'five_hour' },
    });

    const [event] = emitted;
    if (event?.type !== 'usage.limits') throw new Error('shape');
    expect(event.windows[0]).toEqual({ kind: 'five_hour', status: 'allowed' });
    expect(event.windows[0]).not.toHaveProperty('usedPercent');
  });

  it('normalises a millisecond-scale reset, because only codex documents its unit', () => {
    const { log, emitted } = makeLog();
    handleSdkMessage(log, {
      type: 'rate_limit_event',
      rate_limit_info: { status: 'rejected', rateLimitType: 'overage', resetsAt: 1_790_000_000_000 },
    });

    const [event] = emitted;
    if (event?.type !== 'usage.limits') throw new Error('shape');
    expect(event.windows[0]?.resetsAt).toBe(1_790_000_000);
  });

  it('a blocking_limit ending is rate_limited, and still does not touch the connection', () => {
    const { log, emitted } = makeLog();
    const raised: unknown[] = [];
    handleSdkMessage(
      log,
      { type: 'result', subtype: 'success', is_error: true, terminal_reason: 'blocking_limit', result: 'x' },
      { onConnection: (connection) => raised.push(connection) },
    );

    const error = emitted.find((event) => event.type === 'session.error');
    if (error?.type !== 'session.error') throw new Error('shape');
    expect(error.code).toBe('rate_limited');
    expect(emitted.find((event) => event.type === 'turn.ended')).toMatchObject({ isError: true });
    expect(raised).toEqual([]);
  });

  it("a subtype of 'success' with is_error is still a failure", () => {
    const { log, emitted } = makeLog();
    handleSdkMessage(log, {
      type: 'result',
      subtype: 'success',
      is_error: true,
      terminal_reason: 'budget_exhausted',
      result: 'x',
    });

    expect(types(emitted)).toContain('session.error');
    expect(emitted.find((event) => event.type === 'turn.ended')).toMatchObject({ isError: true });
  });
});

describe('the Claude token narrowing (ONL-2197)', () => {
  function turnTokens(assistant: Record<string, unknown>, result: Record<string, unknown>) {
    const { log, emitted } = makeLog();
    handleSdkMessage(log, { type: 'assistant', message: assistant });
    handleSdkMessage(log, { type: 'result', subtype: 'success', ...result });
    const ended = emitted.find((event) => event.type === 'turn.ended');
    if (ended?.type !== 'turn.ended') throw new Error('shape');
    return ended.tokens;
  }

  it('carries the thinking tokens the path used to drop', () => {
    const tokens = turnTokens(
      { model: 'claude-opus-5', usage: { input_tokens: 10, output_tokens: 4, output_tokens_details: { thinking_tokens: 3 } } },
      { modelUsage: { 'claude-opus-5': { contextWindow: 200_000 } } },
    );

    expect(tokens?.reasoningOutput).toBe(3);
    // No source at 0.3.220: a sum would not be the runtime's own figure.
    expect(tokens).not.toHaveProperty('total');
  });

  it('reports the turn model’s window when a subagent added a second entry', () => {
    const tokens = turnTokens(
      { model: 'claude-opus-5', usage: { input_tokens: 10, output_tokens: 4 } },
      {
        modelUsage: {
          'claude-haiku-4-5': { contextWindow: 200_000 },
          'claude-opus-5': { contextWindow: 1_000_000 },
        },
      },
    );

    expect(tokens?.contextWindow).toBe(1_000_000);
  });

  it('reports no window at all rather than another model’s, when the pair cannot be resolved', () => {
    const tokens = turnTokens(
      { usage: { input_tokens: 10, output_tokens: 4 } },
      { modelUsage: { a: { contextWindow: 1 }, b: { contextWindow: 2 } } },
    );

    expect(tokens?.contextWindow).toBeUndefined();
  });

  it('leaves an unreported output count absent', () => {
    const tokens = turnTokens(
      { model: 'm', usage: { input_tokens: 10 } },
      { modelUsage: { m: { contextWindow: 5 } } },
    );

    expect(tokens?.output).toBeUndefined();
  });
});

describe('a failed turn reports the reason the SDK declared (ONL-2463)', () => {
  it('folds a Claude rate-limit event into the ended turn’s local-clock snapshot', () => {
    const { log, emitted } = makeLog();
    const resetsAt = Math.floor(Date.now() / 1000) + 3600;
    handleSdkMessage(log, { type: 'rate_limit_event', rate_limit_info: { rateLimitType: 'five_hour', status: 'rejected', resetsAt, utilization: 100 } });
    handleSdkMessage(log, { type: 'result', subtype: 'success', is_error: true, terminal_reason: 'blocking_limit' });
    const state = foldSessionState(emitted);
    const row = state.items.find((item) => item.kind === 'error');
    expect(row?.kind === 'error' ? row.limit : undefined).toEqual({ window: 'session', resetsAt });
    expect(state.limits?.[0]?.usedPercent).toBe(100);
  });
  it('billing failures carry their own code and cannot retry (ONL-2454)', () => {
    for (const failure of [
      { api_error_status: 402 },
      { result: "API Error: 402 This request's maximum cost exceeds your available credits" },
      { errors: ['Your credit balance is too low to access the Anthropic API.'] },
      { assistantError: 'billing_error' },
    ]) {
      const { log, emitted } = makeLog();
      log.push({ type: 'turn.started', turnId: 't1' });
      log.push({ type: 'message.user', turnId: 't1', text: 'Build the landing page' });
      if (failure.assistantError) handleSdkMessage(log, { type: 'assistant', error: failure.assistantError });
      handleSdkMessage(log, { type: 'result', subtype: 'success', is_error: true, terminal_reason: 'api_error', ...failure });
      const row = foldSessionState(emitted).items.find((item) => item.kind === 'error');
      expect(row?.kind === 'error' ? row.code : undefined).toBe('billing_error');
      expect(row?.kind === 'error' ? row.retry : undefined).toBeUndefined();
    }
  });
  const failure = (
    msg: Record<string, unknown>,
  ): { code?: string; status: number | null | undefined } => {
    const { log } = makeLog();
    let code: string | undefined;
    let status: number | null | undefined;
    handleSdkMessage(log, { type: 'result', is_error: true, ...msg }, {
      onError: (c, s) => {
        code = c;
        status = s;
      },
    });
    return { code, status };
  };

  it('names an API error instead of reporting unknown, and carries its status', () => {
    // No auth text, so the classifier has nothing and the terminal reason decides.
    expect(failure({ subtype: 'success', terminal_reason: 'api_error', api_error_status: 429 })).toEqual({
      code: 'api_error',
      status: 429,
    });
  });

  it('keeps a prompt-length failure distinct from an API error', () => {
    expect(failure({ subtype: 'success', terminal_reason: 'prompt_too_long' }).code).toBe('prompt_too_long');
  });

  it('names our own hook rather than blaming the provider', () => {
    expect(failure({ subtype: 'success', terminal_reason: 'hook_stopped' }).code).toBe('hook_stopped');
    expect(failure({ subtype: 'success', terminal_reason: 'stop_hook_prevented' }).code).toBe('hook_stopped');
  });

  it('reads the error subtypes, which carry no result string at all', () => {
    // The old derivation short-circuited on the missing string and reported unknown for all four.
    expect(failure({ subtype: 'error_max_turns' }).code).toBe('max_turns');
    expect(failure({ subtype: 'error_max_budget_usd' }).code).toBe('max_budget');
    expect(failure({ subtype: 'error_max_structured_output_retries' }).code).toBe('tool_use_failed');
  });

  it('reports a null status on an error-subtype failure, where the field is not declared', () => {
    expect(failure({ subtype: 'error_max_turns' }).status).toBeNull();
  });

  it('leaves the rate-limit reasons and the auth text exactly as they were', () => {
    expect(failure({ subtype: 'success', terminal_reason: 'blocking_limit' }).code).toBe('rate_limited');
    expect(failure({ subtype: 'success', terminal_reason: 'budget_exhausted' }).code).toBe('rate_limited');
    // The classifier stays ahead of the map: this code is what raises the no-connection surface (ONL-2080).
    expect(
      failure({
        subtype: 'success',
        terminal_reason: 'api_error',
        result: 'Not logged in · Please run /login',
      }).code,
    ).toBe('unauthenticated');
  });

  it('still reports unknown when nothing structured and no string names the failure', () => {
    expect(failure({ subtype: 'error_during_execution' }).code).toBe('unknown');
  });
});

describe('the reason a failed turn names reaches the row, not only telemetry (ONL-2495)', () => {
  const failedTurn = (result: Record<string, unknown>): StudioEvent[] => {
    const { log, emitted } = makeLog();
    log.beginTurn();
    log.push({ type: 'turn.started', turnId: log.turnId });
    log.push({ type: 'message.user', turnId: log.turnId, text: 'x'.repeat(10_000) });
    handleSdkMessage(log, { type: 'result', is_error: true, ...result });
    return emitted;
  };

  const errorRow = (result: Record<string, unknown>) => {
    const row = foldSessionState(failedTurn(result)).items.find((item) => item.kind === 'error');
    if (row?.kind !== 'error') throw new Error('no error row');
    return row;
  };

  it('carries the API status onto the row, so the reader is told which failure it was', () => {
    const row = errorRow({ subtype: 'success', terminal_reason: 'api_error', api_error_status: 529 });
    expect(row.code).toBe('api_error');
    expect(row.apiErrorStatus).toBe(529);
  });

  it('leaves the status absent where the SDK declares none, rather than inventing a zero', () => {
    expect(errorRow({ subtype: 'error_max_turns' }).apiErrorStatus).toBeUndefined();
  });

  it('never shows the SDK’s own subtype token as the message a user reads', () => {
    expect(errorRow({ subtype: 'error_during_execution' }).message).toBe('');
  });

  // The error subtypes declare no `result` at all, so `errors` is the only prose they can carry.
  it('reads the error subtypes’ own prose array, which is where their text actually lives', () => {
    const row = errorRow({ subtype: 'error_during_execution', errors: ['the worker exited before the first reply'] });
    expect(row.message).toBe('the worker exited before the first reply');
  });

  it('joins several reported errors rather than showing the first', () => {
    expect(errorRow({ subtype: 'error_during_execution', errors: ['first', 'second'] }).message).toBe('first\nsecond');
  });

  it('keeps the result string ahead of the array, so a success-shaped failure is unchanged', () => {
    const row = errorRow({ subtype: 'success', terminal_reason: 'api_error', result: 'API Error: 529', errors: ['ignored'] });
    expect(row.message).toBe('API Error: 529');
  });

  it('stays empty when the array carries nothing usable', () => {
    expect(errorRow({ subtype: 'error_during_execution', errors: [] }).message).toBe('');
    expect(errorRow({ subtype: 'error_during_execution', errors: ['   '] }).message).toBe('');
  });

  it('keeps the provider’s prose when the result carries any', () => {
    expect(
      errorRow({ subtype: 'success', terminal_reason: 'api_error', result: 'API Error: overloaded' }).message,
    ).toBe('API Error: overloaded');
  });
});

const retry = (over: Record<string, unknown>): Record<string, unknown> => ({
  type: 'system',
  subtype: 'api_retry',
  attempt: 1,
  max_retries: 5,
  retry_delay_ms: 100,
  error_status: 529,
  error: 'overloaded',
  ...over,
});

describe('the retry message the reducer used to drop (ONL-2463)', () => {
  const turnAfter = (
    frames: Record<string, unknown>[],
  ): { summary: Record<string, unknown>; emitted: StudioEvent[] } => {
    const { log, emitted } = makeLog();
    log.beginTurn();
    let summary: Record<string, unknown> = {};
    for (const frame of frames) handleSdkMessage(log, frame);
    handleSdkMessage(log, { type: 'result', subtype: 'success' }, {
      onTurnEnded: (s) => {
        summary = s as unknown as Record<string, unknown>;
      },
    });
    return { summary, emitted };
  };

  const retriesIn = (emitted: StudioEvent[]): Extract<StudioEvent, { type: 'session.retrying' }>[] =>
    emitted.filter((e): e is Extract<StudioEvent, { type: 'session.retrying' }> => e.type === 'session.retrying');

  it('rolls the attempts up once per turn for telemetry', () => {
    const { summary } = turnAfter([retry({ attempt: 1 }), retry({ attempt: 2, error_status: 500 })]);
    expect(summary['retryAttempts']).toBe(2);
    expect(summary['retryLastStatus']).toBe(500);
    expect(summary['retryErrorKind']).toBe('overloaded');
  });

  it('makes a turn that retried and then succeeded visible', () => {
    const { summary } = turnAfter([retry({})]);
    expect(summary['retryAttempts']).toBe(1);
  });

  it('reports no attempts on a turn that never retried', () => {
    const { summary, emitted } = turnAfter([]);
    expect(summary['retryAttempts']).toBe(0);
    expect(summary['retryLastStatus']).toBeNull();
    expect(retriesIn(emitted)).toEqual([]);
  });

  it('reports a null status for a connection error that had no HTTP response', () => {
    const { summary } = turnAfter([retry({ error_status: null, no_response: { waited_ms: 1, retry_wait_ms: 1 } })]);
    expect(summary['retryLastStatus']).toBeNull();
  });

  it('drops a kind outside the declared set rather than shipping it', () => {
    const { summary } = turnAfter([retry({ error: 'something-the-provider-invented' })]);
    expect(summary['retryErrorKind']).toBeUndefined();
    expect(JSON.stringify(summary)).not.toContain('something-the-provider-invented');
  });

  it('no longer counts the retry message as unmapped drift', () => {
    const { log } = makeLog();
    handleSdkMessage(log, retry({}));
    expect([...log.unmappedTypes.keys()]).toEqual([]);
  });

  it('pushes one event the chat can see per failed attempt (ONL-2491)', () => {
    const { emitted } = turnAfter([retry({ attempt: 1 })]);
    const [pushed, ...rest] = retriesIn(emitted);
    expect(rest).toEqual([]);
    expect(pushed?.attempt).toBe(1);
    expect(pushed?.status).toBe(529);
    expect(pushed?.kind).toBe('overloaded');
  });

  it('pushes one event per attempt while the roll-up stays one per turn (ONL-2491)', () => {
    const { summary, emitted } = turnAfter([
      retry({ attempt: 1 }),
      retry({ attempt: 2 }),
      retry({ attempt: 3, error_status: 500 }),
    ]);

    expect(retriesIn(emitted).map((e) => e.attempt)).toEqual([1, 2, 3]);
    expect(summary['retryAttempts']).toBe(3);
  });

  it('pushes no kind at all for an undeclared one, rather than inventing one (ONL-2491)', () => {
    const { emitted } = turnAfter([retry({ error: 'something-the-provider-invented' })]);
    const [pushed] = retriesIn(emitted);
    expect(pushed?.kind).toBeUndefined();
    expect(JSON.stringify({ ...pushed, raw: undefined })).not.toContain('something-the-provider-invented');
  });

  it('pushes a null status for the no-response cause (ONL-2491)', () => {
    const { emitted } = turnAfter([
      retry({ error: 'unknown', error_status: null, no_response: { waited_ms: 30_000, retry_wait_ms: 30_000 } }),
    ]);

    expect(retriesIn(emitted)[0]?.status).toBeNull();
  });

  it('keeps the credential fact after a later attempt overwrote the kind (ONL-2491)', () => {
    const { log } = makeLog();
    handleSdkMessage(log, retry({ error: 'cloud_credential_error', error_status: 403 }));
    handleSdkMessage(log, retry({ attempt: 2, error: 'server_error', error_status: 500 }));

    expect(retryWasCredentialShaped(log)).toBe(true);
  });

  it('holds only the cloud kind across the storm, never a 401 one attempt saw (ONL-2491)', () => {
    const { log: cloud } = makeLog();
    handleSdkMessage(cloud, retry({ error: 'cloud_credential_error', error_status: 403 }));
    expect(retryWasCredentialShaped(cloud)).toBe(true);

    // A 401 is read at the result, against the attempt that produced it, so it is not carried.
    const { log: unauthorized } = makeLog();
    handleSdkMessage(unauthorized, retry({ error: 'authentication_failed', error_status: 401 }));
    expect(retryWasCredentialShaped(unauthorized)).toBe(false);

    const { log: overloaded } = makeLog();
    handleSdkMessage(overloaded, retry({ error: 'server_error', error_status: 500 }));
    expect(retryWasCredentialShaped(overloaded)).toBe(false);
  });

  it('leaves the credential flag out of the turn-end summary (ONL-2491)', () => {
    const { summary } = turnAfter([retry({ error: 'cloud_credential_error', error_status: 403 })]);
    expect(summary['retryCredential']).toBeUndefined();
    expect(summary['credential']).toBeUndefined();
  });

  it('folds a storm into a live turn that renders no row and no error (ONL-2491)', () => {
    const { log, emitted } = makeLog();
    log.beginTurn();
    log.push({ type: 'turn.started', turnId: log.turnId });
    handleSdkMessage(log, retry({ attempt: 1 }));
    handleSdkMessage(log, retry({ attempt: 2, error_status: 500 }));

    const state = foldSessionState(emitted);
    expect(state.retrying).toEqual({ attempt: 2, status: 500, kind: 'overloaded' });
    expect(state.items).toEqual([]);
    expect(state.error).toBeUndefined();
    expect(state.isStreaming).toBe(true);
    expect(state.unknownEventTypes).toBeUndefined();
  });
});

describe('a credential the provider refused (ONL-2491)', () => {
  const REFUSAL = 'The security token included in the request is invalid (invalid api key)';

  /** The kind rides the assistant message before the failing result; the status rides the result. */
  const assistant = (error: string): Record<string, unknown> => ({
    type: 'assistant',
    error,
    message: { model: 'claude-opus-5', content: [] },
  });

  const turn = (
    frames: Record<string, unknown>[],
    result: Record<string, unknown>,
  ): { code?: string; status?: number | null; raised: unknown[]; emitted: StudioEvent[] } => {
    const { log, emitted } = makeLog();
    log.beginTurn();
    log.push({ type: 'turn.started', turnId: log.turnId });
    log.push({ type: 'message.user', turnId: log.turnId, text: 'make the header blue' });
    let code: string | undefined;
    let status: number | null | undefined;
    const raised: unknown[] = [];
    for (const frame of frames) handleSdkMessage(log, frame);
    handleSdkMessage(
      log,
      { type: 'result', subtype: 'success', is_error: true, result: REFUSAL, ...result },
      {
        onError: (c, s) => {
          code = c;
          status = s;
        },
        onConnection: (connection) => raised.push(connection),
      },
    );
    return { code, status, raised, emitted };
  };

  it('codes a cloud credential error at any status, including none at all', () => {
    expect(turn([assistant('cloud_credential_error')], {}).code).toBe('credential_rejected');
    expect(
      turn([assistant('cloud_credential_error')], { api_error_status: 500 }).code,
    ).toBe('credential_rejected');
  });

  it('codes an authentication failure that carries a 401 or a 403', () => {
    expect(
      turn([assistant('authentication_failed')], { api_error_status: 403 }).code,
    ).toBe('credential_rejected');
    expect(
      turn([assistant('authentication_failed')], { api_error_status: 401 }).code,
    ).toBe('credential_rejected');
  });

  it('leaves an authentication failure with no status as the sign-out it has always been (ONL-2080)', () => {
    const signedOut = turn([assistant('authentication_failed')], {
      result: 'Not logged in · Please run /login',
    });
    expect(signedOut.code).toBe('unauthenticated');
    expect(signedOut.raised).toEqual([
      { status: 'unauthenticated', detail: 'Not logged in · Please run /login', harness: 'claude' },
    ]);
  });

  it('decides ahead of the text classifier, which claims `invalid api key` for sign-in', () => {
    // The same prose alone still reads as a sign-out, which is what the structured fields overrule.
    expect(turn([], {}).code).toBe('unauthenticated');
    expect(
      turn([assistant('authentication_failed')], { api_error_status: 403 }).code,
    ).toBe('credential_rejected');
  });

  it('holds the verdict a storm opened with after a later attempt overwrote the kind', () => {
    const stormed = turn(
      [
        retry({ error: 'cloud_credential_error', error_status: 403 }),
        retry({ attempt: 2, error: 'server_error', error_status: 500 }),
      ],
      { terminal_reason: 'api_error', api_error_status: 500 },
    );
    expect(stormed.code).toBe('credential_rejected');
  });

  it('drops the verdict once a request comes back clean, so a later cap is not a refusal (ONL-2491)', () => {
    const recovered = turn(
      [
        retry({ error: 'cloud_credential_error', error_status: 403 }),
        { type: 'assistant', message: { model: 'claude-opus-5', content: [] } },
      ],
      { subtype: 'error_max_turns', result: 'Reached the turn limit' },
    );
    expect(recovered.code).not.toBe('credential_rejected');

    // The same recovery clears a refusal the assistant message itself reported.
    const afterRefusal = turn(
      [
        assistant('cloud_credential_error'),
        { type: 'assistant', message: { model: 'claude-opus-5', content: [] } },
      ],
      { terminal_reason: 'api_error', api_error_status: 529 },
    );
    expect(afterRefusal.code).not.toBe('credential_rejected');
  });

  it('raises no connection, so no sign-in card is mounted over a card that cannot fix it', () => {
    const refused = turn([assistant('cloud_credential_error')], { api_error_status: 403 });
    expect(refused.raised).toEqual([]);
  });

  it('keeps the row, carrying the provider’s own message and offering no retry', () => {
    const refused = turn([assistant('cloud_credential_error')], { api_error_status: 403 });
    const state = foldSessionState(refused.emitted);
    const rows = state.items.filter((i) => i.kind === 'error');
    expect(rows).toHaveLength(1);
    if (rows[0]?.kind !== 'error') throw new Error('shape');
    expect(rows[0].message).toBe(REFUSAL);
    expect(rows[0].code).toBe('credential_rejected');
    expect(state.failedTurn?.code).toBe('credential_rejected');
  });

  it('reports the code and the status through the error telemetry unchanged in shape', () => {
    const refused = turn([assistant('authentication_failed')], { api_error_status: 401 });
    expect(refused).toMatchObject({ code: 'credential_rejected', status: 401 });
  });

  it('spends the kind on its own turn rather than coding the next one', () => {
    const { log } = makeLog();
    handleSdkMessage(log, assistant('cloud_credential_error'));
    handleSdkMessage(log, { type: 'result', subtype: 'success', is_error: true, result: REFUSAL });

    let later: string | undefined;
    handleSdkMessage(
      log,
      { type: 'result', subtype: 'success', is_error: true, result: 'fetch failed' },
      { onError: (code) => { later = code; } },
    );
    expect(later).toBe('unknown');
  });

  it('forgets a storm the turn abandoned, so the next turn is not coded by it', () => {
    const { log } = makeLog();
    log.beginTurn();
    handleSdkMessage(log, retry({ error: 'cloud_credential_error', error_status: 403 }));
    expect(retryWasCredentialShaped(log)).toBe(true);

    // The pump throws before any `result`, which is the one path that drains this.
    forgetTurnState(log);
    expect(retryWasCredentialShaped(log)).toBe(false);

    log.beginTurn();
    let later: string | undefined;
    handleSdkMessage(
      log,
      { type: 'result', subtype: 'success', is_error: true, result: 'fetch failed' },
      { onError: (code) => { later = code; } },
    );
    expect(later).toBe('unknown');
  });

  it('keeps a 401 seen only mid-storm from overruling the sign-out the result reports', () => {
    const stormed = turn(
      [retry({ error: 'authentication_failed', error_status: 401 })],
      { result: 'Not logged in · Please run /login' },
    );
    expect(stormed.code).toBe('unauthenticated');
  });
});

describe('a turn that ends while a question is still parked (ONL-2295)', () => {
  it('banks the open wait into the row and the tally, rather than reporting none', () => {
    const { log, emitted } = makeLog();
    const summaries: { waitedMs: number }[] = [];
    log.beginTurn();
    // Parked in the past, so the wait is a real interval without steering the clock.
    log.parkQuestion(Date.now() - 90_000);

    handleSdkMessage(log, { type: 'result', subtype: 'success', duration_ms: 120_000 }, {
      onTurnEnded: (summary) => summaries.push(summary),
    });

    const [ended] = emitted.filter((e) => e.type === 'turn.ended');
    if (ended?.type !== 'turn.ended') throw new Error('shape');
    expect(ended.waitedMs).toBeGreaterThanOrEqual(90_000);
    expect(summaries[0]?.waitedMs).toBeGreaterThanOrEqual(90_000);
    // The anchor is cleared with it: the next turn must not open already paused.
    expect(log.questionParkedSince).toBeUndefined();
  });

  it('reports a zero wait for a turn that never asked', () => {
    const { log, emitted } = makeLog();
    log.beginTurn();

    handleSdkMessage(log, { type: 'result', subtype: 'success', duration_ms: 1_000 }, {});

    const [ended] = emitted.filter((e) => e.type === 'turn.ended');
    if (ended?.type !== 'turn.ended') throw new Error('shape');
    expect(ended.waitedMs).toBe(0);
  });
});

describe('the options a permission card offers (ONL-2562, ONL-2190)', () => {
  const kinds = (always: { oneRequest: boolean; covers?: string } | undefined): string[] =>
    permissionOptions('Bash', always).map((option) => option.kind);
  const always = (grant: { oneRequest: boolean; covers?: string }): string | undefined =>
    permissionOptions('Bash', grant).find((o) => o.kind === 'allow_always')?.label;

  it('offers no persistent row without a grant behind it', () => {
    expect(kinds(undefined)).toEqual(['allow_once', 'reject_once']);
    expect(kinds({ oneRequest: true })).toEqual(['allow_once', 'allow_always', 'reject_once']);
  });

  it('names what the rule covers, so the row is never vaguer than the grant', () => {
    expect(always({ oneRequest: true, covers: 'git push' })).toBe(
      t('chat.permission.alwaysAllowCovers', { target: 'git push' }),
    );
  });

  it('names the tool only when the grant reaches the whole tool', () => {
    expect(always({ oneRequest: true })).toBe(t('chat.permission.alwaysAllowRequest'));
    expect(always({ oneRequest: false })).toBe(
      t('chat.permission.alwaysAllowTool', { tool: 'Bash' }),
    );
  });

  it('falls back to the unnamed wording when the request carries no display name', () => {
    expect(permissionOptions(undefined, { oneRequest: false }).at(1)?.label).toBe(
      t('chat.permission.alwaysAllow'),
    );
  });
});
