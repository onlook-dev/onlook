import { expect, it, spyOn } from 'bun:test';
import '../../testing/dom.js';
import type { ArtifactSnapshot, StudioBridge } from '@studio/events';
import type { WebviewTag } from 'electron';
import { bindArtifactSnapshot } from './snapshotGuest.js';
import { artifactSnapshots } from './snapshots.js';
import { useCameraMotion } from '../cameraMotion.js';

function rig(key: string, read: StudioBridge['artifactSnapshot'], options = { loading: true, url: 'studio-artifact://a/pages/index.html' }) {
  const timeouts = new Map<number, () => void>();
  const paints = new Map<number, () => void>();
  const idles = new Map<number, () => void>();
  let sequence = 0;
  const schedule = (queue: Map<number, () => void>) => (callback: () => void) => { const id = ++sequence; queue.set(id, callback); return id; };
  const flush = (queue: Map<number, () => void>) => { const jobs = [...queue.values()]; queue.clear(); for (const job of jobs) job(); };
  let intersect!: (entries: { isIntersecting: boolean }[]) => void;
  let disconnected = false;
  const globals = {
    requestAnimationFrame: schedule(paints), cancelAnimationFrame: (id: number) => { paints.delete(id); },
    requestIdleCallback: schedule(idles), cancelIdleCallback: (id: number) => { idles.delete(id); },
    IntersectionObserver: class {
      constructor(callback: typeof intersect) { intersect = callback; }
      observe() {}
      disconnect() { disconnected = true; }
    },
  };
  const descriptors = Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  const set = spyOn(globalThis, 'setTimeout').mockImplementation(schedule(timeouts) as typeof setTimeout);
  const clear = spyOn(globalThis, 'clearTimeout').mockImplementation(((id: number) => { timeouts.delete(id); }) as typeof clearTimeout);
  const previous = window.studio;
  window.studio = { artifactSnapshot: read } as unknown as StudioBridge;
  const guest = Object.assign(document.createElement('div'), { getWebContentsId: () => 21, isLoading: () => options.loading, getURL: () => options.url });
  const loaded: (string | null)[] = [];
  const cleanup = bindArtifactSnapshot(guest as unknown as WebviewTag, key, 'studio-artifact://a/pages/index.html', (value) => loaded.push(value));
  return {
    timeouts, paints, idles, flush, guest, loaded, cleanup,
    intersect: (visible: boolean) => intersect([{ isIntersecting: visible }]),
    disconnected: () => disconnected,
    restore: () => {
      cleanup(); set.mockRestore(); clear.mockRestore(); window.studio = previous;
      useCameraMotion.setState({ moving: false });
      for (const [key, descriptor] of descriptors) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}

it('retries a transient miss and motion during idle, then cancels all work when the page departs', async () => {
  let reads = 0;
  const key = 'lifecycle-test';
  const test = rig(key, async () => { reads += 1; return reads === 1 ? null : { image: 'last-pixels', width: 400, height: 250 }; });
  const { guest, loaded, flush, paints, timeouts, idles, cleanup } = test;
  try {
    guest.dispatchEvent(new Event('did-finish-load'));
    flush(paints);
    expect(loaded).toEqual([]);
    flush(paints);
    expect(loaded).toEqual([key]);
    flush(timeouts);
    expect(idles.size).toBe(0);
    test.intersect(true);
    useCameraMotion.setState({ moving: true });
    flush(timeouts);
    expect(idles.size).toBe(0);
    useCameraMotion.setState({ moving: false });
    flush(timeouts);
    flush(idles);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(reads).toBe(1);
    expect(artifactSnapshots.peek(key)).toBeUndefined();
    expect(timeouts.size).toBe(1);
    flush(timeouts);
    useCameraMotion.setState({ moving: true });
    flush(idles);
    useCameraMotion.setState({ moving: false });
    flush(timeouts);
    flush(idles);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(reads).toBe(2);
    expect(artifactSnapshots.peek(key)?.image).toBe('last-pixels');
    guest.dispatchEvent(new Event('did-start-loading'));
    expect(loaded.at(-1)).toBeNull();
    guest.dispatchEvent(new Event('did-finish-load'));
    cleanup();
    expect(test.disconnected()).toBe(true);
    expect(timeouts.size + paints.size + idles.size).toBe(0);
    guest.dispatchEvent(new Event('did-finish-load'));
    expect(timeouts.size + paints.size + idles.size).toBe(0);
  } finally {
    test.restore();
  }
});

it('releases an already-loaded matching guest after exactly two paints and captures only when visible and idle', async () => {
  let reads = 0;
  const key = 'already-loaded-test';
  const picture = { image: 'loaded-pixels', width: 400, height: 250 };
  const test = rig(key, async () => { reads += 1; return picture; }, { loading: false, url: 'studio-artifact://a/pages/index.html' });
  try {
    expect(test.loaded).toEqual([]);
    expect(test.paints.size).toBe(1);
    test.flush(test.paints);
    expect(test.loaded).toEqual([]);
    expect(test.paints.size).toBe(1);
    test.flush(test.paints);
    expect(test.loaded).toEqual([key]);
    expect(test.paints.size).toBe(0);
    test.flush(test.timeouts);
    test.flush(test.idles);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(reads).toBe(0);
    test.intersect(true);
    test.flush(test.timeouts);
    expect(test.idles.size).toBe(1);
    expect(reads).toBe(0);
    test.flush(test.idles);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(reads).toBe(1);
    expect(artifactSnapshots.peek(key)).toEqual(picture);
  } finally { test.restore(); }
});

it('does not publish readiness or capture an already-loaded guest at a different URL', async () => {
  let reads = 0;
  const key = 'mismatched-loaded-test';
  const test = rig(key, async () => { reads += 1; return null; }, { loading: false, url: 'studio-artifact://other/pages/index.html' });
  try {
    test.intersect(true);
    test.flush(test.paints);
    test.flush(test.paints);
    test.flush(test.timeouts);
    test.flush(test.idles);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(test.loaded).toEqual([]);
    expect(reads).toBe(0);
    expect(artifactSnapshots.peek(key)).toBeUndefined();
    expect(test.timeouts.size + test.paints.size + test.idles.size).toBe(0);
  } finally { test.restore(); }
});

for (const departure of ['reload', 'cleanup'] as const) {
  it(`discards a deferred snapshot after ${departure} and lets the replacement generation recover`, async () => {
    let finish!: (value: ArtifactSnapshot) => void;
    let reads = 0;
    const key = `deferred-${departure}-test`;
    const picture = { image: 'replacement-pixels', width: 400, height: 250 };
    const test = rig(key, () => {
      reads += 1;
      return reads === 1 ? new Promise((resolve) => { finish = resolve; }) : Promise.resolve(picture);
    });
    let replacementCleanup: (() => void) | undefined;
    try {
      test.guest.dispatchEvent(new Event('did-finish-load'));
      test.intersect(true);
      test.flush(test.timeouts);
      test.flush(test.idles);
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(reads).toBe(1);
      if (departure === 'reload') test.guest.dispatchEvent(new Event('did-start-loading'));
      else test.cleanup();
      if (departure === 'cleanup') {
        replacementCleanup = bindArtifactSnapshot(test.guest as unknown as WebviewTag, key, 'studio-artifact://a/pages/index.html', (value) => test.loaded.push(value));
      }
      test.guest.dispatchEvent(new Event('did-finish-load'));
      test.intersect(true);
      finish({ ...picture, image: 'stale-pixels' });
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(artifactSnapshots.peek(key)).toBeUndefined();
      test.flush(test.timeouts);
      test.flush(test.idles);
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(reads).toBe(2);
      expect(artifactSnapshots.peek(key)).toEqual(picture);
    } finally { replacementCleanup?.(); test.restore(); }
  });
}

for (const thirdSucceeds of [false, true]) {
  it(`bounds queued camera-rest retries to three bridge calls${thirdSucceeds ? ' and accepts the third success' : ''}`, async () => {
    let finish!: (value: ArtifactSnapshot | null) => void;
    let reads = 0;
    const key = `queued-retries-${thirdSucceeds}-test`;
    const picture = { image: 'third-attempt-pixels', width: 400, height: 250 };
    const test = rig(key, () => {
      reads += 1;
      if (reads === 1) return new Promise((resolve) => { finish = resolve; });
      return Promise.resolve(thirdSucceeds && reads === 3 ? picture : null);
    });
    try {
      test.guest.dispatchEvent(new Event('did-finish-load'));
      test.intersect(true);
      test.flush(test.timeouts);
      test.flush(test.idles);
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(reads).toBe(1);
      for (let cycle = 0; cycle < 3; cycle += 1) {
        useCameraMotion.setState({ moving: true });
        useCameraMotion.setState({ moving: false });
        test.flush(test.timeouts);
        test.flush(test.idles);
      }
      expect(reads).toBe(1);
      finish(null);
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(reads).toBe(3);
      expect(artifactSnapshots.peek(key)).toEqual(thirdSucceeds ? picture : undefined);
      useCameraMotion.setState({ moving: true });
      useCameraMotion.setState({ moving: false });
      test.flush(test.timeouts);
      test.flush(test.idles);
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(reads).toBe(3);
      expect(test.timeouts.size + test.idles.size).toBe(0);
    } finally { test.restore(); }
  });
}
