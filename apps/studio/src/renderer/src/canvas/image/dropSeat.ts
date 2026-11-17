// The seat for the canvas's file gestures: the only part of the image path that touches the DOM or a bridge.
// Decisions live in `ingest.ts`; this reads the events, hands them over, and applies the outcome.

import { useCallback, useEffect } from 'react';
import type { CanvasImageArrivalMethod, ViewRect } from '@studio/events';
import { decodeImageSize, resolveImage } from '../../chat/imageCache.js';
import { dragCarriesFiles } from '../../chat/imageDrop.js';
import { t } from '@studio/i18n';
import { log } from '../../log.js';
import { useLatestRef } from '../../useLatestRef.js';
import { canvasImageProjectRoot, useWorkspaceStore } from '../../workspace/store.js';
import { windowViewRect } from '../placement.js';
import { useCanvasStore } from '../store.js';
import { PROJECT_IMAGE_DRAG_TYPE, projectImageDrag, projectImageSource, type ProjectImageDrag } from './projectFileDrag.js';
import {
  ingestImageFiles,
  ingestPickedImages,
  type ImageIngestDeps,
  type ImageIngestOutcome,
  type ImageIngestPoint,
  type ImageIngestSource,
} from './ingest.js';
import { studio } from '../../bridge.js';

const seatLog = log('canvas');

/** React Flow's root; every frame's shield renders inside it, so a drop over a live frame lands here. */
const CANVAS_REGION_SELECTOR = '.react-flow';

interface Closest {
  closest(selectors: string): unknown;
}

export function isOverCanvasRegion(target: Closest | null): boolean {
  return target !== null && target.closest(CANVAS_REGION_SELECTOR) !== null;
}

/** A drag leaving the window's own box, not crossing between two host elements, which fires constantly mid-drag. */
export function isLeavingWindow(
  point: { x: number; y: number },
  size: { innerWidth: number; innerHeight: number },
): boolean {
  return (
    point.x <= 0 || point.y <= 0 || point.x >= size.innerWidth || point.y >= size.innerHeight
  );
}

/** The pointer's own flow point, or the visible rect's centre when the pointer is off the canvas. */
export function imageDropPoint(
  pointer: { x: number; y: number } | null,
  view: ViewRect,
): { x: number; y: number } {
  return pointer ?? { x: view.x + view.width / 2, y: view.y + view.height / 2 };
}

/** ONE request per gesture: main mints one `batchId`, so the whole arrival is one undo step (ONL-2486). */
export async function applyImageIngest(
  pending: Promise<ImageIngestOutcome>,
  method: CanvasImageArrivalMethod,
): Promise<void> {
  const outcome = await pending;
  const store = useCanvasStore.getState();
  if (outcome.images.length > 0) store.placeImages(outcome.images, method);
  if (outcome.refusal !== undefined) store.raiseImageRefusal(outcome.refusal, method);
}

export function elementOf(target: EventTarget | null): Closest | null {
  return target instanceof Element ? target : null;
}

export function sourceFromFile(file: File): ImageIngestSource {
  return {
    name: file.name,
    size: file.size,
    bytes: async () => new Uint8Array(await file.arrayBuffer()),
  };
}

function itemsOf(transfer: DataTransfer | null): { kind: string; type: string }[] {
  if (!transfer) return [];
  return Array.from(transfer.items, (item) => ({ kind: item.kind, type: item.type }));
}

export interface CanvasFileSeatHandlers {
  onDrag: (over: 'canvas' | 'elsewhere') => void;
  onDragEnd: () => void;
  onDrop: (files: readonly ImageIngestSource[], pointer: { x: number; y: number }) => void;
  onProjectImageDrop: (image: ProjectImageDrag, pointer: { x: number; y: number }) => void;
}

/** Capture phase throughout: the canvas runs before the composer's own document hook and stops what falls on its region, so one target is lit (ONL-2486). */
export function installCanvasFileSeat(
  doc: Document,
  win: Window,
  handlers: CanvasFileSeatHandlers,
): () => void {
  const controller = new AbortController();
  const options = { signal: controller.signal, capture: true } as const;
  const carriesProjectImage = (transfer: DataTransfer | null): boolean => transfer?.types.includes(PROJECT_IMAGE_DRAG_TYPE) === true;
  const carriesImages = (transfer: DataTransfer | null): boolean => carriesProjectImage(transfer) || dragCarriesFiles(itemsOf(transfer));

  const claim = (event: DragEvent): 'canvas' | 'elsewhere' => {
    const over = isOverCanvasRegion(elementOf(event.target)) ? 'canvas' : 'elsewhere';
    handlers.onDrag(over);
    return over;
  };

  const onDragEnter = (event: DragEvent): void => {
    if (!carriesImages(event.dataTransfer)) return;
    // Un-cancelled, a file drag replaces the window with that file.
    event.preventDefault();
    if (claim(event) === 'canvas') event.stopPropagation();
  };

  const onDragOver = (event: DragEvent): void => {
    if (!carriesImages(event.dataTransfer)) return;
    // Without this the drop never fires.
    event.preventDefault();
    if (claim(event) !== 'canvas') return;
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    event.stopPropagation();
  };

  // Never stopped: the composer counts its own enters and leaves, and a stop here would leave it lit.
  const onDragLeave = (event: DragEvent): void => {
    if (isLeavingWindow({ x: event.clientX, y: event.clientY }, win)) handlers.onDragEnd();
  };

  const onDrop = (event: DragEvent): void => {
    const carriesFiles = carriesImages(event.dataTransfer);
    const isOurs = carriesFiles && isOverCanvasRegion(elementOf(event.target));
    if (isOurs) {
      event.preventDefault();
      event.stopPropagation();
      const pointer = { x: event.clientX, y: event.clientY };
      if (carriesProjectImage(event.dataTransfer)) {
        const image = projectImageDrag(event.dataTransfer?.getData(PROJECT_IMAGE_DRAG_TYPE) ?? '');
        if (image !== null) handlers.onProjectImageDrop(image, pointer);
      } else {
        const files = event.dataTransfer ? Array.from(event.dataTransfer.files, sourceFromFile) : [];
        handlers.onDrop(files, pointer);
      }
    }
    handlers.onDragEnd();
  };

  doc.addEventListener('dragenter', onDragEnter, options);
  doc.addEventListener('dragover', onDragOver, options);
  doc.addEventListener('dragleave', onDragLeave, options);
  doc.addEventListener('drop', onDrop, options);
  doc.addEventListener('dragend', handlers.onDragEnd, options);
  win.addEventListener('blur', handlers.onDragEnd, options);

  return () => controller.abort();
}

/** A bridge refusal throws, and `ingestImageFiles` turns that into the `unreadable` the user sees. */
function liveImageIngestDeps(cwd: string): ImageIngestDeps {
  return {
    register: ({ bytes, name }) => studio().registerImage({ cwd, bytes, name, target: 'canvas' }),
    measure: async (ref: { id: string }) => {
      const url = await resolveImage(ref);
      return url === null ? null : decodeImageSize(url);
    },
  };
}

export interface CanvasImagePicker {
  /** Opens the picker now; there is no armed mode, and the result lands at the viewport centre. */
  openImagePicker: () => void;
  /** The one picture path every gesture takes; `null` is a pointer off the canvas, which places at the viewport centre. */
  ingestImages: (
    files: readonly ImageIngestSource[],
    client: { x: number; y: number } | null,
    method: CanvasImageArrivalMethod,
  ) => void;
}

export function useCanvasFileDrop(
  screenToFlowPosition: (point: { x: number; y: number }) => { x: number; y: number },
): CanvasImagePicker {
  const latest = useLatestRef({ screenToFlowPosition });

  const pointAt = useCallback(
    (client: { x: number; y: number } | null): ImageIngestPoint => {
      const project = latest.current.screenToFlowPosition;
      return {
        at: imageDropPoint(
          client === null ? null : project(client),
          windowViewRect(project, window),
        ),
        fallbackName: t('canvas.image.pastedName'),
      };
    },
    [latest],
  );

  const ingest = useCallback(
    (
      files: readonly ImageIngestSource[],
      client: { x: number; y: number } | null,
      method: CanvasImageArrivalMethod,
    ): void => {
      const cwd = canvasImageProjectRoot();
      if (cwd === undefined) {
        seatLog.warn('an image gesture was ignored: no project is open');
        return;
      }
      void applyImageIngest(
        ingestImageFiles(files, pointAt(client), liveImageIngestDeps(cwd)),
        method,
      );
    },
    [pointAt],
  );

  useEffect(
    () =>
      installCanvasFileSeat(document, window, {
        onDrag: (over) => {
          useCanvasStore.getState().noteFileDrag(over);
        },
        onDragEnd: () => {
          useCanvasStore.getState().endFileDrag();
        },
        onDrop: (files, client) => {
          ingest(files, client, 'drop');
        },
        onProjectImageDrop: (image, client) => {
          const workspace = useWorkspaceStore.getState().workspace;
          if (workspace?.workspacePath !== image.workspacePath) return;
          const { doc, currentPageId } = useCanvasStore.getState();
          const isCurrent = (): boolean => {
            const canvas = useCanvasStore.getState();
            return useWorkspaceStore.getState().workspace?.workspacePath === image.workspacePath
              && canvas.doc?.docId === doc?.docId && canvas.currentPageId === currentPageId;
          };
          const point = pointAt(client);
          const pending = projectImageSource(image.path, (request) => studio().codeRead(request)).then(async (source) => {
            if (!isCurrent()) return { images: [] };
            const outcome = await ingestImageFiles([source], point, liveImageIngestDeps(workspace.workspacePath));
            return isCurrent() ? outcome : { images: [] };
          });
          void applyImageIngest(pending, 'drop');
        },
      }),
    [ingest, pointAt],
  );

  return {
    ingestImages: ingest,
    openImagePicker: useCallback(() => {
      const cwd = canvasImageProjectRoot();
      if (cwd === undefined) {
        seatLog.warn('the image picker was not opened: no project is open');
        return;
      }
      void studio()
        .pickImages({
          cwd,
          target: 'canvas',
          title: t('canvas.image.picker.title'),
          buttonLabel: t('canvas.image.picker.button'),
          filterLabel: t('canvas.image.picker.filter'),
        })
        .then((result) => {
          if (result.canceled) return;
          return applyImageIngest(
            ingestPickedImages(result, pointAt(null), liveImageIngestDeps(cwd)),
            'picker',
          );
        })
        // Main refuses per file; this is the picker itself dying, without which the gesture vanishes silently.
        .catch(() => {
          useCanvasStore
            .getState()
            .raiseImageRefusal(
              { reason: 'unreadable', name: t('canvas.image.selectionName'), count: 1 },
              'picker',
            );
        });
    }, [pointAt]),
  };
}
