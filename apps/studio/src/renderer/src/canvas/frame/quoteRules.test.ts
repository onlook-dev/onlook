import { describe, expect, it } from 'bun:test';
import { CANVAS_ARTIFACT_DEFAULT_BOX, DEFAULT_FRAME_SIZE, FRAME_QUOTE_MAX_LENGTH } from '@studio/events';
import { FRAME_QUOTE_LINE, FRAME_QUOTE_MAX_LINES, FRAME_QUOTE_MAX_MEASURE, FRAME_QUOTE_ZOOM, frameQuoteLayout, nextQuoteLayer, quoteRuns, quoteTextShows, sameFrameQuotes } from './quoteRules.js';

const DESKTOP = { width: 1512, height: 982 };
/** The measure in the quote's own type: equal across frames means each line holds the same words. */
const lineInType = (layout: { measure: number; zoom: number }): number => layout.measure / layout.zoom;

describe('the quote’s layout in a frame (ONL-2960)', () => {
  it('keeps the desktop measure and type size on a desktop frame', () => {
    expect(frameQuoteLayout(DESKTOP)).toMatchObject({ measure: FRAME_QUOTE_MAX_MEASURE, zoom: FRAME_QUOTE_ZOOM });
  });

  /** Wider than `display-1`'s average glyph, so a fit here holds with room for ragged breaks. */
  const GLYPH_EM = 0.62;
  const TYPE_PX = 26;
  const linesFor = (chars: number, layout: { measure: number; zoom: number }): number => Math.ceil(chars / Math.floor(lineInType(layout) / (GLYPH_EM * TYPE_PX))) + 1;

  for (const size of [CANVAS_ARTIFACT_DEFAULT_BOX, { width: 390, height: 844 }, DEFAULT_FRAME_SIZE, { width: 1512, height: 400 }, { width: 2400, height: 1400 }]) {
    it(`fits a full brief in ${String(size.width)} × ${String(size.height)} without cutting it off`, () => {
      const layout = frameQuoteLayout(size);
      expect(linesFor(FRAME_QUOTE_MAX_LENGTH, layout)).toBeLessThanOrEqual(layout.maxLines);
      expect(layout.measure).toBeLessThanOrEqual(size.width);
      expect(linesFor(FRAME_QUOTE_MAX_LENGTH, layout) * FRAME_QUOTE_LINE * layout.zoom).toBeLessThanOrEqual(size.height);
    });
  }

  it('breaks a full brief where it does on desktop, in an artifact and a phone frame alike', () => {
    for (const size of [CANVAS_ARTIFACT_DEFAULT_BOX, { width: 390, height: 844 }, { width: 1512, height: 400 }]) {
      expect(lineInType(frameQuoteLayout(size))).toBeCloseTo(lineInType(frameQuoteLayout(DEFAULT_FRAME_SIZE)));
    }
  });

  it('shrinks the type with a narrower frame, so every line holds what it holds on desktop', () => {
    for (const width of [820, 390, 120]) {
      const narrow = frameQuoteLayout({ width, height: 844 });
      expect(narrow.zoom).toBeLessThan(FRAME_QUOTE_ZOOM);
      expect(narrow.measure).toBeLessThan(width);
      expect(lineInType(narrow)).toBeCloseTo(lineInType(frameQuoteLayout(DESKTOP)));
    }
  });

  it('never grows the type past desktop in a wider frame', () => {
    expect(frameQuoteLayout({ width: 3000, height: 982 })).toEqual(frameQuoteLayout(DESKTOP));
  });

  it('shrinks the type with a shorter object too, so its lines never run out first', () => {
    for (const height of [5, 120, 400, 844, 4000]) {
      const layout = frameQuoteLayout({ width: 390, height });
      expect(layout.maxLines).toBe(FRAME_QUOTE_MAX_LINES);
      expect(lineInType(layout)).toBeCloseTo(lineInType(frameQuoteLayout(DESKTOP)));
    }
  });

  it('keeps a usable layout in a frame with no width', () => {
    const layout = frameQuoteLayout({ width: 0, height: 982 });
    expect(layout.zoom).toBeGreaterThan(0);
    expect(Number.isFinite(lineInType(layout))).toBe(true);
  });
});

describe('when the quote’s text is drawn at all (ONL-2960)', () => {
  const shows = (size: { width: number; height: number }, canvasZoom: number): boolean => quoteTextShows(frameQuoteLayout(size), canvasZoom);
  /** The lowest canvas zoom, to a hundredth, at which the object still draws its text. */
  const lowestZoom = (size: { width: number; height: number }): number => {
    let zoom = 4;
    while (zoom > 0.01 && shows(size, zoom - 0.01)) zoom -= 0.01;
    return zoom;
  };

  it('draws the text on a desktop frame and an artifact at a fitted canvas zoom', () => {
    expect(shows(DESKTOP, 0.5)).toBe(true);
    expect(shows(CANVAS_ARTIFACT_DEFAULT_BOX, 1)).toBe(true);
  });

  it('stops drawing the text once the object is zoomed far enough out', () => {
    expect(shows(DESKTOP, 0.05)).toBe(false);
    expect(shows(CANVAS_ARTIFACT_DEFAULT_BOX, 0.2)).toBe(false);
  });

  it('follows the size on screen: once the text is gone, every farther zoom keeps it gone', () => {
    for (const size of [DESKTOP, CANVAS_ARTIFACT_DEFAULT_BOX, { width: 390, height: 844 }]) {
      const lowest = lowestZoom(size);
      for (let zoom = lowest - 0.01; zoom > 0.01; zoom -= 0.05) expect(shows(size, zoom)).toBe(false);
      for (let zoom = lowest; zoom <= 4; zoom += 0.05) expect(shows(size, zoom)).toBe(true);
    }
  });

  it('loses the text of a smaller object at a nearer zoom than a bigger one', () => {
    expect(lowestZoom(CANVAS_ARTIFACT_DEFAULT_BOX)).toBeGreaterThan(lowestZoom(DESKTOP));
    expect(lowestZoom({ width: 390, height: 844 })).toBeGreaterThan(lowestZoom(CANVAS_ARTIFACT_DEFAULT_BOX));
    expect(lowestZoom({ width: 3000, height: 2000 })).toBeCloseTo(lowestZoom(DESKTOP));
  });
});

describe('where a quote may break (ONL-2960)', () => {
  it('keeps a hyphenated word whole and leaves the spaces between words free', () => {
    const runs = quoteRuns('Made-up data, a polished report');
    expect(runs.filter((run) => run.keepsTogether).map((run) => run.text)).toEqual(['Made-up']);
    expect(runs.map((run) => run.text).join('')).toBe('Made-up data, a polished report');
    expect(runs.some((run) => run.keepsTogether && /\s/.test(run.text))).toBe(false);
  });

  it('leaves a quote with no hyphenated word as one free run', () => {
    expect(quoteRuns('A portfolio for my photography - in black and white')).toEqual([{ text: 'A portfolio for my photography - in black and white', keepsTogether: false }]);
  });
});

describe('whether two quote answers differ (ONL-2960)', () => {
  it('compares the turn and every frame’s text', () => {
    const a = { byFrame: { f1: 'A' }, turnRunning: true };
    expect(sameFrameQuotes(a, { byFrame: { f1: 'A' }, turnRunning: true })).toBe(true);
    expect(sameFrameQuotes(a, { byFrame: { f1: 'A' }, turnRunning: false })).toBe(false);
    expect(sameFrameQuotes(a, { byFrame: { f1: 'B' }, turnRunning: true })).toBe(false);
    expect(sameFrameQuotes(a, { byFrame: { f1: 'A', f2: 'A' }, turnRunning: true })).toBe(false);
  });
});

describe('the quote layer (ONL-2960)', () => {
  it('fades the lifted quote out over the page, at the zoom it was showing at, rather than dropping it', () => {
    const shown = nextQuoteLayer(null, 'A bakery site', 0.4);
    expect(shown).toStrictEqual({ text: 'A bakery site', isLeaving: false, canvasZoom: 0.4 });
    const leaving = nextQuoteLayer(shown, undefined, 1);
    expect(leaving).toStrictEqual({ text: 'A bakery site', isLeaving: true, canvasZoom: 0.4 });
    expect(nextQuoteLayer(leaving, undefined, 1)).toBe(leaving);
  });

  it('shows a quote placed again mid-fade at once', () => {
    const leaving = nextQuoteLayer(nextQuoteLayer(null, 'A bakery site', 1), undefined, 1);
    expect(nextQuoteLayer(leaving, 'A pricing page', 1)).toStrictEqual({ text: 'A pricing page', isLeaving: false, canvasZoom: 1 });
  });

  it('draws nothing for a frame that never had a quote', () => {
    expect(nextQuoteLayer(null, undefined, 1)).toBeNull();
  });
});
