import { expect, it } from 'bun:test';
import type { ArtifactManifest, ArtifactPreviewRequest } from '@studio/events';
import { ARTIFACT_HELD_READ_LIMIT, createArtifactPreviewService } from './preview-cache.js';

const artifactId = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const request: ArtifactPreviewRequest = { artifactId, pagePath: 'pages/index.html', updatedAt: 'revision-one' };
const image = 'data:image/png;base64,cGFnZQ==';
const manifest = { id: artifactId, updatedAt: request.updatedAt, pages: [{ path: request.pagePath, name: 'Home' }, { path: 'pages/cart.html', name: 'Cart' }], minReaderVersion: 99 } as ArtifactManifest;
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

it('deduplicates by page identity, caches revisits, and previews readable newer manifests', async () => {
  let captures = 0;
  const service = createArtifactPreviewService({ store: { read: async () => ({ outcome: 'resolved', manifest, readOnly: true }) }, capture: async () => { captures += 1; return image; } });
  expect(await Promise.all([service.request(request), service.request(request)])).toEqual([{ outcome: 'ready', image }, { outcome: 'ready', image }]);
  expect(await service.request(request)).toEqual({ outcome: 'ready', image });
  expect(captures).toBe(1);
  await service.request({ ...request, pagePath: 'pages/cart.html' });
  expect(captures).toBe(2);
  service.invalidate(artifactId);
  await service.request(request);
  expect(captures).toBe(3);
});

it('answers a held read from disk or memory and never captures, whatever it finds', async () => {
  let captures = 0;
  let reads = 0;
  const saved = new Map<string, string>([[`${request.pagePath}|${request.updatedAt}`, image]]);
  const service = createArtifactPreviewService({
    store: { read: async () => ({ outcome: 'resolved', manifest, readOnly: false }) },
    capture: async () => { captures += 1; return image; },
    disk: {
      read: async (input) => { reads += 1; return saved.get(`${input.pagePath}|${input.updatedAt}`); },
      write: async () => {},
      remove: async () => { saved.clear(); },
    },
  });

  expect(await service.held(request)).toEqual({ outcome: 'ready', image });
  expect(captures).toBe(0);
  // The second answer comes from memory, so the disk is not read again either.
  expect(await service.held(request)).toEqual({ outcome: 'ready', image });
  expect(reads).toBe(1);

  // A page or revision with nothing kept is a miss, never a render of the page being waited on.
  expect((await service.held({ ...request, pagePath: 'pages/cart.html' })).outcome).toBe('missing');
  expect((await service.held({ ...request, updatedAt: 'revision-two' })).outcome).toBe('missing');
  expect((await service.held({ ...request, pagePath: '../secret' })).outcome).toBe('missing');
  expect(captures).toBe(0);

  service.invalidate(artifactId);
  await tick();
  expect((await service.held(request)).outcome).toBe('missing');
  expect(captures).toBe(0);
});

it('caps held reads in flight, so a page of nodes cannot lengthen main’s chain of reads without bound', async () => {
  let open = 0;
  let deepest = 0;
  let release: (() => void) | undefined;
  const waiting = new Promise<void>((resolve) => { release = () => { resolve(); }; });
  const asking = ARTIFACT_HELD_READ_LIMIT + 8;
  const everyPage = {
    ...manifest,
    pages: Array.from({ length: asking }, (_, index) => ({ path: `pages/${String(index)}.html`, name: `Page ${String(index)}` })),
  } as ArtifactManifest;
  const service = createArtifactPreviewService({
    store: { read: async () => ({ outcome: 'resolved', manifest: everyPage, readOnly: false }) },
    capture: async () => image,
    disk: {
      read: async () => {
        open += 1;
        deepest = Math.max(deepest, open);
        await waiting;
        open -= 1;
        return image;
      },
      write: async () => {},
      remove: async () => {},
    },
  });

  const asked = Array.from({ length: asking }, (_, index) =>
    service.held({ ...request, pagePath: `pages/${String(index)}.html` }));
  await tick();
  expect(deepest).toBe(ARTIFACT_HELD_READ_LIMIT);

  release?.();
  const answered = await Promise.all(asked);
  // The ones past the cap are refused, not queued: that node waits for its own guest instead.
  expect(answered.filter((result) => result.outcome === 'unavailable')).toHaveLength(8);
});

const budgeted = (pages: number) => ({
  ...manifest,
  pages: Array.from({ length: pages }, (_, index) => ({ path: `pages/${String(index)}.html`, name: `Page ${String(index)}` })),
} as ArtifactManifest);
// Exactly the per-image cap, so eight are exactly the cache's: both tests below sit on that
// boundary on purpose, and a change to either cap is a change to them.
const WHOLE = `data:image/png;base64,${'A'.repeat(4 * 1024 * 1024 - 'data:image/png;base64,'.length)}`;

it('counts a key it replaces once, so two reads keeping the same page cannot evict a cover', async () => {
  let captures = 0;
  const reads: string[] = [];
  const held: (() => void)[] = [];
  const shorter = WHOLE.slice(0, WHOLE.length - 4096);
  const service = createArtifactPreviewService({
    store: { read: async () => ({ outcome: 'resolved', manifest: budgeted(8), readOnly: false }) },
    capture: async () => { captures += 1; return WHOLE; },
    disk: {
      // The overlapping pair's second read answers nothing, so its `request` captures its own image.
      read: async (input) => {
        reads.push(input.pagePath);
        if (input.pagePath !== 'pages/7.html') return WHOLE;
        if (reads.filter((path) => path === input.pagePath).length > 1) return undefined;
        await new Promise<void>((resolve) => held.push(resolve));
        return shorter;
      },
      write: async () => {},
      remove: async () => {},
    },
  });

  for (let page = 0; page < 6; page += 1) await service.held({ ...request, pagePath: `pages/${String(page)}.html` });
  // Two `held` reads for one page: neither joins `pending`, so both miss and both keep that key.
  const sixth = { ...request, pagePath: 'pages/6.html' };
  expect(await Promise.all([service.held(sixth), service.held(sixth)]))
    .toEqual([{ outcome: 'ready', image: WHOLE }, { outcome: 'ready', image: WHOLE }]);
  // And a `held` read overlapping a `request` for one page, each keeping an image of its own length.
  const seventh = { ...request, pagePath: 'pages/7.html' };
  const reading = service.held(seventh);
  const rendering = service.request(seventh);
  await tick();
  held.splice(0).forEach((release) => release());
  expect((await reading).outcome).toBe('ready');
  expect((await rendering).outcome).toBe('ready');

  const before = reads.length;
  // Eight pages inside the budget: every cover is still in memory, and counting a replaced key twice
  // would have put the total over it and sent the oldest pages back to the disk.
  for (let page = 0; page < 8; page += 1) {
    expect((await service.held({ ...request, pagePath: `pages/${String(page)}.html` })).outcome).toBe('ready');
  }
  expect(reads.length).toBe(before);
  expect(captures).toBe(1);
});

it('gives back exactly what an invalidated page held, so the budget after it is the real one', async () => {
  const reads: string[] = [];
  const service = createArtifactPreviewService({
    store: { read: async () => ({ outcome: 'resolved', manifest: budgeted(8), readOnly: false }) },
    capture: async () => WHOLE,
    disk: { read: async (input) => { reads.push(input.pagePath); return WHOLE; }, write: async () => {}, remove: async () => {} },
  });

  // Two reads keeping one page, and then the edit that drops it: `invalidate` can only give back
  // what it finds in the cache, so a byte it never kept stays spent against every later page.
  const page = { ...request, pagePath: 'pages/0.html' };
  expect((await Promise.all([service.held(page), service.held(page)])).every((result) => result.outcome === 'ready')).toBe(true);
  service.invalidate(artifactId);
  await tick();

  for (let index = 0; index < 8; index += 1) {
    expect((await service.held({ ...request, pagePath: `pages/${String(index)}.html` })).outcome).toBe('ready');
  }
  const before = reads.length;
  for (let index = 0; index < 8; index += 1) {
    expect((await service.held({ ...request, pagePath: `pages/${String(index)}.html` })).outcome).toBe('ready');
  }
  expect(reads.length).toBe(before);
});

it('refuses missing, removed, unknown-page and stale-revision reads before capture', async () => {
  let missing = false;
  let captures = 0;
  const service = createArtifactPreviewService({ store: { read: async () => missing ? { outcome: 'missing' } : { outcome: 'resolved', manifest, readOnly: false } }, capture: async () => { captures += 1; return image; } });
  expect((await service.request({ ...request, pagePath: '../secret' })).outcome).toBe('missing');
  expect((await service.request({ ...request, updatedAt: 'old' })).outcome).toBe('missing');
  expect((await service.request({ ...request, artifactId: '../../other' })).outcome).toBe('missing');
  await service.request(request);
  missing = true;
  expect((await service.request(request)).outcome).toBe('missing');
  expect(captures).toBe(1);
});

it('bounds global concurrent captures and rejects update/delete races and invalid images', async () => {
  let active = 0;
  let peak = 0;
  const releases: (() => void)[] = [];
  const many = { ...manifest, pages: Array.from({ length: 8 }, (_, index) => ({ path: `pages/${index}.html`, name: 'Page' })) };
  const service = createArtifactPreviewService({ store: { read: async () => ({ outcome: 'resolved', manifest: many, readOnly: false }) }, capture: async () => {
    active += 1; peak = Math.max(peak, active);
    await new Promise<void>((resolve) => releases.push(resolve));
    active -= 1; return image;
  } });
  const pending = many.pages.map((page) => service.request({ ...request, pagePath: page.path }));
  await tick();
  expect(active).toBe(2);
  service.invalidate(artifactId);
  releases.splice(0).forEach((release) => release());
  expect((await Promise.all(pending)).every((result) => result.outcome === 'stale')).toBe(true);
  expect(peak).toBe(2);
  const invalid = createArtifactPreviewService({ store: { read: async () => ({ outcome: 'resolved', manifest, readOnly: false }) }, capture: async () => 'https://remote/image.png' });
  expect((await invalid.request(request)).outcome).toBe('unavailable');
});

it('rejects late results after a changed manifest and releases slots on capture failure', async () => {
  let current = manifest;
  let release!: (image: string) => void;
  const service = createArtifactPreviewService({ store: { read: async () => ({ outcome: 'resolved', manifest: current, readOnly: false }) }, capture: () => new Promise((resolve) => { release = resolve; }) });
  const pending = service.request(request);
  await tick();
  current = { ...manifest, updatedAt: 'revision-two' };
  release(image);
  expect((await pending).outcome).toBe('stale');
  const failing = createArtifactPreviewService({ store: { read: async () => ({ outcome: 'resolved', manifest, readOnly: false }) }, capture: async () => { throw new Error('capture failed'); } });
  expect((await failing.request(request)).outcome).toBe('unavailable');
  expect((await failing.request(request)).outcome).toBe('unavailable');
});

it('shares captures across tabs while canceling queued demand whose tabs close', async () => {
  const releases: (() => void)[] = [];
  const captured: string[] = [];
  let firstTabOpen = true;
  const service = createArtifactPreviewService({ store: { read: async () => ({ outcome: 'resolved', manifest, readOnly: false }) }, capture: async (input) => {
    captured.push(input.pagePath);
    await new Promise<void>((resolve) => releases.push(resolve));
    return image;
  } });
  const closed = service.request(request, () => firstTabOpen);
  const otherTab = service.request(request, () => true);
  const second = service.request({ ...request, pagePath: 'pages/cart.html' }, () => true);
  await tick();
  firstTabOpen = false;
  releases.forEach((release) => release());
  expect((await closed).outcome).toBe('unavailable');
  expect((await otherTab).outcome).toBe('ready');
  expect((await second).outcome).toBe('ready');
  expect(captured).toHaveLength(2);
});

it('does not capture queued pages after all their requesting tabs close', async () => {
  let open = true;
  const releases: (() => void)[] = [];
  let captures = 0;
  const many = { ...manifest, pages: Array.from({ length: 6 }, (_, index) => ({ path: `pages/${index}.html`, name: 'Page' })) };
  const service = createArtifactPreviewService({ store: { read: async () => ({ outcome: 'resolved', manifest: many, readOnly: false }) }, capture: async () => {
    captures += 1;
    await new Promise<void>((resolve) => releases.push(resolve));
    return image;
  } });
  const pending = many.pages.map((page) => service.request({ ...request, pagePath: page.path }, () => open));
  await tick();
  open = false;
  releases.forEach((release) => release());
  expect((await Promise.all(pending)).every((result) => result.outcome === 'unavailable')).toBe(true);
  expect(captures).toBe(2);
});
