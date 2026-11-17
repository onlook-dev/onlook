import { describe, expect, it } from 'bun:test';
import type { Rect } from './bounds.js';

const { chooseBounds } = await import('./bounds.js');

const LAPTOP = { x: 0, y: 0, width: 1512, height: 944 };
const EXTERNAL = { x: -2560, y: -400, width: 2560, height: 1440 };

describe('chooseBounds', () => {
  it('rejects a rectangle whose display has been unplugged', () => {
    const saved = { x: -2000, y: -200, width: 1100, height: 700 };
    expect(chooseBounds(saved, [LAPTOP, EXTERNAL])).toEqual(saved);
    expect(chooseBounds(saved, [LAPTOP])).toBeUndefined();
  });

  it('keeps a rectangle hanging off an edge while enough remains reachable', () => {
    const saved = { x: 1300, y: 60, width: 1100, height: 700 };
    expect(chooseBounds(saved, [LAPTOP])).toEqual(saved);
  });

  it('rejects a degenerate or non-finite rectangle', () => {
    const nanFromDisk = JSON.parse(JSON.stringify({ x: NaN, y: 0, width: 1100, height: 700 })) as Rect;
    expect(chooseBounds({ x: 0, y: 0, width: 10, height: 10 }, [LAPTOP])).toBeUndefined();
    expect(chooseBounds(nanFromDisk, [LAPTOP])).toBeUndefined();
    expect(chooseBounds(undefined, [LAPTOP])).toBeUndefined();
  });
});
