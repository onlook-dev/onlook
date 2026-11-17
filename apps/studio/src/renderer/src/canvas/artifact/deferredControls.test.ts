import { expect, it, spyOn } from 'bun:test';
import { observeArtifactControls } from './deferredControls.js';

it('defers visible controls past paint, ignores offscreen cards and cancels work on hide or unmount', () => {
  const previous = { observer: globalThis.IntersectionObserver, request: globalThis.requestAnimationFrame, cancel: globalThis.cancelAnimationFrame };
  const frames: FrameRequestCallback[] = [];
  const timers: (() => void)[] = [];
  const cancelled: number[] = [];
  const cleared: unknown[] = [];
  const element = {} as Element;
  const observed: Element[] = [];
  let notify: ((visible: boolean, previousVisible?: boolean) => void) | undefined;
  let disconnected = false;
  let activations = 0;
  globalThis.requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };
  globalThis.cancelAnimationFrame = (id) => { cancelled.push(id); };
  globalThis.IntersectionObserver = class {
    constructor(callback: IntersectionObserverCallback) { notify = (visible, previousVisible) => callback([...(previousVisible === undefined ? [] : [{ isIntersecting: previousVisible } as IntersectionObserverEntry]), { isIntersecting: visible } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
    observe(target: Element) { observed.push(target); }
    disconnect() { disconnected = true; }
  } as unknown as typeof IntersectionObserver;
  const timeout = spyOn(globalThis, 'setTimeout').mockImplementation(((callback: TimerHandler) => { timers.push(callback as () => void); return timers.length; }) as unknown as typeof setTimeout);
  const clear = spyOn(globalThis, 'clearTimeout').mockImplementation((id) => { cleared.push(id); });
  try {
    const cleanup = observeArtifactControls(element, () => { activations += 1; });
    expect(observed).toEqual([element]);
    notify!(false);
    notify!(false, true);
    expect(frames).toHaveLength(0);
    notify!(true);
    notify!(true);
    expect(frames).toHaveLength(1);
    frames[0]!(0);
    expect(activations).toBe(0);
    frames[1]!(16);
    expect(activations).toBe(0);
    expect(timers).toHaveLength(1);
    timers[0]!();
    expect(activations).toBe(1);
    notify!(true);
    notify!(false);
    expect(cancelled).toContain(3);
    notify!(true);
    frames[3]!(32);
    frames[4]!(48);
    cleanup();
    expect(cleared).toContain(2);
    expect(disconnected).toBe(true);
  } finally {
    timeout.mockRestore();
    clear.mockRestore();
    globalThis.IntersectionObserver = previous.observer;
    globalThis.requestAnimationFrame = previous.request;
    globalThis.cancelAnimationFrame = previous.cancel;
  }
});
