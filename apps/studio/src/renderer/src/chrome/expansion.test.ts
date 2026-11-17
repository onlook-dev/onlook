import { describe, expect, it } from 'bun:test';
import type { ChromeExtent } from '@studio/events';
import { sameExtent, widestExtent } from './expansion.js';

const BAND: ChromeExtent = { kind: 'band' };
const FULL: ChromeExtent = { kind: 'full' };
const strip = (height: number): ChromeExtent => ({ kind: 'strip', height });

describe('widestExtent', () => {
  it('rests at the band when nothing is claimed', () => {
    expect(widestExtent([])).toEqual(BAND);
  });

  it('rests at the band when every claim is one', () => {
    expect(widestExtent([BAND, BAND])).toEqual(BAND);
  });

  it('takes the tallest strip', () => {
    expect(widestExtent([strip(80), strip(160), strip(120)])).toEqual(strip(160));
  });

  it('lets full win over any strip, whichever order they arrive in', () => {
    expect(widestExtent([strip(900), FULL])).toEqual(FULL);
    expect(widestExtent([FULL, strip(900)])).toEqual(FULL);
  });

  it('ignores a band sitting among taller claims', () => {
    expect(widestExtent([BAND, strip(160), BAND])).toEqual(strip(160));
  });
});

describe('sameExtent', () => {
  it('separates the kinds', () => {
    expect(sameExtent(BAND, FULL)).toBe(false);
    expect(sameExtent(BAND, strip(160))).toBe(false);
  });

  it('separates two strips of different heights', () => {
    expect(sameExtent(strip(80), strip(160))).toBe(false);
  });

  it('matches like for like', () => {
    expect(sameExtent(BAND, { kind: 'band' })).toBe(true);
    expect(sameExtent(FULL, { kind: 'full' })).toBe(true);
    expect(sameExtent(strip(160), strip(160))).toBe(true);
  });
});
