export interface ScreenBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface MarkRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const MARK_GAP = 2;
export const MARK_WEIGHT = 2;
export const MARK_ARM = 11;

/** A box any part of which is in view draws nothing. */
export function offscreenMarks(box: ScreenBox, view: ScreenBox): MarkRect[] {
  if (view.right - view.left <= 2 * (MARK_GAP + MARK_ARM) || view.bottom - view.top <= 2 * (MARK_GAP + MARK_ARM)) {
    return [];
  }
  const isLeft = box.right <= view.left;
  const isRight = box.left >= view.right;
  const isAbove = box.bottom <= view.top;
  const isBelow = box.top >= view.bottom;
  const isOutX = isLeft || isRight;
  const isOutY = isAbove || isBelow;
  if (!isOutX && !isOutY) return [];

  const inLeft = view.left + MARK_GAP;
  const inRight = view.right - MARK_GAP;
  const inTop = view.top + MARK_GAP;
  const inBottom = view.bottom - MARK_GAP;

  if (isOutX && isOutY) {
    const x = isLeft ? inLeft : inRight - MARK_ARM;
    const y = isAbove ? inTop : inBottom - MARK_ARM;
    const stemX = isLeft ? inLeft : inRight - MARK_WEIGHT;
    const barY = isAbove ? inTop : inBottom - MARK_WEIGHT;
    return [
      { x, y: barY, width: MARK_ARM, height: MARK_WEIGHT },
      { x: stemX, y, width: MARK_WEIGHT, height: MARK_ARM },
    ];
  }

  if (isOutY) {
    const [x, width] = span(box.left, box.right, inLeft, inRight);
    return [{ x, y: isAbove ? inTop : inBottom - MARK_WEIGHT, width, height: MARK_WEIGHT }];
  }

  const [y, height] = span(box.top, box.bottom, inTop, inBottom);
  return [{ x: isLeft ? inLeft : inRight - MARK_WEIGHT, y, width: MARK_WEIGHT, height }];
}

/** Never shorter than a corner's arm: a sliver at a corner read as noise. */
function span(from: number, to: number, min: number, max: number): [number, number] {
  let start = Math.max(from, min);
  let end = Math.min(to, max);
  if (end - start < MARK_ARM) {
    const center = Math.min(Math.max((start + end) / 2, min + MARK_ARM / 2), max - MARK_ARM / 2);
    start = center - MARK_ARM / 2;
    end = center + MARK_ARM / 2;
  }
  return [start, end - start];
}
