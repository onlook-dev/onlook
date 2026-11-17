import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import type { CanvasDoc, CanvasSnapshot, CanvasUpdate, RendererLogLine } from '@studio/events';
import type { CanvasTransport } from './wire.js';

const sent: RendererLogLine[] = [];
(globalThis as { window?: unknown }).window = {
  studio: {
    log(line: RendererLogLine) {
      sent.push(line);
    },
    telemetryException() {},
  },
};

const { setLogMirror } = await import('../log.js');
const { connectCanvas } = await import('./connect.js');
const { useCanvasStore } = await import('./store.js');
setLogMirror(false);

afterAll(() => {
  Reflect.deleteProperty(globalThis, 'window');
});

function docOf(docId: string, revision = 1): CanvasDoc {
  return { schemaVersion: 1, docId, revision, pages: { pg: { id: 'pg', name: 'Canvas', order: 0 } }, nodes: {} };
}

function updateFor(docId: string, revision: number): CanvasUpdate {
  return {
    docId,
    entry: {
      revision,
      author: 'agent',
      at: '2026-11-04T00:00:00Z',
      op: { type: 'create', node: { id: 'f1', pageId: 'pg', kind: 'browser', name: 'Home', x: 0, y: 0, width: 640, height: 480, order: 0, content: { homeUrl: 'about:blank', pendingHomeUrl: 'http://localhost:5180/' } } },
      prior: { kind: 'none' },
    },
  };
}

let emit: (update: CanvasUpdate) => void = () => {};
let disconnect: (() => void) | null = null;

async function connect(doc: CanvasDoc | null): Promise<void> {
  const listeners = new Set<(update: CanvasUpdate) => void>();
  emit = (update) => {
    for (const listener of listeners) listener(update);
  };
  const transport: CanvasTransport = {
    canvasSnapshot: (): Promise<CanvasSnapshot> => Promise.resolve({ doc }),
    canvasPageCameras: () => Promise.resolve({ byPage: {} }),
    canvasOp: () => {},
    canvasUndo: () => {},
    canvasRedo: () => {},
    canvasViewport: () => {},
    canvasCurrentPage: () => {},
    canvasFrames: () => {},
    onCanvasUpdate: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    onCanvasRejected: () => () => {},
    onAgentWorkingFrames: () => () => {},
    onCanvasFrameQuotes: () => () => {},
  };
  disconnect = connectCanvas(transport);
  for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
}

const drops = (): Record<string, unknown>[] =>
  sent.filter((line) => line.subsystem === 'canvas' && line.msg === 'update dropped').map((line) => line.fields ?? {});

beforeEach(() => {
  sent.length = 0;
  useCanvasStore.getState().clearFrames();
});

afterEach(() => {
  disconnect?.();
  disconnect = null;
});

describe('a canvas update the tab cannot apply', () => {
  it('names the drop when the tab holds no document', async () => {
    await connect(null);
    emit(updateFor('doc-a', 2));
    expect(drops()).toEqual([{ reason: 'no_document', update_doc_id: 'doc-a', held_doc_id: null, revision: 2, op: 'create', author: 'agent' }]);
    expect(useCanvasStore.getState().doc).toBeNull();
  });

  it('names both documents when the update is for another one, and changes nothing', async () => {
    await connect(docOf('doc-b'));
    emit(updateFor('doc-a', 2));
    expect(drops()).toEqual([{ reason: 'other_document', update_doc_id: 'doc-a', held_doc_id: 'doc-b', revision: 2, op: 'create', author: 'agent' }]);
    expect(useCanvasStore.getState().doc).toEqual(docOf('doc-b'));
  });

  it('says it once per pair of documents, not once per update', async () => {
    await connect(null);
    emit(updateFor('doc-a', 2));
    emit(updateFor('doc-a', 3));
    emit(updateFor('doc-c', 2));
    expect(drops().map((fields) => fields['update_doc_id'])).toEqual(['doc-a', 'doc-c']);
  });

  it('logs nothing for an update it applies', async () => {
    await connect(docOf('doc-a'));
    emit(updateFor('doc-a', 2));
    expect(drops()).toEqual([]);
    expect(Object.keys(useCanvasStore.getState().doc?.nodes ?? {})).toEqual(['f1']);
  });
});
