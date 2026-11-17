import type { FrameQuotes } from '@studio/events';

export const FRAME_QUOTE_ZOOM = 2;
export const FRAME_QUOTE_MAX_LINES = 9;
/** The frame the quote was designed in; a smaller one shows the same layout shrunk to fit. */
const FRAME_QUOTE_DESIGN_SIZE = { width: 1512, height: 982 } as const;
const FRAME_QUOTE_MEASURE_SHARE = 0.6;
export const FRAME_QUOTE_MAX_MEASURE = FRAME_QUOTE_MEASURE_SHARE * FRAME_QUOTE_DESIGN_SIZE.width;
const FRAME_QUOTE_INSET = 64;
/** `display-1`'s 26px at its 1.3846 leading, before the zoom. */
export const FRAME_QUOTE_LINE = 36;
const FRAME_QUOTE_TYPE = 26;
/** In screen px: the smallest the quote's type is drawn at; below it the object shows only its ground. */
const FRAME_QUOTE_MIN_TYPE = 9;

export function sameFrameQuotes(a: FrameQuotes, b: FrameQuotes): boolean {
  if (a.turnRunning !== b.turnRunning) return false;
  const ids = Object.keys(a.byFrame);
  return ids.length === Object.keys(b.byFrame).length && ids.every((id) => a.byFrame[id] === b.byFrame[id]);
}

/** The quote on screen: the one the frame holds, or the one fading out over the page after it lifted. */
export interface QuoteLayer {
  text: string;
  isLeaving: boolean;
  /** Held from the moment it began to leave: the frame stops following the camera once its quote is gone. */
  canvasZoom: number;
}

/** A lifted quote fades out over the page rather than vanishing; a quote placed again mid-fade shows at once (ONL-2960). */
export function nextQuoteLayer(layer: QuoteLayer | null, quote: string | undefined, canvasZoom: number): QuoteLayer | null {
  if (quote !== undefined) {
    return layer !== null && !layer.isLeaving && layer.text === quote && layer.canvasZoom === canvasZoom ? layer : { text: quote, isLeaving: false, canvasZoom };
  }
  if (layer === null || layer.isLeaving) return layer;
  return { ...layer, isLeaving: true };
}

export interface FrameQuoteLayout {
  /** CSS zoom on the quote's type. */
  zoom: number;
  /** In page pixels. */
  measure: number;
  maxLines: number;
}

/**
 * In page pixels. Scaling with the frame, an object smaller than the design frame in either direction shows the
 * desktop layout shrunk to fit, so every line breaks where it does at 1512 × 982; otherwise the type keeps one size.
 */
export function frameQuoteLayout(frame: { width: number; height: number }): FrameQuoteLayout {
  const scale = Math.min(1, Math.max(1, frame.width) / FRAME_QUOTE_DESIGN_SIZE.width, Math.max(1, frame.height) / FRAME_QUOTE_DESIGN_SIZE.height);
  const zoom = FRAME_QUOTE_ZOOM * scale;
  const measure = FRAME_QUOTE_MAX_MEASURE * scale;
  const fits = Math.floor((frame.height - 2 * FRAME_QUOTE_INSET * scale) / (FRAME_QUOTE_LINE * zoom));
  return { zoom, measure, maxLines: Math.min(FRAME_QUOTE_MAX_LINES, Math.max(1, fits)) };
}

export interface QuoteRun {
  text: string;
  keepsTogether: boolean;
}

/** A hyphenated word stays on one line: a break after its hyphen reads as a word split in two. */
export function quoteRuns(quote: string): QuoteRun[] {
  return quote
    .split(/(\S*\p{L}[-\u2010]\p{L}\S*)/u)
    .filter((text) => text !== '')
    .map((text) => ({ text, keepsTogether: /\p{L}[-\u2010]\p{L}/u.test(text) && !/\s/.test(text) }));
}

/** On screen: the quote's own zoom times the canvas's, so a smaller object loses its text at a nearer canvas zoom. */
export function quoteTextShows(layout: Pick<FrameQuoteLayout, 'zoom'>, canvasZoom: number): boolean {
  return FRAME_QUOTE_TYPE * layout.zoom * canvasZoom >= FRAME_QUOTE_MIN_TYPE;
}
