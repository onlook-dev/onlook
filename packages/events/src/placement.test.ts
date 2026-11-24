import { describe, expect, it } from 'bun:test';
import { DEFAULT_FRAME_SIZE } from './canvas-url.js';
import {
  intersects,
  nextPosition,
  overlapsOf,
  placeBeside,
  placeNearSource,
  PLACEMENT_GAP,
  VERTICAL_PLACEMENT_GAP,
  type Rect,
} from './placement.js';

const size = { width: 200, height: 100 };
const SLOT = size.width + PLACEMENT_GAP;

describe('nextPosition — the tiling default', () => {
  it('lands at the origin when nothing is on the canvas', () => {
    expect(nextPosition([])).toEqual({ x: 0, y: 0 });
  });

  it('lands past the RIGHTMOST edge, not the last frame', () => {
    const next = nextPosition([
      { position: { x: 0, y: 0 }, width: 100 },
      { position: { x: 500, y: 0 }, width: 100 },
      { position: { x: 100, y: 0 }, width: 100 },
    ]);
    expect(next.x).toBeGreaterThanOrEqual(600);
    expect(next.y).toBe(0);
  });

  it('measures a frame with no width at the default frame size', () => {
    expect(nextPosition([{ position: { x: 0, y: 0 } }]).x).toBeGreaterThanOrEqual(DEFAULT_FRAME_SIZE.width);
  });
});

describe('placeNearSource — rightward placement', () => {
  it('lands immediately right of the source — same row, one gap past its width — and does not clamp', () => {
    expect(placeNearSource({ x: 9000, y: -4000, ...size }, size, [])).toEqual({
      x: 9000 + SLOT,
      y: -4000,
    });
  });

  it('walks past a run of occupied slots', () => {
    const taken = [1, 2, 3].map((n) => ({ x: SLOT * n, y: 0 }));
    expect(placeNearSource({ x: 0, y: 0, ...size }, size, taken)).toEqual({
      x: SLOT * 4,
      y: 0,
    });
  });

  it('treats a sub-pixel difference as the same position', () => {
    expect(placeNearSource({ x: 0, y: 0, ...size }, size, [{ x: SLOT + 0.5, y: 0 }]))
      .toEqual({ x: SLOT * 2, y: 0 });
  });

  it('uses the source width when the new frame has a different size', () => {
    expect(placeNearSource({ x: 900, y: 700, width: 2000 }, size, []))
      .toEqual({ x: 3000, y: 700 });
  });
});

describe('intersects', () => {
  const a: Rect = { x: 0, y: 0, width: 100, height: 100 };

  it('is true when two rects share area', () => {
    expect(intersects(a, { x: 50, y: 50, width: 100, height: 100 })).toBe(true);
  });

  it('is false for rects that only touch edges', () => {
    expect(intersects(a, { x: 100, y: 0, width: 100, height: 100 })).toBe(false);
  });
});

describe('overlapsOf', () => {
  it('returns every rect the candidate overlaps, in order, and none it does not', () => {
    const rect: Rect = { x: 0, y: 0, width: 100, height: 100 };
    const hit = { id: 'a', x: 50, y: 0, width: 100, height: 100 };
    const miss = { id: 'b', x: 500, y: 0, width: 100, height: 100 };
    const alsoHit = { id: 'c', x: -50, y: 0, width: 100, height: 100 };
    expect(overlapsOf(rect, [hit, miss, alsoHit])).toEqual([hit, alsoHit]);
  });
});

describe('placeBeside — intent placement (ONL-2199)', () => {
  const anchor: Rect = { x: 0, y: 0, width: 200, height: 100 };
  const size = { width: 200, height: 100 };

  it('lands right of the anchor, one gap past its width, with no occupants', () => {
    expect(placeBeside(anchor, size, [], 'right')).toEqual({
      x: anchor.width + PLACEMENT_GAP,
      y: 0,
    });
  });

  it('supports all four sides', () => {
    expect(placeBeside(anchor, size, [], 'left')).toEqual({
      x: -(size.width + PLACEMENT_GAP),
      y: 0,
    });
    expect(placeBeside(anchor, size, [], 'below')).toEqual({
      x: 0,
      y: anchor.height + VERTICAL_PLACEMENT_GAP,
    });
    expect(placeBeside(anchor, size, [], 'above')).toEqual({
      x: 0,
      y: -(size.height + VERTICAL_PLACEMENT_GAP),
    });
  });

  it('jumps past a blocker to the row past IT, working even when the anchor is not rightmost', () => {
    const blocker: Rect = { x: anchor.width + PLACEMENT_GAP, y: 0, width: 400, height: 100 };
    expect(placeBeside(anchor, size, [blocker], 'right')).toEqual({
      x: blocker.x + blocker.width + PLACEMENT_GAP,
      y: 0,
    });
  });

  it('walks past a run of stacked blockers', () => {
    const first: Rect = { x: anchor.width + PLACEMENT_GAP, y: 0, width: size.width, height: size.height };
    const second: Rect = { x: first.x + size.width + PLACEMENT_GAP, y: 0, width: size.width, height: size.height };
    expect(placeBeside(anchor, size, [first, second], 'right')).toEqual({
      x: second.x + size.width + PLACEMENT_GAP,
      y: 0,
    });
  });
});
