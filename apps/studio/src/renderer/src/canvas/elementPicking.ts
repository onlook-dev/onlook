import type { AnchorRect, CodeMapping, ElementEvidence } from '@studio/events';
import type { StateCreator } from 'zustand';
import { EMPTY_ATTACHMENTS } from '../attachments.js';
import { clearFrameDrawPatch } from './frameDraw.js';
import type { InlineAttachmentFields } from './inlineAttachments.js';
import { isAnchorLocked, type InlineChatRecord, type InlineCloseReason } from './inlinePlacement.js';
import { pruneToIds } from './readModel.js';
import {
  addSelection,
  markStale,
  refreshSelection,
  removeSelection,
  type AddOutcome,
  type ElementSelection,
  type GatherRefusal,
} from './selection.js';
import type { CanvasState } from './store.js';

export interface ElementPickingFields {
  /** Where a pick lands (the composer's chips, not a bubble), never whether one can: `isPickerLive` is the activation (ONL-2455). */
  isPicking: boolean;
  elementSelections: ElementSelection[];
  /** Guest client px by evidence id, kept out of `ElementSelection`: the evidence the agent reads carries no geometry (ONL-2455). */
  elementAnchorRects: Record<string, AnchorRect>;
  elementMappings: Record<string, CodeMapping | null>;
  /** Its anchor is the first element selection, and every path that drops that selection closes it (ONL-2455); a node-anchored one holds only while no element is selected. */
  inlineChat: InlineChatRecord | null;
  /** Written with every close, cleared by every open. */
  inlineChatCloseReason: InlineCloseReason | null;
  /** A refused pick with no bubble to carry it; the composer's status band says why (ONL-2482). */
  gatherRefusal: GatherRefusal | null;
}

export interface ElementPickingActions {
  /** Arming forces the select tool: the hand and frame tools take the picker's activation with them. */
  setPicking: (armed: boolean) => void;
  /** The caller raises the refusals the user has to see (ONL-2455). */
  addElementSelection: (
    evidence: ElementEvidence,
    frameNodeId: string,
    shiftHeld: boolean,
  ) => AddOutcome;
  /** `refuseGather`'s own sink, for the gather no bubble is open over (ONL-2482). */
  noteGatherRefusal: (reason: GatherRefusal) => void;
  /** The band steps aside for the send it would outrank, as the bubble's own does (ONL-2482). */
  dismissGatherRefusal: () => void;
  removeElementSelection: (id: string) => void;
  clearElementSelections: (reason: InlineCloseReason) => void;
  setElementStale: (id: string, stale: boolean) => void;
  refreshElementSelection: (evidence: ElementEvidence) => void;
  setElementAnchorRect: (id: string, rect: AnchorRect) => void;
  /** Dropped when the pick it was taken for is gone: a mapping with no selection points at nothing. */
  setElementMapping: (id: string, mapping: CodeMapping | null) => void;
  /** Refuses a record whose anchor no selection holds: the bubble would point at nothing. */
  setInlineChat: (record: InlineChatRecord) => void;
  closeInlineChat: (reason: InlineCloseReason) => void;
}

export function initialElementPickingFields(): ElementPickingFields & InlineAttachmentFields {
  return {
    isPicking: false,
    elementSelections: [],
    elementAnchorRects: {},
    elementMappings: {},
    inlineChat: null,
    inlineChatCloseReason: null,
    gatherRefusal: null,
    inlineAttachments: EMPTY_ATTACHMENTS,
    inlineChatOpenToken: 0,
  };
}

/** Derived, not stored: the first selection is the bubble's anchor, so focus stays on its frame however many frames the gather reaches (ONL-2477). */
export function focusedFrameId(state: Pick<CanvasState, 'elementSelections'>): string | null {
  return state.elementSelections[0]?.frameNodeId ?? null;
}

function prunedAnchorRects(
  rects: Readonly<Record<string, AnchorRect>>,
  selections: readonly ElementSelection[],
): Record<string, AnchorRect> {
  return pruneToIds(rects, new Set(selections.map((selection) => selection.evidence.id)));
}

function withoutRefusal(record: InlineChatRecord | null): InlineChatRecord | null {
  if (record === null || record.refusal === null) return record;
  return { ...record, refusal: null };
}

function elementAnchored(record: InlineChatRecord): InlineChatRecord {
  const { anchor: _node, ...rest } = record;
  return rest;
}

function heldInlineChat(
  record: InlineChatRecord | null,
  selections: readonly ElementSelection[],
): InlineChatRecord | null {
  if (record === null) return null;
  // A whole-node chat carries no element; one picked hands the surface to it.
  if (record.anchor === 'node') return selections.length === 0 ? record : null;
  return selections.some((selection) => selection.evidence.id === record.anchorId)
    ? record
    : null;
}

export function afterSelections(
  current: Pick<
    CanvasState,
    'elementAnchorRects' | 'elementMappings' | 'inlineChat' | 'elementSelections' | 'gatherRefusal'
  >,
  elementSelections: readonly ElementSelection[],
): Pick<CanvasState, 'elementAnchorRects' | 'elementMappings' | 'inlineChat' | 'gatherRefusal'> & Partial<Pick<CanvasState, 'inlineChatCloseReason'>> {
  const ids = new Set(elementSelections.map((selection) => selection.evidence.id));
  const inlineChat = heldInlineChat(current.inlineChat, elementSelections);
  return {
    elementAnchorRects: prunedAnchorRects(current.elementAnchorRects, elementSelections),
    elementMappings: pruneToIds(current.elementMappings, ids),
    inlineChat,
    ...(inlineChat === null && current.inlineChat !== null ? { inlineChatCloseReason: 'selection-changed' as const } : {}),
    // A gather that shrank answers the standing refusal, whether the user freed the slot
    // or a frame took its elements with it: the cap it named may no longer bind (ONL-2482).
    gatherRefusal:
      elementSelections.length < current.elementSelections.length ? null : current.gatherRefusal,
  };
}

export const createElementPickingActions: StateCreator<CanvasState, [], [], ElementPickingActions> = (
  set,
  get,
) => ({
  setPicking: (armed) => {
    const state = get();
    // Either edge of the mode retires its standing refusal, and a send is one of them (ONL-2482).
    if (!armed) {
      if (state.isPicking || state.gatherRefusal !== null)
        set({ isPicking: false, gatherRefusal: null });
      return;
    }
    // One pick lands in one place: arming the composer's button closes the bubble (ONL-2455).
    if (
      !state.isPicking ||
      state.tool !== 'select' ||
      state.inlineChat !== null ||
      state.gatherRefusal !== null
    ) {
      set({
        isPicking: true,
        tool: 'select',
        inlineChat: null,
        inlineChatCloseReason: 'picker-armed',
        gatherRefusal: null,
        ...clearFrameDrawPatch(state),
      });
    }
  },

  addElementSelection: (evidence, frameNodeId, shiftHeld) => {
    // A pick does not disarm; the toggle, Escape or a send does.
    let outcome: AddOutcome = 'added';
    set((state) => {
      const added = addSelection(state.elementSelections, evidence, frameNodeId, shiftHeld);
      outcome = added.outcome;
      const elementSelections = added.selections;
      if (elementSelections === state.elementSelections) return state;
      // An unshifted pick re-anchors the open bubble, draft kept; its latched side stays, since a re-latch unmounts it mid-keystroke (ONL-2455).
      const inlineChat =
        state.inlineChat === null
          ? null
          : shiftHeld && state.inlineChat.anchor !== 'node'
            ? withoutRefusal(heldInlineChat(state.inlineChat, elementSelections))
            : {
                ...elementAnchored(state.inlineChat),
                anchorId: evidence.id,
                send: 'idle' as const,
                refusal: null,
              };
      return {
        elementSelections,
        ...afterSelections(state, elementSelections),
        inlineChat,
        ...(inlineChat === null && state.inlineChat !== null ? { inlineChatCloseReason: 'selection-changed' as const } : {}),
        // A pick that landed answers the standing refusal, whichever surface carried it (ONL-2482).
        gatherRefusal: null,
      };
    });
    return outcome;
  },

  noteGatherRefusal: (reason) => {
    if (get().gatherRefusal !== reason) set({ gatherRefusal: reason });
  },

  dismissGatherRefusal: () => {
    if (get().gatherRefusal !== null) set({ gatherRefusal: null });
  },

  removeElementSelection: (id) => {
    set((state) => {
      // A ⇧-click on the anchor is refused; the guest painted optimistically, so whoever relayed it repairs its box (ONL-2455).
      if (isAnchorLocked(state.inlineChat, id)) return state;
      const elementSelections = removeSelection(state.elementSelections, id);
      return elementSelections === state.elementSelections
        ? state
        : {
            elementSelections,
            ...afterSelections(state, elementSelections),
          };
    });
  },

  clearElementSelections: (reason) => {
    set((state) =>
      state.elementSelections.length === 0 &&
      !state.isPicking &&
      state.inlineChat === null &&
      state.gatherRefusal === null
        ? state
        : {
            elementSelections: [],
            elementAnchorRects: {},
            elementMappings: {},
            inlineChat: null,
            inlineChatCloseReason: reason,
            gatherRefusal: null,
            isPicking: false,
          },
    );
  },

  setElementStale: (id, stale) => {
    set((state) => {
      const elementSelections = markStale(state.elementSelections, id, stale);
      return elementSelections === state.elementSelections ? state : { elementSelections };
    });
  },

  refreshElementSelection: (evidence) => {
    set((state) => {
      const elementSelections = refreshSelection(state.elementSelections, evidence);
      if (elementSelections === state.elementSelections) return state;
      const elementMappings = { ...state.elementMappings };
      delete elementMappings[evidence.id];
      return { elementSelections, elementMappings };
    });
  },

  setElementAnchorRect: (id, rect) => {
    set((state) => {
      if (!state.elementSelections.some((selection) => selection.evidence.id === id)) return state;
      const current = state.elementAnchorRects[id];
      if (
        current !== undefined &&
        current.x === rect.x &&
        current.y === rect.y &&
        current.width === rect.width &&
        current.height === rect.height
      ) {
        return state;
      }
      return { elementAnchorRects: { ...state.elementAnchorRects, [id]: rect } };
    });
  },

  setElementMapping: (id, mapping) => {
    set((state) => {
      if (!state.elementSelections.some((selection) => selection.evidence.id === id)) return state;
      if (id in state.elementMappings && state.elementMappings[id] === mapping) return state;
      return { elementMappings: { ...state.elementMappings, [id]: mapping } };
    });
  },

  setInlineChat: (record) => {
    set((state) => {
      const next = heldInlineChat(record, state.elementSelections);
      if (next === state.inlineChat) return state;
      const current = state.inlineChat;
      if (
        next !== null &&
        current !== null &&
        next.anchorId === current.anchorId &&
        next.anchor === current.anchor &&
        next.draft === current.draft &&
        next.expanded === current.expanded &&
        next.entry === current.entry &&
        next.placement === current.placement &&
        next.send === current.send &&
        next.refusal === current.refusal
      ) {
        return state;
      }
      if (next === null) return { inlineChat: null, inlineChatCloseReason: 'selection-changed' };
      return {
        inlineChat: next,
        // A record over a null one is a fresh bubble; a re-anchor rewrites the open record inside the pick and never reaches here (ONL-2549).
        ...(current === null
          ? {
              inlineAttachments: EMPTY_ATTACHMENTS,
              inlineChatOpenToken: state.inlineChatOpenToken + 1,
              inlineChatCloseReason: null,
            }
          : {}),
      };
    });
  },

  closeInlineChat: (reason) => {
    if (get().inlineChat !== null) set({ inlineChat: null, inlineChatCloseReason: reason });
  },
});
