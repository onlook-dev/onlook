import { describe, expect, it } from 'bun:test';

import { MARK_ARM, MARK_GAP, MARK_WEIGHT, offscreenMarks } from './offscreenMarks.js';

const VIEW = { left: 300, top: 0, right: 1000, bottom: 800 };

describe('a selection out of view leaves a mark on the rim', () => {
  it('draws nothing while any part of the box is in view', () => {
    expect(offscreenMarks({ left: 400, top: 100, right: 500, bottom: 200 }, VIEW)).toEqual([]);
    expect(offscreenMarks({ left: 200, top: 100, right: 310, bottom: 200 }, VIEW)).toEqual([]);
  });

  it('spans the box along the edge it left by, inset from the rim', () => {
    expect(offscreenMarks({ left: 400, top: -300, right: 600, bottom: -100 }, VIEW)).toEqual([
      { x: 400, y: VIEW.top + MARK_GAP, width: 200, height: MARK_WEIGHT },
    ]);
    expect(offscreenMarks({ left: 1100, top: 200, right: 1300, bottom: 350 }, VIEW)).toEqual([
      { x: VIEW.right - MARK_GAP - MARK_WEIGHT, y: 200, width: MARK_WEIGHT, height: 150 },
    ]);
  });

  it('clamps a wide box to the rim it can be seen along', () => {
    const [mark] = offscreenMarks({ left: 0, top: 900, right: 2000, bottom: 1000 }, VIEW);
    expect(mark).toEqual({
      x: VIEW.left + MARK_GAP,
      y: VIEW.bottom - MARK_GAP - MARK_WEIGHT,
      width: VIEW.right - VIEW.left - 2 * MARK_GAP,
      height: MARK_WEIGHT,
    });
  });

  it('marks the box just past an edge, the moment it leaves', () => {
    expect(offscreenMarks({ left: 100, top: 50, right: 300, bottom: 400 }, VIEW)).toEqual([
      { x: VIEW.left + MARK_GAP, y: 50, width: MARK_WEIGHT, height: 350 },
    ]);
  });

  it('never draws an edge mark shorter than a corner arm, even one squeezed into a corner', () => {
    const [nearCorner] = offscreenMarks({ left: 280, top: -40, right: 304, bottom: -20 }, VIEW);
    expect(nearCorner).toEqual({ x: VIEW.left + MARK_GAP, y: VIEW.top + MARK_GAP, width: MARK_ARM, height: MARK_WEIGHT });
    const [thin] = offscreenMarks({ left: 1100, top: 400, right: 1200, bottom: 401 }, VIEW);
    expect(thin?.height).toBe(MARK_ARM);
  });

  it('draws an L at the corner the box left through', () => {
    expect(offscreenMarks({ left: 0, top: -400, right: 100, bottom: -300 }, VIEW)).toEqual([
      { x: VIEW.left + MARK_GAP, y: VIEW.top + MARK_GAP, width: MARK_ARM, height: MARK_WEIGHT },
      { x: VIEW.left + MARK_GAP, y: VIEW.top + MARK_GAP, width: MARK_WEIGHT, height: MARK_ARM },
    ]);
    const bottomRight = offscreenMarks({ left: 1200, top: 900, right: 1300, bottom: 1000 }, VIEW);
    expect(bottomRight).toEqual([
      { x: VIEW.right - MARK_GAP - MARK_ARM, y: VIEW.bottom - MARK_GAP - MARK_WEIGHT, width: MARK_ARM, height: MARK_WEIGHT },
      { x: VIEW.right - MARK_GAP - MARK_WEIGHT, y: VIEW.bottom - MARK_GAP - MARK_ARM, width: MARK_WEIGHT, height: MARK_ARM },
    ]);
  });

  it('draws nothing in a view too narrow to hold a mark', () => {
    expect(offscreenMarks({ left: 0, top: 0, right: 10, bottom: 10 }, { left: 100, top: 0, right: 110, bottom: 800 })).toEqual([]);
  });
});
