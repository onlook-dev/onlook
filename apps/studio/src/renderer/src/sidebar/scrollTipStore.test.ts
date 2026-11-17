import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import { clearTipRecords } from '../tips/early.js';
import { armScrollTip, lingerScrollTip, spendScrollTip } from './scrollTipStore.js';

const LINGER = 3_000;

describe('a held-S scroll uses the scroll tip of the project it scrolled (ONL-2960)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    clearTipRecords();
  });
  afterEach(() => {
    clearTipRecords();
    jest.useRealTimers();
  });

  it('ends an armed tip once, after it has lingered under the person’s hand', () => {
    let over = 0;
    armScrollTip('/a', 'frame-1');
    lingerScrollTip('/a', LINGER, () => (over += 1));
    lingerScrollTip('/a', LINGER, () => (over += 1));
    jest.advanceTimersByTime(LINGER - 1);
    expect(over).toBe(0);
    jest.advanceTimersByTime(1);
    expect(over).toBe(1);
    jest.advanceTimersByTime(LINGER);
    expect(over).toBe(1);
  });

  it('leaves a project whose tip was never armed free to arm it later', () => {
    let over = 0;
    lingerScrollTip('/b', LINGER, () => (over += 1));
    jest.advanceTimersByTime(LINGER);
    expect(over).toBe(0);
    armScrollTip('/b', 'frame-2');
    lingerScrollTip('/b', LINGER, () => (over += 1));
    jest.advanceTimersByTime(LINGER);
    expect(over).toBe(1);
  });

  it('sends nothing for a tip that went some other way while it lingered, or was already spent', () => {
    let over = 0;
    armScrollTip('/a', 'frame-1');
    lingerScrollTip('/a', LINGER, () => (over += 1));
    spendScrollTip('/a');
    jest.advanceTimersByTime(LINGER);
    lingerScrollTip('/a', LINGER, () => (over += 1));
    jest.advanceTimersByTime(LINGER);
    expect(over).toBe(0);
  });

  it('forgets a linger on Reset tips', () => {
    let over = 0;
    armScrollTip('/a', 'frame-1');
    lingerScrollTip('/a', LINGER, () => (over += 1));
    clearTipRecords();
    jest.advanceTimersByTime(LINGER);
    expect(over).toBe(0);
  });
});
