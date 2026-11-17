import { afterEach, expect, it, spyOn } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ReactFlow, type NodeChange } from '@xyflow/react';
import { takeComplaints } from '../testing/dom.js';

const cleanups: (() => void)[] = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  expect(takeComplaints()).toEqual([]);
});

async function observerFixture() {
  const observers: (ResizeObserver & { callback: ResizeObserverCallback; targets: Set<Element> })[] = [];
  const originalObserver = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class {
    targets = new Set<Element>();
    constructor(readonly callback: ResizeObserverCallback) { observers.push(this); }
    observe(target: Element) { this.targets.add(target); }
    unobserve(target: Element) { this.targets.delete(target); }
    disconnect() { this.targets.clear(); }
  };
  cleanups.push(() => { globalThis.ResizeObserver = originalObserver; });
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  const request = spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  const cancel = spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id); });
  cleanups.push(() => { request.mockRestore(); cancel.mockRestore(); });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  let mounted = true;
  const unmount = () => {
    if (mounted) act(() => { root.unmount(); });
    mounted = false;
  };
  cleanups.push(() => { unmount(); host.remove(); });
  const changes: NodeChange[][] = [];
  await act(async () => {
    root.render(<ReactFlow defaultNodes={['one', 'two'].map(id => ({ id, position: { x: 0, y: 0 }, data: { label: id } }))}
      onNodesChange={incoming => changes.push(incoming)} />);
  });
  const node = host.querySelector<HTMLElement>('.react-flow__node[data-id="one"]')!;
  expect(node).not.toBeNull();
  let width = 480;
  for (const target of host.querySelectorAll<HTMLElement>('.react-flow__node')) {
    Object.defineProperties(target, {
      offsetWidth: { get: () => width },
      offsetHeight: { get: () => 65 },
    });
  }
  const observer = observers.find(candidate => candidate.targets.has(node))!;
  expect(observer).toBeDefined();
  const deliver = (id = 'one') => act(() => {
    const target = host.querySelector<HTMLElement>(`.react-flow__node[data-id="${id}"]`)!;
    observer.callback([{ target, contentRect: new DOMRect(0, 0, width, 65), borderBoxSize: [], contentBoxSize: [], devicePixelContentBoxSize: [] }], observer);
  });
  const flush = () => act(() => {
    const callbacks = [...frames.values()];
    frames.clear();
    for (const callback of callbacks) callback(16);
  });
  return { changes, frames, deliver, flush, unmount, observer, setWidth: (value: number) => { width = value; } };
}

it('publishes node measurements after observer delivery and coalesces the latest size', async () => {
  const fixture = await observerFixture();
  fixture.deliver();
  fixture.setWidth(720);
  fixture.deliver();
  expect(fixture.changes).toEqual([]);
  expect(fixture.frames.size).toBe(1);
  fixture.flush();
  expect(fixture.changes).toEqual([[{ id: 'one', type: 'dimensions', dimensions: { width: 720, height: 65 } }]]);
  fixture.setWidth(800);
  fixture.deliver();
  expect(fixture.changes).toHaveLength(1);
  fixture.flush();
  expect(fixture.changes.at(-1)).toEqual([{ id: 'one', type: 'dimensions', dimensions: { width: 800, height: 65 } }]);
});

it('cancels a pending node measurement when its canvas unmounts', async () => {
  const fixture = await observerFixture();
  fixture.deliver();
  expect(fixture.frames.size).toBe(1);
  fixture.unmount();
  expect(fixture.frames.size).toBe(0);
  expect(fixture.observer.targets.size).toBe(0);
  fixture.flush();
  expect(fixture.changes).toEqual([]);
});

it('retains every node delivered before the next animation frame', async () => {
  const fixture = await observerFixture();
  fixture.deliver('one');
  fixture.deliver('two');
  expect(fixture.changes).toEqual([]);
  expect(fixture.frames.size).toBe(1);
  fixture.flush();
  expect(fixture.changes).toEqual([['one', 'two'].map(id => ({ id, type: 'dimensions', dimensions: { width: 480, height: 65 } }))]);
});

it('uses the same node observer implementation in the browser and Node builds', () => {
  const require = createRequire(import.meta.url);
  const directory = dirname(require.resolve('@xyflow/react/package.json'));
  expect(readFileSync(join(directory, 'dist/esm/index.js'), 'utf8'))
    .toBe(readFileSync(join(directory, 'dist/esm/index.mjs'), 'utf8'));
});
