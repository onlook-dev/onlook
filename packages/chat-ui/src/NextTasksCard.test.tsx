import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextTasksCard, type NextTasksCardProps } from './NextTasksCard.js';
import type { NextTasksState } from './nextTasks.js';

const TASKS = [
  { title: 'Rewrite the subhead', line: 'Match the warmer headline above it.' },
  { title: 'Show it on mobile' },
  { title: 'Try two heroes', line: 'One with a photo, one without.' },
];
const count = (html: string, testId: string): number => html.split(`data-testid="${testId}"`).length - 1;

function draw(state: NextTasksState, picked: number | null, extra: Partial<NextTasksCardProps> = {}): string {
  return renderToStaticMarkup(
    <NextTasksCard card={{ toolCallId: 's1', tasks: TASKS, state }} label="Suggested next tasks" picked={picked} {...extra} />,
  );
}
const rows = (html: string): string[] => [...html.matchAll(/data-task-state="(\w+)"/g)].map((match) => match[1]!);

describe('the next-tasks card (ONL-2977)', () => {
  it('draws no Confirm: a tap sends the task', () => {
    expect(rows(draw({ kind: 'open' }, null))).toEqual(['open', 'open', 'open']);
    expect(count(draw({ kind: 'open' }, 1), 'next-task-confirm')).toBe(0);
  });

  it('once sent, keeps only the chosen task', () => {
    const html = draw({ kind: 'sent', index: 2 }, 0);
    expect(rows(html)).toEqual(['chosen']);
  });

  it('names the group for a screen reader only', () => {
    const html = renderToStaticMarkup(
      <NextTasksCard card={{ toolCallId: 's1', tasks: TASKS, state: { kind: 'open' } }} label="Suggested next tasks" picked={null} />,
    );
    expect(html).toContain('aria-label="Suggested next tasks"');
    expect(html.replace(/aria-label="[^"]*"/g, '')).not.toContain('Suggested next tasks');
  });

  it('draws the host’s picture inside each task it shows, open and sent', () => {
    const picture = (_task: unknown, index: number) => <span data-testid="picture-probe" data-index={index} />;
    const open = draw({ kind: 'open' }, null, { picture });
    expect(count(open, 'picture-probe')).toBe(3);
    const sent = draw({ kind: 'sent', index: 1 }, null, { picture });
    expect([...sent.matchAll(/data-index="(\d)"/g)].map((match) => match[1])).toEqual(['1']);
    expect(sent.indexOf('data-testid="picture-probe"')).toBeGreaterThan(sent.indexOf('data-testid="next-task"'));
  });
});

describe('a task’s line (ONL-2977)', () => {
  it('sits under its title on the pick card, only where the agent wrote one', () => {
    expect(count(draw({ kind: 'open' }, null), 'next-task-line')).toBe(2);
  });
});
