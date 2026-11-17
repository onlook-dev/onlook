import '../testing/dom.js';
import { afterEach, expect, it } from 'bun:test';
import { act, useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { PANEL_DEFAULTS, type PanelsState } from '@studio/events';
import { installBridge } from '../testing/bridge.js';
import { takeComplaints } from '../testing/dom.js';
import { ParkedTab } from '../ParkedScreen.js';
import { resetPanelsStoreForTesting, subscribeToPanelWidths, usePanelsStore } from './store.js';

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  root = undefined;
  container?.remove();
  container = undefined;
  resetPanelsStoreForTesting();
  expect(takeComplaints()).toEqual([]);
});

it('keeps a spare tab at the latest stored widths before it is promoted', async () => {
  let changed: ((state: PanelsState) => void) | undefined;
  installBridge({ onPanelsChanged: (listener) => { changed = listener; return () => {}; } });
  usePanelsStore.setState({ sidebar: 310, end: 380, code: 440 });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<ParkedTab />); });
  expect(container.querySelector<HTMLElement>('[data-testid="parked-rail-left"]')!.style.width).toBe('370px');
  await act(async () => {
    changed!({ sidebar: 320, end: 410, code: 440 });
    expect(container!.querySelector<HTMLElement>('[data-testid="parked-rail-left"]')!.style.width).toBe('380px');
    expect(container!.querySelector<HTMLElement>('[data-testid="parked-rail-right"]')!.style.width).toBe('410px');
  });
});

function Panels(): React.JSX.Element {
  const [panels, setPanels] = useState<PanelsState>(PANEL_DEFAULTS);
  useEffect(() => subscribeToPanelWidths(setPanels), []);
  return <aside style={{ width: panels.sidebar }}><div style={{ width: panels.end }} /></aside>;
}

it('commits broadcast panel widths before returning control to the wake acknowledgement', async () => {
  let changed: ((state: PanelsState) => void) | undefined;
  installBridge({ onPanelsChanged: (listener) => { changed = listener; return () => {}; } });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<Panels />); });
  await act(async () => {
    changed!({ sidebar: 310, end: 380, code: 440 });
    expect(container!.querySelector('aside')!.style.width).toBe('310px');
    expect(container!.querySelector('aside > div')!.getAttribute('style')).toContain('380px');
  });
});
