import type { CanvasUndoRequest } from '@studio/events';

export interface CanvasHistoryState {
  doc: { docId: string } | null;
  gesture: Record<string, unknown>;
  duplicateDrag: unknown | null;
  resizeInFlightId: unknown | null;
  frameDraw: unknown | null;
}

export interface CanvasHistoryTransport {
  canvasUndo(request: CanvasUndoRequest): void;
  canvasRedo(request: CanvasUndoRequest): void;
}

interface CanvasHistorySources {
  state(): CanvasHistoryState;
  transport(): CanvasHistoryTransport | null;
}

const disconnectedSources: CanvasHistorySources = {
  state: () => ({
    doc: null,
    gesture: {},
    duplicateDrag: null,
    resizeInFlightId: null,
    frameDraw: null,
  }),
  transport: () => null,
};

let sources = disconnectedSources;

export function setCanvasHistorySources(next: CanvasHistorySources | null): void {
  sources = next ?? disconnectedSources;
}

export function dispatchCanvasHistory(
  kind: 'undo' | 'redo',
  state: CanvasHistoryState,
  transport: CanvasHistoryTransport | null,
): void {
  if (!state.doc || !transport) return;
  if (
    Object.keys(state.gesture).length > 0 ||
    state.duplicateDrag !== null ||
    state.resizeInFlightId !== null ||
    state.frameDraw !== null
  ) {
    return;
  }
  const request = { docId: state.doc.docId };
  if (kind === 'undo') transport.canvasUndo(request);
  else transport.canvasRedo(request);
}

export function dispatchCanvasUndo(): void {
  dispatchCanvasHistory('undo', sources.state(), sources.transport());
}

export function dispatchCanvasRedo(): void {
  dispatchCanvasHistory('redo', sources.state(), sources.transport());
}
