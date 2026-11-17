// Pure functions only — the pages section's arithmetic, provable without a mount.

import {
  canvasPages,
  isDividerName,
  isDividerPage,
  nextCurrentPage,
  resolveNodePageId,
  type CanvasDoc,
  type CanvasNodeId,
  type CanvasPageId,
} from '@studio/events';

import { t } from '@studio/i18n';
import { orderForDrop } from './designOrder.js';

export interface PageRowFacts {
  id: CanvasPageId;
  name: string;
  order: number;
  /** Drawn as a rule rather than a name, and never selectable (ONL-2488). */
  isDivider: boolean;
  isCurrent: boolean;
  /** The running turn is touching an object on this page, and the user is looking at another one (ONL-2488). */
  isWorking: boolean;
}

/** The overlay's own shape, structurally: the working flag is all this reads, and it stays a pure function. */
type WorkingOverlay = Readonly<Record<CanvasNodeId, { working?: boolean } | undefined>>;

/** The working-frame set mapped through each object's page — no new read, since the renderer holds the whole document (ONL-2488). */
function workingPageIds(doc: CanvasDoc, working: WorkingOverlay): Set<CanvasPageId> {
  const pages = new Set<CanvasPageId>();
  for (const node of Object.values(doc.nodes)) {
    if (working[node.id]?.working === true) pages.add(resolveNodePageId(doc, node));
  }
  return pages;
}

export function pageRowFacts(
  doc: CanvasDoc,
  currentPageId: CanvasPageId | null,
  working: WorkingOverlay = {},
): PageRowFacts[] {
  const busy = workingPageIds(doc, working);
  return canvasPages(doc).map((page) => {
    const isDivider = isDividerPage(page);
    const isCurrent = !isDivider && page.id === currentPageId;
    return {
      id: page.id,
      name: page.name,
      order: page.order,
      isDivider,
      isCurrent,
      // The page on screen never signals: the user can already see the work (ONL-2488).
      isWorking: !isCurrent && busy.has(page.id),
    };
  });
}

/** Where current goes when a rename turns the page under it into a rule; `null` leaves it where it is, which is also the answer on the rename the reducer refuses (ONL-2488). */
export function currentAfterRename(
  doc: CanvasDoc,
  pageId: CanvasPageId,
  name: string,
  currentPageId: CanvasPageId | null,
): CanvasPageId | null {
  if (pageId !== currentPageId || !isDividerName(name)) return null;
  return nextCurrentPage(doc, pageId)?.id ?? null;
}

export function nextPageName(doc: CanvasDoc): string {
  return t('sidebar.pages.newName', { n: canvasPages(doc).length + 1 });
}

/** Pages ascend down the list where designs descend, so the orders are read negated and the answer flipped back (ONL-2488). */
export function orderForPageDrop(
  pages: readonly { id: CanvasPageId; order: number }[],
  pageId: CanvasPageId,
  index: number,
): number | null {
  const order = orderForDrop(
    pages.map((page) => ({ id: page.id, order: -page.order })),
    pageId,
    index,
  );
  return order === null ? null : -order;
}

export function orderForPageStep(
  pages: readonly { id: CanvasPageId; order: number }[],
  pageId: CanvasPageId,
  direction: 'earlier' | 'later',
): number | null {
  const index = pages.findIndex((page) => page.id === pageId);
  if (index === -1) return null;
  if (direction === 'later' ? index === pages.length - 1 : index === 0) return null;
  return orderForPageDrop(pages, pageId, direction === 'later' ? index + 2 : index - 1);
}

export type PageKeyIntent =
  | { kind: 'switch'; pageId: CanvasPageId }
  | { kind: 'reorder'; pageId: CanvasPageId; order: number }
  | { kind: 'rename'; pageId: CanvasPageId }
  | { kind: 'delete'; pageId: CanvasPageId };

/** List-local, never a shortcut-registry entry: the registry's listener is global and would take the canvas's own arrow nudge (ONL-2488). */
export function pageKeyIntent(
  rows: readonly PageRowFacts[],
  focusedPageId: CanvasPageId | null,
  event: { key: string; altKey: boolean },
): PageKeyIntent | null {
  if (focusedPageId === null) return null;
  const index = rows.findIndex((row) => row.id === focusedPageId);
  if (index === -1) return null;
  const pageId = focusedPageId;

  if (event.key === 'Enter') return { kind: 'rename', pageId };
  if (event.key === 'Delete' || event.key === 'Backspace') return { kind: 'delete', pageId };
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return null;

  const down = event.key === 'ArrowDown';
  if (event.altKey) {
    const order = orderForPageStep(rows, pageId, down ? 'later' : 'earlier');
    return order === null ? null : { kind: 'reorder', pageId, order };
  }
  const step = down ? 1 : -1;
  for (let at = index + step; at >= 0 && at < rows.length; at += step) {
    const row = rows[at];
    if (row !== undefined && !row.isDivider) return { kind: 'switch', pageId: row.id };
  }
  return null;
}
