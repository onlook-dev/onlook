import { describe, expect, it } from 'bun:test';
import { IMAGE_MAX_BYTES } from '@studio/events';
import { projectImageDrag, projectImageSource } from './projectFileDrag.js';
import { ingestImageFiles } from './ingest.js';

describe('a project image dragged from Files', () => {
  it('preserves the SVG source without a DOM or rasterization', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><path d="M0 0L100 50"/></svg>';
    const bytes = new TextEncoder().encode(svg);
    const source = await projectImageSource('public/logo.svg', async ({ path }) => ({ ok: true, path, text: '', snapshot: { hash: 'svg', size: bytes.length, mtimeMs: 1, mode: 420, eol: '\n', bom: false }, image: { dataUrl: `data:image/svg+xml;base64,${Buffer.from(bytes).toString('base64')}` } }));
    expect(await source.bytes()).toEqual(bytes);
    expect(source.name).toBe('logo.svg');
  });
  it('carries a supported image path and its originating workspace', () => {
    expect(projectImageDrag(JSON.stringify({ path: 'public/logo.SVG', workspacePath: '/project' }))).toEqual({ path: 'public/logo.SVG', workspacePath: '/project' });
    for (const value of ['invalid', 'null', '{}', '{"path":"README.md","workspacePath":"/project"}', '{"path":"logo.png","workspacePath":""}']) {
      expect(projectImageDrag(value)).toBeNull();
    }
  });

  it('reads the scoped file once and preserves raster bytes and the filename', async () => {
    const asked: string[] = [];
    const source = await projectImageSource('public/photo.png', async ({ path }) => {
      asked.push(path);
      return { ok: true, path, text: '', snapshot: { hash: 'hash', size: 4, mtimeMs: 1, mode: 420, eol: '\n', bom: false }, image: { dataUrl: 'data:image/png;base64,AQIDBA==' } };
    });
    expect(source.name).toBe('photo.png');
    expect(source.size).toBe(4);
    expect(await source.bytes()).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(asked).toEqual(['public/photo.png']);
  });

  it('keeps an oversized scoped-read refusal out of registration', async () => {
    const source = await projectImageSource('large.png', async () => ({ ok: false, code: 'too-large' }));
    expect(source.size).toBeGreaterThan(IMAGE_MAX_BYTES);
    let registered = false;
    const outcome = await ingestImageFiles([source], { at: { x: 0, y: 0 }, fallbackName: 'image' }, {
      register: async () => { registered = true; return { ok: false, reason: 'unreadable' }; },
      measure: async () => null,
    });
    expect(registered).toBe(false);
    expect(outcome.refusal?.reason).toBe('too-large');
  });

  it('turns failed or non-image reads into an unreadable gesture', async () => {
    const source = await projectImageSource('../outside.png', async () => ({ ok: false, code: 'out-of-scope' }));
    const outcome = await ingestImageFiles([source], { at: { x: 0, y: 0 }, fallbackName: 'image' }, {
      register: async () => { throw new Error('must not register'); },
      measure: async () => null,
    });
    expect(outcome.images).toEqual([]);
    expect(outcome.refusal?.reason).toBe('unreadable');
  });
});
