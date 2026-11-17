export function isFrameReadable(
  frame: { x: number; y: number; width: number; height: number },
  viewport: { width: number; height: number; transform: readonly number[] },
  wasReadable = true,
): boolean {
  const [panX = 0, panY = 0, zoom = 1] = viewport.transform;
  const width = frame.width * zoom;
  const height = frame.height * zoom;
  const left = panX + frame.x * zoom;
  const top = panY + frame.y * zoom;
  const inset = wasReadable ? 0 : 32;
  return width >= (wasReadable ? 160 : 192) && height >= (wasReadable ? 100 : 120) &&
    left < viewport.width - inset && top < viewport.height - inset &&
    left + width > inset && top + height > inset;
}
