import type { CanvasNodeId, CanvasOp, CanvasTextSize } from '@studio/events';
import type { StateCreator } from 'zustand';
import { telemetryProjectFields } from '../../workspace/store.js';
import { composable, mintPageId, nextOrder, recomposed } from '../compose.js';
import type { CanvasState } from '../store.js';
import { reportTextCreated, sendTelemetry } from '../telemetry.js';
import { dispatchCanvasOp, dispatchCanvasOps } from '../wire.js';
import {
  DEFAULT_CANVAS_TEXT_SIZE,
  isTextBoxStale,
  textBoxAtSize,
  textCommitOutcome,
  type TextBox,
  type TextDraft,
} from './placement.js';

export interface TextFields {
  /** A placed text node no `create` op has authored yet, held until its own node arrives: abandoning one authors nothing, so the undo stack never sees an empty node (ONL-2486). */
  textDraft: TextDraft | null;
  /** The node the caret is in, a draft or a committed one. */
  textEditId: CanvasNodeId | null;
  /** Text a commit sent that main has not echoed: until it lands the document still holds the old string, and a correction would write it back over the user's edit (ONL-2486). */
  textAwaitingEcho: Record<CanvasNodeId, string>;
}

export interface TextActions {
  /** The armed text tool's click: returns the minted id, or `null` with no document to place into. Disarms the tool and opens the caret. */
  placeTextNode: (at: { x: number; y: number }) => CanvasNodeId | null;
  beginTextEdit: (id: CanvasNodeId) => void;
  /** The caret leaving: a whitespace-only value drops a draft and removes a committed node, and an unchanged one authors nothing. */
  commitTextEdit: (text: string, box: TextBox) => void;
  /** A first layout's correction, never mid-edit: the stored box follows what the renderer measured. `size` is the one it was measured at; a measurement from another is declined (ONL-2486). */
  noteTextMeasured: (id: CanvasNodeId, box: TextBox, size: CanvasTextSize, layout: { text: string; wrapWidth?: number }) => void;
  /** One op per selected text node in one request, each carrying its own new box: main mints a single batchId, so one undo returns every previous size (ONL-2486). */
  setSelectedTextSize: (size: CanvasTextSize) => void;
}

export function initialTextFields(): TextFields {
  return { textDraft: null, textEditId: null, textAwaitingEcho: {} };
}

/** The selected text nodes a size bar acts on; a selection holding any other kind answers none, since a size has no meaning there (ONL-2486). */
export function textSizeBar(state: Pick<CanvasState, 'doc' | 'selectedNodeIds'>): {
  ids: CanvasNodeId[];
  /** The size every one of them shares, or `null` when they differ. */
  size: CanvasTextSize | null;
} {
  const doc = state.doc;
  const none = { ids: [], size: null } as { ids: CanvasNodeId[]; size: CanvasTextSize | null };
  if (doc === null || state.selectedNodeIds.length === 0) return none;
  const held = state.selectedNodeIds.flatMap((id) => {
    const node = doc.nodes[id];
    return node === undefined ? [] : [node];
  });
  if (held.length === 0) return none;
  const sizes = new Set<CanvasTextSize>();
  for (const node of held) {
    if (node.kind !== 'text') return none;
    sizes.add(node.content.size);
  }
  const shared = sizes.size === 1 ? [...sizes][0] : undefined;
  return { ids: held.map((node) => node.id), size: shared ?? null };
}

export const createTextActions: StateCreator<CanvasState, [], [], TextActions> = (set, get) => ({
  placeTextNode: (at) => {
    const state = get();
    if (!state.doc) return null;
    state.flushNudges();
    const id = crypto.randomUUID();
    // The selection goes to the minted id before any node exists, as `addFrame` does.
    set((current) => ({
      ...recomposed(composable(current, { selectedNodeIds: [id] }), current.nodes),
      textDraft: { id, x: at.x, y: at.y, size: DEFAULT_CANVAS_TEXT_SIZE, text: '' },
      textEditId: id,
      // One node per arming, as the frame tool reverts at the end of its draw.
      tool: 'select' as const,
    }));
    return id;
  },

  beginTextEdit: (id) => {
    const node = get().doc?.nodes[id];
    if (node?.kind !== 'text') return;
    get().selectFrame(id, false);
    set({ textEditId: id });
  },

  commitTextEdit: (text, box) => {
    const state = get();
    const id = state.textEditId;
    if (id === null) return;
    const draft = state.textDraft?.id === id ? state.textDraft : null;
    const node = state.doc?.nodes[id];
    if (draft === null && node?.kind !== 'text') {
      set({ textEditId: null });
      return;
    }
    const outcome = textCommitOutcome({
      // The whole stored string, which is what the caret was given (ONL-2486).
      previous: node?.kind === 'text' ? node.content.text : null,
      next: text,
      box: node?.kind === 'text' && node.content.wrapWidth !== undefined
        ? { ...box, width: node.content.wrapWidth }
        : box,
    });
    switch (outcome.kind) {
      case 'none':
        set({ textEditId: null, ...(draft === null ? {} : { textDraft: null }) });
        return;
      case 'create': {
        const doc = state.doc;
        // Blank on purpose: the row and the chip derive a label from the words at render, so nothing stored can go stale (ONL-2486).
        const dispatched =
          doc !== null && draft !== null
            ? dispatchCanvasOp({
                type: 'create',
                node: {
                  id,
                  pageId: mintPageId(doc, state.currentPageId),
                  kind: 'text',
                  name: '',
                  x: draft.x,
                  y: draft.y,
                  width: outcome.box.width,
                  height: outcome.box.height,
                  order: nextOrder(doc),
                  content: { text: outcome.text, size: draft.size },
                },
              })
            : false;
        // A refused create never echoes, and the echo is the draft's only release.
        set({
          textEditId: null,
          ...(dispatched && draft !== null
            ? { textDraft: { ...draft, text: outcome.text } }
            : { textDraft: null }),
        });
        if (dispatched) reportTextCreated('tool', 1);
        return;
      }
      case 'remove':
        dispatchCanvasOp({ type: 'remove', id });
        set({ textEditId: null });
        return;
      case 'set-text':
        dispatchCanvasOp({
          type: 'set-text',
          id,
          text: outcome.text,
          width: outcome.box.width,
          height: outcome.box.height,
        });
        set((current) => ({
          textEditId: null,
          textAwaitingEcho: { ...current.textAwaitingEcho, [id]: outcome.text },
        }));
        return;
    }
  },

  noteTextMeasured: (id, box, size, layout) => {
    const state = get();
    // Never under the caret: the box is still moving, and the commit carries the final one.
    if (state.textEditId === id) return;
    if (state.resizeInFlightId === id || state.gesture[id]?.isSettling) return;
    const node = state.doc?.nodes[id];
    if (node?.kind !== 'text') return;
    // The commit's own echo is still out, so `content.text` is the string the user just replaced (ONL-2486).
    const awaiting = state.textAwaitingEcho[id];
    if (awaiting !== undefined) {
      if (node.content.text !== awaiting) return;
      set((current) => {
        const rest = { ...current.textAwaitingEcho };
        delete rest[id];
        return { textAwaitingEcho: rest };
      });
    }
    // A measurement from a layout the node has left: it authors no history, so a stale one that landed could never be undone (ONL-2486).
    if (node.content.size !== size || node.content.text !== layout.text || node.content.wrapWidth !== layout.wrapWidth) return;
    if (!isTextBoxStale(node, box)) return;
    dispatchCanvasOp(
      {
        type: 'set-text',
        id,
        text: node.content.text,
        width: node.content.wrapWidth ?? box.width,
        height: box.height,
      },
      { correction: true },
    );
  },

  setSelectedTextSize: (size) => {
    const state = get();
    const doc = state.doc;
    if (!doc) return;
    const ops: CanvasOp[] = [];
    for (const id of textSizeBar(state).ids) {
      const node = doc.nodes[id];
      if (node?.kind !== 'text' || node.content.size === size) continue;
      ops.push({
        type: 'set-text-size',
        id,
        size,
        ...textBoxAtSize(node, node.content.size, size, node.content.wrapWidth),
      });
    }
    if (ops.length === 0) return;
    state.flushNudges();
    // One request: main mints a single batchId for it, so the whole selection undoes together.
    if (!dispatchCanvasOps(ops)) return;
    sendTelemetry({
      event: 'text_size_changed',
      properties: { ...telemetryProjectFields(), size, node_count: ops.length },
    });
  },
});
