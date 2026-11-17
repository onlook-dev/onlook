import { describe, expect, test } from 'bun:test';
import type { ToolCallView } from '@studio/events';
import { handleFor, legendFor, subjectRowFor } from './ToolApproval.js';
import { TOOL_LINE_IDS, type ToolLineStrings } from './tool-rows/lines.js';

const LINES = { strings: Object.fromEntries(TOOL_LINE_IDS.map((id) => [id, { running: id, done: id }])) as ToolLineStrings, nameOf: () => undefined };
const VERBS = Object.fromEntries(
  ['read', 'write', 'edit', 'search', 'find', 'run', 'fetch', 'searchWeb', 'use', 'rename'].map((v) => [v, { running: v, done: v }]),
) as unknown as Parameters<typeof subjectRowFor>[2];

function call(withQuestions: boolean): ToolCallView {
  return {
    toolCallId: 'call-1',
    name: 'AskUserQuestion',
    kind: 'other',
    title: 'Using',
    target: 'thing',
    status: 'pending',
    displayStatus: 'awaiting_approval',
    startedAt: 0,
    permission: {
      requestId: 'req-1',
      options: [
        { optionId: 'allow', label: 'Approve', kind: 'allow_once' },
        { optionId: 'deny', label: 'Deny', kind: 'reject_once' },
      ],
      ...(withQuestions
        ? {
            questions: [
              {
                question: 'Which accent color?',
                header: 'Accent',
                options: [
                  { label: 'Blue', description: 'Cool' },
                  { label: 'Red', description: 'Warm' },
                ],
              },
            ],
          }
        : {}),
    },
  };
}

function permissionOf(view: ToolCallView): NonNullable<ToolCallView['permission']> {
  if (view.permission === undefined) throw new Error('fixture has no permission');
  return view.permission;
}

describe('ToolApproval legend (ONL-2292)', () => {
  test('a real permission request takes the approval legend', () => {
    expect(legendFor(permissionOf(call(false)))).toBe('toolAwaitingApproval');
  });

  test('a question request takes the question legend, not the approval one', () => {
    expect(legendFor(permissionOf(call(true)))).toBe('toolAwaitingAnswer');
  });
});

test('MCP approval shows the requested arguments before consent (ONL-3087)', () => {
  const connector: ToolCallView = {
    ...call(false), name: 'mcp__figma__import_designs', title: 'Figma', target: 'import designs',
    input: { server: 'Figma', tool: 'import_designs', arguments: { page: 'Brand' } },
  };
  expect(subjectRowFor(connector, LINES, VERBS)).toMatchObject({
    detail: { kind: 'raw', text: '{\n  "page": "Brand"\n}' }, defaultOpen: true,
  });
});

describe('ToolApproval shell subject (ONL-2285)', () => {
  const command = 'git log --oneline origin/main..HEAD && git push -u origin wren/push-branch';
  const bash = (input: unknown): ToolCallView => ({ ...call(false), name: 'Bash', title: 'Bash', target: command, input });

  test('a chained command shows in full, open, before Approve — the push is not hidden behind its first half', () => {
    const row = subjectRowFor(bash({ command, description: 'Push branch to origin with upstream' }), LINES, VERBS);
    expect(row.detail).toEqual({ kind: 'shell', command });
    expect(row.defaultOpen).toBe(true);
    expect(row.target).toBe('Push branch to origin with upstream');
  });

  test('with no description the command still shows in full', () => {
    const row = subjectRowFor(bash({ command }), LINES, VERBS);
    expect(row.detail).toEqual({ kind: 'shell', command });
    expect(row.defaultOpen).toBe(true);
  });

  test('a non-shell request opens nothing', () => {
    const row = subjectRowFor(call(false), LINES, VERBS);
    expect(row.detail).toBeUndefined();
    expect(row.defaultOpen).toBeUndefined();
  });
});

describe('ToolApproval action handles (ONL-2562)', () => {
  test('each kind answers to its own handle, so no two buttons share one', () => {
    const handles = (['allow_once', 'allow_always', 'reject_once'] as const).map((kind) =>
      handleFor({ optionId: kind, label: kind, kind }),
    );
    expect(new Set(handles).size).toBe(handles.length);
    expect(handles).toEqual(['permission-allow', 'permission-allow-always', 'permission-deny']);
  });
});
