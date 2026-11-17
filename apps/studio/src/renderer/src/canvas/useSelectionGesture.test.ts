import { describe, expect, test } from 'bun:test';
import type { CanvasTool } from './store.js';
import { selectionGesture, selectionGestureRelease } from './useSelectionGesture.js';

const TOOLS: readonly CanvasTool[] = ['select', 'pan', 'frame', 'text'];

describe('the canvas selection box', () => {
  test('in Interact no drag and no key starts a selection box, so a press over a page always reaches it', () => {
    for (const tool of TOOLS) {
      expect(selectionGesture(tool, 'interact')).toEqual({
        selectionOnDrag: false,
        selectionKeyCode: null,
      });
    }
  });

  test('in Design a drag on empty canvas with the select tool still draws a selection box', () => {
    expect(selectionGesture('select', 'design').selectionOnDrag).toBe(true);
  });

  test('in Design a shift-click with the select tool adds to the selection rather than starting a box', () => {
    expect(selectionGesture('select', 'design').selectionKeyCode).toBeNull();
  });

  test('entering Interact ends a box still in progress and lifts the group box off the selected frames', () => {
    const stuck = {
      nodesSelectionActive: true,
      userSelectionActive: true,
      userSelectionRect: { x: 0, y: 0, width: 10, height: 10, startX: 0, startY: 0 },
    };
    expect({ ...stuck, ...selectionGestureRelease('interact') }).toEqual({
      nodesSelectionActive: false,
      userSelectionActive: false,
      userSelectionRect: null,
    });
  });

  test('entering Design leaves a selection as it stands', () => {
    expect(selectionGestureRelease('design')).toBeNull();
  });
});
