import '../testing/dom.js';
import { afterEach, expect, it } from 'bun:test';
import { act, lazy } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { installBridge } from '../testing/bridge.js';
import { takeComplaints } from '../testing/dom.js';
import { usePanelsStore } from '../panels/store.js';
import { ReadyToPresent } from './ReadyToPresent.js';
import { ScreenLoadingBoundary } from './ScreenLoadingBoundary.js';

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  root = undefined;
  container?.remove();
  container = undefined;
  expect(takeComplaints()).toEqual([]);
});

it('keeps the parked panels through a new or cold project’s first account-boundary load', async () => {
  let acknowledgements = 0;
  installBridge({ uiReady: () => { acknowledgements += 1; }, onPanelsChanged: () => () => {} });
  usePanelsStore.setState({ sidebar: 333, end: 411 });
  let release!: (module: { default: () => React.JSX.Element }) => void;
  const Boundary = lazy(() => new Promise<{ default: () => React.JSX.Element }>(resolve => { release = resolve; }));
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<ScreenLoadingBoundary hasProjectScaffold><Boundary /><ReadyToPresent screen="editor" /></ScreenLoadingBoundary>);
  });
  expect(container.querySelector('[data-testid="parked-rail-left"]')).not.toBeNull();
  expect(container.querySelector<HTMLElement>('[data-testid="parked-rail-right"]')?.style.width).toBe('411px');
  expect(acknowledgements).toBe(0);
  await act(async () => { release({ default: () => <main data-testid="complete-editor" /> }); });
  expect(container.querySelector('[data-testid="parked-surface"]')).toBeNull();
  expect(container.querySelector('[data-testid="complete-editor"]')).not.toBeNull();
  expect(acknowledgements).toBe(1);
});

it('does not put project panels behind a pending Projects or onboarding screen', async () => {
  const Boundary = lazy(() => new Promise<{ default: () => React.JSX.Element }>(() => {}));
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<ScreenLoadingBoundary hasProjectScaffold={false}><Boundary /></ScreenLoadingBoundary>); });
  expect(container.querySelector('[data-testid="parked-surface"]')).toBeNull();
});
