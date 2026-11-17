// Pure functions only — nothing here reads a store, the clock, or `window`.

export interface AspectBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Width over height; `null` for a size that cannot define one. */
export function imageAspectRatio(size: { width: number; height: number }): number | null {
  if (!Number.isFinite(size.width) || !Number.isFinite(size.height)) return null;
  if (size.width <= 0 || size.height <= 0) return null;
  return size.width / size.height;
}

/** The ratio a resize holds: the source pixels', or the stored box when the originals cannot define one. */
export function lockedAspectRatio(node: {
  width: number;
  height: number;
  content: { originalWidth: number; originalHeight: number };
}): number | null {
  const source = imageAspectRatio({
    width: node.content.originalWidth,
    height: node.content.originalHeight,
  });
  return source ?? imageAspectRatio(node);
}

/** The side the pointer moved furthest, or `null` while neither has moved a whole unit. The caller settles it once for the gesture: re-read per change, it flips where the two deltas cross and the derived side jumps (ONL-2501). */
export function drivenAspectSide(raw: AspectBox, start: AspectBox): 'width' | 'height' | null {
  const byWidth = Math.abs(raw.width - start.width);
  const byHeight = Math.abs(raw.height - start.height);
  if (byWidth < 1 && byHeight < 1) return null;
  return byHeight > byWidth ? 'height' : 'width';
}

/** The drag's box back on `ratio`: `driven` keeps its side, the other follows, and an edge the drag left alone stays where it was. */
export function lockedAspectBox(
  raw: AspectBox,
  start: AspectBox,
  ratio: number,
  driven: 'width' | 'height',
  bounds: { min: { width: number; height: number }; max: { width: number; height: number } },
): AspectBox {
  const { min, max } = bounds;
  const drivesHeight = driven === 'height';
  // The derived side has no handle to bound it, so the driven side carries both sides' floors and ceilings (ONL-2501).
  const floored = drivesHeight
    ? Math.max(raw.height, min.height, min.width / ratio)
    : Math.max(raw.width, min.width, min.height * ratio);
  const led = drivesHeight
    ? Math.min(floored, max.height, max.width / ratio)
    : Math.min(floored, max.width, max.height * ratio);
  const width = drivesHeight
    ? Math.max(1, Math.round(led * ratio))
    : Math.max(1, Math.round(led));
  const height = drivesHeight
    ? Math.max(1, Math.round(led))
    : Math.max(1, Math.round(led / ratio));
  return {
    x: raw.x === start.x ? raw.x : start.x + start.width - width,
    y: raw.y === start.y ? raw.y : start.y + start.height - height,
    width,
    height,
  };
}

/** The source pixels themselves, never a ratio re-fitted to the current box (ONL-2486). */
export function restoredImageBox(content: {
  originalWidth: number;
  originalHeight: number;
}): { width: number; height: number } | null {
  const size = { width: content.originalWidth, height: content.originalHeight };
  return imageAspectRatio(size) === null ? null : size;
}
