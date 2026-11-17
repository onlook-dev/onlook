import { describe, expect, test } from 'bun:test';
import { nextTaskPicturesLine, SUGGEST_NEXT_TASKS_TOOL, type ToolCallView, type TranscriptItem } from '@studio/events';
import { isAwaitingPictures, isOfferingNextTasks, nextTaskRows, nextTasksOf, placeNextTasks, placeSentTasks } from './nextTasks.js';

const TASKS = ['Rewrite the subhead to match', 'Show the page on mobile', 'Try two versions of the hero'];
const TITLED = TASKS.map((title) => ({ title }));

function offer(id: string, input: unknown = { tasks: TASKS }, extra: Partial<ToolCallView> = {}): ToolCallView {
  return { toolCallId: id, name: SUGGEST_NEXT_TASKS_TOOL, kind: 'other', title: 'Suggest next tasks', status: 'completed', displayStatus: 'completed', startedAt: 0, input, ...extra };
}
const edit: ToolCallView = { toolCallId: 'e1', name: 'Edit', kind: 'edit', title: 'Edit', status: 'completed', displayStatus: 'completed', startedAt: 0 };
const user = (id: string, text: string, origin?: 'user' | 'studio' | 'suggestion'): TranscriptItem => ({ kind: 'user', id, text, ...(origin ? { origin } : {}) });
const reply = (id: string): TranscriptItem => ({ kind: 'assistant-text', id, text: 'Done.', isStreaming: false });
const tools = (id: string, ...calls: ToolCallView[]): TranscriptItem => ({ kind: 'tools', id, calls });

const EDITED: TranscriptItem[] = [user('u1', 'Make the headline warmer'), tools('g1', edit), reply('a1'), tools('g2', offer('s1'))];

describe('where a next-tasks card sits and what it lets the designer do (ONL-2899)', () => {
  test('sits in the turn’s last reply, open to a tap once the turn has ended', () => {
    expect(placeNextTasks(EDITED, false)).toEqual(new Map([['a1', { toolCallId: 's1', tasks: TITLED, state: { kind: 'open' } }]]));
  });

  test('is not shown while the turn is still running, so it never sits above a reply still to come', () => {
    const midTurn = [user('u1', 'Make it warmer'), reply('a0'), tools('g1', edit, offer('s1'))];
    expect([...placeNextTasks(midTurn, true).values()].map((card) => card.state)).toEqual([{ kind: 'waiting' }]);
    expect([...placeNextTasks([...midTurn, reply('a2')], false)]).toEqual([['a2', { toolCallId: 's1', tasks: TITLED, state: { kind: 'open' } }]]);
  });

  test('sits in the reply even when the agent wrote it after the call', () => {
    const items = [user('u1', 'Make it warmer'), tools('g2', offer('s1')), reply('a2')];
    expect([...placeNextTasks(items, false).keys()]).toEqual(['a2']);
  });

  test('reads codex’s call, its arguments a JSON string, and draws nothing an older transcript’s intro carried (ONL-2959)', () => {
    const codex = [user('u1', 'Make it warmer'), reply('a1'), tools('g2', offer('s1', { arguments: JSON.stringify({ tasks: TASKS, intro: 'Try one.' }) }))];
    expect(placeNextTasks(codex, false)).toStrictEqual(new Map([['a1', { toolCallId: 's1', tasks: TITLED, state: { kind: 'open' } }]]));
  });

  test('sits where the call was when other tools ran after the turn’s last reply, not above them in that reply', () => {
    const capture: ToolCallView = { ...edit, toolCallId: 'c1', name: 'capture_frame', kind: 'other', title: 'Capture frame' };
    const apart = [user('u1', 'Look at this'), reply('a0'), tools('g1', capture), tools('g2', offer('s1'))];
    expect([...placeNextTasks(apart, false).keys()]).toEqual(['g2']);
    const together = [user('u1', 'Look at this'), reply('a0'), tools('g1', capture, offer('s1'))];
    expect([...placeNextTasks(together, false).keys()]).toEqual(['g1']);
    expect(placeSentTasks([...apart, user('u2', 'Show the page on mobile', 'suggestion')], false).get('u2')?.reply).toBeUndefined();
  });

  test('sits where the call was when the turn wrote no reply', () => {
    const items = [user('u1', 'Make it warmer'), tools('g2', offer('s1'))];
    expect([...placeNextTasks(items, false).keys()]).toEqual(['g2']);
  });

  test('a tap marks the task it sent and stays in its turn', () => {
    const items = [...EDITED, user('u2', 'Show the page on mobile', 'suggestion'), reply('a3')];
    expect(placeNextTasks(items, false)).toEqual(new Map([['a1', { toolCallId: 's1', tasks: TITLED, state: { kind: 'sent', index: 1 } }]]));
  });

  test('a sent card is also found by the suggestion row that sent it, with the reply that offered it, and an unsent one is not (ONL-2901)', () => {
    const items = [...EDITED, user('u2', 'Show the page on mobile', 'suggestion'), reply('a3')];
    expect(placeSentTasks(items, false)).toEqual(new Map([['u2', { card: { toolCallId: 's1', tasks: TITLED, state: { kind: 'sent', index: 1 } }, reply: { kind: 'assistant-text', id: 'a1', text: 'Done.', isStreaming: false } }]]));
    const replyless = [user('u1', 'Make it warmer'), tools('g1', offer('s1')), user('u2', 'Show the page on mobile', 'suggestion')];
    expect(placeSentTasks(replyless, false).get('u2')?.reply).toBeUndefined();
    expect(placeSentTasks(EDITED, false).size).toBe(0);
    expect(placeSentTasks([...EDITED, user('u2', 'Make it blue')], false).size).toBe(0);
  });

  test('a retried or resent tap draws the task it repeats, and the turn it replaced offers nothing (ONL-2901)', () => {
    const tapped = [...EDITED, user('u2', 'Show the page on mobile', 'suggestion')];
    const failed: TranscriptItem = { kind: 'error', id: 'x1', message: 'Overloaded', retry: { text: 'Show the page on mobile', origin: 'suggestion' } };
    const resent = placeSentTasks([...tapped, failed, user('u3', 'Show the page on mobile', 'suggestion')], false);
    expect([...resent.keys()]).toEqual(['u2', 'u3']);
    expect(resent.get('u3')).toEqual(resent.get('u2'));
    const stoppedAfterOffer = [...tapped, reply('a2'), tools('g3', offer('s2', { tasks: ['Something else'] })), user('u3', 'Show the page on mobile', 'suggestion')];
    expect(placeSentTasks(stoppedAfterOffer, false).get('u3')?.card.toolCallId).toBe('s1');
    expect([...placeNextTasks(stoppedAfterOffer, false).keys()]).toEqual(['a1']);
  });

  test('a tapped row no card offered is no sent card, so the chat draws its words instead', () => {
    const items = [...EDITED, user('u2', 'Not a task on the card', 'suggestion')];
    expect(placeSentTasks(items, false).size).toBe(0);
    expect(placeNextTasks(items, false).size).toBe(0);
  });

  test('a sent title marks its task, whatever line it carried (ONL-2977)', () => {
    const titled = { tasks: [{ title: 'Tighten the hero', line: 'Less space above the button.' }, { title: 'Show it on mobile', line: 'At 390 wide.' }] };
    const items = [user('u1', 'Make it warmer'), reply('a1'), tools('g2', offer('s1', titled)), user('u2', 'Show it on mobile', 'suggestion')];
    expect(placeNextTasks(items, false).get('a1')?.state).toEqual({ kind: 'sent', index: 1 });
  });

  test('goes when the conversation it belongs to is one the agent can no longer continue (ONL-2925)', () => {
    const lost: TranscriptItem = { kind: 'boundary', id: 'b1', message: 'ChatGPT can’t continue this conversation.' };
    expect(placeNextTasks([...EDITED, lost], false).size).toBe(0);
    expect(placeNextTasks([...EDITED, lost, user('u2', 'Start again')], false).size).toBe(0);
  });

  test('goes when the designer sends their own prompt instead', () => {
    expect(placeNextTasks([...EDITED, user('u2', 'Make the button teal')], false).size).toBe(0);
    expect(placeNextTasks([...EDITED, user('u2', 'Show the page on mobile')], false).size).toBe(0);
  });

  test('stays open past a prompt Studio sent on its own', () => {
    const items = [...EDITED, user('s', 'continue', 'studio')];
    expect(placeNextTasks(items, false).get('a1')?.state).toEqual({ kind: 'open' });
  });

  test('stays under the reply of the turn that offered it when a turn Studio started follows', () => {
    const opening: TranscriptItem = { kind: 'user', id: 's', text: 'opening', origin: 'studio', hidden: true };
    expect([...placeNextTasks([...EDITED, opening, reply('a-studio')], false).keys()]).toEqual(['a1']);
    expect([...placeNextTasks([...EDITED, opening, reply('a-studio')], false).values()].map((card) => card.state)).toEqual([{ kind: 'open' }]);
    const offeredAfterStudio = [user('u1', 'Make it warmer'), reply('a0'), user('s', 'continue', 'studio'), tools('g2', offer('s1'))];
    expect([...placeNextTasks(offeredAfterStudio, false).keys()]).toEqual(['g2']);
  });

  test('takes the turn’s last offer only, and offers nothing from a call that did not complete', () => {
    const twice = [...EDITED.slice(0, 3), tools('g2', offer('s1'), offer('s2', { tasks: ['Only this'] }))];
    expect(placeNextTasks(twice, false).get('a1')?.tasks).toEqual([{ title: 'Only this' }]);
    for (const status of ['failed', 'in_progress'] as const) {
      expect(placeNextTasks([...EDITED.slice(0, 3), tools('g2', offer('s1', undefined, { status }))], false).size).toBe(0);
    }
  });

  test('each turn keeps its own card', () => {
    const items = [...EDITED, user('u2', 'Show the page on mobile', 'suggestion'), reply('a3'), tools('g3', offer('s3', { tasks: ['Next'] }))];
    expect([...placeNextTasks(items, false)].map(([anchor, card]) => [anchor, card.state.kind])).toEqual([['a1', 'sent'], ['a3', 'open']]);
  });
});

describe('the tasks a call carries', () => {
  test('reads Claude’s arguments and codex’s call item alike, at most three', () => {
    expect(nextTasksOf(offer('c', { tasks: TASKS }))).toEqual(TITLED);
    expect(nextTasksOf(offer('x', { tool: 'suggest_next_tasks', arguments: { tasks: TASKS } }))).toEqual(TITLED);
    expect(nextTasksOf(offer('x', { tool: 'suggest_next_tasks', arguments: JSON.stringify({ tasks: TASKS }) }))).toEqual(TITLED);
    expect(nextTasksOf(offer('c', { tasks: [...TASKS, 'A fourth'] }))).toEqual(TITLED);
  });

  test('reads a title and its line from either harness, and a string task as a title alone (ONL-2977)', () => {
    const titled = [{ title: ' Tighten the hero ', line: ' Less space above the button. ' }, { title: 'Show it on mobile' }, 'Try two heroes'];
    const read = [{ title: 'Tighten the hero', line: 'Less space above the button.' }, { title: 'Show it on mobile' }, { title: 'Try two heroes' }];
    expect(nextTasksOf(offer('c', { tasks: titled }))).toEqual(read);
    expect(nextTasksOf(offer('x', { tool: 'suggest_next_tasks', arguments: JSON.stringify({ tasks: titled }) }))).toEqual(read);
  });

  test('drops a task with no title and keeps the rest (ONL-2977)', () => {
    expect(nextTasksOf(offer('c', { tasks: [{ line: 'No title' }, { title: '  ', line: 'Blank' }, { title: 'Kept' }] }))).toEqual([{ title: 'Kept' }]);
    expect(nextTasksOf(offer('c', { tasks: [{ line: 'No title' }] }))).toBeUndefined();
  });

  test('offers nothing from an empty or malformed call', () => {
    expect(nextTasksOf({ ...offer('c'), input: undefined })).toBeUndefined();
    for (const input of [{}, { tasks: [] }, { tasks: ['  '] }, { tasks: 'one' }, { arguments: '{' }]) {
      expect(nextTasksOf(offer('c', input))).toBeUndefined();
    }
  });
});

describe('a turn that offers next tasks holds other invitations for a later turn (ONL-2899)', () => {
  test('holds them while the latest turn’s card is open', () => {
    expect(isOfferingNextTasks(placeNextTasks(EDITED, false))).toBe(true);
    expect(isOfferingNextTasks(placeNextTasks(EDITED, true))).toBe(true);
  });

  test('lets them through once a later turn ends without a card', () => {
    const tapped = [...EDITED, user('u2', 'Show the page on mobile', 'suggestion'), reply('a3')];
    const typed = [...EDITED, user('u2', 'Make it blue'), reply('a3')];
    expect(isOfferingNextTasks(placeNextTasks(tapped, false))).toBe(false);
    expect(isOfferingNextTasks(placeNextTasks(typed, false))).toBe(false);
  });
});

describe('which tasks a card shows, and how (ONL-2977)', () => {
  const states = (rows: ReturnType<typeof nextTaskRows>) => rows.map((row) => [row.index, row.state]);

  test('open with nothing picked: every task, none set apart', () => {
    expect(states(nextTaskRows({ tasks: TITLED, state: { kind: 'open' } }, null))).toEqual([[0, 'open'], [1, 'open'], [2, 'open']]);
  });

  test('after a tap: the tapped task picked and the others dimmed, still on the card', () => {
    expect(states(nextTaskRows({ tasks: TITLED, state: { kind: 'open' } }, 1))).toEqual([[0, 'dimmed'], [1, 'picked'], [2, 'dimmed']]);
  });

  test('a pick the card no longer holds picks nothing', () => {
    expect(states(nextTaskRows({ tasks: TITLED, state: { kind: 'open' } }, 5))).toEqual([[0, 'open'], [1, 'open'], [2, 'open']]);
  });

  test('sent: only the chosen task stays, whatever was picked', () => {
    expect(states(nextTaskRows({ tasks: TITLED, state: { kind: 'sent', index: 2 } }, 0))).toEqual([[2, 'chosen']]);
  });

  test('sent with a message that matches no title: no task stays', () => {
    expect(nextTaskRows({ tasks: TITLED, state: { kind: 'sent', index: -1 } }, null)).toEqual([]);
  });

  test('waiting on the turn: no tasks yet', () => {
    expect(nextTaskRows({ tasks: TITLED, state: { kind: 'waiting' } }, null)).toEqual([]);
  });
});

describe('what a card pictures, and when it may show (ONL-2977)', () => {
  const clip = '0123456789ab-00000000-0000-4000-8000-000000000001';
  const pictured = offer('s1', { tasks: TASKS }, { result: `Studio is showing these tasks.\n${nextTaskPicturesLine([{ clip }, { skeleton: 'row' }, null])}` });
  const card = () => placeNextTasks([...EDITED.slice(0, 3), tools('g2', pictured)], false).get('a1')!;

  test('reads each task’s picture from what the call answered, not from what the agent asked for', () => {
    expect(card().tasks).toStrictEqual([{ title: TASKS[0], picture: { clip } }, { title: TASKS[1], picture: { skeleton: 'row' } }, { title: TASKS[2] }]);
  });

  test('waits while a clip it pictures has not settled, and never for a sketch or a task without a picture', () => {
    expect(isAwaitingPictures(card(), () => false)).toBe(true);
    expect(isAwaitingPictures(card(), (id) => id === clip)).toBe(false);
    expect(isAwaitingPictures({ tasks: [{ title: 'Sketch', picture: { skeleton: 'story' } }, { title: 'Text' }] }, () => false)).toBe(false);
  });
});
