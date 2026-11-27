export function isFrameVisible(
  frame: { x: number; y: number; width: number; height: number },
  viewport: { width: number; height: number; transform: readonly number[] },
  wasVisible = true,
): boolean {
  const [panX = 0, panY = 0, zoom = 1] = viewport.transform;
  const width = frame.width * zoom;
  const height = frame.height * zoom;
  const left = panX + frame.x * zoom;
  const top = panY + frame.y * zoom;
  const inset = wasVisible ? 0 : 32;
  return left < viewport.width - inset && top < viewport.height - inset &&
    left + width > inset && top + height > inset;
}

export function isFrameReadable(
  frame: { x: number; y: number; width: number; height: number },
  viewport: { width: number; height: number; transform: readonly number[] },
  wasReadable = true,
): boolean {
  const zoom = viewport.transform[2] ?? 1;
  return frame.width * zoom >= (wasReadable ? 160 : 192) &&
    frame.height * zoom >= (wasReadable ? 100 : 120) &&
    isFrameVisible(frame, viewport, wasReadable);
}
