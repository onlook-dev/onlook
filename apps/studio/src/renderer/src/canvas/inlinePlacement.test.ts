import { describe, expect, it } from 'bun:test';
import { frameLocalFromGuest } from './frame/geometry.js';
import {
  anchorFlowBox,
  anchorPaneBand,
  INLINE_BUBBLE_GAP,
  INLINE_BUBBLE_RESERVE,
  INLINE_BUBBLE_WIDTH,
  inlineAnchorPoint,
  inlinePlacementFor,
  isAnchorLocked,
  type InlineChatRecord,
  nodeAnchorRect,
} from './inlinePlacement.js';

const ORIGIN = { x: 1200, y: -340 };

describe('the anchor’s flow box (ONL-2455)', () => {
  it('maps a guest rect at a known page zoom onto the frame’s absolute position', () => {
    expect(
      anchorFlowBox({
        rect: { x: 40, y: 90, width: 120, height: 32 },
        guestZoom: 1.5,
        origin: ORIGIN,
      }),
    ).toEqual({ x: 1260, y: -205, width: 180, height: 48 });
  });

  it('is the wheel handler’s own conversion, so one frame-local rule serves both', () => {
    const rect = { x: 40, y: 90, width: 120, height: 32 };
    const local = frameLocalFromGuest({ x: rect.x, y: rect.y }, 1.5);
    const box = anchorFlowBox({ rect, guestZoom: 1.5, origin: ORIGIN });

    expect(box.x).toBe(ORIGIN.x + local.x);
    expect(box.y).toBe(ORIGIN.y + local.y);
  });

  it('reads an unattached guest’s zoom as 1 rather than collapsing the box', () => {
    const rect = { x: 10, y: 20, width: 30, height: 40 };
    for (const guestZoom of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(anchorFlowBox({ rect, guestZoom, origin: { x: 0, y: 0 } })).toEqual(rect);
    }
  });
});

describe('the anchor’s band on the pane', () => {
  it('is where the camera enters — the flow box itself carries no zoom', () => {
    const box = { x: 100, y: 200, width: 50, height: 20 };
    expect(anchorPaneBand(box, { x: 0, y: 0, zoom: 1 })).toEqual({ top: 200, bottom: 220 });
    expect(anchorPaneBand(box, { x: 0, y: 0, zoom: 0.25 })).toEqual({ top: 50, bottom: 55 });
    expect(anchorPaneBand(box, { x: 0, y: 40, zoom: 2 })).toEqual({ top: 440, bottom: 480 });
  });
});

describe('the latched side', () => {
  it('takes the side above the anchor when the pane has room for the surface', () => {
    expect(
      inlinePlacementFor({ top: INLINE_BUBBLE_RESERVE, bottom: 400, paneHeight: 800 }),
    ).toBe('above');
  });

  it('flips below when the anchor sits against the top of the pane', () => {
    expect(inlinePlacementFor({ top: 12, bottom: 60, paneHeight: 800 })).toBe('below');
  });

  it('keeps the side above when neither side fits, leaving the slide to the layer', () => {
    expect(inlinePlacementFor({ top: 4, bottom: 100, paneHeight: 120 })).toBe('above');
  });
});

describe('the zero-size anchor the layer positions off', () => {
  const box = { x: 100, y: 200, width: 80, height: 40 };

  it('sits on the element’s centre line, at the edge the latched side takes', () => {
    expect(inlineAnchorPoint(box, 'above', 1)).toEqual({
      left: 140,
      top: 200 - INLINE_BUBBLE_GAP,
    });
    expect(inlineAnchorPoint(box, 'below', 1)).toEqual({
      left: 140,
      top: 240 + INLINE_BUBBLE_GAP,
    });
  });

  it('divides the gap by the zoom, so it holds its screen distance', () => {
    expect(inlineAnchorPoint(box, 'above', 0.25).top).toBe(200 - INLINE_BUBBLE_GAP * 4);
    expect(inlineAnchorPoint(box, 'below', 4).top).toBe(240 + INLINE_BUBBLE_GAP / 4);
  });

  it('reads a degenerate zoom as 1 rather than flinging the anchor off the canvas', () => {
    expect(inlineAnchorPoint(box, 'above', 0).top).toBe(200 - INLINE_BUBBLE_GAP);
    expect(inlineAnchorPoint(box, 'above', Number.NaN).top).toBe(200 - INLINE_BUBBLE_GAP);
  });
});

describe('the surface stays inside its frame (ONL-2518)', () => {
  const half = INLINE_BUBBLE_WIDTH / 2;
  const frame = { x: 1000, width: 1200 };
  const at = (x: number, zoom = 1): number =>
    inlineAnchorPoint({ x, y: 0, width: 0, height: 0 }, 'above', zoom, frame).left;

  it('leaves an element with room on both sides where it is', () => {
    expect(at(1600)).toBe(1600);
  });

  it('holds the surface a half-width inside each edge', () => {
    expect(at(1000)).toBe(1000 + half);
    expect(at(2200)).toBe(2200 - half);
  });

  it('counts that half-width in flow units, so zooming out holds it in just as far', () => {
    expect(at(1000, 0.5)).toBe(1000 + half * 2);
    expect(at(1000, 2)).toBe(1000 + half / 2);
  });

  it('centres on a frame too narrow to hold the surface, which has no inside to keep it in', () => {
    const narrow = { x: 500, width: 200 };
    const point = inlineAnchorPoint({ x: 500, y: 0, width: 0, height: 0 }, 'above', 1, narrow);
    expect(point.left).toBe(600);
  });

  it('sits on the element’s centre line when no frame bounds it', () => {
    expect(inlineAnchorPoint({ x: 100, y: 200, width: 80, height: 40 }, 'above', 1).left).toBe(140);
  });

  it('leaves the anchor alone for a frame with no measured width, rather than stacking it on an edge', () => {
    for (const width of [0, Number.NaN]) {
      expect(
        inlineAnchorPoint({ x: 1600, y: 0, width: 0, height: 0 }, 'above', 1, { x: 1000, width })
          .left,
      ).toBe(1600);
    }
  });
});

describe('the anchor’s lock (ONL-2455)', () => {
  const record: InlineChatRecord = {
    anchorId: 'el-1',
    draft: '',
    expanded: true,
    entry: 'orb',
    placement: 'above',
    send: 'idle',
    refusal: null,
  };

  it('holds the open surface’s anchor, and nothing else', () => {
    expect(isAnchorLocked(record, 'el-1')).toBe(true);
    expect(isAnchorLocked(record, 'el-2')).toBe(false);
  });

  it('locks nothing with no surface open, so a gathered chip stays removable', () => {
    expect(isAnchorLocked(null, 'el-1')).toBe(false);
  });
});

describe('a whole node as the anchor', () => {
  it('grows upward by the chrome above it, in flow units at the camera’s zoom', () => {
    expect(nodeAnchorRect({ width: 400, height: 300 }, 30, 0.5)).toEqual({ x: 0, y: -60, width: 400, height: 360 });
    expect(nodeAnchorRect({ width: 400, height: 300 }, 0, 2)).toEqual({ x: 0, y: 0, width: 400, height: 300 });
  });
});
