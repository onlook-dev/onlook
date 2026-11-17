import type { CanvasImageArrivalMethod, CanvasNodeId, CanvasOp } from '@studio/events';
import type { StateCreator } from 'zustand';
import { telemetryProjectFields } from '../../workspace/store.js';
import { composable, mintPageId, nextOrder, recomposed } from '../compose.js';
import type { CanvasState } from '../store.js';
import { reportImagesCreated, sendTelemetry } from '../telemetry.js';
import { dispatchCanvasOp, dispatchCanvasOps } from '../wire.js';
import { restoredImageBox } from './aspect.js';
import type { ImageRefusal, ImageRefusalNotice, PlacedImage } from './ingest.js';

export interface ImageFields {
  /** A drag carrying files, in flight anywhere in the window: the shield reads it so no drop reaches a guest (ONL-2486). */
  fileDrag: { isOverCanvas: boolean } | null;
  /** The newest refusal of an image gesture, the one the band holds; a count above one says the rest happened. */
  imageRefusal: ImageRefusalNotice | null;
}

export interface ImageActions {
  /** The stored source pixels, exactly, in one op; authors nothing for a picture already at them (ONL-2486). */
  restoreImageAspectRatio: (id: CanvasNodeId) => void;
  /** One batch, so several images arriving together are one undo step; each takes the next slot in front. `method` is the gesture that brought them, which only the seat knows. */
  placeImages: (
    images: readonly PlacedImage[],
    method: CanvasImageArrivalMethod,
  ) => CanvasNodeId[];
  raiseImageRefusal: (refusal: ImageRefusal, method: CanvasImageArrivalMethod) => void;
  dismissImageRefusal: () => void;
  noteFileDrag: (over: 'canvas' | 'elsewhere') => void;
  endFileDrag: () => void;
}

export function initialImageFields(): ImageFields {
  return { fileDrag: null, imageRefusal: null };
}

/** Module state: a refusal's identity, so the band remounts rather than staying dismissed. */
let imageRefusalSeq = 0;

export function resetImageActionsForTests(): void {
  imageRefusalSeq = 0;
}

export const createImageActions: StateCreator<CanvasState, [], [], ImageActions> = (set, get) => ({
  restoreImageAspectRatio: (id) => {
    const state = get();
    const node = state.doc?.nodes[id];
    if (node?.kind !== 'image') return;
    const box = restoredImageBox(node.content);
    if (box === null || (node.width === box.width && node.height === box.height)) return;
    state.flushNudges();
    if (!dispatchCanvasOp({ type: 'resize', id, x: node.x, y: node.y, ...box })) return;
    sendTelemetry({
      event: 'image_resized',
      properties: { ...telemetryProjectFields(), method: 'restore-aspect-ratio' },
    });
  },

  placeImages: (images, method) => {
    const state = get();
    const doc = state.doc;
    if (!doc || images.length === 0) return [];
    state.flushNudges();
    let order = nextOrder(doc);
    const pageId = mintPageId(doc, state.currentPageId);
    const ops: CanvasOp[] = images.map((image) => {
      const node = { ...image, pageId, order };
      order += 1;
      return { type: 'create', node };
    });
    // One request: main mints a single batchId for it, so the whole arrival undoes together.
    if (!dispatchCanvasOps(ops)) return [];
    const ids = images.map((image) => image.id);
    set((current) => ({
      ...recomposed(composable(current, { selectedNodeIds: ids }), current.nodes),
      // An accepted arrival is the band's other clear, beside the explicit close.
      ...(current.imageRefusal === null ? {} : { imageRefusal: null }),
    }));
    reportImagesCreated(method, images.length);
    return ids;
  },

  raiseImageRefusal: (refusal, method) => {
    imageRefusalSeq += 1;
    set({ imageRefusal: { ...refusal, seq: imageRefusalSeq } });
    // The reason and how many it stands for; `refusal.name` is the band's, and never leaves the renderer.
    sendTelemetry({
      event: 'image_refused',
      properties: {
        ...telemetryProjectFields(),
        method,
        reason: refusal.reason,
        count: refusal.count,
      },
    });
  },

  dismissImageRefusal: () => {
    if (get().imageRefusal !== null) set({ imageRefusal: null });
  },

  noteFileDrag: (over) => {
    const isOverCanvas = over === 'canvas';
    set((state) =>
      state.fileDrag !== null && state.fileDrag.isOverCanvas === isOverCanvas
        ? state
        : { fileDrag: { isOverCanvas } },
    );
  },

  endFileDrag: () => {
    if (get().fileDrag !== null) set({ fileDrag: null });
  },
});
