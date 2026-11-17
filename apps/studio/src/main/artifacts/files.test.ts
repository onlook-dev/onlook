import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { mkdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import { createArtifactStore } from './store.js';
import { resetArtifactIndexCache } from './state.js';
import { artifactFilePathIsSafe, validArtifactBundle } from './files.js';
import type { ArtifactFileBundle } from './adapter.js';

const saved = process.env['STUDIO_STATE_ROOT'];
const ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
let root: string;

beforeEach(() => {
  root = makeStateRoot({ name: 'artifact-files' });
  process.env['STUDIO_STATE_ROOT'] = root;
  resetArtifactIndexCache();
});

afterAll(() => {
  if (saved === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = saved;
  cleanupTempFixtures();
});

const text = (path: string, content: string) => ({ path, bytes: new TextEncoder().encode(content) });
const idea = (): ArtifactFileBundle => ({
  pages: [{ path: 'pages/index.html', name: 'Welcome' }],
  files: [text('pages/index.html', '<h1>Welcome</h1>'),
    text('pages/shared.css', 'h1{color:blue}'), text('pages/shared.js', 'document.title="ready"')],
});

describe('an artifact owns one HTML document and companion assets', () => {
  it('restores bytes and resets the index cache when the index write fails', async () => {
    const store = createArtifactStore({ mintId: () => ID });
    await store.create({ title: 'Keep', html: '<h1>Original</h1>' });
    const indexPath = join(root, 'artifacts-index.json');
    renameSync(indexPath, `${indexPath}.saved`);
    mkdirSync(indexPath);
    expect(await store.writeFiles(ID, idea())).toMatchObject({ code: 'unavailable' });
    rmSync(indexPath, { recursive: true });
    renameSync(`${indexPath}.saved`, indexPath);
    expect(await store.readPage(ID, 'pages/index.html')).toBe('<h1>Original</h1>');
    expect((await store.list())[0]?.pages).toEqual([{ path: 'pages/index.html', name: 'index.html' }]);
  });

  it('recovers a replacement interrupted between directory moves', async () => {
    const store = createArtifactStore({ mintId: () => ID });
    await store.create({ title: 'Keep', html: '<h1>Original</h1>' });
    const directory = join(root, 'artifacts', ID);
    renameSync(directory, `${directory}.previous`);
    resetArtifactIndexCache();
    expect(await store.readPage(ID, 'pages/index.html')).toBe('<h1>Original</h1>');
    expect((await store.list())[0]?.id).toBe(ID);
  });
  it('permits local page/code/image/font files, never traversals or ambiguous encoded paths', () => {
    for (const path of ['pages/index.html', 'pages/shared.css', 'pages/shared.js', 'assets/a.png', 'assets/a.woff2']) {
      expect(artifactFilePathIsSafe(path)).toBe(true);
    }
    for (const path of ['/pages/index.html', 'pages/../x.html', 'pages/%2e/x.html', 'pages/x.html?y', 'assets/a.svg', 'pages/a.ts', 'pages/a\\b.html']) {
      expect(artifactFilePathIsSafe(path)).toBe(false);
    }
  });

  it('requires every unique page to have bytes and a name', () => {
    expect(validArtifactBundle(idea())).toBe(true);
    expect(validArtifactBundle({ ...idea(), files: [] })).toBe(false);
    expect(validArtifactBundle({ ...idea(), pages: [idea().pages[0]!, idea().pages[0]!] })).toBe(false);
    expect(validArtifactBundle({ ...idea(), files: [...idea().files, idea().files[0]!] })).toBe(false);
  });

  it('stores, reads and replaces one document without changing its identity', async () => {
    const store = createArtifactStore({ mintId: () => ID });
    const made = await store.create({ title: 'Two pages', html: 'unused', bundle: idea() });
    expect('code' in made).toBe(false);
    expect(await store.readPage(ID, 'pages/index.html')).toBe('<h1>Welcome</h1>');
    const read = await store.readFiles(ID);
    expect('code' in read).toBe(false);
    if ('code' in read) throw new Error(read.reason);
    expect(read.pages).toEqual(idea().pages);
    const updated = idea();
    updated.files[0] = text('pages/index.html', '<h1>New pricing</h1>');
    expect(await store.writeFiles(ID, updated)).toEqual({ ok: true });
    expect(await store.readPage(ID, 'pages/index.html')).toBe('<h1>New pricing</h1>');
  });

  it('refuses an invalid replacement without changing the original page', async () => {
    const store = createArtifactStore({ mintId: () => ID });
    await store.create({ title: 'Keep', html: '<h1>Original</h1>' });
    expect(await store.writeFiles(ID, { ...idea(), files: [] })).toMatchObject({ code: 'invalidFiles' });
    expect(await store.readPage(ID, 'pages/index.html')).toBe('<h1>Original</h1>');
  });

  it('refuses a linked dependency instead of disclosing bytes outside the artifact', async () => {
    const store = createArtifactStore({ mintId: () => ID });
    await store.create({ title: 'Keep', html: '<h1>Original</h1>' });
    mkdirSync(join(root, 'artifacts', ID, 'assets'));
    writeFileSync(join(root, 'secret.png'), 'secret');
    symlinkSync(join(root, 'secret.png'), join(root, 'artifacts', ID, 'assets', 'secret.png'));
    expect(await store.readFiles(ID)).toMatchObject({ code: 'invalidFiles' });
  });
});
