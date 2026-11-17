import { expect, it } from 'bun:test';
import type { ArtifactPreviewRequest, ArtifactPreviewResult } from '@studio/events';
import { createPreviewDemand } from './previewDemand.js';

const request: ArtifactPreviewRequest = { artifactId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', pagePath: 'pages/home.html', updatedAt: 'one' };
const ready: ArtifactPreviewResult = { outcome: 'ready', image: 'data:image/png;base64,Zm9v' };
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

it('keeps the previous page image across invalidation, remount and a failed replacement', async () => {
  let replacement: (value: ArtifactPreviewResult) => void = () => {};
  let reads = 0;
  const demand = createPreviewDemand(async () => ++reads === 1 ? ready : new Promise((resolve) => { replacement = resolve; }));
  const stop = demand.watch(request, () => {});
  await tick();
  demand.invalidate(request.artifactId);
  stop();
  const next = { ...request, updatedAt: 'two' };
  expect(demand.peek(next)).toEqual({ outcome: 'reading', image: ready.image });
  const unwatch = demand.watch(next, () => {});
  await tick();
  expect(demand.peek(next)).toEqual({ outcome: 'reading', image: ready.image });
  replacement({ outcome: 'unavailable' });
  await tick();
  expect(demand.peek(next)).toEqual({ outcome: 'unavailable', image: ready.image });
  expect(demand.peek({ ...next, pagePath: 'other.html' }).outcome).toBe('reading');
  unwatch();
});

it('posters only the picture taken at the request it is asked about, while peek keeps serving the page', async () => {
  const updated: ArtifactPreviewResult = { outcome: 'ready', image: 'data:image/png;base64,dHdv' };
  let reads = 0;
  const demand = createPreviewDemand(async () => ++reads === 1 ? ready : updated);
  const stop = demand.watch(request, () => {});
  await tick();
  expect(demand.poster(request)).toBe(ready.image);
  const next = { ...request, updatedAt: 'two' };
  expect(demand.poster(next)).toBeUndefined();
  expect(demand.poster({ ...request, pagePath: 'pages/other.html' })).toBeUndefined();
  // The gallery's reader is unchanged: it still shows the page's last picture under a newer edit.
  expect(demand.peek(next)).toEqual({ outcome: 'reading', image: ready.image });
  stop();
  const replacement = demand.watch(next, () => {});
  await tick();
  expect(demand.poster(next)).toBe(updated.image);
  expect(demand.poster(request)).toBeUndefined();
  replacement();
});

it('hydrates a page cover from the picture main already keeps, remembering none of its own and rendering nothing', async () => {
  const rendered: ArtifactPreviewRequest[] = [];
  const asked: ArtifactPreviewRequest[] = [];
  const demand = createPreviewDemand(
    async (input) => { rendered.push(input); return ready; },
    undefined,
    async (input) => { asked.push(input); return ready; },
  );
  expect(demand.poster(request)).toBeUndefined();
  const seen: (string | undefined)[] = [];
  const release = demand.cover(request, () => { seen.push(demand.poster(request)); });
  await tick();

  expect(asked).toEqual([request]);
  expect(rendered).toEqual([]);
  expect(seen).toEqual([ready.image]);
  expect(demand.poster(request)).toBe(ready.image);
  release();
});

it('asks main once while a read is in flight, and again on the next arrival, still rendering nothing', async () => {
  let asks = 0;
  const rendered: string[] = [];
  let answer: ArtifactPreviewResult = { outcome: 'missing' };
  const demand = createPreviewDemand(
    async (input) => { rendered.push(input.pagePath); return ready; },
    undefined,
    async (): Promise<ArtifactPreviewResult> => { asks += 1; return answer; },
  );
  // Two surfaces mounting the same page in one frame are one read, not two.
  const first = demand.cover(request, () => {});
  const second = demand.cover(request, () => {});
  expect(asks).toBe(1);
  await tick();
  first();
  second();
  expect(demand.poster(request)).toBeUndefined();

  // A miss is never remembered: main answers `missing` for a record it only failed to read, and
  // the next arrival at that page has to be able to ask again.
  answer = ready;
  const again = demand.cover(request, () => {});
  await tick();

  expect(asks).toBe(2);
  expect(rendered).toEqual([]);
  expect(demand.poster(request)).toBe(ready.image);
  again();
});

it('never evicts the page a cover is showing, however many others are remembered', async () => {
  const demand = createPreviewDemand(async () => ready, undefined, async () => ready);
  const shown = { ...request, pagePath: 'pages/shown.html' };
  const release = demand.cover(shown, () => {});
  await tick();
  expect(demand.poster(shown)).toBe(ready.image);

  // Past the layer's own cap, which a rail sweep reaches: the shown page must still be there.
  for (let index = 0; index < 120; index += 1) {
    const other = { ...request, pagePath: `pages/other-${String(index)}.html` };
    const stop = demand.cover(other, () => {});
    await tick();
    stop();
  }

  expect(demand.poster(shown)).toBe(ready.image);
  release();
});

it('tells a cover already on screen when a later read lands its page picture', async () => {
  let land: ((value: ArtifactPreviewResult) => void) | undefined;
  const demand = createPreviewDemand(
    () => new Promise((resolve) => { land = resolve; }),
    undefined,
    async (): Promise<ArtifactPreviewResult> => ({ outcome: 'missing' }),
  );
  const seen: (string | undefined)[] = [];
  const release = demand.cover(request, () => { seen.push(demand.poster(request)); });
  await tick();
  expect(seen).toEqual([]);

  // The rail warm's read, which starts after the node is already mounted and showing nothing.
  const warm = demand.watch(request, () => {});
  await tick();
  land?.(ready);
  await tick();

  expect(seen).toEqual([ready.image]);
  warm();
  release();
});

it('stops telling a released cover, and answers an edited revision with its own picture only', async () => {
  const demand = createPreviewDemand(async () => ready, undefined, async () => ready);
  const seen: number[] = [];
  const release = demand.cover(request, () => seen.push(1));
  await tick();
  expect(seen).toEqual([1]);
  release();

  const next = { ...request, updatedAt: 'two' };
  expect(demand.poster(next)).toBeUndefined();
  const second = demand.cover(next, () => seen.push(2));
  await tick();

  expect(seen).toEqual([1, 2]);
  expect(demand.poster(next)).toBe(ready.image);
  expect(demand.poster(request)).toBeUndefined();
  second();
  demand.forget(request.artifactId);
  expect(seen).toEqual([1, 2]);
});

it('drops a held read whose artifact was edited while it was out, and lets the next mount ask again', async () => {
  let land: ((value: ArtifactPreviewResult) => void) | undefined;
  let asks = 0;
  const demand = createPreviewDemand(
    async () => ready,
    undefined,
    (): Promise<ArtifactPreviewResult> => { asks += 1; return new Promise((resolve) => { land = resolve; }); },
  );
  const release = demand.cover(request, () => {});
  expect(asks).toBe(1);

  demand.invalidate(request.artifactId);
  land?.(ready);
  await tick();
  expect(demand.poster(request)).toBeUndefined();

  // The fence is per read, not a page struck off for the session: the next ask still lands its picture.
  const again = demand.cover(request, () => {});
  expect(asks).toBe(2);
  land?.(ready);
  await tick();
  expect(demand.poster(request)).toBe(ready.image);
  release();
  again();
});

it('drops a held read for an artifact the listing dropped while its picture was still decoding', async () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  let decode: (() => void) | undefined;
  const demand = createPreviewDemand(
    async () => ready,
    storage,
    async (): Promise<ArtifactPreviewResult> => {
      // The bridge has answered; `Image.decode` has not, which is the longer half of a held read.
      await new Promise<void>((resolve) => { decode = resolve; });
      return ready;
    },
  );
  const release = demand.cover(request, () => {});
  await tick();

  // Nothing is remembered for it yet, so the read still out is the artifact's only state here.
  demand.retain([]);
  decode?.();
  await tick();

  expect(demand.poster(request)).toBeUndefined();
  expect(JSON.parse(values.get('studio.artifact-previews.v1') ?? '[]')).toEqual([]);
  release();
});

it('drops a watched read for an artifact the listing dropped before it landed', async () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  let land: ((value: ArtifactPreviewResult) => void) | undefined;
  const demand = createPreviewDemand(() => new Promise((resolve) => { land = resolve; }), storage);
  const stop = demand.watch(request, () => {});
  await tick();

  // Its entry is the artifact's only state here: nothing remembered, and no held read out either.
  demand.retain([]);
  land?.(ready);
  await tick();

  expect(demand.poster(request)).toBeUndefined();
  expect(JSON.parse(values.get('studio.artifact-previews.v1') ?? '[]')).toEqual([]);
  stop();
});

it('lets a replacement held read own its page while the deleted one settles first and takes nothing back', async () => {
  const lands: ((value: ArtifactPreviewResult) => void)[] = [];
  const second: ArtifactPreviewResult = { outcome: 'ready', image: 'data:image/png;base64,dHdv' };
  const demand = createPreviewDemand(
    async () => ready,
    undefined,
    (): Promise<ArtifactPreviewResult> => new Promise((resolve) => { lands.push(resolve); }),
  );
  const first = demand.cover(request, () => {});
  demand.forget(request.artifactId);
  // The page is mounted again while the deleted artifact's read is still out.
  const replacement = demand.cover(request, () => {});
  expect(lands).toHaveLength(2);

  // The retired read settles first: the page is not its to take, nor the ask its to give back.
  lands[0]?.(ready);
  await tick();
  expect(demand.poster(request)).toBeUndefined();
  const third = demand.cover(request, () => {});
  expect(lands).toHaveLength(2);

  lands[1]?.(second);
  await tick();
  expect(demand.poster(request)).toBe(second.image);
  first();
  replacement();
  third();
});

it('restores page images on a renderer reload and forgets deleted artifacts', async () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const first = createPreviewDemand(async () => ready, storage);
  const stop = first.watch(request, () => {});
  await tick();
  stop();
  const reloaded = createPreviewDemand(async () => ({ outcome: 'unavailable' }), storage);
  expect(reloaded.peek(request)).toEqual({ outcome: 'reading', image: ready.image });
  reloaded.forget(request.artifactId);
  expect(reloaded.peek(request).outcome).toBe('reading');
  expect(createPreviewDemand(async () => ready, storage).peek(request).outcome).toBe('reading');
});

it('does not replace the shared fallback with an older request that finishes late', async () => {
  const releases: ((state: ArtifactPreviewResult) => void)[] = [];
  const demand = createPreviewDemand(() => new Promise((resolve) => releases.push(resolve)));
  const first = demand.watch(request, () => {});
  const next = demand.watch({ ...request, updatedAt: 'two' }, () => {});
  await tick();
  const updated: ArtifactPreviewResult = { outcome: 'ready', image: 'data:image/png;base64,dHdv' };
  releases[1]!(updated);
  await tick();
  releases[0]!(ready);
  await tick();
  expect(demand.peek({ ...request, updatedAt: 'three' }).image).toBe(updated.image);
  first(); next();
});

it('does not read on peek/render, deduplicates demand and caches a revisit', async () => {
  let reads = 0;
  const demand = createPreviewDemand(async () => { reads += 1; return ready; });
  expect(demand.peek(request).outcome).toBe('reading');
  expect(reads).toBe(0);
  const first = demand.watch(request, () => {});
  const second = demand.watch(request, () => {});
  await tick();
  first(); second();
  const revisit = demand.watch(request, () => {});
  expect(demand.peek(request)).toEqual(ready);
  expect(reads).toBe(1);
  revisit();
});

it('caps active demand and cancels queued offscreen work', async () => {
  const reads: string[] = [];
  const releases: ((value: ArtifactPreviewResult) => void)[] = [];
  const demand = createPreviewDemand((input) => { reads.push(input.pagePath); return new Promise((resolve) => releases.push(resolve)); });
  const stops = Array.from({ length: 20 }, (_, index) => demand.watch({ ...request, pagePath: `pages/${index}.html` }, () => {}));
  await tick();
  expect(reads).toHaveLength(2);
  stops.slice(2).forEach((stop) => stop());
  releases.forEach((release) => release(ready));
  await tick();
  expect(reads).toHaveLength(2);
  stops.slice(0, 2).forEach((stop) => stop());
});

it('never republishes an invalidated in-flight result and preserves page/revision identity', async () => {
  const releases: ((value: ArtifactPreviewResult) => void)[] = [];
  const states: string[] = [];
  const demand = createPreviewDemand(() => new Promise((resolve) => releases.push(resolve)));
  const stop = demand.watch(request, (state) => states.push(state.outcome));
  await tick();
  demand.invalidate(request.artifactId);
  stop();
  const next = demand.watch({ ...request, updatedAt: 'two' }, () => {});
  releases[0]!(ready);
  await tick();
  expect(states).toEqual(['reading', 'reading']);
  expect(demand.peek(request).outcome).toBe('reading');
  expect(demand.peek({ ...request, pagePath: 'pages/other.html', updatedAt: 'two' }).outcome).toBe('reading');
  releases[1]!(ready);
  await tick();
  expect(demand.peek({ ...request, updatedAt: 'two' })).toEqual(ready);
  next();
});

it('settles synchronous missing-bridge failures and releases both queue slots', async () => {
  let calls = 0;
  const demand = createPreviewDemand(() => {
    calls += 1;
    if (calls <= 2) throw new TypeError('artifactPreview is not a function');
    return Promise.resolve(ready);
  });
  const requests = [0, 1, 2].map((index) => ({ ...request, pagePath: `pages/${index}.html` }));
  const stops = requests.map((input) => demand.watch(input, () => {}));
  await tick();
  expect(demand.peek(requests[0]!).outcome).toBe('unavailable');
  expect(demand.peek(requests[1]!).outcome).toBe('unavailable');
  expect(demand.peek(requests[2]!)).toEqual(ready);
  expect(calls).toBe(3);
  stops.forEach((stop) => stop());
});

it('retries a failed visible page once without returning stale bytes or polling', async () => {
  let reads = 0;
  const states: string[] = [];
  const demand = createPreviewDemand(async () => ++reads === 1 ? { outcome: 'unavailable' } : ready);
  const stop = demand.watch(request, (state) => states.push(state.outcome));
  await tick();
  demand.retry(request);
  demand.retry(request);
  await tick();
  expect(reads).toBe(2);
  expect(states).toEqual(['reading', 'unavailable', 'reading', 'ready']);
  expect(demand.peek(request)).toEqual(ready);
  stop();
});
