import '../testing/dom.js';
import { afterEach, beforeEach, expect, it, spyOn } from 'bun:test';
import * as React from 'react';
import { useStickyUserMessage } from '@studio/chat-ui/testing';

let resize: ResizeObserverCallback;
let mutate: MutationCallback;
let observed: Set<Element>;
let frames: Map<number, FrameRequestCallback>;
let cleanup: (() => void) | undefined;
let restore: () => void;

beforeEach(() => {
  observed = new Set();
  frames = new Map();
  const originals = {
    ResizeObserver: globalThis.ResizeObserver,
    MutationObserver: globalThis.MutationObserver,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
  };
  globalThis.ResizeObserver = class {
    constructor(callback: ResizeObserverCallback) { resize = callback; }
    observe(target: Element) { observed.add(target); }
    unobserve(target: Element) { observed.delete(target); }
    disconnect() { observed.clear(); }
  } as unknown as typeof ResizeObserver;
  globalThis.MutationObserver = class {
    constructor(callback: MutationCallback) { mutate = callback; }
    observe() {}
    disconnect() {}
  } as unknown as typeof MutationObserver;
  let nextFrame = 0;
  globalThis.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
  globalThis.cancelAnimationFrame = frame => { frames.delete(frame); };
  restore = () => { Object.assign(globalThis, originals); };
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  restore();
});

function fixture(firstRow = '<div data-role="user"></div>') {
  const scroller = document.createElement('div');
  scroller.innerHTML = `<div><div data-testid="chat-transcript"><div>${firstRow}<div data-role="user"></div><div data-role="user"></div></div></div></div>`;
  const inner = scroller.querySelector('[data-testid="chat-transcript"]')!.firstElementChild!;
  const rows = [...inner.children] as HTMLElement[];
  const tops = [0, 200, 400];
  const reads = [0, 0, 0];
  for (const [index, row] of rows.entries()) {
    Object.defineProperties(row, {
      offsetParent: { get: () => scroller },
      offsetHeight: { get: () => 32 },
      offsetTop: { get: () => {
        reads[index]!++;
        return row.style.position === 'sticky' ? scroller.scrollTop + 8 : tops[index]! + (parseFloat(row.style.top) || 0);
      } },
    });
  }
  scroller.scrollTop = 260;
  const effect = spyOn(React, 'useEffect').mockImplementation(callback => { cleanup = callback() as () => void; });
  try { useStickyUserMessage({ current: scroller }); }
  finally { effect.mockRestore(); }
  const scroll = (top: number) => {
    scroller.scrollTop = top;
    scroller.dispatchEvent(new Event('scroll'));
    for (const [frame, callback] of [...frames]) {
      frames.delete(frame);
      callback(0);
    }
  };
  return { scroller, inner, rows, tops, reads, scroll };
}

it('scrolls within the current pin without releasing and remeasuring the sticky row', () => {
  const { rows, reads, scroll } = fixture();
  expect(rows[1]!.hasAttribute('data-stuck')).toBe(true);
  reads.fill(0);
  scroll(280);
  expect(rows[1]!.style.position).toBe('sticky');
  expect(reads[1]).toBe(0);
  scroll(440);
  expect(rows[2]!.hasAttribute('data-stuck')).toBe(true);
  expect(rows[1]!.hasAttribute('data-stuck')).toBe(false);
});

it('pins an import’s running setup row the way it pins a passed prompt (ONL-2961)', () => {
  const { rows, scroll } = fixture('<div data-chat-pin="setup"></div>');
  scroll(100);
  expect(rows[0]!.hasAttribute('data-stuck')).toBe(true);
  scroll(260);
  expect(rows[0]!.hasAttribute('data-stuck')).toBe(false);
  expect(rows[1]!.hasAttribute('data-stuck')).toBe(true);
});

it('observes individual rows so an equal-height redistribution invalidates the pinned offset', () => {
  const { rows, tops, reads } = fixture();
  expect(rows.every(row => observed.has(row))).toBe(true);
  reads.fill(0);
  tops[1] = 320;
  resize([{ target: rows[0] }] as unknown as ResizeObserverEntry[], {} as ResizeObserver);
  expect(reads[1]).toBe(1);
  expect(rows[0]!.hasAttribute('data-stuck')).toBe(true);
  expect(rows[1]!.hasAttribute('data-stuck')).toBe(false);
});

it('observes appended rows and releases removed observations', () => {
  const { inner, rows } = fixture();
  const added = inner.ownerDocument.createElement('div');
  inner.appendChild(added);
  rows[0]!.remove();
  mutate([{ type: 'childList', target: inner }] as unknown as MutationRecord[], {} as MutationObserver);
  expect(observed.has(added)).toBe(true);
  expect(observed.has(rows[0]!)).toBe(false);
});

it('keeps the pinned offset when streaming below it only changes container height', () => {
  const { scroller, rows, reads } = fixture();
  const container = { target: scroller, contentRect: { width: 300 } };
  resize([container] as unknown as ResizeObserverEntry[], {} as ResizeObserver);
  reads.fill(0);
  resize([container, { target: rows[2] }] as unknown as ResizeObserverEntry[], {} as ResizeObserver);
  expect(reads[1]).toBe(0);
  expect(rows[1]!.style.position).toBe('sticky');
});

it('remeasures the pinned offset when the container width changes', () => {
  const { scroller, reads } = fixture();
  resize([{ target: scroller, contentRect: { width: 300 } }] as unknown as ResizeObserverEntry[], {} as ResizeObserver);
  reads.fill(0);
  resize([{ target: scroller, contentRect: { width: 280 } }] as unknown as ResizeObserverEntry[], {} as ResizeObserver);
  expect(reads[1]).toBe(1);
});

it('updates push-out after a later assistant resizes without remeasuring the pin', () => {
  const { inner, rows, tops, reads, scroll } = fixture();
  const assistant = document.createElement('div');
  rows[2]!.before(assistant);
  mutate([{ type: 'childList', target: inner }] as unknown as MutationRecord[], {} as MutationObserver);
  scroll(260);
  reads.fill(0);
  tops[2] = 300;
  resize([{ target: assistant }] as unknown as ResizeObserverEntry[], {} as ResizeObserver);
  expect(rows[1]!.style.position).toBe('relative');
  expect(rows[1]!.style.top).toBe('60px');
  expect(rows[1]!.style.getPropertyValue('--stuck')).toBe('1');
  expect(reads[1]).toBe(0);
  tops[2] = 430;
  resize([{ target: assistant }] as unknown as ResizeObserverEntry[], {} as ResizeObserver);
  expect(rows[1]!.style.position).toBe('sticky');
  expect(rows[1]!.style.top).toBe('8px');
  expect(reads[1]).toBe(0);
});

it('ignores its own pin styles but invalidates a containing layout style change', () => {
  const { inner, rows, reads, scroll } = fixture();
  reads.fill(0);
  mutate([{ type: 'attributes', target: rows[1], attributeName: 'style' }] as unknown as MutationRecord[], {} as MutationObserver);
  scroll(280);
  expect(reads[1]).toBe(0);
  mutate([{ type: 'attributes', target: inner, attributeName: 'class' }] as unknown as MutationRecord[], {} as MutationObserver);
  scroll(290);
  expect(reads[1]).toBe(1);
});
