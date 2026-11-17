import type { CSSProperties } from 'react';

/** React Flow's camera: a translate in pane px, then a zoom about the pane's top-left. */
export interface CanvasView {
  x: number;
  y: number;
  zoom: number;
}

/** Where the cards were opened: the camera then, and the visible canvas's span in pane px. */
export interface FollowAnchor {
  view: CanvasView;
  start: number;
  width: number;
  height: number;
}

const UNANCHORED: CSSProperties = { position: 'absolute', inset: 0 };

/**
 * Lays the layer out against the span it was opened in, so a Rail resize moves nothing, then
 * carries it by the camera's change since: a point under the layer stays on the same canvas point.
 */
export function followStyle(anchor: FollowAnchor | null, view: CanvasView, start: number): CSSProperties {
  if (anchor === null) return UNANCHORED;
  const k = view.zoom / anchor.view.zoom;
  const x = view.x - anchor.view.x * k;
  const y = view.y - anchor.view.y * k;
  return {
    position: 'absolute',
    top: 0,
    left: anchor.start - start,
    width: anchor.width,
    height: anchor.height,
    transformOrigin: `${String(-anchor.start)}px 0`,
    transform: `translate(${String(x)}px, ${String(y)}px) scale(${String(k)})`,
  };
}
