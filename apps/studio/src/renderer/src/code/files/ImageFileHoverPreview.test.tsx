import { describe, expect, it } from 'bun:test';
import { imageHoverPosition } from './ImageFileHoverPreview.js';

describe('image hover placement', () => {
  it('sits beside the cursor with a clear gap', () => {
    expect(imageHoverPosition(100, 100, 256, 192, 1280, 800)).toEqual({ x: 118, y: 118 });
  });
  it('flips left and above near the viewport edges', () => {
    expect(imageHoverPosition(1270, 790, 256, 192, 1280, 800)).toEqual({ x: 996, y: 580 });
  });
  it('keeps the preview inside a narrow viewport', () => {
    expect(imageHoverPosition(150, 120, 256, 192, 300, 240)).toEqual({ x: 8, y: 8 });
  });
});
