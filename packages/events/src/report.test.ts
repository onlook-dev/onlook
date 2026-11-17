import { describe, expect, test } from 'bun:test';
import { reportImageError, REPORT_IMAGE_MAX_BYTES } from './report.js';

function png(width: number, height: number, length = 24): Uint8Array {
  const bytes = new Uint8Array(length);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

describe('report image bounds before decoding', () => {
  test('accepts the inclusive byte, edge and pixel limits', () => {
    expect(reportImageError({ contentType: 'image/png', bytes: png(8192, 1, REPORT_IMAGE_MAX_BYTES) })).toBeNull();
    expect(reportImageError({ contentType: 'image/png', bytes: png(8000, 4000) })).toBeNull();
  });
  test('refuses each excess independently', () => {
    expect(reportImageError({ contentType: 'image/png', bytes: png(1, 1, REPORT_IMAGE_MAX_BYTES + 1) })).toBe('image-too-large');
    expect(reportImageError({ contentType: 'image/png', bytes: png(8193, 1) })).toBe('image-dimensions');
    expect(reportImageError({ contentType: 'image/png', bytes: png(8000, 4001) })).toBe('image-dimensions');
  });
  test('refuses MIME spoofing, zero dimensions and malformed bytes', () => {
    expect(reportImageError({ contentType: 'image/jpeg', bytes: png(1, 1) })).toBe('image-format');
    expect(reportImageError({ contentType: 'image/gif', bytes: png(1, 1) })).toBe('image-format');
    expect(reportImageError({ contentType: 'image/png', bytes: png(0, 1) })).toBe('image-unreadable');
    expect(reportImageError({ contentType: 'image/png', bytes: new Uint8Array() })).toBe('image-unreadable');
    expect(reportImageError({ contentType: 'image/png', bytes: [1, 2] })).toBe('image-unreadable');
  });
  test('reads JPEG frame bounds and safely refuses truncated segment lengths', () => {
    const bytes = new Uint8Array([255, 216, 255, 192, 0, 8, 8, 0, 2, 0, 3, 1]);
    expect(reportImageError({ contentType: 'image/jpeg', bytes })).toBeNull();
    bytes[5] = 200;
    expect(reportImageError({ contentType: 'image/jpeg', bytes })).toBe('image-unreadable');
  });
});
