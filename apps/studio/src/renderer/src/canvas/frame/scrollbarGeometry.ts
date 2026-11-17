import type { FrameScrollMetrics } from '@studio/events';

export function clamp(top: number, range: number): number {
  return Math.max(0, Math.min(range, top));
}

/** The selected Frame, or the one under the pointer while S is held; design mode, a live page of its own (ONL-2793, ONL-2960). */
export function scrollbarEligible(frame: {
  armed: boolean;
  isScrollKeyOn: boolean;
  mode: string;
  exporting: boolean;
  hasGuest: boolean;
  health: string;
}): boolean {
  return (frame.armed || frame.isScrollKeyOn) && frame.mode === 'design' && !frame.exporting && frame.hasGuest && frame.health === 'live';
}

export function scrollbarGeometry(metrics: Pick<FrameScrollMetrics, 'top' | 'height' | 'viewport'>, track: number): {
  thumb: number;
  travel: number;
  top: number;
  range: number;
} {
  const range = Math.max(0, metrics.height - metrics.viewport);
  const thumb = Math.min(track, Math.max(32, track * metrics.viewport / metrics.height));
  const travel = Math.max(0, track - thumb);
  return { thumb, travel, range, top: range > 0 ? Math.max(0, Math.min(1, metrics.top / range)) * travel : 0 };
}

const LINE_PX = 16;

/** Page px a wheel over the selected Frame scrolls its page by, or null when the canvas keeps it: a pinch or ⌘ zooms, a sideways swipe pans. */
export function wheelPageDelta(
  wheel: { deltaX: number; deltaY: number; deltaMode: number; ctrlKey: boolean; metaKey: boolean },
  canvasZoom: number,
  viewport: number,
): number | null {
  if (wheel.ctrlKey || wheel.metaKey || Math.abs(wheel.deltaX) > Math.abs(wheel.deltaY)) return null;
  const unit = wheel.deltaMode === 1 ? LINE_PX : wheel.deltaMode === 2 ? viewport : 1 / (canvasZoom > 0 && Number.isFinite(canvasZoom) ? canvasZoom : 1);
  return wheel.deltaY * unit;
}
