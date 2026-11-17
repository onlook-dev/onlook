import { PICKER_INK } from './elements.js';

export interface MeasureBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface MeasureSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** A measured gap, and the dashed extension that carries its far end to the target's edge when the two boxes do not line up. */
export interface Measurement {
  line: MeasureSegment;
  value: number;
  support?: MeasureSegment;
}

const MIN_GAP = 0.5;

/** Screen px: a longer dash than a CSS `dashed` border gives a 1px line, so an extension reads at a glance. */
const DASH = 6;
const GAP = 4;

export interface MeasureLineBox {
  left: number;
  top: number;
  width: number;
  height: number;
  background: string;
}

/** A measure line as a box, one screen px thick at `scale` (1/zoom), centred on its segment; dashed for an extension. */
export function measureLineBox(segment: MeasureSegment, scale: number, isDashed: boolean): MeasureLineBox {
  const isHorizontal = segment.y1 === segment.y2;
  const dash = DASH * scale;
  const period = (DASH + GAP) * scale;
  return {
    left: Math.min(segment.x1, segment.x2) - (isHorizontal ? 0 : scale / 2),
    top: Math.min(segment.y1, segment.y2) - (isHorizontal ? scale / 2 : 0),
    width: isHorizontal ? Math.abs(segment.x2 - segment.x1) : scale,
    height: isHorizontal ? scale : Math.abs(segment.y2 - segment.y1),
    background: isDashed
      ? `repeating-linear-gradient(${isHorizontal ? 'to right' : 'to bottom'}, ${PICKER_INK} 0 ${String(dash)}px, transparent ${String(dash)}px ${String(period)}px)`
      : PICKER_INK,
  };
}

/** The canvas size badge's shape in the picker's red with white ink, as literals: the user's page carries none of the app's tokens. */
export const MEASURE_TAG_STYLE = {
  padding: '3px 6px',
  borderRadius: '4px',
  cornerShape: 'superellipse(1.5)',
  backgroundColor: PICKER_INK,
  color: '#ffffff',
  font: '500 10px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
} as const;

/** The ⌥-hover distances from `from` (the selection) to `to` (the hovered element), in the boxes' own units. */
export function measureBetween(from: MeasureBox, to: MeasureBox): Measurement[] {
  return [...along('x', from, to), ...along('y', from, to)];
}

function along(axis: 'x' | 'y', from: MeasureBox, to: MeasureBox): Measurement[] {
  const [start, end, crossStart, crossEnd] =
    axis === 'x' ? (['left', 'right', 'top', 'bottom'] as const) : (['top', 'bottom', 'left', 'right'] as const);
  const cross = overlap(from[crossStart], from[crossEnd], to[crossStart], to[crossEnd]);
  const at = cross === null ? (from[crossStart] + from[crossEnd]) / 2 : (cross[0] + cross[1]) / 2;
  const edges: Array<[number, number]> = [];
  if (to[end] <= from[start]) edges.push([from[start], to[end]]);
  else if (to[start] >= from[end]) edges.push([from[end], to[start]]);
  // Overlapping on this axis: the inset on each side, and only when the boxes actually meet; stacked boxes measure on the other axis alone.
  else if (cross !== null) edges.push([from[start], to[start]], [from[end], to[end]]);

  const measurements: Measurement[] = [];
  for (const [a, b] of edges) {
    const value = Math.abs(b - a);
    if (value < MIN_GAP) continue;
    const line = segment(axis, a, b, at);
    const measurement: Measurement = { line, value };
    if (at < to[crossStart] || at > to[crossEnd]) {
      const edge = at < to[crossStart] ? to[crossStart] : to[crossEnd];
      measurement.support = segment(axis === 'x' ? 'y' : 'x', edge, at, b);
    }
    measurements.push(measurement);
  }
  return measurements;
}

function overlap(aStart: number, aEnd: number, bStart: number, bEnd: number): [number, number] | null {
  const low = Math.max(aStart, bStart);
  const high = Math.min(aEnd, bEnd);
  return low <= high ? [low, high] : null;
}

/** Along `axis` from `a` to `b`, at `at` on the other axis. */
function segment(axis: 'x' | 'y', a: number, b: number, at: number): MeasureSegment {
  return axis === 'x' ? { x1: a, y1: at, x2: b, y2: at } : { x1: at, y1: a, x2: at, y2: b };
}
