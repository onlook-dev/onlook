import { afterEach, expect, it, spyOn } from 'bun:test';
import { createRequire } from 'node:module';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { OnMove, ReactFlowState, Viewport } from '@xyflow/react';
import { takeComplaints } from '../testing/dom.js';
import { beginCameraMotion, endCameraMotion, noteCameraMotion, resetCameraMotion, useCameraMotion, useCameraMotionLifetime } from './cameraMotion.js';

type PanZoomFactory = (options: {
  domNode: Element;
  minZoom: number;
  maxZoom: number;
  translateExtent: ReactFlowState['translateExtent'];
  viewport: Viewport;
  onDraggingChange: (dragging: boolean) => void;
  onPanZoomStart: OnMove;
  onPanZoom: OnMove;
  onPanZoomEnd: OnMove;
}) => NonNullable<ReactFlowState['panZoom']>;

const fromReact = createRequire(createRequire(import.meta.url).resolve('@xyflow/react'));
const { XYPanZoom } = fromReact('@xyflow/system') as { XYPanZoom: PanZoomFactory };

afterEach(() => {
  resetCameraMotion();
  expect(takeComplaints()).toEqual([]);
});

function CameraMotionLifetime(): null {
  useCameraMotionLifetime();
  return null;
}

function panZoomFixture(expectedEnds: number, onStart?: OnMove, initiallyPanOnScroll = true) {
  const lifetimeHost = document.createElement('div');
  document.body.appendChild(lifetimeHost);
  const root = createRoot(lifetimeHost);
  act(() => { root.render(createElement(CameraMotionLifetime)); });
  const pane = document.createElement('div');
  document.body.appendChild(pane);
  pane.getBoundingClientRect = () => new DOMRect(0, 0, 1000, 700);
  const events: string[] = [];
  let movedWhileReleased = false;
  let ended = 0;
  let panOnScroll = initiallyPanOnScroll;
  let finish: () => void = () => {};
  const finished = new Promise<void>((resolve) => { finish = resolve; });
  const panZoom = XYPanZoom({
    domNode: pane,
    minZoom: 0.1,
    maxZoom: 4,
    translateExtent: [[-Infinity, -Infinity], [Infinity, Infinity]],
    viewport: { x: 0, y: 0, zoom: 1 },
    onDraggingChange: () => {},
    onPanZoomStart: (event, viewport) => {
      events.push(`start:${event?.type ?? 'programmatic'}`);
      beginCameraMotion(event);
      onStart?.(event, viewport);
    },
    onPanZoom: () => {
      noteCameraMotion();
      if (!useCameraMotion.getState().moving) movedWhileReleased = true;
    },
    onPanZoomEnd: (event) => {
      events.push(`end:${event?.type ?? 'programmatic'}`);
      endCameraMotion(event);
      ended += 1;
      if (ended === expectedEnds) finish();
    },
  });
  const update = (): void => { panZoom.update({
    noWheelClassName: 'nowheel',
    noPanClassName: 'nopan',
    userSelectionActive: false,
    panOnScroll,
    panOnDrag: true,
    panOnScrollMode: 'free' as Parameters<typeof panZoom.update>[0]['panOnScrollMode'],
    panOnScrollSpeed: 0.5,
    preventScrolling: true,
    zoomOnPinch: true,
    zoomOnScroll: !panOnScroll,
    zoomOnDoubleClick: false,
    zoomActivationKeyPressed: false,
    lib: 'react',
    onTransformChange: () => {},
    connectionInProgress: false,
    paneClickDistance: 0,
  }); };
  update();
  let pointerHeld = false;
  const pressPointer = (): void => {
    pane.dispatchEvent(new MouseEvent('mousedown', {
      button: 0, clientX: 100, clientY: 100, view: window, bubbles: true, cancelable: true,
    }));
    pointerHeld = true;
  };
  const releasePointer = (): void => {
    window.dispatchEvent(new MouseEvent('mouseup', { button: 0, clientX: 100, clientY: 100, view: window, bubbles: true }));
    pointerHeld = false;
  };
  return {
    panZoom,
    pane,
    events,
    finished,
    pressPointer,
    releasePointer,
    setPanOnScroll: (value: boolean) => { panOnScroll = value; update(); },
    movedWhileReleased: () => movedWhileReleased,
    dispose: () => {
      if (pointerHeld) releasePointer();
      panZoom.destroy();
      act(() => { root.unmount(); });
      lifetimeHost.remove();
      pane.remove();
    },
  };
}

function captureDelayedEnd(action: () => void): () => void {
  const originalSetTimeout = globalThis.setTimeout;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let end: (() => void) | undefined;
  const timerSpy = spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void, delay?: number, ...args: unknown[]) => {
    if (delay !== 150 || end !== undefined) return originalSetTimeout(callback, delay, ...args);
    end = callback;
    timer = originalSetTimeout(() => {}, delay);
    return timer;
  }) as typeof setTimeout);
  try {
    action();
  } finally {
    timerSpy.mockRestore();
  }
  if (end === undefined) throw new Error('XYPanZoom did not schedule its delayed end');
  const callback = end;
  return () => { clearTimeout(timer); callback(); };
}

async function waitForCameraToSettle(): Promise<void> {
  if (!useCameraMotion.getState().moving) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error('Camera motion remained latched after XYPanZoom ended'));
    }, 1000);
    const unsubscribe = useCameraMotion.subscribe((state) => {
      if (state.moving) return;
      clearTimeout(timer);
      unsubscribe();
      resolve();
    });
  });
}

it.each([false, true])('holds wheel pan and animated zoom through the final end (metaKey=%s)', async (metaKey) => {
  let releaseWheelEnd: () => void = () => {};
  let movingAfterWheelEnd: boolean | undefined;
  const fixture = panZoomFixture(2, (event) => {
    if (event != null) return;
    releaseWheelEnd();
    movingAfterWheelEnd = useCameraMotion.getState().moving;
  });
  try {
    releaseWheelEnd = captureDelayedEnd(() => {
      fixture.pane.dispatchEvent(new WheelEvent('wheel', { deltaY: 10, metaKey, bubbles: true, cancelable: true }));
    });
    await fixture.panZoom.scaleTo(1.5, { duration: 64 });
    await fixture.finished;
    await waitForCameraToSettle();
    expect(fixture.events).toEqual(['start:wheel', 'start:programmatic', 'end:wheel', 'end:programmatic']);
    expect(movingAfterWheelEnd).toBe(true);
    expect(fixture.movedWhileReleased()).toBe(false);
    expect(useCameraMotion.getState().moving).toBe(false);
  } finally {
    fixture.dispose();
  }
}, 3000);

it('settles consecutive programmatic moves whose end callbacks coalesce', async () => {
  const fixture = panZoomFixture(1);
  try {
    const first = fixture.panZoom.setViewport({ x: 10, y: 0, zoom: 1 }, { duration: 0 });
    const second = fixture.panZoom.setViewport({ x: 20, y: 0, zoom: 1 }, { duration: 0 });
    await Promise.all([first, second]);
    expect(fixture.events).toEqual(['start:programmatic', 'start:programmatic']);
    expect(useCameraMotion.getState().moving).toBe(true);
    await fixture.finished;
    await waitForCameraToSettle();
    expect(fixture.events).toEqual(['start:programmatic', 'start:programmatic', 'end:programmatic']);
    expect(fixture.movedWhileReleased()).toBe(false);
    expect(useCameraMotion.getState().moving).toBe(false);
  } finally {
    fixture.dispose();
  }
}, 3000);

it('ignores an older D3 end while a newer D3 animation is moving', async () => {
  let releaseOlderEnd: () => void = () => {};
  let movingAfterOlderEnd: boolean | undefined;
  let starts = 0;
  const fixture = panZoomFixture(2, () => {
    starts += 1;
    if (starts !== 2) return;
    releaseOlderEnd();
    movingAfterOlderEnd = useCameraMotion.getState().moving;
  });
  try {
    let first: ReturnType<typeof fixture.panZoom.setViewport> | undefined;
    releaseOlderEnd = captureDelayedEnd(() => {
      first = fixture.panZoom.setViewport({ x: 10, y: 0, zoom: 1 }, { duration: 0 });
    });
    await first;
    await fixture.panZoom.scaleTo(1.5, { duration: 64 });
    await fixture.finished;
    await waitForCameraToSettle();
    expect(fixture.events).toEqual(['start:programmatic', 'start:programmatic', 'end:programmatic', 'end:programmatic']);
    expect(movingAfterOlderEnd).toBe(true);
    expect(fixture.movedWhileReleased()).toBe(false);
    expect(useCameraMotion.getState().moving).toBe(false);
  } finally {
    fixture.dispose();
  }
}, 3000);

it.each([true, false])('settles wheel motion after its mode changes (panOnScroll=%s)', async (panOnScroll) => {
  const fixture = panZoomFixture(1, undefined, panOnScroll);
  try {
    fixture.pane.dispatchEvent(new WheelEvent('wheel', { deltaY: 10, bubbles: true, cancelable: true }));
    fixture.pane.dispatchEvent(new WheelEvent('wheel', { deltaY: 12, bubbles: true, cancelable: true }));
    fixture.setPanOnScroll(!panOnScroll);
    await fixture.finished;
    await waitForCameraToSettle();
    expect(fixture.events).toEqual(['start:wheel', 'end:wheel']);
    expect(fixture.movedWhileReleased()).toBe(false);
    expect(useCameraMotion.getState().moving).toBe(false);
  } finally {
    fixture.dispose();
  }
}, 3000);

it('keeps a stationary mouse pan held when an older programmatic end arrives', async () => {
  const fixture = panZoomFixture(2);
  try {
    let first: ReturnType<typeof fixture.panZoom.setViewport> | undefined;
    const releaseOlderEnd = captureDelayedEnd(() => {
      first = fixture.panZoom.setViewport({ x: 10, y: 0, zoom: 1 }, { duration: 0 });
    });
    await first;
    fixture.pressPointer();
    releaseOlderEnd();
    await new Promise<void>((resolve) => { setTimeout(resolve, 200); });
    const movingWhileHeld = useCameraMotion.getState().moving;
    fixture.releasePointer();
    await fixture.finished;
    await waitForCameraToSettle();
    expect(fixture.events).toEqual(['start:programmatic', 'start:mousedown', 'end:programmatic', 'end:mouseup']);
    expect(movingWhileHeld).toBe(true);
    expect(fixture.movedWhileReleased()).toBe(false);
    expect(useCameraMotion.getState().moving).toBe(false);
  } finally {
    fixture.dispose();
  }
}, 3000);

it('settles when an instant viewport change cancels the mouse-up callback', async () => {
  const fixture = panZoomFixture(1);
  try {
    fixture.pressPointer();
    fixture.releasePointer();
    await fixture.panZoom.setViewport({ x: 10, y: 0, zoom: 1 }, { duration: 0 });
    await fixture.finished;
    await waitForCameraToSettle();
    expect(fixture.events).toEqual(['start:mousedown', 'start:programmatic', 'end:programmatic']);
    expect(fixture.movedWhileReleased()).toBe(false);
    expect(useCameraMotion.getState().moving).toBe(false);
  } finally {
    fixture.dispose();
  }
}, 3000);

it('keeps a newer stationary pan held when an older mouse-up callback arrives', async () => {
  const fixture = panZoomFixture(2);
  try {
    fixture.pressPointer();
    const releaseOlderEnd = captureDelayedEnd(() => { fixture.releasePointer(); });
    fixture.pressPointer();
    releaseOlderEnd();
    await new Promise<void>((resolve) => { setTimeout(resolve, 200); });
    const movingWhileHeld = useCameraMotion.getState().moving;
    fixture.releasePointer();
    await fixture.finished;
    await waitForCameraToSettle();
    expect(fixture.events).toEqual(['start:mousedown', 'start:mousedown', 'end:mouseup', 'end:mouseup']);
    expect(movingWhileHeld).toBe(true);
    expect(fixture.movedWhileReleased()).toBe(false);
    expect(useCameraMotion.getState().moving).toBe(false);
  } finally {
    fixture.dispose();
  }
}, 3000);

it('resets overlapping lifetimes and ignores late ends after teardown', () => {
  beginCameraMotion({ type: 'wheel' });
  beginCameraMotion(null);
  expect(useCameraMotion.getState().moving).toBe(true);
  resetCameraMotion();
  expect(useCameraMotion.getState().moving).toBe(false);
  endCameraMotion({ type: 'wheel' });
  endCameraMotion(null);
  expect(useCameraMotion.getState().moving).toBe(false);
});

it('releases a lost pointer on blur and resets motion on unmount', () => {
  const fixture = panZoomFixture(1);
  try {
    beginCameraMotion({ type: 'mousedown' });
    window.dispatchEvent(new Event('blur'));
    expect(useCameraMotion.getState().moving).toBe(false);
    beginCameraMotion({ type: 'wheel' });
    expect(useCameraMotion.getState().moving).toBe(true);
  } finally {
    fixture.dispose();
  }
  expect(useCameraMotion.getState().moving).toBe(false);
});
