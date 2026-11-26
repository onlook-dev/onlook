import { NO_FRAME_QUOTES, type CanvasDocId, type CanvasRejection, type CanvasUpdate } from '@studio/events';
import { log as rendererLog } from '../log.js';
import { applyWorkingFrameIds, forgetFrameFacts, scheduleFrameFactsPush } from './frameFacts.js';
import { applyEntryToMirror, type FrameOverlay } from './readModel.js';
import { useCanvasStore } from './store.js';
import {
  canvasTransport,
  endCanvasSwitch,
  isCanvasSwitchInFlight,
  seatCanvasTransport,
  type CanvasTransport,
} from './wire.js';
import { studio } from '../bridge.js';

const canvasLog = rendererLog('canvas');

let resyncEpoch = 0;

interface SystemMove {
  docId: CanvasDocId;
  revision: number;
  frameId: string;
  homeUrl: string;
  targetAtGap: FrameOverlay['target'];
}

const pendingSystemMoves = new Map<string, SystemMove>();

/** Resolves once the answer has landed or been superseded, so a caller may await the seed. */
export function resyncCanvas(): Promise<void> {
  const wire = canvasTransport();
  if (!wire) {
    // No answer will ever land to lower the latch.
    endCanvasSwitch();
    return Promise.resolve();
  }
  const epoch = ++resyncEpoch;
  return wire
    .canvasSnapshot()
    .then(({ doc, quotes }) => {
      // Before the epoch check: a superseded answer still ends the switch.
      endCanvasSwitch();
      if (epoch !== resyncEpoch) return undefined;
      const previous = useCanvasStore.getState().doc;
      const moves = [...pendingSystemMoves.values()].filter((move) => move.docId === previous?.docId && move.docId === doc?.docId);
      const targetsBeforeSnapshot = new Map(moves.map((move) => [move.frameId, useCanvasStore.getState().overlay[move.frameId]?.target]));
      const preserveTargets = new Set(moves.filter((move) => targetsBeforeSnapshot.get(move.frameId) !== move.targetAtGap).map((move) => move.frameId));
      for (const [frameId, move] of pendingSystemMoves) {
        if (move.docId !== doc?.docId || doc.revision >= move.revision) pendingSystemMoves.delete(frameId);
      }
      if (doc !== null && previous?.docId === doc.docId) {
        for (const node of Object.values(doc.nodes)) {
          const before = previous.nodes[node.id];
          if (!preserveTargets.has(node.id) && node.kind === 'browser' && before?.kind === 'browser' &&
            before.content.pendingHomeUrl !== undefined && node.content.pendingHomeUrl === undefined) {
            useCanvasStore.getState().rehomeDeadFrame(node.id, node.content.homeUrl);
          }
        }
      }
      useCanvasStore.getState().replaceDoc(doc);
      useCanvasStore.getState().applyFrameQuotes(quotes ?? NO_FRAME_QUOTES);
      // The snapshot carries a moved address without the op that carried it (ONL-2568).
      useCanvasStore.getState().reaimMovedFrames(previous, preserveTargets);
      for (const move of moves) {
        if (doc === null || doc.revision < move.revision) continue;
        const targetBeforeSnapshot = targetsBeforeSnapshot.get(move.frameId);
        const state = useCanvasStore.getState();
        const node = doc.nodes[move.frameId];
        if (node?.kind !== 'browser' || node.content.homeUrl !== move.homeUrl || targetBeforeSnapshot !== move.targetAtGap) continue;
        if (state.overlay[move.frameId]?.target === targetBeforeSnapshot) state.retargetFrame(move.homeUrl, move.frameId);
        const target = useCanvasStore.getState().overlay[move.frameId]?.target;
        if (target !== undefined && target.url === move.homeUrl) {
          state.notePortFollow(move.frameId, move.homeUrl);
          state.noteAddressAccepted(move.frameId, move.homeUrl);
          state.rehomeDeadFrame(move.frameId, move.homeUrl, target);
        }
      }
      return doc === null ? undefined : seedStoredPageCameras(wire, doc.docId, epoch);
    })
    .catch((err: unknown) => {
      endCanvasSwitch();
      canvasLog.warn('snapshot re-request failed', { error: err });
    });
}

/** Every page at once, not the page being entered: a switch installs its camera in the same tick, and an answer landing after it would read as the canvas moving on its own (ONL-2488). */
function seedStoredPageCameras(
  wire: CanvasTransport,
  docId: CanvasDocId,
  epoch: number,
): Promise<void> {
  return wire
    .canvasPageCameras({ docId })
    .then(({ byPage }) => {
      if (epoch !== resyncEpoch) return;
      useCanvasStore.getState().seedPageCameras(docId, byPage);
    })
    .catch((err: unknown) => {
      canvasLog.warn('page cameras re-request failed', { error: err });
    });
}

const reportedDrops = new Set<string>();
const REPORTED_DROPS_MAX = 64;

function reportDrop(update: CanvasUpdate, heldDocId: CanvasDocId | null): void {
  const key = `${heldDocId ?? ''}>${update.docId}`;
  if (reportedDrops.has(key)) return;
  if (reportedDrops.size >= REPORTED_DROPS_MAX) reportedDrops.clear();
  reportedDrops.add(key);
  canvasLog.info('update dropped', {
    reason: heldDocId === null ? 'no_document' : 'other_document',
    update_doc_id: update.docId,
    held_doc_id: heldDocId,
    revision: update.entry.revision,
    op: update.entry.op.type,
    author: update.entry.author,
  });
}

function onUpdate(update: CanvasUpdate): void {
  const state = useCanvasStore.getState();
  const doc = state.doc;
  if (!doc || update.docId !== doc.docId) {
    reportDrop(update, doc?.docId ?? null);
    return;
  }
  const outcome = applyEntryToMirror(doc, update.entry);
  if (outcome.kind === 'stale') return;
  if (outcome.kind === 'gap') {
    const op = update.entry.op;
    if (update.entry.author === 'system' && op.type === 'set-home-url') pendingSystemMoves.set(op.id, {
      docId: update.docId,
      revision: update.entry.revision,
      frameId: op.id,
      homeUrl: op.homeUrl,
      targetAtGap: state.overlay[op.id]?.target,
    });
    void resyncCanvas();
    return;
  }
  const binding = update.entry.op;
  const bindingNode = binding.type === 'set-home-url' ? doc.nodes[binding.id] : undefined;
  const bindsCopy = binding.type === 'set-home-url' &&
    bindingNode?.kind === 'browser' && bindingNode.content.pendingHomeUrl !== undefined &&
    (binding.pendingHomeUrl === undefined || binding.pendingHomeUrl === null);
  if (bindsCopy && binding.type === 'set-home-url') state.rehomeDeadFrame(binding.id, binding.homeUrl);
  state.applyMirror(outcome.doc, update.entry);
  if (bindsCopy) return;
  const op = update.entry.op;
  if (op.type === 'create-page') {
    // The switch waits for the echo: `setCurrentPage` refuses a page the document does not hold yet (ONL-2488).
    if (useCanvasStore.getState().pendingPageId === op.page.id) {
      useCanvasStore.setState({ pendingPageId: null });
      useCanvasStore.getState().setCurrentPage(op.page.id, 'created');
    }
    return;
  }
  if (op.type === 'set-home-url') {
    if (useCanvasStore.getState().rehomeDeadFrame(op.id, op.homeUrl)) return;
    if (update.entry.author === 'user') {
      useCanvasStore.getState().noteAddressAccepted(op.id, op.homeUrl);
      return;
    }
    // Only the system author (the port-follow) is exempt; an agent's new origin is a real drop.
    if (update.entry.author === 'system') {
      useCanvasStore.getState().notePortFollow(op.id, op.homeUrl);
    }
    useCanvasStore.getState().retargetFrame(op.homeUrl, op.id);
    if (update.entry.author === 'system') {
      useCanvasStore.getState().noteAddressAccepted(op.id, op.homeUrl);
      const acceptedTarget = useCanvasStore.getState().overlay[op.id]?.acceptedTarget;
      if (acceptedTarget !== undefined) useCanvasStore.getState().rehomeDeadFrame(op.id, op.homeUrl, acceptedTarget);
    }
  }
}

function onRejection(rejection: CanvasRejection): void {
  const doc = useCanvasStore.getState().doc;
  if (!doc || rejection.docId !== doc.docId) return;
  // `rejection.reason` is main's prose and stays on the log; only the code reaches a surface (ONL-2488).
  if (rejection.code !== undefined) {
    useCanvasStore.getState().raiseCanvasRefusal(rejection.code);
  }
  void resyncCanvas();
}

// The subscribe-time resync fires outside a switch: the launch-seeded copy can be minutes stale.
// The cleanup leaves the switch latch alone: clearing it lets a StrictMode double-mount's second pass resync mid-switch.
export function connectCanvas(transport?: CanvasTransport): () => void {
  const wire = transport ?? (studio() as CanvasTransport);
  seatCanvasTransport(wire);
  const offUpdate = wire.onCanvasUpdate(onUpdate);
  const offRejected = wire.onCanvasRejected(onRejection);
  const offWorkingFrames = wire.onAgentWorkingFrames((event) => {
    applyWorkingFrameIds(event.frameIds);
  });
  const offFrameQuotes = wire.onCanvasFrameQuotes(({ docId, byFrame, turnRunning }) => {
    if (docId === useCanvasStore.getState().doc?.docId) useCanvasStore.getState().applyFrameQuotes({ byFrame, turnRunning });
  });
  const offStore = useCanvasStore.subscribe(scheduleFrameFactsPush);
  if (!isCanvasSwitchInFlight()) void resyncCanvas();
  return () => {
    offUpdate();
    offRejected();
    offWorkingFrames();
    offFrameQuotes();
    offStore();
    forgetFrameFacts();
    reportedDrops.clear();
    pendingSystemMoves.clear();
    resyncEpoch += 1;
    if (canvasTransport() === wire) seatCanvasTransport(null);
  };
}
