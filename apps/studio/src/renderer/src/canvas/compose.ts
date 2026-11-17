import { firstRestingPageId, type CanvasDoc, type CanvasPageId } from '@studio/events';
import { flagEnabled } from '../flags/store.js';
import type { CanvasFlowNode } from './model.js';
import { composeCanvasNodes, composedPageId, type CompositionInput } from './readModel.js';
import type { CanvasState } from './store.js';

export function nextOrder(doc: CanvasDoc): number {
  return Object.values(doc.nodes).reduce((max, node) => Math.max(max, node.order), -1) + 1;
}

export type Composable = Pick<
  CanvasState,
  | 'doc'
  | 'currentPageId'
  | 'overlay'
  | 'gesture'
  | 'measured'
  | 'selectedNodeIds'
  | 'serverEntries'
  | 'frameQuotes'
>;

/** Every write states only its delta here; spelling the fields out per site is how one gets dropped. */
export function composable(state: Composable, over: Partial<Composable>): Composable {
  return {
    doc: state.doc,
    currentPageId: state.currentPageId,
    overlay: state.overlay,
    gesture: state.gesture,
    measured: state.measured,
    selectedNodeIds: state.selectedNodeIds,
    serverEntries: state.serverEntries,
    frameQuotes: state.frameQuotes,
    ...over,
  };
}

/** Canvas state plus the facts outside it: the flag answer main gave, so `composeCanvasNodes` stays a function of its input (ONL-2661). */
export function composition(next: Composable): CompositionInput {
  return { ...next, sectionsEnabled: flagEnabled('sections') };
}

/** The page the canvas is reading, validated against the document; `null` with no document open. */
export function currentCanvasPageId(
  state: Pick<CanvasState, 'doc' | 'currentPageId'>,
): CanvasPageId | null {
  return state.doc === null ? null : composedPageId(state.doc, state.currentPageId);
}

/** Where a mint lands: the current page, or the document's first when that page is gone (ONL-2488). */
export function mintPageId(doc: CanvasDoc, currentPageId: CanvasPageId | null): CanvasPageId {
  return composedPageId(doc, currentPageId) ?? firstRestingPageId(doc);
}

/** Prunes nothing: a selection may name an id whose create op is still in flight. */
export function recomposed(
  next: Composable,
  previousNodes: CanvasFlowNode[] = [],
): Composable & { nodes: CanvasFlowNode[] } {
  return { ...next, nodes: composeCanvasNodes(composition(next), previousNodes) };
}
