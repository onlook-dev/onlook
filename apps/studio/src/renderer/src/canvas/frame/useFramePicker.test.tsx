import { takeComplaints } from '../../testing/dom.js';
import { afterEach, beforeEach, expect, it, spyOn } from 'bun:test';
import { act, type RefObject } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ReactFlowProvider, useStoreApi } from '@xyflow/react';
import { GUEST_CHANNEL_TO_GUEST, GUEST_CHANNEL_TO_HOST, type PickerToGuest, type PickerToHost, type StudioBridge } from '@studio/events';
import { resetSettingsPrimeForTests, useSettingsStore } from '../../settings/store.js';
import { resetCanvasStoreForTests, useCanvasStore } from '../store.js';
import { ZOOM_SETTLE_MS } from './settledZoom.js';
import { useFramePicker, type FramePicker } from './useFramePicker.js';

type ZoomMessage = Extract<PickerToGuest, { type: 'zoom' }>;

let root: Root | undefined;
let container: HTMLElement | undefined;
let now = 0;
let sequence = 0;
const pending = new Map<number, { due: number; callback: () => void }>();
const restorers: (() => void)[] = [];

beforeEach(() => {
  resetCanvasStoreForTests();
  now = 0;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const set = spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void, delay: number, ...args: unknown[]) => {
    if (delay !== ZOOM_SETTLE_MS) return originalSetTimeout(callback, delay, ...args);
    const handle = ++sequence;
    pending.set(handle, { due: now + delay, callback });
    return handle;
  }) as typeof setTimeout);
  const clear = spyOn(globalThis, 'clearTimeout').mockImplementation(((handle: number) => {
    if (!pending.delete(handle)) originalClearTimeout(handle);
  }) as typeof clearTimeout);
  restorers.push(() => { set.mockRestore(); clear.mockRestore(); });
});

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  root = undefined;
  container?.remove();
  container = undefined;
  for (const restore of restorers.splice(0).reverse()) restore();
  pending.clear();
  resetCanvasStoreForTests();
  expect(takeComplaints()).toEqual([]);
});

async function advance(ms: number): Promise<void> {
  await act(async () => {
    now += ms;
    for (const [handle, timer] of pending) {
      if (timer.due > now) continue;
      pending.delete(handle);
      timer.callback();
    }
  });
}

function guest() {
  const messages: PickerToGuest[] = [];
  let ready = false;
  const element = Object.assign(document.createElement('div'), {
    send(channel: string, message: PickerToGuest) {
      expect(channel).toBe(GUEST_CHANNEL_TO_GUEST);
      messages.push(message);
    },
    getZoomFactor: () => 2,
    getWebContentsId() {
      if (!ready) throw new Error('guest not ready');
      return 17;
    },
  });
  return {
    element,
    messages,
    zooms: () => messages.filter((message): message is ZoomMessage => message.type === 'zoom'),
    ready() {
      ready = true;
      element.dispatchEvent(new Event('dom-ready'));
    },
  };
}

async function mountPicker() {
  const initialGuest = guest();
  const ref = { current: initialGuest.element } as unknown as RefObject<Electron.WebviewTag | null>;
  let picker!: FramePicker;
  let flowStore: ReturnType<typeof useStoreApi>;
  let renders = 0;
  function Surface({ mountNonce }: { mountNonce: number }): null {
    renders += 1;
    flowStore = useStoreApi();
    picker = useFramePicker('frame-a', ref, mountNonce, { x: 10, y: 20 });
    return null;
  }
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  async function render(zoom: number, mountNonce = 0): Promise<void> {
    await act(async () => {
      root!.render(<ReactFlowProvider><Surface mountNonce={mountNonce} /></ReactFlowProvider>);
    });
    await act(async () => { flowStore.setState({ transform: [0, 0, zoom] }); });
  }
  await render(1);
  return { initialGuest, ref, render, get picker() { return picker; }, get renders() { return renders; }, zoom: async (zoom: number) => { await act(async () => { flowStore.setState({ transform: [0, 0, zoom] }); }); } };
}

it('sends the latest zoom without rendering the Frame or its picker again', async () => {
  const surface = await mountPicker();
  const before = surface.renders;
  for (const zoom of [0.9, 0.8, 0.7]) await surface.zoom(zoom);
  expect(surface.renders).toBe(before);
  await advance(ZOOM_SETTLE_MS);
  expect(surface.initialGuest.zooms()).toEqual([{ type: 'zoom', zoom: 0.7, generation: expect.any(Number) }]);
});

it('sends no intermediate zoom across committed rerenders, then sends the latest once', async () => {
  const surface = await mountPicker();
  for (const zoom of [0.9, 0.8, 0.7]) {
    await advance(ZOOM_SETTLE_MS - 1);
    await surface.render(zoom);
    expect(surface.initialGuest.zooms()).toEqual([]);
    expect(pending.size).toBe(1);
  }
  await advance(ZOOM_SETTLE_MS - 1);
  expect(surface.initialGuest.zooms()).toEqual([]);
  await advance(1);
  expect(surface.initialGuest.zooms()).toEqual([
    { type: 'zoom', zoom: 0.7, generation: expect.any(Number) },
  ]);
  await advance(ZOOM_SETTLE_MS);
  expect(surface.initialGuest.zooms()).toHaveLength(1);
});

it('mountNonce replacement cancels the old document timer even when zoom is unchanged', async () => {
  const surface = await mountPicker();
  await surface.render(0.6);
  await advance(ZOOM_SETTLE_MS - 1);
  const replacement = guest();
  surface.ref.current = replacement.element as unknown as Electron.WebviewTag;
  await surface.render(0.6, 1);
  expect(pending.size).toBe(1);
  await advance(1);
  expect(surface.initialGuest.zooms()).toEqual([]);
  expect(replacement.zooms()).toEqual([]);
  await advance(ZOOM_SETTLE_MS - 1);
  expect(replacement.zooms()).toEqual([
    { type: 'zoom', zoom: 0.6, generation: expect.any(Number) },
  ]);
  expect(surface.initialGuest.zooms()).toEqual([]);
});

it('unmount cancels a pending burst without sending stale zoom', async () => {
  const surface = await mountPicker();
  await surface.render(0.8);
  await surface.render(0.5);
  expect(pending.size).toBe(1);
  await act(async () => { root!.unmount(); });
  root = undefined;
  expect(pending.size).toBe(0);
  await advance(ZOOM_SETTLE_MS);
  expect(surface.initialGuest.zooms()).toEqual([]);
});

it('dom-ready immediately seeds current zoom and generation while a burst is pending', async () => {
  const surface = await mountPicker();
  const previousArm = surface.initialGuest.messages.find((message) => message.type === 'arm');
  await surface.render(0.8);
  await surface.render(0.4);
  expect(surface.initialGuest.zooms()).toEqual([]);
  await act(async () => { surface.initialGuest.ready(); });
  const seeds = surface.initialGuest.messages.filter((message) => message.type === 'seedSelections');
  const arms = surface.initialGuest.messages.filter((message) => message.type === 'arm');
  const seed = seeds.at(-1)!;
  const arm = arms.at(-1)!;
  expect(seed.generation).toBeGreaterThan(previousArm!.generation);
  expect(arm.generation).toBeGreaterThan(seed.generation);
  expect(surface.initialGuest.zooms()).toEqual([
    { type: 'zoom', zoom: 0.4, generation: arm.generation },
  ]);
  expect(pending.size).toBe(1);
  await advance(ZOOM_SETTLE_MS);
  expect(surface.initialGuest.zooms()).toEqual([
    { type: 'zoom', zoom: 0.4, generation: arm.generation },
    { type: 'zoom', zoom: 0.4, generation: arm.generation },
  ]);
});

it('hover conversion uses live canvas and guest zoom before the guest zoom message settles', async () => {
  const surface = await mountPicker();
  const frames: FrameRequestCallback[] = [];
  const raf = spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.push(callback);
    return frames.length;
  });
  restorers.push(() => raf.mockRestore());
  surface.picker.hoverAt({
    client: { x: 140, y: 100 },
    shield: { getBoundingClientRect: () => ({ left: 100, top: 80 }) },
  });
  await surface.render(0.5);
  await act(async () => { for (const callback of frames.splice(0)) callback(0); });
  expect(surface.initialGuest.zooms()).toEqual([]);
  expect(surface.initialGuest.messages.filter((message) => message.type === 'hoverAt')).toEqual([
    { type: 'hoverAt', point: { x: 40, y: 20 }, generation: expect.any(Number) },
  ]);
});

it('the first element the guest reports picked dismisses the tips pill for good', async () => {
  const sources: unknown[] = [];
  const previous = window.studio;
  window.studio = {
    settingsDismissTipsPill: async () => ({ tipsPillDismissed: true }),
    telemetryEvent: (event) => { if (event.event === 'tips_pill_dismissed') sources.push(event.properties.source); },
  } as Pick<StudioBridge, 'settingsDismissTipsPill' | 'telemetryEvent'> as StudioBridge;
  restorers.push(() => { window.studio = previous; resetSettingsPrimeForTests(); });
  useSettingsStore.getState().apply({});
  const surface = await mountPicker();
  await act(async () => { surface.initialGuest.ready(); });
  const arm = surface.initialGuest.messages.filter((message) => message.type === 'arm').at(-1)!;
  const picked: PickerToHost = {
    type: 'picked',
    shiftHeld: false,
    generation: arm.generation,
    evidence: { kind: 'element', id: 'el-title', tag: 'h1', domPath: 'html:nth-of-type(1)>body:nth-of-type(1)>h1:nth-of-type(1)', classes: [], textContent: 'Title', outerHtmlSnippet: '<h1>', frameUrl: 'http://localhost:3000/' },
  };
  await act(async () => {
    surface.initialGuest.element.dispatchEvent(Object.assign(new Event('ipc-message'), { channel: GUEST_CHANNEL_TO_HOST, args: [picked] }));
  });
  expect(useCanvasStore.getState().elementSelections).toHaveLength(1);
  expect(useSettingsStore.getState().tipsPillDismissed).toBe(true);
  expect(sources).toEqual(['selection']);
});
