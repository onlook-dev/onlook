import {
  canvasStack,
  isDividerName,
  isLastNonDividerPage,
  nextCurrentPage,
  nextPageOrder,
  resolveNodePageId,
  type CanvasNodeId,
  type CanvasPageId,
  type CanvasRejectionCode,
} from '@studio/events';
import type { StateCreator } from 'zustand';
import { telemetryProjectFields } from '../workspace/store.js';
import { currentCanvasPageId } from './compose.js';
import type { CanvasState } from './store.js';
import { sendTelemetry } from './telemetry.js';
import { dispatchCanvasOp, dispatchCanvasOps } from './wire.js';

/** What the band draws: a code the renderer words, and the seq that makes a second refusal a new element (ONL-2488). */
export interface CanvasRefusalNotice {
  code: CanvasRejectionCode;
  seq: number;
}

export interface PageFields {
  /** The newest refused page operation, as the typed code the renderer words; main's prose reason is never rendered (ONL-2488). */
  canvasRefusal: CanvasRefusalNotice | null;

  /** The page row with its name open for editing (ONL-2488). */
  renamingPageId: CanvasPageId | null;
  /** A page this renderer minted and has not seen echoed; its create is what makes it current. */
  pendingPageId: CanvasPageId | null;
  /** The last order this renderer handed a page, so a second plus before the first echo does not reuse it (ONL-2488). */
  mintedPageOrder: number | null;
}

export interface PageActions {
  /** A refusal the renderer knew without asking: the reducer would answer the same code, and a gesture that did nothing at all is the silent no-op a refusal exists to prevent (ONL-2488). */
  raiseCanvasRefusal: (code: CanvasRejectionCode) => void;
  dismissCanvasRefusal: () => void;

  beginPageRename: (pageId: CanvasPageId) => void;
  endPageRename: () => void;
  /** Answers the minted id before its page arrives on the echo, which is what makes it current (ONL-2488). */
  createPage: (name: string) => CanvasPageId | null;
  /** An empty or whitespace-only name keeps the previous one and authors nothing (ONL-2488). */
  renamePage: (pageId: CanvasPageId, name: string) => void;
  reorderPage: (pageId: CanvasPageId, order: number) => void;
  /** One request — every object on the page, then the page — so one undo brings all of it back (ONL-2488). `wasConfirmed` is the prompt an empty page never raises. */
  deletePage: (pageId: CanvasPageId, wasConfirmed: boolean) => void;
  /** One request, so the whole selection undoes as one act; the view and the selection stay where they are (ONL-2488). */
  moveNodesToPage: (ids: readonly CanvasNodeId[], pageId: CanvasPageId) => void;
}

export function initialPageFields(): PageFields {
  return { canvasRefusal: null, renamingPageId: null, pendingPageId: null, mintedPageOrder: null };
}

/** Module state: a refusal's identity, so the band remounts rather than staying dismissed. */
let canvasRefusalSeq = 0;

export const createPageActions: StateCreator<CanvasState, [], [], PageActions> = (set, get) => ({
  raiseCanvasRefusal: (code) => {
    canvasRefusalSeq += 1;
    set({ canvasRefusal: { code, seq: canvasRefusalSeq } });
  },

  dismissCanvasRefusal: () => {
    if (get().canvasRefusal !== null) set({ canvasRefusal: null });
  },

  beginPageRename: (pageId) => {
    if (!get().doc?.pages[pageId]) return;
    set({ renamingPageId: pageId });
  },

  endPageRename: () => {
    if (get().renamingPageId !== null) set({ renamingPageId: null });
  },

  createPage: (name) => {
    const doc = get().doc;
    if (!doc) return null;
    const trimmed = name.trim();
    if (trimmed === '') return null;
    const id = crypto.randomUUID();
    const minted = get().mintedPageOrder;
    const order = minted === null ? nextPageOrder(doc) : Math.max(nextPageOrder(doc), minted + 1);
    if (!dispatchCanvasOp({ type: 'create-page', page: { id, name: trimmed, order } })) return null;
    set({ pendingPageId: id, mintedPageOrder: order, renamingPageId: id });
    sendTelemetry({ event: 'page_created', properties: { ...telemetryProjectFields(), method: 'plus' } });
    return id;
  },

  renamePage: (pageId, name) => {
    get().endPageRename();
    const page = get().doc?.pages[pageId];
    if (!page) return;
    const trimmed = name.trim();
    if (trimmed === '' || trimmed === page.name) return;
    if (!dispatchCanvasOp({ type: 'rename-page', pageId, name: trimmed })) return;
    sendTelemetry({
      event: 'page_renamed',
      // The new name never rides; whether it drew a rule is the fact a dashboard can read.
      properties: {
        ...telemetryProjectFields(),
        method: 'user',
        became_divider: isDividerName(trimmed),
      },
    });
  },

  reorderPage: (pageId, order) => {
    const page = get().doc?.pages[pageId];
    if (!page || page.order === order) return;
    dispatchCanvasOp({ type: 'reorder-page', pageId, order });
  },

  deletePage: (pageId, wasConfirmed) => {
    const doc = get().doc;
    const page = doc?.pages[pageId];
    if (!doc || !page) return;
    if (Object.keys(doc.pages).length === 1) return;
    // Told here, not left to the reducer: the confirm dialog has already closed (ONL-2488).
    if (isLastNonDividerPage(doc, page)) {
      get().raiseCanvasRefusal('last-non-divider-page');
      return;
    }
    // Before the ops, while the page is still one `setCurrentPage` accepts: the leave restores the destination's camera.
    if (currentCanvasPageId(get()) === pageId) {
      const next = nextCurrentPage(doc, pageId);
      if (next === undefined) return;
      get().setCurrentPage(next.id, 'vacated');
    }
    const held = canvasStack(doc, pageId);
    if (
      !dispatchCanvasOps([
        ...held.map((node) => ({ type: 'remove' as const, id: node.id })),
        { type: 'remove-page' as const, pageId },
      ])
    ) {
      return;
    }
    sendTelemetry({
      event: 'page_deleted',
      properties: {
        ...telemetryProjectFields(),
        method: 'user',
        had_nodes: held.length > 0,
        confirmed: wasConfirmed,
      },
    });
  },

  moveNodesToPage: (ids, pageId) => {
    const doc = get().doc;
    if (!doc?.pages[pageId]) return;
    const moving = ids.filter((id) => {
      const node = doc.nodes[id];
      return node !== undefined && resolveNodePageId(doc, node) !== pageId;
    });
    if (moving.length === 0) return;
    if (!dispatchCanvasOps(moving.map((id) => ({ type: 'set-node-page' as const, id, pageId })))) {
      return;
    }
    sendTelemetry({
      event: 'page_nodes_moved',
      properties: { ...telemetryProjectFields(), method: 'menu', node_count: moving.length },
    });
  },
});
