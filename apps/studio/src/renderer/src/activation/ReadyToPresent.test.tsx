import '../testing/dom.js';
import { afterEach, expect, it } from 'bun:test';
import { act, lazy, Suspense } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { installBridge } from '../testing/bridge.js';
import { takeComplaints } from '../testing/dom.js';
import { ReadyToPresent } from './ReadyToPresent.js';

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  root = undefined;
  container?.remove();
  container = undefined;
  expect(takeComplaints()).toEqual([]);
});

it('does not acknowledge a screen while its account boundary is still suspended', async () => {
  const paintedWidths: string[] = [];
  installBridge({ uiReady: () => { paintedWidths.push(container!.querySelector<HTMLElement>('aside')?.style.width ?? 'missing'); } });
  let release: ((module: { default: () => React.JSX.Element }) => void) | undefined;
  const Boundary = lazy(() => new Promise<{ default: () => React.JSX.Element }>(resolve => { release = resolve; }));
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<Suspense fallback={null}><Boundary /><ReadyToPresent screen="editor" /></Suspense>);
  });
  expect(paintedWidths).toEqual([]);
  await act(async () => { release!({ default: () => <aside style={{ width: 380 }} /> }); });
  expect(paintedWidths).toEqual(['380px']);
});

it('acknowledges parked and committed screens but never the pending frame', async () => {
  let acknowledgements = 0;
  installBridge({ uiReady: () => { acknowledgements += 1; } });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<ReadyToPresent screen="pending" />); });
  expect(acknowledgements).toBe(0);
  await act(async () => { root!.render(<ReadyToPresent screen="parked" />); });
  expect(acknowledgements).toBe(1);
  await act(async () => { root!.render(<ReadyToPresent screen="projects" />); });
  expect(acknowledgements).toBe(2);
});
