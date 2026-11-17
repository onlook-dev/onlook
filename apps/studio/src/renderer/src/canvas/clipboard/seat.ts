// The seat for copy, cut and paste: the only part of the clipboard path that touches the DOM.
// Decisions live in `clipboard.ts`; this reads the events, hands them over, and applies the outcome.

import { useCallback, useEffect, useRef } from 'react';
import { ignoreRefusal } from '../../refusal.js';
import type { CanvasImageArrivalMethod } from '@studio/events';
import { isInteractiveTarget } from '../../shortcuts/isInteractiveTarget.js';
import { useLatestRef } from '../../useLatestRef.js';
import { imageDropPoint, elementOf, isOverCanvasRegion, sourceFromFile } from '../image/dropSeat.js';
import type { ImageIngestSource } from '../image/ingest.js';
import { windowViewRect } from '../placement.js';
import { useCanvasStore } from '../store.js';
import {
  classifyPaste,
  writeCanvasCopy,
  type CanvasCopy,
  type ClipboardRead,
} from './clipboard.js';
import { studio } from '../../bridge.js';

interface CanvasClipboardHandlers {
  /** `null` leaves the event to the platform, which is how the composer keeps its own copy. */
  copy: () => CanvasCopy | null;
  cut: () => CanvasCopy | null;
  /** `false` leaves the event to the platform: an empty clipboard is nothing for the canvas to claim. */
  paste: (read: ClipboardRead, pointer: { x: number; y: number } | null) => boolean;
}

function readOf(clipboard: DataTransfer | null): ClipboardRead {
  if (clipboard === null) return { get: () => '', files: [], promisesImage: false };
  const files: ImageIngestSource[] = Array.from(clipboard.files, sourceFromFile);
  return {
    get: (type) => clipboard.getData(type),
    files,
    promisesImage: Array.from(clipboard.items).some((item) => item.type.startsWith('image/')),
  };
}

/** Capture phase throughout, as the canvas's file seat is: the canvas answers before the app's own document hooks, so one target acts (ONL-2486). */
function installCanvasClipboardSeat(
  doc: Document,
  win: Window,
  handlers: CanvasClipboardHandlers,
): () => void {
  const controller = new AbortController();
  const options = { signal: controller.signal, capture: true } as const;

  // Held raw and hit-tested only at a paste: `closest` on every pointer move would run the whole app's mouse path through a DOM walk.
  let pointer: { x: number; y: number } | null = null;
  const canvasPointer = (): { x: number; y: number } | null =>
    pointer !== null && isOverCanvasRegion(elementOf(doc.elementFromPoint(pointer.x, pointer.y)))
      ? pointer
      : null;

  // The clipboard is read before the verb runs: a cut that could not write would have removed the nodes for nothing.
  const take = (event: ClipboardEvent, verb: () => CanvasCopy | null): void => {
    if (isInteractiveTarget(event.target)) return;
    const clipboard = event.clipboardData;
    if (clipboard === null) return;
    const copy = verb();
    if (copy === null) return;
    // Before `setData`, or the platform's own copy overwrites what we write.
    event.preventDefault();
    writeCanvasCopy(clipboard, copy);
  };

  const onCopy = (event: ClipboardEvent): void => {
    take(event, handlers.copy);
  };

  const onCut = (event: ClipboardEvent): void => {
    take(event, handlers.cut);
  };

  const onPaste = (event: ClipboardEvent): void => {
    if (isInteractiveTarget(event.target)) return;
    if (!handlers.paste(readOf(event.clipboardData), canvasPointer())) return;
    event.preventDefault();
  };

  const onPointerMove = (event: PointerEvent): void => {
    pointer = { x: event.clientX, y: event.clientY };
  };

  const onBlur = (): void => {
    pointer = null;
  };

  doc.addEventListener('copy', onCopy, options);
  doc.addEventListener('cut', onCut, options);
  doc.addEventListener('paste', onPaste, options);
  doc.addEventListener('pointermove', onPointerMove, options);
  win.addEventListener('blur', onBlur, options);

  return () => controller.abort();
}

export interface CanvasClipboardDeps {
  screenToFlowPosition: (point: { x: number; y: number }) => { x: number; y: number };
  /** The canvas's one picture path, so an outside paste is refused for the reasons a drop is (ONL-2486). */
  ingestImages: (
    files: readonly ImageIngestSource[],
    client: { x: number; y: number } | null,
    method: CanvasImageArrivalMethod,
  ) => void;
}

export function useCanvasClipboard({
  screenToFlowPosition,
  ingestImages,
}: CanvasClipboardDeps): (point: { x: number; y: number }) => void {
  const latest = useLatestRef({ screenToFlowPosition, ingestImages });
  const requested = useRef<{ point: { x: number; y: number }; at: number; docId: string | undefined; pageId: string | null } | null>(null);

  useEffect(() => {
    const clear = (): void => { requested.current = null; };
    document.addEventListener('keydown', clear, true);
    document.addEventListener('pointerdown', clear, true);
    return () => {
      document.removeEventListener('keydown', clear, true);
      document.removeEventListener('pointerdown', clear, true);
    };
  }, []);

  const paste = useCallback(
    (read: ClipboardRead, client: { x: number; y: number } | null): boolean => {
      const store = useCanvasStore.getState();
      const outcome = classifyPaste(read, { docId: store.doc?.docId ?? null });
      if (outcome.kind === 'none') return false;
      if (outcome.kind === 'images') {
        latest.current.ingestImages(outcome.files, client, 'paste');
        return true;
      }
      const project = latest.current.screenToFlowPosition;
      const at = imageDropPoint(
        client === null ? null : project(client),
        windowViewRect(project, window),
      );
      if (outcome.kind === 'nodes') store.pasteCanvasNodes(outcome.nodes, at);
      else store.pasteCanvasText(outcome.text, at);
      return true;
    },
    [latest],
  );

  useEffect(
    () =>
      installCanvasClipboardSeat(document, window, {
        copy: () => useCanvasStore.getState().copyCanvasSelection(),
        cut: () => useCanvasStore.getState().cutCanvasSelection(),
        paste: (read, pointer) => {
          const held = requested.current;
          requested.current = null;
          const state = useCanvasStore.getState();
          if (held !== null && (held.docId !== state.doc?.docId || held.pageId !== state.currentPageId)) return false;
          const point = held !== null && Date.now() - held.at < 2000
            ? held.point : pointer;
          return paste(read, point);
        },
      }),
    [paste],
  );
  return useCallback((point: { x: number; y: number }) => {
    const state = useCanvasStore.getState();
    requested.current = { point, at: Date.now(), docId: state.doc?.docId, pageId: state.currentPageId };
    void studio().pasteClipboard().catch(ignoreRefusal('canvas', 'pasteClipboard'));
  }, []);
}
