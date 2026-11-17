import { afterEach, describe, expect, it } from 'bun:test';
import { forgetFrameReadings, onFrameLane, resetLanesForTests } from './lane.js';

afterEach(resetLanesForTests);

const settle = (): Promise<void> => new Promise((done) => setTimeout(done, 0));

describe('the Frame’s evaluation lane (ONL-2563)', () => {
  /* The attached path takes an exclusive debugger, so two overlapping calls
     fail with "already attached" rather than queueing themselves. */
  it('runs one evaluation at a time for one Frame', async () => {
    const order: string[] = [];
    let releaseFirst = (): void => undefined;
    const first = onFrameLane(1, '1:a', async () => {
      order.push('first in');
      await new Promise<void>((done) => {
        releaseFirst = done;
      });
      order.push('first out');
      return 'a';
    });
    const second = onFrameLane(1, '1:b', async () => {
      order.push('second in');
      return 'b';
    });
    await settle();
    expect(order).toEqual(['first in']);
    releaseFirst();
    await Promise.all([first, second]);
    expect(order).toEqual(['first in', 'first out', 'second in']);
  });

  it('runs two Frames at the same time, because they are two debuggers', async () => {
    const order: string[] = [];
    let releaseOne = (): void => undefined;
    const one = onFrameLane(1, '1:a', async () => {
      await new Promise<void>((done) => {
        releaseOne = done;
      });
      order.push('one');
      return 'one';
    });
    const two = onFrameLane(2, '2:a', async () => {
      order.push('two');
      return 'two';
    });
    await settle();
    expect(order).toEqual(['two']);
    releaseOne();
    await Promise.all([one, two]);
  });

  it('answers a repeated pick from the cache rather than evaluating twice', async () => {
    let runs = 0;
    const work = async (): Promise<string> => {
      runs += 1;
      return 'answer';
    };
    expect(await onFrameLane(1, '1:same', work)).toBe('answer');
    expect(await onFrameLane(1, '1:same', work)).toBe('answer');
    expect(runs).toBe(1);
  });

  /* One call failing must not wedge the queue behind it: the next pick would
     never be answered and the panel would sit on a stale mapping forever. */
  it('keeps the lane moving after a call rejects', async () => {
    const failed = onFrameLane(1, '1:bad', () => Promise.reject(new Error('attached')));
    await expect(failed).rejects.toThrow('attached');
    expect(await onFrameLane(1, '1:good', async () => 'fine')).toBe('fine');
  });

  it('forgets a navigated Frame’s readings, which were taken against the old DOM', async () => {
    let runs = 0;
    const work = async (): Promise<number> => {
      runs += 1;
      return runs;
    };
    expect(await onFrameLane(1, '1:x', work)).toBe(1);
    forgetFrameReadings(1);
    expect(await onFrameLane(1, '1:x', work)).toBe(2);
  });

  it('leaves another Frame’s readings alone when one navigates', async () => {
    await onFrameLane(2, '2:x', async () => 'kept');
    forgetFrameReadings(1);
    let ran = false;
    expect(
      await onFrameLane(2, '2:x', async () => {
        ran = true;
        return 'fresh';
      }),
    ).toBe('kept');
    expect(ran).toBe(false);
  });
});

describe('a read whose key is never asked twice (ONL-2563)', () => {
  /* The component map's token is fresh per read. Remembering its answer only evicts a pick's,
     which is the one the cache exists for. */
  it('keeps an unremembered answer out of the cache', async () => {
    let runs = 0;
    const work = async (): Promise<number> => {
      runs += 1;
      return runs;
    };
    expect(await onFrameLane(1, 'map:1:a', work, { remember: false })).toBe(1);
    expect(await onFrameLane(1, 'map:1:a', work, { remember: false })).toBe(2);
  });

  it('still answers a remembered key from the cache', async () => {
    let runs = 0;
    const work = async (): Promise<number> => {
      runs += 1;
      return runs;
    };
    expect(await onFrameLane(1, '1:pick', work)).toBe(1);
    expect(await onFrameLane(1, '1:pick', work)).toBe(1);
  });
});
