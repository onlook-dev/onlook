// Pure functions only — whether a page delete asks, provable without a mount.

import {
  canvasPages,
  isLastNonDividerPage,
  nodesOnPage,
  type CanvasDoc,
  type CanvasPageId,
  type CanvasRejectionCode,
} from '@studio/events';

export interface PageDeleteRequest {
  /** `ask` when the page holds objects; an empty page deletes with no prompt (ONL-2488). */
  kind: 'ask' | 'delete';
  pageId: CanvasPageId;
  name: string;
  nodeCount: number;
}

/** `gone` and `refused` are separate outcomes: a race the panel says nothing about, and a rule the user is told (ONL-2488). */
export type PageDeleteOutcome =
  | PageDeleteRequest
  | { kind: 'gone' }
  | { kind: 'refused'; code: Extract<CanvasRejectionCode, 'last-page' | 'last-non-divider-page'> };

export function pageDeleteRequest(doc: CanvasDoc, pageId: CanvasPageId): PageDeleteOutcome {
  const page = doc.pages[pageId];
  if (page === undefined) return { kind: 'gone' };
  if (canvasPages(doc).length === 1) return { kind: 'refused', code: 'last-page' };
  if (isLastNonDividerPage(doc, page)) {
    return { kind: 'refused', code: 'last-non-divider-page' };
  }
  const nodeCount = nodesOnPage(doc, pageId).length;
  return { kind: nodeCount === 0 ? 'delete' : 'ask', pageId, name: page.name, nodeCount };
}
