import { afterEach, beforeEach, expect, it, spyOn } from 'bun:test';
import * as React from 'react';
import { observeResize, unobserveResize } from '@astryxdesign/core/utils';
import { UserMessageClamp } from './UserMessageClamp.js';

type Box = { scrollHeight: number; clientHeight: number; maxHeight: string; isOpen?: boolean };

function box(values: Box): Element {
  return {
    scrollHeight: values.scrollHeight,
    clientHeight: values.clientHeight,
    maxHeight: values.maxHeight,
    getAttribute: (name: string) => (name === 'data-open' && values.isOpen === true ? 'true' : null),
  } as unknown as Element;
}

let constructed = 0;
let observed: unknown[] = [];
let unobserved: unknown[] = [];
let disconnects = 0;
let previousObserver: typeof ResizeObserver;
let previousStyle: typeof getComputedStyle;

beforeEach(() => {
  constructed = 0;
  observed = [];
  unobserved = [];
  disconnects = 0;
  previousObserver = globalThis.ResizeObserver;
  previousStyle = globalThis.getComputedStyle;
  globalThis.ResizeObserver = class {
    constructor() {
      constructed += 1;
    }
    observe(element: unknown) {
      observed.push(element);
    }
    unobserve(element: unknown) {
      unobserved.push(element);
    }
    disconnect() {
      disconnects += 1;
    }
  } as unknown as typeof ResizeObserver;
  globalThis.getComputedStyle = ((element: { maxHeight: string }) => ({ maxHeight: element.maxHeight })) as unknown as typeof getComputedStyle;
});

afterEach(() => {
  globalThis.ResizeObserver = previousObserver;
  globalThis.getComputedStyle = previousStyle;
});

function mount(elements: Element[]): { cleanups: (() => void)[]; updates: unknown[] } {
  const queue = [...elements];
  const effects: (() => unknown)[] = [];
  const updates: unknown[] = [];
  const ref = spyOn(React, 'useRef').mockImplementation(() => ({ current: queue.shift() }));
  const layout = spyOn(React, 'useLayoutEffect').mockImplementation((callback) => {
    effects.push(callback);
  });
  const state = spyOn(React, 'useState').mockImplementation(() => [false, (next: unknown) => { updates.push(next); }]);
  const callback = spyOn(React, 'useCallback').mockImplementation((fn) => fn);
  try {
    for (const _ of elements) UserMessageClamp({ children: 'A prompt' });
    return { cleanups: effects.map((run) => run() as () => void), updates };
  } finally {
    ref.mockRestore();
    layout.mockRestore();
    state.mockRestore();
    callback.mockRestore();
  }
}

it('latches two over-long prompts at registration through one shared observer', () => {
  const first = box({ scrollHeight: 400, clientHeight: 128, maxHeight: '128px' });
  const second = box({ scrollHeight: 200, clientHeight: 128, maxHeight: '128px' });
  const { cleanups, updates } = mount([first, second]);
  try {
    expect(constructed).toBe(1);
    expect(observed).toEqual([first, second]);
    expect(updates).toEqual([true, true]);
  } finally {
    for (const cleanup of cleanups) cleanup();
  }
});

it('leaves a prompt under its cap unclamped when a control overhangs its line', () => {
  const element = box({ scrollHeight: 72, clientHeight: 60, maxHeight: '128px' });
  const { cleanups, updates } = mount([element]);
  try {
    expect(updates).toEqual([false]);
  } finally {
    for (const cleanup of cleanups) cleanup();
  }
});

it('does not re-latch an open prompt whose own scrolling overflows', () => {
  const element = box({ scrollHeight: 400, clientHeight: 288, maxHeight: '288px', isOpen: true });
  const { cleanups, updates } = mount([element]);
  try {
    expect(observed).toEqual([element]);
    expect(updates).toEqual([]);
  } finally {
    for (const cleanup of cleanups) cleanup();
  }
});

it('unobserves its own element on unmount and leaves another consumer observing', () => {
  const sentinel = box({ scrollHeight: 0, clientHeight: 0, maxHeight: 'none' });
  observeResize(sentinel, () => {});
  try {
    const element = box({ scrollHeight: 400, clientHeight: 128, maxHeight: '128px' });
    const { cleanups } = mount([element]);
    expect(constructed).toBe(1);
    cleanups[0]!();
    expect(unobserved).toEqual([element]);
    expect(disconnects).toBe(0);
  } finally {
    unobserveResize(sentinel);
  }
  expect(disconnects).toBe(1);
});
