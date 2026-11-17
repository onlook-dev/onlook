import type { CanvasCamera } from './canvas.js';

/** All in the tab's CSS px except `frame`, which is the embedded webview's own layout size. */
export interface CaptureGeometry {
  tab: { width: number; height: number };
  pane: { left: number; top: number };
  frame: { width: number; height: number };
  rect: { left: number; top: number; width: number; height: number };
  hidden: boolean;
}

/** The step a capture was waiting on when its deadline passed. */
export type FrameCaptureStep = 'viewport-read' | 'capture' | 'viewport-recheck';

export type CaptureAxis = 'width' | 'height';
export type NotWholeWhy = 'too-large' | 'off-tab-start' | 'off-tab';
export type PaintsWhole = { whole: true } | { whole: false; axis: CaptureAxis; why: NotWholeWhy };

const OVERDRAW = 0.15;
const SAFETY = 0.02;
const REVEAL_FILL = 1.2;
const KEPT_START = 0.9;

interface AxisRead {
  tab: number;
  frame: number;
  start: number;
  screen: number;
}

/** Chromium's `RemoteFrameView::ComputeCompositingRect` along one axis, in the frame's own px. */
function paintedSpan(axis: AxisRead): { from: number; to: number } {
  const scale = axis.screen / axis.frame;
  const viewStart = -axis.start / scale;
  const viewLength = axis.tab / scale;
  const outset = Math.ceil(viewLength * OVERDRAW);
  const enclosedStart = Math.floor(viewStart);
  const enclosedLength = Math.ceil(viewStart + viewLength) - enclosedStart;
  const length = Math.min(axis.frame, enclosedLength + 2 * outset);
  const from = Math.max(0, enclosedStart - outset);
  return { from, to: Math.min(axis.frame, from + length) };
}

function axisReads(g: CaptureGeometry, margin: number): Record<CaptureAxis, AxisRead> {
  return {
    width: { tab: g.tab.width * (1 - margin), frame: g.frame.width, start: g.rect.left, screen: g.rect.width },
    height: { tab: g.tab.height * (1 - margin), frame: g.frame.height, start: g.rect.top, screen: g.rect.height },
  };
}

function usable(g: CaptureGeometry): boolean {
  return [g.tab.width, g.tab.height, g.frame.width, g.frame.height, g.rect.width, g.rect.height].every((value) => Number.isFinite(value) && value > 0) &&
    [g.rect.left, g.rect.top].every(Number.isFinite);
}

/** The frame's px Chromium rasters for a capture, with no safety margin. */
export function paintedSize(g: CaptureGeometry): { width: number; height: number } {
  const reads = axisReads(g, 0);
  const width = paintedSpan(reads.width);
  const height = paintedSpan(reads.height);
  return { width: width.to - width.from, height: height.to - height.from };
}

export function paintsWhole(g: CaptureGeometry): PaintsWhole {
  if (!usable(g)) return { whole: false, axis: 'width', why: 'off-tab' };
  const reads = axisReads(g, SAFETY);
  for (const axis of ['width', 'height'] as const) {
    const read = reads[axis];
    const tab = axis === 'width' ? g.tab.width : g.tab.height;
    if (read.start >= tab || read.start + read.screen <= 0) return { whole: false, axis, why: 'off-tab' };
  }
  for (const axis of ['width', 'height'] as const) {
    const span = paintedSpan(reads[axis]);
    if (span.from > 0) return { whole: false, axis, why: 'off-tab-start' };
    if (span.to < reads[axis].frame) return { whole: false, axis, why: 'too-large' };
  }
  return { whole: true };
}

function keptStart(start: number, tab: number): number {
  if (start >= 0 && start <= tab * KEPT_START) return start;
  return Math.min(Math.max(start, 0), tab / 2);
}

/** The camera to capture under, or `null` when the frame already paints whole; never zooms in. */
export function captureCamera(camera: CanvasCamera, g: CaptureGeometry): CanvasCamera | null {
  if (!usable(g) || paintsWhole(g).whole) return null;
  const factor = Math.min(1, (REVEAL_FILL * g.tab.width) / g.rect.width, (REVEAL_FILL * g.tab.height) / g.rect.height);
  const left = keptStart(g.rect.left, g.tab.width);
  const top = keptStart(g.rect.top, g.tab.height);
  return {
    zoom: camera.zoom * factor,
    x: left - g.pane.left - (g.rect.left - g.pane.left - camera.x) * factor,
    y: top - g.pane.top - (g.rect.top - g.pane.top - camera.y) * factor,
  };
}

/** The geometry `captureCamera`'s camera produces, for the same frame on the same tab. */
export function geometryUnder(camera: CanvasCamera, next: CanvasCamera, g: CaptureGeometry): CaptureGeometry {
  const factor = next.zoom / camera.zoom;
  const left = g.pane.left + next.x + (g.rect.left - g.pane.left - camera.x) * factor;
  const top = g.pane.top + next.y + (g.rect.top - g.pane.top - camera.y) * factor;
  return { ...g, rect: { left, top, width: g.rect.width * factor, height: g.rect.height * factor } };
}

/** The shift where rows `[shift, n)` repeat rows `[0, n - shift)` over at least two distinct rows, or `null` (ONL-3031). */
export function repeatedRowsShift(rows: readonly string[]): number | null {
  const count = rows.length;
  for (let shift = Math.ceil(count / 4); shift < count; shift += 1) {
    if (rows[shift] !== rows[0]) continue;
    let matches = true;
    for (let row = shift; row < count; row += 1) {
      if (rows[row] !== rows[row - shift]) {
        matches = false;
        break;
      }
    }
    if (!matches) continue;
    const tail = new Set<string>();
    for (let row = shift; row < count && tail.size < 2; row += 1) tail.add(rows[row]!);
    if (tail.size >= 2) return shift;
  }
  return null;
}

/** One `requestId` for every step of one capture; an answer echoes its step, so a late one is never taken for the next. */
export interface CaptureViewRequest {
  requestId: number;
  frameId: string;
  step: 'check' | 'move' | 'restore';
}

export type CaptureViewAnswer = { requestId: number; step: CaptureViewRequest['step'] } & (
  | { state: 'in-place' | 'needs-move' | 'moved'; geometry: CaptureGeometry }
  | { state: 'restored' | 'kept' | 'busy' | 'unknown-frame' }
);
