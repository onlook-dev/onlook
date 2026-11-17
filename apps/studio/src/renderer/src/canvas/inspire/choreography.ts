// Pure functions of film time: no DOM, no store, no clock.
import { EASE_IN_OUT, EASE_OUT, EASE_SLIDE, mix, span, type Span } from '../motion/timeline.js';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Screen px, measured once at the tap. */
export interface Geometry {
  tool: Rect;
  toolRadius: number;
  seat: Rect;
}

export const BEATS = {
  tipFade: [0, 160],
  tipCollapse: [40, 380],
  canvasOut: [60, 300],
  blink1: [420, 700],
  blink2: [780, 1000],
  flight: [940, 1520],
  pageIn: [1000, 1360],
  chromeIn: [1400, 1600],
  outlineOut: [1440, 1620],
} as const satisfies Record<string, Span>;
export const FILM_END = 1700;
/** The frame takes its selection as the outline hands over to its ring. */
export const SELECT_AT = 1500;

/** Opacity only, no blinks (blinking is flashing), no flight. */
export const REDUCED_BEATS = {
  fade: [0, 150],
  ring: [0, 600],
  ringOut: [600, 750],
  frameIn: [600, 800],
} as const satisfies Record<string, Span>;
export const REDUCED_END = 800;

export const OUTLINE_PAD = 2;
/** Of the flight: from here on the outline holds the frame's aspect. */
export const ASPECT_LOCK = 0.4;


/** 70 ms up, held, 90 ms down. */
function blink(t: number, [a, b]: Span): number {
  return Math.min(span(t, [a, a + 70], EASE_OUT), 1 - span(t, [b - 90, b], EASE_IN_OUT));
}

/** The second blink holds until the outline lifts off and hands over to the ring. */
const BLINK_2_HELD: Span = [BEATS.blink2[0], BEATS.blink2[1] + 400];

function padded(tool: Rect): Rect {
  return { x: tool.x - OUTLINE_PAD, y: tool.y - OUTLINE_PAD, w: tool.w + OUTLINE_PAD * 2, h: tool.h + OUTLINE_PAD * 2 };
}

export interface OutlineState {
  rect: Rect;
  radius: number;
  opacity: number;
}

/** Leaves the tool from its bottom centre and lands its bottom centre on the seat's. */
export function outlineAt(t: number, geo: Geometry): OutlineState {
  const from = padded(geo.tool);
  const to = geo.seat;
  const fly = span(t, BEATS.flight, EASE_SLIDE);
  const w = mix(from.w, to.w, fly);
  const h = mix(mix(from.h, to.h, fly), (w * to.h) / to.w, Math.min(1, fly / ASPECT_LOCK));
  const rect = {
    x: mix(from.x + from.w / 2, to.x + to.w / 2, fly) - w / 2,
    y: mix(from.y + from.h, to.y + to.h, fly) - h,
    w,
    h,
  };
  const opacity = t >= BEATS.flight[0]
    ? 1 - span(t, BEATS.outlineOut, EASE_IN_OUT)
    : Math.max(blink(t, BEATS.blink1), blink(t, BLINK_2_HELD));
  return { rect, radius: mix(geo.toolRadius + OUTLINE_PAD, 0, fly), opacity };
}

const pageAt = (t: number): number => span(t, BEATS.pageIn, EASE_OUT);
export const chromeAt = (t: number): number => span(t, BEATS.chromeIn, EASE_OUT);

export function tipAt(t: number): { opacity: number; scale: number } {
  const fade = span(t, BEATS.tipFade, EASE_OUT);
  return { opacity: 1 - fade, scale: mix(1, 0.96, fade) };
}

export function canvasOutAt(t: number): { opacity: number; dy: number } {
  const out = span(t, BEATS.canvasOut, EASE_OUT);
  return { opacity: 1 - out, dy: out * 10 };
}

export interface PageState {
  /** Screen px from the seat's top-left; the scale is about that corner. */
  dx: number;
  dy: number;
  scale: number;
  /** Of the frame's own height, cut from the bottom while the outline is shorter than the page. */
  clipBottom: number;
  opacity: number;
}

/** The page rides inside the outline: as wide as it, top-aligned, cut to its height. */
export function pageStateAt(t: number, geo: Geometry): PageState {
  const { rect } = outlineAt(t, geo);
  const scale = rect.w / geo.seat.w;
  const drawnHeight = geo.seat.h * scale;
  return {
    dx: rect.x - geo.seat.x,
    dy: rect.y - geo.seat.y,
    scale,
    clipBottom: drawnHeight > 0 ? Math.max(0, 1 - rect.h / drawnHeight) : 0,
    opacity: pageAt(t),
  };
}

export const reducedFadeAt = (t: number): number => 1 - span(t, REDUCED_BEATS.fade, EASE_OUT);

/** The ring stays on the tool, steady, and fades; nothing travels. */
export function reducedOutlineAt(t: number, geo: Geometry): OutlineState {
  return {
    rect: padded(geo.tool),
    radius: geo.toolRadius + OUTLINE_PAD,
    opacity: 1 - span(t, REDUCED_BEATS.ringOut, EASE_IN_OUT),
  };
}

export function reducedPageStateAt(t: number): PageState {
  return { dx: 0, dy: 0, scale: 1, clipBottom: 0, opacity: span(t, REDUCED_BEATS.frameIn, EASE_OUT) };
}
