import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import { forgetPromptTip, usePromptTipStore, watchNextTasksOffer } from './promptTipStore.js';

const PATH = '/projects/a';
const DELAY = 12_000;
const due = (): string | null => usePromptTipStore.getState().due;

describe('the prompt tip’s delay after next-task cards land (ONL-2960)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    forgetPromptTip();
  });
  afterEach(() => {
    forgetPromptTip();
    jest.useRealTimers();
  });

  it('comes due once the cards have waited the whole delay', () => {
    watchNextTasksOffer(PATH, true, DELAY);
    jest.advanceTimersByTime(DELAY - 1);
    expect(due()).toBeNull();
    jest.advanceTimersByTime(1);
    expect(due()).toBe(PATH);
  });

  it('keeps counting while the cards still wait', () => {
    watchNextTasksOffer(PATH, true, DELAY);
    jest.advanceTimersByTime(DELAY / 2);
    watchNextTasksOffer(PATH, true, DELAY);
    jest.advanceTimersByTime(DELAY / 2);
    expect(due()).toBe(PATH);
  });

  it('never comes due when a card is picked first, and the next offer counts afresh', () => {
    watchNextTasksOffer(PATH, true, DELAY);
    jest.advanceTimersByTime(DELAY - 1);
    watchNextTasksOffer(PATH, false, DELAY);
    jest.advanceTimersByTime(DELAY);
    expect(due()).toBeNull();
    watchNextTasksOffer(PATH, true, DELAY);
    jest.advanceTimersByTime(DELAY - 1);
    expect(due()).toBeNull();
  });

  it('is no longer due once the cards stop waiting', () => {
    watchNextTasksOffer(PATH, true, DELAY);
    jest.advanceTimersByTime(DELAY);
    watchNextTasksOffer(PATH, false, DELAY);
    expect(due()).toBeNull();
  });

  it('does not carry one project’s count to another', () => {
    watchNextTasksOffer(PATH, true, DELAY);
    jest.advanceTimersByTime(DELAY - 1);
    watchNextTasksOffer('/projects/b', true, DELAY);
    jest.advanceTimersByTime(1);
    expect(due()).toBeNull();
    jest.advanceTimersByTime(DELAY);
    expect(due()).toBe('/projects/b');
  });
});
