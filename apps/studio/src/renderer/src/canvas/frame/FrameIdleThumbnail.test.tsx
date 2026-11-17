import { afterEach, expect, it, spyOn } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { takeComplaints } from '../../testing/dom.js';
import { useCameraMotion } from '../cameraMotion.js';
import { FrameIdleThumbnail } from './FrameIdleThumbnail.js';

let root: Root | undefined;
let container: HTMLElement | undefined;
let restoreDispatch: (() => void) | undefined;

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  root = undefined;
  container?.remove();
  container = undefined;
  restoreDispatch?.();
  restoreDispatch = undefined;
  useCameraMotion.setState({ moving: false });
  expect(takeComplaints()).toEqual([]);
});

for (const [width, height] of [[390, 844], [844, 390]]) {
  it(`preserves capture proportions in a ${width}x${height} placeholder box`, async () => {
    container = document.createElement('div');
    Object.assign(container.style, { position: 'relative', width: `${width}px`, height: `${height}px` });
    document.body.appendChild(container);
    root = createRoot(container);
    const thumbnail = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><circle cx="200" cy="200" r="100"/></svg>')}`;
    await act(async () => { root!.render(<FrameIdleThumbnail thumbnail={thumbnail} />); });
    const image = container.querySelector('img')!;
    expect(image.style.objectFit).toBe('contain');
    expect(image.style.objectPosition).toBe('left top');
    // It takes the press instead of passing it to the page it covers, which is live and invisible on a wake (ONL-2987).
    expect(image.style.pointerEvents).not.toBe('none');
    expect(image.alt).toBe('');
    expect(image.hasAttribute('tabindex')).toBe(false);
  });
}

it('defers a thumbnail that decodes during motion until the camera settles', async () => {
  let released = false;
  const dispatch = HTMLImageElement.prototype.dispatchEvent;
  const spy = spyOn(HTMLImageElement.prototype, 'dispatchEvent').mockImplementation(function (this: HTMLImageElement, event: Event) {
    if (event.type === 'load' && !released) return true;
    return dispatch.call(this, event);
  });
  restoreDispatch = () => { spy.mockRestore(); };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<FrameIdleThumbnail thumbnail="data:image/png;base64,thumb" />); });
  const image = container.querySelector('img')!;
  expect(image.style.opacity).toBe('0');
  await act(async () => { useCameraMotion.setState({ moving: true }); });
  released = true;
  await act(async () => { image.dispatchEvent(new Event('load')); });
  expect(image.style.opacity).toBe('0');
  await act(async () => { useCameraMotion.setState({ moving: false }); });
  expect(image.style.opacity).toBe('1');
});

it('holds an already-running crossfade for the duration of the next gesture', async () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<FrameIdleThumbnail thumbnail="data:image/png;base64,thumb" />); });
  const image = container.querySelector('img')!;
  let pauses = 0;
  let plays = 0;
  image.getAnimations = () => [{ pause: () => { pauses += 1; }, play: () => { plays += 1; } }] as unknown as Animation[];
  await act(async () => { useCameraMotion.setState({ moving: true }); });
  expect(pauses).toBe(1);
  expect(plays).toBe(0);
  await act(async () => { useCameraMotion.setState({ moving: false }); });
  expect(plays).toBe(1);
});
