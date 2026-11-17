import { beforeEach, describe, expect, test } from 'bun:test';
import { nextTaskPickOf, nextTaskPrompt, pickNextTask, sendTappedTask, useNextTaskPicks } from './nextTaskPick.js';

const pickOf = (toolCallId: string) => nextTaskPickOf(useNextTaskPicks.getState().picks, toolCallId);

describe('the pick on a next-tasks card (ONL-2977)', () => {
  beforeEach(() => useNextTaskPicks.setState({ picks: {} }));

  test('starts with nothing picked and no taps', () => {
    expect(pickOf('s1')).toEqual({ index: null, taps: 0 });
  });

  test('picks the card tapped, and counts every tap, a second tap on the same card included', () => {
    pickNextTask('s1', 2);
    expect(pickOf('s1')).toEqual({ index: 2, taps: 1 });
    pickNextTask('s1', 0);
    pickNextTask('s1', 0);
    expect(pickOf('s1')).toEqual({ index: 0, taps: 3 });
  });

  test('a new offer starts with nothing picked', () => {
    pickNextTask('s1', 1);
    expect(pickOf('s2')).toEqual({ index: null, taps: 0 });
  });
});

describe('what a chosen next task sends (ONL-2977)', () => {
  test('the title as the message, and the line for the model alone', () => {
    const prompt = nextTaskPrompt({ title: 'Tighten the hero', line: 'Less space above the button.' });
    expect(prompt.text).toBe('Tighten the hero');
    expect(prompt.context).toContain('Less space above the button.');
    expect(prompt.context).not.toContain('Tighten the hero');
  });

  test('no context for a task with no line', () => {
    expect(Object.keys(nextTaskPrompt({ title: 'Show it on mobile' }))).toEqual(['text']);
  });
});

describe('a tapped task main does not take (ONL-2977)', () => {
  beforeEach(() => useNextTaskPicks.setState({ picks: {} }));
  const pick = { toolCallId: 's1', index: 1, task: { title: 'Show it on mobile', line: 'At 390 wide.' } };

  test('sends the title, its line for the model, and the taps, and keeps the pick once main takes it', async () => {
    pickNextTask('s1', 1);
    const sent: unknown[] = [];
    expect(await sendTappedTask(pick, async (prompt, suggestion) => { sent.push({ prompt, suggestion }); return { accepted: true }; })).toBe(true);
    expect(sent).toEqual([{ prompt: nextTaskPrompt(pick.task), suggestion: { index: 1, taps: 1 } }]);
    expect(pickOf('s1')).toEqual({ index: 1, taps: 1 });
  });

  test('lets go of the pick when main refuses it or the bridge throws, keeping the tap counted', async () => {
    for (const send of [async () => ({ accepted: false }), async () => { throw new Error('bridge gone'); }]) {
      pickNextTask('s1', 1);
      expect(await sendTappedTask(pick, send)).toBe(false);
      expect(pickOf('s1').index).toBeNull();
    }
    expect(pickOf('s1').taps).toBe(2);
  });
});
