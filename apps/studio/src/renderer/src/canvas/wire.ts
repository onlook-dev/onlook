import {
  MAX_CANVAS_OPS_PER_REQUEST,
  type AgentWorkingFramesEvent,
  type CanvasCameraSave,
  type CanvasCurrentPageSave,
  type CanvasDoc,
  type CanvasOp,
  type CanvasOpRequest,
  type CanvasPageCameras,
  type CanvasPageCamerasRequest,
  type CanvasRejection,
  type CanvasSnapshot,
  type CanvasFrameQuotes,
  type CanvasUndoRequest,
  type CanvasUpdate,
  type FrameFactsPush,
} from '@studio/events';
import { log as rendererLog } from '../log.js';

export interface CanvasTransport {
  canvasSnapshot(): Promise<CanvasSnapshot>;
  canvasPageCameras(request: CanvasPageCamerasRequest): Promise<CanvasPageCameras>;
  canvasOp(request: CanvasOpRequest): void;
  canvasUndo(request: CanvasUndoRequest): void;
  canvasRedo(request: CanvasUndoRequest): void;
  onCanvasUpdate(listener: (update: CanvasUpdate) => void): () => void;
  onCanvasRejected(listener: (rejection: CanvasRejection) => void): () => void;
  canvasViewport(save: CanvasCameraSave): void;
  canvasCurrentPage(save: CanvasCurrentPageSave): void;
  canvasFrames(push: FrameFactsPush): void;
  onAgentWorkingFrames(listener: (event: AgentWorkingFramesEvent) => void): () => void;
  onCanvasFrameQuotes(listener: (event: CanvasFrameQuotes) => void): () => void;
}

const canvasLog = rendererLog('canvas');

let seatTransport: CanvasTransport | null = null;

export function seatCanvasTransport(wire: CanvasTransport | null): void {
  seatTransport = wire;
}

export function canvasTransport(): CanvasTransport | null {
  return seatTransport;
}

let docSource: () => CanvasDoc | null = () => null;

export function setCanvasDocSource(source: (() => CanvasDoc | null) | null): void {
  docSource = source ?? (() => null);
}

/** Suppresses the remount's resync mid-switch, which would mirror the outgoing document; every resync outcome clears it, or it suppresses every later mount resync (ONL-1999). */
let isSwitchInFlight = false;

export function beginCanvasSwitch(): void {
  isSwitchInFlight = true;
}

export function endCanvasSwitch(): void {
  isSwitchInFlight = false;
}

export function isCanvasSwitchInFlight(): boolean {
  return isSwitchInFlight;
}

interface CanvasDispatchOptions {
  /** A box this renderer measured back: main applies it, but authors no history entry for it (ONL-2486). */
  correction?: true;
}

/** Drops with a trace when no document or wire is open; never queued, since a held op lands on whatever document arrives next. */
export function dispatchCanvasOp(op: CanvasOp, options?: CanvasDispatchOptions): boolean {
  return dispatchCanvasOps([op], options);
}

export function dispatchCanvasOps(ops: CanvasOp[], options: CanvasDispatchOptions = {}): boolean {
  if (ops.length === 0) return false;
  if (ops.length > MAX_CANVAS_OPS_PER_REQUEST) {
    canvasLog.warn(
      `dropped ${ops.length} operations: an action may contain at most ${MAX_CANVAS_OPS_PER_REQUEST}`,
    );
    return false;
  }
  const doc = docSource();
  const wire = seatTransport;
  if (!doc || !wire) {
    canvasLog.warn(
      `dropped ${ops.length === 1 ? `a ${ops[0]?.type}` : `${ops.length}`} op${ops.length === 1 ? '' : 's'}: ${doc ? 'not connected' : 'no document is open'}`,
    );
    return false;
  }
  if (ops.length === 1) {
    wire.canvasOp({ docId: doc.docId, op: ops[0]!, ...options });
    return true;
  }
  wire.canvasOp({ docId: doc.docId, ops, ...options });
  return true;
}
