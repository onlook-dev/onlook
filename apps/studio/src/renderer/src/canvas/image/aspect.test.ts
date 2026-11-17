import { describe, expect, it } from 'bun:test';
import {
  drivenAspectSide,
  imageAspectRatio,
  lockedAspectBox,
  lockedAspectRatio,
  restoredImageBox,
  type AspectBox,
} from './aspect.js';

const START = { x: 100, y: 200, width: 400, height: 250 };
const RATIO = START.width / START.height;
const MAX = { width: 8192, height: 8192 };
const MIN = { width: 8, height: 8 };

/** Both sides are whole pixels, so the ratio lands within a pixel of the target rather than on it. */
function ratioOf(box: { width: number; height: number }): number {
  return box.width / box.height;
}

function lockedBox(
  raw: AspectBox,
  driven: 'width' | 'height' = drivenAspectSide(raw, START) ?? 'width',
  max: { width: number; height: number } = MAX,
  min: { width: number; height: number } = { width: 1, height: 1 },
): AspectBox {
  return lockedAspectBox(raw, START, RATIO, driven, { min, max });
}

describe('the ratio a picture carries', () => {
  it('reads width over height', () => {
    expect(imageAspectRatio({ width: 1600, height: 800 })).toBe(2);
  });

  it('answers nothing for a size that cannot define one', () => {
    expect(imageAspectRatio({ width: 0, height: 400 })).toBeNull();
    expect(imageAspectRatio({ width: 400, height: 0 })).toBeNull();
    expect(imageAspectRatio({ width: -10, height: 400 })).toBeNull();
    expect(imageAspectRatio({ width: Number.NaN, height: 400 })).toBeNull();
    expect(imageAspectRatio({ width: 400, height: Number.POSITIVE_INFINITY })).toBeNull();
  });
});

describe('the ratio a resize holds', () => {
  it('answers the source pixels’ ratio, however far the stored box has drifted from it', () => {
    expect(
      lockedAspectRatio({
        width: 300,
        height: 200,
        content: { originalWidth: 1600, originalHeight: 1200 },
      }),
    ).toBeCloseTo(4 / 3, 5);
  });

  it('falls back to the stored box when the originals cannot define a ratio', () => {
    expect(
      lockedAspectRatio({
        width: 300,
        height: 200,
        content: { originalWidth: 0, originalHeight: 1200 },
      }),
    ).toBe(1.5);
    expect(
      lockedAspectRatio({
        width: 300,
        height: 200,
        content: { originalWidth: 1600, originalHeight: Number.NaN },
      }),
    ).toBe(1.5);
  });

  it('answers nothing when neither the originals nor the box can define one', () => {
    expect(
      lockedAspectRatio({ width: 0, height: 0, content: { originalWidth: 0, originalHeight: 0 } }),
    ).toBeNull();
  });
});

describe('the side a locked drag reads its size from', () => {
  it('answers nothing while neither side has moved a whole unit, so no axis leads yet', () => {
    expect(drivenAspectSide({ ...START, width: START.width + 0.4 }, START)).toBeNull();
    expect(drivenAspectSide(START, START)).toBeNull();
  });

  it('answers the side that moved furthest once one of them has', () => {
    expect(drivenAspectSide({ ...START, width: START.width + 9 }, START)).toBe('width');
    expect(drivenAspectSide({ ...START, height: START.height + 9 }, START)).toBe('height');
  });
});

describe('a drag with the ratio locked', () => {
  it('returns the raw box untouched when nothing moved', () => {
    expect(lockedBox(START)).toEqual(START);
  });

  it('follows the width the pointer moved and derives the height from it', () => {
    const raw = { ...START, width: START.width * 2 };
    const locked = lockedBox(raw);
    expect(locked.width).toBe(raw.width);
    expect(ratioOf(locked)).toBeCloseTo(RATIO, 1);
  });

  it('follows the height when that is the axis the pointer moved furthest', () => {
    const raw = { ...START, width: START.width + 2, height: START.height * 2 };
    const locked = lockedBox(raw);
    expect(locked.height).toBe(raw.height);
    expect(ratioOf(locked)).toBeCloseTo(RATIO, 1);
  });

  it('keeps the bottom edge where a top-edge drag left it', () => {
    const raw = { ...START, y: START.y - 100, height: START.height + 100 };
    const locked = lockedBox(raw);
    expect(locked.y + locked.height).toBe(START.y + START.height);
    expect(ratioOf(locked)).toBeCloseTo(RATIO, 1);
  });

  it('keeps the right edge where a left-edge drag left it', () => {
    const raw = { ...START, x: START.x - 120, width: START.width + 120 };
    const locked = lockedBox(raw);
    expect(locked.x + locked.width).toBe(START.x + START.width);
    expect(ratioOf(locked)).toBeCloseTo(RATIO, 1);
  });

  it('keeps the anchored corner of a corner drag, and both sides move together', () => {
    const raw = { x: START.x - 200, y: START.y - 50, width: START.width + 200, height: START.height + 50 };
    const locked = lockedBox(raw);
    expect(locked.x + locked.width).toBe(START.x + START.width);
    expect(locked.y + locked.height).toBe(START.y + START.height);
    expect(locked.width).toBeGreaterThan(START.width);
    expect(locked.height).toBeGreaterThan(START.height);
    expect(ratioOf(locked)).toBeCloseTo(RATIO, 1);
  });

  it('takes the driven side the caller measured, so a snap cannot change which axis leads', () => {
    const snapped = { ...START, width: START.width + 4, height: START.height + 6 };
    const locked = lockedBox(snapped, 'width');
    expect(locked.width).toBe(snapped.width);
    expect(ratioOf(locked)).toBeCloseTo(RATIO, 1);
  });

  it('never returns a side below one pixel, however far the drag collapsed the box', () => {
    const raw = { ...START, width: 1, height: 1 };
    const locked = lockedBox(raw);
    expect(locked.width).toBeGreaterThanOrEqual(1);
    expect(locked.height).toBeGreaterThanOrEqual(1);
  });

  it('holds the derived side under the ceiling the driven side was allowed to reach', () => {
    const max = { width: 800, height: 800 };
    const locked = lockedBox({ ...START, height: max.height }, 'height', max);
    expect(locked.width).toBeLessThanOrEqual(max.width);
    expect(locked.height).toBeLessThanOrEqual(max.height);
    expect(ratioOf(locked)).toBeCloseTo(RATIO, 1);
  });

  it('holds both sides under the ceiling when the width is the side that leads', () => {
    const max = { width: 800, height: 800 };
    const locked = lockedBox({ ...START, width: max.width }, 'width', max);
    expect(locked.width).toBeLessThanOrEqual(max.width);
    expect(locked.height).toBeLessThanOrEqual(max.height);
    expect(ratioOf(locked)).toBeCloseTo(RATIO, 1);
  });

  // The handles bound only the side the pointer drives, so a wide picture dragged to the width floor
  // would otherwise settle a one-pixel height, and that box becomes the next gesture's own floor.
  it('holds the derived side above the floor the driven side was allowed to reach', () => {
    const locked = lockedBox({ ...START, width: MIN.width }, 'width', MAX, MIN);
    expect(locked.width).toBeGreaterThanOrEqual(MIN.width);
    expect(locked.height).toBeGreaterThanOrEqual(MIN.height);
    expect(ratioOf(locked)).toBeCloseTo(RATIO, 1);
  });

  it('holds both sides above the floor when the height is the side that leads', () => {
    const locked = lockedBox({ ...START, height: MIN.height }, 'height', MAX, MIN);
    expect(locked.width).toBeGreaterThanOrEqual(MIN.width);
    expect(locked.height).toBeGreaterThanOrEqual(MIN.height);
    expect(ratioOf(locked)).toBeCloseTo(RATIO, 1);
  });
});

describe('restoring a picture’s own dimensions', () => {
  it('returns the stored originals, exactly', () => {
    expect(restoredImageBox({ originalWidth: 1600, originalHeight: 1200 })).toEqual({
      width: 1600,
      height: 1200,
    });
  });

  it('answers nothing when the stored originals cannot make a box', () => {
    expect(restoredImageBox({ originalWidth: 0, originalHeight: 1200 })).toBeNull();
    expect(restoredImageBox({ originalWidth: 1600, originalHeight: Number.NaN })).toBeNull();
  });
});
