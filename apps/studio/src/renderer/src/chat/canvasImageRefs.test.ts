import { describe, expect, it } from 'bun:test';
import type { ImageBytes } from '@studio/events';
import { createCanvasImageRefs } from './canvasImageRefs.js';

const stored: ImageBytes = { bytes: Uint8Array.from([1, 2, 3]), mediaType: 'image/jpeg' };

describe('a canvas picture resolves its reference from the store (ONL-2486)', () => {
  it('uses a separate model-compatible image for SVG while retaining the canvas asset id', async () => {
    const svg: ImageBytes = { bytes: new TextEncoder().encode('<svg/>'), mediaType: 'image/svg+xml' };
    let converted = 0;
    const resolve = createCanvasImageRefs(async ({ id }) => id === 'original-svg' ? svg : stored, undefined, async (image) => {
      expect(image).toBe(svg);
      converted += 1;
      return { id: 'model-png', mediaType: 'image/png' };
    });
    expect(await resolve('original-svg')).toEqual({ id: 'model-png', mediaType: 'image/png' });
    expect(await resolve('original-svg')).toEqual({ id: 'model-png', mediaType: 'image/png' });
    expect(converted).toBe(1);
  });
  it('recreates an SVG model copy after that temporary blob has been collected', async () => {
    const svg: ImageBytes = { bytes: new TextEncoder().encode('<svg/>'), mediaType: 'image/svg+xml' };
    let converted = 0;
    const resolve = createCanvasImageRefs(async ({ id }) => id === 'original-svg' ? svg : null, undefined, async () => ({ id: `model-${String(++converted)}`, mediaType: 'image/png' }));
    expect((await resolve('original-svg'))?.id).toBe('model-1');
    expect((await resolve('original-svg'))?.id).toBe('model-2');
  });
  it('carries the media type the bytes report, and reads them once per picture', async () => {
    const asked: string[] = [];
    const resolve = createCanvasImageRefs(async ({ id }) => {
      asked.push(id);
      return stored;
    });

    expect(await resolve('blob-7')).toEqual({ id: 'blob-7', mediaType: 'image/jpeg' });
    expect(await resolve('blob-7')).toEqual({ id: 'blob-7', mediaType: 'image/jpeg' });
    expect(asked).toEqual(['blob-7']);
  });

  it('answers nothing for bytes the store cannot read, and asks again next time', async () => {
    let answers = 0;
    const resolve = createCanvasImageRefs(async () => {
      answers += 1;
      return answers === 1 ? null : stored;
    });

    expect(await resolve('blob-7')).toBeNull();
    expect(await resolve('blob-7')).toEqual({ id: 'blob-7', mediaType: 'image/jpeg' });
  });

  it('answers nothing when the bridge refuses', async () => {
    const resolve = createCanvasImageRefs(() => Promise.reject(new Error('no bridge')));
    expect(await resolve('blob-7')).toBeNull();
  });
});
