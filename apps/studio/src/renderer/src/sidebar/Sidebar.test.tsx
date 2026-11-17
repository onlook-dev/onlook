import { afterEach, expect, it, mock } from 'bun:test';
import type { MouseEvent } from 'react';

const store = await import('../canvas/store.js');
let deselections = 0;
const canvas = { ...store.useCanvasStore.getState(), deselectFrames: () => { deselections += 1; } };
mock.module('../canvas/store.js', () => ({
  ...store,
  useCanvasStore: Object.assign(<Value,>(selector: (state: typeof canvas) => Value): Value => selector(canvas), store.useCanvasStore),
}));

const { Sidebar } = await import('./Sidebar.js');

afterEach(() => { deselections = 0; });

function click(inside: boolean, row: boolean, menu = false): void {
  const surface = Sidebar();
  const target = { closest: (selector: string) => (selector.includes('role="menu"') ? menu : row) ? {} : null };
  const currentTarget = { contains: (candidate: unknown) => candidate === target && inside };
  const props = surface.props as { onClick: (event: MouseEvent) => void };
  props.onClick({ target, currentTarget } as unknown as MouseEvent);
}

it('keeps the selected frame when its sidebar menu exports through a portal', () => {
  click(false, false);
  expect(deselections).toBe(0);
});

it('clears selection only on the sidebar ground', () => {
  click(true, false);
  expect(deselections).toBe(1);
});

it('keeps the selected frame when Export is in an inline sidebar menu', () => {
  click(true, false, true);
  expect(deselections).toBe(0);
});

it('leaves frame and page row selection to their own handlers', () => {
  click(true, true);
  expect(deselections).toBe(0);
});
