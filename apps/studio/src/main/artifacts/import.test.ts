import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import { importArtifactFromProject } from './import.js';

let root: string;
beforeEach(() => { root = makeStateRoot({ name: 'artifact-import' }); });
afterAll(cleanupTempFixtures);

describe('import copies only local image/font dependencies without editing the source', () => {
  it('owns srcset candidates and imported stylesheets as well as direct dependencies', () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVxkAAAAASUVORK5CYII=', 'base64');
    writeFileSync(join(root, 'index.html'), '<img srcset="small.png 1x, large.png 2x"><style>@import "theme.css";</style>');
    writeFileSync(join(root, 'small.png'), png);
    writeFileSync(join(root, 'large.png'), png);
    writeFileSync(join(root, 'theme.css'), 'body{color:blue}');
    const imported = importArtifactFromProject(root, 'index.html', (bytes) => bytes);
    expect(imported.ok).toBe(true);
    if (!imported.ok) throw new Error(imported.reason);
    expect(imported.input.bundle?.files).toHaveLength(4);
    expect(imported.input.html).toContain('../assets/resource-1.png 1x');
    expect(imported.input.html).toContain('../assets/resource-2.png 2x');
    expect(imported.input.html).toContain('resource-3.css');
  });
  it('refuses another linked HTML document rather than silently discarding it or changing source files', () => {
    mkdirSync(join(root, 'idea'));
    const entry = '<a href="cart.html#buy">Cart</a><link rel="stylesheet" href="theme.css"><script src="code.js"></script>';
    writeFileSync(join(root, 'idea', 'index.html'), entry);
    writeFileSync(join(root, 'idea', 'cart.html'), '<h1 id="buy">Cart</h1><a href="index.html">Back</a>');
    writeFileSync(join(root, 'idea', 'theme.css'), 'body{color:blue}');
    writeFileSync(join(root, 'idea', 'code.js'), 'document.body.dataset.ready="yes";');
    const imported = importArtifactFromProject(root, 'idea/index.html', () => null);
    expect(imported.ok).toBe(false);
    if (imported.ok) throw new Error('Expected import to fail');
    expect(imported.reason).toContain('idea/index.html');
    expect(imported.reason).toContain('cart.html#buy');
    expect(imported.reason).toContain('separate artifact');
    expect(readFileSync(join(root, 'idea', 'index.html'), 'utf8')).toBe(entry);
  });
  it('names the remote reference and retries successfully with a local replacement', () => {
    const original = '<link rel="stylesheet" href="https://example.invalid/theme.css">';
    writeFileSync(join(root, 'original.html'), original);
    const refused = importArtifactFromProject(root, 'original.html', () => null);
    expect(refused.ok).toBe(false);
    if (refused.ok) throw new Error('Expected import to fail');
    expect(refused.reason).toContain('original.html');
    expect(refused.reason).toContain('https://example.invalid/theme.css');
    expect(refused.reason).toContain('local');
    expect(refused.reason).not.toContain(root);
    writeFileSync(join(root, 'copy.html'), '<link rel="stylesheet" href="theme.css">');
    writeFileSync(join(root, 'theme.css'), 'body{color:blue}');
    expect(importArtifactFromProject(root, 'copy.html', () => null).ok).toBe(true);
    expect(readFileSync(join(root, 'original.html'), 'utf8')).toBe(original);
  });

  it('identifies a missing dependency in a nested stylesheet without exposing filesystem errors', () => {
    mkdirSync(join(root, 'styles'));
    writeFileSync(join(root, 'index.html'), '<link rel="stylesheet" href="styles/theme.css">');
    writeFileSync(join(root, 'styles/theme.css'), 'body{background:url("missing.png")}');
    const refused = importArtifactFromProject(root, 'index.html', () => null);
    expect(refused.ok).toBe(false);
    if (refused.ok) throw new Error('Expected import to fail');
    expect(refused.reason).toContain('styles/theme.css');
    expect(refused.reason).toContain('missing.png');
    expect(refused.reason).toContain('readable');
    expect(refused.reason).not.toContain(root);
    expect(refused.reason).not.toContain('ENOENT');
  });
  it('copies/reencodes an image and keeps only a safe relative reference', () => {
    mkdirSync(join(root, 'images'));
    const sourceBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVxkAAAAASUVORK5CYII=', 'base64');
    writeFileSync(join(root, 'images', 'original.png'), sourceBytes);
    const html = '<h1>Sketch</h1><img src="images/original.png">';
    writeFileSync(join(root, 'sketch.html'), html);
    const result = importArtifactFromProject(root, 'sketch.html', () => Buffer.from('reencoded pixels'));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(result.input.html).toContain('../assets/resource-1.png');
    expect(Buffer.from(result.input.bundle!.files[1]!.bytes).toString()).toBe('reencoded pixels');
    expect(JSON.stringify(result)).not.toContain(root);
    expect(readFileSync(join(root, 'sketch.html'), 'utf8')).toBe(html);
    expect(readFileSync(join(root, 'images', 'original.png'))).toEqual(sourceBytes);
  });

  it('explains an unsupported font and an oversized file without relaxing either limit', () => {
    writeFileSync(join(root, 'index.html'), '<style>@font-face{src:url("type.ttf")}</style>');
    writeFileSync(join(root, 'type.ttf'), 'font');
    const unsupported = importArtifactFromProject(root, 'index.html', () => null);
    expect(unsupported.ok).toBe(false);
    if (unsupported.ok) throw new Error('Expected import to fail');
    expect(unsupported.reason).toContain('type.ttf');
    expect(unsupported.reason).toContain('WOFF/WOFF2');
    writeFileSync(join(root, 'index.html'), ' '.repeat(5 * 1024 * 1024 + 1));
    const oversized = importArtifactFromProject(root, 'index.html', () => null);
    expect(oversized.ok).toBe(false);
    if (oversized.ok) throw new Error('Expected import to fail');
    expect(oversized.reason).toContain('index.html');
    expect(oversized.reason).toContain('5 MB');
    expect(oversized.reason).not.toContain(root);
  });

  it('refuses absolute, network, encoded and symlink references', () => {
    writeFileSync(join(root, 'image.png'), 'pixels');
    symlinkSync(join(root, 'image.png'), join(root, 'linked.png'));
    for (const path of ['http://127.0.0.1/image.png', 'https://example.invalid/image.png', '/tmp/image.png', 'file:///tmp/image.png', 'linked.png', '%2e%2e/image.png']) {
      writeFileSync(join(root, 'sketch.html'), `<img src="${path}">`);
      expect(importArtifactFromProject(root, 'sketch.html', () => Buffer.from('pixels')).ok).toBe(false);
    }
  });

  it('refuses a source-page symlink and unsupported dependent code instead of silently dropping it', () => {
    writeFileSync(join(root, 'original.html'), '<h1>Original</h1>');
    symlinkSync(join(root, 'original.html'), join(root, 'linked.html'));
    expect(importArtifactFromProject(root, 'linked.html', () => null).ok).toBe(false);
    writeFileSync(join(root, 'sketch.html'), '<script src="project.js"></script>');
    expect(importArtifactFromProject(root, 'sketch.html', () => null).ok).toBe(false);
  });
});
