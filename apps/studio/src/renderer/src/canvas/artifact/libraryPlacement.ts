import { CANVAS_ARTIFACT_DEFAULT_BOX, isArtifactId, nextPosition, type ArtifactSummary, type CanvasDoc, type CanvasOp } from '@studio/events';
import { useCanvasStore } from '../store.js';
import { dispatchCanvasOps } from '../wire.js';
import { mintPageId, nextOrder } from '../compose.js';
import { reportArtifactsPlaced } from '../telemetry.js';
import { studio } from '../../bridge.js';

export const ARTIFACT_PLACEMENT_TYPE = 'application/x-studio-artifact-placement';

export function libraryArtifactPlacement(artifact: ArtifactSummary, doc: CanvasDoc, currentPageId: string | null, at = {x: 0, y: 0}): CanvasOp | null {
  if (artifact.readOnly || (artifact.pages?.length ?? 1) !== 1) return null;
  return {type: 'create', node: {
    kind: 'artifact', id: crypto.randomUUID(), pageId: mintPageId(doc, currentPageId), name: '',
    x: at.x, y: at.y, ...(artifact.dimensions ?? CANVAS_ARTIFACT_DEFAULT_BOX), order: nextOrder(doc),
    content: {artifactId: artifact.id, title: artifact.title, pagePath: artifact.pages?.[0]?.path ?? artifact.pagePath},
  }};
}

/** Without a drop point it lands where a new frame would, beside everything already placed. */
export function placeLibraryArtifact(artifact: ArtifactSummary, at?: {x: number; y: number}): boolean {
  const state = useCanvasStore.getState();
  const doc = state.doc;
  if (doc === null) return false;
  const op = libraryArtifactPlacement(artifact, doc, state.currentPageId, at ?? nextPosition(state.nodes));
  if (op === null || !dispatchCanvasOps([op])) return false;
  reportArtifactsPlaced('paste', 1);
  if (at === undefined && op.type === 'create') revealWhenPlaced(op.node.id, state.currentPageId);
  return true;
}

/** A create the camera cannot answer yet: main's echo carries the node, and a reveal nobody is waiting for any more is dropped rather than left to fire later (ONL-2645). */
const REVEAL_WAIT_MS = 5_000;

function revealWhenPlaced(id: string, pageId: string | null, waitMs = REVEAL_WAIT_MS): void {
  const reveal = (state: ReturnType<typeof useCanvasStore.getState>): void => {
    if (state.currentPageId === pageId) state.flyToFrame(id, true);
  };
  if (useCanvasStore.getState().doc?.nodes[id] !== undefined) {
    reveal(useCanvasStore.getState());
    return;
  }
  let stop: (() => void) | undefined;
  const giveUp = setTimeout(() => stop?.(), waitMs);
  stop = useCanvasStore.subscribe((current) => {
    if (current.doc?.nodes[id] === undefined) return;
    clearTimeout(giveUp);
    stop?.();
    reveal(current);
  });
}

export function dragLibraryArtifact(event: React.DragEvent, artifact: ArtifactSummary): void {
  if (artifact.readOnly || (artifact.pages?.length ?? 1) !== 1) { event.preventDefault(); return; }
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData(ARTIFACT_PLACEMENT_TYPE, JSON.stringify({artifactId: artifact.id, pagePath: artifact.pagePath}));
}

export async function dropLibraryArtifact(raw: string, at: {x: number; y: number}): Promise<boolean> {
  if (raw.length > 1024) return false;
  let reference: {artifactId?: unknown; pagePath?: unknown};
  try { reference = JSON.parse(raw); } catch { return false; }
  if (typeof reference !== 'object' || reference === null || !isArtifactId(reference.artifactId) || typeof reference.pagePath !== 'string') return false;
  const before = useCanvasStore.getState();
  if (before.doc === null) return false;
  let read;
  try { read = await studio().artifactRead({artifactId: reference.artifactId}); } catch { return false; }
  const after = useCanvasStore.getState();
  if (read === null || read.readOnly || before.doc.docId !== after.doc?.docId || before.currentPageId !== after.currentPageId) return false;
  if ((read.pages?.length ?? 1) !== 1 || read.pagePath !== reference.pagePath) return false;
  return placeLibraryArtifact(read, at);
}
