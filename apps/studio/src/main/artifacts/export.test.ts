import { afterAll, beforeEach, expect, it } from 'bun:test';
import { join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { Script } from 'node:vm';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import { createArtifactStore } from './store.js';
import { resetArtifactIndexCache } from './state.js';
import { exportArtifact } from './export.js';
import { artifactReferences } from './references.js';

const saved = process.env['STUDIO_STATE_ROOT'];
let root: string;
beforeEach(() => { root = makeStateRoot({ name: 'artifact-export' }); process.env['STUDIO_STATE_ROOT'] = root; resetArtifactIndexCache(); });
afterAll(() => { if (saved === undefined) delete process.env['STUDIO_STATE_ROOT']; else process.env['STUDIO_STATE_ROOT'] = saved; cleanupTempFixtures(); });

it('returns a catalog-mappable code for an unavailable artifact', async () => {
  expect(await exportArtifact(createArtifactStore(), 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa')).toEqual({ok: false, reason: 'missing'});
});

it('exports team workspace data with ws, rows, news and profile keys without changing its scripts', async () => {
  const store = createArtifactStore();
  const html = '<h1>Projects</h1><script>const teams = [{ws:["marketing-site"],rows:3,news:"Ready",profile:"Marketing"}];</script>';
  const created = await store.create({ title: 'Projects', html });
  if ('code' in created) throw new Error(created.reason);
  const exported = await exportArtifact(store, created.id);
  expect(exported.ok).toBe(true);
  if (!exported.ok) return;
  const payload = exported.html.match(/id="artifact-data">([\s\S]*?)<\/script>/)?.[1];
  expect(JSON.parse(payload ?? '').files).toContainEqual({ path: 'pages/index.html', text: html, data: null });
  expect(await store.readPage(created.id, 'pages/index.html')).toBe(html);
});

it('embeds one document, code, styles, image and font without raw script closing tags or page navigation', async () => {
  const store = createArtifactStore();
  const created = await store.create({ title: '</script><h1>Idea</h1>', html: '', bundle: {
    pages: [{ path: 'pages/index.html', name: 'Home' }],
    files: [
      { path: 'pages/index.html', bytes: Buffer.from('<link rel="stylesheet" href="theme.css"><img src="../assets/image.png"><button onclick="this.textContent=\'Added\'">Add</button><script src="idea.js"></script>') },
      { path: 'pages/theme.css', bytes: Buffer.from('@font-face{font-family:Idea;src:url(../assets/font.woff2)}body{color:blue}') },
      { path: 'pages/idea.js', bytes: Buffer.from('document.body.dataset.ready="yes";') },
      { path: 'assets/image.png', bytes: Buffer.from('image') },
      { path: 'assets/font.woff2', bytes: Buffer.from('font') },
    ],
  } });
  if ('code' in created) throw new Error(created.reason);
  const exported = await exportArtifact(store, created.id);
  expect(exported.ok).toBe(true);
  if (!exported.ok) return;
  expect(exported.html).toContain('data:image/png;base64,');
  expect(exported.html).toContain('data:font/woff2;base64,');
  expect(exported.html).not.toContain(root);
  expect(exported.html).not.toContain('studio-artifact://');
  expect(exported.html).not.toContain('<nav');
  const script = exported.html.match(/<\/script><script>([\s\S]*)<\/script>/)?.[1];
  expect(script).toBeDefined();
  expect(() => new Script(script ?? '')).not.toThrow();
  expect(await store.readPage(created.id, 'pages/index.html')).toContain('theme.css');
});

it('refuses remote, private and missing dependencies rather than exporting an empty-looking preview', async () => {
  for (const html of ['<img src="https://example.com/pic.png">', '<form action="https://example.com/submit"></form>', '<iframe src="index.html"></iframe>', '<script>new Image().src="missing.png";</script>', '<p>http://localhost:3000</p>', '<img src="../assets/gone.png">', '<p>/Users/designer/secrets</p>']) {
    const store = createArtifactStore();
    const created = await store.create({ title: 'Idea', html });
    if ('code' in created) throw new Error(created.reason);
    expect((await exportArtifact(store, created.id)).ok).toBe(false);
    expect(await store.readPage(created.id, 'pages/index.html')).toBe(html);
  }
});

it('refuses a future-reader manifest without rewriting or quarantining it', async () => {
  const store = createArtifactStore();
  const created = await store.create({ title: 'Idea', html: '<h1>Idea</h1>' });
  if ('code' in created) throw new Error(created.reason);
  const path = join(root, 'artifacts', created.id, 'manifest.json');
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  manifest.minReaderVersion = 99;
  const bytes = JSON.stringify(manifest);
  writeFileSync(path, bytes);
  expect(await exportArtifact(store, created.id)).toEqual({ ok: false, reason: 'newer-reader' });
  expect(readFileSync(path, 'utf8')).toBe(bytes);
  expect(await store.read(created.id)).toMatchObject({ outcome: 'resolved', readOnly: true });
});

it('checks private export titles without changing the stored title', async () => {
  const store = createArtifactStore();
  const created = await store.create({ title: '/Users/designer/private', html: '<h1>Safe page</h1>' });
  if ('code' in created) throw new Error(created.reason);
  expect(await exportArtifact(store, created.id)).toEqual({ ok: false, reason: 'privacy' });
  expect(await store.read(created.id)).toMatchObject({ outcome: 'resolved', manifest: { title: '/Users/designer/private' } });
});

it('refuses a final HTML file over 20 MB even when its source fits the store budget', async () => {
  const store = createArtifactStore();
  const created = await store.create({ title: 'Large idea', html: `<p>${'&'.repeat(4 * 1024 * 1024)}</p>` });
  if ('code' in created) throw new Error(created.reason);
  const exported = await exportArtifact(store, created.id);
  expect(exported.ok).toBe(false);
  if (exported.ok) return;
  expect(exported.reason).toBe('too-large');
  expect((await store.read(created.id)).outcome).toBe('resolved');
});
it('recognizes every srcset candidate and imported stylesheet for portable ownership', () => {
  expect(artifactReferences('<img srcset="small.png 1x, large.png 2x"><style>@import "theme.css";</style>', '.html').map((reference) => reference.value)).toEqual(['small.png', 'large.png', 'theme.css']);
});

it('refuses cyclic stylesheet graphs before producing a portable file', async () => {
  const store = createArtifactStore();
  const created = await store.create({ title: 'Cycle', html: '', bundle: { pages: [{ path: 'pages/index.html', name: 'Home' }], files: [
    { path: 'pages/index.html', bytes: Buffer.from('<link rel="stylesheet" href="first.css">') },
    { path: 'pages/first.css', bytes: Buffer.from('@import "second.css";') },
    { path: 'pages/second.css', bytes: Buffer.from('@import "first.css";') },
  ] } });
  if ('code' in created) throw new Error(created.reason);
  expect(await exportArtifact(store, created.id)).toMatchObject({ ok: false });
});
