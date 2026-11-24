import { DEFAULT_FRAME_SIZE } from './canvas-url.js';

export interface ViewRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const PLACEMENT_GAP = 100;

/** Taller than `PLACEMENT_GAP`: frame chrome hangs outside the box and is counter-scaled, so a row below needs the headroom at low zoom (ONL-2199). */
export const VERTICAL_PLACEMENT_GAP = 160;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PlacementSide = 'right' | 'below' | 'left' | 'above';

export function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function overlapsOf<T extends Rect>(rect: Rect, others: readonly T[]): T[] {
  return others.filter((other) => intersects(rect, other));
}

export function placeBeside(
  anchor: Rect,
  size: { width: number; height: number },
  occupied: readonly Rect[],
  side: PlacementSide = 'right',
  gap: number = side === 'below' || side === 'above' ? VERTICAL_PLACEMENT_GAP : PLACEMENT_GAP,
): { x: number; y: number } {
  const horizontal = side === 'right' || side === 'left';
  let candidate = horizontal
    ? {
        x: side === 'right' ? anchor.x + anchor.width + gap : anchor.x - size.width - gap,
        y: anchor.y,
      }
    : {
        x: anchor.x,
        y: side === 'below' ? anchor.y + anchor.height + gap : anchor.y - size.height - gap,
      };

  for (let tries = 0; tries <= occupied.length; tries += 1) {
    const rect = { x: candidate.x, y: candidate.y, width: size.width, height: size.height };
    const blocker = occupied.find((o) => intersects(rect, o));
    if (blocker === undefined) return candidate;
    candidate = horizontal
      ? {
          x: side === 'right' ? blocker.x + blocker.width + gap : blocker.x - size.width - gap,
          y: candidate.y,
        }
      : {
          x: candidate.x,
          y: side === 'below' ? blocker.y + blocker.height + gap : blocker.y - size.height - gap,
        };
  }
  return candidate;
}

export function nextPosition(
  existing: readonly { position: { x: number; y: number }; width?: number }[],
): { x: number; y: number } {
  const gutter = 80;
  const right = existing.reduce((max, node) => {
    const width = node.width ?? DEFAULT_FRAME_SIZE.width;
    return Math.max(max, node.position.x + width);
  }, Number.NEGATIVE_INFINITY);
  if (right === Number.NEGATIVE_INFINITY) return { x: 0, y: 0 };
  return { x: right + gutter, y: 0 };
}

export function placeNearSource(
  source: { x: number; y: number; width: number },
  size: { width: number; height: number },
  occupied: readonly { x: number; y: number }[],
): { x: number; y: number } {
  const isTaken = (p: { x: number; y: number }): boolean =>
    occupied.some((o) => Math.abs(o.x - p.x) < 1 && Math.abs(o.y - p.y) < 1);

  let candidate = { x: source.x + source.width + PLACEMENT_GAP, y: source.y };
  const step = size.width + PLACEMENT_GAP;
  for (let tries = 0; isTaken(candidate) && tries <= occupied.length; tries += 1) {
    candidate = { x: candidate.x + step, y: candidate.y };
  }
  return candidate;
}
