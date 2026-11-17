import { afterEach, expect, it, jest } from 'bun:test';
import { systemClock } from './deadline.js';

afterEach(() => {
  jest.useRealTimers();
});

it('delegates deadlines to the system timer and cancels them idempotently', () => {
  jest.useFakeTimers();
  const calls: string[] = [];
  systemClock.after(10, () => calls.push('due'));
  const cancel = systemClock.after(10, () => calls.push('canceled'));
  cancel();
  cancel();
  jest.advanceTimersByTime(9);
  expect(calls).toEqual([]);
  jest.advanceTimersByTime(1);
  expect(calls).toEqual(['due']);
});
