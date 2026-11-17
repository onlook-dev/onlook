import { intersects, nextPosition, PLACEMENT_GAP, type CanvasCamera, type ViewRect } from '@studio/events';
import type { Rect } from './choreography.js';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Insets {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface SeatPlan {
  /** Flow units: where the frame is created. */
  box: Box;
  /** Installed at the tap, before anything is on screen to jump; `null` holds the camera. */
  camera: CanvasCamera | null;
  /** Screen px relative to the pane's top-left. */
  seat: Rect;
  /** The box is off screen, so the camera brings it into view once the frame rests. */
  reveal: boolean;
}

const STEPS = 4;

/** The free box nearest the middle of what the user can see, or `null` when every one overlaps. */
function freeBoxInView(view: ViewRect, size: { width: number; height: number }, occupied: readonly Box[]): { x: number; y: number } | null {
  const spanX = view.width - size.width;
  const spanY = view.height - size.height;
  if (spanX < 0 || spanY < 0) return null;
  const stepX = size.width / STEPS;
  const stepY = size.height / STEPS;
  const centre = { x: view.x + view.width / 2, y: view.y + view.height / 2 };
  const grown = occupied.map((o) => ({ x: o.x - PLACEMENT_GAP, y: o.y - PLACEMENT_GAP, width: o.width + 2 * PLACEMENT_GAP, height: o.height + 2 * PLACEMENT_GAP }));
  let best: { x: number; y: number; d: number } | null = null;
  for (let i = 0; i <= Math.floor(spanX / stepX); i += 1) {
    for (let j = 0; j <= Math.floor(spanY / stepY); j += 1) {
      const x = view.x + i * stepX;
      const y = view.y + j * stepY;
      if (grown.some((o) => intersects({ x, y, width: size.width, height: size.height }, o))) continue;
      const d = Math.hypot(x + size.width / 2 - centre.x, y + size.height / 2 - centre.y);
      if (best === null || d < best.d) best = { x, y, d };
    }
  }
  return best === null ? null : { x: best.x, y: best.y };
}

export function screenRect(box: Box, camera: CanvasCamera): Rect {
  return { x: camera.x + box.x * camera.zoom, y: camera.y + box.y * camera.zoom, w: box.width * camera.zoom, h: box.height * camera.zoom };
}

/** The visible canvas between the rails and bars, in flow units. */
export function visibleSpan(camera: CanvasCamera, pane: { width: number; height: number }, insets: Insets): ViewRect {
  return {
    x: (insets.left - camera.x) / camera.zoom,
    y: (insets.top - camera.y) / camera.zoom,
    width: Math.max(0, pane.width - insets.left - insets.right) / camera.zoom,
    height: Math.max(0, pane.height - insets.top - insets.bottom) / camera.zoom,
  };
}

/** An empty canvas takes the first-frame fit; a populated one holds its camera and seats the frame in the open. */
export function planSeat(input: {
  occupied: readonly Box[];
  size: { width: number; height: number };
  camera: CanvasCamera;
  pane: { width: number; height: number };
  insets: Insets;
  firstFit: (box: Box) => CanvasCamera | null;
}): SeatPlan {
  const { occupied, size, camera, pane, insets } = input;
  if (occupied.length === 0) {
    const box = { x: 0, y: 0, ...size };
    const fit = input.firstFit(box) ?? camera;
    return { box, camera: fit, seat: screenRect(box, fit), reveal: false };
  }
  const open = freeBoxInView(visibleSpan(camera, pane, insets), size, occupied);
  const at = open ?? nextPosition(occupied.map((o) => ({ position: { x: o.x, y: o.y }, width: o.width })));
  const box = { ...at, ...size };
  return { box, camera: null, seat: screenRect(box, camera), reveal: open === null };
}
