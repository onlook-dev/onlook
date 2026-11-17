import { safeScale } from './frame/geometry.js';
import { MAX_FRAME_SIZE, MIN_FRAME_SIZE, resizeCeiling, resizeFloor } from './model.js';

export interface SnapBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapGuide {
  orientation: 'vertical' | 'horizontal';
  /** The aligned line, in flow units — x for a vertical guide, y for a horizontal one. */
  position: number;
  from: number;
  to: number;
}

export interface SnapResult {
  /** One delta for the whole batch: per-node deltas break a multi-selection's geometry. */
  snapDelta: { x: number; y: number };
  guides: SnapGuide[];
}

/** Screen px; divided by the live zoom into flow units. */
export const SNAP_THRESHOLD_PX = 8;

export function candidateBoxes(
  nodes: readonly {
    id: string;
    position: { x: number; y: number };
    width?: number;
    height?: number;
  }[],
  excluded: ReadonlySet<string>,
): SnapBox[] {
  const boxes: SnapBox[] = [];
  for (const node of nodes) {
    if (excluded.has(node.id)) continue;
    boxes.push({
      x: node.position.x,
      y: node.position.y,
      width: node.width ?? 0,
      height: node.height ?? 0,
    });
  }
  return boxes;
}

function linesOf(start: number, size: number): [number, number, number] {
  return [start, start + size / 2, start + size];
}

interface AxisSnap {
  delta: number;
  line: number;
  candidate: SnapBox;
}

function snapAxis(
  draggedLines: readonly number[],
  candidates: readonly SnapBox[],
  axisLines: (box: SnapBox) => readonly number[],
  threshold: number,
): AxisSnap | null {
  let best: AxisSnap | null = null;
  for (const candidate of candidates) {
    for (const line of axisLines(candidate)) {
      for (const dragged of draggedLines) {
        const delta = line - dragged;
        if (Math.abs(delta) > threshold) continue;
        if (best === null || Math.abs(delta) < Math.abs(best.delta)) {
          best = { delta, line, candidate };
        }
      }
    }
  }
  return best;
}

function alignedAxisGuides(
  draggedStart: number,
  draggedSize: number,
  draggedCrossStart: number,
  draggedCrossSize: number,
  candidates: readonly SnapBox[],
  axisStart: (box: SnapBox) => number,
  axisSize: (box: SnapBox) => number,
  crossStart: (box: SnapBox) => number,
  crossSize: (box: SnapBox) => number,
  orientation: SnapGuide['orientation'],
  winner: AxisSnap,
): SnapGuide[] {
  const draggedLines = linesOf(draggedStart, draggedSize);
  const guides = new Map<number, SnapGuide>();

  for (const candidate of candidates) {
    const candidateLines = linesOf(axisStart(candidate), axisSize(candidate));
    for (let draggedIndex = 0; draggedIndex < draggedLines.length; draggedIndex += 1) {
      for (let candidateIndex = 0; candidateIndex < candidateLines.length; candidateIndex += 1) {
        // Prefer the two edge guides when all three lines coincide.
        if (draggedIndex === 1 && candidateIndex === 1) continue;
        const position = candidateLines[candidateIndex];
        if (position !== draggedLines[draggedIndex]) continue;
        const from = Math.min(draggedCrossStart, crossStart(candidate));
        const to = Math.max(
          draggedCrossStart + draggedCrossSize,
          crossStart(candidate) + crossSize(candidate),
        );
        const existing = guides.get(position);
        guides.set(position, {
          orientation,
          position,
          from: Math.min(existing?.from ?? from, from),
          to: Math.max(existing?.to ?? to, to),
        });
      }
    }
  }

  if (guides.size > 0) return [...guides.values()];
  return [
    {
      orientation,
      position: winner.line,
      from: Math.min(draggedCrossStart, crossStart(winner.candidate)),
      to: Math.max(
        draggedCrossStart + draggedCrossSize,
        crossStart(winner.candidate) + crossSize(winner.candidate),
      ),
    },
  ];
}

export function computeSnap(
  dragged: SnapBox,
  candidates: readonly SnapBox[],
  zoom: number,
): SnapResult {
  return snapWithin(dragged, candidates, SNAP_THRESHOLD_PX / safeScale(zoom));
}

/** A moving selection snaps and aligns by its outer edges, not by whichever member leads. */
export function boundingBox(boxes: readonly SnapBox[]): SnapBox | null {
  if (boxes.length === 0) return null;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const box of boxes) {
    left = Math.min(left, box.x);
    top = Math.min(top, box.y);
    right = Math.max(right, box.x + box.width);
    bottom = Math.max(bottom, box.y + box.height);
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Flow units: a nudge lands on whole pixels, so anything closer than this is the same line. */
const EXACT_ALIGNMENT = 0.01;

/** The guides a box already sits on, pulling it nowhere: what an arrow-key nudge shows when it lands exactly in line. */
export function exactAlignmentGuides(box: SnapBox, candidates: readonly SnapBox[]): SnapGuide[] {
  return snapWithin(box, candidates, EXACT_ALIGNMENT).guides;
}

function snapWithin(dragged: SnapBox, candidates: readonly SnapBox[], threshold: number): SnapResult {
  const bestX = snapAxis(
    linesOf(dragged.x, dragged.width),
    candidates,
    (box) => linesOf(box.x, box.width),
    threshold,
  );
  const bestY = snapAxis(
    linesOf(dragged.y, dragged.height),
    candidates,
    (box) => linesOf(box.y, box.height),
    threshold,
  );

  const snapDelta = { x: bestX?.delta ?? 0, y: bestY?.delta ?? 0 };
  const snappedX = dragged.x + snapDelta.x;
  const snappedY = dragged.y + snapDelta.y;
  const guides: SnapGuide[] = [];
  if (bestX) {
    guides.push(
      ...alignedAxisGuides(
        snappedX,
        dragged.width,
        snappedY,
        dragged.height,
        candidates,
        (box) => box.x,
        (box) => box.width,
        (box) => box.y,
        (box) => box.height,
        'vertical',
        bestX,
      ),
    );
  }
  if (bestY) {
    guides.push(
      ...alignedAxisGuides(
        snappedY,
        dragged.height,
        snappedX,
        dragged.width,
        candidates,
        (box) => box.y,
        (box) => box.height,
        (box) => box.x,
        (box) => box.width,
        'horizontal',
        bestY,
      ),
    );
  }
  return { snapDelta, guides };
}

export interface ResizeSnapResult {
  box: SnapBox;
  guides: SnapGuide[];
}

// The control's start size is the measured integer box while the document's is fractional: drift under a unit is not a gesture.
const MOVED_BEYOND = 0.25;

function movingEdge(
  rawPosition: number,
  startPosition: number,
  rawSize: number,
  startSize: number,
): 'start' | 'end' | null {
  if (Math.abs(rawPosition - startPosition) > MOVED_BEYOND) return 'start';
  if (Math.abs(rawSize - startSize) > MOVED_BEYOND) return 'end';
  return null;
}

/** Edges only: a halt on a neighbour's midline reads as a mystery stop. */
function edgeLinesOf(start: number, size: number): [number, number] {
  return [start, start + size];
}

export function computeResizeSnap(
  raw: SnapBox,
  start: SnapBox,
  candidates: readonly SnapBox[],
  zoom: number,
): ResizeSnapResult {
  const threshold = SNAP_THRESHOLD_PX / safeScale(zoom);
  const box: SnapBox = { ...raw };
  const guides: SnapGuide[] = [];
  const minWidth = resizeFloor(MIN_FRAME_SIZE.width, start.width);
  const minHeight = resizeFloor(MIN_FRAME_SIZE.height, start.height);
  const maxWidth = resizeCeiling(MAX_FRAME_SIZE.width, start.width);
  const maxHeight = resizeCeiling(MAX_FRAME_SIZE.height, start.height);

  const edgeX = movingEdge(raw.x, start.x, raw.width, start.width);
  let lineX: AxisSnap | null = null;
  if (edgeX !== null) {
    const value = edgeX === 'start' ? raw.x : raw.x + raw.width;
    const best = snapAxis(
      [value],
      candidates,
      (candidate) => edgeLinesOf(candidate.x, candidate.width),
      threshold,
    );
    if (best) {
      const width = edgeX === 'start' ? raw.width - best.delta : raw.width + best.delta;
      if (width >= minWidth && width <= maxWidth) {
        box.width = width;
        if (edgeX === 'start') box.x = raw.x + best.delta;
        lineX = best;
      }
    }
  }

  const edgeY = movingEdge(raw.y, start.y, raw.height, start.height);
  let lineY: AxisSnap | null = null;
  if (edgeY !== null) {
    const value = edgeY === 'start' ? raw.y : raw.y + raw.height;
    const best = snapAxis(
      [value],
      candidates,
      (candidate) => edgeLinesOf(candidate.y, candidate.height),
      threshold,
    );
    if (best) {
      const height = edgeY === 'start' ? raw.height - best.delta : raw.height + best.delta;
      if (height >= minHeight && height <= maxHeight) {
        box.height = height;
        if (edgeY === 'start') box.y = raw.y + best.delta;
        lineY = best;
      }
    }
  }

  if (lineX) {
    guides.push({
      orientation: 'vertical',
      position: lineX.line,
      from: Math.min(box.y, lineX.candidate.y),
      to: Math.max(box.y + box.height, lineX.candidate.y + lineX.candidate.height),
    });
  }
  if (lineY) {
    guides.push({
      orientation: 'horizontal',
      position: lineY.line,
      from: Math.min(box.x, lineY.candidate.x),
      to: Math.max(box.x + box.width, lineY.candidate.x + lineY.candidate.width),
    });
  }
  return { box, guides };
}
