import { expect, it } from 'bun:test';
import { boundedFont, boundedRaster } from './assets.js';

it('bounds raster dimensions before invoking a decoder', () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVxkAAAAASUVORK5CYII=', 'base64');
  expect(boundedRaster(png)).toBe(true);
  png.writeUInt32BE(100_000, 16);
  expect(boundedRaster(png)).toBe(false);
  expect(boundedRaster(Buffer.from('<svg></svg>'))).toBe(false);
  expect(boundedRaster(Buffer.from([255, 216, 255, 192, 255, 255]))).toBe(false);
});

it('checks font container size and expansion bounds before handing it to Chromium', () => {
  const font = Buffer.alloc(48);
  font.write('wOF2'); font.writeUInt32BE(48, 8); font.writeUInt16BE(1, 12); font.writeUInt32BE(1024, 16);
  expect(boundedFont(font)).toBe(true);
  font.writeUInt32BE(100_000_000, 16);
  expect(boundedFont(font)).toBe(false);
  expect(boundedFont(Buffer.from('a font-shaped filename is not a font'))).toBe(false);
});
