import '../testing/dom.js';
import { expect, test } from 'bun:test';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { TourScene } from '../tour/TourScene.js';
import { takeComplaints } from '../testing/dom.js';
import { TourSceneShot } from './LoginConcepts.js';

test('retained login illustration styles cannot match the normal tour after sign-in', async () => {
  const originalObserver = globalThis.ResizeObserver;
  const originalAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelFrame = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  const container = document.createElement('div');
  const tour = document.createElement('div');
  document.body.append(container, tour);
  const root = createRoot(container);
  const tourRoot = createRoot(tour);
  try {
    await act(async () => { root.render(<TourSceneShot />); });
    const style = document.querySelector<HTMLStyleElement>('style[data-href="login-tour-mist-shader"]');
    expect(style).not.toBeNull();
    await act(async () => { root.unmount(); });
    expect(style!.isConnected).toBe(true);
    await act(async () => { tourRoot.render(<TourScene step="canvas" />); });
    const selectors = [...style!.textContent!.matchAll(/([^{}]+)\{[^{}]*\}/g)].map((match) => match[1]!.trim());
    expect(selectors).toHaveLength(3);
    for (const selector of selectors) expect(tour.querySelector(selector) === null).toBe(true);
    tour.className = 'login-tour-shot';
    expect(tour.querySelector(selectors[0]!) !== null).toBe(true);
    expect(tour.querySelector(selectors[1]!) !== null).toBe(true);
  } finally {
    await act(async () => { tourRoot.unmount(); });
    if (container.childNodes.length > 0) await act(async () => { root.unmount(); });
    container.remove();
    tour.remove();
    globalThis.ResizeObserver = originalObserver;
    globalThis.requestAnimationFrame = originalAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelFrame;
  }
  expect(takeComplaints()).toEqual([]);
});
