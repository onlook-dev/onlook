// Pure functions only — nothing here reads a store, the clock, or `window`.

import { getViewportForBounds } from '@xyflow/react';
import type { CanvasCamera, CanvasNode, CanvasOpAuthor } from '@studio/events';

/** A restored viewport is the user's own position, so only a canvas opening without one is the camera's to place (ONL-2486). */
export function documentEarnsFit(input: {
  hasRestoredViewport: boolean;
  nodeCount: number;
}): boolean {
  return !input.hasRestoredViewport && input.nodeCount > 0;
}

export interface PlacedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** `fitView`'s own arithmetic over the document's boxes; `fitView` itself only queues until React Flow has measured, which is a frame too late (ONL-2488). */
export function pageOpenCamera(input: {
  boxes: readonly PlacedBox[];
  viewport: { width: number; height: number };
  zoom: { min: number; max: number };
  padding: Parameters<typeof getViewportForBounds>[5];
}): CanvasCamera | null {
  if (input.boxes.length === 0 || input.viewport.width <= 0 || input.viewport.height <= 0) {
    return null;
  }
  const left = Math.min(...input.boxes.map((box) => box.x));
  const top = Math.min(...input.boxes.map((box) => box.y));
  const right = Math.max(...input.boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...input.boxes.map((box) => box.y + box.height));
  const width = right - left;
  const height = bottom - top;
  // A union with no area divides to Infinity; the library's own fit is the better answer there.
  if (width <= 0 || height <= 0) return null;
  return getViewportForBounds(
    { x: left, y: top, width, height },
    input.viewport.width,
    input.viewport.height,
    input.zoom.min,
    input.zoom.max,
    input.padding,
  );
}

export type ArrivalFit = 'none' | 'place' | 'fly';

/**
 * The first object on an empty page comes into view. The agent's or Studio's is flown to whatever camera was saved over the
 * emptiness, since nobody chose it; a frame the user made is placed only on a page with no saved camera, and their label or
 * picture stays where they put it (ONL-2486, ONL-2960).
 */
export function arrivalFit(input: {
  hasRestoredViewport: boolean;
  previousNodeCount: number;
  kind: CanvasNode['kind'];
  author: CanvasOpAuthor;
}): ArrivalFit {
  if (input.previousNodeCount > 0) return 'none';
  if (input.author !== 'user') return 'fly';
  return !input.hasRestoredViewport && input.kind === 'browser' ? 'place' : 'none';
}
