import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ToolCallView } from '@studio/events';
import { ToolCalls } from './ToolCalls.js';
import type { ChatStrings } from './strings.js';
import { TOOL_LINE_IDS, type ToolLineStrings } from './tool-rows/lines.js';

const asked = [{ question: 'Which fix?', header: 'Fix', options: [{ label: 'Skip scripts', description: '' }] }];
const toolLines = Object.fromEntries(TOOL_LINE_IDS.map((id) => [id, { running: id, done: id }])) as ToolLineStrings;
const strings = {
  toolVerbs: new Proxy({}, { get: () => ({ running: 'x', done: 'x' }) }),
  toolRows: new Proxy({}, { get: () => 'x' }),
  toolLines,
  questionSheet: { next: 'Next', send: 'Send', dismiss: 'Dismiss', step: '{at} of {total}', ownWords: 'Own words', dismissedOne: 'Question dismissed', dismissedMany: 'Questions dismissed' },
} as unknown as ChatStrings;

function call(toolCallId: string, name: string, extra: Partial<ToolCallView> = {}): ToolCallView {
  return { toolCallId, name, kind: 'other', title: name, status: 'completed', displayStatus: 'completed', startedAt: 0, ...extra };
}

const lookedOver = call('after', 'mcp__studio__list_frames');

function draw(calls: ToolCallView[]): string {
  return renderToStaticMarkup(<ToolCalls calls={calls} strings={strings} chevronIcon={() => <span />} onRespond={() => {}} />);
}

function sitsAbove(markup: string, record: string): boolean {
  const at = markup.indexOf(`data-testid="${record}"`);
  const row = markup.indexOf('data-testid="tool-row"');
  return at !== -1 && row !== -1 && at < row;
}

describe('a settled question sits where it was asked, above the tools that ran after it', () => {
  const answered = call('ask', 'AskUserQuestion', { answeredQuestions: { questions: asked, answers: { 'Which fix?': 'Skip scripts' } } });

  it('an answer', () => {
    expect(sitsAbove(draw([answered, lookedOver]), 'question-answered')).toBe(true);
  });

  it('a dismissal', () => {
    const dismissed = call('ask', 'AskUserQuestion', { status: 'canceled', displayStatus: 'canceled', dismissedQuestions: asked });
    expect(sitsAbove(draw([dismissed, lookedOver]), 'question-dismissed')).toBe(true);
  });
});
