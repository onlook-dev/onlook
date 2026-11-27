import { expect, it } from 'bun:test';
import { paintInto } from './placeholderArt.js';

it('rejects inherited and unknown slab scenes before touching the canvas', () => {
  const canvas = {} as OffscreenCanvas;
  for (const scene of ['__proto__', 'constructor', 'toString', 'unknown']) {
    expect(() => paintInto(canvas, `slab:${scene}`, 10, 10)).toThrow('Unknown slab scene');
  }
});

it('rejects inherited and unknown metal presets, looks and kinds before touching the canvas', () => {
  const canvas = {} as OffscreenCanvas;
  for (const art of ['metal:__proto__:night', 'metal:fold:__proto__', 'metal:constructor:night', 'metal:unknown:night', 'metal:fold:unknown', 'metal', 'nonsense']) {
    expect(() => paintInto(canvas, art, 10, 10)).toThrow('Unknown metal scene');
  }
});
