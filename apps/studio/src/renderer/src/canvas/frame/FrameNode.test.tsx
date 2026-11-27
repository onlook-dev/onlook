import { takeComplaints } from '../../testing/dom.js';
import { afterEach, beforeEach, expect, it, mock, spyOn } from 'bun:test';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ReactFlowProvider, useStoreApi } from '@xyflow/react';
import { GUEST_CHANNEL_TO_GUEST, GUEST_CHANNEL_TO_HOST, type BrowserNode, type CanvasDoc, type CanvasOpRequest, type CanvasUpdate, type PickerToGuest, type StudioBridge } from '@studio/events';
import { resetCanvasStoreForTests, useCanvasStore } from '../store.js';
import { connectCanvas } from '../connect.js';
import { defaultOverlay } from '../readModel.js';
import { forgetFrameFacts } from '../frameFacts.js';
import * as frameFacts from '../frameFacts.js';
import { beforeTabFramesDiscarded, installTabFrames, useTabFrames } from './tabFrames.js';
import { useServerStore } from '../../server/store.js';
import { useAgentStore } from '../../agent/store.js';
import { registerChatSubmit } from '../../chat/submitRegistry.js';
import { seedFlags } from '../../flags/store.js';
import { useProjectCreateStore } from '../../create/projectCreate.js';
import { publishSetupTurn } from '../../create/setupProgress.js';
import { selectProjectSetupSnapshot, useProjectSetupStore } from '../../project-setup/store.js';
import { runFeedback, useRunFeedbackStore } from '../../server/runFeedbackStore.js';
import { reportRunIntent } from '../../project-setup/runControl.js';
import { FrameRunIntentContext } from './runIntent.js';

mock.module('../menu/CanvasNodeMenu.jsx', () => ({ CanvasNodeMenu: ({ children }: { children: ReactNode }) => children }));
let resizeScale: number | undefined;
mock.module('../NodeResizeHandles.jsx', () => ({ NodeResizeHandles: ({ scale }: { scale: number }) => { resizeScale = scale; return null; } }));
mock.module('../InlineElementChat.jsx', () => ({ InlineElementChat: () => null }));
let toolbarRenders = 0;
mock.module('./FrameToolbar.jsx', () => ({ FrameToolbar: ({ onRefresh, data }: { onRefresh: (bypassCache: boolean) => void; data: { canGoBack: boolean; canGoForward: boolean } }) => {
  toolbarRenders += 1;
  return <>
    <button onClick={() => onRefresh(false)}>Refresh fixture</button>
    {data.canGoBack && <button data-testid="frame-back-fixture">Back fixture</button>}
    {data.canGoForward && <button data-testid="frame-forward-fixture">Forward fixture</button>}
  </>;
} }));

const { FrameNode } = await import('./FrameNode.js');
const FRAME_ID = 'frame-a';
const URL_A = 'http://localhost:3000/a';
const URL_B = 'http://localhost:3000/b';
const originalBridge = window.studio;
const originalSetup = useProjectSetupStore.getState();
let root: Root | undefined;
let flowStore: ReturnType<typeof useStoreApi>;
let container: HTMLElement;
let applyFrames: (state: { discarded: boolean; request: number }) => void;
let request = 0;
let restoreCreateElement: () => void;
let unregisterChat: (() => void) | undefined;
const acknowledgements: { request: number; guests: number }[] = [];
const guests: { element: HTMLElement; messages: PickerToGuest[]; navigations: string[]; url: string; ready: boolean }[] = [];

beforeEach(() => {
  resizeScale = undefined;
  resetCanvasStoreForTests();
  useTabFrames.setState({ discarded: false, epoch: 0 });
  guests.length = 0;
  acknowledgements.length = 0;
  request = 0;
  const createElement = document.createElement.bind(document);
  const create = spyOn(document, 'createElement').mockImplementation(((name: string, options?: ElementCreationOptions) => {
    const element = createElement(name, options);
    if (name !== 'webview') return element;
    const guest = { element, messages: [] as PickerToGuest[], navigations: [] as string[], url: URL_A, ready: false };
    const contentsId = guests.push(guest);
    Object.assign(element, {
      getWebContentsId: () => { if (!guest.ready) throw new Error('not ready'); return contentsId; },
      getURL: () => guest.url,
      getTitle: () => guest.url,
      canGoBack: () => guest.url !== URL_A,
      canGoForward: () => false,
      getZoomFactor: () => 1,
      loadURL: async (url: string) => {
        guest.navigations.push(url);
        guest.url = url;
        element.dispatchEvent(new Event('did-navigate'));
        element.dispatchEvent(new Event('did-stop-loading'));
      },
      send: (channel: string, message: PickerToGuest) => {
        if (!guest.ready) throw new Error('not ready');
        expect(channel).toBe(GUEST_CHANNEL_TO_GUEST);
        guest.messages.push(message);
      },
    });
    return element;
  }) as typeof document.createElement);
  restoreCreateElement = () => { create.mockRestore(); };
  window.studio = {
    telemetryEvent: () => {},
    onTabFrames: (listener: typeof applyFrames) => { applyFrames = listener; return () => {}; },
    tabFramesApplied: (actual: number) => { acknowledgements.push({ request: actual, guests: container.querySelectorAll('webview').length }); },
    frameIdle: async () => ({ paused: false }),
    canvasFrameReady: async () => 'ready',
    codeComponentMap: async () => ({ ok: true, boundaries: [] }),
  } as unknown as StudioBridge;
  installTabFrames();
  const frame: BrowserNode = { id: FRAME_ID, pageId: 'pg_main', kind: 'browser', name: 'Frame', x: 0, y: 0, width: 640, height: 480, order: 0, content: { homeUrl: URL_A } };
  const doc: CanvasDoc = { schemaVersion: 1, docId: 'doc-idle', revision: 1, pages: { pg_main: { id: 'pg_main', name: 'Canvas', order: 0 }, pg_other: { id: 'pg_other', name: 'Other', order: 1 } }, nodes: { [FRAME_ID]: frame } };
  useCanvasStore.setState({ doc, overlay: { [FRAME_ID]: defaultOverlay(frame) }, serverEntries: [{ entryId: 'server', folderName: 'app', ownership: 'studio-started', status: 'running', port: 3000, ports: [{ port: 3000, origin: 'http://localhost:3000', measured: 'live', everLive: true }], everMeasuredLive: true }] });
  useCanvasStore.getState().patchFrame(FRAME_ID, { health: 'loading' });
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  seedFlags();
  root = undefined;
  container.remove();
  restoreCreateElement();
  forgetFrameFacts();
  window.studio = originalBridge;
  unregisterChat?.();
  unregisterChat = undefined;
  useAgentStore.setState({ hasSession: false, connection: { status: 'unknown' } });
  useServerStore.setState({ entries: [], pending: false });
  runFeedback.reset();
  useProjectSetupStore.setState(originalSetup, true);
  resetCanvasStoreForTests();
  useTabFrames.setState({ discarded: false, epoch: 0 });
  expect(takeComplaints()).toEqual([]);
});

function Surface({ width = 640, height = 480, withRunControl = true }: { width?: number; height?: number; withRunControl?: boolean }) {
  flowStore = useStoreApi();
  const frame = useCanvasStore((state) => state.nodes.find((node) => node.id === FRAME_ID));
  if (!frame) return null;
  if (frame?.type !== 'frame') throw new Error('missing Frame');
  const node = <FrameNode id={FRAME_ID} type="frame" data={frame.data} selected={frame.selected ?? false} dragging={false} zIndex={0} isConnectable={false} selectable draggable deletable width={width} height={height} positionAbsoluteX={0} positionAbsoluteY={0} />;
  return withRunControl ? <FrameRunIntentContext value={(intent) => reportRunIntent(intent, selectProjectSetupSnapshot(useProjectSetupStore.getState())?.saved != null, useServerStore.getState().entries, [URL_A])}>{node}</FrameRunIntentContext> : node;
}

async function mount(onCanvasClick?: () => void, withRunControl = true) {
  const surface = document.createElement('div');
  container.appendChild(surface);
  root = createRoot(surface);
  if (onCanvasClick) container.addEventListener('click', onCanvasClick);
  await act(async () => { root!.render(<ReactFlowProvider><Surface withRunControl={withRunControl} /></ReactFlowProvider>); });
  return guests.at(-1)!;
}

async function pressRecoveryAction(button: HTMLButtonElement) {
  expect(button.closest('.nodrag.nopan')).not.toBeNull();
  expect((button.closest('.nodrag.nopan') as HTMLElement).style.pointerEvents).toBe('auto');
  await act(async () => {
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup']) {
      button.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, buttons: type.endsWith('down') ? 1 : 0 }));
    }
    button.click();
  });
}

it('does not rerender a live unselected Frame on every zoom tick', async () => {
  await loaded(await mount());
  await act(async () => { flowStore.setState({ width: 1280, height: 720 }); });
  const before = toolbarRenders;
  for (const zoom of [0.95, 0.9, 0.85, 0.8]) {
    await act(async () => { flowStore.setState({ transform: [0, 0, zoom] }); });
  }
  expect(toolbarRenders).toBe(before);
});

it('keeps focused Frame resize targets counter-scaled with its element chat parked in Preview', async () => {
  await loaded(await mount());
  await act(async () => {
    useCanvasStore.getState().addElementSelection({ kind: 'element', id: 'held-element', tag: 'button', domPath: 'html > body > button', outerHtmlSnippet: '<button>Buy</button>', textContent: 'Buy', classes: [], frameUrl: URL_A }, FRAME_ID, false);
    useCanvasStore.getState().setMode('interact');
  });
  expect(useCanvasStore.getState().selectedNodeIds).toEqual([]);
  for (const zoom of [0.25, 0.5, 2]) {
    await act(async () => { flowStore.setState({ transform: [0, 0, zoom] }); });
    expect(resizeScale).toBe(1 / zoom);
  }
});

async function resizeTo(width: number, height: number) {
  await act(async () => { root!.render(<ReactFlowProvider><Surface width={width} height={height} /></ReactFlowProvider>); });
}

it('wakes a small phone Frame in Preview and pauses it again in Design', async () => {
  const requests: boolean[] = [];
  window.studio = {
    ...window.studio,
    frameIdle: async ({ idle }) => {
      requests.push(idle);
      return { paused: idle, thumbnail: idle ? 'data:image/png;base64,phone' : undefined };
    },
    framePicture: async () => 'data:image/png;base64,phone',
  };
  await loaded(await mount());
  await resizeTo(390, 844);
  await act(async () => {
    flowStore.setState({ width: 1280, height: 720, transform: [0, 0, 0.36] });
    useCanvasStore.getState().patchFrame(FRAME_ID, { health: 'live' });
  });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 850)); });
  expect(requests.at(-1)).toBe(true);
  expect(container.querySelector('.frame-idle-thumbnail')).not.toBeNull();

  await act(async () => { useCanvasStore.getState().setMode('interact'); });
  expect(requests.at(-1)).toBe(false);
  expect(container.querySelector('.frame-idle-thumbnail')).toBeNull();

  await act(async () => { flowStore.setState({ transform: [1280, 0, 0.36] }); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 850)); });
  expect(requests.at(-1)).toBe(true);
  await act(async () => { flowStore.setState({ transform: [0, 0, 0.36] }); });
  expect(requests.at(-1)).toBe(false);

  await act(async () => { useCanvasStore.getState().setMode('design'); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 850)); });
  expect(requests.at(-1)).toBe(true);
});

async function loaded(guest: (typeof guests)[number], url = guest.element.getAttribute('src') ?? guest.url) {
  await act(async () => {
    guest.url = url;
    guest.ready = true;
    guest.element.dispatchEvent(new Event('dom-ready'));
    guest.element.dispatchEvent(new Event('did-stop-loading'));
  });
}

async function discard(discarded: boolean) {
  await act(async () => { await applyFrames({ discarded, request: ++request }); });
}

it('takes the picture again when its Frame changes shape, so a wake is not letterboxed', async () => {
  const asked: boolean[] = [];
  window.studio = { ...window.studio, framePicture: async ({ retake }) => { asked.push(retake === true); return null; } };
  const guest = await mount();
  await loaded(guest);
  await act(async () => { useCanvasStore.getState().patchFrame(FRAME_ID, { health: 'live' }); });
  await resizeTo(640, 480);
  expect(asked).toEqual([]);
  await resizeTo(390, 844);
  expect(asked).toEqual([true]);
  await act(async () => { useCanvasStore.setState({ resizeInFlightId: FRAME_ID }); });
  await resizeTo(500, 844);
  expect(asked).toEqual([true]);
});

it('waits for the guest before retaking a resized live Frame picture', async () => {
  const asked: number[] = [];
  window.studio = { ...window.studio, framePicture: async ({ webContentsId, retake }) => { if (retake) asked.push(webContentsId); return null; } };
  useCanvasStore.getState().patchFrame(FRAME_ID, { health: 'live' });
  const guest = await mount();
  await resizeTo(390, 844);
  await resizeTo(500, 844);
  expect(asked).toEqual([]);
  await loaded(guest);
  expect(asked).toEqual([1]);
  await loaded(guest);
  expect(asked).toEqual([1]);
});

it('cancels a pending picture retake when its Frame unmounts', async () => {
  const asked: number[] = [];
  window.studio = { ...window.studio, framePicture: async ({ webContentsId, retake }) => { if (retake) asked.push(webContentsId); return null; } };
  useCanvasStore.getState().patchFrame(FRAME_ID, { health: 'live' });
  const guest = await mount();
  await resizeTo(390, 844);
  await act(async () => { root!.unmount(); });
  root = undefined;
  guest.ready = true;
  await act(async () => { guest.element.dispatchEvent(new Event('dom-ready')); });
  expect(asked).toEqual([]);
});

it('keeps the last picture across released guests until replacement paint without a loading label', async () => {
  useCanvasStore.getState().selectFrame(FRAME_ID, false);
  let paint: ((picture: string | null) => void) | undefined;
  window.studio = { ...window.studio, framePicture: ({ afterPaint }) => afterPaint
    ? new Promise(resolve => { paint = resolve; })
    : Promise.resolve('data:image/png;base64,last-page') };
  const initial = await mount();
  await loaded(initial);
  await discard(true);
  expect(container.querySelector('webview')).toBeNull();
  expect(container.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,last-page');
  expect(container.querySelector('[data-testid="frame-loading"]')).toBeNull();
  await discard(false);
  const replacement = guests.at(-1)!;
  expect(replacement).not.toBe(initial);
  expect(container.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,last-page');
  await loaded(replacement);
  expect(container.querySelector('img')).not.toBeNull();
  await act(async () => { paint?.('new-paint'); });
  expect(container.querySelector('img')).toBeNull();
});

it('an explicit refresh does not reuse the released guest picture', async () => {
  window.studio = { ...window.studio, framePicture: async ({ afterPaint }) => afterPaint ? null : 'data:image/png;base64,last-page' };
  const initial = await mount();
  await loaded(initial);
  await discard(true);
  await discard(false);
  expect(container.querySelector('img')).not.toBeNull();
  await act(async () => { container.querySelector('button')!.click(); });
  expect(container.querySelector('img')).toBeNull();
});

it('a wake overtakes a pending discard without applying its late picture', async () => {
  let finishCapture: ((picture: string) => void) | undefined;
  window.studio = { ...window.studio, framePicture: () => new Promise(resolve => { finishCapture = resolve; }) };
  const initial = await mount();
  await loaded(initial);
  let pending: unknown;
  await act(async () => { pending = applyFrames({ discarded: true, request: ++request }); });
  await discard(false);
  await act(async () => { finishCapture?.('data:image/png;base64,late-page'); await pending; });
  expect(useTabFrames.getState().discarded).toBe(false);
  expect(container.querySelector('webview')).toBe(initial.element);
  expect(container.querySelector('img')).toBeNull();
  expect(acknowledgements.map(entry => entry.request)).toEqual([2]);
});

it('bounds the whole discard capture phase even when a capture never settles', async () => {
  const initial = await mount();
  await loaded(initial);
  let signal: AbortSignal | undefined;
  const unsubscribe = beforeTabFramesDiscarded(async activeSignal => {
    signal = activeSignal;
    await new Promise<void>(() => {});
  });
  try {
    await discard(true);
    expect(signal?.aborted).toBe(true);
    expect(useTabFrames.getState().discarded).toBe(true);
    expect(acknowledgements.map(entry => entry.request)).toEqual([1]);
  } finally {
    unsubscribe();
  }
});

it('does not publish a completed picture while another capture delays a canceled discard', async () => {
  window.studio = { ...window.studio, framePicture: async () => 'data:image/png;base64,staged-page' };
  const initial = await mount();
  await loaded(initial);
  let finishOther: (() => void) | undefined;
  const unsubscribe = beforeTabFramesDiscarded(() => new Promise(resolve => { finishOther = () => resolve(); }));
  let pending: unknown;
  try {
    await act(async () => { pending = applyFrames({ discarded: true, request: ++request }); });
    expect(container.querySelector('img')).toBeNull();
    await discard(false);
    await act(async () => { finishOther?.(); await pending; });
    expect(container.querySelector('webview')).toBe(initial.element);
    expect(container.querySelector('img')).toBeNull();
  } finally {
    unsubscribe();
  }
});

it('keeps paint readiness running when another discard is canceled', async () => {
  useCanvasStore.getState().selectFrame(FRAME_ID, false);
  let paint: ((picture: true) => void) | undefined;
  let finishCapture: ((picture: string) => void) | undefined;
  window.studio = { ...window.studio, framePicture: ({ afterPaint }) => afterPaint
    ? new Promise(resolve => { paint = resolve; })
    : Promise.resolve('data:image/png;base64,last-page') };
  await loaded(await mount());
  await discard(true);
  await discard(false);
  const replacement = guests.at(-1)!;
  await loaded(replacement);
  expect(container.querySelector('img')).not.toBeNull();
  window.studio = { ...window.studio, framePicture: () => new Promise(resolve => { finishCapture = resolve; }) };
  let pending: unknown;
  await act(async () => { pending = applyFrames({ discarded: true, request: ++request }); });
  await discard(false);
  await act(async () => { paint?.(true); finishCapture?.('data:image/png;base64,canceled-page'); await pending; });
  expect(container.querySelector('webview')).toBe(replacement.element);
  expect(container.querySelector('img')).toBeNull();
});

it('keeps the navigated page picture when discard rebases its mount URL', async () => {
  window.studio = { ...window.studio, framePicture: async ({ afterPaint }) => afterPaint ? null : 'data:image/png;base64,page-b' };
  const initial = await mount();
  await loaded(initial);
  await act(async () => { initial.url = URL_B; initial.element.dispatchEvent(new Event('did-navigate')); });
  await discard(true);
  expect(useCanvasStore.getState().overlay[FRAME_ID]?.mountUrl).toBe(URL_B);
  expect(container.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,page-b');
  expect(container.querySelector('[data-testid="frame-loading"]') === null).toBe(true);
  await discard(false);
  expect(guests.at(-1)!.element.getAttribute('src')).toBe(URL_B);
  expect(container.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,page-b');
});

it('drops a staged picture when its Frame navigates while another Frame delays the discard', async () => {
  window.studio = { ...window.studio, framePicture: async ({ afterPaint }) => afterPaint ? null : 'data:image/png;base64,page-a' };
  const initial = await mount();
  await loaded(initial);
  let finishOther: (() => void) | undefined;
  const unsubscribe = beforeTabFramesDiscarded(() => new Promise(resolve => { finishOther = () => resolve(); }));
  let pending: unknown;
  try {
    await act(async () => { pending = applyFrames({ discarded: true, request: ++request }); });
    await act(async () => { initial.url = URL_B; initial.element.dispatchEvent(new Event('did-navigate')); });
    await act(async () => { finishOther?.(); await pending; });
    expect(useCanvasStore.getState().overlay[FRAME_ID]?.mountUrl).toBe(URL_B);
    expect(container.querySelector('img')).toBeNull();
  } finally {
    unsubscribe();
  }
});

function deferFrameAttachments() {
  type Result = Awaited<ReturnType<StudioBridge['canvasFrameAttach']>>;
  const pending: { nodeId: string; resolve: (result: Result) => void; reject: (error: Error) => void }[] = [];
  window.studio = { ...window.studio, canvasFrameAttach: ({ nodeId }) => new Promise<Result>((resolve, reject) => {
    pending.push({ nodeId, resolve, reject });
  }) };
  return pending;
}

for (const eventOrder of ['before-reply', 'after-reply'] as const) it(`covers a frame refused for another project with the block event ${eventOrder} and recovers on its own new port`, async () => {
  seedFlags({ 'frame-covers': true });
  let blocked: Parameters<StudioBridge['onCanvasFrameBlocked']>[0] | undefined;
  window.studio = { ...window.studio, onCanvasFrameBlocked: listener => { blocked = listener; return () => { blocked = undefined; }; } };
  const pending = deferFrameAttachments();
  await mount();
  expect(guests).toHaveLength(0);
  if (eventOrder === 'before-reply') await act(async () => { blocked!({ nodeId: FRAME_ID, url: URL_A }); });
  await act(async () => { pending[0]!.resolve(null); });
  if (eventOrder === 'after-reply') await act(async () => { blocked!({ nodeId: FRAME_ID, url: URL_A }); });
  expect(container.querySelector('webview')).toBeNull();
  expect(container.querySelector('[data-server-cover="occupied"]')).not.toBeNull();
  expect(container.textContent).toContain('Port 3000 is in use');
  expect(container.textContent).not.toContain('Nothing is answering');
  await act(async () => {
    const state = useCanvasStore.getState();
    const doc = state.doc!;
    const frame = doc.nodes[FRAME_ID] as BrowserNode;
    state.replaceDoc({ ...doc, revision: doc.revision + 1, nodes: { ...doc.nodes, [FRAME_ID]: { ...frame, content: { homeUrl: 'http://localhost:4701/menu' } } } });
    expect(state.rehomeDeadFrame(FRAME_ID, 'http://localhost:4701/menu')).toBe(true);
  });
  expect(pending).toHaveLength(2);
  await act(async () => { pending[1]!.resolve({ url: 'about:blank#studio-frame-attach=own' }); });
  expect(container.querySelectorAll('webview')).toHaveLength(1);
  expect(guests.at(-1)!.element.getAttribute('src')).toBe('about:blank#studio-frame-attach=own');
});

it('keeps the measured occupied cover when an attachment block arrives after the server book', async () => {
  seedFlags({ 'frame-covers': true });
  let blocked: Parameters<StudioBridge['onCanvasFrameBlocked']>[0] | undefined;
  window.studio = { ...window.studio, onCanvasFrameBlocked: listener => { blocked = listener; return () => { blocked = undefined; }; } };
  const pending = deferFrameAttachments();
  await mount();
  await act(async () => {
    const state = useCanvasStore.getState();
    state.applyServerBook(state.serverEntries.map(entry => ({ ...entry, ports: entry.ports.map(port => ({ ...port, measured: 'stranger' as const })) })));
  });
  expect(container.querySelector('[data-server-cover="occupied"]')).not.toBeNull();
  await act(async () => { blocked!({ nodeId: FRAME_ID, url: URL_A }); });
  await act(async () => { pending[0]!.resolve(null); });
  expect(container.querySelector('[data-server-cover="occupied"]')).not.toBeNull();
  expect(container.querySelector('[data-server-cover="dead"]')).toBeNull();
  expect(container.querySelector('webview')).toBeNull();
});

for (const wasLive of [false, true]) it(`rechecks a refused port after the project server book changes without moving its saved address (was live: ${String(wasLive)})`, async () => {
  seedFlags({ 'frame-covers': true });
  let blocked: Parameters<StudioBridge['onCanvasFrameBlocked']>[0] | undefined;
  window.studio = { ...window.studio, onCanvasFrameBlocked: listener => { blocked = listener; return () => { blocked = undefined; }; } };
  const pending = deferFrameAttachments();
  await mount();
  if (wasLive) {
    await act(async () => { pending[0]!.resolve({ url: 'about:blank#studio-frame-attach=before-reuse' }); });
    await loaded(guests[0]!);
  }
  await act(async () => {
    blocked!({ nodeId: FRAME_ID, url: URL_A });
    pending[0]!.resolve(null);
  });
  expect(container.querySelector('[data-server-cover="occupied"]')).not.toBeNull();
  expect(container.querySelector('webview')).toBeNull();
  await act(async () => {
    const state = useCanvasStore.getState();
    state.applyServerBook(state.serverEntries.map(entry => ({ ...entry, ports: entry.ports.map(port => ({ ...port })) })));
  });
  expect(pending).toHaveLength(2);
  await act(async () => { pending[1]!.resolve({ url: 'about:blank#studio-frame-attach=restarted' }); });
  expect(container.querySelectorAll('webview')).toHaveLength(1);
  expect(container.querySelector('[data-server-cover="occupied"]')).toBeNull();
});

for (const replyOrder of ['retirement-before-echo', 'retirement-after-echo']) {
  it(`replaces a live initial redirect only after USER acceptance (${replyOrder})`, async () => {
    const initialDoc = useCanvasStore.getState().doc!;
    const sent: CanvasOpRequest[] = [];
    let onUpdate: ((update: CanvasUpdate) => void) | undefined;
    type Readiness = Awaited<ReturnType<StudioBridge['canvasFrameReady']>>;
    const replies: { id: number; resolve: (value: Readiness) => void }[] = [];
    window.studio = {
      ...window.studio,
      canvasSnapshot: async () => ({ doc: initialDoc }),
      canvasPageCameras: async () => ({ byPage: {} }),
      canvasOp: (request) => { sent.push(request); },
      canvasFrames: () => {},
      onCanvasUpdate: (listener) => { onUpdate = listener; return () => { onUpdate = undefined; }; },
      onCanvasRejected: () => () => {},
      onAgentWorkingFrames: () => () => {},
      onCanvasFrameQuotes: () => () => {},
      canvasFrameReady: ({ webContentsId }) => new Promise<Readiness>((resolve) => { replies.push({ id: webContentsId, resolve }); }),
    };
    const attachments = deferFrameAttachments();
    let disconnect: (() => void) | undefined;
    try {
      await act(async () => { disconnect = connectCanvas(); });
      await mount();
      await act(async () => { attachments[0]!.resolve({ url: 'about:blank#studio-frame-attach=initial-redirect' }); });
      const redirected = guests.at(-1)!;
      await loaded(redirected, 'http://localhost:3000/login');
      expect(useCanvasStore.getState().overlay[FRAME_ID]?.health).toBe('live');
      const stale = replies.splice(0);
      await act(async () => { for (const reply of stale) reply.resolve('pending'); });
      expect(attachments).toHaveLength(1);

      const destination = 'http://localhost:3000/corrected';
      await act(async () => { useCanvasStore.getState().commitAddress(FRAME_ID, destination); });
      const beforeEcho = replies.splice(0);
      expect(beforeEcho.length).toBeGreaterThan(0);
      if (replyOrder === 'retirement-before-echo') {
        await act(async () => { for (const reply of beforeEcho) reply.resolve('retired'); });
      }
      expect(attachments).toHaveLength(1);
      expect(container.querySelector('webview')).toBe(redirected.element);
      expect(sent).toEqual([{ docId: initialDoc.docId, op: { type: 'set-home-url', id: FRAME_ID, homeUrl: destination } }]);
      await act(async () => { onUpdate!({ docId: initialDoc.docId, entry: {
        revision: 2, author: 'user', at: '2026-10-31T00:00:00Z',
        op: { type: 'set-home-url', id: FRAME_ID, homeUrl: destination }, prior: { kind: 'none' },
      } }); });
      expect(attachments).toHaveLength(1);
      const accepted = replies.splice(0);
      expect(accepted.length).toBeGreaterThan(0);
      await act(async () => { for (const reply of accepted) reply.resolve('retired'); });
      expect(attachments).toHaveLength(2);
      expect(useCanvasStore.getState().overlay[FRAME_ID]?.mountUrl).toBe(destination);
      expect(useCanvasStore.getState().overlay[FRAME_ID]?.target).toBeUndefined();
      await act(async () => { attachments[1]!.resolve({ url: 'about:blank#studio-frame-attach=corrected' }); });
      const replacement = guests.at(-1)!;
      expect(replacement.element).not.toBe(redirected.element);
      await loaded(replacement, destination);
      const current = replies.splice(0);
      await act(async () => { for (const reply of current) reply.resolve('ready'); });
      if (replyOrder === 'retirement-after-echo') {
        await act(async () => { for (const reply of beforeEcho) reply.resolve('retired'); });
      }
      await act(async () => { redirected.element.dispatchEvent(new Event('dom-ready')); });
      expect(attachments).toHaveLength(2);
      expect(container.querySelector('webview')).toBe(replacement.element);
      const next = 'http://localhost:3000/next';
      await act(async () => { useCanvasStore.getState().retargetFrame(next, FRAME_ID); });
      expect(replacement.navigations).toEqual([next]);
      expect(redirected.navigations).toEqual([]);
    } finally {
      disconnect?.();
    }
  });
}

for (const [delivery, replyOrder, phase] of [
  ['direct', 'retirement-before-echo', 'live'],
  ['direct', 'retirement-after-echo', 'live'],
  ['gap', 'retirement-before-echo', 'live'],
  ['gap', 'retirement-after-echo', 'live'],
  ['direct', 'pending-forever', 'prelaunch'],
  ['gap', 'pending-forever', 'prelaunch'],
] as const) {
  it(`immediately replaces a ${phase} guest after trusted system port-follow acceptance (${delivery}, ${replyOrder})`, async () => {
    const initialDoc = useCanvasStore.getState().doc!;
    const initialFrame = initialDoc.nodes[FRAME_ID];
    if (initialFrame?.kind !== 'browser') throw new Error('missing browser frame');
    const sent: CanvasOpRequest[] = [];
    let onUpdate: ((update: CanvasUpdate) => void) | undefined;
    let snapshotRequests = 0;
    let pendingReadiness = 0;
    let answerSnapshot: ((doc: CanvasDoc) => void) | undefined;
    type Readiness = Awaited<ReturnType<StudioBridge['canvasFrameReady']>>;
    const replies: { id: number; resolve: (value: Readiness) => void }[] = [];
    window.studio = {
      ...window.studio,
      canvasSnapshot: () => {
        snapshotRequests += 1;
        return snapshotRequests === 1 ? Promise.resolve({ doc: initialDoc }) : new Promise<{ doc: CanvasDoc }>(resolve => {
          answerSnapshot = doc => resolve({ doc });
        });
      },
      canvasPageCameras: async () => ({ byPage: {} }),
      canvasOp: (request) => { sent.push(request); },
      canvasUndo: () => {},
      canvasRedo: () => {},
      canvasViewport: () => {},
      canvasCurrentPage: () => {},
      canvasFrames: () => {},
      onCanvasUpdate: (listener) => { onUpdate = listener; return () => { onUpdate = undefined; }; },
      onCanvasRejected: () => () => {},
      onAgentWorkingFrames: () => () => {},
      onCanvasFrameQuotes: () => () => {},
      canvasFrameReady: ({ webContentsId }) => {
        if (phase === 'prelaunch' && webContentsId === 1) {
          pendingReadiness += 1;
          return Promise.resolve('pending' as const);
        }
        return new Promise<Readiness>((resolve) => { replies.push({ id: webContentsId, resolve }); });
      },
    };
    const attachments = deferFrameAttachments();
    let disconnect: (() => void) | undefined;
    try {
      await act(async () => { disconnect = connectCanvas(); });
      await mount();
      await act(async () => { attachments[0]!.resolve({ url: 'about:blank#studio-frame-attach=starter' }); });
      const original = guests.at(-1)!;
      await loaded(original, phase === 'prelaunch' ? original.element.getAttribute('src')! : URL_A);
      expect(useCanvasStore.getState().overlay[FRAME_ID]?.health).toBe(phase === 'prelaunch' ? 'loading' : 'live');
      const beforeEcho = replies.splice(0);
      if (phase === 'prelaunch') expect(pendingReadiness).toBeGreaterThan(0);
      else expect(beforeEcho.length).toBeGreaterThan(0);
      if (replyOrder === 'retirement-before-echo') {
        await act(async () => { for (const reply of beforeEcho) reply.resolve('retired'); });
      }
      expect(attachments).toHaveLength(1);
      expect(container.querySelector('webview')).toBe(original.element);

      const destination = 'http://localhost:4000/a';
      const revision = initialDoc.revision + (delivery === 'gap' ? 2 : 1);
      await act(async () => { onUpdate!({ docId: initialDoc.docId, entry: {
        revision, author: 'system', at: '2026-11-20T00:00:00Z',
        op: { type: 'set-home-url', id: FRAME_ID, homeUrl: destination }, prior: { kind: 'none' },
      } }); });
      if (delivery === 'gap') {
        expect(snapshotRequests).toBe(2);
        expect(answerSnapshot).toBeDefined();
        expect(attachments).toHaveLength(1);
        expect(useCanvasStore.getState().overlay[FRAME_ID]?.acceptedTarget).toBeUndefined();
        await act(async () => { answerSnapshot!({
          ...initialDoc, revision,
          nodes: { ...initialDoc.nodes, [FRAME_ID]: { ...initialFrame, content: { ...initialFrame.content, homeUrl: destination } } },
        }); });
      } else {
        expect(snapshotRequests).toBe(1);
      }
      expect(attachments).toHaveLength(2);
      expect(useCanvasStore.getState().overlay[FRAME_ID]?.mountUrl).toBe(destination);
      expect(useCanvasStore.getState().overlay[FRAME_ID]?.target).toBeUndefined();
      await act(async () => { attachments[1]!.resolve({ url: 'about:blank#studio-frame-attach=port-follow' }); });
      const replacement = guests.at(-1)!;
      expect(replacement.element).not.toBe(original.element);
      await loaded(replacement, destination);
      const current = replies.splice(0);
      expect(current.some(reply => reply.id === 2)).toBe(true);
      await act(async () => { for (const reply of current) reply.resolve('ready'); });
      if (replyOrder === 'retirement-after-echo') {
        await act(async () => { for (const reply of beforeEcho) reply.resolve('retired'); });
      }
      await act(async () => { original.element.dispatchEvent(new Event('dom-ready')); });
      expect(attachments).toHaveLength(2);
      expect(container.querySelector('webview')).toBe(replacement.element);
      expect(useCanvasStore.getState().overlay[FRAME_ID]?.currentUrl).toBe(destination);
      expect(useCanvasStore.getState().overlay[FRAME_ID]?.health).toBe('live');
      expect(original.navigations).toEqual([]);
      expect(sent).toEqual([]);
    } finally {
      disconnect?.();
    }
  });
}

for (const scenario of ['superseding-destination', 'concurrent-local-target', 'concurrent-distinct-local-target', 'agent-gap'] as const) {
  it(`does not accept an unproven port-follow target from a gap snapshot (${scenario})`, async () => {
    const initialDoc = useCanvasStore.getState().doc!;
    const initialFrame = initialDoc.nodes[FRAME_ID];
    if (initialFrame?.kind !== 'browser') throw new Error('missing browser frame');
    const destination = 'http://localhost:4000/a';
    const snapshotDestination = scenario === 'superseding-destination' ? 'http://localhost:5000/a' : destination;
    const concurrent = scenario === 'concurrent-local-target' || scenario === 'concurrent-distinct-local-target';
    const localDestination = scenario === 'concurrent-distinct-local-target' ? 'http://localhost:6000/local' : destination;
    const revision = initialDoc.revision + 2;
    const sent: CanvasOpRequest[] = [];
    let onUpdate: ((update: CanvasUpdate) => void) | undefined;
    let snapshotRequests = 0;
    let answerSnapshot: ((doc: CanvasDoc) => void) | undefined;
    type Readiness = Awaited<ReturnType<StudioBridge['canvasFrameReady']>>;
    const replies: { resolve: (value: Readiness) => void }[] = [];
    window.studio = {
      ...window.studio,
      canvasSnapshot: () => {
        snapshotRequests += 1;
        return snapshotRequests === 1 ? Promise.resolve({ doc: initialDoc }) : new Promise<{ doc: CanvasDoc }>(resolve => {
          answerSnapshot = doc => resolve({ doc });
        });
      },
      canvasPageCameras: async () => ({ byPage: {} }),
      canvasOp: (request) => { sent.push(request); },
      canvasUndo: () => {},
      canvasRedo: () => {},
      canvasViewport: () => {},
      canvasCurrentPage: () => {},
      canvasFrames: () => {},
      onCanvasUpdate: (listener) => { onUpdate = listener; return () => { onUpdate = undefined; }; },
      onCanvasRejected: () => () => {},
      onAgentWorkingFrames: () => () => {},
      onCanvasFrameQuotes: () => () => {},
      canvasFrameReady: () => new Promise<Readiness>(resolve => { replies.push({ resolve }); }),
    };
    const attachments = deferFrameAttachments();
    let disconnect: (() => void) | undefined;
    try {
      await act(async () => { disconnect = connectCanvas(); });
      await mount();
      await act(async () => { attachments[0]!.resolve({ url: 'about:blank#studio-frame-attach=gap-safety' }); });
      const original = guests.at(-1)!;
      await loaded(original, URL_A);
      const initialReplies = replies.splice(0);
      await act(async () => { for (const reply of initialReplies) reply.resolve('pending'); });
      if (concurrent) {
        await act(async () => { useCanvasStore.getState().retargetFrame(destination, FRAME_ID); });
        const queuedReplies = replies.splice(0);
        await act(async () => { for (const reply of queuedReplies) reply.resolve('pending'); });
      }
      const capturedTarget = useCanvasStore.getState().overlay[FRAME_ID]?.target;
      if (concurrent) expect(capturedTarget?.url).toBe(destination);
      let localTarget: typeof capturedTarget;
      await act(async () => { onUpdate!({ docId: initialDoc.docId, entry: {
        revision, author: scenario === 'agent-gap' ? 'agent' : 'system', at: '2026-11-20T00:00:00Z',
        op: { type: 'set-home-url', id: FRAME_ID, homeUrl: destination }, prior: { kind: 'none' },
      } }); });
      expect(snapshotRequests).toBe(2);
      expect(answerSnapshot).toBeDefined();
      if (concurrent) {
        await act(async () => { useCanvasStore.getState().retargetFrame(localDestination, FRAME_ID); });
        localTarget = useCanvasStore.getState().overlay[FRAME_ID]?.target;
        expect(localTarget?.url).toBe(localDestination);
        if (scenario === 'concurrent-local-target') expect(localTarget?.url).toBe(capturedTarget?.url);
        else expect(localTarget?.url).not.toBe(capturedTarget?.url);
        expect(localTarget).not.toBe(capturedTarget);
      }
      expect(attachments).toHaveLength(1);
      expect(useCanvasStore.getState().overlay[FRAME_ID]?.acceptedTarget).toBeUndefined();
      await act(async () => { answerSnapshot!({
        ...initialDoc, revision,
        nodes: { ...initialDoc.nodes, [FRAME_ID]: { ...initialFrame, content: { ...initialFrame.content, homeUrl: snapshotDestination } } },
      }); });
      expect(useCanvasStore.getState().doc?.revision).toBe(revision);
      expect(useCanvasStore.getState().doc?.nodes[FRAME_ID]).toMatchObject({ kind: 'browser', content: { homeUrl: snapshotDestination } });
      if (concurrent) {
        expect(useCanvasStore.getState().overlay[FRAME_ID]?.target).toBe(localTarget);
        expect(useCanvasStore.getState().overlay[FRAME_ID]?.target?.url).toBe(localDestination);
      } else {
        expect(useCanvasStore.getState().overlay[FRAME_ID]?.target?.url).toBe(snapshotDestination);
      }
      expect(useCanvasStore.getState().overlay[FRAME_ID]?.acceptedTarget).toBeUndefined();
      const current = replies.splice(0);
      expect(current.length).toBeGreaterThan(0);
      await act(async () => { for (const reply of current) reply.resolve('retired'); });
      expect(attachments).toHaveLength(1);
      expect(container.querySelector('webview')).toBe(original.element);
      expect(original.navigations).toEqual([]);
      expect(sent).toEqual([]);
    } finally {
      disconnect?.();
    }
  });
}

for (const readiness of ['pending', 'ready'] as const) {
  it(`does not remount an accepted address while native binding is ${readiness}`, async () => {
    const pending = deferFrameAttachments();
    window.studio = { ...window.studio, canvasFrameReady: async () => readiness };
    await mount();
    await act(async () => { pending[0]!.resolve({ url: 'about:blank#studio-frame-attach=ordinary' }); });
    const original = guests.at(-1)!;
    await loaded(original, URL_A);
    await act(async () => {
      const state = useCanvasStore.getState();
      const doc = state.doc!;
      const frame = doc.nodes[FRAME_ID];
      if (frame?.kind !== 'browser') throw new Error('missing browser frame');
      useCanvasStore.setState({ doc: { ...doc, revision: 2, nodes: { ...doc.nodes, [FRAME_ID]: { ...frame, content: { homeUrl: 'http://localhost:3000/next' } } } } });
      useCanvasStore.getState().retargetFrame('http://localhost:3000/next', FRAME_ID);
      useCanvasStore.getState().noteAddressAccepted(FRAME_ID, 'http://localhost:3000/next');
    });
    expect(pending).toHaveLength(1);
    expect(container.querySelector('webview')).toBe(original.element);
  });
}

for (const destination of ['http://localhost:3000/a', 'https://localhost:3000/a']) {
  it(`renews the attachment after a failed HTTPS refresh and accepted address ${destination}`, async () => {
    const initialUrl = 'https://localhost:3000/a';
    const doc = useCanvasStore.getState().doc!;
    const frame = doc.nodes[FRAME_ID];
    if (frame?.kind !== 'browser') throw new Error('missing browser frame');
    const initialFrame = { ...frame, content: { homeUrl: initialUrl } };
    const initialDoc = { ...doc, nodes: { ...doc.nodes, [FRAME_ID]: initialFrame } };
    useCanvasStore.setState({ doc: initialDoc, overlay: { [FRAME_ID]: defaultOverlay(initialFrame) } });
    useCanvasStore.getState().patchFrame(FRAME_ID, { health: 'loading' });
    const sent: CanvasOpRequest[] = [];
    let onUpdate: ((update: CanvasUpdate) => void) | undefined;
    window.studio = {
      ...window.studio,
      canvasSnapshot: async () => ({ doc: initialDoc }),
      canvasPageCameras: async () => ({ byPage: {} }),
      canvasOp: (request) => { sent.push(request); },
      canvasFrames: () => {},
      onCanvasUpdate: (listener) => { onUpdate = listener; return () => { onUpdate = undefined; }; },
      onCanvasRejected: () => () => {},
      onAgentWorkingFrames: () => () => {},
      onCanvasFrameQuotes: () => () => {},
    };
    const pending = deferFrameAttachments();
    let disconnect: (() => void) | undefined;
    try {
      await act(async () => { disconnect = connectCanvas(); });
      await mount();
      expect(pending).toHaveLength(1);
      await act(async () => { pending[0]!.resolve({ url: 'about:blank#studio-frame-attach=failed-https' }); });
      const original = guests.at(-1)!;
      await act(async () => {
        original.element.dispatchEvent(Object.assign(new Event('did-fail-load'), {
          errorCode: -107, isMainFrame: true, validatedURL: initialUrl, errorDescription: 'SSL protocol error',
        }));
      });
      expect(useCanvasStore.getState().overlay[FRAME_ID]?.health).toBe('unreachable');

      await act(async () => {
        [...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Refresh fixture')!.click();
      });
      expect(pending).toHaveLength(2);
      await act(async () => { pending[1]!.resolve({ url: 'about:blank#studio-frame-attach=failed-refresh' }); });
      const refreshed = guests.at(-1)!;
      expect(refreshed.element).not.toBe(original.element);
      await act(async () => {
        refreshed.element.dispatchEvent(Object.assign(new Event('did-fail-load'), {
          errorCode: -107, isMainFrame: true, validatedURL: initialUrl, errorDescription: 'SSL protocol error',
        }));
      });
      expect(useCanvasStore.getState().overlay[FRAME_ID]?.health).toBe('unreachable');
      const epoch = useCanvasStore.getState().overlay[FRAME_ID]?.guestEpoch ?? 0;

      await act(async () => { useCanvasStore.getState().commitAddress(FRAME_ID, destination); });
      expect(sent).toEqual([{ docId: doc.docId, op: { type: 'set-home-url', id: FRAME_ID, homeUrl: destination } }]);
      expect(pending).toHaveLength(2);
      expect(container.querySelector('webview')).toBe(refreshed.element);
      expect(useCanvasStore.getState().overlay[FRAME_ID]?.mountUrl).toBe(initialUrl);
      expect(useCanvasStore.getState().nodes[0]!.data.guestEpoch).toBe(epoch);

      await act(async () => {
        onUpdate!({ docId: doc.docId, entry: {
          revision: 2, author: 'user', at: '2026-10-31T00:00:00Z',
          op: { type: 'set-home-url', id: FRAME_ID, homeUrl: destination }, prior: { kind: 'none' },
        } });
      });
      expect(useCanvasStore.getState().nodes[0]!.data.guestEpoch).toBe(epoch + 1);
      expect(useCanvasStore.getState().overlay[FRAME_ID]?.mountUrl).toBe(destination);
      expect(useCanvasStore.getState().overlay[FRAME_ID]?.target).toBeUndefined();
      expect(pending).toHaveLength(3);
      expect(container.querySelector('webview')).toBeNull();

      const recoveredLease = 'about:blank#studio-frame-attach=accepted-address';
      await act(async () => { pending[2]!.resolve({ url: recoveredLease }); });
      const recovered = guests.at(-1)!;
      expect(recovered.element).not.toBe(refreshed.element);
      expect(recovered.element.getAttribute('src')).toBe(recoveredLease);
      await loaded(recovered, destination);
      expect(recovered.navigations).toEqual([]);
      await act(async () => {
        refreshed.url = 'http://localhost:3000/stale';
        refreshed.element.dispatchEvent(new Event('did-navigate'));
        refreshed.element.dispatchEvent(Object.assign(new Event('did-fail-load'), {
          errorCode: -107, isMainFrame: true, validatedURL: initialUrl, errorDescription: 'stale failure',
        }));
      });
      expect(useCanvasStore.getState().overlay[FRAME_ID]).toMatchObject({ currentUrl: destination, health: 'live' });
      expect(container.querySelector('webview')).toBe(recovered.element);
      expect(pending).toHaveLength(3);
    } finally {
      disconnect?.();
    }
  });
}

it('mounts a leased guest after attachment and restores listeners without reviving a stale refresh', async () => {
  const pending = deferFrameAttachments();
  const attached = spyOn(frameFacts, 'noteGuestAttached');
  const gone = spyOn(frameFacts, 'noteGuestGone');
  try {
    await mount();
    expect(pending.map(({ nodeId }) => nodeId)).toEqual([FRAME_ID]);
    expect(container.querySelector('webview')).toBeNull();
    expect(guests).toHaveLength(0);
    expect(attached).not.toHaveBeenCalled();

    const initialLease = 'about:blank#studio-frame-attach=initial';
    await act(async () => { pending[0]!.resolve({ url: initialLease }); });
    const original = guests.at(-1)!;
    expect(original.element.getAttribute('src')).toBe(initialLease);
    expect(attached).not.toHaveBeenCalled();
    await loaded(original, URL_A);
    expect(attached).toHaveBeenLastCalledWith(FRAME_ID, 1);
    expect(useCanvasStore.getState().overlay[FRAME_ID]?.health).toBe('live');
    expect(original.messages.some((message) => message.type === 'arm')).toBe(true);
    await act(async () => {
      original.url = URL_B;
      original.element.dispatchEvent(new Event('did-navigate'));
    });
    expect(useCanvasStore.getState().overlay[FRAME_ID]?.currentUrl).toBe(URL_B);

    await act(async () => {
      [...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Refresh fixture')!.click();
    });
    expect(pending.map(({ nodeId }) => nodeId)).toEqual([FRAME_ID, FRAME_ID]);
    expect(container.querySelector('webview')).toBeNull();
    expect(gone).toHaveBeenLastCalledWith(FRAME_ID);
    await discard(true);
    expect(pending).toHaveLength(2);
    expect(acknowledgements.at(-1)).toEqual({ request: 1, guests: 0 });
    await discard(false);
    expect(pending.map(({ nodeId }) => nodeId)).toEqual([FRAME_ID, FRAME_ID, FRAME_ID]);
    expect(container.querySelector('webview')).toBeNull();
    expect(acknowledgements.at(-1)).toEqual({ request: 2, guests: 0 });

    const restoredLease = 'about:blank#studio-frame-attach=restored';
    await act(async () => { pending[2]!.resolve({ url: restoredLease }); });
    const restored = guests.at(-1)!;
    expect(restored.element).not.toBe(original.element);
    expect(restored.element.getAttribute('src')).toBe(restoredLease);
    await loaded(restored, URL_B);
    expect(attached).toHaveBeenLastCalledWith(FRAME_ID, 2);
    expect(restored.messages.some((message) => message.type === 'arm')).toBe(true);
    expect(restored.messages.some((message) => message.type === 'seedSelections')).toBe(true);
    const publications = attached.mock.calls.length;
    const retirements = gone.mock.calls.length;
    await act(async () => {
      pending[1]!.resolve({ url: 'about:blank#studio-frame-attach=stale-refresh' });
      original.url = 'http://localhost:3000/stale';
      original.element.dispatchEvent(new Event('dom-ready'));
      original.element.dispatchEvent(new Event('did-navigate'));
      original.element.dispatchEvent(new Event('destroyed'));
    });
    expect(guests).toHaveLength(2);
    expect(container.querySelector('webview')).toBe(restored.element);
    expect(attached.mock.calls.length).toBe(publications);
    expect(gone.mock.calls.length).toBe(retirements);
    expect(useCanvasStore.getState().overlay[FRAME_ID]).toMatchObject({ currentUrl: URL_B, health: 'live' });
    await act(async () => {
      restored.url = URL_A;
      restored.element.dispatchEvent(new Event('did-navigate'));
    });
    expect(useCanvasStore.getState().overlay[FRAME_ID]?.currentUrl).toBe(URL_A);
    await act(async () => {
      restored.element.dispatchEvent(Object.assign(new Event('did-fail-load'), { errorCode: -102, isMainFrame: true, validatedURL: URL_A, errorDescription: 'refused' }));
    });
    expect(useCanvasStore.getState().overlay[FRAME_ID]?.health).toBe('unreachable');
  } finally {
    attached.mockRestore();
    gone.mockRestore();
  }
});

for (const refusal of ['null', 'rejected'] as const) it(`falls back to the saved Frame URL after an ordinary ${refusal} attachment response`, async () => {
  seedFlags({ 'frame-covers': true });
  const pending = deferFrameAttachments();
  await mount();
  expect(container.querySelector('webview')).toBeNull();
  expect(pending.map(({ nodeId }) => nodeId)).toEqual([FRAME_ID]);
  await act(async () => {
    if (refusal === 'null') pending[0]!.resolve(null);
    else pending[0]!.reject(new Error('attachment refused'));
  });
  expect(guests).toHaveLength(1);
  expect(container.querySelector('webview')?.getAttribute('src')).toBe(URL_A);
  expect(container.querySelector('[data-server-cover="occupied"]')).toBeNull();
});

it('navigates recovery to failed B after a deferred replacement lease initially loads current A', async () => {
  useCanvasStore.setState({ serverEntries: [] });
  useServerStore.setState({ entries: [], pending: false });
  const pending = deferFrameAttachments();
  await mount();
  await act(async () => { pending[0]!.resolve({ url: 'about:blank#studio-frame-attach=recovery-original' }); });
  const original = guests.at(-1)!;
  await loaded(original, URL_A);
  await act(async () => {
    original.element.dispatchEvent(new Event('did-start-loading'));
    original.element.dispatchEvent(Object.assign(new Event('did-fail-load'), { errorCode: -102, isMainFrame: true, validatedURL: URL_B, errorDescription: 'refused' }));
    original.element.dispatchEvent(new Event('did-stop-loading'));
  });
  expect(useCanvasStore.getState().overlay[FRAME_ID]).toMatchObject({ currentUrl: URL_A, loadFailure: { url: URL_B } });
  const recovery = container.querySelector('[data-testid="frame-recovery"]');
  expect(recovery).not.toBeNull();
  expect(recovery!.textContent).toContain('localhost:3000/b');
  const restart = [...recovery!.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Restart')!;
  expect(restart).toBeDefined();
  await act(async () => { restart.click(); });
  expect(container.querySelector('webview')).toBeNull();
  expect(pending.map(({ nodeId }) => nodeId)).toEqual([FRAME_ID, FRAME_ID]);
  const replacementLease = 'about:blank#studio-frame-attach=recovery-current-a';
  await act(async () => { pending[1]!.resolve({ url: replacementLease }); });
  const recovered = guests.at(-1)!;
  expect(recovered.element).not.toBe(original.element);
  expect(recovered.element.getAttribute('src')).toBe(replacementLease);
  expect(recovered.navigations).toEqual([]);
  await loaded(recovered, URL_A);
  expect(recovered.navigations).toEqual([URL_B]);
  expect(recovered.url).toBe(URL_B);
  expect(original.navigations).toEqual([]);
  expect(useCanvasStore.getState().overlay[FRAME_ID]).toMatchObject({ currentUrl: URL_B, health: 'live' });
});

it('restores load and navigation listeners on replacement guests and ignores the retired guest', async () => {
  const original = await mount();
  await loaded(original);
  expect(useCanvasStore.getState().overlay[FRAME_ID]?.health).toBe('live');
  await discard(true);
  expect(acknowledgements.at(-1)).toEqual({ request: 1, guests: 0 });
  expect(useCanvasStore.getState().overlay[FRAME_ID]?.health).toBe('loading');
  const discardedEpoch = useTabFrames.getState().epoch;
  await discard(false);
  const restored = guests.at(-1)!;
  expect(restored.element).not.toBe(original.element);
  expect(useTabFrames.getState().epoch).toBeGreaterThan(discardedEpoch);
  await loaded(restored);
  expect(useCanvasStore.getState().overlay[FRAME_ID]?.health).toBe('live');
  await act(async () => {
    restored.url = URL_B;
    restored.element.dispatchEvent(new Event('did-navigate'));
    original.url = 'http://localhost:3000/stale';
    original.element.dispatchEvent(new Event('did-navigate'));
  });
  expect(useCanvasStore.getState().overlay[FRAME_ID]).toMatchObject({ currentUrl: URL_B, title: URL_B, canGoBack: true });
  await act(async () => { restored.element.dispatchEvent(Object.assign(new Event('did-fail-load'), { errorCode: -102, isMainFrame: true, validatedURL: URL_B, errorDescription: 'refused' })); });
  expect(useCanvasStore.getState().overlay[FRAME_ID]?.health).toBe('unreachable');
});

it('reseeds the replacement picker and accepts its picked element', async () => {
  const original = await mount();
  await loaded(original);
  await discard(true);
  await discard(false);
  const restored = guests.at(-1)!;
  await loaded(restored);
  const arm = restored.messages.filter((message) => message.type === 'arm').at(-1);
  expect(arm).toBeDefined();
  expect(restored.messages.some((message) => message.type === 'seedSelections')).toBe(true);
  await act(async () => {
    useCanvasStore.getState().selectFrame(FRAME_ID, false);
  });
  await act(async () => {
    container.querySelector('[data-testid="frame-shield"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 24, clientY: 30 }));
  });
  expect(restored.messages.filter((message) => message.type === 'pickAt').at(-1)).toMatchObject({ type: 'pickAt', point: { x: 24, y: 30 }, shiftHeld: false, generation: arm!.generation });
  const evidence = { kind: 'element' as const, id: 'picked-after-idle', tag: 'button', domPath: 'html > body > button', outerHtmlSnippet: '<button>Buy</button>', textContent: 'Buy', classes: [], frameUrl: URL_A };
  await act(async () => {
    restored.element.dispatchEvent(Object.assign(new Event('ipc-message'), { channel: GUEST_CHANNEL_TO_HOST, args: [{ type: 'picked', evidence, shiftHeld: false, generation: arm!.generation }] }));
  });
  expect(useCanvasStore.getState().elementSelections).toEqual([{ evidence, frameNodeId: FRAME_ID, stale: false }]);
});

it('restores route B rather than the URL remembered by an earlier refresh at A', async () => {
  await loaded(await mount());
  await act(async () => { container.querySelector('button')!.click(); });
  const refreshed = guests.at(-1)!;
  expect(refreshed.element.getAttribute('src')).toBe(URL_A);
  await loaded(refreshed);
  await act(async () => { refreshed.url = URL_B; refreshed.element.dispatchEvent(new Event('did-navigate')); });
  expect(useCanvasStore.getState().overlay[FRAME_ID]?.currentUrl).toBe(URL_B);
  await discard(true);
  expect(useCanvasStore.getState().overlay[FRAME_ID]?.mountUrl).toBe(URL_B);
  await discard(false);
  const restored = guests.at(-1)!;
  expect(restored.element.getAttribute('src')).toBe(URL_B);
  const epoch = useTabFrames.getState().epoch;
  await discard(false);
  expect(useTabFrames.getState().epoch).toBe(epoch);
  expect(guests.at(-1)?.element).toBe(restored.element);
});

it('flies an arriving inspiration Frame without its page and mounts the page when it lands', async () => {
  useCanvasStore.getState().beginInspiration(FRAME_ID);
  root = createRoot(container);
  await act(async () => { root!.render(<ReactFlowProvider><Surface /></ReactFlowProvider>); });
  expect(container.querySelectorAll('webview')).toHaveLength(0);
  await act(async () => { useCanvasStore.getState().endInspiration(FRAME_ID); });
  expect(container.querySelectorAll('webview')).toHaveLength(1);
  expect(guests.at(-1)!.element.getAttribute('src')).toBe(URL_A);
});

it('keeps later navigation when Pages remount a previously discarded Frame', async () => {
  const original = await mount();
  await loaded(original);
  await discard(true);
  await discard(false);
  const restored = guests.at(-1)!;
  await loaded(restored);
  await act(async () => { restored.url = URL_B; restored.element.dispatchEvent(new Event('did-navigate')); });
  await act(async () => { useCanvasStore.getState().setCurrentPage('pg_other', 'click'); });
  await act(async () => { useCanvasStore.getState().setCurrentPage('pg_main', 'click'); });
  expect(guests.at(-1)!.element.getAttribute('src')).toBe(URL_B);
});

it('uses a moved server origin after rehoming a previously discarded Frame', async () => {
  await loaded(await mount());
  await discard(true);
  await discard(false);
  await loaded(guests.at(-1)!);
  const moved = 'http://localhost:3001/a';
  await act(async () => { useCanvasStore.getState().patchFrame(FRAME_ID, { health: 'unreachable' }); });
  await act(async () => { expect(useCanvasStore.getState().rehomeDeadFrame(FRAME_ID, moved)).toBe(true); });
  expect(guests.at(-1)!.element.getAttribute('src')).toBe(moved);
});

for (const withRunControl of [true, false]) it(`puts working recovery controls above the Design shield when the measured server dies (run control: ${String(withRunControl)})`, async () => {
  let canvasClicks = 0;
  await loaded(await mount(() => { canvasClicks += 1; }, withRunControl));
  const entries = useCanvasStore.getState().serverEntries.map((entry) => ({ ...entry, status: 'stopped' as const, ports: entry.ports.map((port) => ({ ...port, measured: 'dead' as const })) }));
  const intents: unknown[] = [];
  window.studio = { ...window.studio, telemetryEvent: () => {}, serverIntent: (intent) => { intents.push(intent); } };
  useServerStore.setState({ entries, pending: false });
  await act(async () => useCanvasStore.getState().applyServerBook(entries));
  expect(container.querySelector('webview')).toBeNull();
  const recovery = container.querySelector('[data-testid="frame-recovery"]')!;
  expect(recovery.textContent).toContain('Ask the agent to fix it');
  const restart = [...recovery.querySelectorAll('button')].find((button) => button.textContent === 'Restart')!;
  expect(useCanvasStore.getState().selectedNodeIds).toEqual([]);
  await pressRecoveryAction(restart);
  expect(intents).toEqual([{ press: 'start', entryIds: ['server'] }]);
  expect(canvasClicks).toBe(0);
  expect(useCanvasStore.getState().selectedNodeIds).toEqual([]);
  await act(async () => {
    useServerStore.setState({ entries: [], pending: false });
  });
});

it('with frame covers on, a stopped server’s cover restarts it and names the press', async () => {
  seedFlags({ 'frame-covers': true });
  try {
    let canvasClicks = 0;
    await loaded(await mount(() => { canvasClicks += 1; }));
    const entries = useCanvasStore.getState().serverEntries.map((entry) => ({ ...entry, status: 'stopped' as const, ports: entry.ports.map((port) => ({ ...port, measured: 'dead' as const })) }));
    const intents: unknown[] = [];
    const pressed: unknown[] = [];
    window.studio = { ...window.studio, telemetryEvent: (event) => { pressed.push(event); }, serverIntent: (intent) => { intents.push(intent); } };
    useServerStore.setState({ entries, pending: false });
    await act(async () => useCanvasStore.getState().applyServerBook(entries));
    expect(container.querySelector('webview')).toBeNull();
    expect(container.querySelector('[data-testid="frame-recovery"]')).toBeNull();
    const cover = container.querySelector('[data-testid="frame-cover"]')!;
    expect(cover.getAttribute('data-cover')).toBe('stopped');
    expect(useCanvasStore.getState().selectedNodeIds).toEqual([]);
    await pressRecoveryAction(cover.querySelector<HTMLButtonElement>('[data-action="restart"]')!);
    expect(intents).toEqual([{ press: 'start', entryIds: ['server'] }]);
    expect(canvasClicks).toBe(0);
    expect(useCanvasStore.getState().selectedNodeIds).toEqual([]);
    expect(pressed).toEqual([{ event: 'preview_recovery_pressed', properties: { action: 'restart' } }]);
  } finally {
    await act(async () => {
      seedFlags();
      useServerStore.setState({ entries: [], pending: false });
    });
  }
});

it('keeps a saved setup pending cover present from minimum to maximum canvas zoom', async () => {
  seedFlags({ 'frame-covers': true });
  publishSetupTurn(undefined);
  try {
    await loaded(await mount());
    const entries = useCanvasStore.getState().serverEntries.map((entry) => ({ ...entry, status: 'stopped' as const, ports: entry.ports.map((port) => ({ ...port, measured: 'dead' as const })) }));
    useServerStore.setState({ entries, pending: false });
    await act(async () => useCanvasStore.getState().applyServerBook(entries));
    for (const state of ['preparing', 'installing', 'starting'] as const) {
      await act(async () => {
        useProjectSetupStore.setState({ read: { kind: 'ready', snapshot: {
          saved: { revision: 'r1', definition: { prepare: '', install: { script: '', inputs: [], outputs: [] }, servers: [{ id: 'web', cwd: '.', start: 'npm run dev', port: 3000 }] } },
          verified: null, state, failure: null,
        } } });
      });
      for (const zoom of [0.05, 0.1, 0.25, 0.5, 1, 2, 4]) {
        await act(async () => { flowStore.setState({ transform: [0, 0, zoom] }); });
        const cover = container.querySelector('[data-testid="frame-cover"]')!;
        expect(cover.getAttribute('data-cover')).toBe('studio-starting');
        expect(cover.querySelector('[data-action]')).toBeNull();
        const band = cover.getAttribute('data-band');
        expect(cover.querySelector(band === 'art' || band === 'title' ? '[data-testid="frame-cover-mark"]' : '[data-breathing]')).not.toBeNull();
      }
    }
  } finally {
    await act(async () => { seedFlags(); });
  }
});

it('with frame covers on, the ask sends the person’s words and hides what Studio knows in the context', async () => {
  seedFlags({ 'frame-covers': true });
  const requests: { text: string; context?: string }[] = [];
  try {
    await loaded(await mount());
    const entries = useCanvasStore.getState().serverEntries.map((entry) => ({ ...entry, status: 'stopped' as const, ports: entry.ports.map((port) => ({ ...port, measured: 'dead' as const })) }));
    window.studio = { ...window.studio, telemetryEvent: () => {}, serverIntent: () => {} };
    await act(async () => useAgentStore.setState({ hasSession: true, connection: { status: 'ok' } }));
    unregisterChat = registerChatSubmit({ submit: async (request) => {
      requests.push({ text: request.text, ...(request.context === undefined ? {} : { context: request.context }) });
      return { outcome: 'accepted', held: false, submitted: { text: request.text, attachments: [], context: '', images: [], evidence: [] } };
    } });
    useServerStore.setState({ entries, pending: false });
    await act(async () => useCanvasStore.getState().applyServerBook(entries));
    const cover = container.querySelector('[data-testid="frame-cover"]')!;
    await act(async () => {
      cover.querySelector<HTMLButtonElement>('[data-action="ask-agent"]')!.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]!.text).not.toContain(URL_A);
    expect(requests[0]!.context).toContain(URL_A);
  } finally {
    await act(async () => {
      seedFlags();
      useServerStore.setState({ entries: [], pending: false });
    });
  }
});

it('with frame covers on, a refused ask says so on the cover until the next press', async () => {
  seedFlags({ 'frame-covers': true });
  let outcome: 'rejected' | 'accepted' = 'rejected';
  try {
    await loaded(await mount());
    const entries = useCanvasStore.getState().serverEntries.map((entry) => ({ ...entry, status: 'stopped' as const, ports: entry.ports.map((port) => ({ ...port, measured: 'dead' as const })) }));
    window.studio = { ...window.studio, telemetryEvent: () => {}, serverIntent: () => {} };
    await act(async () => useAgentStore.setState({ hasSession: true, connection: { status: 'ok' } }));
    unregisterChat = registerChatSubmit({ submit: async (request) => outcome === 'rejected'
      ? { outcome: 'rejected' }
      : { outcome: 'accepted', held: false, submitted: { text: request.text, attachments: [], context: '', images: [], evidence: [] } } });
    useServerStore.setState({ entries, pending: false });
    await act(async () => useCanvasStore.getState().applyServerBook(entries));
    const cover = () => container.querySelector('[data-testid="frame-cover"]')!;
    const ask = async () => act(async () => {
      cover().querySelector<HTMLButtonElement>('[data-action="ask-agent"]')!.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(cover().querySelector('[role="alert"]')).toBeNull();
    await ask();
    expect(cover().querySelector('[role="alert"]')).not.toBeNull();
    outcome = 'accepted';
    await ask();
    expect(cover().querySelector('[role="alert"]')).toBeNull();
  } finally {
    await act(async () => {
      seedFlags();
      useServerStore.setState({ entries: [], pending: false });
    });
  }
});

it('covers startup with a neutral loading surface until the new guest is live', async () => {
  await loaded(await mount());
  const starting = useCanvasStore.getState().serverEntries.map((entry) => ({ ...entry, status: 'starting' as const, ports: entry.ports.map((port) => ({ ...port, measured: 'dead' as const })) }));
  await act(async () => {
    useServerStore.setState({ entries: starting, pending: true });
    useCanvasStore.getState().applyServerBook(starting);
  });
  expect(container.querySelector('webview')).toBeNull();
  expect(container.querySelector('[data-testid="frame-recovery"]')).toBeNull();
  expect(container.querySelector('[data-testid="frame-loading"]')?.textContent).toBe('Starting your app');
  expect(container.querySelector('[data-testid="frame-loading"] .frame-loading-glyph svg')).not.toBeNull();
  expect(container.querySelector('[data-testid="frame-loading"] .frame-failure-glyph')).toBeNull();
  const running = starting.map((entry) => ({ ...entry, status: 'running' as const, ports: entry.ports.map((port) => ({ ...port, measured: 'live' as const })) }));
  await act(async () => {
    useServerStore.setState({ entries: running, pending: false });
    useCanvasStore.getState().applyServerBook(running);
  });
  const guest = guests.at(-1)!;
  await act(async () => {
    guest.url = 'about:blank#studio-frame-attach=startup';
    guest.element.dispatchEvent(new Event('did-stop-loading'));
  });
  const cover = container.querySelector<HTMLElement>('[data-testid="frame-loading"]')!;
  expect(cover).not.toBeNull();
  expect(cover.getAttribute('role')).toBe('status');
  expect(cover.querySelector('.frame-loading-glyph[aria-hidden="true"] svg')).not.toBeNull();
  expect(cover.style.backgroundColor).toBe('var(--color-background-card)');
  expect(cover.style.pointerEvents).not.toBe('none');
  expect(guest.element.compareDocumentPosition(cover) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  await loaded(guest, URL_A);
  expect(container.querySelector('[data-testid="frame-loading"]')).toBeNull();
  expect(container.querySelector('.frame-loading-glyph')).toBeNull();
});

it('unloads the page under Nothing answered and mounts a fresh guest on Try again', async () => {
  seedFlags({ 'frame-covers': true });
  try {
    const original = await mount();
    await loaded(original);
    Object.assign(original.element, { canGoBack: () => true, canGoForward: () => true });
    await act(async () => { original.element.dispatchEvent(new Event('did-navigate')); });
    expect(container.querySelector('[data-testid="frame-back-fixture"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="frame-forward-fixture"]')).not.toBeNull();
    await act(async () => useCanvasStore.getState().patchFrame(FRAME_ID, { health: 'unreachable' }));
    expect(container.querySelector('[data-cover="nothing"]')).not.toBeNull();
    expect(container.querySelector('webview')).toBeNull();
    expect(useCanvasStore.getState().overlay[FRAME_ID]?.health).toBe('unreachable');
    expect(container.querySelector('[data-testid="frame-back-fixture"]')).toBeNull();
    expect(container.querySelector('[data-testid="frame-forward-fixture"]')).toBeNull();
    expect(useCanvasStore.getState().overlay[FRAME_ID]).toMatchObject({ canGoBack: false, canGoForward: false });
    const retry = container.querySelector<HTMLButtonElement>('[data-action="try-again"]')!;
    await act(async () => retry.click());
    const replacement = guests.at(-1)!;
    expect(replacement.element).not.toBe(original.element);
    expect(useCanvasStore.getState().overlay[FRAME_ID]).toMatchObject({ health: 'loading', canGoBack: false, canGoForward: false });
    await loaded(replacement);
    expect(container.querySelector('[data-cover="nothing"]')).toBeNull();
    expect(useCanvasStore.getState().overlay[FRAME_ID]?.health).toBe('live');
    expect(container.querySelector('[data-testid="frame-back-fixture"]')).toBeNull();
    expect(container.querySelector('[data-testid="frame-forward-fixture"]')).toBeNull();
    await act(async () => {
      replacement.url = URL_B;
      replacement.element.dispatchEvent(new Event('did-navigate'));
    });
    expect(container.querySelector('[data-testid="frame-back-fixture"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="frame-forward-fixture"]')).toBeNull();
  } finally {
    await act(async () => seedFlags());
  }
});

it('keeps the guest and its history capabilities under a named page failure', async () => {
  seedFlags({ 'frame-covers': true });
  try {
    const original = await mount();
    await loaded(original);
    Object.assign(original.element, { canGoBack: () => true, canGoForward: () => true });
    await act(async () => {
      original.element.dispatchEvent(new Event('did-navigate'));
      original.element.dispatchEvent(Object.assign(new Event('did-fail-load'), { errorCode: -102, isMainFrame: true, validatedURL: URL_B, errorDescription: 'refused' }));
    });
    expect(container.querySelector('[data-cover="page-failed"]')).not.toBeNull();
    expect(container.querySelector('webview')).toBe(original.element);
    expect(useCanvasStore.getState().overlay[FRAME_ID]).toMatchObject({ health: 'unreachable', canGoBack: true, canGoForward: true });
    expect(container.querySelector('[data-testid="frame-back-fixture"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="frame-forward-fixture"]')).not.toBeNull();
  } finally {
    await act(async () => seedFlags());
  }
});

it('ignores a deferred navigation rejection after the failed guest is unloaded', async () => {
  seedFlags({ 'frame-covers': true });
  useCanvasStore.setState({ serverEntries: [] });
  useServerStore.setState({ entries: [], pending: false });
  try {
    const original = await mount();
    await loaded(original);
    let rejectNavigation!: (error: Error) => void;
    Object.assign(original.element, { loadURL: (url: string) => {
      original.navigations.push(url);
      original.element.dispatchEvent(new Event('did-start-loading'));
      return new Promise<void>((_resolve, reject) => { rejectNavigation = reject; });
    } });
    await act(async () => useCanvasStore.getState().retargetFrame(URL_B, FRAME_ID));
    expect(original.navigations).toEqual([URL_B]);
    await act(async () => {
      original.element.dispatchEvent(Object.assign(new Event('did-fail-load'), { errorCode: -102, isMainFrame: true, validatedURL: URL_B, errorDescription: 'refused' }));
    });
    expect(container.querySelector('webview')).toBeNull();
    const pendingTarget = useCanvasStore.getState().overlay[FRAME_ID]?.target;
    const guestCount = guests.length;
    await act(async () => { rejectNavigation(new Error('navigation refused')); });
    expect(guests).toHaveLength(guestCount);
    expect(container.querySelector('webview')).toBeNull();
    expect(useCanvasStore.getState().overlay[FRAME_ID]?.target).toBe(pendingTarget);
    expect(useCanvasStore.getState().overlay[FRAME_ID]).toMatchObject({ health: 'unreachable', loadFailure: { url: URL_B }, canGoBack: false, canGoForward: false });
    await act(async () => { container.querySelector<HTMLButtonElement>('[data-action="try-again"]')!.click(); });
    const replacement = guests.at(-1)!;
    expect(replacement.element).not.toBe(original.element);
    await loaded(replacement);
    expect(replacement.navigations).toEqual([URL_B]);
    expect(useCanvasStore.getState().overlay[FRAME_ID]).toMatchObject({ health: 'live', currentUrl: URL_B });
  } finally {
    await act(async () => seedFlags());
  }
});

it('restarts an unclaimed failed preview by replacing its guest, not starting unrelated project servers', async () => {
  const original = await mount();
  await loaded(original);
  await act(async () => {
    useCanvasStore.getState().patchFrame(FRAME_ID, { health: 'unreachable' });
  });
  const restart = [...container.querySelectorAll<HTMLButtonElement>('[data-testid="frame-recovery"] button')].find((button) => button.textContent === 'Restart')!;
  expect(restart).toBeDefined();
  await act(async () => restart.click());
  expect(guests.at(-1)!.element).not.toBe(original.element);
  expect(guests.at(-1)!.element.getAttribute('src')).toBe(URL_A);
});

it('starts the Project when a parked preview has no server entry yet', async () => {
  const state = useCanvasStore.getState();
  const frame = state.doc!.nodes[FRAME_ID] as BrowserNode;
  useCanvasStore.setState({ doc: { ...state.doc!, nodes: { ...state.doc!.nodes, [FRAME_ID]: { ...frame, content: { ...frame.content, pendingHomeUrl: URL_A } } } }, serverEntries: [] });
  useCanvasStore.getState().patchFrame(FRAME_ID, { health: 'unreachable' });
  useServerStore.setState({ entries: [], pending: false });
  const intents: unknown[] = [];
  window.studio = { ...window.studio, serverIntent: (intent) => { intents.push(intent); } };
  await mount();
  expect(container.querySelector('webview')).toBeNull();
  const restart = [...container.querySelectorAll<HTMLButtonElement>('[data-testid="frame-recovery"] button')].find((button) => button.textContent === 'Restart')!;
  await act(async () => restart.click());
  expect(intents).toEqual([{ press: 'start' }]);
});

it('with frame covers on, a parked preview the setup turn placed says the agent is starting the app, with nothing to press', async () => {
  seedFlags({ 'frame-covers': true });
  try {
    const state = useCanvasStore.getState();
    const frame = state.doc!.nodes[FRAME_ID] as BrowserNode;
    useCanvasStore.setState({ doc: { ...state.doc!, nodes: { ...state.doc!.nodes, [FRAME_ID]: { ...frame, content: { ...frame.content, pendingHomeUrl: URL_A } } } }, serverEntries: [] });
    useCanvasStore.getState().patchFrame(FRAME_ID, { health: 'unreachable' });
    useServerStore.setState({ entries: [], pending: false });
    useProjectCreateStore.setState({ state: { kind: 'starting', workspace: { workspacePath: '/w/teal', workspaceName: 'teal', branchName: 'b', baseBranch: 'main', sourceRepoName: 'site', sourcePath: '/s', sourceRepoRoot: '/s', repoIdentity: 'site', copiedEnvFiles: [] } } });
    publishSetupTurn({ steps: [], outcome: 'running' });
    await act(async () => useAgentStore.setState({ hasSession: true, connection: { status: 'ok' } }));
    await mount();
    const cover = container.querySelector('[data-testid="frame-cover"]')!;
    expect(cover.getAttribute('data-cover')).toBe('agent-starting');
    expect(cover.querySelectorAll('button')).toHaveLength(0);
  } finally {
    await act(async () => {
      seedFlags();
      publishSetupTurn(undefined);
      useProjectCreateStore.setState({ state: null });
    });
  }
});

it('recovers the page the guest reached, not a target it already finished loading', async () => {
  const URL_OTHER = 'http://localhost:3001/b';
  const entry = (entryId: string, port: number, measured: 'live' | 'dead') => ({
    entryId,
    folderName: 'app',
    ownership: 'studio-started' as const,
    status: measured === 'live' ? ('running' as const) : ('stopped' as const),
    port,
    ports: [{ port, origin: `http://localhost:${String(port)}`, measured, everLive: true }],
    everMeasuredLive: true,
  });
  const intents: unknown[] = [];
  const prompts: string[] = [];
  window.studio = { ...window.studio, serverIntent: (intent) => { intents.push(intent); } };
  useAgentStore.setState({ hasSession: true, connection: { status: 'ok' } });
  unregisterChat = registerChatSubmit({ submit: async (request) => {
    prompts.push(request.text);
    return { outcome: 'accepted', held: false, submitted: { text: request.text, attachments: [], context: '', images: [], evidence: [] } };
  } });
  const running = [entry('server-a', 3000, 'live'), entry('server-b', 3001, 'live')];
  useServerStore.setState({ entries: running, pending: false });
  await act(async () => { useCanvasStore.getState().applyServerBook(running); });
  const guest = await mount();
  await loaded(guest);
  await act(async () => { useCanvasStore.getState().retargetFrame(URL_A, FRAME_ID); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  await act(async () => { guest.url = URL_OTHER; guest.element.dispatchEvent(new Event('did-navigate')); });
  expect(useCanvasStore.getState().overlay[FRAME_ID]?.currentUrl).toBe(URL_OTHER);
  const stopped = [entry('server-a', 3000, 'dead'), entry('server-b', 3001, 'dead')];
  useServerStore.setState({ entries: stopped, pending: false });
  await act(async () => { useCanvasStore.getState().applyServerBook(stopped); });
  expect(container.querySelector('[data-testid="frame-load-failed"]')).toBeNull();
  const recovery = container.querySelector('[data-testid="frame-recovery"]')!;
  expect(recovery.textContent).toContain('localhost:3001/b');
  expect(recovery.textContent).not.toContain('localhost:3000/a');
  const buttons = [...recovery.querySelectorAll<HTMLButtonElement>('button')];
  await act(async () => buttons.find((button) => button.textContent === 'Restart')!.click());
  expect(intents).toEqual([{ press: 'start', entryIds: ['server-b'] }]);
  await act(async () => buttons.find((button) => button.textContent === 'Ask the agent to fix it')!.click());
  expect(prompts).toHaveLength(1);
  expect(prompts[0]).toContain(URL_OTHER);
  expect(prompts[0]).not.toContain(URL_A);
});

it('retries the page whose navigation failed, not the one the guest is still showing', async () => {
  useCanvasStore.setState({ serverEntries: [] });
  useServerStore.setState({ entries: [], pending: false });
  const intents: unknown[] = [];
  const prompts: string[] = [];
  window.studio = { ...window.studio, serverIntent: (intent) => { intents.push(intent); } };
  useAgentStore.setState({ hasSession: true, connection: { status: 'ok' } });
  unregisterChat = registerChatSubmit({ submit: async (request) => {
    prompts.push(request.text);
    return { outcome: 'accepted', held: false, submitted: { text: request.text, attachments: [], context: '', images: [], evidence: [] } };
  } });
  const original = await mount();
  await loaded(original);
  // The guest never reaches B, so `currentUrl` stays A and only `loadFailure` names what broke.
  await act(async () => {
    original.element.dispatchEvent(new Event('did-start-loading'));
    original.element.dispatchEvent(Object.assign(new Event('did-fail-load'), { errorCode: -102, isMainFrame: true, validatedURL: URL_B, errorDescription: 'refused' }));
    original.element.dispatchEvent(new Event('did-stop-loading'));
  });
  expect(useCanvasStore.getState().overlay[FRAME_ID]).toMatchObject({ currentUrl: URL_A, loadFailure: { url: URL_B } });
  const recovery = container.querySelector('[data-testid="frame-recovery"]')!;
  expect(recovery.textContent).toContain('localhost:3000/b');
  expect(recovery.textContent).not.toContain('localhost:3000/a');
  const press = (name: string) => [...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === name)!;
  await act(async () => press('Ask the agent to fix it').click());
  expect(prompts).toHaveLength(1);
  expect(prompts[0]).toContain(URL_B);
  expect(prompts[0]).not.toContain(URL_A);
  // Both directions of the same state: the toolbar's reload keeps the page the guest is showing.
  await act(async () => press('Refresh fixture').click());
  expect(guests.at(-1)!.element).not.toBe(original.element);
  expect(guests.at(-1)!.element.getAttribute('src')).toBe(URL_A);
  expect(container.querySelector('[data-testid="frame-recovery"]')).toBeNull();
  await act(async () => {
    const replacement = guests.at(-1)!;
    replacement.element.dispatchEvent(Object.assign(new Event('did-fail-load'), { errorCode: -102, isMainFrame: true, validatedURL: URL_B, errorDescription: 'refused' }));
    replacement.element.dispatchEvent(new Event('did-stop-loading'));
  });
  await act(async () => press('Restart').click());
  expect(intents).toEqual([]);
  expect(guests.at(-1)!.element.getAttribute('src')).toBe(URL_B);
});

it('starts the server that owns the page that failed rather than remounting a guest at a dead port', async () => {
  const entries = [{ entryId: 'other-server', folderName: 'app', ownership: 'studio-started' as const, status: 'stopped' as const, port: 3001, ports: [{ port: 3001, origin: 'http://localhost:3001', measured: 'dead' as const, everLive: true }], everMeasuredLive: true }];
  const intents: unknown[] = [];
  window.studio = { ...window.studio, serverIntent: (intent) => { intents.push(intent); } };
  useCanvasStore.setState({ serverEntries: entries });
  useServerStore.setState({ entries, pending: false });
  await act(async () => { useCanvasStore.getState().applyServerBook(entries); });
  const original = await mount();
  await loaded(original);
  // The guest sits on a page no entry claims, so no cover hides it; only the failed address has a server.
  const remote = 'https://docs.example.test/guide';
  await act(async () => { original.url = remote; original.element.dispatchEvent(new Event('did-navigate')); });
  const failed = 'http://localhost:3001/dashboard';
  await act(async () => {
    original.element.dispatchEvent(new Event('did-start-loading'));
    original.element.dispatchEvent(Object.assign(new Event('did-fail-load'), { errorCode: -102, isMainFrame: true, validatedURL: failed, errorDescription: 'refused' }));
    original.element.dispatchEvent(new Event('did-stop-loading'));
  });
  const recovery = container.querySelector('[data-testid="frame-recovery"]')!;
  expect(recovery.textContent).toContain('localhost:3001/dashboard');
  await act(async () => [...recovery.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Restart')!.click());
  expect(intents).toEqual([{ press: 'start', entryIds: ['other-server'] }]);
  expect(guests.at(-1)!.element).toBe(original.element);
});

it('targets the server at the pending navigation address rather than the previous page', async () => {
  const targetUrl = 'http://localhost:3001/next';
  const entries = [{ entryId: 'target-server', folderName: 'app', ownership: 'studio-started' as const, status: 'stopped' as const, port: 3001, ports: [{ port: 3001, origin: 'http://localhost:3001', measured: 'dead' as const, everLive: true }], everMeasuredLive: true }];
  const intents: unknown[] = [];
  useProjectSetupStore.setState({ read: { kind: 'ready', snapshot: {
    saved: { revision: 'r1', definition: { prepare: '', install: { script: '', inputs: [], outputs: [] }, servers: [{ id: 'web', cwd: '.', start: 'npm run dev', port: 3001 }] } },
    verified: null, state: 'idle', failure: null,
  } } });
  window.studio = { ...window.studio, serverIntent: (intent) => { intents.push(intent); runFeedback.observeSetup('failed'); } };
  useServerStore.setState({ entries, pending: false });
  useCanvasStore.getState().applyServerBook(entries);
  useCanvasStore.getState().patchFrame(FRAME_ID, { target: { url: targetUrl, seq: 1 } });
  await mount();
  expect(container.querySelector('webview')).toBeNull();
  const restart = [...container.querySelectorAll<HTMLButtonElement>('[data-testid="frame-recovery"] button')].find((button) => button.textContent === 'Restart')!;
  await act(async () => restart.click());
  expect(intents).toEqual([{ press: 'start', entryIds: ['target-server'] }]);
  expect(useRunFeedbackStore.getState().notice).toBe('start-failed');
});

it('with frame covers off, a frame with a brief draws no brief and still mounts its guest', async () => {
  await loaded(await mount());
  await act(async () => { useCanvasStore.getState().applyFrameQuotes({ byFrame: { [FRAME_ID]: 'A pricing page with three tiers' }, turnRunning: true }); });
  expect(container.querySelector('[data-testid="frame-quote"]')).toBeNull();
  expect(container.querySelector('webview')).not.toBeNull();
  await act(async () => { seedFlags({ 'frame-covers': true }); });
  expect(container.querySelector('[data-testid="frame-quote"]')).not.toBeNull();
});
