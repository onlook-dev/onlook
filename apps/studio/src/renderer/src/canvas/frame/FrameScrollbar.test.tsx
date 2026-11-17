import { takeComplaints } from '../../testing/dom.js';
import type { RendererTelemetryEvent } from '@studio/events';
import { afterEach, expect, it } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { FrameScrollbar } from './FrameScrollbar.js';

let root: Root | undefined;
let container: HTMLElement | undefined;
const originalBridge = window.studio;
afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  container?.remove();
  window.studio = originalBridge;
  expect(takeComplaints()).toEqual([]);
});

async function mount() {
  const scrolls: number[] = [];
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<FrameScrollbar metrics={{ session: 1, surface: 1, top: 400, viewport: 400, height: 2000 }} scrollTo={(top) => { scrolls.push(top); }} scale={2} height={200} controls="page" />));
  const thumb = container.querySelector<HTMLElement>('[role="scrollbar"]')!;
  let captured = false;
  thumb.setPointerCapture = () => { captured = true; };
  thumb.hasPointerCapture = () => captured;
  thumb.releasePointerCapture = () => { captured = false; };
  return { scrolls, thumb, track: container.querySelector<HTMLElement>('[data-testid="frame-scrollbar"]')!, captured: () => captured };
}

it('pages only on deliberate clicks and supports keyboard scrolling without converting casual wheels', async () => {
  const { scrolls, thumb, track } = await mount();
  await act(async () => track.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientY: 95 })));
  expect(scrolls).toEqual([760]);
  await act(async () => track.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 500 })));
  expect(scrolls).toEqual([760]);
  await act(async () => thumb.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'End' })));
  expect(scrolls.at(-1)).toBe(1600);
  expect(thumb.getAttribute('aria-label')).toBe('Scroll page');
  expect(track.style.height).toBe('100px');
});

it('captures the drag, maps screen pixels and stops on cancellation', async () => {
  const { scrolls, thumb, captured } = await mount();
  await act(async () => thumb.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 3, clientY: 20 })));
  expect(captured()).toBe(true);
  await act(async () => thumb.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 3, clientY: 37 })));
  expect(scrolls.at(-1)).toBe(800);
  await act(async () => thumb.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 3 })));
  expect(captured()).toBe(false);
  await act(async () => thumb.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 3, clientY: 50 })));
  expect(scrolls).toHaveLength(1);
});

it('uses the new scroll range during a length-changing drag and releases capture on unmount', async () => {
  const { scrolls, thumb, captured } = await mount();
  await act(async () => thumb.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 3, clientY: 20 })));
  await act(async () => thumb.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 3, clientY: 37 })));
  expect(scrolls.at(-1)).toBe(800);
  await act(async () => root?.render(<FrameScrollbar metrics={{ session: 1, surface: 1, top: 800, viewport: 400, height: 4000 }} scrollTo={(top) => { scrolls.push(top); }} scale={2} height={200} controls="page" />));
  await act(async () => thumb.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 3, clientY: 54 })));
  expect(scrolls.at(-1)).toBe(1700);
  expect(captured()).toBe(true);
  await act(async () => root?.unmount());
  root = undefined;
  expect(captured()).toBe(false);
});

it('reports one drag only after movement changes the scroll position, not when focusing or clamped', async () => {
  const events: RendererTelemetryEvent[] = [];
  const methods = () => events.flatMap((event) => event.event === 'frame_scrolled' ? [event.properties.method] : []);
  window.studio = { ...originalBridge, telemetryEvent: (event) => { events.push(event); } };
  const { thumb } = await mount();
  const pointer = async (type: string, clientY: number) => {
    await act(async () => thumb.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerId: 3, clientY })));
  };
  await pointer('pointerdown', 20);
  await pointer('pointermove', 20);
  await pointer('pointerup', 20);
  expect(events).toEqual([]);
  await act(async () => thumb.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' })));
  expect(methods()).toEqual(['key']);
  await pointer('pointerdown', 20);
  await pointer('pointermove', 37);
  await pointer('pointermove', 50);
  expect(methods()).toEqual(['key', 'drag']);
  await pointer('pointerup', 50);
  await act(async () => root?.render(<FrameScrollbar metrics={{ session: 1, surface: 1, top: 0, viewport: 400, height: 2000 }} scrollTo={() => {}} scale={2} height={200} controls="page" />));
  await pointer('pointerdown', 20);
  await pointer('pointermove', 0);
  expect(methods()).toEqual(['key', 'drag']);
});

it('reports no keyboard scroll that cannot move the page, and none for a held key', async () => {
  const events: RendererTelemetryEvent[] = [];
  const methods = () => events.flatMap((event) => event.event === 'frame_scrolled' ? [event.properties.method] : []);
  window.studio = { ...originalBridge, telemetryEvent: (event) => { events.push(event); } };
  const { scrolls, thumb } = await mount();
  const press = async (key: string, repeat = false) => {
    await act(async () => thumb.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key, repeat })));
  };
  await press('ArrowDown', true);
  expect(scrolls).toEqual([440]);
  expect(methods()).toEqual([]);
  await act(async () => root?.render(<FrameScrollbar metrics={{ session: 1, surface: 1, top: 1600, viewport: 400, height: 2000 }} scrollTo={(top) => { scrolls.push(top); }} scale={2} height={200} controls="page" />));
  await press('End');
  await press('PageDown');
  expect(scrolls).toEqual([440]);
  expect(methods()).toEqual([]);
  await press('Home');
  expect(scrolls.at(-1)).toBe(0);
  expect(methods()).toEqual(['key']);
});
