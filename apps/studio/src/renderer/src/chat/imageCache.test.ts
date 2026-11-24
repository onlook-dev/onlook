import { describe, expect, it } from 'bun:test';
import type { ImageBytes, ImageRef } from '@studio/events';
import { createImageCache } from './imageCache.js';

const REF: ImageRef = { id: 'ws-1', mediaType: 'image/png' };
const PNG_BYTES = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

function countingFetcher(answer: ImageBytes | null): {
  fetch: (req: { id: string }) => Promise<ImageBytes | null>;
  calls: () => number;
} {
  let n = 0;
  return {
    fetch: () => {
      n += 1;
      return Promise.resolve(answer);
    },
    calls: () => n,
  };
}

describe('createImageCache', () => {
  it('keeps a saved image id readable through a fresh cache', async () => {
    const storedRef: ImageRef = {
      id: '86167e6864c9/0ae352d0-e43d-411e-a495-08504588094e',
      mediaType: 'image/png',
    };
    const requested: string[] = [];
    const readStored = async ({ id }: { id: string }): Promise<ImageBytes | null> => {
      requested.push(id);
      return id === storedRef.id ? { bytes: PNG_BYTES, mediaType: 'image/png' } : null;
    };
    const before = await createImageCache(readStored).resolve(storedRef);
    const after = await createImageCache(readStored).resolve(storedRef);
    if (!before || !after) throw new Error('saved image did not resolve');
    try {
      expect(requested).toEqual([storedRef.id, storedRef.id]);
      expect(new Uint8Array(await (await fetch(before)).arrayBuffer())).toEqual(PNG_BYTES);
      expect(new Uint8Array(await (await fetch(after)).arrayBuffer())).toEqual(PNG_BYTES);
    } finally {
      URL.revokeObjectURL(before);
      URL.revokeObjectURL(after);
    }
  });

  it('answers N concurrent resolves with one fetch', async () => {
    const { fetch, calls } = countingFetcher({ bytes: PNG_BYTES, mediaType: 'image/png' });
    const cache = createImageCache(fetch);
    const [a, b, c] = await Promise.all([
      cache.resolve(REF),
      cache.resolve(REF),
      cache.resolve(REF),
    ]);
    expect(calls()).toBe(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(a).toStartWith('blob:');
  });

  it('answers null for a missing blob and does not refetch it', async () => {
    const { fetch, calls } = countingFetcher(null);
    const cache = createImageCache(fetch);
    expect(await cache.resolve(REF)).toBeNull();
    expect(await cache.resolve(REF)).toBeNull();
    expect(calls()).toBe(1);
  });

  it('a rejecting fetcher degrades to the placeholder, never a throw, and reports the refusal', async () => {
    const failure = new Error('ipc down');
    const refused: unknown[] = [];
    const cache = createImageCache(() => Promise.reject(failure), (error) => refused.push(error));
    expect(await cache.resolve(REF)).toBeNull();
    expect(refused).toEqual([failure]);
  });

  it('hands a settled url back without waiting, so a remount draws it on its first render', async () => {
    const { fetch } = countingFetcher({ bytes: PNG_BYTES, mediaType: 'image/png' });
    const cache = createImageCache(fetch);
    // Nothing is known about an id nobody has asked for, and `undefined` is not `null`.
    expect(cache.peek(REF)).toBeUndefined();

    const url = await cache.resolve(REF);

    expect(cache.peek(REF)).toBe(url);
  });

  it('peeks nothing while the first read is still in flight', () => {
    const cache = createImageCache(() => new Promise<ImageBytes | null>(() => undefined));
    void cache.resolve(REF);
    expect(cache.peek(REF)).toBeUndefined();
  });

  it('peeks the missing answer too, so an absent blob does not re-flash the reading box', async () => {
    const cache = createImageCache(() => Promise.resolve(null));
    await cache.resolve(REF);
    expect(cache.peek(REF)).toBeNull();
  });
});
