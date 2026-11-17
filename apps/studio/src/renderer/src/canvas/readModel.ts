// Pure functions only — nothing here reads a store, the clock, or `window`.
// Selection is its OWN set, never a fact on node objects: a resync replaces the
// read model wholesale and would take selection with it (ONL-1993).

import {
  canvasPages,
  compareCanvasPaintOrder,
  frameServerFacts,
  isDividerPage,
  nextCurrentPage,
  resolveNodePageId,
  type BrowserNode,
  type CanvasDoc,
  type CanvasNode,
  type CanvasNodeId,
  type CanvasOpEntry,
  type CanvasPage,
  type CanvasPageId,
  type FrameQuotes,
  type ImageContent,
  type ServerEntryState,
} from '@studio/events';
import type { FrameLoadFailure } from './frame/loadFailure.js';
import { renderedCanvasText } from './text/placement.js';
import {
  ARTIFACT_NODE_TYPE,
  SECTION_NODE_TYPE,
  FRAME_NODE_TYPE,
  framePointedUrl,
  IMAGE_NODE_TYPE,
  TEXT_NODE_TYPE,
  type ArtifactFlowNode,
  type ArtifactNodeData,
  type CanvasFlowNode,
  type FrameHealth,
  type FrameNode,
  type FrameNodeData,
  type ImageFlowNode,
  type ImageNodeData,
  type TextFlowNode,
  type TextNodeData,
} from './model.js';

/** Never persisted, never broadcast — the document schema bans these. */
export interface FrameOverlay {
  /**
   * The webview's MOUNT address, captured on the id's first overlay entry and
   * never moved by document changes. ⚠️ Driving a live webview's `src` from a
   * home-URL op re-fires ONL-1941's double-navigation inverted; navigation onto
   * a new home goes through `target`. `rehomeDeadFrame` re-seats this only for a
   * frame with no page to lose: covered, so no guest, or unreachable, so an error page.
   */
  mountUrl: string;
  currentUrl: string;
  health: FrameHealth;
  guestEpoch?: number;
  sourceGeneration?: number;
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
  /** See `FrameNodeData.target`. */
  target?: { url: string; seq: number };
  acceptedTarget?: { url: string; seq: number };
  /** See `FrameNodeData.working` (ONL-2194). */
  working?: boolean;
  /** See `FrameNodeData.loadFailure` (ONL-2336). */
  loadFailure?: FrameLoadFailure;
}

/**
 * `isSettling` marks the gap between the settle op leaving and its echo
 * arriving; the echo releases the override. An ACTIVE gesture is never released
 * by a broadcast.
 */
export interface GestureOverride {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  isSettling?: boolean;
}

export function defaultOverlay(node: BrowserNode): FrameOverlay {
  return {
    mountUrl: node.content.homeUrl,
    currentUrl: node.content.pendingHomeUrl ?? node.content.homeUrl,
    health: 'loading',
    title: '',
    canGoBack: false,
    canGoForward: false,
  };
}

export type MirrorOutcome =
  | { kind: 'applied'; doc: CanvasDoc }
  /** A stale echo, dropped without a resync. */
  | { kind: 'stale' }
  /** A revision gap, or an op this mirror cannot apply — resync. */
  | { kind: 'gap' };

/**
 * Anything the mirror cannot apply cleanly answers `gap`: reconciliation is by
 * resync, never by patching a copy that has already diverged.
 */
export function applyEntryToMirror(doc: CanvasDoc, entry: CanvasOpEntry): MirrorOutcome {
  if (entry.revision <= doc.revision) return { kind: 'stale' };
  if (entry.revision !== doc.revision + 1) return { kind: 'gap' };

  const op = entry.op;
  const updateNode = (
    id: CanvasNodeId,
    patch: (node: CanvasNode) => CanvasNode,
  ): CanvasDoc['nodes'] | undefined => {
    const node = doc.nodes[id];
    return node ? { ...doc.nodes, [id]: patch(node) } : undefined;
  };
  const updatePage = (
    pageId: CanvasPageId,
    patch: (page: CanvasPage) => CanvasPage,
  ): CanvasDoc['pages'] | undefined => {
    const page = doc.pages[pageId];
    return page ? { ...doc.pages, [pageId]: patch(page) } : undefined;
  };
  const pages = ((): CanvasDoc['pages'] | undefined => {
    switch (op.type) {
      case 'create-page':
        return { ...doc.pages, [op.page.id]: op.page };
      case 'rename-page':
        return updatePage(op.pageId, (page) => ({ ...page, name: op.name }));
      case 'reorder-page':
        return updatePage(op.pageId, (page) => ({ ...page, order: op.order }));
      case 'remove-page': {
        if (!doc.pages[op.pageId]) return undefined;
        const rest = { ...doc.pages };
        delete rest[op.pageId];
        return rest;
      }
      default:
        return doc.pages;
    }
  })();
  const nodes = ((): CanvasDoc['nodes'] | undefined => {
    switch (op.type) {
      case 'create':
      case 'duplicate':
        return { ...doc.nodes, [op.node.id]: op.node };
      case 'move':
        return updateNode(op.id, (node) => ({ ...node, x: op.x, y: op.y }));
      case 'resize':
        return updateNode(op.id, (node) => {
          const resized = { ...node, x: op.x, y: op.y, width: op.width, height: op.height };
          if (resized.kind === 'text') {
            resized.content = { ...resized.content };
            if (op.wrapWidth === null) delete resized.content.wrapWidth;
            else resized.content.wrapWidth = op.wrapWidth ?? op.width;
          }
          return resized;
        });
      case 'rename':
        return updateNode(op.id, (node) => ({ ...node, name: op.name }));
      case 'reorder':
        return updateNode(op.id, (node) => ({ ...node, order: op.order }));
      case 'set-home-url': {
        const node = doc.nodes[op.id];
        if (node?.kind !== 'browser') return undefined;
        if (typeof op.homeUrl !== 'string' || op.homeUrl.length === 0) return undefined;
        if (op.pendingHomeUrl !== undefined && op.pendingHomeUrl !== null &&
          (typeof op.pendingHomeUrl !== 'string' || op.pendingHomeUrl.length === 0)) return undefined;
        const content = { ...node.content, homeUrl: op.homeUrl };
        if (op.pendingHomeUrl === undefined || op.pendingHomeUrl === null) delete content.pendingHomeUrl;
        else content.pendingHomeUrl = op.pendingHomeUrl;
        return { ...doc.nodes, [op.id]: { ...node, content } };
      }
      case 'set-text': {
        const node = doc.nodes[op.id];
        if (node?.kind !== 'text') return undefined;
        return {
          ...doc.nodes,
          [op.id]: {
            ...node,
            width: op.width,
            height: op.height,
            content: { ...node.content, text: op.text },
          },
        };
      }
      case 'set-text-size': {
        const node = doc.nodes[op.id];
        if (node?.kind !== 'text') return undefined;
        return {
          ...doc.nodes,
          [op.id]: {
            ...node,
            width: op.width,
            height: op.height,
            content: { ...node.content, size: op.size },
          },
        };
      }
      case 'set-image-alt': {
        const node = doc.nodes[op.id];
        if (node?.kind !== 'image') return undefined;
        const content: ImageContent = { ...node.content, alt: op.alt };
        if (op.alt === '') delete content.alt;
        return { ...doc.nodes, [op.id]: { ...node, content } };
      }
      case 'remove': {
        if (!doc.nodes[op.id]) return undefined;
        const rest = { ...doc.nodes };
        delete rest[op.id];
        return rest;
      }
      case 'set-node-page':
        return updateNode(op.id, (node) => ({ ...node, pageId: op.pageId }));
      case 'create-page':
      case 'rename-page':
      case 'reorder-page':
      case 'remove-page':
        return doc.nodes;
      default:
        return undefined;
    }
  })();

  if (nodes === undefined || pages === undefined) return { kind: 'gap' };
  return { kind: 'applied', doc: { ...doc, revision: entry.revision, pages, nodes } };
}

/** The page a composition reads: one the document no longer holds answers its first, a rule answers the first page that is not one (ONL-2488), and a document holding no pages answers `null`, which filters nothing away (ONL-2488). */
export function composedPageId(
  doc: CanvasDoc,
  currentPageId: CanvasPageId | null,
): CanvasPageId | null {
  const held = currentPageId === null ? undefined : doc.pages[currentPageId];
  if (held !== undefined && !isDividerPage(held)) return held.id;
  const resting =
    held === undefined
      ? canvasPages(doc).find((page) => !isDividerPage(page))
      : nextCurrentPage(doc, held.id);
  return resting?.id ?? canvasPages(doc)[0]?.id ?? null;
}

export interface CompositionInput {
  doc: CanvasDoc | null;
  /** One page at a time reaches React Flow; `null` is a canvas whose page nobody has named yet (ONL-2488). */
  currentPageId: CanvasPageId | null;
  overlay: Readonly<Record<CanvasNodeId, FrameOverlay>>;
  gesture: Readonly<Record<CanvasNodeId, GestureOverride>>;
  /** React Flow's own measurements, attached back so `nodesInitialized` holds. */
  measured: Readonly<Record<CanvasNodeId, { width: number; height: number }>>;
  selectedNodeIds: readonly CanvasNodeId[];
  serverEntries: readonly ServerEntryState[];
  /** Off: a stored Section is not drawn and not listed, and the objects it held compose as their own (ONL-2661). */
  sectionsEnabled: boolean;
  frameQuotes: FrameQuotes;
}

function isBoxUnchanged(candidate: CanvasFlowNode, previous: CanvasFlowNode): boolean {
  return (
    candidate.position.x === previous.position.x &&
    candidate.position.y === previous.position.y &&
    candidate.width === previous.width &&
    candidate.height === previous.height &&
    candidate.selected === previous.selected &&
    candidate.zIndex === previous.zIndex &&
    candidate.measured?.width === previous.measured?.width &&
    candidate.measured?.height === previous.measured?.height
  );
}

/**
 * Every rendered fact, compared by value: a field added to `data` and not to its
 * kind's comparison here silently stops re-rendering.
 */
function isFrameDataUnchanged(a: FrameNodeData, b: FrameNodeData): boolean {
  return (
    a.homeUrl === b.homeUrl &&
    a.name === b.name &&
    a.currentUrl === b.currentUrl &&
    a.health === b.health &&
    a.title === b.title &&
    a.canGoBack === b.canGoBack &&
    a.canGoForward === b.canGoForward &&
    a.target?.url === b.target?.url &&
    a.target?.seq === b.target?.seq &&
    a.serverCover === b.serverCover &&
    a.serverStarting === b.serverStarting &&
    a.guestEpoch === b.guestEpoch &&
    a.working === b.working &&
    a.quote === b.quote &&
    a.quoteTurnRunning === b.quoteTurnRunning
  );
}

function isTextDataUnchanged(a: TextNodeData, b: TextNodeData): boolean {
  return a.text === b.text && a.size === b.size && a.name === b.name;
}

function isImageDataUnchanged(a: ImageNodeData, b: ImageNodeData): boolean {
  return (
    a.imageId === b.imageId &&
    a.name === b.name &&
    a.alt === b.alt &&
    a.originalWidth === b.originalWidth &&
    a.originalHeight === b.originalHeight
  );
}

function isArtifactDataUnchanged(a: ArtifactNodeData, b: ArtifactNodeData): boolean {
  return (
    a.artifactId === b.artifactId &&
    a.pagePath === b.pagePath &&
    a.title === b.title &&
    a.name === b.name &&
    a.quote === b.quote &&
    a.quoteTurnRunning === b.quoteTurnRunning
  );
}

function isUnchanged(candidate: CanvasFlowNode, previous: CanvasFlowNode): boolean {
  if (!isBoxUnchanged(candidate, previous)) return false;
  if (candidate.type === SECTION_NODE_TYPE && previous.type === SECTION_NODE_TYPE) {
    return candidate.data.name === previous.data.name;
  }
  if (candidate.type === FRAME_NODE_TYPE && previous.type === FRAME_NODE_TYPE) {
    return isFrameDataUnchanged(candidate.data, previous.data);
  }
  if (candidate.type === TEXT_NODE_TYPE && previous.type === TEXT_NODE_TYPE) {
    return isTextDataUnchanged(candidate.data, previous.data);
  }
  if (candidate.type === IMAGE_NODE_TYPE && previous.type === IMAGE_NODE_TYPE) {
    return isImageDataUnchanged(candidate.data, previous.data);
  }
  if (candidate.type === ARTIFACT_NODE_TYPE && previous.type === ARTIFACT_NODE_TYPE) {
    return isArtifactDataUnchanged(candidate.data, previous.data);
  }
  return false;
}

/** The read model is pure, so an unknown kind is dropped here; `nodeIssue()` is what refuses loudly. */
function unrecognisedKind(_node: never): undefined {
  return undefined;
}

/** ⚠️ An unchanged node keeps its previous object, an unchanged array the previous array.
 * Never re-sort: moving a `<webview>` reloads its page, so `order` restacks by `zIndex` alone.
 * The page filter is the one narrowing: what is KNOWN stays project-wide (ONL-2488). */
export function composeCanvasNodes(
  input: CompositionInput,
  previous: CanvasFlowNode[] = [],
): CanvasFlowNode[] {
  const { doc, overlay, gesture, measured, selectedNodeIds } = input;
  const selected = new Set(selectedNodeIds);
  const previousById = new Map(previous.map((node) => [node.id, node]));

  const keepIdentity = (candidate: CanvasFlowNode): CanvasFlowNode => {
    const before = previousById.get(candidate.id);
    return before && isUnchanged(candidate, before) ? before : candidate;
  };

  let nodes: CanvasFlowNode[];
  if (doc === null) {
    nodes = [];
  } else {
    const pageId = composedPageId(doc, input.currentPageId);
    const stacked = Object.values(doc.nodes)
      /* A document written by an alpha build still opens on one without the flag: its Sections compose away, the objects they held do not (ONL-2661). */
      .filter((node) => (input.sectionsEnabled || node.kind !== 'section')
        && (pageId === null || resolveNodePageId(doc, node) === pageId))
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    const rank = new Map(stacked.map((node, index) => [node.id, index]));
    const sectionRanks = new Map(stacked.filter((node) => node.kind === 'section').sort(compareCanvasPaintOrder).map((node, index) => [node.id, index]));
    const previousIndex = new Map(previous.map((node, index) => [node.id, index]));
    const place = (id: CanvasNodeId): number =>
      previousIndex.get(id) ?? previous.length + (rank.get(id) ?? 0);
    nodes = [...stacked]
      .sort((a, b) => place(a.id) - place(b.id))
      .map((node) => {
        const held = gesture[node.id];
        const m = measured[node.id];
        const box = {
          id: node.id,
          position: { x: held?.x ?? node.x, y: held?.y ?? node.y },
          width: held?.width ?? node.width,
          height: held?.height ?? node.height,
          selected: selected.has(node.id),
          zIndex: rank.get(node.id) ?? 0,
          ...(m ? { measured: m } : {}),
        };

        // Never a fall-through: an unknown kind would mount a `<webview>` on an absent `homeUrl` (ONL-2568).
        switch (node.kind) {
          case 'section':
            return keepIdentity({
              ...box,
              zIndex: -sectionRanks.size + (sectionRanks.get(node.id) ?? 0),
              dragHandle: '.canvas-section-title',
              type: SECTION_NODE_TYPE,
              data: { name: node.name },
            });
          case 'text':
            return keepIdentity({
              ...box,
              type: TEXT_NODE_TYPE,
              data: {
                text: renderedCanvasText(node.content.text),
                size: node.content.size,
                name: node.name,
              },
            } satisfies TextFlowNode);

          case 'image':
            return keepIdentity({
              ...box,
              type: IMAGE_NODE_TYPE,
              data: {
                imageId: node.content.imageId,
                name: node.name,
                originalWidth: node.content.originalWidth,
                originalHeight: node.content.originalHeight,
                ...(node.content.alt === undefined ? {} : { alt: node.content.alt }),
              },
            } satisfies ImageFlowNode);

          case 'artifact': {
            const quote = input.frameQuotes.byFrame[node.id];
            return keepIdentity({
              ...box,
              type: ARTIFACT_NODE_TYPE,
              data: {
                artifactId: node.content.artifactId,
                ...(node.content.pagePath === undefined ? {} : { pagePath: node.content.pagePath }),
                title: node.content.title,
                name: node.name,
                ...(quote === undefined ? {} : { quote, quoteTurnRunning: input.frameQuotes.turnRunning }),
              },
            } satisfies ArtifactFlowNode);
          }

          case 'browser': {
            const facts = overlay[node.id] ?? defaultOverlay(node);
            const pointed = framePointedUrl(facts);
            const { cover, serverLive, serverStarting } = frameServerFacts(input.serverEntries, {
              pointedUrl: pointed,
              pendingHome: node.content.pendingHomeUrl !== undefined,
            });
            const quote = input.frameQuotes.byFrame[node.id];
            const before = previousById.get(node.id);
            const frameBefore = before?.type === FRAME_NODE_TYPE ? before : undefined;
            const guestEpoch =
              Math.max(facts.guestEpoch ?? 0, frameBefore?.data.guestEpoch ?? 0) +
              (frameBefore?.data.serverCover !== undefined && cover === undefined ? 1 : 0);
            return keepIdentity({
              ...box,
              type: FRAME_NODE_TYPE,
              data: {
                homeUrl: facts.mountUrl,
                name: node.name,
                currentUrl: facts.currentUrl,
                health: facts.health,
                title: facts.title,
                canGoBack: facts.canGoBack,
                canGoForward: facts.canGoForward,
                guestEpoch,
                ...(facts.target ? { target: facts.target } : {}),
                ...(cover ? { serverCover: cover } : {}),
                ...(serverLive ? { serverLive } : {}),
                ...(serverStarting ? { serverStarting } : {}),
                ...(facts.loadFailure ? { loadFailure: facts.loadFailure } : {}),
                ...(facts.working ? { working: facts.working } : {}),
                ...(quote === undefined ? {} : { quote, quoteTurnRunning: input.frameQuotes.turnRunning }),
              },
            } satisfies FrameNode);
          }

          default:
            // Exhaustive: a new kind fails `typecheck` here rather than rendering as a frame.
            return unrecognisedKind(node);
        }
      })
      .filter((node): node is CanvasFlowNode => node !== undefined);
  }

  if (nodes.length === previous.length && nodes.every((node, i) => node === previous[i])) {
    return previous;
  }
  return nodes;
}

/**
 * A React Flow change batch moves only momentary facts, so durable order,
 * overlay, server cover and node data are already correct on `previous`.
 */
export function composeMomentaryCanvasNodes(
  input: CompositionInput,
  previous: CanvasFlowNode[],
  changedIds: ReadonlySet<CanvasNodeId>,
): CanvasFlowNode[] {
  if (input.doc === null || changedIds.size === 0) return previous;
  const selected = new Set(input.selectedNodeIds);
  let didChange = false;
  const nodes = previous.map((before) => {
    if (!changedIds.has(before.id)) return before;
    const durable = input.doc?.nodes[before.id];
    if (!durable) return before;
    const held = input.gesture[before.id];
    const measured = input.measured[before.id];
    const candidate: CanvasFlowNode = {
      ...before,
      position: { x: held?.x ?? durable.x, y: held?.y ?? durable.y },
      width: held?.width ?? durable.width,
      height: held?.height ?? durable.height,
      selected: selected.has(before.id),
      ...(measured ? { measured } : {}),
    };
    if (isUnchanged(candidate, before)) return before;
    didChange = true;
    return candidate;
  });
  return didChange ? nodes : previous;
}

/**
 * ⚠️ Answers the ORIGINAL map when every key survives: a prune that dropped
 * nothing must not mint a new reference, or every broadcast re-renders every
 * subscriber selecting these maps by identity.
 */
export function pruneToIds<T>(
  map: Readonly<Record<string, T>>,
  live: ReadonlySet<string>,
): Record<string, T> {
  const ids = Object.keys(map);
  // Never mutated by any consumer — the cast hands back the caller's own map.
  if (ids.every((id) => live.has(id))) return map as Record<string, T>;
  const pruned: Record<string, T> = {};
  for (const id of ids) {
    if (live.has(id)) pruned[id] = map[id] as T;
  }
  return pruned;
}
