import type { CanvasDoc, CanvasNode, CanvasPage, CanvasPageId } from './canvas.js';

/** `--` and `----` are ordinary names; only this exact text, trimmed, draws a rule (ONL-2488). */
export const isDividerName = (name: string): boolean => name.trim() === '---';

export const isDividerPage = (page: CanvasPage): boolean => isDividerName(page.name);

/** First to last; the id breaks a tie so every reader ranks the same list. */
export function canvasPages(doc: CanvasDoc): CanvasPage[] {
  return Object.values(doc.pages ?? {}).sort(
    (a, b) => a.order - b.order || a.id.localeCompare(b.id),
  );
}

/** The first page a reader renders and a writer lands on: a divider only where every page is one, and the empty id a page-less document answers is what the reducer refuses (ONL-2488). */
export function firstRestingPageId(doc: CanvasDoc): CanvasPageId {
  const pages = canvasPages(doc);
  return (pages.find((page) => !isDividerPage(page)) ?? pages[0])?.id ?? '';
}

/** False for a divider: only a page that is not one can be the one a project keeps (ONL-2488). */
export function isLastNonDividerPage(doc: CanvasDoc, page: CanvasPage): boolean {
  if (isDividerPage(page)) return false;
  return !canvasPages(doc).some((other) => other.id !== page.id && !isDividerPage(other));
}

/** Where an appended page sits: past the last one, so the panel, the plus and the agent all land it in the same place (ONL-2488). */
export function nextPageOrder(doc: CanvasDoc): number {
  return canvasPages(doc).reduce((max, page) => Math.max(max, page.order), -1) + 1;
}

/** The tolerant read: a missing or dangling `pageId` answers the first page, and a document carrying no pages answers the node's own (ONL-2488). */
export function resolveNodePageId(doc: CanvasDoc, node: CanvasNode): CanvasPageId {
  if (doc.pages?.[node.pageId] !== undefined) return node.pageId;
  return canvasPages(doc)[0]?.id ?? node.pageId;
}

export function nodesOnPage(doc: CanvasDoc, pageId: CanvasPageId): CanvasNode[] {
  return Object.values(doc.nodes).filter((node) => resolveNodePageId(doc, node) === pageId);
}

/** Where current goes when this page stops being one a reader can rest on: the first non-divider below it, else the first above (ONL-2488). */
export function nextCurrentPage(doc: CanvasDoc, fromPageId: CanvasPageId): CanvasPage | undefined {
  const pages = canvasPages(doc);
  const index = pages.findIndex((page) => page.id === fromPageId);
  if (index === -1) return pages.find((page) => !isDividerPage(page));
  for (let step = index + 1; step < pages.length; step += 1) {
    const page = pages[step];
    if (page !== undefined && !isDividerPage(page)) return page;
  }
  for (let step = index - 1; step >= 0; step -= 1) {
    const page = pages[step];
    if (page !== undefined && !isDividerPage(page)) return page;
  }
  return undefined;
}
