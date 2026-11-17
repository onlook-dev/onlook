import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import { ChordHint } from './chord-hint.js';
import { CHORD_HINT_DELAY_MS, CHORD_RELEASE_GRACE_MS } from './chords.js';

function hint() {
  const told: boolean[] = [];
  return { hint: new ChordHint((isHeld) => { told.push(isHeld); }), told };
}

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });

describe('the chord hint', () => {
  it('shows only after the modifier has been held for the delay, and tells the band once', () => {
    const { hint: chord, told } = hint();
    chord.push(true);
    chord.push(true);
    expect(told).toEqual([]);
    expect(chord.isPending()).toBe(true);
    jest.advanceTimersByTime(CHORD_HINT_DELAY_MS);
    chord.push(true);
    expect(told).toEqual([true]);
  });

  it('a tap released inside the delay never shows', () => {
    const { hint: chord, told } = hint();
    chord.push(true);
    chord.push(false);
    jest.advanceTimersByTime(CHORD_HINT_DELAY_MS);
    expect(told).toEqual([]);
    expect(chord.isPending()).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('puts the legends away on release, once', () => {
    const { hint: chord, told } = hint();
    chord.push(true);
    jest.advanceTimersByTime(CHORD_HINT_DELAY_MS);
    chord.push(false);
    chord.push(false);
    expect(told).toEqual([true, false]);
  });

  it('a swap inside the show delay was a tap: the pending show is dropped', () => {
    const { hint: chord, told } = hint();
    chord.push(true);
    chord.noteSwap();
    jest.advanceTimersByTime(CHORD_HINT_DELAY_MS);
    expect(told).toEqual([]);
    expect(chord.isPending()).toBe(false);
  });

  it('a swap under a held modifier arms the release, which a repeat of the held key re-arms (ONL-2364)', () => {
    const { hint: chord, told } = hint();
    chord.push(true);
    jest.advanceTimersByTime(CHORD_HINT_DELAY_MS);
    chord.noteSwap();
    jest.advanceTimersByTime(CHORD_RELEASE_GRACE_MS - 1);
    chord.push(true);
    jest.advanceTimersByTime(CHORD_RELEASE_GRACE_MS - 1);
    expect(told).toEqual([true]);
    jest.advanceTimersByTime(1);
    expect(told).toEqual([true, false]);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('a held modifier with no swap never times out', () => {
    const { hint: chord, told } = hint();
    chord.push(true);
    jest.advanceTimersByTime(CHORD_HINT_DELAY_MS);
    jest.advanceTimersByTime(CHORD_RELEASE_GRACE_MS * 3);
    expect(told).toEqual([true]);
  });

  it('reports the settle window that follows a swap', () => {
    const { hint: chord } = hint();
    expect(chord.isWithinSwapSettle()).toBe(false);
    chord.noteSwap();
    expect(chord.isWithinSwapSettle()).toBe(true);
    jest.advanceTimersByTime(250);
    expect(chord.isWithinSwapSettle()).toBe(false);
  });
});
