import '../testing/dom.js';
import { afterEach, expect, test } from 'bun:test';
import { act, StrictMode, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { CanvasDoc, CanvasOpRequest, OnlookState, RendererTelemetryEvent } from '@studio/events';
import { deferred, installBridge } from '../testing/bridge.js';
import { CloudCompatibility, UPDATE_DOWNLOAD_URL } from './UpdateRequired.js';
import { useNodeNudge } from '../canvas/useNodeNudge.js';
import { resetCanvasStoreForTests, useCanvasStore } from '../canvas/store.js';
import { seatCanvasTransport, type CanvasTransport } from '../canvas/wire.js';

let root: Root | undefined;
let container: HTMLDivElement | undefined;
const SUPPORTED: OnlookState = { revision: 1, session: 'signed-in', connection: 'connected', me: null, profile: null };
const BLOCKED: OnlookState = { ...SUPPORTED, revision: 2, connection: 'idle', updateRequired: { clientBuild: 99, minimumSupportedBuild: 100, message: 'Update Onlook to continue.' } };

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  container?.remove();
  seatCanvasTransport(null);
  resetCanvasStoreForTests();
});

test('a cloud rejection covers, but never unmounts or clears, a local draft', async () => {
  let mounts = 0;
  let unmounts = 0;
  let publish: (state: OnlookState) => void = () => {};
  const snapshot = deferred<OnlookState>();
  const telemetry: RendererTelemetryEvent[] = [];
  installBridge({ onOnlookState: (listener) => { publish = listener; return () => {}; }, onlookState: () => snapshot.promise,
    telemetryEvent: (event) => { telemetry.push(event); } });
  function LocalDraft() {
    useEffect(() => { mounts += 1; return () => { unmounts += 1; }; }, []);
    return <textarea defaultValue="Keep my unsaved design" />;
  }
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => { root = createRoot(container!); root.render(<CloudCompatibility><LocalDraft /></CloudCompatibility>); });
  await act(async () => { publish(SUPPORTED); });
  expect(container.querySelector('dialog')).toBeNull();
  expect(telemetry).toEqual([]);
  const draft = container.querySelector('textarea')!;
  draft.value = 'Still editing locally';
  await act(async () => { publish(BLOCKED); });
  expect(container.querySelectorAll('dialog').length).toBe(1);
  expect(container.querySelector('[inert]')).not.toBeNull();
  expect(container.querySelector('textarea')).toBe(draft);
  expect(draft.value).toBe('Still editing locally');
  expect(mounts).toBe(1);
  expect(unmounts).toBe(0);
  await act(async () => { snapshot.settle(SUPPORTED); publish({ ...SUPPORTED, revision: 1 }); });
  expect(container.querySelectorAll('dialog').length).toBe(1);
  const cancel = new Event('cancel', { cancelable: true });
  container.querySelector('dialog')!.dispatchEvent(cancel);
  expect(cancel.defaultPrevented).toBe(true);
  const updateButton = container.querySelector<HTMLButtonElement>('[data-testid="download-update"]')!;
  for (const key of ['Escape', 'Escape']) {
    const escape = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    updateButton.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
  }
  const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  updateButton.dispatchEvent(enter);
  expect(enter.defaultPrevented).toBe(false);
  const originalOpen = window.open;
  const opened: unknown[][] = [];
  window.open = (...args) => { opened.push(args); return null; };
  try {
    await act(async () => { container!.querySelector<HTMLButtonElement>('[data-testid="download-update"]')!.click(); });
    expect(opened).toEqual([[UPDATE_DOWNLOAD_URL, '_blank', 'noopener']]);
    expect(telemetry).toEqual([{ event: 'cloud_update_required_shown', properties: {} }, { event: 'cloud_update_download_clicked', properties: {} }]);
  } finally { window.open = originalOpen; }
});

test('a local provider never presents a compatibility screen', async () => {
  const telemetry: RendererTelemetryEvent[] = [];
  installBridge({ onOnlookState: () => () => {}, onlookState: async () => ({ ...BLOCKED, session: 'local' }), telemetryEvent: (event) => { telemetry.push(event); } });
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => { root = createRoot(container!); root.render(<CloudCompatibility><textarea /></CloudCompatibility>); });
  expect(container.querySelector('dialog')).toBeNull();
  expect(container.querySelector('[inert]')).toBeNull();
  expect(telemetry).toEqual([]);
});

test('strict effect replay reports the update screen only once', async () => {
  const telemetry: RendererTelemetryEvent[] = [];
  installBridge({ onOnlookState: () => () => {}, onlookState: async () => BLOCKED, telemetryEvent: (event) => { telemetry.push(event); } });
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => { root = createRoot(container!); root.render(<StrictMode><CloudCompatibility><textarea /></CloudCompatibility></StrictMode>); });
  expect(telemetry).toEqual([{ event: 'cloud_update_required_shown', properties: {} }]);
});

test('arrow keys in the update dialog cannot move or persist a hidden canvas selection', async () => {
  resetCanvasStoreForTests();
  const doc: CanvasDoc = { schemaVersion: 1, docId: 'kept-canvas', revision: 1,
    pages: { page: { id: 'page', name: 'Page', order: 0 } },
    nodes: { frame: { id: 'frame', kind: 'browser', pageId: 'page', name: 'My design', x: 40, y: 50, width: 320, height: 240, order: 0, content: { homeUrl: 'http://localhost:3000' } } } };
  useCanvasStore.setState({ doc, currentPageId: 'page', mode: 'design', nodes: [{
    id: 'frame', type: 'frame', position: { x: 40, y: 50 }, selected: true,
    data: { homeUrl: 'http://localhost:3000', name: 'My design', currentUrl: 'http://localhost:3000', title: '', health: 'live', canGoBack: false, canGoForward: false },
  }] });
  const persisted: CanvasOpRequest[] = [];
  seatCanvasTransport({ canvasOp: (request: CanvasOpRequest) => { persisted.push(request); } } as CanvasTransport);
  function EditorKeyboard() { useNodeNudge(); return <textarea defaultValue="Local draft" />; }
  installBridge({ onOnlookState: () => () => {}, onlookState: async () => BLOCKED, telemetryEvent: () => {} });
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => { root = createRoot(container!); root.render(<CloudCompatibility><EditorKeyboard /></CloudCompatibility>); });
  const button = container.querySelector<HTMLButtonElement>('[data-testid="download-update"]')!;
  await act(async () => {
    for (const key of ['ArrowRight', 'ArrowDown']) {
      button.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    }
    useCanvasStore.getState().flushNudges();
  });
  expect(useCanvasStore.getState().nodes[0]!.position).toEqual({ x: 40, y: 50 });
  expect(persisted).toEqual([]);
});
