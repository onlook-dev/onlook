import { describe, expect, it } from 'bun:test';
import {
  candidateBoxes,
  computeResizeSnap,
  computeSnap,
  exactAlignmentGuides,
  SNAP_THRESHOLD_PX,
  type SnapBox,
} from './snapping.js';
import { MAX_FRAME_SIZE, MIN_FRAME_SIZE } from './model.js';

const NEIGHBOUR: SnapBox = { x: 500, y: 0, width: 200, height: 100 };

describe('edge-to-edge snapping', () => {
  it('pulls an edge onto a neighbouring edge inside the threshold, from either side', () => {
    const fromLeft = computeSnap(
      { x: 295, y: 300, width: 200, height: 100 },
      [NEIGHBOUR],
      1,
    );
    expect(fromLeft.snapDelta).toEqual({ x: 5, y: 0 });

    const fromRight = computeSnap(
      { x: 705, y: 300, width: 200, height: 100 },
      [NEIGHBOUR],
      1,
    );
    expect(fromRight.snapDelta).toEqual({ x: -5, y: 0 });
  });

  it('does not snap outside the threshold', () => {
    const result = computeSnap(
      { x: 300 - SNAP_THRESHOLD_PX - 1, y: 300, width: 200, height: 100 },
      [NEIGHBOUR],
      1,
    );
    expect(result.snapDelta).toEqual({ x: 0, y: 0 });
    expect(result.guides).toEqual([]);
  });
});

describe('center alignment', () => {
  it('pulls the dragged center onto a neighbouring center', () => {
    const result = computeSnap(
      { x: 553, y: 300, width: 100, height: 100 },
      [NEIGHBOUR],
      1,
    );
    expect(result.snapDelta).toEqual({ x: -3, y: 0 });
    expect(result.guides).toEqual([
      { orientation: 'vertical', position: 600, from: 0, to: 400 },
    ]);
  });
});

describe('the nearest candidate wins', () => {
  it('among several lines in reach, the smallest correction is the one applied', () => {
    const further: SnapBox = { x: 106, y: 300, width: 50, height: 50 };
    const nearer: SnapBox = { x: 48, y: 500, width: 50, height: 50 };
    const result = computeSnap(
      { x: 100, y: 700, width: 200, height: 100 },
      [further, nearer],
      1,
    );
    expect(result.snapDelta.x).toBe(-2);
    expect(result.guides[0]?.position).toBe(98);
  });
});

describe('the zoom scales the threshold', () => {
  it('the same flow distance snaps zoomed out and misses zoomed in', () => {
    const dragged: SnapBox = { x: 288, y: 300, width: 200, height: 100 };
    expect(computeSnap(dragged, [NEIGHBOUR], 0.5).snapDelta).toEqual({ x: 12, y: 0 });
    expect(computeSnap(dragged, [NEIGHBOUR], 1).snapDelta).toEqual({ x: 0, y: 0 });
    expect(computeSnap(dragged, [NEIGHBOUR], 2).snapDelta).toEqual({ x: 0, y: 0 });

    expect(computeSnap(dragged, [NEIGHBOUR], 0).snapDelta).toEqual({ x: 0, y: 0 });
    expect(computeSnap(dragged, [NEIGHBOUR], Number.NaN).snapDelta).toEqual({ x: 0, y: 0 });
  });
});

describe('the dragged selection is never a candidate', () => {
  it('excluded ids yield no boxes, so a group cannot attract its own members', () => {
    const nodes = [
      { id: 'sibling', position: { x: 497, y: 300 }, width: 200, height: 100 },
      { id: 'other', position: { x: 900, y: 700 }, width: 200, height: 100 },
    ];
    const boxes = candidateBoxes(nodes, new Set(['dragged', 'sibling']));
    expect(boxes).toEqual([{ x: 900, y: 700, width: 200, height: 100 }]);

    const result = computeSnap({ x: 295, y: 300, width: 200, height: 100 }, boxes, 1);
    expect(result.snapDelta).toEqual({ x: 0, y: 0 });
  });

  it('defaults an unmeasured node to a zero-size box rather than dropping it', () => {
    expect(candidateBoxes([{ id: 'bare', position: { x: 10, y: 20 } }], new Set())).toEqual([
      { x: 10, y: 20, width: 0, height: 0 },
    ]);
  });
});

describe('the guides', () => {
  it('span the aligned pair, measured on the SNAPPED box', () => {
    const result = computeSnap(
      { x: 295, y: 300, width: 200, height: 100 },
      [NEIGHBOUR],
      1,
    );
    expect(result.guides).toEqual([
      { orientation: 'vertical', position: 500, from: 0, to: 400 },
    ]);
  });

  it('snaps the two axes independently — and both at once at a corner', () => {
    const oneAxis = computeSnap(
      { x: 295, y: 300, width: 200, height: 100 },
      [NEIGHBOUR],
      1,
    );
    expect(oneAxis.snapDelta).toEqual({ x: 5, y: 0 });
    expect(oneAxis.guides.map((guide) => guide.orientation)).toEqual(['vertical']);

    const corner = computeSnap(
      { x: 295, y: 3, width: 200, height: 100 },
      [NEIGHBOUR],
      1,
    );
    expect(corner.snapDelta).toEqual({ x: 5, y: -3 });
    expect(corner.guides).toEqual([
      { orientation: 'vertical', position: 500, from: 0, to: 100 },
      { orientation: 'horizontal', position: 0, from: 300, to: 700 },
      { orientation: 'horizontal', position: 100, from: 300, to: 700 },
    ]);
  });

  it('shows both aligned edges when equal-size frames line up on both sides', () => {
    const result = computeSnap(
      { x: 295, y: 300, width: 200, height: 100 },
      [{ x: 300, y: 0, width: 200, height: 100 }],
      1,
    );

    expect(result.snapDelta).toEqual({ x: 5, y: 0 });
    expect(result.guides).toEqual([
      { orientation: 'vertical', position: 300, from: 0, to: 400 },
      { orientation: 'vertical', position: 500, from: 0, to: 400 },
    ]);
  });
});

describe('computeResizeSnap — only the moving edge attracts', () => {
  const START: SnapBox = { x: 100, y: 100, width: 300, height: 300 };

  it('a right-edge resize snaps by WIDTH — the anchored left edge never moves', () => {
    const result = computeResizeSnap(
      { x: 100, y: 100, width: 395, height: 300 },
      START,
      [NEIGHBOUR],
      1,
    );
    expect(result.box).toEqual({ x: 100, y: 100, width: 400, height: 300 });
    expect(result.guides).toEqual([
      { orientation: 'vertical', position: 500, from: 0, to: 400 },
    ]);
  });

  it('a left-handle resize adjusts x and width together — the right edge stays fixed', () => {
    const result = computeResizeSnap(
      { x: 705, y: 100, width: 400, height: 300 },
      { x: 100, y: 100, width: 1005, height: 300 },
      [NEIGHBOUR],
      1,
    );
    expect(result.box).toEqual({ x: 700, y: 100, width: 405, height: 300 });
  });

  it('refuses a snap the size bounds refuse — the clamp wins over the attraction', () => {
    const tight: SnapBox = { x: 100, y: 0, width: 800, height: 600 };
    const result = computeResizeSnap(
      { x: 100, y: 0, width: MIN_FRAME_SIZE.width, height: 600 },
      tight,
      [{ x: 100 + MIN_FRAME_SIZE.width - 5, y: 0, width: 200, height: 200 }],
      1,
    );
    expect(result.box).toEqual({ x: 100, y: 0, width: MIN_FRAME_SIZE.width, height: 600 });
    expect(result.guides).toEqual([]);
  });

  it('the floor yields to a start box already below it — an undersized frame still snaps while growing', () => {
    const undersized = MIN_FRAME_SIZE.width - 40;
    const result = computeResizeSnap(
      { x: 100, y: 100, width: undersized + 15, height: 180 },
      { x: 100, y: 100, width: undersized, height: 180 },
      [{ x: 100 + undersized + 20, y: 100, width: 200, height: 180 }],
      1,
    );
    expect(result.box.width).toBe(undersized + 20);
  });

  it('a corner resize answers the two axes independently — one can lock while the other misses', () => {
    const result = computeResizeSnap(
      { x: 100, y: 100, width: 395, height: 250 },
      START,
      [NEIGHBOUR],
      1,
    );
    expect(result.box).toEqual({ x: 100, y: 100, width: 400, height: 250 });
    expect(result.guides).toHaveLength(1);
  });

  it('nearest candidate line wins per axis, the drag rule', () => {
    const result = computeResizeSnap(
      { x: 100, y: 100, width: 395, height: 300 },
      START,
      [NEIGHBOUR, { x: 489, y: 500, width: 300, height: 100 }],
      1,
    );
    expect(result.box.width).toBe(400);
  });

  it('an unmoved axis never snaps — there is no moving edge to attract', () => {
    const result = computeResizeSnap(
      { x: 100, y: 100, width: 300, height: 260 },
      START,
      [NEIGHBOUR],
      1,
    );
    expect(result.box).toEqual({ x: 100, y: 100, width: 300, height: 260 });
    expect(result.guides).toEqual([]);
  });

  it('refuses a snap past the MAXIMUM size the same way — and an oversized start box yields the ceiling', () => {
    const ceiling = MAX_FRAME_SIZE.width;
    const big = computeResizeSnap(
      { x: 0, y: 0, width: ceiling - 4, height: 600 },
      { x: 0, y: 0, width: ceiling - 192, height: 600 },
      [{ x: ceiling + 3, y: 0, width: 300, height: 300 }],
      1,
    );
    expect(big.box.width).toBe(ceiling - 4);
    expect(big.guides).toEqual([]);

    const oversized = computeResizeSnap(
      { x: 0, y: 0, width: ceiling + 403, height: 600 },
      { x: 0, y: 0, width: ceiling + 808, height: 600 },
      [{ x: ceiling + 408, y: 0, width: 300, height: 300 }],
      1,
    );
    expect(oversized.box.width).toBe(ceiling + 408);
  });

  it('tolerates fractional-geometry noise: sub-quarter-unit size drift is not a gesture, a moved position still is', () => {
    const noise = computeResizeSnap(
      { x: 100, y: 100, width: 395.1, height: 300 },
      { x: 100, y: 100, width: 395.3, height: 300 },
      [NEIGHBOUR],
      1,
    );
    expect(noise.box).toEqual({ x: 100, y: 100, width: 395.1, height: 300 });
    expect(noise.guides).toEqual([]);

    const fractional = computeResizeSnap(
      { x: 705, y: 100, width: 400.4, height: 300 },
      { x: 100, y: 100, width: 1005.7, height: 300 },
      [NEIGHBOUR],
      1,
    );
    expect(fractional.box.x).toBe(700);
    expect(fractional.box.width).toBe(405.4);
  });

  it('the threshold scales with zoom exactly as the drag threshold does', () => {
    const raw: SnapBox = { x: 100, y: 100, width: 395, height: 300 };
    expect(computeResizeSnap(raw, START, [NEIGHBOUR], 1).box.width).toBe(400);
    expect(computeResizeSnap(raw, START, [NEIGHBOUR], 2).box.width).toBe(395);
  });
});

describe('exactAlignmentGuides — the nudge shows only a line it already sits on', () => {
  it('draws the guide when an edge lands exactly on a neighbour', () => {
    const guides = exactAlignmentGuides({ x: 300, y: 300, width: 200, height: 100 }, [NEIGHBOUR]);
    expect(guides.some((guide) => guide.orientation === 'vertical' && guide.position === 500)).toBe(true);
  });

  it('draws nothing a pixel short, where a drag would still snap', () => {
    expect(exactAlignmentGuides({ x: 299, y: 300, width: 200, height: 100 }, [NEIGHBOUR])).toEqual([]);
  });
});
