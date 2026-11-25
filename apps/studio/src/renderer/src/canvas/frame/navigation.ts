import { isBrowserNode, matchServerPort, normalizeDevUrl, type CanvasDoc, type CanvasNodeId, type ServerEntryState } from '@studio/events';
import type { StateCreator } from 'zustand';
import { composable, recomposed } from '../compose.js';
import { afterSelections } from '../elementPicking.js';
import {
  frameFlowNodes,
  framePointedUrl,
  isAtLocalPort,
  type FrameHealth,
  type FrameNodeData,
} from '../model.js';
import type { InlineChatRecord } from '../inlinePlacement.js';
import type { FrameOverlay } from '../readModel.js';
import {
  dropFrameSelections,
  isOriginChange,
  rehomeFrameSelections,
  selectionsForFrame,
  staleFrameSelections,
  type ElementSelection,
} from '../selection.js';
import type { CanvasState } from '../store.js';
import { dispatchCanvasOp } from '../wire.js';

export interface FrameNavigationFields {
  portFollowRefresh: Record<CanvasNodeId, string>;
}

export interface FrameNavigationActions {
  notePortFollow: (id: CanvasNodeId, homeUrl: string) => void;
  /** A covered or unreachable frame has no page worth keeping, so this re-seats its URLs; `false` means the caller retargets instead (ONL-2568). */
  rehomeDeadFrame: (id: CanvasNodeId, homeUrl: string, retiredTarget?: FrameOverlay['target']) => boolean;
  noteAddressAccepted: (id: CanvasNodeId, homeUrl: string) => void;
  /** A momentary navigation, never a document write; untargeted, it takes the newest frame, or creates one when there is none (ONL-1884). */
  retargetFrame: (url: string, frameId: string) => void;
  /** A target the guest has loaded is history, and `target` means in flight: left standing it outranks every later address (ONL-2897). */
  noteTargetReached: (id: string, reached: NonNullable<FrameOverlay['target']>) => void;
  /** A localhost link from chat: the frame already showing it (the selected one first, then the one on top), else a new frame at it. */
  openLocalLink: (url: string) => void;
  /** A measurement is not a request: it re-navigates frames already on `port` and never adds or moves one (ONL-1966). */
  followServerPort: (port: number) => void;
  /** A resync carries a moved address without the op that moved it, which would leave the guest on a dead origin (ONL-2568). */
  reaimMovedFrames: (previous: CanvasDoc | null, preserveTargets?: ReadonlySet<CanvasNodeId>) => void;
  /** Overlay only: the guest's load events never author an op. */
  patchFrame: (id: string, patch: Partial<FrameNodeData>) => void;
  /** Dispatches the op and navigates: the echo never rewrites the webview's mount `src` (ONL-1941). */
  commitAddress: (id: string, url: string) => void;
  setHealth: (id: string, health: FrameHealth) => void;
}

export function initialFrameNavigationFields(): FrameNavigationFields {
  return { portFollowRefresh: {} };
}

/** An open chat keeps its frame's elements as the evidence the submit carries; with none open, a kept outline is one the user cannot put down (ONL-2518). */
function afterPageGone(
  selections: ElementSelection[],
  frameNodeId: string,
  inlineChat: InlineChatRecord | null,
): ElementSelection[] {
  return inlineChat === null
    ? dropFrameSelections(selections, frameNodeId)
    : staleFrameSelections(selections, frameNodeId);
}

function isCrossEntryHop(
  entries: readonly ServerEntryState[],
  fromUrl: string,
  toUrl: string,
): boolean {
  const from = matchServerPort(entries, fromUrl);
  const to = matchServerPort(entries, toUrl);
  return from !== undefined && to !== undefined && from.entry.entryId !== to.entry.entryId;
}

export const createFrameNavigationActions: StateCreator<CanvasState, [], [], FrameNavigationActions> = (
  set,
  get,
) => ({
  notePortFollow: (id, homeUrl) => {
    set((state) => {
      const facts = state.overlay[id];
      if (!facts) return state;
      if (selectionsForFrame(state.elementSelections, id).length === 0) return state;
      // A same-origin follow never reaches `patchFrame`'s origin check, so a latch armed here would exempt an unrelated later change.
      if (!isOriginChange(facts.currentUrl, homeUrl)) return state;
      if (isCrossEntryHop(state.serverEntries, facts.currentUrl, homeUrl)) {
        return state;
      }
      return { portFollowRefresh: { ...state.portFollowRefresh, [id]: homeUrl } };
    });
  },

  noteAddressAccepted: (id, homeUrl) => {
    set((state) => {
      const facts = state.overlay[id];
      if (!facts?.target || facts.target.url !== homeUrl) return state;
      return { overlay: { ...state.overlay, [id]: { ...facts, acceptedTarget: facts.target } } };
    });
  },

  rehomeDeadFrame: (id, homeUrl, retiredTarget) => {
    let applied = false;
    set((state) => {
      const facts = state.overlay[id];
      const node = frameFlowNodes(state.nodes).find((candidate) => candidate.id === id);
      const durable = state.doc?.nodes[id];
      const pendingCopy = durable?.kind === 'browser' && durable.content.pendingHomeUrl !== undefined;
      const retired = retiredTarget !== undefined && facts?.acceptedTarget === retiredTarget && facts.target === retiredTarget && durable?.kind === 'browser' && durable.content.homeUrl === homeUrl && retiredTarget.url === homeUrl;
      const spent = node?.data.serverCover !== undefined || node?.data.health === 'unreachable' ||
        facts?.mountUrl === 'about:blank';
      if (!facts || (!pendingCopy && !retired && (node === undefined || !spent))) return state;
      applied = true;
      // Rebuilt, not spread: a pending `target` must not outlive the seat it was aimed at.
      const next: FrameOverlay = {
        mountUrl: homeUrl,
        currentUrl: homeUrl,
        health: facts.health,
        guestEpoch: Math.max(facts.guestEpoch ?? 0, node?.data.guestEpoch ?? 0) + 1,
        title: facts.title,
        canGoBack: facts.canGoBack,
        canGoForward: facts.canGoForward,
      };
      // Judged here because no measured navigation follows: the guest mounts already home.
      let elementSelections = state.elementSelections;
      let portFollowRefresh = state.portFollowRefresh;
      const expected = portFollowRefresh[id];
      if (expected !== undefined) {
        portFollowRefresh = { ...portFollowRefresh };
        delete portFollowRefresh[id];
      }
      if (isCrossEntryHop(state.serverEntries, facts.currentUrl, homeUrl)) {
        elementSelections = afterPageGone(elementSelections, id, state.inlineChat);
      } else if (expected !== undefined && !isOriginChange(expected, homeUrl)) {
        elementSelections = rehomeFrameSelections(elementSelections, id, homeUrl);
      }
      return {
        ...recomposed(
          composable(state, { overlay: { ...state.overlay, [id]: next } }),
          state.nodes,
        ),
        elementSelections,
        ...afterSelections(state, elementSelections),
        portFollowRefresh,
      };
    });
    return applied;
  },

  openLocalLink: (url) => {
    const wanted = normalizeDevUrl(url);
    if (wanted === null) return;
    const state = get();
    const isAt = (candidate: string): boolean => normalizeDevUrl(candidate) === wanted;
    // The document, not the composed page: a frame off the current page already exists, and matching only what is mounted mints a second one (ONL-2488).
    const frames = Object.values(state.doc?.nodes ?? {}).filter(isBrowserNode);
    const showing = frames.filter((node) =>
      isAt(state.overlay[node.id]?.currentUrl ?? node.content.homeUrl),
    );
    const candidates = showing.length > 0 ? showing : frames.filter((node) => isAt(node.content.homeUrl));
    const selected = new Set(state.selectedNodeIds);
    const match =
      candidates.find((node) => selected.has(node.id)) ??
      [...candidates].sort((a, b) => b.order - a.order)[0];
    if (match === undefined) {
      get().addFrame(wanted);
      return;
    }
    // The fly first: it may switch page, and a switch drops the selection.
    get().flyToFrame(match.id);
    get().selectFrame(match.id, false);
  },

  retargetFrame: (url, frameId) => {
    const target = get().nodes.find((node) => node.id === frameId);
    if (!target) return;
    set((current) => {
      const facts = current.overlay[target.id];
      if (!facts) return current;
      const overlay = {
        ...current.overlay,
        [target.id]: {
          ...facts,
          target: { url, seq: (facts.target?.seq ?? 0) + 1 },
        },
      };
      return recomposed(composable(current, { overlay }), current.nodes);
    });
  },

  noteTargetReached: (id, reached) => {
    set((state) => {
      const facts = state.overlay[id];
      // Identity, as the guest's own completion check uses: a retire resets `seq`, so a number could match a later request (ONL-2897).
      if (!facts || facts.target !== reached) return state;
      const { target: _reached, ...next } = facts;
      return recomposed(
        composable(state, { overlay: { ...state.overlay, [id]: next } }),
        state.nodes,
      );
    });
  },

  followServerPort: (port) => {
    const frames = frameFlowNodes(get().nodes);
    // `unreachable` alone: it is terminal, and widening to `loading` doubles the navigation (ONL-1868).
    for (const frame of frames) {
      if (!isAtLocalPort(framePointedUrl(frame.data), port)) continue;
      if (frame.data.health === 'unreachable') {
        get().retargetFrame(framePointedUrl(frame.data), frame.id);
      }
    }
  },

  reaimMovedFrames: (previous, preserveTargets) => {
    const doc = get().doc;
    if (!previous || !doc || previous.docId !== doc.docId) return;
    const nodes = doc.nodes;
    for (const frame of frameFlowNodes(get().nodes)) {
      if (preserveTargets?.has(frame.id)) continue;
      const node = nodes[frame.id];
      const before = previous.nodes[frame.id];
      if (node === undefined || !isBrowserNode(node) || before === undefined || !isBrowserNode(before)) continue;
      if (!isOriginChange(before.content.homeUrl, node.content.homeUrl)) continue;
      get().retargetFrame(node.content.homeUrl, frame.id);
    }
  },

  patchFrame: (id, patch) => {
    set((state) => {
      const facts = state.overlay[id];
      if (!facts) return state;
      // A measured origin change takes the frame's selections, unless `notePortFollow` armed a one-shot refresh for that destination.
      let elementSelections = state.elementSelections;
      let portFollowRefresh = state.portFollowRefresh;
      if (patch.currentUrl !== undefined && isOriginChange(facts.currentUrl, patch.currentUrl)) {
        const expected = portFollowRefresh[id];
        if (expected !== undefined) {
          portFollowRefresh = { ...portFollowRefresh };
          delete portFollowRefresh[id];
        }
        if (expected === undefined || isOriginChange(expected, patch.currentUrl)) {
          elementSelections = afterPageGone(elementSelections, id, state.inlineChat);
        } else {
          // The armed follow is the same app at a new address, so its elements go with it and the
          // document it lands on is the one that re-adopts them (ONL-2518).
          elementSelections = rehomeFrameSelections(elementSelections, id, patch.currentUrl);
        }
      }
      // A terminal load reaches no `dom-ready`, so nothing re-resolves these and the guest — the only
      // other writer of `stale` — can never report on them again (ONL-2518).
      if (patch.health === 'unreachable' && state.inlineChat !== null) {
        elementSelections = staleFrameSelections(elementSelections, id);
      }
      // The failure belongs to the attempt that ended; a new load starts clean (ONL-2336).
      const { loadFailure: _ended, ...fresh } = facts;
      const next: FrameOverlay = {
        ...(patch.health === 'loading' ? fresh : facts),
        ...(patch.currentUrl !== undefined ? { currentUrl: patch.currentUrl } : {}),
        ...(patch.health !== undefined ? { health: patch.health } : {}),
        ...(patch.health === 'loading' ? { sourceGeneration: (facts.sourceGeneration ?? 0) + 1 } : {}),
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.canGoBack !== undefined ? { canGoBack: patch.canGoBack } : {}),
        ...(patch.canGoForward !== undefined ? { canGoForward: patch.canGoForward } : {}),
        ...(patch.target !== undefined ? { target: patch.target } : {}),
        ...(patch.working !== undefined ? { working: patch.working } : {}),
        ...(patch.loadFailure !== undefined ? { loadFailure: patch.loadFailure } : {}),
      };
      let elementMappings = state.elementMappings;
      if (patch.health === 'loading') {
        elementMappings = { ...elementMappings };
        for (const selection of elementSelections) {
          if (selection.frameNodeId === id) delete elementMappings[selection.evidence.id];
        }
      }
      return {
        ...recomposed(
          composable(state, { overlay: { ...state.overlay, [id]: next } }),
          state.nodes,
        ),
        elementSelections,
        // Whatever the page does, the bubble and its draft stay; only the anchor's selection going with it closes one (ONL-2518).
        ...afterSelections({ ...state, elementMappings }, elementSelections),
        portFollowRefresh,
      };
    });
  },

  commitAddress: (id, url) => {
    if (!get().doc?.nodes[id]) return;
    dispatchCanvasOp({ type: 'set-home-url', id, homeUrl: url });
    get().retargetFrame(url, id);
  },

  setHealth: (id, health) => {
    get().patchFrame(id, { health });
  },
});
