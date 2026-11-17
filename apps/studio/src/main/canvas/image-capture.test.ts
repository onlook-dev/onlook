import { expect, it } from 'bun:test';
import type { WebContents } from 'electron';
import { captureImagePixels, flattenOnWhite } from './image-capture.js';
import { MAX_EXPORT_BYTES } from './image-export.js';

function bench(pixelScale = 1) {
  const captures: unknown[] = [];
  const resized: unknown[] = [];
  const viewport = { width: 800, height: 600, ratio: 2, x: 0, y: 250 };
  const image = { getScaleFactors: () => [pixelScale], toPNG: (options: unknown) => { captures.push(options); return Buffer.from('native pixels'); } };
  const guest = {
    isDestroyed: () => false,
    capturePage: async (...args: unknown[]) => { captures.push(args); return image; },
    executeJavaScriptInIsolatedWorld: async () => viewport,
    get debugger(): never { throw new Error('Export must not emulate or resize the live page'); },
  };
  const codec = {
    readSize: () => ({ width: 800 * pixelScale, height: 600 * pixelScale }),
    resize: (bytes: Buffer, width: number, height: number) => { resized.push({ bytes, width, height }); return Buffer.from('downsampled pixels'); },
  };
  return { guest, viewport, codec, captures, resized, capture: (format: 'png' | 'png-2x' = 'png', timeout = 10000) => captureImagePixels(guest as unknown as WebContents, 800, 600, format, codec, timeout) };
}

it('captures native pixels without a scaled CDP screenshot or a debugger, independent of reported DPR', async () => {
  for (const ratio of [1, 1.5, 2]) {
    const test = bench();
    test.viewport.ratio = ratio;
    expect(await test.capture()).toEqual(Buffer.from('native pixels'));
    expect(test.resized).toEqual([]);
    expect(test.captures).toEqual([
      [{ x: 0, y: 0, width: 1, height: 1 }, { stayHidden: true, stayAwake: true }],
      [undefined, { stayHidden: true, stayAwake: true }],
      { scaleFactor: 1 },
    ]);
  }
});

it('uses the largest native representation and only downsamples for PNG 1x', async () => {
  const test = bench(2);
  expect(await test.capture()).toEqual(Buffer.from('downsampled pixels'));
  expect(test.captures.at(-1)).toEqual({ scaleFactor: 2 });
  expect(test.resized).toEqual([{ bytes: Buffer.from('native pixels'), width: 800, height: 600 }]);
});

it('never manufactures 2x pixels by upscaling a 1x snapshot', async () => {
  const test = bench();
  await expect(test.capture('png-2x')).rejects.toMatchObject({ reason: 'resolution' });
  expect(test.resized).toEqual([]);
  const retina = bench(2);
  expect(await retina.capture('png-2x')).toEqual(Buffer.from('native pixels'));
  expect(retina.resized).toEqual([]);
});

it('refuses changed viewport dimensions before the final snapshot', async () => {
  const test = bench();
  test.viewport.width = 500;
  await expect(test.capture()).rejects.toMatchObject({ reason: 'unavailable' });
  expect(test.captures).toHaveLength(1);
});

it('waits for rendering after waking the frame and before the final snapshot', async () => {
  const test = bench();
  let release = (): void => {};
  let started = (): void => {};
  const waiting = new Promise<void>(resolve => { started = resolve; });
  test.guest.executeJavaScriptInIsolatedWorld = async (...args: unknown[]) => {
    expect(JSON.stringify(args)).toContain('requestAnimationFrame(() => requestAnimationFrame(');
    expect(test.captures).toHaveLength(1);
    started();
    await new Promise<void>(resolve => { release = resolve; });
    return test.viewport;
  };
  const captured = test.capture();
  await waiting;
  expect(test.captures).toHaveLength(1);
  release();
  await captured;
  expect(test.captures).toHaveLength(3);
});

it('times out without taking a late final snapshot', async () => {
  const test = bench();
  let release = (): void => {};
  test.guest.executeJavaScriptInIsolatedWorld = async () => {
    await new Promise<void>(resolve => { release = resolve; });
    return test.viewport;
  };
  await expect(test.capture('png', 5)).rejects.toMatchObject({ reason: 'timeout' });
  release();
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(test.captures).toHaveLength(1);
});

it('checks pixel and byte budgets before resizing or writing', async () => {
  const test = bench();
  await expect(captureImagePixels(test.guest as unknown as WebContents, 8000, 6000, 'png', test.codec)).rejects.toMatchObject({ reason: 'too-large' });
  expect(test.captures).toEqual([]);
  test.guest.capturePage = async () => ({ getScaleFactors: () => [1], toPNG: () => Buffer.alloc(MAX_EXPORT_BYTES + 1) });
  await expect(test.capture()).rejects.toMatchObject({ reason: 'too-large' });
});

it('rejects missing representations, oversized native density and a changed aspect ratio', async () => {
  const missing = bench();
  missing.guest.capturePage = async () => ({ getScaleFactors: () => [], toPNG: () => { throw new Error('must not encode'); } });
  await expect(missing.capture()).rejects.toMatchObject({ reason: 'resolution' });
  const dense = bench(10);
  await expect(dense.capture()).rejects.toMatchObject({ reason: 'too-large' });
  expect(dense.resized).toEqual([]);
  expect(dense.captures).toHaveLength(2);
  const aspect = bench();
  aspect.codec.readSize = () => ({ width: 1200, height: 600 });
  await expect(aspect.capture()).rejects.toMatchObject({ reason: 'unavailable' });
  expect(aspect.resized).toEqual([]);
});

it('does not encode a snapshot that finishes after the deadline', async () => {
  const test = bench();
  let release = (): void => {};
  let calls = 0;
  test.guest.capturePage = async () => {
    calls += 1;
    if (calls === 2) await new Promise<void>(resolve => { release = resolve; });
    return { getScaleFactors: () => { throw new Error('must not encode late pixels'); }, toPNG: () => Buffer.from('late') };
  };
  await expect(test.capture('png', 5)).rejects.toMatchObject({ reason: 'timeout' });
  release();
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(test.resized).toEqual([]);
  expect(calls).toBe(2);
});

it('flattens premultiplied opaque, transparent and translucent bitmap pixels onto white', () => {
  const pixels = Buffer.from([20, 40, 60, 255, 0, 0, 0, 0, 40, 60, 100, 128]);
  flattenOnWhite(pixels);
  expect([...pixels]).toEqual([20, 40, 60, 255, 255, 255, 255, 255, 167, 187, 227, 255]);
});
