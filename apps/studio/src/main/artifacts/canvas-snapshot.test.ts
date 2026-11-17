import { expect, it, spyOn } from 'bun:test';
import { EventEmitter } from 'node:events';
import type { Session, WebContents } from 'electron';
import { createArtifactSnapshotter } from './canvas-snapshot.js';

function rig(size = { width: 1600, height: 1000 }) {
  const session = {} as Session;
  const sender = { isDestroyed: () => false } as WebContents;
  let url = 'studio-artifact://artifact-a/pages/index.html';
  let captures = 0;
  let encodings = 0;
  let dimensions: { width: number; height: number } | undefined;
  let take = async () => ({
    isEmpty: () => false,
    getSize: () => size,
    toDataURL: () => { encodings += 1; return 'snapshot'; },
    resize: (size: { width: number; height: number }) => { dimensions = size; return { toDataURL: () => { encodings += 1; return 'snapshot'; } }; },
  });
  const guest = Object.assign(new EventEmitter(), {
    isDestroyed: () => false,
    isLoading: () => false,
    getType: () => 'webview',
    getURL: () => url,
    hostWebContents: sender,
    session,
    capturePage: () => { captures += 1; return take(); },
  });
  const capture = createArtifactSnapshotter((id) => id === 10 ? guest as unknown as WebContents : undefined, () => session);
  const request = { webContentsId: 10, url };
  return { capture, sender, guest, request, captures: () => captures, encodings: () => encodings, dimensions: () => dimensions, navigate: (next: string) => { url = next; guest.emit('did-start-loading'); }, defer: () => {
    const original = take;
    let finish!: (error?: Error) => void;
    take = () => new Promise((resolve, reject) => { finish = (error) => {
      take = original;
      if (error) reject(error);
      else void original().then(resolve);
    }; });
    return (error?: Error) => finish(error);
  } };
}

it('keeps tall canvas placeholders sharp at normal zoom without upscaling small pages', async () => {
  for (const size of [{ width: 780, height: 3800 }, { width: 320, height: 240 }]) {
    const test = rig(size);
    expect(await test.capture(test.sender, test.request)).toEqual({ image: 'snapshot', ...size });
    expect(test.dimensions()).toBeUndefined();
  }
});

it('bounds oversized snapshots while preserving portrait and landscape proportions', async () => {
  for (const [size, expected] of [
    [{ width: 2000, height: 8000 }, { width: 1024, height: 4096 }],
    [{ width: 8000, height: 2000 }, { width: 4096, height: 1024 }],
  ]) {
    const test = rig(size);
    expect(await test.capture(test.sender, test.request)).toEqual({ image: 'snapshot', ...expected });
  }
});

it('captures only the requesting tab’s artifact guest without retaining a window', async () => {
  const test = rig();
  expect(await test.capture({ isDestroyed: () => false } as WebContents, test.request)).toBeNull();
  expect(await test.capture(test.sender, { ...test.request, webContentsId: 11 })).toBeNull();
  expect(await test.capture(test.sender, { ...test.request, url: 'https://example.com' })).toBeNull();
  test.guest.session = {} as Session;
  expect(await test.capture(test.sender, test.request)).toBeNull();
  expect(test.captures()).toBe(0);
  const valid = rig();
  expect(await valid.capture(valid.sender, valid.request)).toEqual({ image: 'snapshot', width: 1600, height: 1000 });
  expect(valid.dimensions()).toBeUndefined();
});

it('refuses parallel captures and discards navigation even when the URL returns to the same page', async () => {
  const test = rig();
  const finish = test.defer();
  const pending = test.capture(test.sender, test.request);
  expect(await test.capture(test.sender, test.request)).toBeNull();
  test.navigate(test.request.url);
  finish();
  expect(await pending).toBeNull();
  expect(test.captures()).toBe(1);
  expect(test.guest.listenerCount('did-start-loading')).toBe(0);
});

it('releases the native capture lock and navigation listener after rejection', async () => {
  const test = rig();
  const finish = test.defer();
  const pending = test.capture(test.sender, test.request);
  finish(new Error('guest closed'));
  expect(await pending).toBeNull();
  expect(test.dimensions()).toBeUndefined();
  expect(test.encodings()).toBe(0);
  expect(test.guest.listenerCount('did-start-loading')).toBe(0);
  expect(await test.capture(test.sender, test.request)).toEqual({ image: 'snapshot', width: 1600, height: 1000 });
  expect(test.captures()).toBe(2);
  expect(test.encodings()).toBe(1);
});

for (const rejection of [false, true]) {
  it(`holds the native lock past the deadline until late ${rejection ? 'rejection' : 'success'}, then permits recovery without encoding the late image`, async () => {
    const test = rig();
    const finish = test.defer();
    let timeout!: () => void;
    const set = spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void) => { timeout = callback; return 123; }) as unknown as typeof setTimeout);
    const clear = spyOn(globalThis, 'clearTimeout').mockImplementation(() => {});
    try {
      const pending = test.capture(test.sender, test.request);
      timeout();
      expect(await pending).toBeNull();
      expect(await test.capture(test.sender, test.request)).toBeNull();
      expect(test.captures()).toBe(1);
      expect(test.guest.listenerCount('did-start-loading')).toBe(1);
      finish(rejection ? new Error('late guest failure') : undefined);
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(test.dimensions()).toBeUndefined();
      expect(test.encodings()).toBe(0);
      expect(test.guest.listenerCount('did-start-loading')).toBe(0);
      expect(await test.capture(test.sender, test.request)).toEqual({ image: 'snapshot', width: 1600, height: 1000 });
      expect(test.captures()).toBe(2);
      expect(test.encodings()).toBe(1);
      expect(test.guest.listenerCount('did-start-loading')).toBe(0);
    } finally { set.mockRestore(); clear.mockRestore(); }
  });
}

for (const change of ['owner', 'session', 'destroyed owner'] as const) {
  it(`discards captured pixels without encoding when the ${change} changes during capture`, async () => {
    const test = rig();
    const finish = test.defer();
    const pending = test.capture(test.sender, test.request);
    if (change === 'owner') test.guest.hostWebContents = { isDestroyed: () => false } as WebContents;
    else if (change === 'session') test.guest.session = {} as Session;
    else test.sender.isDestroyed = () => true;
    finish();
    expect(await pending).toBeNull();
    expect(test.captures()).toBe(1);
    expect(test.dimensions()).toBeUndefined();
    expect(test.encodings()).toBe(0);
    expect(test.guest.listenerCount('did-start-loading')).toBe(0);
  });
}
