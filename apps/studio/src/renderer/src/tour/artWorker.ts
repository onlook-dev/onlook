/// <reference lib="webworker" />
import { paintBackdrop } from './backdrop.js';
import { paintInto } from './placeholderArt.js';

declare const self: DedicatedWorkerGlobalScope;

/** Paints tour pictures off the main thread and hands back bitmaps. */
self.onmessage = (e: MessageEvent<{ id: number; art: string; W: number; H: number }>) => {
  const { id, art, W, H } = e.data;
  try {
    const cv = new OffscreenCanvas(1, 1);
    if (art === 'backdrop') paintBackdrop(cv);
    else paintInto(cv, art, W, H);
    const bitmap = cv.transferToImageBitmap();
    self.postMessage({ id, bitmap }, [bitmap]);
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};
