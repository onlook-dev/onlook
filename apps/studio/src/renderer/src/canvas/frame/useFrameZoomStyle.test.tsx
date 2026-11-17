import { takeComplaints } from '../../testing/dom.js';
import { afterEach, expect, it } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ReactFlowProvider, useStoreApi } from '@xyflow/react';
import { useFrameZoomStyle } from './useFrameZoomStyle.js';

let root: Root | undefined;
let container: HTMLElement | undefined;
afterEach(async () => {
  await act(async () => { root?.unmount(); });
  root = undefined;
  container?.remove();
  expect(takeComplaints()).toEqual([]);
});

it('updates the inherited scale without rerenders or a subscription surviving unmount', async () => {
  let store: ReturnType<typeof useStoreApi>;
  let renders = 0;
  function Surface(): null {
    store = useStoreApi();
    renders += 1;
    useFrameZoomStyle();
    return null;
  }
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<ReactFlowProvider><Surface /></ReactFlowProvider>); });
  const canvas = document.createElement('div');
  await act(async () => { store!.setState({ domNode: canvas }); });
  expect(canvas.style.getPropertyValue('--frame-zoom')).toBe('1');
  for (const zoom of [0.5, 0.1, 2]) {
    await act(async () => { store!.setState({ transform: [20, 30, zoom] }); });
    expect(canvas.style.getPropertyValue('--frame-zoom')).toBe(String(zoom));
  }
  expect(renders).toBe(1);
  await act(async () => { store!.setState({ transform: [40, 50, 2] }); });
  expect(canvas.style.getPropertyValue('--frame-zoom')).toBe('2');
  const replacementCanvas = document.createElement('div');
  await act(async () => { store!.setState({ domNode: replacementCanvas }); });
  expect(replacementCanvas.style.getPropertyValue('--frame-zoom')).toBe('2');
  expect(renders).toBe(1);
  await act(async () => { root!.unmount(); });
  root = undefined;
  store!.setState({ transform: [0, 0, 3] });
  expect(canvas.style.getPropertyValue('--frame-zoom')).toBe('2');
  expect(replacementCanvas.style.getPropertyValue('--frame-zoom')).toBe('2');
});
