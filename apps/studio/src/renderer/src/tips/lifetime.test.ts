import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import { resetTipLifetimes, watchTipLifetime } from './lifetime.js';

const LIFETIME = 45_000;

describe('a tip that goes by itself (ONL-2960)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetTipLifetimes();
  });
  afterEach(() => {
    resetTipLifetimes();
    jest.useRealTimers();
  });

  it('goes once it has been on screen for its lifetime', () => {
    let over = 0;
    watchTipLifetime('a', LIFETIME, () => (over += 1));
    jest.advanceTimersByTime(LIFETIME - 1);
    expect(over).toBe(0);
    jest.advanceTimersByTime(1);
    expect(over).toBe(1);
  });

  it('counts only time on screen, across leaving and coming back', () => {
    let over = 0;
    const leave = watchTipLifetime('a', LIFETIME, () => (over += 1));
    jest.advanceTimersByTime(30_000);
    leave();
    jest.advanceTimersByTime(120_000);
    expect(over).toBe(0);
    watchTipLifetime('a', LIFETIME, () => (over += 1));
    jest.advanceTimersByTime(14_999);
    expect(over).toBe(0);
    jest.advanceTimersByTime(1);
    expect(over).toBe(1);
  });

  it('keeps a separate count per tip', () => {
    let over = 0;
    const leave = watchTipLifetime('a', LIFETIME, () => (over += 1));
    jest.advanceTimersByTime(40_000);
    leave();
    watchTipLifetime('b', LIFETIME, () => (over += 1));
    jest.advanceTimersByTime(40_000);
    expect(over).toBe(0);
  });
});
