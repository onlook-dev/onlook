// Hook level: Bun has no DOM, so the row arrives as spied hooks over counting geometry, the MarqueeText precedent.

import { afterAll, beforeAll, expect, it, mock, spyOn } from 'bun:test';
import * as React from 'react';

import type { DesignRowFacts } from './designRow.js';

type Fire = (entry: ResizeObserverEntry) => void;

const registrations: { element: Element; fire: Fire }[] = [];
const releases: Element[] = [];
const utils = await import('@astryxdesign/core/utils');
mock.module('@astryxdesign/core/utils', () => ({
  ...utils,
  /* The singleton's own contract: one callback per element, fired once on registration with an entry carrying `target` alone. */
  observeResize: (element: Element, callback: Fire): void => {
    registrations.push({ element, fire: callback });
    callback({ target: element } as ResizeObserverEntry);
  },
  unobserveResize: (element: Element): void => {
    releases.push(element);
  },
}));

/* zustand reads its hooks off React's default export, which a namespace spy does not reach, so the row's store reads answer from state directly. */
const store = await import('../canvas/store.js');
const canvas = store.useCanvasStore.getState();
mock.module('../canvas/store.js', () => ({
  ...store,
  useCanvasStore: Object.assign(<T,>(selector: (state: typeof canvas) => T): T => selector(canvas), store.useCanvasStore),
}));

const { DesignRow } = await import('./DesignsList.js');

type RowProps = Parameters<typeof DesignRow>[0];

const FACTS: DesignRowFacts = { kind: 'browser', name: 'Checkout' };
const PROPS: RowProps = {
  id: 'frame-a',
  facts: FACTS,
  label: 'Checkout',
  isSelected: false,
  isWorking: false,
  phase: 0,
  depth: 0,
  reservesCaret: false,
};

/** The declared stack, which reads the same before and after the swap — the whole reason a cached width can be wrong. */
const DECLARED_FONT = '400 12px Inter, sans-serif';
const FALLBACK_PX_PER_CHAR = 6;
const WEBFONT_PX_PER_CHAR = 12;

const widths: string[] = [];
let perChar = FALLBACK_PX_PER_CHAR;
const measureContext = {
  font: '',
  measureText: (text: string): { width: number } => {
    widths.push(text);
    return { width: text.length * perChar };
  },
};

let landFont!: () => void;
const fontsReady = new Promise<void>((resolve) => {
  landFont = resolve;
});

const restore: (() => void)[] = [];
function globalValue(name: string, value: unknown): void {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  restore.push(() => {
    if (previous) Object.defineProperty(globalThis, name, previous);
    else Reflect.deleteProperty(globalThis, name);
  });
}

beforeAll(() => {
  globalValue('document', {
    createElement: () => ({ getContext: () => measureContext }),
    fonts: { ready: fontsReady },
  });
  globalValue('getComputedStyle', () => ({ font: DECLARED_FONT }));
});

afterAll(() => {
  for (const reset of restore.splice(0).reverse()) reset();
});

/** One mounted row: React's own dependency rule applied by hand, so a re-render only re-runs the effect React would. */
function mountRow(over: Partial<RowProps> = {}, labelWidth = 100) {
  let element = { clientWidth: 240 } as unknown as Element;
  let reads = 0;
  /** A node React has replaced is out of the document, where every box reads 0. */
  const makeLabel = (): { node: Element; detach: () => void } => {
    let attached = true;
    return {
      node: {
        get clientWidth(): number {
          reads += 1;
          return attached ? labelWidth : 0;
        },
      } as unknown as Element,
      detach: () => {
        attached = false;
      },
    };
  };
  let label = makeLabel();
  const answers: boolean[] = [];
  let props: RowProps = { ...PROPS, ...over };
  let deps: readonly unknown[] = [];
  let cleanup: (() => void) | undefined;

  const call = (): { callback: () => unknown; deps: readonly unknown[] } => {
    const effects: { callback: () => unknown; deps: readonly unknown[] }[] = [];
    const refs: unknown[] = [element, label.node];
    const spies = [
      spyOn(React, 'useEffect').mockImplementation((callback, dependencies) => {
        effects.push({ callback: callback as () => unknown, deps: dependencies ?? [] });
      }),
      spyOn(React, 'useRef').mockImplementation(() => ({ current: refs.shift() })),
      spyOn(React, 'useState').mockImplementation(() => [
        false,
        (next: unknown) => {
          answers.push(next as boolean);
        },
      ]),
    ];
    try {
      DesignRow(props);
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
    return effects[0]!;
  };

  const start = call();
  deps = start.deps;
  cleanup = start.callback() as () => void;

  return {
    get element(): Element {
      return element;
    },
    get label(): Element {
      return label.node;
    },
    answers,
    reads: () => reads,
    /** React replaces the host node when the `as` tag changes, so the next render's ref holds a different element. */
    swapElement(): Element {
      element = { clientWidth: 240 } as unknown as Element;
      return element;
    },
    /** `ShimmerText` returns a bare `Text` at rest and a wrapped one while working, so React mounts a new label node. */
    swapLabel(): Element {
      label.detach();
      label = makeLabel();
      return label.node;
    },
    rerender(next: Partial<RowProps>): void {
      props = { ...props, ...next };
      const again = call();
      if (again.deps.length === deps.length && again.deps.every((value, index) => value === deps[index])) return;
      cleanup?.();
      deps = again.deps;
      cleanup = again.callback() as () => void;
    },
    unmount(): void {
      cleanup?.();
    },
  };
}

it('reports a name wider than its box as cut off, and one that fits as whole', () => {
  const cut = mountRow({ label: 'A checkout page nobody can read the end of' });
  expect(cut.answers).toEqual([true]);
  cut.unmount();

  const whole = mountRow({ label: 'Checkout' });
  expect(whole.answers).toEqual([false]);
  whole.unmount();
});

it('measures once as the shared observer registers, reading the element and never the entry', () => {
  registrations.length = 0;
  const row = mountRow({ label: 'Pricing' });
  expect(registrations).toHaveLength(1);
  expect(registrations[0]!.element).toBe(row.element);
  expect(row.reads()).toBe(1);
  expect(row.answers).toHaveLength(1);

  /* A real resize arrives the same way, carrying `target` alone: a callback reaching for a box would throw here. */
  registrations[0]!.fire({ target: registrations[0]!.element } as ResizeObserverEntry);
  expect(row.reads()).toBe(2);
  row.unmount();
});

it('re-measures when a caret column appears elsewhere in the list or the row changes depth, and not on an unrelated paint', () => {
  const row = mountRow({ label: 'Settings' });
  expect(row.reads()).toBe(1);

  row.rerender({ reservesCaret: true });
  expect(row.reads()).toBe(2);

  row.rerender({ depth: 1 });
  expect(row.reads()).toBe(3);

  row.rerender({ isSelected: true });
  expect(row.reads()).toBe(3);
  row.unmount();
});

it('follows the row onto its new element when a rename swaps the host tag', () => {
  registrations.length = 0;
  releases.length = 0;
  const row = mountRow({ label: 'Homepage' });
  const before = row.element;
  expect(registrations[0]!.element).toBe(before);

  /* `as={isRenaming ? 'div' : 'button'}` is an element-type swap: React mounts a new node and the old one detaches (ONL-2650). */
  canvas.renamingFrameId = 'frame-a';
  const after = row.swapElement();
  row.rerender({});

  expect(releases).toContain(before);
  expect(registrations[1]!.element).toBe(after);

  canvas.renamingFrameId = null;
  row.unmount();
  expect(releases).toContain(after);
});

it('measures the label React replaced when the working state swaps the node, never the detached one', () => {
  registrations.length = 0;
  const row = mountRow({ label: 'Checkout' });
  expect(row.answers).toEqual([false]);

  /* The turn starts touching this frame, so `ShimmerText` wraps the label and React mounts a new node (ONL-2650). */
  row.swapLabel();
  row.rerender({ isWorking: true });

  /* The row's own box never changed, so a later resize fires on whichever registration the row still holds. */
  const live = registrations[registrations.length - 1]!;
  live.fire({ target: live.element } as ResizeObserverEntry);

  /* A detached node reports `clientWidth` 0, which would call every name cut off and give a fitting one a tooltip. */
  expect(row.answers).not.toContain(true);
  row.unmount();
});

it('goes back to the resting label node when the turn stops touching the frame', () => {
  registrations.length = 0;
  const row = mountRow({ label: 'Checkout', isWorking: true });
  row.swapLabel();
  row.rerender({ isWorking: false });

  const live = registrations[registrations.length - 1]!;
  live.fire({ target: live.element } as ResizeObserverEntry);
  expect(row.answers).not.toContain(true);
  row.unmount();
});

it('releases the element the row owns, never the label node Astryx already observes', () => {
  releases.length = 0;
  const row = mountRow({ label: 'Marketing' });
  row.unmount();
  expect(releases).toHaveLength(1);
  expect(releases[0]).toBe(row.element);
  expect(releases[0]).not.toBe(row.label);
});

it('re-measures a label from the landed webfont instead of answering from the fallback width', async () => {
  const label = 'Onboarding';
  const row = mountRow({ label });
  expect(row.answers).toEqual([false]);
  expect(widths.filter((text) => text === label)).toHaveLength(1);

  perChar = WEBFONT_PX_PER_CHAR;
  landFont();
  await fontsReady;
  await Promise.resolve();

  /* The declared stack is unchanged, so only a cleared cache can reach the canvas a second time (ONL-2650). */
  expect(widths.filter((text) => text === label)).toHaveLength(2);
  expect(row.answers).toEqual([false, true]);
  row.unmount();
});
