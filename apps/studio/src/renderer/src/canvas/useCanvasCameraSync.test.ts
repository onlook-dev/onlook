import { describe, expect, it } from 'bun:test';
import type { FrameNode } from './model.js';
import { canvasFlyToCenter, runCanvasZoomAction } from './useCanvasCameraSync.js';

describe('canvas camera synchronization decisions', () => {
  it('waits for the requested frame, then returns its center', () => {
    const nodes = [
      { id: 'a', position: { x: 10, y: 20 }, width: 300, height: 200 },
    ] as FrameNode[];
    expect(canvasFlyToCenter({ id: 'missing', seq: 1 }, nodes)).toBeNull();
    expect(canvasFlyToCenter({ id: 'a', seq: 1 }, nodes)).toEqual({ x: 160, y: 120 });
  });

  it('routes every zoom command explicitly', () => {
    const calls: string[] = [];
    const controls = {
      zoomIn: () => calls.push('in'),
      zoomOut: () => calls.push('out'),
      zoomActual: () => calls.push('reset'),
      fitAll: () => calls.push('fit'),
      fitSelection: () => calls.push('selection'),
    };
    for (const action of ['in', 'out', 'reset', 'fit', 'selection'] as const) {
      runCanvasZoomAction(action, controls);
    }
    expect(calls).toEqual(['in', 'out', 'reset', 'fit', 'selection']);
  });
});
