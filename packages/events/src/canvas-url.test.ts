import { expect, it } from 'bun:test';
import { normalizeDevUrl } from './canvas-url.js';

it('serializes port-only destinations exactly like native HTTP URLs', () => {
  for (const [input, expected] of [
    ['3000', 'http://localhost:3000/'],
    [' 03000 ', 'http://localhost:3000/'],
    ['80', 'http://localhost/'],
    ['443', 'http://localhost:443/'],
    ['1', 'http://localhost:1/'],
    ['65535', 'http://localhost:65535/'],
  ] as const) {
    expect(normalizeDevUrl(input), input).toBe(expected);
  }
});

it('rejects out-of-range ports and non-HTTP destinations', () => {
  for (const input of ['', '0', '00000', '65536', '99999', 'http://localhost:65536', 'ftp://localhost:3000', 'file://localhost/app']) {
    expect(normalizeDevUrl(input), input).toBeNull();
  }
});

it('preserves paths, queries and fragments while canonicalizing HTTP destinations', () => {
  expect(normalizeDevUrl('localhost:3000')).toBe('http://localhost:3000/');
  expect(normalizeDevUrl('HTTPS://EXAMPLE.TEST:443/design/../preview?theme=dark#card')).toBe('https://example.test/preview?theme=dark#card');
});
