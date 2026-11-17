import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';

import { resetTipBeats, restartTipBeat, startTipBeat, TIP_BEAT_MS, useTipBeatStore } from './footStore.js';

const elapse = (ms: number): void => {
  jest.advanceTimersByTime(ms);
};

describe('the opening beat before a tip grows (ONL-2960)', () => {
  const isOver = (path: string): boolean => useTipBeatStore.getState().over[path] === true;
  beforeEach(() => {
    jest.useFakeTimers();
    resetTipBeats();
  });
  afterEach(() => {
    resetTipBeats();
    jest.useRealTimers();
  });

  it('runs about six seconds from the project opening', () => {
    expect(TIP_BEAT_MS).toBe(6_000);
    startTipBeat('/a', TIP_BEAT_MS);
    elapse(TIP_BEAT_MS - 1);
    expect(isOver('/a')).toBe(false);
    elapse(1);
    expect(isOver('/a')).toBe(true);
  });

  it('is not restarted by opening the project again, and runs per project', () => {
    startTipBeat('/a', TIP_BEAT_MS);
    elapse(3_000);
    startTipBeat('/a', TIP_BEAT_MS);
    elapse(3_000);
    expect(isOver('/a')).toBe(true);
    startTipBeat('/a', TIP_BEAT_MS);
    expect(isOver('/a')).toBe(true);
    expect(isOver('/b')).toBe(false);
  });

  it('runs again in full once a tip goes, whether or not the first had ended', () => {
    startTipBeat('/a', TIP_BEAT_MS);
    elapse(TIP_BEAT_MS);
    restartTipBeat('/a', TIP_BEAT_MS);
    expect(isOver('/a')).toBe(false);
    elapse(TIP_BEAT_MS - 1);
    expect(isOver('/a')).toBe(false);
    elapse(1);
    expect(isOver('/a')).toBe(true);
    startTipBeat('/b', TIP_BEAT_MS);
    elapse(3_000);
    restartTipBeat('/b', TIP_BEAT_MS);
    elapse(3_000);
    expect(isOver('/b')).toBe(false);
  });
});
