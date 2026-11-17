import { canvasPages, isDividerPage, nextCurrentPage } from '@studio/events';
import type { CanvasCamera, CanvasDoc, CanvasDocId, CanvasPageId } from '@studio/events';
import { defineDomain } from '../state/store.js';
import { finite, firstCanvasPageId } from './document.js';

interface DocPresentation {
  /** A hint: this file and the document quarantine independently, so every read checks it (ONL-2488). */
  currentPageId?: CanvasPageId;
  byPage: Record<CanvasPageId, CanvasCamera>;
}

interface CameraState {
  byDoc: Record<CanvasDocId, DocPresentation>;
}

/** A NaN or non-positive zoom renders an invisible canvas React Flow cannot pan back from. */
function isSaneCamera(value: unknown): value is CanvasCamera {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return finite(v['x']) && finite(v['y']) && finite(v['zoom']) && (v['zoom'] as number) > 0;
}

/** Per entry: a returned value is written back over the file, so a whole-file discard destroys the viewport it was meant to protect. */
function salvageV1(data: unknown): Record<CanvasDocId, DocPresentation> {
  const held = typeof data === 'object' && data !== null ? (data as { byDoc?: unknown }).byDoc : undefined;
  if (typeof held !== 'object' || held === null) return {};
  const byDoc: Record<CanvasDocId, DocPresentation> = {};
  for (const [docId, camera] of Object.entries(held as Record<string, unknown>)) {
    if (docId === '' || !isSaneCamera(camera)) continue;
    // The page adoption mints for this document, so an upgrading user opens where they left off.
    byDoc[docId] = { byPage: { [firstCanvasPageId(docId)]: camera } };
  }
  return byDoc;
}

const domain = defineDomain<CameraState>({
  name: 'canvas-camera',
  version: 2,
  fallback: () => ({ byDoc: {} }),
  migrate: (data, from) => {
    if (from === 1) return { byDoc: salvageV1(data) };
    throw new Error(`no migration from version ${String(from)}`);
  },
  // Every frame of a pan writes; the quit flush carries the last one.
  debounceMs: 750,
});

const removedDocuments = new Set<CanvasDocId>();

export function readCanvasCamera(
  docId: CanvasDocId,
  pageId: CanvasPageId,
): CanvasCamera | undefined {
  const stored = domain.read().byDoc[docId]?.byPage[pageId];
  return isSaneCamera(stored) ? stored : undefined;
}

/** Only the pages that hold one: an entry invented here would open a fresh page at somebody else's pan (ONL-2488). */
export function readCanvasPageCameras(docId: CanvasDocId): Record<CanvasPageId, CanvasCamera> {
  const held = domain.read().byDoc[docId]?.byPage;
  if (held === undefined) return {};
  const byPage: Record<CanvasPageId, CanvasCamera> = {};
  for (const [pageId, camera] of Object.entries(held)) {
    if (pageId !== '' && isSaneCamera(camera)) byPage[pageId] = camera;
  }
  return byPage;
}

export function writeCanvasCamera(
  docId: CanvasDocId,
  pageId: CanvasPageId,
  camera: CanvasCamera,
): void {
  if (docId === '' || pageId === '' || !isSaneCamera(camera) || removedDocuments.has(docId)) return;
  domain.update((state) => {
    const held = state.byDoc[docId];
    return {
      byDoc: {
        ...state.byDoc,
        [docId]: { ...held, byPage: { ...held?.byPage, [pageId]: camera } },
      },
    };
  });
}

export function readStoredCurrentPage(docId: CanvasDocId): CanvasPageId | undefined {
  const held = domain.read().byDoc[docId]?.currentPageId;
  return typeof held === 'string' && held !== '' ? held : undefined;
}

export function writeCurrentPage(docId: CanvasDocId, pageId: CanvasPageId): void {
  if (docId === '' || pageId === '' || removedDocuments.has(docId)) return;
  domain.update((state) => {
    const held = state.byDoc[docId];
    return {
      byDoc: { ...state.byDoc, [docId]: { byPage: held?.byPage ?? {}, currentPageId: pageId } },
    };
  });
}

/** Off a divider the hint names, current goes where the renderer's `composedPageId` goes: two answers stamp agent frames onto a page nobody is watching (ONL-2488). */
export function resolveCurrentPage(
  doc: CanvasDoc,
  hint: CanvasPageId | undefined,
): CanvasPageId | undefined {
  const held = hint === undefined ? undefined : doc.pages?.[hint];
  if (held !== undefined && !isDividerPage(held)) return held.id;
  if (held !== undefined) return nextCurrentPage(doc, held.id)?.id;
  return canvasPages(doc).find((page) => !isDividerPage(page))?.id;
}

export function forgetCanvasCamera(docId: CanvasDocId): void {
  removedDocuments.add(docId);
  domain.update((state) => {
    if (state.byDoc[docId] === undefined) return state;
    const byDoc = { ...state.byDoc };
    delete byDoc[docId];
    return { byDoc };
  });
}

export function resetCanvasCameraCache(): void {
  domain.reset();
  removedDocuments.clear();
}
