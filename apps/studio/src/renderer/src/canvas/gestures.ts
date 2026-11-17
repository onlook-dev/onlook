import type { NodeChange } from '@xyflow/react';
import { sectionMembersOnPage, withSectionContentsOnPage, type CanvasNode, type CanvasNodeId, type CanvasOp, type ViewRect } from '@studio/events';
import type { StateCreator } from 'zustand';
import { telemetryProjectFields } from '../workspace/store.js';
import { composable, composition, nextOrder, recomposed } from './compose.js';
import { drivenAspectSide, lockedAspectBox, lockedAspectRatio } from './image/aspect.js';
import {
  MAX_FRAME_SIZE,
  MIN_IMAGE_SIZE,
  resizeCeiling,
  resizeFloor,
  type CanvasFlowNode,
} from './model.js';
import { mintedDuplicate } from './nodes.js';
import { composeMomentaryCanvasNodes, type GestureOverride } from './readModel.js';
import {
  boundingBox,
  candidateBoxes,
  computeResizeSnap,
  computeSnap,
  exactAlignmentGuides,
  type SnapBox,
  type SnapGuide,
} from './snapping.js';
import type { CanvasState } from './store.js';
import { reportNodesCreated, sendTelemetry } from './telemetry.js';
import { dispatchCanvasOp, dispatchCanvasOps } from './wire.js';

/** How long a nudge's alignment guides stay after the last arrow press. */
const NUDGE_GUIDE_MS = 600;
let nudgeGuideTimer: ReturnType<typeof setTimeout> | undefined;
/** A pause this long ends a burst of arrow presses, which then saves as one move per node and one undo step. */
const NUDGE_COMMIT_MS = 400;
let nudgeCommitTimer: ReturnType<typeof setTimeout> | undefined;
const nudgedIds = new Set<CanvasNodeId>();

export interface GestureFields {
  sectionDrag: Record<string, { sectionId: string; x: number; y: number }>;
  /** An ⌥-drag (ONL-2128); a cancelled record stays until React Flow ends the drag, or the settle authors the moves the cancel abandoned. */
  duplicateDrag: {
    ids: CanvasNodeId[];
    members: ReadonlySet<CanvasNodeId>;
    settled: Partial<Record<CanvasNodeId, { x: number; y: number }>>;
    view?: ViewRect;
    isCancelled: boolean;
  } | null;

  snapGuides: SnapGuide[];

  /** Cleared by `settleResize` alone, so a stray measurement mid-gesture cannot blink the badge. */
  resizeReadout: {
    id: CanvasNodeId | null;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;

  resizeInFlightId: CanvasNodeId | null;
  resizeInFlightPointerId: number | null;
  /** The axis the ratio lock reads this gesture's size from, settled on its first whole unit of movement and held to the release (ONL-2501). */
  resizeDriver: 'width' | 'height' | null;
}

export interface GestureActions {
  beginSectionDrag: (id: string) => void;
  endSectionDrag: () => void;
  beginDuplicateDrag: (id: string, view?: ViewRect) => void;
  cancelDuplicateDrag: () => void;
  /** Not redundant with the settle: React Flow emits no `dragging: false` when nothing moved, and a lingering record turns the next plain drag into a mint. */
  endDuplicateDrag: () => void;
  beginResize: (id: string, pointerId?: number, textLayout?: { anchorBottom: boolean; measureHeight: (width: number) => number }) => void;
  cancelResize: () => void;
  settleResize: (id: string, box: { x: number; y: number; width: number; height: number }) => void;
  resizeFrame: (id: string, width: number, height: number) => void;
  onNodesChange: (changes: NodeChange<CanvasFlowNode>[]) => void;
  /** Arrow-key nudge of every selected node; bypasses snapping, which would pull a one-pixel step straight back to its guide. */
  nudgeNodes: (dx: number, dy: number) => void;
  /** Saves a pending nudge burst now; anything that acts on the canvas calls it first. */
  flushNudges: () => void;
}

export function initialGestureFields(): GestureFields {
  return {
    sectionDrag: {},
    duplicateDrag: null,
    snapGuides: [],
    resizeReadout: null,
    resizeInFlightId: null,
    resizeInFlightPointerId: null,
    resizeDriver: null,
  };
}

/** Read per drag batch, never subscribed: a subscription lets the camera drive a render loop through this store (ONL-2044). */
let canvasZoomSource: () => number = () => 1;

let textResizeLayout: { anchorBottom: boolean; measureHeight: (width: number) => number } | undefined;
let textResizeStart: SnapBox | undefined;

let canvasCenterSource: (() => { x: number; y: number } | null) = () => null;

/** The visible canvas's centre in flow coordinates; `null` with no canvas mounted (ONL-2593). */
export function canvasViewCenter(): { x: number; y: number } | null {
  return canvasCenterSource();
}

export function setCanvasCenterSource(source: (() => { x: number; y: number } | null) | null): void {
  canvasCenterSource = source ?? (() => null);
}

export function setCanvasZoomSource(source: (() => number) | null): void {
  canvasZoomSource = source ?? (() => 1);
}

/** `guides: null` means not a drag batch: a mid-drag measurement must leave the held guides alone. */
function snapDragChanges(
  changes: NodeChange<CanvasFlowNode>[],
  state: CanvasState,
): { changes: NodeChange<CanvasFlowNode>[]; guides: SnapGuide[] | null } {
  // Resize position changes carry no `dragging`; whole-box snapping would shift their anchored edge, so `snapResizeChanges` owns them.
  const positionChanges = changes.filter(
    (change): change is NodeChange<CanvasFlowNode> & { type: 'position'; position: { x: number; y: number } } =>
      change.type === 'position' && change.position !== undefined && change.dragging !== undefined,
  );
  if (positionChanges.length === 0) return { changes, guides: null };
  if (state.duplicateDrag?.isCancelled) return { changes, guides: [] };
  // The moving set's outer box at its new positions: a group aligns by its edges, and one node is its own box.
  const moving = boundingBox(
    positionChanges.flatMap((change) => {
      const node = state.nodes.find((candidate) => candidate.id === change.id);
      return node
        ? [{ x: change.position.x, y: change.position.y, width: node.width ?? 0, height: node.height ?? 0 }]
        : [];
    }),
  );
  if (moving === null) return { changes, guides: [] };
  // React Flow drags every selected node, so the whole selection is excluded from the snap targets.
  const draggedIds = new Set<string>(state.selectedNodeIds);
  for (const id of Object.keys(state.sectionDrag)) draggedIds.add(id);
  for (const change of positionChanges) draggedIds.add(change.id);
  const { snapDelta, guides } = computeSnap(
    moving,
    candidateBoxes(state.nodes, draggedIds),
    canvasZoomSource(),
  );
  const isSettling = positionChanges.some((change) => change.dragging === false);
  if (snapDelta.x === 0 && snapDelta.y === 0) {
    return { changes, guides: isSettling ? [] : guides };
  }
  return {
    changes: changes.map((change) =>
      change.type === 'position' && change.position !== undefined && change.dragging !== undefined
        ? {
            ...change,
            position: {
              x: change.position.x + snapDelta.x,
              y: change.position.y + snapDelta.y,
            },
          }
        : change,
    ),
    guides: isSettling ? [] : guides,
  };
}

/** The snapped box feeds the hold and so `settleResize`, keeping the settled op flush with the guide the user saw; `guides: null` means not a resize batch. */
function snapResizeChanges(
  changes: NodeChange<CanvasFlowNode>[],
  state: CanvasState,
): {
  changes: NodeChange<CanvasFlowNode>[];
  guides: SnapGuide[] | null;
  readout: CanvasState['resizeReadout'];
  driver: CanvasState['resizeDriver'];
} {
  const dims = changes.find(
    (
      change,
    ): change is NodeChange<CanvasFlowNode> & {
      type: 'dimensions';
      dimensions: { width: number; height: number };
    } =>
      change.type === 'dimensions' &&
      change.id === state.resizeInFlightId &&
      change.resizing === true &&
      change.dimensions !== undefined,
  );
  if (!dims) return { changes, guides: null, readout: null, driver: state.resizeDriver };
  const node = state.doc?.nodes[dims.id];
  if (!node) return { changes, guides: null, readout: null, driver: state.resizeDriver };
  const start = node.kind === 'text' && textResizeStart ? { ...node, ...textResizeStart } : node;
  const position = changes.find(
    (
      change,
    ): change is NodeChange<CanvasFlowNode> & {
      type: 'position';
      position: { x: number; y: number };
    } => change.type === 'position' && change.id === dims.id && change.position !== undefined,
  );
  const raw: SnapBox = {
    // A right/bottom-handle resize emits no position change.
    x: position?.position.x ?? start.x,
    y: position?.position.y ?? start.y,
    width: dims.dimensions.width,
    height: dims.dimensions.height,
  };
  const startBox: SnapBox = { x: start.x, y: start.y, width: start.width, height: start.height };
  const { box, guides } = computeResizeSnap(
    raw,
    startBox,
    // Only the resized frame: selected siblings hold still during a resize, unlike a group drag.
    candidateBoxes(state.nodes, new Set([dims.id])),
    canvasZoomSource(),
  );
  if (start.kind === 'text') {
    const height = textResizeLayout?.measureHeight(box.width) ?? start.height;
    const settled = {
      x: box.x,
      y: textResizeLayout?.anchorBottom ? start.y + start.height - height : start.y,
      width: box.width,
      height,
    };
    const rewritten = rewrittenResizeChanges(changes, dims.id, settled);
    if (!rewritten.some((change) => change.type === 'position' && change.id === dims.id)) {
      rewritten.push({ id: dims.id, type: 'position', position: { x: settled.x, y: settled.y } });
    }
    return {
      changes: rewritten,
      guides: guides.filter((guide) => guide.orientation === 'vertical').map((guide) => guideSpanning(guide, settled)),
      readout: { id: dims.id, ...settled },
      driver: null,
    };
  }
  // A picture holds its own ratio with no key held (ONL-2501): the snap runs first and the lock rides
  // its box, measuring the driven side on the drag so the snap cannot change which axis leads.
  const ratio = start.kind === 'image' ? lockedAspectRatio(start) : null;
  // The gesture's own axis, read once and held: re-read per change it flips where the two deltas cross,
  // and the derived side jumps a pixel move's width. Before the first whole unit nothing has led yet.
  const driver = state.resizeDriver ?? drivenAspectSide(raw, startBox);
  const driven = driver ?? 'width';
  // Only the driven axis takes the snap: the other axis keeps the drag's own edge, or a snap it never
  // showed a guide for would decide which edge is anchored and move the one the pointer never held.
  const basis: SnapBox =
    driven === 'height'
      ? { x: raw.x, y: box.y, width: raw.width, height: box.height }
      : { x: box.x, y: raw.y, width: box.width, height: raw.height };
  // Both bounds yield to a picture already outside them, as the handles and the snap both do.
  const bounds = {
    min: {
      width: resizeFloor(MIN_IMAGE_SIZE.width, start.width),
      height: resizeFloor(MIN_IMAGE_SIZE.height, start.height),
    },
    max: {
      width: resizeCeiling(MAX_FRAME_SIZE.width, start.width),
      height: resizeCeiling(MAX_FRAME_SIZE.height, start.height),
    },
  };
  const settled = ratio === null ? box : lockedAspectBox(basis, startBox, ratio, driven, bounds);
  // The derived side is the ratio's, not the snap's, so only the driven edge's guide stays true.
  const settledGuides =
    ratio === null
      ? guides
      : guides.flatMap((guide) =>
          guide.orientation === (driven === 'height' ? 'horizontal' : 'vertical')
            ? [guideSpanning(guide, settled)]
            : [],
        );
  const readout = { id: dims.id, ...settled };
  if (
    settled.x === raw.x &&
    settled.y === raw.y &&
    settled.width === raw.width &&
    settled.height === raw.height
  ) {
    return { changes, guides: settledGuides, readout, driver };
  }
  return {
    changes: rewrittenResizeChanges(changes, dims.id, settled),
    guides: settledGuides,
    readout,
    driver,
  };
}

/** The guide was measured on the box before the lock, so the derived side it then changed can leave the line short of the box it belongs to (ONL-2501). */
function guideSpanning(guide: SnapGuide, box: SnapBox): SnapGuide {
  const from = guide.orientation === 'vertical' ? box.y : box.x;
  const to = from + (guide.orientation === 'vertical' ? box.height : box.width);
  if (guide.from <= from && guide.to >= to) return guide;
  return { ...guide, from: Math.min(guide.from, from), to: Math.max(guide.to, to) };
}

function rewrittenResizeChanges(
  changes: NodeChange<CanvasFlowNode>[],
  id: CanvasNodeId,
  box: SnapBox,
): NodeChange<CanvasFlowNode>[] {
  return changes.map((change) => {
    if (change.type === 'dimensions' && change.id === id && change.resizing === true) {
      return { ...change, dimensions: { width: box.width, height: box.height } };
    }
    if (change.type === 'position' && change.id === id && change.position !== undefined) {
      return { ...change, position: { x: box.x, y: box.y } };
    }
    return change;
  });
}

/** The nudged selection's exact alignments, by its outer box; its own members are no target. */
function nudgeGuides(state: CanvasState, dx: number, dy: number): SnapGuide[] {
  const selected = state.nodes.filter((node) => node.selected === true);
  const moving = boundingBox(
    selected.map((node) => ({
      x: node.position.x + dx,
      y: node.position.y + dy,
      width: node.width ?? 0,
      height: node.height ?? 0,
    })),
  );
  if (moving === null) return [];
  return exactAlignmentGuides(moving, candidateBoxes(state.nodes, new Set(selected.map((node) => node.id))));
}

export function clearedDragVisuals(state: CanvasState): { snapGuides?: SnapGuide[] } {
  return state.snapGuides.length > 0 ? { snapGuides: [] } : {};
}

export function resetGesturesForTests(): void {
  clearTimeout(nudgeCommitTimer);
  nudgeCommitTimer = undefined;
  nudgedIds.clear();
  setCanvasZoomSource(null);
  textResizeLayout = undefined;
}

export const createGestureActions: StateCreator<CanvasState, [], [], GestureActions> = (set, get) => ({
  beginDuplicateDrag: (id, view) => {
    const state = get();
    if (!state.doc?.nodes[id]) return;
    const selected = state.selectedNodeIds.includes(id)
      ? state.selectedNodeIds.filter((selected) => state.doc?.nodes[selected] !== undefined)
      : [id];
    const ids = withSectionContentsOnPage(Object.values(state.doc.nodes), selected);
    set({
      duplicateDrag: {
        ids,
        members: new Set(ids),
        settled: {},
        ...(view ? { view } : {}),
        isCancelled: false,
      },
    });
  },

  cancelDuplicateDrag: () => {
    set((state) => {
      const drag = state.duplicateDrag;
      if (!drag || drag.isCancelled) return state;
      const gesture = { ...state.gesture };
      for (const id of drag.ids) delete gesture[id];
      return {
        ...recomposed(composable(state, { gesture }), state.nodes),
        duplicateDrag: { ...drag, isCancelled: true },
        ...clearedDragVisuals(state),
      };
    });
  },

  endDuplicateDrag: () => {
    set((state) => {
      const drag = state.duplicateDrag;
      if (!drag) return state;
      const gesture = { ...state.gesture };
      for (const id of drag.ids) delete gesture[id];
      return {
        ...recomposed(composable(state, { gesture }), state.nodes),
        duplicateDrag: null,
        ...clearedDragVisuals(state),
      };
    });
  },

  resizeFrame: (id, width, height) => {
    const doc = get().doc;
    const node = doc?.nodes[id];
    if (!node) return;
    const held = get().gesture[id];
    dispatchCanvasOp({
      type: 'resize',
      id,
      x: held?.x ?? node.x,
      y: held?.y ?? node.y,
      width,
      height,
    });
  },

  beginResize: (id, pointerId, textLayout) => {
    const state = get();
    const node = state.doc?.nodes[id];
    const held = state.gesture[id];
    textResizeStart = node?.kind === 'text' ? {
      x: held?.x ?? node.x,
      y: held?.y ?? node.y,
      width: held?.width ?? node.width,
      height: held?.height ?? node.height,
    } : undefined;
    textResizeLayout = textLayout;
    set({ resizeInFlightId: id, resizeInFlightPointerId: pointerId ?? null, resizeDriver: null });
  },

  cancelResize: () => {
    textResizeLayout = undefined;
    textResizeStart = undefined;
    set((state) => {
      const id = state.resizeInFlightId;
      if (id === null) return state;
      const gesture = { ...state.gesture };
      delete gesture[id];
      return {
        ...recomposed(composable(state, { gesture }), state.nodes),
        resizeInFlightId: null,
        resizeInFlightPointerId: null,
        resizeDriver: null,
        ...(state.resizeReadout?.id === id ? { resizeReadout: null } : {}),
        ...clearedDragVisuals(state),
      };
    });
  },

  settleResize: (id, box) => {
    const before = get();
    if (before.resizeInFlightId !== id) return;
    // Read before the updater clears the gesture: the kind decides whether this is measured at all.
    const resizedNode = before.resizeInFlightId === id ? before.doc?.nodes[id] : undefined;
    set((state) => {
      if (state.resizeInFlightId !== id) return state;
      // The hold, not the params: `onResizeEnd` reports the control's unsnapped box, and the params only fill a zero-movement release.
      const held = state.gesture[id]?.isSettling ? undefined : state.gesture[id];
      const settled = {
        x: held?.x ?? box.x,
        y: held?.y ?? box.y,
        width: held?.width ?? box.width,
        height: held?.height ?? box.height,
      };
      if (resizedNode?.kind === 'text') {
        const start = textResizeStart ?? resizedNode;
        settled.height = textResizeLayout?.measureHeight(settled.width) ?? start.height;
        settled.y = textResizeLayout?.anchorBottom
          ? start.y + start.height - settled.height
          : start.y;
      }
      if (state.doc?.nodes[id]) dispatchCanvasOp({ type: 'resize', id, ...settled });
      return {
        ...recomposed(
          composable(state, {
            gesture: { ...state.gesture, [id]: { ...settled, isSettling: true } },
          }),
          state.nodes,
        ),
        ...clearedDragVisuals(state),
        ...(state.resizeReadout !== null ? { resizeReadout: null } : {}),
        resizeInFlightId: null,
        resizeInFlightPointerId: null,
        resizeDriver: null,
      };
    });
    textResizeLayout = undefined;
    textResizeStart = undefined;
    if (resizedNode?.kind === 'image') {
      sendTelemetry({
        event: 'image_resized',
        properties: { ...telemetryProjectFields(), method: 'handle' },
      });
    }
    if (resizedNode?.kind === 'text') {
      sendTelemetry({
        event: 'text_resized',
        properties: { ...telemetryProjectFields(), method: 'handle' },
      });
    }
  },

  nudgeNodes: (dx, dy) => {
    const state = get();
    if (!state.doc) return;
    const gesture = { ...state.gesture };
    const moving = new Set(withSectionContentsOnPage(
      Object.values(state.doc.nodes).map((node) => ({ ...node, x: state.gesture[node.id]?.x ?? node.x, y: state.gesture[node.id]?.y ?? node.y })),
      state.selectedNodeIds,
    ));
    let moved = false;
    for (const node of state.nodes) {
      if (!moving.has(node.id)) continue;
      // Held, not yet settling: the burst saves once, at its pause, so only the screen moves per press.
      gesture[node.id] = { ...gesture[node.id], x: node.position.x + dx, y: node.position.y + dy };
      nudgedIds.add(node.id);
      moved = true;
    }
    if (!moved) return;
    const guides = nudgeGuides(state, dx, dy);
    set({
      ...recomposed(composable(state, { gesture }), state.nodes),
      // Empty to empty keeps identity, or every off-line nudge re-renders the guides overlay.
      ...(guides.length === 0 && state.snapGuides.length === 0 ? {} : { snapGuides: guides }),
    });
    clearTimeout(nudgeGuideTimer);
    nudgeGuideTimer = setTimeout(() => {
      if (get().snapGuides === guides && guides.length > 0) set({ snapGuides: [] });
    }, NUDGE_GUIDE_MS);
    clearTimeout(nudgeCommitTimer);
    nudgeCommitTimer = setTimeout(() => {
      get().flushNudges();
    }, NUDGE_COMMIT_MS);
  },

  flushNudges: () => {
    clearTimeout(nudgeCommitTimer);
    nudgeCommitTimer = undefined;
    if (nudgedIds.size === 0) return;
    const ids = [...nudgedIds];
    nudgedIds.clear();
    const state = get();
    const ops: CanvasOp[] = [];
    const gesture = { ...state.gesture };
    for (const id of ids) {
      const held = gesture[id];
      if (held?.x === undefined || held.y === undefined || state.doc?.nodes[id] === undefined) continue;
      // Settling now: the move's own echo is the hold's release.
      gesture[id] = { ...held, isSettling: true };
      ops.push({ type: 'move', id, x: held.x, y: held.y });
    }
    if (ops.length === 0) return;
    set(recomposed(composable(state, { gesture }), state.nodes));
    // One request: several nodes share main's batch, so the burst is one undo step.
    if (dispatchCanvasOps(ops)) return;
    // A refused batch never echoes, and the echo is a settling hold's only release.
    set((current) => {
      const released = { ...current.gesture };
      for (const op of ops) if ('id' in op) delete released[op.id];
      return recomposed(composable(current, { gesture: released }), current.nodes);
    });
  },

  beginSectionDrag: (id) => {
    const state = get();
    if (state.doc === null) return;
    const ids = state.selectedNodeIds.includes(id) ? state.selectedNodeIds : [id];
    const selected = new Set(ids);
    let nodes: CanvasNode[] | undefined;
    const sectionDrag: GestureFields['sectionDrag'] = {};
    for (const sectionId of ids) {
      const section = state.doc.nodes[sectionId];
      if (section?.kind !== 'section') continue;
      nodes ??= Object.values(state.doc.nodes);
      for (const member of sectionMembersOnPage(nodes, section)) {
        if (selected.has(member.id) || sectionDrag[member.id] !== undefined) continue;
        sectionDrag[member.id] = { sectionId, x: member.x - section.x, y: member.y - section.y };
      }
    }
    set({ sectionDrag });
  },

  endSectionDrag: () => set({ sectionDrag: {} }),

  onNodesChange: (incoming) => {
    // The snap passes run before the settle branches, so hold, move op and ⌥-drag mint all read the snapped position (ONL-2044).
    const preState = get();
    const dragPass = snapDragChanges(incoming, preState);
    const resizePass = snapResizeChanges(dragPass.changes, preState);
    const changes = [...resizePass.changes];
    const changed = new Set(changes.filter((change) => change.type === 'position').map((change) => change.id));
    const membersBySection = new Map<string, [string, GestureFields['sectionDrag'][string]][]>();
    for (const [id, member] of Object.entries(preState.sectionDrag)) {
      const members = membersBySection.get(member.sectionId) ?? [];
      members.push([id, member]);
      membersBySection.set(member.sectionId, members);
    }
    for (const change of resizePass.changes) {
      if (change.type !== 'position' || change.position === undefined || change.dragging === undefined) continue;
      for (const [id, member] of membersBySection.get(change.id) ?? []) {
        if (changed.has(id)) continue;
        changes.push({ type: 'position', id, position: { x: change.position.x + member.x, y: change.position.y + member.y }, dragging: change.dragging });
        changed.add(id);
      }
    }
    const guides = resizePass.guides ?? dragPass.guides;
    const pendingOps: CanvasOp[] = [];
    set((state) => {
      let gesture = state.gesture;
      let measured = state.measured;
      let selectedNodeIds = state.selectedNodeIds;
      // The set is for lookups; the array stays the truth, since its order is recency.
      const selectedSet = new Set(selectedNodeIds);
      let duplicateDrag = state.duplicateDrag;
      let duplicateDragSettled: Partial<Record<CanvasNodeId, { x: number; y: number }>> | null =
        null;
      const changedIds = new Set<CanvasNodeId>();

      const hold = (id: string, patch: GestureOverride, reclaimsSettling = true): void => {
        // A gesture tick reclaims a hold left settling, or the previous op's echo deletes the active hold mid-gesture; a measurement hold must not, or it leaks past its echo.
        let held = gesture[id] ?? {};
        if (reclaimsSettling && held.isSettling) {
          const { isSettling: _reclaimed, ...rest } = held;
          held = rest;
        }
        gesture = { ...gesture, [id]: { ...held, ...patch } };
      };
      const settle = (id: string, patch: GestureOverride, op: CanvasOp | null): void => {
        hold(id, { ...patch, isSettling: true });
        if (op && state.doc?.nodes[id]) pendingOps.push(op);
      };

      for (const change of changes) {
        switch (change.type) {
          case 'position': {
            changedIds.add(change.id);
            if (!change.position) break;
            const { x, y } = change.position;
            if (duplicateDrag?.members.has(change.id)) {
              if (change.dragging === false) {
                gesture = { ...gesture };
                delete gesture[change.id];
                duplicateDragSettled ??= { ...duplicateDrag.settled };
                duplicateDragSettled[change.id] = { x, y };
              } else if (!duplicateDrag.isCancelled) {
                hold(change.id, { x, y });
              }
              break;
            }
            // Only an explicit `dragging: false`: resize position changes carry no `dragging`, and settling them sends a move op per tick.
            if (change.dragging === false) {
              settle(change.id, { x, y }, { type: 'move', id: change.id, x, y });
            } else {
              hold(change.id, { x, y });
            }
            break;
          }
          case 'dimensions': {
            changedIds.add(change.id);
            if (!change.dimensions) break;
            const { width, height } = change.dimensions;
            if (change.resizing === true) {
              if (state.resizeInFlightId !== change.id) break;
              // A hold only: `settleResize` is the one moment that knows the final box.
              hold(change.id, { width, height });
            } else if (change.setAttributes) {
              hold(change.id, { width, height }, false);
            } else {
              measured = { ...measured, [change.id]: { width, height } };
            }
            break;
          }
          case 'select': {
            changedIds.add(change.id);
            if (change.selected) {
              if (!selectedSet.has(change.id)) {
                selectedSet.add(change.id);
                selectedNodeIds = [...selectedNodeIds, change.id];
              }
            } else if (selectedSet.has(change.id)) {
              selectedSet.delete(change.id);
              selectedNodeIds = selectedNodeIds.filter((id) => id !== change.id);
            }
            break;
          }
          case 'remove': {
            changedIds.add(change.id);
            if (state.doc?.nodes[change.id]) {
              pendingOps.push({ type: 'remove', id: change.id });
            }
            break;
          }
          default:
            break;
        }
      }

      if (duplicateDrag && duplicateDragSettled !== null) {
        duplicateDrag = { ...duplicateDrag, settled: duplicateDragSettled };
      }

      const next = composable(state, {
        gesture,
        measured,
        selectedNodeIds,
      });
      return {
        ...next,
        nodes: composeMomentaryCanvasNodes(composition(next), state.nodes, changedIds),
        duplicateDrag,
        // Empty to empty keeps identity, or every non-drag batch re-renders the guides overlay.
        ...(guides !== null && !(guides.length === 0 && state.snapGuides.length === 0)
          ? { snapGuides: guides }
          : {}),
        ...(resizePass.readout !== null &&
        !(
          state.resizeReadout !== null &&
          state.resizeReadout.id === resizePass.readout.id &&
          state.resizeReadout.x === resizePass.readout.x &&
          state.resizeReadout.y === resizePass.readout.y &&
          state.resizeReadout.width === resizePass.readout.width &&
          state.resizeReadout.height === resizePass.readout.height
        )
          ? { resizeReadout: resizePass.readout }
          : {}),
        ...(resizePass.driver !== state.resizeDriver ? { resizeDriver: resizePass.driver } : {}),
      };
    });
    if (pendingOps.length > 0 && !dispatchCanvasOps(pendingOps)) {
      // A refused batch never echoes, and the echo is a settling hold's only release.
      set((state) => {
        const gesture = { ...state.gesture };
        for (const op of pendingOps) {
          if ('id' in op) delete gesture[op.id];
        }
        return recomposed(composable(state, { gesture }), state.nodes);
      });
    }

    const drag = get().duplicateDrag;
    if (!drag || !drag.ids.every((id) => drag.settled[id] !== undefined)) return;
    if (drag.isCancelled) {
      set({ duplicateDrag: null });
      return;
    }
    if (drag.ids.length === 1) {
      const id = drag.ids[0];
      const position = id ? drag.settled[id] : undefined;
      if (id && position) get().duplicateFrame(id, drag.view, position);
      set({ duplicateDrag: null });
      return;
    }

    const state = get();
    const doc = state.doc;
    if (!doc) return;
    let order = nextOrder(doc);
    const minted: string[] = [];
    const copied: CanvasNode[] = [];
    const duplicateOps: CanvasOp[] = [];
    for (const id of drag.ids) {
      const source = doc.nodes[id];
      const position = drag.settled[id];
      if (!source || !position) continue;
      const duplicate = mintedDuplicate(source, position, order);
      if (duplicate === undefined) continue;
      minted.push(duplicate.id);
      copied.push(source);
      duplicateOps.push(duplicate.op);
      order += 1;
    }
    const dispatched = dispatchCanvasOps(duplicateOps);
    if (dispatched) reportNodesCreated(copied, 'duplicate');
    set((current) =>
      dispatched
        ? {
            ...recomposed(composable(current, { selectedNodeIds: minted }), current.nodes),
            duplicateDrag: null,
          }
        : { duplicateDrag: null },
    );
  },
});
