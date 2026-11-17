/** The stack order a design takes when dropped at `index` in the list read front first; `null` when it would not move. Its neighbours keep theirs: the midpoint needs no renumbering. */
export function orderForDrop(
  frontFirst: readonly { id: string; order: number }[],
  id: string,
  index: number,
): number | null {
  const from = frontFirst.findIndex((entry) => entry.id === id);
  if (from === -1) return null;
  const rest = frontFirst.filter((entry) => entry.id !== id);
  // `index` counts gaps in the full list; past the dragged row, one of them was its own.
  const at = index > from ? index - 1 : index;
  if (at === from) return null;
  const above = rest[at - 1];
  const below = rest[at];
  if (above !== undefined && below !== undefined) return (above.order + below.order) / 2;
  if (below !== undefined) return below.order + 1;
  if (above !== undefined) return above.order - 1;
  return null;
}

/** Screen px a press must travel before it is a drag; a smaller move is a click. */
export const DRAG_THRESHOLD = 4;

export function isDragArmed(startY: number, pointerY: number): boolean {
  return Math.abs(pointerY - startY) >= DRAG_THRESHOLD;
}

/** The gap a pointer is nearest, counted over the whole list: 0 is above the first row, `midlines.length` below the last. */
export function dropIndexAt(midlines: readonly number[], pointerY: number): number {
  return midlines.filter((midline) => midline < pointerY).length;
}

export interface DropMark {
  edge: 'before' | 'after';
  /** The first row's top or the last row's bottom, where a scrolling list clips anything past it. */
  isAtListEnd: boolean;
}

/** Where row `row` of `count` draws the line for a drag aimed at gap `index`, or null when it draws none: the gap below the last row goes on that row's bottom, every other gap on the top of the row below it. */
export function dropMarkFor(index: number, row: number, count: number): DropMark | null {
  if (index === row) return { edge: 'before', isAtListEnd: row === 0 };
  if (index === count && row === count - 1) return { edge: 'after', isAtListEnd: true };
  return null;
}
