import { afterAll, beforeEach, expect, it } from 'bun:test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import { createArtifactStore } from './store.js';
import { resetArtifactIndexCache } from './state.js';
import { createArtifactAccess } from './access.js';
import { importArtifactFromProject } from './import.js';
import { exportArtifact } from './export.js';
import { forkArtifact } from './copy.js';

const font = readFileSync(new URL('../../../node_modules/@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2', import.meta.url));
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAP0lEQVR4AQE0AMv/AH4vQVxcQfCgeFCMtAB+L0FcXEHwoHhQjLQAfi9BXFxB8KB4UIy0AH4vQVxcQfCgeFCMtCvcFf2v6XVbAAAAAElFTkSuQmCC', 'base64');
const html = '<style>@font-face{font-family:Inter;src:url(font.woff2)}</style><h1>Launch</h1><img src="photo.png">';
const previousRoot = process.env['STUDIO_STATE_ROOT'];
let root: string;
beforeEach(() => {
  root = makeStateRoot({ name: 'artifact-privacy-workflow' });
  process.env['STUDIO_STATE_ROOT'] = root;
  resetArtifactIndexCache();
  writeFileSync(join(root, 'font.woff2'), font);
  writeFileSync(join(root, 'photo.png'), image);
  writeFileSync(join(root, 'launch.html'), html);
});
afterAll(() => {
  if (previousRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = previousRoot;
  cleanupTempFixtures();
});

it('imports, saves, exports and copies real fonts and pixels containing path-like byte runs', async () => {
  for (const bytes of [font, image]) {
    expect(bytes.includes(Buffer.from('~/'))).toBe(true);
    expect(bytes.includes(Buffer.from('\\\\'))).toBe(true);
  }
  const store = createArtifactStore();
  const report = createArtifactAccess({
    store, givenIds: async () => [], place: async () => ({ ok: true }),
    import: async (path) => importArtifactFromProject(root, path, (bytes) => bytes),
    created: () => {}, changed: () => {},
  });
  const imported = await report('import', { path: 'launch.html' });
  expect(imported.ok).toBe(true);
  const saved = (await store.list())[0]!;
  expect(await report('set', { artifactId: saved.id, html: '<h1>Updated</h1><img src="../assets/resource-2.png">' })).toMatchObject({ ok: true });
  const read = await store.read(saved.id);
  const bundle = await store.readFiles(saved.id);
  if (read.outcome !== 'resolved' || 'code' in bundle) throw new Error('Expected saved artifact');
  expect(await exportArtifact(store, saved.id)).toMatchObject({ ok: true });
  expect(await forkArtifact(store, saved.id, 'Launch variant')).not.toHaveProperty('code');
});

it('refuses real private text on import, save, export and copy', async () => {
  for (const privateText of ['/Users/designer/private', '~/private', 'C:\\private\\file', 'http://localhost:3000', 'password="example-not-a-real-credential"']) {
    const store = createArtifactStore();
    const report = createArtifactAccess({
      store, givenIds: async () => (await store.list()).map((item) => item.id), place: async () => ({ ok: true }),
      import: async (path) => importArtifactFromProject(root, path, (bytes) => bytes),
      created: () => {}, changed: () => {},
    });
    const text = `<h1>${privateText}</h1>`;
    writeFileSync(join(root, 'private.html'), text);
    expect(await report('import', { path: 'private.html' })).toMatchObject({ ok: false });
    const created = await store.create({ html: '<h1>Safe</h1>' });
    if ('code' in created) throw new Error(created.reason);
    expect(await report('set', { artifactId: created.id, html: text })).toMatchObject({ ok: false });
    const read = await store.read(created.id);
    if (read.outcome !== 'resolved') throw new Error('Expected safe artifact');
    const bundle = { pages: read.manifest.pages, files: [{ path: 'pages/index.html', bytes: Buffer.from(text) }] };
    await store.writeFiles(created.id, bundle);
    expect(await exportArtifact(store, created.id)).toMatchObject({ ok: false, reason: 'privacy' });
    expect(await forkArtifact(store, created.id, 'Unsafe copy')).toMatchObject({ code: 'invalidFiles' });
  }
});

it('refuses private text disguised as an image or font across create, edit, export and copy', async () => {
  for (const extension of ['png', 'jpg', 'jpeg', 'woff', 'woff2']) {
    const store = createArtifactStore();
    const report = createArtifactAccess({
      store, givenIds: async () => (await store.list()).map((item) => item.id), place: async () => ({ ok: true }),
      import: async (path) => importArtifactFromProject(root, path, (bytes) => bytes),
      created: () => {}, changed: () => {},
    });
    const path = `assets/private.${extension}`;
    const content = '/Users/designer/private';
    const files = [{ path: 'pages/index.html', content: '<h1>Safe</h1>' }, { path, content }];
    expect(await report('create', { files })).toMatchObject({ ok: false });
    const created = await store.create({ html: '<h1>Safe</h1>' });
    if ('code' in created) throw new Error(created.reason);
    expect(await report('set', { artifactId: created.id, files })).toMatchObject({ ok: false });
    const read = await store.read(created.id);
    if (read.outcome !== 'resolved') throw new Error('Expected safe artifact');
    const bundle = { pages: read.manifest.pages, files: files.map((file) => ({ path: file.path, bytes: Buffer.from(file.content) })) };
    await store.writeFiles(created.id, bundle);
    expect(await exportArtifact(store, created.id)).toMatchObject({ ok: false, reason: 'privacy' });
    expect(await forkArtifact(store, created.id, 'Unsafe copy')).toMatchObject({ code: 'invalidFiles' });
  }
});
