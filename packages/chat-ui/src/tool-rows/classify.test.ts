import { describe, expect, it } from 'bun:test';
import type { ToolCallView } from '@studio/events';
import { classifyToolCalls, groupStatus, rowStatus } from './classify.js';
import { TOOL_LINE_IDS, type ToolLineStrings } from './lines.js';

function call(
  displayStatus: ToolCallView['displayStatus'],
  name = 'Bash',
  extra: Partial<ToolCallView> = {},
): ToolCallView {
  return {
    toolCallId: `t-${name}-${displayStatus}-${String(Math.random()).slice(2, 8)}`,
    name,
    kind: 'execute',
    title: name,
    status: displayStatus === 'awaiting_approval' ? 'pending' : displayStatus,
    displayStatus,
    startedAt: 0,
    ...extra,
  };
}

describe('rowStatus', () => {
  it('reads a canceled call as canceled, not completed', () => {
    expect(rowStatus(call('canceled'))).toBe('canceled');
  });

  it('keeps failed and denied on the error arm (inverse)', () => {
    expect(rowStatus(call('failed'))).toBe('error');
    expect(rowStatus(call('denied'))).toBe('error');
  });

  it('keeps completed on completed, and every unsettled state on running', () => {
    expect(rowStatus(call('completed'))).toBe('completed');
    expect(rowStatus(call('pending'))).toBe('running');
    expect(rowStatus(call('in_progress'))).toBe('running');
    expect(rowStatus(call('awaiting_approval'))).toBe('running');
  });
});

describe('groupStatus', () => {
  it('is as settled as its saddest member: running › error › canceled › completed', () => {
    expect(groupStatus([call('completed'), call('canceled')])).toBe('canceled');
    expect(groupStatus([call('failed'), call('canceled')])).toBe('error');
    expect(groupStatus([call('in_progress'), call('failed'), call('canceled')])).toBe('running');
    expect(groupStatus([call('completed'), call('completed')])).toBe('completed');
  });
});

const lines = { strings: Object.fromEntries(TOOL_LINE_IDS.map((id) => [id, { running: id, done: id }])) as ToolLineStrings, nameOf: () => undefined };

describe('classifyToolCalls', () => {
  it('carries canceled through to a single row and a grouped file run', () => {
    const single = classifyToolCalls([call('canceled', 'Bash', { input: { command: 'bun test' } })], lines);
    expect(single[0]).toMatchObject({ status: 'canceled' });

    const files = ['a.ts', 'b.ts'].map((path) =>
      call('completed', 'Read', { input: { file_path: `src/${path}` } }),
    );
    files.push(call('canceled', 'Read', { input: { file_path: 'src/c.ts' } }));
    const grouped = classifyToolCalls(files, lines);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]).toMatchObject({ kind: 'grouped-files', status: 'canceled' });
  });
});

describe('a question in a run of tools', () => {
  const asked = [{ question: 'Which fix?', header: 'Fix', options: [{ label: 'Skip scripts', description: '' }] }];
  const question = (extra: Partial<ToolCallView>): ToolCallView => call('completed', 'AskUserQuestion', { kind: 'other', ...extra });

  it('takes its place in call order and splits the commands on either side of it', () => {
    const before = call('completed');
    const answered = question({ answeredQuestions: { questions: asked, answers: { 'Which fix?': 'Skip scripts' } } });
    const after = call('completed');
    const nodes = classifyToolCalls([before, answered, after], lines);
    expect(nodes.map((node) => [node.kind, node.key])).toEqual([
      ['row', before.toolCallId],
      ['answered', answered.toolCallId],
      ['row', after.toolCallId],
    ]);
  });

  it('does the same for a dismissed question', () => {
    const before = call('completed');
    const dismissed = question({ displayStatus: 'canceled', status: 'canceled', dismissedQuestions: asked });
    const after = call('completed');
    expect(classifyToolCalls([before, dismissed, after], lines).map((node) => node.kind)).toEqual(['row', 'dismissed', 'row']);
  });
});
