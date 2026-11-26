import { describe, expect, it } from 'bun:test';
import { classifyCanvasImageBytes, classifyImageBytes, IMAGE_MAX_BYTES, sniffMediaType, sniffStoredImageMediaType } from './images.js';

const png = (extra = 0) =>
  Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ...new Array<number>(extra).fill(0),
  ]);

describe('stored SVG canvas assets', () => {
  it('does not reinterpret closed prolog entries to swallow non-XML text', () => {
    for (const text of ['<!-- closed -->text<!-- next --><svg/>', '<?xml version="1.0"?>text<?xml?><svg/>']) {
      expect(sniffStoredImageMediaType(new TextEncoder().encode(text))).toBeNull();
    }
  });
  it('handles repeated comment markers without backtracking', () => {
    const bytes = new TextEncoder().encode(`<!--${'--><!--'.repeat(100_000)}<svg/>`);
    const started = performance.now();
    expect(sniffStoredImageMediaType(bytes)).toBeNull();
    expect(performance.now() - started).toBeLessThan(1000);
  });
  it('scans large and unterminated prologs in linear time', () => {
    const started = performance.now();
    for (const text of [
      `<?xml ${'?'.repeat(1_000_000)}`,
      `<!--${'-'.repeat(1_000_000)}`,
      `<!DOCTYPE svg "${'>'.repeat(1_000_000)}`,
      `<${'a'.repeat(1_000_000)}:svg-fake/>`,
      '<?xml'.repeat(100_000),
      '<!--'.repeat(100_000),
      '<!DOCTYPE svg'.repeat(100_000),
      `<!DOCTYPE svg"${'"<!DOCTYPE svg"'.repeat(100_000)}`,
      `<!DOCTYPE svg'${"'<!DOCTYPE svg'".repeat(100_000)}`,
    ]) {
      expect(sniffStoredImageMediaType(new TextEncoder().encode(text))).toBeNull();
    }
    expect(sniffStoredImageMediaType(new TextEncoder().encode(`${'<!-- ok --> '.repeat(100_000)}<ns:svg/>`))).toBe('image/svg+xml');
    expect(performance.now() - started).toBeLessThan(1000);
  });
  it('recognizes SVG roots with XML declarations, comments, BOM and a doctype', () => {
    for (const text of ['<svg xmlns="http://www.w3.org/2000/svg"/>', '\ufeff <?xml version="1.0"?>\n<!-- generated -->\n<svg viewBox="0 0 20 10"/>', '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg/>', '<!DOCTYPE svg "quoted > value" \'another > value\'><ns:svg/>']) {
      const bytes = new TextEncoder().encode(text);
      expect(sniffStoredImageMediaType(bytes)).toBe('image/svg+xml');
      expect(classifyCanvasImageBytes(bytes)).toEqual({ ok: true, mediaType: 'image/svg+xml' });
      expect(classifyImageBytes(bytes)).toEqual({ ok: false, reason: 'unsupported-format' });
    }
  });
  it('rejects HTML with an embedded SVG, lookalike root names and oversized documents', () => {
    for (const text of ['<html><svg/></html>', '<svg-fake/>', '<!-- <svg/> --> plain text']) {
      expect(sniffStoredImageMediaType(new TextEncoder().encode(text))).toBeNull();
    }
    expect(classifyCanvasImageBytes(new Uint8Array(IMAGE_MAX_BYTES + 1))).toEqual({ ok: false, reason: 'too-large' });
  });
});

describe('sniffMediaType', () => {
  it('reads the four formats the API accepts', () => {
    expect(sniffMediaType(png())).toBe('image/png');
    expect(
      sniffMediaType(Uint8Array.from([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0])),
    ).toBe('image/jpeg');
    expect(
      sniffMediaType(Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0])),
    ).toBe('image/gif');
    expect(
      sniffMediaType(
        Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
      ),
    ).toBe('image/webp');
  });

  it('answers null below the sniff window', () => {
    expect(sniffMediaType(Uint8Array.from([0xff, 0xd8, 0xff]))).toBeNull();
  });

  it('refuses a format the API cannot take, whatever it claims to be', () => {
    const heic = Uint8Array.from([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63,
    ]);
    expect(sniffMediaType(heic)).toBeNull();
  });
});

describe('classifyImageBytes', () => {
  it('calls an empty file unreadable, not unsupported', () => {
    expect(classifyImageBytes(new Uint8Array(0))).toEqual({
      ok: false,
      reason: 'unreadable',
    });
  });

  it('refuses a non-image', () => {
    expect(classifyImageBytes(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))).toEqual({
      ok: false,
      reason: 'unsupported-format',
    });
  });

  it('refuses an oversized file for its size, even when it is a valid image', () => {
    const huge = png(IMAGE_MAX_BYTES + 1 - 12);
    expect(huge.byteLength).toBeGreaterThan(IMAGE_MAX_BYTES);
    expect(classifyImageBytes(huge)).toEqual({ ok: false, reason: 'too-large' });
  });

  it('admits a file exactly at the cap', () => {
    const atCap = png(IMAGE_MAX_BYTES - 12);
    expect(atCap.byteLength).toBe(IMAGE_MAX_BYTES);
    expect(classifyImageBytes(atCap)).toEqual({ ok: true, mediaType: 'image/png' });
  });
});
