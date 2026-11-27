import { afterEach, expect, it, spyOn } from 'bun:test';
import { act, type RefObject } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { FrameIdleRequest, FrameIdleResult, StudioBridge } from '@studio/events';
import { takeComplaints } from '../../testing/dom.js';
import { useCameraMotion } from '../cameraMotion.js';
import { useFrameIdle } from './useFrameIdle.js';

let root: Root | undefined;
let container: HTMLElement | undefined;
const originalBridge = window.studio;
const restorers: (() => void)[] = [];

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  root = undefined;
  container?.remove();
  container = undefined;
  for (const restore of restorers.splice(0)) restore();
  window.studio = originalBridge;
  useCameraMotion.setState({ moving: false });
  expect(takeComplaints()).toEqual([]);
});

it('holds the thumbnail through pan and zoom, cancels pending pause and wakes only after settle', async () => {
  const requests: FrameIdleRequest[] = [];
  const timers = new Map<number, () => void>();
  let sequence = 0;
  const set = spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void) => {
    const handle = ++sequence;
    timers.set(handle, callback);
    return handle;
  }) as typeof setTimeout);
  const clear = spyOn(globalThis, 'clearTimeout').mockImplementation(((handle: number) => { timers.delete(handle); }) as typeof clearTimeout);
  restorers.push(() => { set.mockRestore(); clear.mockRestore(); });
  window.studio = { frameIdle: async (request: FrameIdleRequest): Promise<FrameIdleResult> => {
    requests.push(request);
    return { paused: request.idle, ...(request.idle ? { thumbnail: 'snapshot' } : {}) };
  } } as StudioBridge;
  const guest = Object.assign(document.createElement('div'), { getWebContentsId: () => 17 });
  const ref = { current: guest } as unknown as RefObject<Electron.WebviewTag | null>;
  function Surface({ idle, instance = 0 }: { idle: boolean; instance?: number }) {
    const thumbnail = useFrameIdle(ref, idle, instance, true);
    return <span>{thumbnail ?? 'live'}</span>;
  }
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<Surface idle />); });
  expect(requests).toEqual([]);
  await act(async () => { useCameraMotion.setState({ moving: true }); });
  expect(timers.size).toBe(0);
  expect(requests.at(-1)).toEqual({ webContentsId: 17, idle: true, moving: true, seen: true });
  expect(container.textContent).toBe('live');
  await act(async () => { useCameraMotion.setState({ moving: false }); });
  await act(async () => { for (const callback of timers.values()) callback(); timers.clear(); });
  expect(container.textContent).toBe('snapshot');
  await act(async () => { root!.render(<Surface idle instance={1} />); });
  expect(container.textContent).toBe('live');
  await act(async () => { for (const callback of timers.values()) callback(); timers.clear(); });
  expect(container.textContent).toBe('snapshot');
  await act(async () => { useCameraMotion.setState({ moving: true }); root!.render(<Surface idle={false} instance={1} />); });
  expect(container.textContent).toBe('snapshot');
  await act(async () => { useCameraMotion.setState({ moving: false }); });
  expect(container.textContent).toBe('live');
  expect(requests.at(-1)).toEqual({ webContentsId: 17, idle: false, moving: false, seen: true });
});

it('retries a picture waiting on paint at its own pace, not the idle delay', async () => {
  const delays: number[] = [];
  const timers = new Map<number, () => void>();
  let sequence = 0;
  const set = spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void, ms?: number) => {
    const handle = ++sequence;
    timers.set(handle, callback);
    delays.push(ms ?? 0);
    return handle;
  }) as unknown as typeof setTimeout);
  const clear = spyOn(globalThis, 'clearTimeout').mockImplementation(((handle: number) => { timers.delete(handle); }) as typeof clearTimeout);
  restorers.push(() => { set.mockRestore(); clear.mockRestore(); });
  let pauses = true;
  window.studio = {
    frameIdle: async (): Promise<FrameIdleResult> => pauses ? { paused: true, thumbnail: 'snapshot' } : { paused: false },
    framePicture: async () => null,
  } as unknown as StudioBridge;
  const guest = Object.assign(document.createElement('div'), { getWebContentsId: () => 21 });
  const ref = { current: guest } as unknown as RefObject<Electron.WebviewTag | null>;
  function Surface() {
    const thumbnail = useFrameIdle(ref, true, 0, true);
    return <span>{thumbnail ?? 'live'}</span>;
  }
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<Surface />); });
  const settle = async (): Promise<void> => {
    await act(async () => { useCameraMotion.setState({ moving: true }); });
    await act(async () => { useCameraMotion.setState({ moving: false }); });
    await act(async () => { for (const callback of [...timers.values()]) callback(); timers.clear(); });
  };
  await settle();
  expect(container.textContent).toBe('snapshot');
  pauses = false;
  delays.length = 0;
  await settle();
  expect(container.textContent).toBe('snapshot');
  expect(delays.at(-1)).toBe(250);
});
