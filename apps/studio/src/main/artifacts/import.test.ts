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
    expect(readFileSync(join(root, 'idea', 'index.html'), 'utf8')).toBe(entry);
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
