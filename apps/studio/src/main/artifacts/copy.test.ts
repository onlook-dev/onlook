import { afterAll, beforeEach, expect, it } from 'bun:test';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import type { ArtifactNode, CanvasOp } from '@studio/events';
import { createArtifactStore } from './store.js';
import { resetArtifactIndexCache } from './state.js';
import { forkArtifact, prepareArtifactPlacements } from './copy.js';

it('authoritative existing placement preserves saved identity and count', async () => {
  const store = createArtifactStore();
  const source = await store.create({title: 'Canonical title', html: '<h1>Shared</h1>'});
  if ('code' in source) throw new Error(source.reason);
  const seed = duplicate(source.id);
  if (seed.type !== 'duplicate' || seed.node.kind !== 'artifact') throw new Error('Expected node');
  const {provenance: _provenance, ...node} = seed.node;
  const create = {type: 'create' as const, node};
  const prepared = await prepareArtifactPlacements(store, [create, {...create, node: {...node, id: crypto.randomUUID()}}]);
  expect(prepared.ok).toBe(true);
  if (!prepared.ok) throw new Error(prepared.reason);
  expect((await store.list()).map((row) => row.id)).toEqual([source.id]);
  for (const op of prepared.ops) {
    expect(op.type).toBe('create');
    if (op.type !== 'create' || op.node.kind !== 'artifact') throw new Error('Expected placement');
    expect(op.node.content.artifactId).toBe(source.id);
    expect(op.node.content.title).toBe('Canonical title');
  }
  await store.writePage(source.id, '<h1>Shared edit</h1>');
  expect(await store.readPage(source.id, source.pagePath)).toBe('<h1>Shared edit</h1>');
  expect(await prepareArtifactPlacements(store, [{...create, node: {...node, content: {...node.content, pagePath: 'pages/unlisted.html'}}}])).toMatchObject({ok: false});
  await store.remove(source.id);
  expect(await prepareArtifactPlacements(store, [create])).toMatchObject({ok: false});
});

it('refuses an explicit fork if source bytes change during preparation', async () => {
  const store = createArtifactStore();
  const source = await store.create({title: 'Changing source', html: '<h1>Before</h1>'});
  if ('code' in source) throw new Error(source.reason);
  const readFiles = store.readFiles.bind(store);
  store.readFiles = async (id, purpose) => {
    const bundle = await readFiles(id, purpose);
    store.readFiles = readFiles;
    await store.writePage(id, '<h1>After</h1>');
    return bundle;
  };
  expect(await forkArtifact(store, source.id, 'Variant')).toMatchObject({code: 'stale'});
  expect((await store.list()).map((row) => row.id)).toEqual([source.id]);
});

const saved = process.env['STUDIO_STATE_ROOT'];
beforeEach(() => {
  process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: 'artifact-copies' });
  resetArtifactIndexCache();
});
afterAll(() => {
  if (saved === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = saved;
  cleanupTempFixtures();
});

function duplicate(artifactId: string, pagePath = 'pages/index.html'): CanvasOp {
  const node: ArtifactNode = { kind: 'artifact', id: crypto.randomUUID(), pageId: 'pg_main', name: '', x: 0, y: 0, width: 480, height: 640, order: 0, content: { artifactId, title: 'Idea', pagePath } };
  return { type: 'duplicate', node: { ...node, provenance: { from: artifactId, at: new Date().toISOString() } } };
}

const duplicatedIds = (ops: readonly CanvasOp[]): string[] =>
  ops.flatMap((op) => op.type === 'duplicate' && op.node.kind === 'artifact' ? [op.node.content.artifactId] : []);

it('new placements use the latest dimensions while duplicates keep their rectangle and forks inherit the size', async () => {
  const store = createArtifactStore();
  const original = await store.create({ title: 'Study', html: '<h1>Study</h1>' });
  if ('code' in original) throw new Error(original.reason);
  store.saveDimensions(original.id, { width: 920, height: 540 });
  const duplicateOp = duplicate(original.id);
  if (duplicateOp.type !== 'duplicate') throw new Error('Expected duplicate');
  const { provenance: _provenance, ...node } = duplicateOp.node;
  const prepared = await prepareArtifactPlacements(store, [{ type: 'create', node }, duplicateOp]);
  expect(prepared).toMatchObject({ ok: true, ops: [
    { node: { width: 920, height: 540 } },
    { node: { width: 480, height: 640 } },
  ] });
  expect(await forkArtifact(store, original.id, 'Variant')).toMatchObject({ dimensions: { width: 920, height: 540 } });
});

it('duplicates and pastes share the source identity, so one edit shows in every placement', async () => {
  const store = createArtifactStore();
  const original = await store.create({ title: 'Idea', html: '', bundle: {
    pages: [{ path: 'pages/index.html', name: 'Home' }],
    files: [{ path: 'pages/index.html', bytes: Buffer.from('<h1>Cart</h1>') }, { path: 'assets/font.woff', bytes: Buffer.from('font') }],
  } });
  if ('code' in original) throw new Error(original.reason);
  await store.rename(original.id, 'Renamed idea', original.updatedAt);
  const prepared = await prepareArtifactPlacements(store, [duplicate(original.id), duplicate(original.id)]);
  expect(prepared.ok).toBe(true);
  if (!prepared.ok) return;
  expect(duplicatedIds(prepared.ops)).toEqual([original.id, original.id]);
  for (const op of prepared.ops) {
    if (op.type !== 'duplicate' || op.node.kind !== 'artifact') throw new Error('Expected duplicate');
    expect(op.node.content.title).toBe('Renamed idea');
  }
  expect((await store.list()).map((record) => record.id)).toEqual([original.id]);
  expect(readdirSync(join(process.env['STUDIO_STATE_ROOT']!, 'artifacts'))).toEqual([original.id]);
  await store.writePage(original.id, '<h1>Changed</h1>');
  expect(await store.readPage(duplicatedIds(prepared.ops)[0]!, 'pages/index.html')).toBe('<h1>Changed</h1>');
});

it('refuses the whole group, placing and minting nothing, when one member is missing', async () => {
  const store = createArtifactStore();
  const original = await store.create({ title: 'Idea', html: '<h1>Idea</h1>' });
  if ('code' in original) throw new Error(original.reason);
  const second = await store.create({ title: 'Second', html: '<h1>Second</h1>' });
  if ('code' in second) throw new Error(second.reason);
  expect(await prepareArtifactPlacements(store, [duplicate(original.id), duplicate(second.id), duplicate('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa')])).toMatchObject({ ok: false });
  expect((await store.list()).map((record) => record.id).sort()).toEqual([original.id, second.id].sort());
  expect(readdirSync(join(process.env['STUDIO_STATE_ROOT']!, 'artifacts')).sort()).toEqual([original.id, second.id].sort());
});

it('refuses to duplicate a newer-reader record or an unlisted page, leaving the record unchanged', async () => {
  const store = createArtifactStore();
  const created = await store.create({ title: 'Idea', html: '<h1>Idea</h1>' });
  if ('code' in created) throw new Error(created.reason);
  expect(await prepareArtifactPlacements(store, [duplicate(created.id, 'pages/unlisted.html')])).toMatchObject({ ok: false });
  const path = join(process.env['STUDIO_STATE_ROOT']!, 'artifacts', created.id, 'manifest.json');
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  manifest.minReaderVersion = 99;
  const bytes = JSON.stringify(manifest);
  writeFileSync(path, bytes);
  expect(await prepareArtifactPlacements(store, [duplicate(created.id)])).toMatchObject({ ok: false, reason: expect.stringContaining('Nothing was placed') });
  expect(readFileSync(path, 'utf8')).toBe(bytes);
  expect((await store.list()).map((record) => record.id)).toEqual([created.id]);
});

it('deleting the source removes it from every duplicate, since none is a copy', async () => {
  const store = createArtifactStore();
  const original = await store.create({ title: 'Idea', html: '<h1>Shared</h1>' });
  if ('code' in original) throw new Error(original.reason);
  const prepared = await prepareArtifactPlacements(store, [duplicate(original.id)]);
  if (!prepared.ok) throw new Error(prepared.reason);
  await store.remove(original.id);
  const [id] = duplicatedIds(prepared.ops);
  expect(id).toBe(original.id);
  expect(await store.read(id!)).toMatchObject({ outcome: 'missing' });
});
