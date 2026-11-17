import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import type { BrowserNode, CanvasDoc, CanvasUpdate } from '@studio/events';
import { connectCanvas, resyncCanvas } from './connect.js';
import { resetCanvasStoreForTests, useCanvasStore } from './store.js';
import type { CanvasTransport } from './wire.js';

let disconnect: (() => void) | undefined;

beforeEach(() => resetCanvasStoreForTests());
afterEach(() => {
  disconnect?.();
  disconnect = undefined;
});

function copiedFrame(id: string, pageId: string, route: string): BrowserNode {
  return {
    id, pageId, kind: 'browser', name: id, x: 0, y: 0, width: 640, height: 480, order: 0,
    content: { homeUrl: 'about:blank', pendingHomeUrl: `http://localhost:4317${route}` },
  };
}

describe('copied Frame binding echoes across Pages', () => {
  for (const recovery of ['manual', 'revision-gap'] as const) {
    it(`repairs every pending overlay through ${recovery} snapshot recovery`, async () => {
      const visible = copiedFrame('visible', 'pg_a', '/products?sort=new#details');
      const offpage = copiedFrame('offpage', 'pg_b', '/settings?tab=account#profile');
      let snapshot: CanvasDoc = {
        schemaVersion: 1, docId: 'snapshot-copy', revision: 1,
        pages: {
          pg_a: { id: 'pg_a', name: 'Products', order: 0 },
          pg_b: { id: 'pg_b', name: 'Settings', order: 1 },
        },
        nodes: { visible, offpage },
      };
      let listener: ((update: CanvasUpdate) => void) | undefined;
      disconnect = connectCanvas({
        canvasSnapshot: async () => ({ doc: snapshot }),
        canvasPageCameras: async () => ({ byPage: {} }),
        canvasOp: () => {}, canvasUndo: () => {}, canvasRedo: () => {},
        canvasViewport: () => {}, canvasCurrentPage: () => {}, canvasFrames: () => {},
        onCanvasUpdate: (next) => { listener = next; return () => {}; },
        onCanvasRejected: () => () => {}, onAgentWorkingFrames: () => () => {}, onCanvasFrameQuotes: () => () => {},
      });
      await resyncCanvas();
      useCanvasStore.getState().setCurrentPage('pg_a', 'click');
      snapshot = structuredClone(snapshot);
      snapshot.revision = 3;
      for (const node of Object.values(snapshot.nodes)) {
        if (node.kind !== 'browser') throw new Error('expected copied browser');
        node.content = { homeUrl: node.content.pendingHomeUrl!.replace(':4317', ':5182') };
      }
      if (recovery === 'manual') await resyncCanvas();
      else {
        listener?.({
          docId: snapshot.docId,
          entry: { revision: 4, author: 'system', at: '2026-10-14T12:00:00.000Z',
            op: { type: 'move', id: 'visible', x: 10, y: 10 },
            prior: { kind: 'fields', id: 'visible', fields: { x: 0, y: 0 } } },
        });
        await Promise.resolve();
        await Promise.resolve();
      }
      for (const frame of [visible, offpage]) {
        const home = frame.content.pendingHomeUrl!.replace(':4317', ':5182');
        expect(useCanvasStore.getState().overlay[frame.id]?.mountUrl).toBe(home);
        expect(useCanvasStore.getState().overlay[frame.id]?.currentUrl).toBe(home);
      }
      for (const page of ['pg_b', 'pg_a', 'pg_b']) {
        useCanvasStore.getState().setCurrentPage(page, 'click');
        for (const node of useCanvasStore.getState().nodes) {
          expect(node.data.currentUrl).not.toContain(':4317');
          expect(useCanvasStore.getState().overlay[node.id]?.mountUrl).not.toContain(':4317');
        }
      }
    });
  }

  it('rebuilds both overlays before clearing pending homes, including the unmounted Page', async () => {
    const visible = copiedFrame('visible', 'pg_a', '/products?sort=new#details');
    const offpage = copiedFrame('offpage', 'pg_b', '/settings?tab=account#profile');
    const doc: CanvasDoc = {
      schemaVersion: 1, docId: 'copied-doc', revision: 1,
      pages: {
        pg_a: { id: 'pg_a', name: 'Products', order: 0 },
        pg_b: { id: 'pg_b', name: 'Settings', order: 1 },
      },
      nodes: { visible, offpage },
    };
    let updateListener: ((update: CanvasUpdate) => void) | undefined;
    const transport: CanvasTransport = {
      canvasSnapshot: async () => ({ doc }),
      canvasPageCameras: async () => ({ byPage: {} }),
      canvasOp: () => {}, canvasUndo: () => {}, canvasRedo: () => {},
      canvasViewport: () => {}, canvasCurrentPage: () => {}, canvasFrames: () => {},
      onCanvasUpdate: (listener) => {
        updateListener = listener;
        return () => { updateListener = undefined; };
      },
      onCanvasRejected: () => () => {},
      onAgentWorkingFrames: () => () => {}, onCanvasFrameQuotes: () => () => {},
    };
    disconnect = connectCanvas(transport);
    await resyncCanvas();
    useCanvasStore.getState().setCurrentPage('pg_a', 'click');
    expect(useCanvasStore.getState().nodes.map((node) => node.id)).toEqual(['visible']);
    useCanvasStore.setState((state) => ({
      overlay: {
        ...state.overlay,
        offpage: { ...state.overlay.offpage!, target: { url: 'http://localhost:4317/stale', seq: 7 } },
      },
    }));
    for (const [index, frame] of [visible, offpage].entries()) {
      const homeUrl = frame.content.pendingHomeUrl!.replace(':4317', ':5182');
      updateListener?.({
        docId: doc.docId,
        entry: {
          revision: index + 2, author: 'system', at: '2026-10-14T12:00:00.000Z',
          op: { type: 'set-home-url', id: frame.id, homeUrl },
          prior: { kind: 'fields', id: frame.id, fields: { homeUrl: 'about:blank' } },
        },
      });
      const state = useCanvasStore.getState();
      expect(state.overlay[frame.id]?.mountUrl).toBe(homeUrl);
      expect(state.overlay[frame.id]?.currentUrl).toBe(homeUrl);
      expect(state.overlay[frame.id]?.target).toBeUndefined();
      const durable = state.doc?.nodes[frame.id];
      if (durable?.kind !== 'browser') throw new Error('expected copied browser');
      expect(durable.content).toEqual({ homeUrl });
    }
    useCanvasStore.getState().setCurrentPage('pg_b', 'click');
    const shown = useCanvasStore.getState().nodes[0];
    expect(shown?.id).toBe('offpage');
    expect(shown?.data.currentUrl).toBe('http://localhost:5182/settings?tab=account#profile');
    expect(shown?.data.serverCover).toBeUndefined();
  });

  it('does not rehome an ordinary healthy or off-page Frame', () => {
    const frame = copiedFrame('ordinary', 'pg_a', '/');
    frame.content = { homeUrl: 'http://localhost:4317/' };
    useCanvasStore.getState().replaceDoc({
      schemaVersion: 1, docId: 'ordinary-doc', revision: 1,
      pages: { pg_a: { id: 'pg_a', name: 'Home', order: 0 }, pg_b: { id: 'pg_b', name: 'Other', order: 1 } },
      nodes: { ordinary: frame },
    });
    useCanvasStore.getState().setCurrentPage('pg_a', 'click');
    expect(useCanvasStore.getState().rehomeDeadFrame(frame.id, 'http://localhost:5182/')).toBe(false);
    useCanvasStore.getState().setCurrentPage('pg_b', 'click');
    expect(useCanvasStore.getState().rehomeDeadFrame(frame.id, 'http://localhost:5182/')).toBe(false);
    expect(useCanvasStore.getState().overlay[frame.id]?.mountUrl).toBe('http://localhost:4317/');
  });
});
