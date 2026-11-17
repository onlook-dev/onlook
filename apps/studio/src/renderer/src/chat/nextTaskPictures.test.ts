import { describe, expect, test } from 'bun:test';
import { createPictureLoads, PICTURE_WAIT_MS } from './nextTaskPictures.js';

function harness(settled: Record<string, string | null> = {}) {
  const answers = new Map<string, (url: string | null) => void>();
  const timers: { ms: number; run: () => void }[] = [];
  const asked: string[] = [];
  const loads = createPictureLoads({
    resolve: ({ id }) => {
      asked.push(id);
      return new Promise((resolve) => answers.set(id, resolve));
    },
    peek: ({ id }) => settled[id],
    schedule: (ms, run) => timers.push({ ms, run }),
  });
  const answer = async (id: string, url: string | null) => {
    answers.get(id)!(url);
    await Promise.resolve();
  };
  return { loads, asked, timers, answer };
}

describe('loading the clips a next-tasks card pictures (ONL-2977)', () => {
  test('starts a clip loading as soon as its call answers, before the turn ends, and asks once', () => {
    const { loads, asked, timers } = harness();
    loads.track([{ id: 'c1', ended: false }]);
    loads.track([{ id: 'c1', ended: false }]);
    expect(asked).toEqual(['c1']);
    expect(loads.read('c1')).toBeUndefined();
    expect(timers).toEqual([]);
  });

  test('shows the clip once its bytes arrive, and text where they are gone', async () => {
    const { loads, answer } = harness();
    loads.track([{ id: 'c1', ended: true }, { id: 'c2', ended: true }]);
    await answer('c1', 'blob:c1');
    await answer('c2', null);
    expect(loads.read('c1')).toBe('blob:c1');
    expect(loads.read('c2')).toBeNull();
  });

  test('gives a clip up for text a bounded wait past the turn’s end, and keeps it text when the bytes come later', async () => {
    const { loads, timers, answer } = harness();
    loads.track([{ id: 'c1', ended: false }]);
    loads.track([{ id: 'c1', ended: true }]);
    expect(timers.map((timer) => timer.ms)).toEqual([PICTURE_WAIT_MS]);
    timers[0]!.run();
    expect(loads.read('c1')).toBeNull();
    await answer('c1', 'blob:c1');
    expect(loads.read('c1')).toBeNull();
  });

  test('reads a clip already loaded elsewhere at once, so a card drawn again never waits', () => {
    const { loads, asked, timers } = harness({ c1: 'blob:c1' });
    expect(loads.read('c1')).toBe('blob:c1');
    loads.track([{ id: 'c1', ended: true }]);
    expect(asked).toEqual([]);
    expect(timers).toEqual([]);
  });

  test('tells its readers each time a clip settles', async () => {
    const { loads, timers, answer } = harness();
    let heard = 0;
    loads.subscribe(() => (heard += 1));
    loads.track([{ id: 'c1', ended: true }, { id: 'c2', ended: true }]);
    await answer('c1', 'blob:c1');
    timers[1]!.run();
    expect(heard).toBe(2);
    expect(loads.version()).toBe(2);
  });
});
