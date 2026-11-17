import { expect, it, spyOn } from 'bun:test';
import * as React from 'react';
import { MarqueeText } from './MarqueeText.js';

it('waits for the batched resize observation instead of measuring every title while the panel mounts', () => {
  let reads = 0;
  const box = { get clientWidth() { reads += 1; return 100; } };
  const line = { get scrollWidth() { reads += 1; return 200; } };
  const refs = [box, line, []];
  const effects: (() => unknown)[] = [];
  const effect = spyOn(React, 'useEffect').mockImplementation((callback) => { effects.push(callback); });
  const layout = spyOn(React, 'useLayoutEffect').mockImplementation((callback) => { effects.push(callback); });
  const ref = spyOn(React, 'useRef').mockImplementation(() => ({ current: refs.shift() }));
  const updates: unknown[] = [];
  const state = spyOn(React, 'useState').mockImplementation(() => [false, (next: unknown) => { updates.push(next); }]);
  const previous = globalThis.ResizeObserver;
  let resized: (() => void) | undefined;
  let disconnected = false;
  const observed: unknown[] = [];
  globalThis.ResizeObserver = class {
    constructor(callback: () => void) { resized = callback; }
    observe(element: unknown) { observed.push(element); }
    disconnect() { disconnected = true; }
    unobserve() {}
  } as unknown as typeof ResizeObserver;
  try {
    MarqueeText({ children: 'A long artifact title' });
    const cleanup = effects[0]!() as () => void;
    expect(reads).toBe(0);
    expect(layout).not.toHaveBeenCalled();
    expect(observed).toEqual([box, line]);
    resized!();
    expect(reads).toBe(2);
    expect(updates).toEqual([true]);
    cleanup();
    expect(disconnected).toBe(true);
  } finally {
    globalThis.ResizeObserver = previous;
    effect.mockRestore();
    layout.mockRestore();
    ref.mockRestore();
    state.mockRestore();
  }
});
