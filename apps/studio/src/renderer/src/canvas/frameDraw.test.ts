import { describe, expect, it } from 'bun:test';
import {
  beginFrameDrawPatch,
  clearFrameDrawPatch,
  updateFrameDrawPatch,
  type FrameDrawState,
} from './frameDraw.js';

const point = (x: number, y: number) => ({ x, y });

describe('frame-draw lifecycle patches', () => {
  it('begins under either drawn tool, preserving both flow and screen anchors', () => {
    const begun = {
      frameDraw: {
        anchor: point(10, 20),
        cursor: point(10, 20),
        screenAnchor: point(30, 40),
        screenCursor: point(30, 40),
      },
    };

    expect(beginFrameDrawPatch('frame', point(10, 20), point(30, 40))).toEqual(begun);
    // Drawn to a size like the Window tool, so it shares the gesture (ONL-2568).
    expect(beginFrameDrawPatch('artifact', point(10, 20), point(30, 40))).toEqual(begun);

    // The tools that are not drawn to a size begin nothing.
    expect(beginFrameDrawPatch('select', point(10, 20), point(30, 40))).toBeNull();
    expect(beginFrameDrawPatch('pan', point(10, 20), point(30, 40))).toBeNull();
    expect(beginFrameDrawPatch('text', point(10, 20), point(30, 40))).toBeNull();
  });

  it('updates the cursor and makes the null-id readout follow the drag verdict', () => {
    const frameDraw = {
      anchor: point(100, 100),
      cursor: point(100, 100),
      screenAnchor: point(100, 100),
      screenCursor: point(100, 100),
    };
    const state: FrameDrawState = {
      frameDraw,
      resizeReadout: null,
    };

    const drag = updateFrameDrawPatch(state, point(740, 500), point(740, 500));
    expect(drag).toEqual({
      frameDraw: {
        ...frameDraw,
        cursor: point(740, 500),
        screenCursor: point(740, 500),
      },
      resizeReadout: { id: null, x: 100, y: 100, width: 640, height: 400 },
    });

    expect(
      updateFrameDrawPatch(
        { ...state, resizeReadout: drag?.resizeReadout ?? null },
        point(102, 102),
        point(102, 102),
      ),
    ).toMatchObject({ resizeReadout: null });
  });

  it('clears only a live draw and the null-id readout it owns', () => {
    const frameDraw = {
      anchor: point(0, 0),
      cursor: point(600, 400),
      screenAnchor: point(0, 0),
      screenCursor: point(600, 400),
    };
    expect(clearFrameDrawPatch({ frameDraw: null, resizeReadout: null })).toBeNull();
    expect(clearFrameDrawPatch({ frameDraw, resizeReadout: { id: 'frame-a' } })).toEqual({
      frameDraw: null,
    });
    expect(
      clearFrameDrawPatch({
        frameDraw,
        resizeReadout: { id: null, x: 0, y: 0, width: 600, height: 400 },
      }),
    ).toEqual({ frameDraw: null, resizeReadout: null });
  });
});
