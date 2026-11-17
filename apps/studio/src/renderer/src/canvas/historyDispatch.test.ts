import { describe, expect, it } from 'bun:test';
import type { CanvasUndoRequest } from '@studio/events';
import {
  dispatchCanvasHistory,
  type CanvasHistoryState,
} from './historyDispatch.js';

function instrument(): {
  undo: CanvasUndoRequest[];
  redo: CanvasUndoRequest[];
  transport: {
    canvasUndo(request: CanvasUndoRequest): void;
    canvasRedo(request: CanvasUndoRequest): void;
  };
} {
  const undo: CanvasUndoRequest[] = [];
  const redo: CanvasUndoRequest[] = [];
  return {
    undo,
    redo,
    transport: {
      canvasUndo: (request) => undo.push(request),
      canvasRedo: (request) => redo.push(request),
    },
  };
}

describe('the undo/redo dispatch seam (ONL-2042)', () => {
  function restingState(docId = 'doc-under-test'): CanvasHistoryState {
    return {
      doc: { docId },
      gesture: {},
      duplicateDrag: null,
      resizeInFlightId: null,
      frameDraw: null,
    };
  }

  it('stamps both asks with the open docId and nothing else', () => {
    const state = restingState();
    const sent = instrument();

    dispatchCanvasHistory('undo', state, sent.transport);
    dispatchCanvasHistory('redo', state, sent.transport);

    expect(sent.undo).toEqual([{ docId: 'doc-under-test' }]);
    expect(sent.redo).toEqual([{ docId: 'doc-under-test' }]);
  });

  it('drops both asks with no open document or no connected transport', () => {
    const sent = instrument();
    const noDocument = { ...restingState(), doc: null };
    dispatchCanvasHistory('undo', noDocument, sent.transport);
    dispatchCanvasHistory('redo', noDocument, sent.transport);
    dispatchCanvasHistory(
      'undo',
      restingState(),
      null,
    );
    expect({ undo: sent.undo, redo: sent.redo }).toEqual({ undo: [], redo: [] });
  });

  it('drops history while any gesture seat is active, then flows once all retire', () => {
    const state = restingState();
    state.gesture = { a: { x: 40, y: 30 } };
    const sent = instrument();

    dispatchCanvasHistory('undo', state, sent.transport);
    dispatchCanvasHistory('redo', state, sent.transport);
    expect({ undo: sent.undo, redo: sent.redo }).toEqual({ undo: [], redo: [] });

    state.gesture = {};
    state.duplicateDrag = {};
    dispatchCanvasHistory('undo', state, sent.transport);
    dispatchCanvasHistory('redo', state, sent.transport);
    expect({ undo: sent.undo, redo: sent.redo }).toEqual({ undo: [], redo: [] });

    state.duplicateDrag = null;
    state.resizeInFlightId = 'a';
    dispatchCanvasHistory('undo', state, sent.transport);
    state.resizeInFlightId = null;
    state.frameDraw = {};
    dispatchCanvasHistory('undo', state, sent.transport);
    expect(sent.undo).toEqual([]);

    state.frameDraw = null;
    dispatchCanvasHistory('undo', state, sent.transport);
    expect(sent.undo).toEqual([{ docId: 'doc-under-test' }]);
  });
});
