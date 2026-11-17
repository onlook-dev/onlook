import { describe, expect, it } from 'bun:test';
import { planStickyPass } from './useStickyUserMessage.js';

/** Heights by row, with a count of how many were actually read. */
function heights(byIndex: Record<number, number>): {
  heightOf: (index: number) => number;
  reads: () => number;
} {
  let reads = 0;
  return {
    heightOf: (index) => {
      reads += 1;
      return byIndex[index] ?? 0;
    },
    reads: () => reads,
  };
}

describe('the sticky prompt pass', () => {
  it('pins nothing while every prompt is still below the pin line', () => {
    const { heightOf, reads } = heights({});
    expect(planStickyPass([40, 200, 400], heightOf)).toEqual({ pinned: -1, scrim: 0, lift: null });
    // Nothing is pinned, so nothing is measured.
    expect(reads()).toBe(0);
  });

  it('pins the last prompt that has passed the line, not the first', () => {
    const { heightOf } = heights({ 1: 30 });
    expect(planStickyPass([-300, -40, 500], heightOf).pinned).toBe(1);
  });

  it('stops at the first prompt still below the line, so a later one cannot steal the pin', () => {
    const { heightOf } = heights({ 0: 30 });
    expect(planStickyPass([-40, 500, -10], heightOf).pinned).toBe(0);
  });

  it('ramps the scrim from the pin line to fully travelled', () => {
    const { heightOf } = heights({ 0: 30 });
    expect(planStickyPass([8, 900], heightOf).scrim).toBe(0);
    expect(planStickyPass([-12, 900], heightOf).scrim).toBe(0.5);
    // Past the ramp it holds at 1 rather than growing.
    expect(planStickyPass([-400, 900], heightOf).scrim).toBe(1);
  });

  it('leaves the pinned row in place while the next prompt is still clear of it', () => {
    const { heightOf } = heights({ 0: 30 });
    expect(planStickyPass([0, 200], heightOf).lift).toBeNull();
  });

  it('lifts the pinned row out of the way once the next prompt crowds it', () => {
    const { heightOf } = heights({ 0: 30 });
    // next(40) < PIN_TOP(8) + height(30) + GAP(8) = 46
    expect(planStickyPass([0, 40], heightOf).lift).toBe(40 - 8 - 30 - 8);
  });

  it('measures one row, so the caller can take every read before its first write (ONL-2553)', () => {
    const { heightOf, reads } = heights({ 1: 30 });
    planStickyPass([-300, -40, 40, 500], heightOf);
    expect(reads()).toBe(1);
  });

  it('needs no height at all when the pinned prompt is the last one', () => {
    const { heightOf, reads } = heights({ 0: 30 });
    expect(planStickyPass([-40], heightOf).lift).toBeNull();
    expect(reads()).toBe(0);
  });
});
