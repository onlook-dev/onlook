export const ZOOM_SETTLE_MS = 150;

export function scheduleSettledZoom(send: () => void): () => void {
  const timer = setTimeout(send, ZOOM_SETTLE_MS);
  return () => clearTimeout(timer);
}
