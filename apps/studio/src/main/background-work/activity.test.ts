import { describe, expect, it } from 'bun:test';
import { createWorkActivity, repeatWork, waitForWork, type WorkTimers } from './activity.js';

function clock() {
  let now = 0;
  let sequence = 0;
  const pending = new Map<number, { due: number; callback: () => void }>();
  const timers: WorkTimers = {
    set(callback, ms) {
      const handle = ++sequence;
      pending.set(handle, { due: now + ms, callback });
      return handle;
    },
    clear(handle) { pending.delete(handle as number); },
  };
  return {
    timers, pending,
    advance(ms: number) {
      const until = now + ms;
      for (;;) {
        const next = [...pending.entries()].sort((left, right) => left[1].due - right[1].due)[0];
        if (next === undefined || next[1].due > until) break;
        now = next[1].due;
        pending.delete(next[0]);
        next[1].callback();
      }
      now = until;
    },
  };
}

describe('background work cadence', () => {
  for (const state of [{ focused: false }, { visible: false }, { onBattery: true }]) {
    it(`slows tenfold for ${JSON.stringify(state)} and immediately refreshes on return`, () => {
      const time = clock();
      const activity = createWorkActivity();
      let calls = 0;
      const stop = repeatWork(() => { calls += 1; }, 1000, activity, time.timers);
      time.advance(1000);
      expect(calls).toBe(1);
      activity.update(state);
      expect(calls).toBe(2);
      time.advance(9999);
      expect(calls).toBe(2);
      time.advance(1);
      expect(calls).toBe(3);
      activity.update({ focused: true, visible: true, onBattery: false });
      expect(calls).toBe(4);
      time.advance(1000);
      expect(calls).toBe(5);
      stop();
      activity.update(state);
      time.advance(100_000);
      expect(calls).toBe(5);
      expect(time.pending.size).toBe(0);
    });
  }

  it('keeps battery cadence after focus and immediately wakes a pending server probe', async () => {
    const time = clock();
    const activity = createWorkActivity();
    activity.update({ focused: false, onBattery: true });
    const wait = waitForWork(2000, activity, time.timers);
    let finished = false;
    void wait.done.then(() => { finished = true; });
    time.advance(1999);
    await Promise.resolve();
    expect(finished).toBe(false);
    activity.update({ focused: true });
    await wait.done;
    expect(finished).toBe(true);
    expect(activity.multiplier()).toBe(10);
    expect(time.pending.size).toBe(0);
  });

  it('lengthens pending waits on blur and cancels timers and subscriptions on stop', async () => {
    const time = clock();
    const activity = createWorkActivity();
    const wait = waitForWork(2000, activity, time.timers);
    activity.update({ focused: false });
    time.advance(2000);
    expect(time.pending.size).toBe(1);
    wait.cancel();
    await wait.done;
    activity.update({ focused: true });
    expect(time.pending.size).toBe(0);
  });

  it('measures 90 percent fewer scheduled callbacks across the three idle loops', () => {
    const counts = (background: boolean): number[] => {
      const time = clock();
      const activity = createWorkActivity();
      activity.update({ focused: !background });
      const calls = [0, 0, 0];
      const stops = [2000, 1000, 15_000].map((ms, index) => repeatWork(() => { calls[index]! += 1; }, ms, activity, time.timers));
      time.advance(300_000);
      for (const stop of stops) stop();
      return calls;
    };
    expect(counts(false)).toEqual([150, 300, 20]);
    expect(counts(true)).toEqual([15, 30, 2]);
  });
});
