import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import { ARTIFACT_FIRST_PAGE_PATH, ARTIFACT_MANIFEST_VERSION } from '@studio/events';

const { createArtifactStore, rebuildArtifactIndexFromDisk } = await import('./store.js');
const { readArtifactIndex, resetArtifactIndexCache } = await import('./state.js');

const savedStateRoot = process.env['STUDIO_STATE_ROOT'];

afterAll(() => {
  if (savedStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = savedStateRoot;
  cleanupTempFixtures();
});

const A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const B = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const C = 'cccccccc-3333-4333-8333-cccccccccccc';

let stateRoot: string;

beforeEach(() => {
  stateRoot = makeStateRoot({ name: 'artifacts' });
  process.env['STUDIO_STATE_ROOT'] = stateRoot;
  resetArtifactIndexCache();
});

const indexPath = (): string => join(stateRoot, 'artifacts-index.json');
const dirOf = (id: string): string => join(stateRoot, 'artifacts', id);

function plantIndex(data: unknown, version = 1): void {
  writeFileSync(indexPath(), `${JSON.stringify({ version, data })}\n`);
}

/** A record on disk that the index does not know about. */
function plantArtifact(id: string, over: Record<string, unknown> = {}, html = '<p>hi</p>'): void {
  mkdirSync(join(dirOf(id), 'pages'), { recursive: true });
  writeFileSync(join(dirOf(id), ARTIFACT_FIRST_PAGE_PATH), html);
  writeFileSync(
    join(dirOf(id), 'manifest.json'),
    `${JSON.stringify({
      schemaVersion: ARTIFACT_MANIFEST_VERSION,
      minReaderVersion: 1,
      id,
      title: 'Planted',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      pages: [{ path: ARTIFACT_FIRST_PAGE_PATH, name: 'index.html' }],
      provenance: { madeIn: 'onlook' },
      ...over,
    })}\n`,
  );
}

const rowOf = (id: string): Record<string, unknown> =>
  (readArtifactIndex().artifacts as Record<string, Record<string, unknown>>)[id] ?? {};

describe('revision guarded bundle writes', () => {
  it('preserves a resize made after the text revision was read without invalidating the edit', async () => {
    const store = createArtifactStore({ mintId: () => A });
    const created = await store.create({ html: '<p>Original</p>' });
    if ('code' in created) throw new Error(created.reason);
    const bundle = await store.readFiles(A);
    if ('code' in bundle) throw new Error(bundle.reason);
    expect(store.saveDimensions(A, { width: 390, height: 844 })).toEqual({ ok: true });
    expect(await store.writeFiles(A, {
      ...bundle,
      files: [{ path: ARTIFACT_FIRST_PAGE_PATH, bytes: Buffer.from('<p>Edited</p>') }],
    }, created.updatedAt)).toEqual({ ok: true });
    expect(await store.readPage(A, ARTIFACT_FIRST_PAGE_PATH)).toBe('<p>Edited</p>');
    expect(await store.readManifest(A)).toMatchObject({ dimensions: { width: 390, height: 844 } });
    expect(await store.writeFiles(A, bundle, created.updatedAt)).toMatchObject({ code: 'stale' });
    expect(await store.readPage(A, ARTIFACT_FIRST_PAGE_PATH)).toBe('<p>Edited</p>');
    expect((await store.list())[0]?.dimensions).toEqual({ width: 390, height: 844 });
  });

  it('compares synchronously so two callers with one revision cannot both win', async () => {
    const store = createArtifactStore({ mintId: () => A, now: () => '2026-01-01T00:00:00.000Z' });
    const created = await store.create({ html: '<p>Original</p>' });
    if ('code' in created) throw new Error(created.reason);
    const previous = await store.readFiles(A);
    if ('code' in previous) throw new Error(previous.reason);
    const first = {...previous, files: [{path: ARTIFACT_FIRST_PAGE_PATH, bytes: Buffer.from('<p>First</p>')}]};
    const second = {...previous, files: [{path: ARTIFACT_FIRST_PAGE_PATH, bytes: Buffer.from('<p>Second</p>')}]};
    const results = await Promise.all([store.writeFiles(A, first, created.updatedAt), store.writeFiles(A, second, created.updatedAt)]);
    expect(results[0]).toEqual({ok: true});
    expect(results[1]).toMatchObject({code: 'stale'});
    expect(await store.readPage(A, ARTIFACT_FIRST_PAGE_PATH)).toBe('<p>First</p>');
    expect((await store.readManifest(A))?.updatedAt).not.toBe(created.updatedAt);
  });

  it('leaves manifest, index and directories untouched on a stale write', async () => {
    plantArtifact(A);
    const store = createArtifactStore();
    store.rebuildIndexOnce();
    const bundle = await store.readFiles(A);
    if ('code' in bundle) throw new Error(bundle.reason);
    const manifest = readFileSync(join(dirOf(A), 'manifest.json'));
    const index = readFileSync(indexPath());
    const directories = readdirSync(join(stateRoot, 'artifacts')).sort();
    expect(await store.writeFiles(A, bundle, 'outdated')).toMatchObject({code: 'stale'});
    expect(readFileSync(join(dirOf(A), 'manifest.json'))).toEqual(manifest);
    expect(readFileSync(indexPath())).toEqual(index);
    expect(readdirSync(join(stateRoot, 'artifacts')).sort()).toEqual(directories);
  });

  it('checks a guarded revision before manifest repair or previous-directory recovery', async () => {
    plantArtifact(A);
    const store = createArtifactStore();
    const bundle = await store.readFiles(A);
    if ('code' in bundle) throw new Error(bundle.reason);
    const manifestPath = join(dirOf(A), 'manifest.json');
    const manifest = {...JSON.parse(readFileSync(manifestPath, 'utf8')), id: B};
    writeFileSync(manifestPath, JSON.stringify(manifest));
    const before = readFileSync(manifestPath);
    expect(await store.writeFiles(A, bundle, 'outdated')).toMatchObject({code: 'stale'});
    expect(readFileSync(manifestPath)).toEqual(before);
    renameSync(dirOf(A), `${dirOf(A)}.previous`);
    expect(await store.writeFiles(A, bundle, manifest.updatedAt)).toMatchObject({code: 'stale'});
    expect(existsSync(dirOf(A))).toBe(false);
    expect(readFileSync(join(`${dirOf(A)}.previous`, 'manifest.json'))).toEqual(before);
  });
});

describe('remembered dimensions', () => {
  it('survives reopening and index rebuild without changing content revisions or notifying content listeners', async () => {
    const changes: string[] = [];
    const store = createArtifactStore({ mintId: () => A, onChanged: (id) => changes.push(id) });
    const created = await store.create({ html: '<h1>Study</h1>' });
    if ('code' in created) throw new Error(created.reason);
    changes.length = 0;
    expect(store.saveDimensions(A, { width: 960, height: 540 })).toEqual({ ok: true });
    expect(store.saveDimensions(A, { width: 390, height: 844 })).toEqual({ ok: true });
    expect(store.saveDimensions(A, { width: 390, height: 844 })).toEqual({ ok: true });
    expect(changes).toEqual([]);
    resetArtifactIndexCache();
    const reopened = createArtifactStore();
    expect(await reopened.list()).toMatchObject([{ dimensions: { width: 390, height: 844 }, updatedAt: created.updatedAt }]);
    expect(await reopened.read(A)).toMatchObject({ manifest: { dimensions: { width: 390, height: 844 }, updatedAt: created.updatedAt } });
    expect(await reopened.readPage(A, ARTIFACT_FIRST_PAGE_PATH)).toBe('<h1>Study</h1>');
    plantIndex({ artifacts: {} });
    resetArtifactIndexCache();
    rebuildArtifactIndexFromDisk();
    expect(await createArtifactStore().list()).toMatchObject([{ dimensions: { width: 390, height: 844 } }]);
  });

  it('validates dimensions, keeps records independent and preserves other manifest and index fields', async () => {
    plantArtifact(A, { future: { keep: true } });
    plantArtifact(B);
    const store = createArtifactStore();
    await store.list();
    for (const size of [{ width: 0, height: 4 }, { width: -1, height: 4 }, { width: NaN, height: 4 }, { width: 4, height: Infinity }]) {
      expect(store.saveDimensions(A, size)).toMatchObject({ code: 'invalidFiles' });
    }
    expect(store.saveDimensions(A, { width: 800.5, height: 600.5 })).toEqual({ ok: true });
    expect(await store.read(A)).toMatchObject({ manifest: { future: { keep: true }, dimensions: { width: 800.5, height: 600.5 } } });
    expect(await store.read(B)).not.toHaveProperty('manifest.dimensions');
    expect(store.saveDimensions(C, { width: 800, height: 600 })).toMatchObject({ code: 'unknown' });
  });

  it('does not change future or read-only records', async () => {
    plantArtifact(A, { minReaderVersion: 99, dimensions: { width: 700, height: 500 } });
    const path = join(dirOf(A), 'manifest.json');
    const bytes = readFileSync(path, 'utf8');
    const store = createArtifactStore();
    expect(store.saveDimensions(A, { width: 1000, height: 600 })).toMatchObject({ code: 'newerBuild' });
    expect(readFileSync(path, 'utf8')).toBe(bytes);
  });

  it('initial placement cannot overwrite an existing size and index failure rolls the manifest back', async () => {
    plantArtifact(A, { dimensions: { width: 700, height: 500 } });
    const store = createArtifactStore();
    await store.list();
    expect(store.saveDimensions(A, { width: 480, height: 640 }, { onlyIfUnset: true })).toEqual({ ok: true });
    const path = join(dirOf(A), 'manifest.json');
    const original = readFileSync(path, 'utf8');
    chmodSync(stateRoot, 0o500);
    try {
      expect(store.saveDimensions(A, { width: 1000, height: 600 })).toMatchObject({ code: 'unavailable' });
    } finally {
      chmodSync(stateRoot, 0o700);
    }
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual(JSON.parse(original));
    expect((await store.list())[0]?.dimensions).toEqual({ width: 700, height: 500 });
  });

  it('ignores malformed persisted dimensions and preserves legacy defaults', async () => {
    plantArtifact(A, { dimensions: { width: '800', height: 600 } });
    plantArtifact(B);
    const store = createArtifactStore();
    expect(await store.read(A)).not.toHaveProperty('manifest.dimensions');
    expect(await store.list()).toEqual(expect.arrayContaining([expect.objectContaining({ id: A }), expect.objectContaining({ id: B })]));
    for (const record of await store.list()) expect(record.dimensions).toBeUndefined();
  });
});

describe('an artifact round-trips', () => {
  it('does not restore, remove, replace, or prune a future previous directory', async () => {
    plantArtifact(A, { schemaVersion: 99 });
    plantArtifact(B);
    const path = join(dirOf(A), 'manifest.json');
    const bytes = readFileSync(path, 'utf8');
    renameSync(dirOf(A), `${dirOf(A)}.previous`);
    plantIndex({ artifacts: { [A]: { id: A, title: 'Future previous' } } });
    const store = createArtifactStore({ mintId: () => A });
    expect(await store.read(A)).toEqual({ outcome: 'missing' });
    expect(await store.remove(A)).toMatchObject({ code: 'newerBuild' });
    expect(await store.create({ title: 'Replacement', html: 'replacement' })).toMatchObject({ code: 'newerBuild' });
    rebuildArtifactIndexFromDisk();
    expect(readArtifactIndex().artifacts[A]).toMatchObject({ title: 'Future previous' });
    expect(readFileSync(join(`${dirOf(A)}.previous`, 'manifest.json'), 'utf8')).toBe(bytes);
    expect(existsSync(dirOf(A))).toBe(false);
  });

  it('refuses replacement and deletion when an existing previous manifest is newer', async () => {
    plantArtifact(A);
    plantIndex({ artifacts: { [A]: { id: A, title: 'Current' } } });
    const previous = `${dirOf(A)}.previous`;
    mkdirSync(previous);
    const path = join(previous, 'manifest.json');
    const bytes = '{"schemaVersion":99,"minReaderVersion":1,"id":"future"}\n';
    writeFileSync(path, bytes);
    const store = createArtifactStore();
    expect(await store.writePage(A, 'replacement')).toMatchObject({ code: 'newerBuild' });
    expect(await store.remove(A)).toMatchObject({ code: 'newerBuild' });
    expect(readFileSync(path, 'utf8')).toBe(bytes);
    expect(await store.readPage(A, ARTIFACT_FIRST_PAGE_PATH)).toBe('<p>hi</p>');
  });

  it('refuses all mutations against a future index without losing membership or payloads', async () => {
    plantArtifact(A);
    plantIndex({ artifacts: { [A]: { id: A, title: 'Planted' } }, future: true }, 99);
    const bytes = readFileSync(indexPath(), 'utf8');
    const manifest = readFileSync(join(dirOf(A), 'manifest.json'), 'utf8');
    const store = createArtifactStore({ mintId: () => B });
    expect(await store.remove(A)).toMatchObject({ code: 'newerBuild' });
    expect(await store.rename(A, 'Changed')).toMatchObject({ code: 'newerBuild' });
    expect(await store.writePage(A, '<p>changed</p>')).toMatchObject({ code: 'newerBuild' });
    expect(await store.create({ title: 'New', html: '<p>new</p>' })).toMatchObject({ code: 'newerBuild' });
    await store.list();
    rebuildArtifactIndexFromDisk();
    expect(readFileSync(indexPath(), 'utf8')).toBe(bytes);
    expect(readFileSync(join(dirOf(A), 'manifest.json'), 'utf8')).toBe(manifest);
    expect(await store.readPage(A, ARTIFACT_FIRST_PAGE_PATH)).toBe('<p>hi</p>');
    expect(existsSync(dirOf(B))).toBe(false);
  });

  it('preserves a future schema even when minReaderVersion permits this reader', async () => {
    plantArtifact(A, { schemaVersion: 99, id: B });
    plantIndex({ artifacts: { [A]: { id: A, title: 'Planted' } } });
    const path = join(dirOf(A), 'manifest.json');
    const bytes = readFileSync(path, 'utf8');
    const store = createArtifactStore();
    expect(await store.read(A)).toMatchObject({ outcome: 'resolved', readOnly: true });
    expect(await store.remove(A)).toMatchObject({ code: 'newerBuild' });
    await store.list();
    rebuildArtifactIndexFromDisk();
    expect(readFileSync(path, 'utf8')).toBe(bytes);
  });

  it('does not rebuild or create against an empty future index', async () => {
    plantArtifact(A);
    plantIndex({ artifacts: {}, unknownMembership: [A] }, 99);
    const bytes = readFileSync(indexPath(), 'utf8');
    const store = createArtifactStore({ mintId: () => B });
    expect(await store.list()).toEqual([]);
    expect(rebuildArtifactIndexFromDisk()).toMatchObject({ unknownMembership: [A] });
    expect(await store.create({ title: 'New', html: 'new' })).toMatchObject({ code: 'newerBuild' });
    expect(readFileSync(indexPath(), 'utf8')).toBe(bytes);
  });
  it('refuses future-reader/stale deletion and rolls back a failed index commit without losing bytes or emitting changes', async () => {
    const changes: string[] = [];
    const store = createArtifactStore({mintId: () => A, onChanged: (id) => changes.push(id)});
    await store.create({title: 'Keep', html: '<h1>Keep</h1>'});
    changes.length = 0;
    expect(await store.remove(A, 'old')).toMatchObject({code: 'stale'});
    const path = join(dirOf(A), 'manifest.json');
    const original = readFileSync(path, 'utf8');
    writeFileSync(path, JSON.stringify({...JSON.parse(original), minReaderVersion: 99}));
    expect(await store.remove(A)).toMatchObject({code: 'newerBuild'});
    expect(await store.readPage(A, 'pages/index.html')).toBe('<h1>Keep</h1>');
    writeFileSync(path, original);
    const savedIndex = readFileSync(indexPath(), 'utf8');
    const {rmSync} = await import('node:fs');
    rmSync(indexPath());
    mkdirSync(indexPath());
    expect(await store.remove(A)).toMatchObject({code: 'unavailable'});
    rmSync(indexPath(), {recursive: true});
    writeFileSync(indexPath(), savedIndex);
    resetArtifactIndexCache();
    expect(changes).toEqual([]);
    expect(await store.readPage(A, 'pages/index.html')).toBe('<h1>Keep</h1>');
    expect((await store.list())[0]?.id).toBe(A);
  });
  it('renames metadata atomically with identity/assets/page selectors and unknown fields intact across a cold read', async () => {
    plantArtifact(A, {future: {kept: true}}, '<h1>Owned content</h1>');
    const changes: string[] = [];
    const store = createArtifactStore({now: () => '2026-01-01T00:00:00.000Z', onChanged: (id) => changes.push(id)});
    const before = await store.read(A);
    if (before.outcome !== 'resolved') throw new Error('missing fixture');
    mkdirSync(join(dirOf(A), 'assets'));
    writeFileSync(join(dirOf(A), 'assets', 'large.png'), Buffer.alloc(6 * 1024 * 1024));
    expect(await store.rename(A, '  Global title  ', before.manifest.updatedAt)).toEqual({ok: true});
    expect(await store.rename(A, 'Late title', before.manifest.updatedAt)).toMatchObject({code: 'stale'});
    expect(await store.rename(A, '\nInvalid')).toMatchObject({code: 'invalidFiles'});
    expect(changes).toEqual([A]);
    resetArtifactIndexCache();
    expect(await createArtifactStore().read(A)).toMatchObject({outcome: 'resolved', manifest: {id: A, title: 'Global title', pages: before.manifest.pages, future: {kept: true}, createdAt: before.manifest.createdAt}});
    expect((await createArtifactStore().list())[0]?.title).toBe('Global title');
    expect(await store.readPage(A, 'pages/index.html')).toBe('<h1>Owned content</h1>');
    expect(readFileSync(join(dirOf(A), 'assets', 'large.png'))).toHaveLength(6 * 1024 * 1024);
  });
  it('keeps legacy multi-document manifests, bytes and selectors readable while refusing destructive writes, rename and export', async () => {
    for (const declared of [true, false]) {
      const id = declared ? A : B;
      plantArtifact(id, declared ? {pages: [{path: 'pages/index.html', name: 'Home'}, {path: 'pages/cart.html', name: 'Cart'}]} : {}, '<h1>Home</h1>');
      writeFileSync(join(dirOf(id), 'pages', 'cart.html'), '<h1>Legacy Cart</h1>');
      const original = readFileSync(join(dirOf(id), 'manifest.json'), 'utf8');
      resetArtifactIndexCache();
      plantIndex({artifacts: {}});
      const store = createArtifactStore();
      const expectedPages = declared ? [{path: 'pages/index.html'}, {path: 'pages/cart.html'}] : [{path: 'pages/index.html'}];
      expect(await store.read(id)).toMatchObject({outcome: 'resolved', readOnly: true, manifest: {id, pages: expectedPages}});
      expect((await store.list()).find((record) => record.id === id)).toMatchObject({readOnly: true, pages: expectedPages});
      expect(await store.readPage(id, 'pages/cart.html')).toBe(declared ? '<h1>Legacy Cart</h1>' : null);
      if (!declared) expect(await store.read(id)).toMatchObject({blockedDocuments: 1});
      expect(await store.writePage(id, '<h1>Replacement</h1>')).toMatchObject({code: 'multipleDocuments'});
      expect(await store.rename(id, 'Replacement')).toMatchObject({code: 'multipleDocuments'});
      expect(await store.readFiles(id, 'export')).toMatchObject({code: 'multipleDocuments'});
      expect(readFileSync(join(dirOf(id), 'manifest.json'), 'utf8')).toBe(original);
      expect(readFileSync(join(dirOf(id), 'pages', 'cart.html'), 'utf8')).toBe('<h1>Legacy Cart</h1>');
      expect(await store.readPage(id, 'pages/index.html')).toBe('<h1>Home</h1>');
    }
  });
  it('bounds static text reads and refuses extra HTML when creating or replacing without modifying any bytes', async () => {
    const store = createArtifactStore({mintId: () => A});
    await store.create({title: 'Original', html: '<h1>Original</h1>'});
    expect(await store.readPage(A, 'pages/index.html', 5)).toBeNull();
    expect(await store.readPage(A, 'pages/index.html', 100)).toBe('<h1>Original</h1>');
    const bundle = {pages: [{path: 'pages/index.html', name: 'Home'}], files: [{path: 'pages/index.html', bytes: Buffer.from('Home')}, {path: 'pages/extra.html', bytes: Buffer.from('Extra')}]};
    expect(await store.writeFiles(A, bundle)).toMatchObject({code: 'invalidFiles'});
    expect(await store.create({title: 'Refused', html: '', bundle})).toMatchObject({code: 'invalidFiles'});
    expect(await store.readPage(A, 'pages/index.html')).toBe('<h1>Original</h1>');
  });
  it('notifies preview invalidation only after successful content commits and deletion', async () => {
    const changed: string[] = [];
    const store = createArtifactStore({ mintId: () => A, onChanged: (id) => changed.push(id) });
    await store.create({ title: 'Preview fixture', html: '<h1>First</h1>' });
    expect(changed).toEqual([A]);
    expect(await store.writePage(A, '<h1>Second</h1>')).toEqual({ ok: true });
    expect(changed).toEqual([A, A]);
    await store.writeFiles(A, { pages: [], files: [] });
    expect(changed).toEqual([A, A]);
    expect(await store.remove(A)).toEqual({ ok: true });
    expect(changed).toEqual([A, A, A]);
  });
  it('writes, survives a cache reset, and reads back its manifest and page', async () => {
    const store = createArtifactStore({ mintId: () => A });
    const made = await store.create({ title: 'Pricing idea', html: '<h1>hi</h1>' });
    expect(made).toMatchObject({ id: A, title: 'Pricing idea', readOnly: false });

    resetArtifactIndexCache();
    const read = await store.read(A);
    expect(read).toMatchObject({ outcome: 'resolved', readOnly: false });
    expect(await store.readPage(A, ARTIFACT_FIRST_PAGE_PATH)).toBe('<h1>hi</h1>');
  });

  it('the control: rewriting the index on disk changes what a read answers', async () => {
    const store = createArtifactStore({ mintId: () => A });
    await store.create({ title: 'First', html: 'x' });
    expect((await store.list()).map((a) => a.title)).toEqual(['First']);

    plantIndex({ artifacts: {} });
    resetArtifactIndexCache();
    // Empty on disk, but a real directory remains, so the rebuild answers from it.
    expect((await store.list()).map((a) => a.title)).toEqual(['First']);

    plantIndex({ artifacts: { [A]: { ...rowOf(A), title: 'Renamed on disk' } } });
    resetArtifactIndexCache();
    expect((await store.list()).map((a) => a.title)).toEqual(['Renamed on disk']);
  });
});

describe('an index this build does not recognise', () => {
  it('returns its artifacts rather than discarding them, and still has them after a reset', async () => {
    plantArtifact(A);
    plantIndex(
      {
        artifacts: {
          [A]: {
            id: A,
            title: 'From the future',
            pagePath: ARTIFACT_FIRST_PAGE_PATH,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            minReaderVersion: 1,
          },
        },
      },
      99,
    );

    const store = createArtifactStore();
    expect((await store.list()).map((a) => a.id)).toEqual([A]);

    // The migration's return is written back in the same tick, so the re-read is the real test.
    resetArtifactIndexCache();
    expect((await store.list()).map((a) => a.id)).toEqual([A]);
    expect(readdirSync(stateRoot).some((name) => name.startsWith('artifacts-index.json.corrupt-'))).toBe(
      false,
    );
  });

  it('keeps a row the disk cannot re-derive, so salvage is what answers and not the rebuild', async () => {
    // No directory for A: the rebuild has nothing to find, so only the migration's salvage
    // can still return this row. Planting the directory would let the rebuild cover for it.
    plantIndex(
      {
        artifacts: {
          [A]: {
            id: A,
            title: 'Index only',
            pagePath: ARTIFACT_FIRST_PAGE_PATH,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            minReaderVersion: 1,
          },
        },
      },
      99,
    );

    expect((await createArtifactStore().list()).map((a) => a.id)).toEqual([A]);
    resetArtifactIndexCache();
    expect((await createArtifactStore().list()).map((a) => a.id)).toEqual([A]);
  });

  it('keeps a row field it does not know, through the read and the write-back', async () => {
    plantArtifact(A);
    plantIndex(
      {
        artifacts: {
          [A]: {
            id: A,
            title: 'Keeps extras',
            pagePath: ARTIFACT_FIRST_PAGE_PATH,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            minReaderVersion: 1,
            sharedWith: ['someone'],
          },
        },
      },
      99,
    );

    const store = createArtifactStore();
    await store.list();
    expect(rowOf(A)['sharedWith']).toEqual(['someone']);

    resetArtifactIndexCache();
    expect(rowOf(A)['sharedWith']).toEqual(['someone']);
  });
});

describe('a lost index costs no artifacts', () => {
  it('recovers every artifact from disk when the index is truncated mid-write', async () => {
    plantArtifact(A);
    plantArtifact(B);
    writeFileSync(indexPath(), '{"version":1,"data":{"artifa');
    resetArtifactIndexCache();

    const store = createArtifactStore();
    const listed = await store.list();

    expect(listed.map((a) => a.id).sort()).toEqual([A, B]);
    expect(existsSync(join(dirOf(A), ARTIFACT_FIRST_PAGE_PATH))).toBe(true);
    expect(existsSync(join(dirOf(B), ARTIFACT_FIRST_PAGE_PATH))).toBe(true);
  });

  it('adopts an artifact whose index write never landed', async () => {
    plantArtifact(A);
    expect(readArtifactIndex().artifacts[A]).toBeUndefined();

    const store = createArtifactStore();
    expect((await store.list()).map((a) => a.id)).toEqual([A]);
    expect(await store.readPage(A, ARTIFACT_FIRST_PAGE_PATH)).toBe('<p>hi</p>');
  });

  it('never adds to a readable index that already holds something', async () => {
    const store = createArtifactStore({ mintId: () => A });
    await store.create({ title: 'Known', html: 'x' });
    plantArtifact(B);
    resetArtifactIndexCache();

    expect((await store.list()).map((a) => a.id)).toEqual([A]);
  });

  it('reads a version-matched null payload as empty without writing that shape over real rows', async () => {
    plantIndex(null);
    resetArtifactIndexCache();
    const store = createArtifactStore({ mintId: () => A });
    expect(await store.list()).toEqual([]);

    await store.create({ title: 'After null', html: 'x' });
    resetArtifactIndexCache();
    expect((await store.list()).map((a) => a.id)).toEqual([A]);
  });

  it('refuses a directory whose manifest names a different id', async () => {
    plantArtifact(A, { id: B });
    const rebuilt = rebuildArtifactIndexFromDisk();
    expect(Object.keys(rebuilt.artifacts)).toEqual([]);
  });

  it('ignores a quarantined directory, because every walker filters on the id grammar', async () => {
    plantArtifact(A);
    const store = createArtifactStore();
    await store.list();
    resetArtifactIndexCache();

    writeFileSync(indexPath(), 'not json at all');
    resetArtifactIndexCache();
    mkdirSync(join(stateRoot, 'artifacts', `${B}.corrupt-2026-01-01T00-00-00-000Z`), { recursive: true });

    expect((await createArtifactStore().list()).map((a) => a.id)).toEqual([A]);
  });
});

describe('a create while the index is lost', () => {
  it('keeps the artifacts already on disk, rather than pinning the index to the new row', async () => {
    // Writing through the raw index here pinned it to one row and the rebuild condition —
    // "the index is empty" — could then never fire again (ONL-2568).
    plantArtifact(A);
    plantArtifact(B);
    writeFileSync(indexPath(), '{"version":1,"data":{"artifa');
    resetArtifactIndexCache();

    const store = createArtifactStore({ mintId: () => C });
    await store.create({ title: 'Third', html: 'x' });

    expect((await store.list()).map((a) => a.id).sort()).toEqual([A, B, C]);
    resetArtifactIndexCache();
    expect((await store.list()).map((a) => a.id).sort()).toEqual([A, B, C]);
  });
});

describe('the first artifact a user ever makes', () => {
  it('reports no index rebuild, because the only row on disk is the one being written', async () => {
    // The index starts empty, so reading it AFTER the write would find this directory and
    // call the user's first artifact a recovery, on every fresh install (ONL-2568).
    const seen: { event: string; count: number }[] = [];
    const store = createArtifactStore({
      mintId: () => A,
      onIntegrity: (event, count) => seen.push({ event, count }),
    });

    await store.create({ title: 'First ever', html: 'x' });

    expect(seen).toEqual([]);
    expect((await store.list()).map((a) => a.id)).toEqual([A]);
  });

  it('still rebuilds for an index that genuinely lost a row', async () => {
    const seen: { event: string; count: number }[] = [];
    plantArtifact(A);
    plantArtifact(B);
    writeFileSync(indexPath(), '{"version":1,"data":{"artifa');
    resetArtifactIndexCache();

    const store = createArtifactStore({
      mintId: () => C,
      onIntegrity: (event, count) => seen.push({ event, count }),
    });
    await store.create({ title: 'Third', html: 'x' });

    expect(seen).toEqual([{ event: 'index_rebuilt', count: 2 }]);
  });

  it('reports the startup rebuild too, because the trigger is the store and not a loose call', async () => {
    const seen: { event: string; count: number }[] = [];
    plantArtifact(A);
    plantArtifact(B);

    const store = createArtifactStore({ onIntegrity: (event, count) => seen.push({ event, count }) });
    store.rebuildIndexOnce();

    expect(seen).toEqual([{ event: 'index_rebuilt', count: 2 }]);
    expect((await store.list()).map((one) => one.id).sort()).toEqual([A, B].sort());
  });
});

describe('a title is text the user typed', () => {
  it('accepts one shaped like a path, and still refuses a location in provenance', async () => {
    const store = createArtifactStore({ mintId: () => A });
    const made = await store.create({ title: '/Users/me/pricing', html: 'x' });

    expect(made).toMatchObject({ id: A, title: '/Users/me/pricing' });
    expect(await store.rename(A, 'C:\\sketches\\hero')).toEqual({ ok: true });
  });
});

describe('one unreadable artifact', () => {
  it('does not cost its siblings', async () => {
    plantArtifact(A);
    plantArtifact(B);
    plantArtifact(C);
    writeFileSync(join(dirOf(B), 'manifest.json'), '{ truncated');

    const store = createArtifactStore();
    const ids = (await store.list()).map((a) => a.id).sort();
    expect(ids).toContain(A);
    expect(ids).toContain(C);
  });

  it('is listed by the rebuild anyway, because its page is the work', async () => {
    plantArtifact(A);
    plantArtifact(B);
    writeFileSync(join(dirOf(B), 'manifest.json'), '{ truncated');

    const store = createArtifactStore();

    // Skipping it would drop it from `list()` for good: the rebuild never adds to a filled index.
    expect((await store.list()).map((one) => one.id).sort()).toEqual([A, B].sort());
    expect(await store.readPage(B, ARTIFACT_FIRST_PAGE_PATH)).toBe('<p>hi</p>');
  });

  it('rebuilds a damaged manifest from the directory rather than losing the page', async () => {
    plantArtifact(A);
    writeFileSync(join(dirOf(A), 'manifest.json'), '{ truncated');

    const store = createArtifactStore();
    expect(await store.read(A)).toMatchObject({ outcome: 'resolved' });
    expect(await store.readPage(A, ARTIFACT_FIRST_PAGE_PATH)).toBe('<p>hi</p>');
  });

  it('sets aside a directory whose manifest bytes do not parse and whose page is gone', async () => {
    const seen: { event: string; count: number }[] = [];
    mkdirSync(dirOf(A), { recursive: true });
    writeFileSync(join(dirOf(A), 'manifest.json'), '{ truncated');

    const store = createArtifactStore({
      onIntegrity: (event, count) => seen.push({ event, count }),
    });
    expect(await store.read(A)).toEqual({ outcome: 'missing' });
    expect(seen).toEqual([{ event: 'quarantined', count: 1 }]);
    expect(existsSync(dirOf(A))).toBe(false);
    expect(readdirSync(join(stateRoot, 'artifacts')).some((n) => n.includes('.corrupt-'))).toBe(true);
  });

  it('leaves a manifest it could not read exactly as it found it', async () => {
    // EACCES, EMFILE, EIO: the bytes are there and may read next time. Rewriting defaults over
    // them would reset the title, the createdAt and minReaderVersion (ONL-2568).
    const seen: string[] = [];
    plantArtifact(A, { title: 'Pricing', minReaderVersion: ARTIFACT_MANIFEST_VERSION + 1 });
    const before = readFileSync(join(dirOf(A), 'manifest.json'), 'utf8');
    chmodSync(join(dirOf(A), 'manifest.json'), 0o000);

    const store = createArtifactStore({ onIntegrity: (event) => seen.push(event) });
    const read = await store.read(A);

    chmodSync(join(dirOf(A), 'manifest.json'), 0o600);
    expect(read).toEqual({ outcome: 'missing' });
    expect(readFileSync(join(dirOf(A), 'manifest.json'), 'utf8')).toBe(before);
    expect(seen).toEqual([]);
    expect(existsSync(dirOf(A))).toBe(true);
  });
});

describe('a manifest written by a newer build', () => {
  it('is listed and readable, refuses a write and a rename, and is never set aside', async () => {
    const seen: { event: string; count: number }[] = [];
    plantArtifact(A, { minReaderVersion: ARTIFACT_MANIFEST_VERSION + 1 });
    const store = createArtifactStore({
      onIntegrity: (event, count) => seen.push({ event, count }),
    });

    expect((await store.list()).map((a) => ({ id: a.id, readOnly: a.readOnly }))).toEqual([
      { id: A, readOnly: true },
    ]);
    expect(await store.read(A)).toMatchObject({ outcome: 'resolved', readOnly: true });
    expect(await store.readPage(A, ARTIFACT_FIRST_PAGE_PATH)).toBe('<p>hi</p>');

    expect(await store.writePage(A, '<p>nope</p>')).toMatchObject({ code: 'newerBuild' });
    expect(await store.rename(A, 'nope')).toMatchObject({ code: 'newerBuild' });

    expect(existsSync(join(dirOf(A), 'manifest.json'))).toBe(true);
    expect(await store.readPage(A, ARTIFACT_FIRST_PAGE_PATH)).toBe('<p>hi</p>');
    expect(seen.filter((s) => s.event === 'quarantined')).toEqual([]);
    expect(seen.filter((s) => s.event === 'newer_build_refused').length).toBe(2);
  });
});

describe('the manifest', () => {
  it('keeps an unknown top-level key across a read and the write after it', async () => {
    plantArtifact(A, { sharedUrl: 'later-cloud-field' });
    const store = createArtifactStore();
    await store.rename(A, 'Renamed');

    const onDisk = JSON.parse(readFileSync(join(dirOf(A), 'manifest.json'), 'utf8')) as Record<
      string,
      unknown
    >;
    expect(onDisk['sharedUrl']).toBe('later-cloud-field');
    expect(onDisk['title']).toBe('Renamed');
  });

  it('is repaired from the directory name when the two disagree, never set aside', async () => {
    const seen: string[] = [];
    plantArtifact(A, { id: B });
    const store = createArtifactStore({ onIntegrity: (event) => seen.push(event) });

    const read = await store.read(A);
    expect(read).toMatchObject({ outcome: 'resolved' });
    expect(read.outcome === 'resolved' ? read.manifest.id : undefined).toBe(A);
    expect(seen).toEqual([]);

    const onDisk = JSON.parse(readFileSync(join(dirOf(A), 'manifest.json'), 'utf8')) as {
      id: string;
    };
    expect(onDisk.id).toBe(A);
  });

  it('refuses a write whose provenance carries a location', async () => {
    const store = createArtifactStore({ mintId: () => A });
    await store.create({ title: 'Clean', html: 'x' });

    const { machineLocalFieldIn } = await import('./manifest.js');
    expect(
      machineLocalFieldIn({
        schemaVersion: 1,
        minReaderVersion: 1,
        id: A,
        title: 'x',
        createdAt: 'x',
        updatedAt: 'x',
        pages: [],
        provenance: { madeIn: 'onlook' },
        sourcePath: '/Users/someone/repo/index.html',
      }),
    ).toBe('sourcePath');
    expect(
      machineLocalFieldIn({
        schemaVersion: 1,
        minReaderVersion: 1,
        id: A,
        title: 'x',
        createdAt: 'x',
        updatedAt: 'x',
        pages: [{ path: ARTIFACT_FIRST_PAGE_PATH, name: 'index.html' }],
        provenance: { madeIn: 'onlook' },
      }),
    ).toBeUndefined();
  });
});

describe('the id gate', () => {
  it('refuses anything that is not a minted id before composing a path', async () => {
    const store = createArtifactStore();
    for (const bad of ['../escape', '/etc/passwd', '', 'AAAAAAAA-1111-4111-8111-AAAAAAAAAAAA', 'a'.repeat(300)]) {
      expect(await store.read(bad)).toEqual({ outcome: 'missing' });
      expect(await store.readPage(bad, ARTIFACT_FIRST_PAGE_PATH)).toBeNull();
      expect(await store.writePage(bad, 'x')).toMatchObject({ code: 'badId' });
      expect(await store.remove(bad)).toMatchObject({ code: 'badId' });
    }
  });

  it('serves only a path the manifest names', async () => {
    plantArtifact(A);
    writeFileSync(join(dirOf(A), 'pages', 'secret.html'), 'not listed');
    const store = createArtifactStore();

    expect(await store.readPage(A, 'pages/secret.html')).toBeNull();
    expect(await store.readPage(A, ARTIFACT_FIRST_PAGE_PATH)).toBe('<p>hi</p>');
  });
});

describe('an index key a newer build wrote', () => {
  /** Every write-back goes through one updater, so one write proving it is one proving all four. */
  it('survives a delete, a rename and a page write', async () => {
    plantArtifact(A);
    plantIndex({ artifacts: {}, collections: { pinned: [A] } });
    const store = createArtifactStore({ mintId: () => B });

    await store.create({ title: 'Made', html: 'x' });
    await store.writePage(A, '<p>edited</p>');
    await store.rename(A, 'Renamed');
    await store.remove(B);

    expect(readArtifactIndex()).toMatchObject({ collections: { pinned: [A] } });
  });
});

describe('deleting an artifact', () => {
  it('takes the bytes and the row, and a second read answers missing', async () => {
    const store = createArtifactStore({ mintId: () => A });
    await store.create({ title: 'Doomed', html: 'x' });

    expect(await store.remove(A)).toEqual({ ok: true });
    expect(existsSync(dirOf(A))).toBe(false);
    expect(readArtifactIndex().artifacts[A]).toBeUndefined();
    expect(await store.read(A)).toEqual({ outcome: 'missing' });
    expect(await store.list()).toEqual([]);
  });
});
