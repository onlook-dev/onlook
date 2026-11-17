import { describe, expect, it } from 'bun:test';
import { arrivalFit, documentEarnsFit, pageOpenCamera } from './mountFit.js';

describe('the camera a page opens at (ONL-2488)', () => {
  const VIEWPORT = { width: 1200, height: 800 };
  const ZOOM = { min: 0.05, max: 0.9 };
  const PADDING = { left: '0px', right: '0px', top: '0px', bottom: '0px' } as const;
  const place = (boxes: { x: number; y: number; width: number; height: number }[]) =>
    pageOpenCamera({ boxes, viewport: VIEWPORT, zoom: ZOOM, padding: PADDING });

  it('centres the objects it is given, reading their own boxes rather than a measurement', () => {
    // 400×400 at the origin: the shorter axis decides, so 800/400 = 2, clamped to the 0.9 cap.
    const camera = place([{ x: 0, y: 0, width: 400, height: 400 }]);
    expect(camera).toEqual({ x: 600 - 200 * 0.9, y: 400 - 200 * 0.9, zoom: 0.9 });
  });

  it('takes the union of every object, so one far object still comes into view', () => {
    const near = place([{ x: 0, y: 0, width: 100, height: 100 }]);
    const far = place([
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 4000, y: 0, width: 100, height: 100 },
    ]);
    expect(near?.zoom).toBe(0.9);
    // 4100 wide against 1200 of viewport: the union forces it out, which the single box never would.
    expect(far?.zoom).toBeLessThan(0.3);
  });

  it('never answers for a page with nothing on it, or a pane with no size yet', () => {
    expect(place([])).toBeNull();
    expect(
      pageOpenCamera({
        boxes: [{ x: 0, y: 0, width: 10, height: 10 }],
        viewport: { width: 0, height: 0 },
        zoom: ZOOM,
        padding: PADDING,
      }),
    ).toBeNull();
  });

  it('declines a union with no area rather than dividing by it', () => {
    expect(place([{ x: 10, y: 10, width: 0, height: 0 }])).toBeNull();
  });

  it('keeps the zoom inside the bounds it is given', () => {
    const camera = place([{ x: 0, y: 0, width: 400_000, height: 400_000 }]);
    expect(camera?.zoom).toBe(ZOOM.min);
  });
});

describe('the fit a document opening earns (ONL-2486)', () => {
  it('fits a canvas that opens with content and no saved camera', () => {
    expect(documentEarnsFit({ hasRestoredViewport: false, nodeCount: 3 })).toBe(true);
  });

  it('leaves a saved camera alone, however much the canvas holds', () => {
    expect(documentEarnsFit({ hasRestoredViewport: true, nodeCount: 3 })).toBe(false);
  });

  it('fits nothing for a canvas that opens empty, so a later arrival cannot inherit the move', () => {
    expect(documentEarnsFit({ hasRestoredViewport: false, nodeCount: 0 })).toBe(false);
  });
});

describe('the fit an arrival onto an empty canvas earns (ONL-2486, ONL-2960)', () => {
  const arrival = (over: Partial<Parameters<typeof arrivalFit>[0]> = {}) =>
    arrivalFit({ hasRestoredViewport: false, previousNodeCount: 0, kind: 'browser', author: 'user', ...over });

  it('places the first frame the user makes', () => {
    expect(arrival()).toBe('place');
  });

  it('leaves the camera where it is for a label or a picture the user placed', () => {
    expect(arrival({ kind: 'text' })).toBe('none');
    expect(arrival({ kind: 'image' })).toBe('none');
  });

  it("leaves a saved camera alone for the user's own frame", () => {
    expect(arrival({ hasRestoredViewport: true })).toBe('none');
  });

  it("flies to the agent's first object of any kind, over a camera saved on the empty page", () => {
    for (const kind of ['browser', 'artifact', 'text', 'image', 'section'] as const) {
      expect(arrival({ kind, author: 'agent', hasRestoredViewport: true })).toBe('fly');
    }
  });

  it("flies to the frame Studio places for the agent's setup", () => {
    expect(arrival({ author: 'system', hasRestoredViewport: true })).toBe('fly');
  });

  it('moves for nothing once the canvas already holds something', () => {
    expect(arrival({ previousNodeCount: 1 })).toBe('none');
    expect(arrival({ previousNodeCount: 1, author: 'agent', kind: 'artifact' })).toBe('none');
  });
});
