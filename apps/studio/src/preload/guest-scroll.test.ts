import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { afterEach, beforeEach, expect, it, spyOn } from 'bun:test';
import { createGuestScrollController, findScrollSurface, visibleScrollArea } from './guest-scroll.js';
import type { FrameScrollReport } from '@studio/events';

if (typeof document === 'undefined') GlobalRegistrator.register();

const pending = new Map<number, FrameRequestCallback>();
let sequence = 0;
let controller: ReturnType<typeof createGuestScrollController> | undefined;
const reports: FrameScrollReport[] = [];
let disposeRaf: () => void;

const bare = <Args extends unknown[]>(handler: (...args: Args) => void): ((...args: Args) => void) => handler;

function size(element: Element, viewport: number, height: number, width = 800, left = 0): void {
  Object.defineProperties(element, {
    clientHeight: { configurable: true, value: viewport },
    scrollHeight: { configurable: true, value: height },
  });
  element.getBoundingClientRect = () => ({ x: left, y: 0, left, top: 0, right: left + width, bottom: viewport, width, height: viewport, toJSON: () => ({}) });
}

function panel(width: number, height = 400, content = 1800): HTMLElement {
  const element = document.createElement('main');
  element.style.overflowY = 'auto';
  document.body.append(element);
  size(element, height, content, width);
  return element;
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  const callbacks = [...pending.values()];
  pending.clear();
  for (const callback of callbacks) callback(0);
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.body.style.cssText = '';
  document.documentElement.style.cssText = '';
  Object.defineProperty(document, 'scrollingElement', { configurable: true, value: document.documentElement });
  size(document.documentElement, 600, 600, 1000);
  size(document.body, 600, 600, 1000);
  reports.length = 0;
  pending.clear();
  const raf = spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { pending.set(++sequence, callback); return sequence; });
  const cancel = spyOn(window, 'cancelAnimationFrame').mockImplementation((handle) => { pending.delete(handle); });
  disposeRaf = () => { raf.mockRestore(); cancel.mockRestore(); };
});

afterEach(() => {
  controller?.dispose();
  controller = undefined;
  disposeRaf();
  document.body.innerHTML = '';
});

it('prefers the document and respects scroll locks before choosing the largest visible panel', () => {
  const small = panel(150);
  const large = panel(700);
  expect(findScrollSurface(document, window)).toBe(large);
  size(document.documentElement, 600, 3000, 1000);
  expect(findScrollSurface(document, window)).toBe(document.documentElement);
  document.body.style.overflowY = 'hidden';
  expect(findScrollSurface(document, window)).toBe(large);
  large.style.visibility = 'hidden';
  expect(findScrollSurface(document, window)).toBe(small);
  small.style.overflowY = 'hidden';
  expect(findScrollSurface(document, window)).toBeNull();
});

it('uses visible area including clipping, and ignores Studio overlays', () => {
  const visible = panel(300);
  const clipped = panel(700);
  const clip = document.createElement('div');
  clip.style.overflow = 'hidden';
  document.body.append(clip);
  size(clip, 80, 80, 100);
  clip.append(clipped);
  const overlay = panel(900);
  overlay.dataset.studioPicker = 'overlay';
  expect(visibleScrollArea(clipped, window)).toBe(8000);
  expect(findScrollSurface(document, window)).toBe(visible);
});

it('takes the viewport lock from the root before body', () => {
  size(document.documentElement, 600, 3000, 1000);
  document.body.style.overflowY = 'hidden';
  expect(findScrollSurface(document, window)).toBeNull();
  document.documentElement.style.overflowY = 'auto';
  expect(findScrollSurface(document, window)).toBe(document.documentElement);
  document.documentElement.style.overflowY = 'clip';
  expect(findScrollSurface(document, window)).toBeNull();
});

it('supports a scrolling body inside a locked document root', () => {
  document.documentElement.style.overflowY = 'hidden';
  document.body.style.overflowY = 'auto';
  size(document.body, 600, 2400, 1000);
  expect(findScrollSurface(document, window)).toBe(document.body);
});

it('observes a latent panel and its content before overflow, with no mutation or root resize', async () => {
  const original = globalThis.ResizeObserver;
  const observed = new Set<Element>();
  let resize = () => {};
  globalThis.ResizeObserver = class implements ResizeObserver {
    constructor(callback: ResizeObserverCallback) { resize = () => callback([], this); }
    observe(element: Element) { observed.add(element); }
    unobserve(element: Element) { observed.delete(element); }
    disconnect() { observed.clear(); }
  };
  try {
    const target = panel(700, 400, 390);
    const content = document.createElement('section');
    target.append(content);
    controller = createGuestScrollController(document, window, (report) => reports.push(report), () => {}, bare);
    controller.receive({ type: 'observe', session: 1, enabled: true });
    await flush();
    expect(reports.at(-1)?.metrics).toBeNull();
    expect(observed.has(target)).toBe(true);
    expect(observed.has(content)).toBe(true);
    size(target, 400, 550, 700);
    resize();
    await flush();
    expect(reports.at(-1)?.metrics?.height).toBe(550);
    controller.dispose();
    expect(observed.size).toBe(0);
  } finally {
    globalThis.ResizeObserver = original;
  }
});

it('follows an animated surface every frame and stops once it settles', async () => {
  const target = panel(700, 400, 390);
  const deep = document.createElement('div');
  target.append(deep);
  controller = createGuestScrollController(document, window, (report) => reports.push(report), () => {}, bare);
  controller.receive({ type: 'observe', session: 1, enabled: true });
  await flush();
  expect(reports.at(-1)?.metrics).toBeNull();
  size(target, 400, 1200, 700);
  deep.dispatchEvent(new Event('transitionrun', { bubbles: true }));
  await flush();
  expect(reports.at(-1)?.metrics?.height).toBe(1200);
  size(target, 400, 2000, 700);
  await flush();
  expect(reports.at(-1)?.metrics?.height).toBe(2000);
  for (let index = 0; index < 12; index += 1) await flush();
  expect(pending.size).toBe(0);
  expect(reports).toHaveLength(3);
});

it('hands a pending frame to the follow loop and stops the loop on dispose', async () => {
  const target = panel(700);
  controller = createGuestScrollController(document, window, (report) => reports.push(report), () => {}, bare);
  controller.receive({ type: 'observe', session: 1, enabled: true });
  await flush();
  target.scrollTop = 120;
  target.dispatchEvent(new Event('scroll'));
  expect(pending.size).toBe(1);
  target.dispatchEvent(new Event('transitionrun', { bubbles: true }));
  expect(pending.size).toBe(1);
  await flush();
  expect(reports.at(-1)?.metrics?.top).toBe(120);
  controller.dispose();
  expect(pending.size).toBe(0);
});

it('defers the whole-document scan while a page mutates every frame, then takes it', async () => {
  panel(700);
  controller = createGuestScrollController(document, window, (report) => reports.push(report), () => {}, bare);
  controller.receive({ type: 'observe', session: 1, enabled: true });
  await flush();
  const scans = spyOn(document, 'querySelectorAll');
  for (let index = 0; index < 6; index += 1) {
    document.body.append(document.createElement('p'));
    await flush();
  }
  expect(scans).not.toHaveBeenCalled();
  for (let index = 0; index < 8; index += 1) await flush();
  expect(scans).toHaveBeenCalled();
  scans.mockRestore();
});

it('hands a failure reading the page to its owner and keeps the subscription alive', async () => {
  const target = panel(700);
  const failures: unknown[] = [];
  const watch = <Args extends unknown[]>(handler: (...args: Args) => void) => (...args: Args) => {
    try { handler(...args); } catch (error) { failures.push(error); }
  };
  controller = createGuestScrollController(document, window, (report) => reports.push(report), () => {}, watch);
  controller.receive({ type: 'observe', session: 1, enabled: true });
  const scans = spyOn(document, 'querySelectorAll').mockImplementation(() => { throw new Error('page says no'); });
  await flush();
  expect(failures).toHaveLength(1);
  expect(reports).toHaveLength(0);
  scans.mockRestore();
  target.scrollTop = 80;
  target.dispatchEvent(new Event('scroll'));
  await flush();
  expect(reports.at(-1)?.metrics?.top).toBe(80);
});

it('coalesces bursts, emits no unchanged metrics and detaches everything when inactive', async () => {
  const target = panel(700);
  let reflows = 0;
  controller = createGuestScrollController(document, window, (report) => reports.push(report), () => { reflows += 1; }, bare);
  controller.receive({ type: 'observe', session: 1, enabled: true });
  await flush();
  expect(reports.at(-1)?.metrics?.top).toBe(0);
  const scans = spyOn(document, 'querySelectorAll');
  for (let index = 0; index < 30; index += 1) target.dispatchEvent(new Event('scroll', { bubbles: false }));
  await flush();
  expect(scans).not.toHaveBeenCalled();
  expect(reports).toHaveLength(1);
  target.scrollTop = 200;
  target.dispatchEvent(new Event('scroll'));
  await flush();
  expect(reports.at(-1)?.metrics?.top).toBe(200);
  expect(reflows).toBe(2);
  controller.receive({ type: 'observe', session: 1, enabled: false });
  target.scrollTop = 300;
  target.dispatchEvent(new Event('scroll'));
  document.body.append(document.createElement('p'));
  await flush();
  expect(pending.size).toBe(0);
  expect(reports).toHaveLength(2);
  scans.mockRestore();
});

it('scrolls instantly to a position or by a delta, rejects old subscriptions and targets, and rediscovers growth and removal', async () => {
  const target = panel(700);
  const scroll = spyOn(target, 'scrollTo').mockImplementation(() => {});
  controller = createGuestScrollController(document, window, (report) => reports.push(report), () => {}, bare);
  controller.receive({ type: 'observe', session: 1, enabled: true });
  await flush();
  const surface = reports.at(-1)?.metrics?.surface;
  controller.receive({ type: 'scroll', session: 1, surface, top: 400 });
  expect(scroll).toHaveBeenLastCalledWith({ top: 400, behavior: 'instant' });
  const nudge = spyOn(target, 'scrollBy').mockImplementation(() => {});
  controller.receive({ type: 'scrollBy', session: 1, surface, delta: -40 });
  expect(nudge).toHaveBeenLastCalledWith({ top: -40, behavior: 'instant' });
  controller.receive({ type: 'observe', session: 2, enabled: true });
  controller.receive({ type: 'observe', session: 1, enabled: false });
  await flush();
  controller.receive({ type: 'scroll', session: 1, surface, top: 500 });
  expect(scroll).toHaveBeenCalledTimes(1);
  size(target, 400, 4000, 700);
  target.append(document.createElement('section'));
  await flush();
  expect(reports.at(-1)?.metrics?.height).toBe(4000);
  target.remove();
  await flush();
  expect(reports.at(-1)).toEqual({ session: 2, metrics: null });
  controller.receive({ type: 'scroll', session: 2, surface, top: 600 });
  controller.receive({ type: 'scrollBy', session: 2, surface, delta: 40 });
  expect(scroll).toHaveBeenCalledTimes(1);
  expect(nudge).toHaveBeenCalledTimes(1);
  scroll.mockRestore();
  nudge.mockRestore();
});

it('ignores outline redraws and does not schedule idle polling', async () => {
  panel(700);
  controller = createGuestScrollController(document, window, (report) => reports.push(report), () => {}, bare);
  controller.receive({ type: 'observe', session: 1, enabled: true });
  await flush();
  const overlay = document.createElement('div');
  overlay.dataset.studioPicker = 'overlay';
  document.body.append(overlay);
  await flush();
  overlay.style.top = '10px';
  overlay.append(document.createElement('div'));
  await flush();
  expect(pending.size).toBe(0);
  expect(reports).toHaveLength(1);
});
