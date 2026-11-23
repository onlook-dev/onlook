import {
  CANVAS_ARTIFACT_DEFAULT_BOX,
  DEFAULT_FRAME_SIZE,
  displayUrl,
  isArtifactNode,
  isBrowserNode,
  nextPosition,
  placeNearSource,
  PLACEMENT_GAP,
  resolveStackOps,
  withSectionContentsOnPage,
  CANVAS_SECTION_DEFAULT_BOX,
  type CanvasNode,
  type CanvasNodeId,
  type CanvasOp,
  type StackPosition,
} from '@studio/events';
import type { StateCreator } from 'zustand';
import { log as rendererLog } from '../log.js';
import { ignoreRefusal } from '../refusal.js';
import { t } from '@studio/i18n';
import { canvasNodeLabeller } from '../nodeLabel.js';
import { canvasNodeLabelFacts } from './selection.js';
import { composable, mintPageId, nextOrder, recomposed } from './compose.js';
import { beginFrameDrawPatch, clearFrameDrawPatch, updateFrameDrawPatch } from './frameDraw.js';
import { frameDrawBox, frameFlowNodes, newFrameUrl, type FrameDrawGesture } from './model.js';
import type { CanvasState } from './store.js';
import { forgetArtifact } from './artifact/artifactCache.js';
import { deleteListedArtifact, useArtifactListing } from './artifact/listing.js';
import { reportArtifactCreated, reportArtifactsPlaced, reportNodesCreated, reportSectionsCreated } from './telemetry.js';
import { dispatchCanvasOp, dispatchCanvasOps } from './wire.js';
import { studio } from '../bridge.js';

const canvasLog = rendererLog('canvas');

export interface NodeFields {
  frameDraw: FrameDrawGesture | null;
  renamingFrameId: CanvasNodeId | null;
  /** The sketch a confirmation is standing over, named so the dialog can say what it destroys. */
  artifactDeleteAsk: { nodeId: CanvasNodeId; title: string } | null;
}

export interface NodeActions {
  addSection: (at: { x: number; y: number }, size?: { width: number; height: number }) => string | undefined;
  beginFrameDraw: (flow: { x: number; y: number }, screen: { x: number; y: number }) => void;
  updateFrameDraw: (flow: { x: number; y: number }, screen: { x: number; y: number }) => void;
  endFrameDraw: () => 'click' | 'drag' | null;
  cancelFrameDraw: () => void;
  /** Selects the minted id before its node arrives on the echo; with no document open the op is dropped and the id still returned. */
  addFrame: (
    url: string,
    at?: { x: number; y: number },
    size?: { width: number; height: number },
    options?: { select?: boolean },
  ) => string;
  /** Mints the artifact in the store first, so the node it places already has an id to resolve. */
  addArtifact: (
    at?: { x: number; y: number },
    size?: { width: number; height: number },
  ) => Promise<string | undefined>;
  /** Opens the confirmation that names the sketch; `deleteArtifact` is what the confirmation calls. */
  askDeleteArtifact: (nodeId: CanvasNodeId) => void;
  endDeleteArtifactAsk: () => void;
  /** Destroys the artifact itself. The nodes showing it stay, and land in their missing state. */
  deleteArtifact: (nodeId: CanvasNodeId) => Promise<void>;
  /** `at` is exact, except dropped back on the source, where the anti-stack placement answers as ⌘D would. */
  duplicateFrame: (id: string, at?: { x: number; y: number }) => string | undefined;
  duplicateSelectedFrame: () => string | undefined;
  openInNewFrame: (sourceId: string, url: string) => string;
  beginRename: (id: CanvasNodeId) => void;
  endRename: () => void;
  renameFrame: (id: CanvasNodeId, name: string) => void;
  /** Its place in the stack: a higher order paints above. */
  reorderFrame: (id: CanvasNodeId, order: number) => void;
  /** The menu's stacking verbs, through the arithmetic the agent's restack tool reads (ONL-2486). */
  stackNode: (id: CanvasNodeId, position: StackPosition) => void;
  /** Inside the multi-selection it removes every selected frame, one op each; outside it removes only itself. */
  removeFrame: (id: string) => void;
}

export function initialNodeFields(): NodeFields {
  return { frameDraw: null, renamingFrameId: null, artifactDeleteAsk: null };
}

function mintDuplicate(
  source: CanvasNode,
  position: { x: number; y: number },
  order: number,
): string | undefined {
  const duplicate = mintedDuplicate(source, position, order);
  if (duplicate === undefined) return undefined;
  // A refused dispatch mints nothing; selecting its id would arm a frame main never heard of.
  if (!dispatchCanvasOp(duplicate.op)) return undefined;
  return duplicate.id;
}

export function mintedDuplicate(
  source: CanvasNode,
  position: { x: number; y: number },
  order: number,
): { id: string; op: CanvasOp } | undefined {
  const id = crypto.randomUUID();
  return {
    id,
    op: {
      type: 'duplicate',
      node: {
        ...source,
        id,
        // Blank stays blank: a stored name wins permanently, so a copied label would read " copy" instead of its own words (ONL-2486).
        name: source.name.trim() === '' ? source.name : t('frame.name.copy', { name: source.name }),
        x: position.x,
        y: position.y,
        order,
        provenance: { from: source.id, at: new Date().toISOString() },
      },
    },
  };
}

export const createNodeActions: StateCreator<CanvasState, [], [], NodeActions> = (set, get) => ({
  addSection: (at, size = CANVAS_SECTION_DEFAULT_BOX) => {
    const state = get();
    const doc = state.doc;
    if (doc === null) return undefined;
    const id = crypto.randomUUID();
    if (!dispatchCanvasOp({
      type: 'create',
      node: {
        id,
        pageId: mintPageId(doc, state.currentPageId),
        kind: 'section',
        name: t('canvas.section.defaultName'),
        ...at,
        ...size,
        order: nextOrder(doc),
        content: {},
      },
    })) return undefined;
    set((current) => recomposed(composable(current, { selectedNodeIds: [id] }), current.nodes));
    reportSectionsCreated('tool', 1);
    return id;
  },
  addFrame: (url, at, size, options) => {
    const id = crypto.randomUUID();
    const state = get();
    const doc = state.doc;
    if (!doc) {
      canvasLog.warn('addFrame dropped: no document is open');
      return id;
    }
    const position = at ?? nextPosition(state.nodes);
    const order = nextOrder(doc);
    dispatchCanvasOp({
      type: 'create',
      node: {
        id,
        pageId: mintPageId(doc, state.currentPageId),
        kind: 'browser',
        name: displayUrl(url),
        x: position.x,
        y: position.y,
        width: size?.width ?? DEFAULT_FRAME_SIZE.width,
        height: size?.height ?? DEFAULT_FRAME_SIZE.height,
        order,
        content: { homeUrl: url },
      },
    });
    if (options?.select === false) return id;
    set((current) => recomposed(composable(current, { selectedNodeIds: [id] }), current.nodes));
    return id;
  },

  beginFrameDraw: (flow, screen) => {
    const patch = beginFrameDrawPatch(get().tool, flow, screen);
    if (patch !== null) set(patch);
  },

  updateFrameDraw: (flow, screen) => {
    set((state) => {
      const patch = updateFrameDrawPatch(state, flow, screen);
      return patch ?? state;
    });
  },

  endFrameDraw: () => {
    const state = get();
    const draw = state.frameDraw;
    if (draw === null) return null;
    const clear = clearFrameDrawPatch(state);
    if (clear !== null) set(clear);
    if (!state.doc) return null;
    // One object per arming, reverted here rather than in a caller: the draw has two finish paths.
    const armed = state.tool;
    set({ tool: 'select' });
    const box = frameDrawBox(draw);
    if (armed === 'section') {
      get().addSection(box ?? draw.anchor, box ?? undefined);
      return null;
    }
    if (armed === 'artifact') {
      // Awaited by nobody: the store mints the id over IPC and the node lands on the echo.
      void get().addArtifact(
        box === null ? { x: draw.anchor.x, y: draw.anchor.y } : { x: box.x, y: box.y },
        box === null ? undefined : { width: box.width, height: box.height },
      );
      // The caller's answer is a `frame_created` method; an artifact reports its own two events (ONL-2568).
      return null;
    }
    const livePort =
      state.serverEntries
        .flatMap((entry) => entry.ports)
        .find((port) => port.measured === 'live')?.port ?? null;
    const url = newFrameUrl(frameFlowNodes(state.nodes)[0]?.data.homeUrl, livePort);
    if (box === null) {
      get().addFrame(url, { x: draw.anchor.x, y: draw.anchor.y });
      return 'click';
    }
    get().addFrame(url, { x: box.x, y: box.y }, { width: box.width, height: box.height });
    return 'drag';
  },

  cancelFrameDraw: () => {
    set((state) => clearFrameDrawPatch(state) ?? state);
  },

  addArtifact: async (at, size) => {
    // The document is read before the await: a page switch mid-flight would otherwise land
    // the node on whichever page the user moved to.
    const before = get();
    const doc = before.doc;
    if (!doc) {
      canvasLog.warn('addArtifact dropped: no document is open');
      return undefined;
    }
    const pageId = mintPageId(doc, before.currentPageId);

    const made = await studio()
      .artifactCreate({})
      .catch((error: unknown): undefined => {
        ignoreRefusal('canvas', 'artifactCreate')(error);
        return undefined;
      });
    if (made === undefined) return undefined;
    if ('code' in made) {
      canvasLog.warn('addArtifact dropped: the store refused', { code: made.code });
      return undefined;
    }

    const state = get();
    if (!state.doc) {
      canvasLog.warn('addArtifact dropped: the document closed while the artifact was minted');
      return undefined;
    }
    const id = crypto.randomUUID();
    const position = at ?? nextPosition(state.nodes);
    // A refused dispatch mints nothing; selecting its id would arm a node main never heard of.
    const accepted = dispatchCanvasOp({
      type: 'create',
      node: {
        id,
        pageId,
        kind: 'artifact',
        // Blank, so the manifest's title is what the label shows until a user renames the node.
        name: '',
        x: position.x,
        y: position.y,
        width: size?.width ?? CANVAS_ARTIFACT_DEFAULT_BOX.width,
        height: size?.height ?? CANVAS_ARTIFACT_DEFAULT_BOX.height,
        order: nextOrder(state.doc),
        content: { artifactId: made.artifact.id, title: made.artifact.title },
      },
    });
    if (!accepted) {
      canvasLog.warn('addArtifact dropped: the canvas refused the node');
      return undefined;
    }
    set((current) => recomposed(composable(current, { selectedNodeIds: [id] }), current.nodes));
    reportArtifactCreated('click');
    reportArtifactsPlaced('click', 1);
    return id;
  },

  askDeleteArtifact: (nodeId) => {
    const nodes = get().doc?.nodes ?? {};
    const node = nodes[nodeId];
    if (node === undefined || !isArtifactNode(node)) return;
    // The tag too, since the one thing this dialog must not be is ambiguous about which sketch it destroys.
    const artifactTitles = new Map((useArtifactListing.getState().records ?? []).map((artifact) => [artifact.id, artifact.title]));
    const labelOf = canvasNodeLabeller(Object.values(nodes).map(canvasNodeLabelFacts), t, artifactTitles);
    set({ artifactDeleteAsk: { nodeId, title: labelOf(canvasNodeLabelFacts(node)) } });
  },

  endDeleteArtifactAsk: () => {
    set({ artifactDeleteAsk: null });
  },

  deleteArtifact: async (nodeId) => {
    const node = get().doc?.nodes[nodeId];
    if (node === undefined || node.kind !== 'artifact') return;
    const { artifactId } = node.content;
    if (!(await deleteListedArtifact(artifactId))) {
      canvasLog.warn('deleteArtifact refused');
      return;
    }
    // Every node pointing at it reads the absence rather than a cached hit (ONL-2568).
    forgetArtifact(artifactId);
  },

  duplicateFrame: (id, at) => {
    const state = get();
    const doc = state.doc;
    const source = doc?.nodes[id];
    if (!doc || !source) return undefined;
    const isOnSource =
      at !== undefined &&
      Math.abs(at.x - source.x) < PLACEMENT_GAP &&
      Math.abs(at.y - source.y) < PLACEMENT_GAP;
    const position =
      at !== undefined && !isOnSource
        ? at
        : placeNearSource(
            source,
            { width: source.width, height: source.height },
            state.nodes.map((n) => n.position),
          );
    const minted = mintDuplicate(source, position, nextOrder(doc));
    if (minted === undefined) return undefined;
    set((current) =>
      recomposed(composable(current, { selectedNodeIds: [minted] }), current.nodes),
    );
    reportNodesCreated([source], 'duplicate');
    return minted;
  },

  duplicateSelectedFrame: () => {
    const state = get();
    const doc = state.doc;
    if (!doc) return undefined;
    const composedIds = new Set(state.nodes.map((n) => n.id));
    const sources = withSectionContentsOnPage(Object.values(doc.nodes), state.selectedNodeIds).filter(
      (id) => composedIds.has(id) && doc.nodes[id] !== undefined,
    );
    if (sources.length === 0) return undefined;
    // Accumulates the batch's own slots: mints arrive only on echoes, so siblings would otherwise stack (ONL-2043).
    const occupied = state.nodes.map((n) => ({ x: n.position.x, y: n.position.y }));
    let order = nextOrder(doc);
    const minted: string[] = [];
    const copied: CanvasNode[] = [];
    const ops: CanvasOp[] = [];
    const grouped = sources.some((id) => doc.nodes[id]?.kind === 'section');
    const right = Math.max(...sources.map((id) => { const node = doc.nodes[id]!; return node.x + node.width; }));
    const left = Math.min(...sources.map((id) => doc.nodes[id]!.x));
    for (const id of sources) {
      const source = doc.nodes[id];
      if (!source) continue;
      const position = grouped ? { x: source.x + right - left + PLACEMENT_GAP, y: source.y } : placeNearSource(
        source,
        { width: source.width, height: source.height },
        occupied,
      );
      occupied.push(position);
      const duplicate = mintedDuplicate(source, position, order);
      if (duplicate === undefined) continue;
      minted.push(duplicate.id);
      copied.push(source);
      ops.push(duplicate.op);
      order += 1;
    }
    if (!dispatchCanvasOps(ops)) return undefined;
    set((current) =>
      recomposed(composable(current, { selectedNodeIds: minted }), current.nodes),
    );
    reportNodesCreated(copied, 'duplicate');
    return minted.at(-1);
  },

  openInNewFrame: (sourceId, url) => {
    const state = get();
    const source = state.doc?.nodes[sourceId];
    if (!source) return get().addFrame(url);
    return get().addFrame(
      url,
      placeNearSource(source, DEFAULT_FRAME_SIZE, state.nodes.map((n) => n.position)),
    );
  },

  beginRename: (id) => {
    if (!get().doc?.nodes[id]) return;
    set({ renamingFrameId: id });
  },

  endRename: () => {
    if (get().renamingFrameId !== null) set({ renamingFrameId: null });
  },

  renameFrame: (id, name) => {
    get().endRename();
    const node = get().doc?.nodes[id];
    if (!node) return;
    const trimmed = name.trim();
    const next =
      trimmed !== '' ? trimmed : isBrowserNode(node) ? displayUrl(node.content.homeUrl) : '';
    if (next === node.name) return;
    dispatchCanvasOp({ type: 'rename', id, name: next });
  },

  reorderFrame: (id, order) => {
    const node = get().doc?.nodes[id];
    if (!node || node.order === order) return;
    dispatchCanvasOp({ type: 'reorder', id, order });
  },

  stackNode: (id, position) => {
    const doc = get().doc;
    if (!doc) return;
    const outcome = resolveStackOps(doc, id, position);
    if (!Array.isArray(outcome)) return;
    dispatchCanvasOps(outcome);
  },

  removeFrame: (id) => {
    const state = get();
    if (!state.doc?.nodes[id]) return;
    const targets = state.selectedNodeIds.includes(id)
      ? state.selectedNodeIds.filter((held) => state.doc?.nodes[held] !== undefined)
      : [id];
    dispatchCanvasOps(targets.map((target) => ({ type: 'remove', id: target })));
  },
});
