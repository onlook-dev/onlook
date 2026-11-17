import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'bun:test';
import { WINDOW_BAR_HEIGHT, type ChromeExtent } from '@studio/events';
import { chromeHeightFor, restOnNewDocument } from './extent.js';

const TALL = 900;

describe('chromeHeightFor', () => {
  it('rests at exactly the band', () => {
    expect(chromeHeightFor({ kind: 'band' }, TALL)).toBe(WINDOW_BAR_HEIGHT);
  });

  it('gives the whole window content for full', () => {
    expect(chromeHeightFor({ kind: 'full' }, TALL)).toBe(TALL);
  });

  it('gives a strip its asked-for height', () => {
    expect(chromeHeightFor({ kind: 'strip', height: 160 }, TALL)).toBe(160);
  });

  it('never returns less than the band, however small the strip', () => {
    expect(chromeHeightFor({ kind: 'strip', height: 4 }, TALL)).toBe(WINDOW_BAR_HEIGHT);
    expect(chromeHeightFor({ kind: 'strip', height: -10 }, TALL)).toBe(WINDOW_BAR_HEIGHT);
  });

  it('never returns more than the window, however large the strip', () => {
    expect(chromeHeightFor({ kind: 'strip', height: 10_000 }, TALL)).toBe(TALL);
  });

  it('falls back to the band on a height that is not a number', () => {
    expect(chromeHeightFor({ kind: 'strip', height: Number.NaN }, TALL)).toBe(WINDOW_BAR_HEIGHT);
    expect(chromeHeightFor({ kind: 'strip', height: Number.POSITIVE_INFINITY }, TALL)).toBe(
      WINDOW_BAR_HEIGHT,
    );
  });

  it('clamps the band itself when the window is shorter than one', () => {
    const short = WINDOW_BAR_HEIGHT - 8;
    expect(chromeHeightFor({ kind: 'band' }, short)).toBe(short);
    expect(chromeHeightFor({ kind: 'full' }, short)).toBe(short);
    expect(chromeHeightFor({ kind: 'strip', height: 160 }, short)).toBe(short);
  });

  it('rounds a fractional window down and a fractional strip up', () => {
    expect(chromeHeightFor({ kind: 'full' }, 900.7)).toBe(900);
    expect(chromeHeightFor({ kind: 'strip', height: 159.2 }, TALL)).toBe(160);
  });
});

describe('restOnNewDocument', () => {
  function grownBand(): { page: EventEmitter; extent: () => ChromeExtent } {
    const page = new EventEmitter();
    let extent: ChromeExtent = { kind: 'strip', height: 233 };
    restOnNewDocument(page, () => {
      extent = { kind: 'band' };
    });
    return { page, extent: () => extent };
  }

  it('rests a grown band when the chrome page loads a new document, as a reload does (ONL-2609)', () => {
    const { page, extent } = grownBand();
    page.emit('did-navigate');
    expect(extent()).toEqual({ kind: 'band' });
  });

  it('leaves a grown band alone on a same-document navigation, which keeps the page and its claims', () => {
    const { page, extent } = grownBand();
    page.emit('did-navigate-in-page');
    expect(extent()).toEqual({ kind: 'strip', height: 233 });
  });
});
