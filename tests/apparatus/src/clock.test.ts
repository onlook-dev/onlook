import { expect, it } from 'bun:test';
import { manualClock } from './clock.js';

it('advances nested deadlines in order and removes canceled deadlines', () => {
  const clock = manualClock();
  const calls: string[] = [];
  clock.after(5, () => {
    calls.push('first');
    clock.after(5, () => calls.push('nested'));
  });
  const cancel = clock.after(6, () => calls.push('canceled'));
  clock.after(10, () => calls.push('second'));
  cancel();
  cancel();
  clock.advanceBy(9);
  expect(calls).toEqual(['first']);
  expect(clock.pending).toBe(2);
  clock.advanceBy(1);
  expect(calls).toEqual(['first', 'second', 'nested']);
  expect(clock.pending).toBe(0);
});
