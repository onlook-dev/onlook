// A `<webview>` is a separate native surface: the host gets no mouse events over it, not even `mouseup` (ONL-1863).
import type { CanvasTool } from '../store.js';
// No picking axis: the picker forwards coordinates and never drops the shield, since CSS `:hover` follows the real pointer.
// The text tool needs no clause of its own: it is armed in Design alone, which already shields (ONL-2486).
// A file drag has its own clause because it is the one gesture reachable in Interact, where a drop would navigate the guest (ONL-2486).
export function isGuestShielded(frame: {
  isResizing: boolean;
  tool: CanvasTool;
  isSpacePanning: boolean;
  mode: 'design' | 'interact';
  isFileDragging: boolean;
}): boolean {
  if (frame.isResizing || frame.tool === 'pan' || frame.isSpacePanning || frame.isFileDragging) {
    return true;
  }
  return frame.mode === 'design';
}

/** Space-pan and resize are not inputs: `isPickSuppressed` drops those at the release, so a momentary pan cannot cancel the reach (ONL-2455). */
export function isPickerLive(frame: {
  tool: CanvasTool;
  mode: 'design' | 'interact';
  isExportMode?: boolean;
}): boolean {
  return frame.mode === 'design' && frame.tool === 'select' && frame.isExportMode !== true;
}

export function isPickSuppressed(gesture: {
  isResizing: boolean;
  tool: CanvasTool;
  isSpacePanning: boolean;
  isDrawingFrame: boolean;
  isDuplicateDragging: boolean;
}): boolean {
  return (
    gesture.isResizing ||
    gesture.tool !== 'select' ||
    gesture.isSpacePanning ||
    gesture.isDrawingFrame ||
    gesture.isDuplicateDragging
  );
}

const ADDRESS_MAX_WIDTH = 342;

/** How many more controls the toolbar's left group holds than its right one, which holds only the menu. */
export function leadingControlSurplus(frame: { canGoBack: boolean; canGoForward: boolean }): number {
  return Number(frame.canGoBack) + Number(frame.canGoForward);
}

// Tuned by eye, not derived from `ADDRESS_MAX_WIDTH`: the derived 406 cost a 1512 frame its controls until zoom 0.27.
const CHROME_COMPACT_BELOW = 300;

export function isChromeCompact(frameScreenWidth: number): boolean {
  return frameScreenWidth < CHROME_COMPACT_BELOW;
}

const CHROME_BAR_HEIGHT = 24;
const CHROME_GAP = 6;

/** Screen px from the frame's top edge to the top of its chrome. */
export const FRAME_CHROME_ABOVE = CHROME_BAR_HEIGHT + CHROME_GAP;

export function isAddressUnderModeSwitch(bar: {
  /** Canvas-pane px. */
  frameTop: number;
  /** Canvas-pane px. */
  frameLeft: number;
  /** Screen px. */
  frameWidth: number;
  /** Pane px. */
  bandBottom: number;
  /** The switch's reserved span, in pane px. */
  switchStart: number;
  switchEnd: number;
}): boolean {
  const barBottom = bar.frameTop - CHROME_GAP;
  const barTop = barBottom - CHROME_BAR_HEIGHT;
  if (barTop >= bar.bandBottom || barBottom <= 0) return false;

  const width = Math.min(ADDRESS_MAX_WIDTH, bar.frameWidth);
  const centre = bar.frameLeft + bar.frameWidth / 2;

  return centre - width / 2 < bar.switchEnd && centre + width / 2 > bar.switchStart;
}

// Unclamped, where the library's resize handles clamp with `max`: a bar is read, not grabbed, and `max` paints it 96px tall at zoom 4 (ONL-1862).
export function chromeScale(zoom: number): number {
  return 1 / zoom;
}

// Below this the counter-scaled bars are a wall over postage-stamp frames.
export const CHROME_MIN_ZOOM = 0.18;

export function isChromeVisible(frame: { zoom: number; isSelected: boolean }): boolean {
  return frame.isSelected || frame.zoom >= CHROME_MIN_ZOOM;
}

export function frameRingScale(zoom: number): number {
  return 1 / Math.max(zoom, 0.01);
}

// d3-zoom's rate, with the ×10 d3 applies to a `ctrlKey` wheel: a pinch's deltas are an order of magnitude smaller than a wheel notch.
const WHEEL_RATE = 0.002;
const PINCH_FACTOR = 10;

export function zoomAboutCanvasPoint(
  viewport: { x: number; y: number; zoom: number },
  point: { x: number; y: number },
  deltaY: number,
  isPinch: boolean,
  bounds: { min: number; max: number },
): { x: number; y: number; zoom: number } {
  const rate = WHEEL_RATE * (isPinch ? PINCH_FACTOR : 1);
  const zoom = Math.min(
    bounds.max,
    Math.max(bounds.min, viewport.zoom * Math.pow(2, -deltaY * rate)),
  );
  return {
    zoom,
    x: viewport.x + point.x * viewport.zoom - point.x * zoom,
    y: viewport.y + point.y * viewport.zoom - point.y * zoom,
  };
}

export function safeScale(scale: number): number {
  return scale > 0 && Number.isFinite(scale) ? scale : 1;
}

export function guestPointFrom(
  client: { x: number; y: number },
  shieldRect: { left: number; top: number },
  canvasZoom: number,
  guestZoom: number,
): { x: number; y: number } {
  // Main pins guests to 1, but Chromium can apply a persisted per-origin zoom before the pin runs on a fresh document (ONL-1989).
  const divisor = safeScale(canvasZoom) * safeScale(guestZoom);
  return {
    x: (client.x - shieldRect.left) / divisor,
    y: (client.y - shieldRect.top) / divisor,
  };
}

export function frameLocalFromGuest(
  guest: { x: number; y: number },
  guestZoom: number,
): { x: number; y: number } {
  const scale = safeScale(guestZoom);
  return { x: guest.x * scale, y: guest.y * scale };
}

export function readGuestZoom(element: { getZoomFactor(): number } | null | undefined): number {
  if (!element) return 1;
  try {
    return element.getZoomFactor();
  } catch {
    // `getZoomFactor` throws on a guest that is not attached yet.
    return 1;
  }
}
