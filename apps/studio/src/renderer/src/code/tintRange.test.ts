import { describe, expect, it } from 'bun:test';
import { tintedLines } from './tintRange.js';

describe('which lines a tint covers (ONL-2563)', () => {
  it('covers exactly the span it was given', () => {
    expect(tintedLines({ start: 3, end: 5 }, 40)).toEqual([3, 4, 5]);
  });

  it('covers one line for a span of one', () => {
    expect(tintedLines({ start: 7, end: 7 }, 40)).toEqual([7]);
  });

  it('covers nothing when there is no mapping', () => {
    expect(tintedLines(null, 40)).toEqual([]);
  });

  /* A mapped range outlives the edit that moved the text under it, so an end
     past the file is ordinary rather than a fault. */
  it('clamps an end past the last line instead of throwing', () => {
    expect(tintedLines({ start: 9, end: 400 }, 10)).toEqual([9, 10]);
  });

  it('covers nothing when the whole span starts past the last line', () => {
    expect(tintedLines({ start: 40, end: 50 }, 10)).toEqual([]);
  });

  it('covers nothing for a span that ends before it starts', () => {
    expect(tintedLines({ start: 8, end: 3 }, 40)).toEqual([]);
  });

  it('covers nothing in an empty document', () => {
    expect(tintedLines({ start: 1, end: 1 }, 0)).toEqual([]);
  });
});
