import { expect, it } from 'bun:test';
import { paintInto } from './placeholderArt.js';

it('rejects inherited and unknown slab scenes before touching the canvas', () => {
  const canvas = {} as OffscreenCanvas;
  for (const scene of ['__proto__', 'constructor', 'toString', 'unknown']) {
    expect(() => paintInto(canvas, `slab:${scene}`, 10, 10)).toThrow('Unknown slab scene');
  }
});
