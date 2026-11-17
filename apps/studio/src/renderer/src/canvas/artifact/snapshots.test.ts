import { expect, it } from 'bun:test';
import { createArtifactSnapshots } from './snapshots.js';

const picture = { image: 'data:image/png;base64,picture', width: 640, height: 400 };

it('keeps a snapshot across page remounts without capturing again', async () => {
  const cache = createArtifactSnapshots();
  let reads = 0;
  await cache.capture('page-a', () => true, async () => { reads += 1; return picture; });
  expect(cache.peek('page-a')).toEqual(picture);
  await cache.capture('page-a', () => true, async () => { reads += 1; return picture; });
  expect(reads).toBe(1);
  expect(cache.peek('page-b')).toBeUndefined();
});

it('bounds encoded and decoded memory and evicts the least recently used snapshot', async () => {
  const cache = createArtifactSnapshots(2, 3_000_000);
  for (const key of ['a', 'b']) await cache.capture(key, () => true, async () => picture);
  cache.peek('a');
  await cache.capture('c', () => true, async () => picture);
  expect(cache.peek('a')).toEqual(picture);
  expect(cache.peek('b')).toBeUndefined();
  expect(cache.peek('c')).toEqual(picture);
  await cache.capture('huge', () => true, async () => ({ ...picture, width: 2000, height: 2000 }));
  expect(cache.peek('huge')).toBeUndefined();
  expect(cache.peek('a')).toEqual(picture);
});

it('evicts by decoded byte cost even below the entry limit', async () => {
  const cache = createArtifactSnapshots(48, 1_100_000);
  await cache.capture('a', () => true, async () => picture);
  await cache.capture('b', () => true, async () => picture);
  expect(cache.peek('a')).toBeUndefined();
  expect(cache.peek('b')).toEqual(picture);
});

it('serializes two wanted captures until the first read resolves', async () => {
  const cache = createArtifactSnapshots();
  let finish!: (value: typeof picture) => void;
  const reads: string[] = [];
  const first = cache.capture('a', () => true, () => {
    reads.push('a');
    return new Promise((resolve) => { finish = resolve; });
  });
  await Promise.resolve();
  const secondPicture = { ...picture, image: 'second-picture' };
  const second = cache.capture('b', () => true, async () => { reads.push('b'); return secondPicture; });
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect(reads).toEqual(['a']);
  expect(cache.peek('b')).toBeUndefined();
  finish(picture);
  await Promise.all([first, second]);
  expect(reads).toEqual(['a', 'b']);
  expect(cache.peek('a')).toEqual(picture);
  expect(cache.peek('b')).toEqual(secondPicture);
});

it('drops departed pages and recovers from capture failure', async () => {
  const failures: unknown[] = [];
  const cache = createArtifactSnapshots(48, 24 * 1024 * 1024, (error) => failures.push(error));
  let finish!: (value: typeof picture) => void;
  const first = cache.capture('a', () => true, () => new Promise((resolve) => { finish = resolve; }));
  await Promise.resolve();
  let wanted = true;
  let reads = 0;
  const second = cache.capture('b', () => wanted, async () => { reads += 1; return picture; });
  wanted = false;
  finish(picture);
  await Promise.all([first, second]);
  expect(reads).toBe(0);
  expect(cache.peek('b')).toBeUndefined();
  await cache.capture('bad', () => true, async () => { throw new Error('guest closed'); });
  expect(failures).toHaveLength(1);
  expect(String(failures[0])).toContain('guest closed');
  await cache.capture('good', () => true, async () => picture);
  expect(cache.peek('good')).toEqual(picture);
});
