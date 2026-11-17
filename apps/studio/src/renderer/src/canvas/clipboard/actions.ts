import { defaultTextBox, withSectionContentsOnPage, type CanvasNodeId, type CanvasOp } from '@studio/events';
import type { StateCreator } from 'zustand';
import { composable, mintPageId, nextOrder, recomposed } from '../compose.js';
import type { CanvasState } from '../store.js';
import { reportNodesCreated, reportTextCreated } from '../telemetry.js';
import { DEFAULT_CANVAS_TEXT_SIZE } from '../text/placement.js';
import { dispatchCanvasOp, dispatchCanvasOps } from '../wire.js';
import { copyOutcome, pastedBoxes, type CanvasCopy, type ClipboardNode } from './clipboard.js';

export interface ClipboardActions {
  /** What the selection puts on the clipboard, or `null` when it holds no text or image node. */
  copyCanvasSelection: () => CanvasCopy | null;
  /** One request, so the whole removal is one undo step; `null` leaves the clipboard untouched. */
  cutCanvasSelection: () => CanvasCopy | null;
  /** New ids with provenance, the set's relative geometry kept and its box centred on `at`. */
  pasteCanvasNodes: (nodes: readonly ClipboardNode[], at: { x: number; y: number }) => CanvasNodeId[];
  /** A committed label, never a caret: the box is the default one and the first layout corrects it (ONL-2486). */
  pasteCanvasText: (text: string, at: { x: number; y: number }) => CanvasNodeId | null;
}

export const createClipboardActions: StateCreator<CanvasState, [], [], ClipboardActions> = (set, get) => ({
  copyCanvasSelection: () => {
    const state = get();
    const doc = state.doc;
    if (!doc) return null;
    const composedIds = new Set(state.nodes.map((node) => node.id));
    const held = withSectionContentsOnPage(Object.values(doc.nodes), state.selectedNodeIds).flatMap((id) => {
      const node = doc.nodes[id];
      return node !== undefined && composedIds.has(id) ? [node] : [];
    });
    return copyOutcome(doc.docId, held);
  },

  cutCanvasSelection: () => {
    const copy = get().copyCanvasSelection();
    if (copy === null) return null;
    get().flushNudges();
    // One request: main mints a single batchId for it, so the whole cut undoes together.
    if (!dispatchCanvasOps(copy.ids.map((id) => ({ type: 'remove', id })))) return null;
    return copy;
  },

  pasteCanvasNodes: (nodes, at) => {
    const state = get();
    const doc = state.doc;
    if (!doc || nodes.length === 0) return [];
    state.flushNudges();
    const positions = pastedBoxes(nodes, at);
    const stamp = new Date().toISOString();
    let order = nextOrder(doc);
    const ids: CanvasNodeId[] = [];
    const ops: CanvasOp[] = nodes.map((node, index) => {
      const id = crypto.randomUUID();
      ids.push(id);
      const position = positions[index] ?? { x: node.x, y: node.y };
      const op: CanvasOp = {
        type: 'duplicate',
        node: {
          ...node,
          id,
          pageId: mintPageId(doc, state.currentPageId),
          x: position.x,
          y: position.y,
          order,
          provenance: { from: node.id, at: stamp },
        },
      };
      order += 1;
      return op;
    });
    if (!dispatchCanvasOps(ops)) return [];
    set((current) => recomposed(composable(current, { selectedNodeIds: ids }), current.nodes));
    reportNodesCreated(nodes, 'paste');
    return ids;
  },

  pasteCanvasText: (text, at) => {
    const state = get();
    const doc = state.doc;
    if (!doc || text.trim() === '') return null;
    state.flushNudges();
    const id = crypto.randomUUID();
    const size = DEFAULT_CANVAS_TEXT_SIZE;
    // The default box, as any text node minted outside an edit takes: the first layout corrects it (ONL-2486).
    const box = defaultTextBox(size);
    const dispatched = dispatchCanvasOp({
      type: 'create',
      node: {
        id,
        pageId: mintPageId(doc, state.currentPageId),
        kind: 'text',
        name: '',
        x: Math.round(at.x),
        y: Math.round(at.y),
        ...box,
        order: nextOrder(doc),
        content: { text, size },
      },
    });
    if (!dispatched) return null;
    set((current) => recomposed(composable(current, { selectedNodeIds: [id] }), current.nodes));
    reportTextCreated('paste', 1);
    return id;
  },
});
