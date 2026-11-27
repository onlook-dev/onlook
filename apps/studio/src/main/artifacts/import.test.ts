import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import { importArtifactFromProject } from './import.js';

let root: string;
beforeEach(() => { root = makeStateRoot({ name: 'artifact-import' }); });
afterAll(cleanupTempFixtures);

describe('import copies only local image/font dependencies without editing the source', () => {
  it('decodes reference entities once instead of turning escaped entity text into paths', () => {
    mkdirSync(join(root, 'styles'));
    writeFileSync(join(root, 'styles', 'theme.css'), 'body{color:blue}');
    for (const reference of ['styles&#38;sol;theme.css', 'styles&#x26;sol;theme.css', 'styles&amp;sol;theme.css']) {
      writeFileSync(join(root, 'index.html'), `<link rel="stylesheet" href="${reference}">`);
      expect(importArtifactFromProject(root, 'index.html', () => null).ok).toBe(false);
    }
    for (const reference of ['styles&sol;theme.css', 'styles&#47;theme.css', 'styles&#x2f;theme.css']) {
      writeFileSync(join(root, 'index.html'), `<link rel="stylesheet" href="${reference}">`);
      expect(importArtifactFromProject(root, 'index.html', () => null).ok).toBe(true);
    }
  });
  it('names a reference whose character is out of range instead of answering with the HTML guidance', () => {
    for (const reference of ['styles&#x110000;theme.css', 'styles&#xd800;theme.css', `styles&#x${'f'.repeat(100_000)};theme.css`]) {
      const html = `<link rel="stylesheet" href="${reference}">`;
      writeFileSync(join(root, 'index.html'), html);
      const refused = importArtifactFromProject(root, 'index.html', () => null);
      expect(refused.ok).toBe(false);
      if (refused.ok) throw new Error('Expected import to fail');
      expect(refused.reason).toContain(`reference at character ${html.indexOf(reference) + 1}`);
      expect(refused.reason).not.toContain('module scripts');
    }
  });
  it('handles long reference entities and near matches quickly', () => {
    mkdirSync(join(root, 'styles'));
    writeFileSync(join(root, 'styles', 'theme.css'), 'body{color:blue}');
    const started = performance.now();
    writeFileSync(join(root, 'index.html'), `<link rel="stylesheet" href="styles&#${'0'.repeat(100_000)}47;theme.css">`);
    expect(importArtifactFromProject(root, 'index.html', () => null).ok).toBe(true);
    for (const reference of [`styles&#x${'f'.repeat(100_000)}g;theme.css`, `styles${'&'.repeat(100_000)}theme.css`]) {
      writeFileSync(join(root, 'index.html'), `<link rel="stylesheet" href="${reference}">`);
      expect(importArtifactFromProject(root, 'index.html', () => null).ok).toBe(false);
    }
    expect(performance.now() - started).toBeLessThan(1000);
  });
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
    expect(imported.reason).toContain(JSON.stringify(join('idea', 'index.html')));
    expect(imported.reason).toContain('cart.html');
    expect(imported.reason).toContain('separate artifact');
    expect(readFileSync(join(root, 'idea', 'index.html'), 'utf8')).toBe(entry);
  });
  it('locates the remote reference and retries successfully with a local replacement', () => {
    const original = '<link rel="stylesheet" href="https://example.invalid/theme.css">';
    writeFileSync(join(root, 'original.html'), original);
    const refused = importArtifactFromProject(root, 'original.html', () => null);
    expect(refused.ok).toBe(false);
    if (refused.ok) throw new Error('Expected import to fail');
    expect(refused.reason).toContain('original.html');
    expect(refused.reason).toContain(`reference at character ${original.indexOf('https:') + 1}`);
    expect(refused.reason).toContain('local');
    expect(refused.reason).not.toContain(root);
    writeFileSync(join(root, 'copy.html'), '<link rel="stylesheet" href="theme.css">');
    writeFileSync(join(root, 'theme.css'), 'body{color:blue}');
    expect(importArtifactFromProject(root, 'copy.html', () => null).ok).toBe(true);
    expect(readFileSync(join(root, 'original.html'), 'utf8')).toBe(original);
  });

  it('locates unsafe references without echoing URLs, machine paths or query values', () => {
    for (const reference of ['https://reader:placeholder@example.invalid/theme.css?key=placeholder', '/tmp/theme.css', '../outside/theme.css', 'theme.css?key=placeholder', 'https&#58;//example.invalid/theme.css']) {
      const html = `<link href="${reference}">`;
      writeFileSync(join(root, 'index.html'), html);
      const refused = importArtifactFromProject(root, 'index.html', () => null);
      expect(refused.ok).toBe(false);
      if (refused.ok) throw new Error('Expected import to fail');
      expect(refused.reason).toContain('index.html');
      expect(refused.reason).toContain(`reference at character ${html.indexOf(reference) + 1}`);
      expect(refused.reason).not.toContain(reference);
      expect(refused.reason).not.toContain('placeholder');
      expect(refused.reason).not.toContain('example.invalid');
    }
  });

  it('does not echo a source path outside the project', () => {
    const source = '../outside/page.html';
    const refused = importArtifactFromProject(root, source, () => null);
    expect(refused.ok).toBe(false);
    if (refused.ok) throw new Error('Expected import to fail');
    expect(refused.reason).toContain('inside this project');
    expect(refused.reason).not.toContain(source);
    expect(refused.reason).not.toContain('outside');
    expect(refused.reason).not.toContain(root);
  });

  it('masks sensitive filenames in source and dependency diagnostics without changing import decisions', () => {
    const sensitiveName = `ghp_${'a'.repeat(24)}`;
    const html = `<link href="${sensitiveName}.css">`;
    writeFileSync(join(root, 'index.html'), html);
    const missing = importArtifactFromProject(root, 'index.html', () => null);
    expect(missing.ok).toBe(false);
    if (missing.ok) throw new Error('Expected import to fail');
    expect(missing.reason).toContain(`"index.html", reference at character ${html.indexOf(sensitiveName) + 1}`);
    expect(missing.reason).not.toContain(sensitiveName);
    writeFileSync(join(root, `${sensitiveName}.html`), '<iframe></iframe>');
    const source = importArtifactFromProject(root, `${sensitiveName}.html`, () => null);
    expect(source.ok).toBe(false);
    if (source.ok) throw new Error('Expected import to fail');
    expect(source.reason).toContain('a project file, unsupported content at character 1');
    expect(source.reason).not.toContain(sensitiveName);
    writeFileSync(join(root, `${sensitiveName}.css`), 'body{color:blue}');
    expect(importArtifactFromProject(root, 'index.html', () => null).ok).toBe(true);
  });

  for (const [label, content, marker, guidance] of [
    ['iframe', '<iframe src="https://example.invalid/placeholder"></iframe>', '<iframe', 'Remove this <iframe> element'],
    ['embedded media', '<video src="https://example.invalid/placeholder"></video>', '<video', 'Remove this <video> element'],
    ['module script', '<script type="module">const placeholder = true;</script>', '<script', 'Replace this module script'],
    ['inline script import', '<script>\nimport("https://example.invalid/placeholder");</script>', 'import(', 'Remove this script import'],
    ['inline script network request', '<script>\nfetch("https://example.invalid/placeholder");</script>', 'fetch(', 'Remove this script resource access'],
  ] as const) {
    it(`identifies the ${label} and its location without echoing its contents`, () => {
      const html = `<!doctype html>\n<h1>Preview</h1>\n${content}`;
      writeFileSync(join(root, 'index.html'), html);
      const refused = importArtifactFromProject(root, 'index.html', () => null);
      expect(refused.ok).toBe(false);
      if (refused.ok) throw new Error('Expected import to fail');
      expect(refused.reason).toContain(`"index.html", unsupported content at character ${html.indexOf(marker) + 1}:`);
      expect(refused.reason).toContain(guidance);
      expect(refused.reason).not.toContain('example.invalid');
      expect(refused.reason).not.toContain('placeholder');
      expect(refused.reason).not.toContain(root);
      expect(readFileSync(join(root, 'index.html'), 'utf8')).toBe(html);
    });
  }

  it('locates script imports and network requests in a local JavaScript dependency', () => {
    writeFileSync(join(root, 'index.html'), '<script src="code.js"></script>');
    for (const [script, marker] of [
      ['const ready = true;\nimport value from "./placeholder.js";', 'import'],
      ['const ready = true;\nfetch("https://example.invalid/placeholder");', 'fetch'],
    ] as const) {
      writeFileSync(join(root, 'code.js'), script);
      const refused = importArtifactFromProject(root, 'index.html', () => null);
      expect(refused.ok).toBe(false);
      if (refused.ok) throw new Error('Expected import to fail');
      expect(refused.reason).toContain(`"code.js", unsupported content at character ${script.indexOf(marker) + 1}:`);
      expect(refused.reason).toContain(marker === 'import' ? 'Remove this script import' : 'Remove this script resource access');
      expect(refused.reason).not.toContain('placeholder');
      expect(refused.reason).not.toContain('example.invalid');
    }
  });

  it('identifies a missing dependency in a nested stylesheet without exposing filesystem errors', () => {
    mkdirSync(join(root, 'styles'));
    writeFileSync(join(root, 'index.html'), '<link rel="stylesheet" href="styles/theme.css">');
    writeFileSync(join(root, 'styles/theme.css'), 'body{background:url("missing.png")}');
    const refused = importArtifactFromProject(root, 'index.html', () => null);
    expect(refused.ok).toBe(false);
    if (refused.ok) throw new Error('Expected import to fail');
    expect(refused.reason).toContain(JSON.stringify(join('styles', 'theme.css')));
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
