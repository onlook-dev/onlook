import {
  artifactPageUrl,
  type CanvasTool,
  isArtifactNode,
  isBrowserNode,
  isDividerName,
  nextCurrentPage,
  nodesOnPage,
  resolveNodePageId,
  type CanvasCamera,
  type CanvasDoc,
  type CanvasDocId,
  type CanvasNode,
  type CanvasNodeId,
  type CanvasOp,
  type CanvasOpEntry,
  type CanvasPageCameras,
  type CanvasPageId,
  type CanvasPageSwitchMethod,
  type FrameQuotes,
  NO_FRAME_QUOTES,
  type ServerEntryState,
} from '@studio/events';
import { create } from 'zustand';
import { sameFrameQuotes } from './frame/quoteRules.js';
import { flagEnabled, onFlagsAnswered } from '../flags/store.js';
import type { LeftPanelView } from '../rail/leftPanel.js';
import { useSettingsStore } from '../settings/store.js';
import { telemetryProjectFields } from '../workspace/store.js';
import { peekArtifact, servesPage } from './artifact/artifactCache.js';
import { artifactPreviewDemand, previewRequestFor } from './artifact/previewDemand.js';
import { artifactSnapshots } from './artifact/snapshots.js';
import { createClipboardActions, type ClipboardActions } from './clipboard/actions.js';
import { composable, composition, currentCanvasPageId, recomposed, type Composable } from './compose.js';
import {
  afterSelections,
  createElementPickingActions,
  focusedFrameId,
  initialElementPickingFields,
  type ElementPickingActions,
  type ElementPickingFields,
} from './elementPicking.js';
import { isGuestShielded } from './frame/geometry.js';
import {
  createFrameNavigationActions,
  initialFrameNavigationFields,
  type FrameNavigationActions,
  type FrameNavigationFields,
} from './frame/navigation.js';
import { clearFrameDrawPatch, isDrawnTool } from './frameDraw.js';
import {
  clearedDragVisuals,
  createGestureActions,
  initialGestureFields,
  resetGesturesForTests,
  type GestureActions,
  type GestureFields,
} from './gestures.js';
import { setCanvasHistorySources } from './historyDispatch.js';
import {
  createImageActions,
  initialImageFields,
  resetImageActionsForTests,
  type ImageActions,
  type ImageFields,
} from './image/actions.js';
import type { InlineAttachmentFields } from './inlineAttachments.js';
import type { CanvasFlowNode } from './model.js';
import { arrivalFit, documentEarnsFit } from './mountFit.js';
import { createNodeActions, initialNodeFields, type NodeActions, type NodeFields } from './nodes.js';
import { createPageActions, initialPageFields, type PageActions, type PageFields } from './pages.js';
import {
  composeCanvasNodes,
  composedPageId,
  defaultOverlay,
  pruneToIds,
  type FrameOverlay,
  type GestureOverride,
} from './readModel.js';
import { reportInlineChatClosed, sendTelemetry } from './telemetry.js';
import {
  createTextActions,
  initialTextFields,
  type TextActions,
  type TextFields,
} from './text/actions.js';
import { canvasTransport, endCanvasSwitch, setCanvasDocSource } from './wire.js';

/** Where a page with no camera opens: keeping the outgoing page's pan strands the user on blank canvas at an arbitrary world position (ONL-2488). */
const CANVAS_ORIGIN: CanvasCamera = { x: 0, y: 0, zoom: 1 };

/** Each layer behind the gate it is shown behind, and read at the switch, so what it counts is what the arriving page already holds, never what painted (ONL-2791). */
function artifactPictures(pageNodes: readonly CanvasNode[]): { nodes: number; covers: number; snapshots: number } {
  let nodes = 0;
  let covers = 0;
  let snapshots = 0;
  for (const node of pageNodes) {
    if (!isArtifactNode(node)) continue;
    nodes += 1;
    const { artifactId, pagePath } = node.content;
    const artifact = peekArtifact(artifactId);
    if (artifact === null || artifact === undefined) continue;
    if (!servesPage(artifact, pagePath)) continue;
    if (artifactPreviewDemand.poster(previewRequestFor(artifactId, pagePath, artifact)) !== undefined) covers += 1;
    const url = artifactPageUrl(artifactId, pagePath ?? artifact.pagePath);
    if (artifactSnapshots.has(`${node.id}:${url}:${artifact.updatedAt}`)) snapshots += 1;
  }
  return { nodes, covers, snapshots };
}

/** Counts and a method only: the page's name is the user's own vocabulary for their product (ONL-2488). */
function reportPageSwitched(
  method: CanvasPageSwitchMethod,
  nodeCount: number,
  pictures: { nodes: number; covers: number; snapshots: number },
): void {
  const since = docOpenedAt === null ? undefined : Math.max(0, Date.now() - docOpenedAt.at);
  sendTelemetry({
    event: 'page_switched',
    properties: {
      ...telemetryProjectFields(),
      method,
      node_count: nodeCount,
      artifact_node_count: pictures.nodes,
      artifact_cover_held_count: pictures.covers,
      artifact_snapshot_held_count: pictures.snapshots,
      ...(since === undefined ? {} : { ms_since_open: since }),
    },
  });
}

// `doc` mirrors main's document: it changes only by snapshot or in-order broadcast, and a user edit is an op that lands on the echo (ONL-1993).

export type { CanvasTool };

/** The tools that add a node; `setTool` treats the two alike. */
const OBJECT_TOOLS: readonly CanvasTool[] = ['frame', 'text', 'artifact', 'section'];

export type CanvasMode = 'design' | 'interact';

/** Read this, not a node's composed `selected`: at N > 1 that answers composition order, not the frame the user touched last (ONL-2043). */
export function primaryFrameId(
  state: Pick<CanvasState, 'nodes' | 'selectedNodeIds'>,
): string | null {
  for (let i = state.selectedNodeIds.length - 1; i >= 0; i -= 1) {
    const id = state.selectedNodeIds[i];
    if (id !== undefined && state.nodes.some((node) => node.id === id)) return id;
  }
  return null;
}

/** One selection and this node: handles on a multi-selection member read as singling it out. */
export function isLoneSelectedNode(
  state: Pick<CanvasState, 'nodes' | 'selectedNodeIds'>,
  id: CanvasNodeId,
): boolean {
  return (
    state.nodes.filter((node) => node.selected === true).length === 1 &&
    primaryFrameId(state) === id
  );
}

/** The node the canvas is acting on: the lone selected one, or — a picked element selects no node — the one holding that element (ONL-2640). */
export function armedNodeId(
  state: Pick<CanvasState, 'nodes' | 'selectedNodeIds' | 'elementSelections'>,
): CanvasNodeId | null {
  // The raw list, not the composed count: a created node is selected before main's echo composes it, and that is a selection, not an absence (ONL-2640).
  if (state.selectedNodeIds.length === 0) return focusedFrameId(state);
  const primary = primaryFrameId(state);
  return primary !== null && isLoneSelectedNode(state, primary) ? primary : null;
}

/** One selection, one readout: a badge per node gives a gathered selection competing numbers, and a resize in flight already reads itself out. */
export function dimensionBadgeNodeId(
  state: Pick<CanvasState, 'nodes' | 'resizeReadout' | 'textEditId'>,
): CanvasNodeId | null {
  let only: CanvasNodeId | undefined;
  for (const node of state.nodes) {
    if (node.selected !== true || node.id === state.resizeReadout?.id) continue;
    if (only !== undefined) return null;
    only = node.id;
  }
  // The edited node's stored box stays frozen under the caret, so its badge would strand below the drawn one (ONL-2501).
  if (only === undefined || only === state.textEditId) return null;
  return only;
}

/** The box a picture draws at, authored: the gesture's while one holds it, else the document's. React Flow hands a node its last DOM measurement as `width`/`height`, which trails the authored box through a locked resize and letterboxes the picture inside it (ONL-2501). */
export function drawnImageBox(
  state: Pick<CanvasState, 'doc' | 'gesture'>,
  id: CanvasNodeId,
): { width: number; height: number } | null {
  const durable = state.doc?.nodes[id];
  if (!durable) return null;
  const held = state.gesture[id];
  return { width: held?.width ?? durable.width, height: held?.height ?? durable.height };
}

export function drawnTextBox(
  state: Pick<CanvasState, 'doc' | 'gesture' | 'resizeInFlightId'>,
  id: CanvasNodeId,
): { width: number; height: number; wrapWidth?: number } | null {
  const durable = state.doc?.nodes[id];
  if (durable?.kind !== 'text') return null;
  const held = state.gesture[id];
  const width = held?.width ?? durable.width;
  return {
    width,
    height: held?.height ?? durable.height,
    wrapWidth: state.resizeInFlightId === id || held?.isSettling ? width : durable.content.wrapWidth,
  };
}

export function isFrameShielded(
  state: Pick<CanvasState, 'resizeInFlightId' | 'tool' | 'isSpacePanning' | 'mode' | 'fileDrag'>,
  id: string,
): boolean {
  return isGuestShielded({
    isResizing: state.resizeInFlightId === id,
    tool: state.tool,
    isSpacePanning: state.isSpacePanning,
    mode: state.mode,
    isFileDragging: state.fileDrag !== null,
  });
}

export interface CanvasProject {
  path: string;
  name: string;
}

export interface CanvasState
  extends ImageFields,
    ImageActions,
    ClipboardActions,
    TextFields,
    TextActions,
    ElementPickingFields,
    ElementPickingActions,
    InlineAttachmentFields,
    FrameNavigationFields,
    FrameNavigationActions,
    NodeFields,
    NodeActions,
    PageFields,
    PageActions,
    GestureFields,
    GestureActions {
  project: CanvasProject | null;

  doc: CanvasDoc | null;
  /** The one page composed into React Flow; a dangling id reads as the document's first, so it is never a blank canvas (ONL-2488). */
  currentPageId: CanvasPageId | null;
  overlay: Record<CanvasNodeId, FrameOverlay>;
  gesture: Record<CanvasNodeId, GestureOverride>;
  /** React Flow's own measurements: without them `nodesInitialized` never flips and the mount `fitView` silently never runs. */
  measured: Record<CanvasNodeId, { width: number; height: number }>;
  /** Order is selection recency: the last live id is the primary, the frame wearing the resize handles (ONL-2043). */
  selectedNodeIds: CanvasNodeId[];
  serverEntries: ServerEntryState[];
  /** Main's answer for this document (ONL-2960). */
  frameQuotes: FrameQuotes;
  /** Composed from `doc`, overlay, gesture and selection (`readModel.ts`); the next composition overwrites a direct write. */
  nodes: CanvasFlowNode[];

  tool: CanvasTool;
  mode: CanvasMode;
  /** The export panel is up: the canvas selects, and nothing picks, hovers or opens an inline chat (ONL-2593). */
  isExportMode: boolean;
  /** Which view the left panel is showing, on its own axis — see `rail/leftPanel.ts` for why it is not called a mode (ONL-2563). */
  leftPanelView: LeftPanelView;
  /** Separate from `mode`: Interact hides both rails without writing this, so the user's choice survives leaving Interact (ONL-2236). */
  hiddenRails: { left: boolean; right: boolean };
  /** Which rails the user opened in Preview; entering Preview closes both again (ONL-2593). */
  previewRails: { left: boolean; right: boolean };
  chromeHidden: boolean;

  /** Not folded into `tool`: a release that never arrives (⌘-tab) would strand the user in a tool they never picked. */
  isSpacePanning: boolean;
  /** The frame whose guest relayed the standing hold; `null` is the host's own, whose keyup and blur still arrive (ONL-2577). */
  spacePanFrameId: string | null;

  /** Held for the whole mount, never consumed: React Flow re-reads `fitView` on every change, so clearing it queues a fit that discards the camera. */
  restoredViewport: CanvasCamera | null;
  /** Where each page was left this session; main holds the durable copy, and only the opening page's reaches the renderer (ONL-2488). */
  pageCameras: Record<CanvasPageId, CanvasCamera>;
  /** A camera to install now, at zero duration: `defaultViewport` is read at init only, so a switch cannot go through it (ONL-2488). */
  viewportRequest: { camera: CanvasCamera; seq: number } | null;
  /** The camera is a capture's, not the person's, and is never saved (ONL-3031). */
  captureCameraHeld: boolean;

  /** Any node kind: under the pointer on the canvas, or named by a list row or chat chip. Draws its hover ring, and is what ⌥ measures to. */
  hoveredNodeId: CanvasNodeId | null;

  /** Sections the Designs list is showing shut. A view preference, so it is never written to the document (ONL-2661). */
  closedSectionIds: CanvasNodeId[];

  /** Sequenced: the same link clicked twice is two requests, and an effect keyed on the id alone drops the second (ONL-1995). */
  flyTo: { id: string; seq: number; reveal?: boolean } | null;
  /** A fit the canvas owes: what a document opens with, placed at once, and the first object onto an empty page, flown to. A label or a picture the user placed never raises it (ONL-2486). */
  fitRequest: { seq: number; animate?: true } | null;
  /** The opening fit is spent by the first document, whether or not it had anything to fit, so a resync never re-places the camera (ONL-2486). */
  mountFitDone: boolean;
  /** The frame "Add inspiration" is flying in: renderer-only, never saved (ONL-2960). */
  inspiration: { frameId: CanvasNodeId } | null;

  setProject: (project: CanvasProject) => void;
  setTool: (tool: CanvasTool) => void;
  setSpacePanning: (isSpacePanning: boolean) => void;
  /** The guest's own relay, which only that frame's release ends (ONL-2577). */
  relaySpacePan: (frameId: string, held: boolean) => void;
  /** That guest's document is gone, so its release can never arrive (ONL-2577). */
  releaseSpacePanFrom: (frameId: string) => void;
  setMode: (mode: CanvasMode) => void;
  setLeftPanelView: (view: LeftPanelView) => void;
  /** Also ends a standing `chromeHidden`: from canvas-alone every rail toggle shows a rail. */
  toggleRail: (side: 'left' | 'right') => void;
  toggleChrome: () => void;

  /** Call before the editor surface commits: React Flow reads `defaultViewport` at init only. `pageId` is the page that camera belongs to (ONL-2488). */
  seedCamera: (camera: CanvasCamera | undefined, pageId?: CanvasPageId) => void;
  /** Main's durable copy for every page, so a page first visited this session opens where the last one left it (ONL-2488). A page absent from it has no camera and keeps the origin. */
  seedPageCameras: (docId: CanvasDocId, byPage: CanvasPageCameras['byPage']) => void;
  /** A single click: drops the selection, restores that page's camera and settles the mount fit, and touches nothing the chat owns (ONL-2488). */
  setCurrentPage: (pageId: CanvasPageId, method: CanvasPageSwitchMethod) => void;
  /** The camera at rest, recorded against the current page and persisted; lossy, since main debounces. */
  noteCameraSettled: (camera: CanvasCamera) => void;
  noteViewportSet: () => void;
  holdCaptureCamera: (isHeld: boolean) => void;
  replaceDoc: (doc: CanvasDoc | null) => void;
  /** `doc` already has `entry` applied. */
  applyMirror: (doc: CanvasDoc, entry: CanvasOpEntry) => void;
  applyServerBook: (entries: ServerEntryState[]) => void;
  applyFrameQuotes: (quotes: FrameQuotes) => void;

  /** Authors no ops: it runs on a project switch, and an op here would edit the outgoing document. */
  clearFrames: () => void;
  /** The caller reports what the user did: a plain pick replaces, `gather` toggles membership. */
  selectFrame: (id: string, gather: boolean) => void;
  deselectFrames: () => void;
  hoverNode: (id: CanvasNodeId | null) => void;
  toggleSectionClosed: (id: CanvasNodeId) => void;
  /** `false` is the frame-gone outcome the caller surfaces; nothing moves. */
  /** `reveal` zooms out, never in, until the whole node is on screen. */
  flyToFrame: (id: string, reveal?: boolean) => boolean;
  noteFitted: () => void;
  noteFlownTo: () => void;
  beginInspiration: (frameId: CanvasNodeId) => void;
  endInspiration: (frameId: CanvasNodeId) => void;
}

/** The page an op takes away from under the user: removed, or renamed into a rule (ONL-2488). */
function pageLeftBy(op: CanvasOp): CanvasPageId | null {
  if (op.type === 'remove-page') return op.pageId;
  if (op.type === 'rename-page' && isDividerName(op.name)) return op.pageId;
  return null;
}

/** A prune that drops nothing returns its input by reference: consumers select by identity, and a fresh copy re-renders them on every op. */
function reconciled(
  next: Composable,
  current: Pick<
    CanvasState,
    | 'elementSelections'
    | 'elementAnchorRects'
    | 'elementMappings'
    | 'inlineChat'
    | 'gatherRefusal'
    | 'renamingFrameId'
    | 'duplicateDrag'
    | 'portFollowRefresh'
    | 'resizeReadout'
    | 'resizeInFlightId'
    | 'resizeInFlightPointerId'
    | 'resizeDriver'
    | 'textDraft'
    | 'textEditId'
    | 'nodes'
  >,
): Partial<CanvasState> {
  // The mount url is captured when an id first appears, so a later home-URL op cannot drive a live webview's `src`.
  let overlay = next.overlay;
  if (next.doc) {
    for (const node of Object.values(next.doc.nodes)) {
      if (!isBrowserNode(node)) continue;
      if (overlay[node.id] === undefined) {
        if (overlay === next.overlay) overlay = { ...next.overlay };
        overlay[node.id] = defaultOverlay(node);
      }
    }
  }
  let seeded = { ...next, overlay };
  let nodes = composeCanvasNodes(composition(seeded), current.nodes);
  const live = new Set(nodes.map((node) => node.id));
  // What the document holds, not what this page composes: a frame's facts outlive the page switch that unmounted it (ONL-2488).
  const known = new Set(Object.keys(next.doc?.nodes ?? {}));
  const previouslyLive = new Set(current.nodes.map((node) => node.id));
  let duplicateDrag = current.duplicateDrag;
  if (duplicateDrag !== null && duplicateDrag.ids.some((id) => !live.has(id))) {
    const gesture = { ...seeded.gesture };
    for (const id of duplicateDrag.ids) delete gesture[id];
    seeded = { ...seeded, gesture };
    nodes = composeCanvasNodes(composition(seeded), current.nodes);

    const ids = duplicateDrag.ids.filter((id) => live.has(id));
    const settled = pruneToIds(duplicateDrag.settled, live);
    duplicateDrag = ids.every((id) => settled[id] !== undefined)
      ? null
      : {
          ...duplicateDrag,
          ids,
          members: new Set(ids),
          settled,
          isCancelled: true,
        };
  }
  // Only an id the document removed leaves: pruning never-seen ids (mints in flight) made a batch duplicate's first echo deselect its siblings (ONL-2043).
  const keepsSelection = (id: CanvasNodeId): boolean => live.has(id) || !previouslyLive.has(id);
  const elementSelections = current.elementSelections.every((selection) =>
    live.has(selection.frameNodeId),
  )
    ? current.elementSelections
    : current.elementSelections.filter((selection) => live.has(selection.frameNodeId));
  return {
    ...seeded,
    overlay: pruneToIds(overlay, known),
    gesture: pruneToIds(next.gesture, live),
    // `known` for the same reason `overlay` takes it: a measurement is the node's, and the node outlives the page switch that unmounted it (ONL-2488).
    measured: pruneToIds(next.measured, known),
    selectedNodeIds: next.selectedNodeIds.every(keepsSelection)
      ? next.selectedNodeIds
      : next.selectedNodeIds.filter(keepsSelection),
    elementSelections,
    ...afterSelections(current, elementSelections),
    portFollowRefresh: pruneToIds(current.portFollowRefresh, live),
    renamingFrameId:
      current.renamingFrameId !== null && !live.has(current.renamingFrameId)
        ? null
        : current.renamingFrameId,
    // Released by its own node arriving, not by the commit: the draft paints the committed value across the echo's round trip.
    textDraft:
      current.textDraft !== null && live.has(current.textDraft.id) ? null : current.textDraft,
    textEditId:
      current.textEditId !== null &&
      !live.has(current.textEditId) &&
      current.textDraft?.id !== current.textEditId
        ? null
        : current.textEditId,
    duplicateDrag,
    // A null id is the frame tool's draw, which no document change may clear.
    resizeReadout:
      current.resizeReadout !== null &&
      current.resizeReadout.id !== null &&
      !live.has(current.resizeReadout.id)
        ? null
        : current.resizeReadout,
    resizeInFlightId:
      current.resizeInFlightId !== null && !live.has(current.resizeInFlightId)
        ? null
        : current.resizeInFlightId,
    resizeInFlightPointerId:
      current.resizeInFlightId !== null && !live.has(current.resizeInFlightId)
        ? null
        : current.resizeInFlightPointerId,
    resizeDriver:
      current.resizeInFlightId !== null && !live.has(current.resizeInFlightId)
        ? null
        : current.resizeDriver,
    nodes,
  };
}

const initialComposable: Composable = {
  doc: null,
  currentPageId: null,
  overlay: {},
  gesture: {},
  measured: {},
  selectedNodeIds: [],
  serverEntries: [],
  frameQuotes: NO_FRAME_QUOTES,
};

const initialCanvasFields = () => ({
  project: null,
  ...recomposed(initialComposable),
  tool: 'select' as const,
  mode: 'design' as const,
  isExportMode: false,
  leftPanelView: 'designs' as const,
  hiddenRails: { left: false, right: false },
  previewRails: { left: false, right: false },
  chromeHidden: false,
  restoredViewport: null,
  pageCameras: {},
  viewportRequest: null,
  captureCameraHeld: false,
  hoveredNodeId: null,
  closedSectionIds: [],
  flyTo: null,
  fitRequest: null,
  mountFitDone: false,
  inspiration: null,
  isSpacePanning: false,
  spacePanFrameId: null,
  ...initialImageFields(),
  ...initialTextFields(),
  ...initialElementPickingFields(),
  ...initialFrameNavigationFields(),
  ...initialNodeFields(),
  ...initialPageFields(),
  ...initialGestureFields(),
});

/** When this session saw the open document arrive, so a switch can report how soon after it happened (ONL-2488). */
let docOpenedAt: { docId: CanvasDocId; at: number } | null = null;

export const useCanvasStore = create<CanvasState>()((set, get, api) => ({
  ...initialCanvasFields(),
  ...createImageActions(set, get, api),
  ...createClipboardActions(set, get, api),
  ...createTextActions(set, get, api),
  ...createElementPickingActions(set, get, api),
  ...createFrameNavigationActions(set, get, api),
  ...createNodeActions(set, get, api),
  ...createPageActions(set, get, api),
  ...createGestureActions(set, get, api),

  setProject: (project) => {
    set({ project });
  },

  setTool: (tool) => {
    set((state) => {
      // Interact leaves the guest unshielded, so a frame draw crossing a live frame loses its pointerup to the webview and a placing click vanishes into the page.
      const next = OBJECT_TOOLS.includes(tool) && (state.mode === 'interact' || state.leftPanelView === 'code') ? 'select' : tool;
      return {
        tool: next,
        ...(next === 'pan' || OBJECT_TOOLS.includes(next)
          ? { isPicking: false, inlineChat: null, inlineChatCloseReason: 'tool-switch' as const, gatherRefusal: null }
          : {}),
        ...(isDrawnTool(next) ? {} : (clearFrameDrawPatch(state) ?? {})),
      };
    });
  },

  /** Leaves the picker armed: a held space is a momentary pan, and disarming cancels what the user was reaching for. */
  setSpacePanning: (isSpacePanning) => {
    const state = get();
    if (state.isSpacePanning === isSpacePanning && state.spacePanFrameId === null) return;
    set({ isSpacePanning, spacePanFrameId: null });
  },

  relaySpacePan: (frameId, held) => {
    if (!held) {
      get().releaseSpacePanFrom(frameId);
      return;
    }
    const state = get();
    if (state.isSpacePanning && state.spacePanFrameId === frameId) return;
    set({ isSpacePanning: true, spacePanFrameId: frameId });
  },

  releaseSpacePanFrom: (frameId) => {
    if (get().spacePanFrameId !== frameId) return;
    set({ isSpacePanning: false, spacePanFrameId: null });
  },

  setMode: (mode) => {
    // Interact opens on select: the hand would shield the guest.
    // Selections and the inline bubble persist; FrameNode hides the bubble in Interact and Design restores it, draft included (ONL-2455).
    set((state) => ({
      mode,
      ...(mode === 'interact'
        ? {
            ...(state.mode === 'interact' ? {} : { previewRails: { left: false, right: false } }),
            isPicking: false,
            // The gather's own transient goes with the mode that refused the pick (ONL-2482).
            gatherRefusal: null,
            tool: 'select' as const,
            ...clearFrameDrawPatch(state),
          }
        : {}),
    }));
  },

  setLeftPanelView: (view) => {
    if (view === 'code' && !useSettingsStore.getState().experimentalCodePanel) view = 'designs';
    if (get().leftPanelView === view) return;
    set((state) => ({
      leftPanelView: view,
      ...(view === 'code' && OBJECT_TOOLS.includes(state.tool)
        ? { tool: 'select' as const, ...clearFrameDrawPatch(state) }
        : {}),
    }));
  },

  toggleRail: (side) => {
    set((state) =>
      state.mode === 'interact'
        ? { previewRails: { ...state.previewRails, [side]: !state.previewRails[side] } }
        : {
            hiddenRails: { ...state.hiddenRails, [side]: !state.hiddenRails[side] },
            chromeHidden: false,
          },
    );
  },
  toggleChrome: () => {
    set((state) => {
      const hidden = !state.chromeHidden;
      return { chromeHidden: hidden, hiddenRails: { left: hidden, right: hidden } };
    });
  },

  seedCamera: (camera, pageId) => {
    set({
      restoredViewport: camera ?? null,
      ...(pageId === undefined ? {} : { currentPageId: pageId }),
      ...(camera !== undefined && pageId !== undefined ? { pageCameras: { [pageId]: camera } } : {}),
    });
  },

  seedPageCameras: (docId, byPage) => {
    set((state) => {
      if (state.doc?.docId !== docId) return state;
      // This session wins: main's copy is debounced, so a camera settled seconds ago is not in it yet.
      return { pageCameras: { ...byPage, ...state.pageCameras } };
    });
  },

  setCurrentPage: (requested, method) => {
    set((state) => {
      const doc = state.doc;
      if (doc === null || doc.pages[requested] === undefined) return state;
      // Resolved before it is named: main refuses a rule outright, so sending one is how the two sides come apart (ONL-2488).
      const pageId = composedPageId(doc, requested);
      if (pageId === null || pageId === currentCanvasPageId(state)) return state;
      // Re-seated while the guest is unmounting, as `rehomeDeadFrame` does: a designer deep in a route returns there, not to the project's front door (ONL-2488).
      let overlay = state.overlay;
      for (const node of Object.values(doc.nodes)) {
        if (!isBrowserNode(node) || resolveNodePageId(doc, node) === pageId) continue;
        const facts = overlay[node.id];
        if (facts === undefined || facts.mountUrl === facts.currentUrl) continue;
        if (overlay === state.overlay) overlay = { ...state.overlay };
        overlay[node.id] = { ...facts, mountUrl: facts.currentUrl };
      }
      canvasTransport()?.canvasCurrentPage({ docId: doc.docId, pageId });
      const held = state.pageCameras[pageId];
      const hasNodes = Object.values(doc.nodes).some(
        (node) => resolveNodePageId(doc, node) === pageId,
      );
      const camera = held ?? (hasNodes ? null : CANVAS_ORIGIN);
      const pageNodes = nodesOnPage(doc, pageId);
      reportPageSwitched(method, pageNodes.length, artifactPictures(pageNodes));
      return {
        ...reconciled(
          composable(state, { currentPageId: pageId, overlay, selectedNodeIds: [], gesture: {} }),
          state,
        ),
        // The pointer cannot be on a node of the page being left; a kept id would ring an unhovered one on return (ONL-2488).
        hoveredNodeId: null,
        // A pending fit would land after the `setViewport` and discard it; a page that holds nodes and no camera is the one that earns one.
        fitRequest: camera === null ? { seq: (state.fitRequest?.seq ?? 0) + 1 } : null,
        mountFitDone: true,
        viewportRequest:
          camera === null ? null : { camera, seq: (state.viewportRequest?.seq ?? 0) + 1 },
      };
    });
  },

  noteCameraSettled: (camera) => {
    set((state) => {
      if (state.captureCameraHeld) return state;
      const doc = state.doc;
      const pageId = currentCanvasPageId(state);
      if (doc === null || pageId === null) return state;
      canvasTransport()?.canvasViewport({ docId: doc.docId, pageId, camera });
      return { pageCameras: { ...state.pageCameras, [pageId]: camera } };
    });
  },

  noteViewportSet: () => {
    set({ viewportRequest: null });
  },

  holdCaptureCamera: (isHeld) => {
    set({ captureCameraHeld: isHeld });
  },

  replaceDoc: (doc) => {
    if (doc === null) docOpenedAt = null;
    else if (docOpenedAt?.docId !== doc.docId) docOpenedAt = { docId: doc.docId, at: Date.now() };
    // Pinned on arrival and told to main: left unnamed, a reorder would move the view (ONL-2488).
    const pin = doc === null || get().currentPageId !== null ? null : composedPageId(doc, null);
    if (pin !== null && doc !== null) canvasTransport()?.canvasCurrentPage({ docId: doc.docId, pageId: pin });
    // Gesture resets: an in-flight hand against a world that just diverged is what the resync ends.
    set((state) => {
      const next = reconciled(
        composable(state, { doc, gesture: {}, ...(pin === null ? {} : { currentPageId: pin }) }),
        state,
      );
      // A closed canvas is not a document opening, so it leaves the fit unspent for the one that follows.
      if (state.mountFitDone || doc === null) return next;
      // The composed page, not the project: a fit raised against an off-page node is never consumed, and sits waiting to land on the next array (ONL-2488).
      const earns = documentEarnsFit({
        hasRestoredViewport: state.restoredViewport !== null,
        nodeCount: next.nodes?.length ?? 0,
      });
      return {
        ...next,
        mountFitDone: true,
        ...(earns ? { fitRequest: { seq: (state.fitRequest?.seq ?? 0) + 1 } } : {}),
      };
    });
  },

  applyMirror: (doc, entry) => {
    // The echo vacates too: only the gesture that authored it did, so an agent's delete or an
    // undo would leave the view on a dead page and save its camera over another's (ONL-2488).
    const leaving = pageLeftBy(entry.op);
    if (leaving !== null) {
      const before = get().doc;
      if (before !== null && currentCanvasPageId(get()) === leaving) {
        const next = nextCurrentPage(before, leaving);
        if (next !== undefined) get().setCurrentPage(next.id, 'vacated');
      }
    }
    set((state) => {
      const op = entry.op;
      let gesture = state.gesture;
      // Only a settling hold is released; mid-drag, the hand wins over a broadcast. A move releases only at its own position: a held arrow's early echoes would pull the frame back a step.
      const held = 'id' in op ? gesture[op.id] : undefined;
      const isOwnEcho = op.type === 'move'
        ? held?.x === op.x && held.y === op.y
        : op.type === 'resize'
          ? held?.x === op.x && held.y === op.y && held.width === op.width && held.height === op.height
          : true;
      if ((op.type === 'move' || op.type === 'resize') && held?.isSettling && isOwnEcho && state.resizeInFlightId !== op.id) {
        gesture = { ...gesture };
        delete gesture[op.id];
      }
      const next = reconciled(composable(state, { doc, gesture }), state);
      // A frame the agent puts on a page the user is not looking at moves nothing (ONL-2488).
      const fit =
        op.type === 'create' &&
        resolveNodePageId(doc, op.node) === composedPageId(doc, state.currentPageId) &&
        op.node.id !== state.inspiration?.frameId
          ? arrivalFit({
              hasRestoredViewport: state.restoredViewport !== null,
              previousNodeCount: state.nodes.length,
              kind: op.node.kind,
              author: flagEnabled('blank-first-moment') ? entry.author : 'user',
            })
          : 'none';
      if (fit === 'none') return next;
      const seq = (state.fitRequest?.seq ?? 0) + 1;
      return { ...next, fitRequest: fit === 'fly' ? { seq, animate: true } : { seq } };
    });
  },

  applyServerBook: (entries) => {
    set((state) => recomposed(composable(state, { serverEntries: entries }), state.nodes));
  },

  applyFrameQuotes: (quotes) => {
    if (sameFrameQuotes(get().frameQuotes, quotes)) return;
    set((state) => recomposed(composable(state, { frameQuotes: quotes }), state.nodes));
  },

  clearFrames: () => {
    // Module-level store: without this reset `hiddenRails` outlives the editor's unmount.
    set((state) => ({
      ...reconciled(
        {
          doc: null,
          currentPageId: null,
          overlay: {},
          gesture: {},
          measured: {},
          selectedNodeIds: [],
          serverEntries: [],
          frameQuotes: NO_FRAME_QUOTES,
        },
        {
          elementSelections: [],
          elementAnchorRects: {},
          elementMappings: {},
          inlineChat: null,
          gatherRefusal: null,
          renamingFrameId: null,
          duplicateDrag: null,
          portFollowRefresh: {},
          resizeReadout: null,
          resizeInFlightId: null,
          resizeDriver: null,
          resizeInFlightPointerId: null,
          textDraft: null,
          textEditId: null,
          nodes: [],
        },
      ),
      inlineChatCloseReason: 'canvas-cleared',
      project: null,
      isExportMode: false,
      renamingPageId: null,
      pendingPageId: null,
      mintedPageOrder: null,
      canvasRefusal: null,
      hiddenRails: { left: false, right: false },
      previewRails: { left: false, right: false },
      chromeHidden: false,
      leftPanelView: 'designs',
      closedSectionIds: [],
      isPicking: false,
      gatherRefusal: null,
      frameDraw: null,
      fileDrag: null,
      imageRefusal: null,
      isSpacePanning: false,
      spacePanFrameId: null,
      ...clearedDragVisuals(state),
      // Left set, it suppresses the next editor mount's fit.
      restoredViewport: null,
      pageCameras: {},
      viewportRequest: null,
      captureCameraHeld: false,
      mountFitDone: false,
      fitRequest: null,
      inspiration: null,
    }));
  },

  selectFrame: (id, gather) => {
    set((state) => {
      const selectedNodeIds = gather
        ? state.selectedNodeIds.includes(id)
          ? state.selectedNodeIds.filter((held) => held !== id)
          : [...state.selectedNodeIds, id]
        : [id];
      return recomposed(composable(state, { selectedNodeIds }), state.nodes);
    });
  },

  deselectFrames: () => {
    set((state) => recomposed(composable(state, { selectedNodeIds: [] }), state.nodes));
  },

  hoverNode: (id) => {
    if (get().hoveredNodeId !== id) set({ hoveredNodeId: id });
  },

  toggleSectionClosed: (id) => {
    const closed = get().closedSectionIds;
    set({ closedSectionIds: closed.includes(id) ? closed.filter((held) => held !== id) : [...closed, id] });
  },

  flyToFrame: (id, reveal = false) => {
    const state = get();
    const doc = state.doc;
    const node = doc === null ? undefined : doc.nodes[id];
    if (doc === null || node === undefined) return false;
    // Before the request: the centre resolves against the composed array, so a node off the current page would answer success and move nothing (ONL-2488).
    get().setCurrentPage(resolveNodePageId(doc, node), 'link');
    set((current) => ({ flyTo: { id, seq: (current.flyTo?.seq ?? 0) + 1, ...(reveal ? { reveal } : {}) } }));
    return true;
  },

  noteFlownTo: () => {
    set({ flyTo: null });
  },

  noteFitted: () => {
    set({ fitRequest: null });
  },

  beginInspiration: (frameId) => {
    set({ inspiration: { frameId } });
  },

  endInspiration: (frameId) => {
    if (get().inspiration?.frameId === frameId) set({ inspiration: null });
  },
}));

setCanvasHistorySources({
  state: () => useCanvasStore.getState(),
  transport: canvasTransport,
});
setCanvasDocSource(() => useCanvasStore.getState().doc);
useCanvasStore.subscribe(reportInlineChatClosed);

useSettingsStore.subscribe((state) => {
  if (!state.experimentalCodePanel && useCanvasStore.getState().leftPanelView === 'code') {
    useCanvasStore.getState().setLeftPanelView('designs');
  }
});

/* A document can arrive before main has answered `app:flags`; the answer composes it again (ONL-2661). */
onFlagsAnswered(() => {
  useCanvasStore.setState((state) => recomposed(composable(state, {}), state.nodes));
});

export function resetCanvasStoreForTests(): void {
  endCanvasSwitch();
  resetGesturesForTests();
  resetImageActionsForTests();
  useCanvasStore.setState(initialCanvasFields());
}

export function isRailHidden(
  state: Pick<CanvasState, 'mode' | 'hiddenRails' | 'previewRails'>,
  edge: 'left' | 'right',
): boolean {
  return state.mode === 'interact' ? !state.previewRails[edge] : state.hiddenRails[edge];
}

/** Not derived from the rails: both hidden by hand is two panel statements, not canvas-alone (ONL-2256). */
export function isChromeHidden(state: CanvasState): boolean {
  return state.chromeHidden;
}

// A hot swap would leave two stores, one seated on the wire and one behind the mounted canvas, and ops drop as "no document is open".
import.meta.hot?.accept(() => window.location.reload());
