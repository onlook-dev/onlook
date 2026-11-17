import { describe, expect, it } from 'bun:test';
import {
  ASPECT_LOCK,
  BEATS,
  FILM_END,
  OUTLINE_PAD,
  REDUCED_END,
  outlineAt,
  pageStateAt,
  reducedOutlineAt,
  reducedPageStateAt,
  type Geometry,
} from './choreography.js';
import { sample } from '../motion/timeline.js';

const GEO: Geometry = {
  tool: { x: 600, y: 820, w: 32, h: 32 },
  toolRadius: 6,
  seat: { x: 300, y: 180, w: 840, h: 545.4 },
};

const close = (a: number, b: number, digits = 6) => expect(a).toBeCloseTo(b, digits);

describe('the outline', () => {
  it('starts as the tool ringed by its pad', () => {
    const { rect, radius } = outlineAt(0, GEO);
    expect(rect).toEqual({ x: 600 - OUTLINE_PAD, y: 820 - OUTLINE_PAD, w: 32 + 2 * OUTLINE_PAD, h: 32 + 2 * OUTLINE_PAD });
    expect(radius).toBe(6 + OUTLINE_PAD);
  });

  it('ends exactly on the seat with square corners', () => {
    const { rect, radius } = outlineAt(BEATS.flight[1], GEO);
    expect(rect).toEqual(GEO.seat);
    expect(radius).toBe(0);
  });

  it('holds the frame aspect once the lock point of the flight is passed', () => {
    const [a, b] = BEATS.flight;
    for (let t = a + (b - a) * ASPECT_LOCK + 1; t <= b; t += 7) {
      const { rect } = outlineAt(t, GEO);
      close(rect.h / rect.w, GEO.seat.h / GEO.seat.w, 6);
    }
  });

  it('is gone once its handover to the ring has finished', () => {
    expect(outlineAt(BEATS.outlineOut[1], GEO).opacity).toBe(0);
  });

  it('blinks twice before it leaves the tool', () => {
    const lit = sample(BEATS.flight[0], (t) => outlineAt(t, GEO).opacity > 0.5, 1000).map((s) => s.value);
    const rises = lit.filter((on, i) => on && !lit[i - 1]).length;
    expect(rises).toBe(2);
  });
});

describe('the page', () => {
  it('rests at its seat untransformed, unclipped and opaque', () => {
    expect(pageStateAt(BEATS.flight[1], GEO)).toEqual({ dx: 0, dy: 0, scale: 1, clipBottom: 0, opacity: 1 });
  });

  it('is never cut once the outline holds its aspect', () => {
    const [a, b] = BEATS.flight;
    close(pageStateAt(a + (b - a) * ASPECT_LOCK + 1, GEO).clipBottom, 0, 9);
  });
});

describe('after the film', () => {
  it('moves nothing past its end', () => {
    for (const t of [FILM_END, FILM_END + 50, FILM_END + 5000]) {
      expect(outlineAt(t, GEO)).toEqual(outlineAt(FILM_END, GEO));
      expect(pageStateAt(t, GEO)).toEqual(pageStateAt(FILM_END, GEO));
    }
  });
});

describe('under reduced motion', () => {
  it('never moves the frame off its seat or the ring off the tool', () => {
    for (const { value: t } of sample(REDUCED_END, (t) => t, 240)) {
      const page = reducedPageStateAt(t);
      expect([page.dx, page.dy, page.scale, page.clipBottom]).toEqual([0, 0, 1, 0]);
      expect(reducedOutlineAt(t, GEO).rect).toEqual(outlineAt(0, GEO).rect);
    }
  });

  it('ends with the frame shown and the ring gone', () => {
    expect(reducedPageStateAt(REDUCED_END).opacity).toBe(1);
    expect(reducedOutlineAt(REDUCED_END, GEO).opacity).toBe(0);
  });
});

describe('sampling', () => {
  it('covers both ends at the asked rate', () => {
    const s = sample(1700, (t) => t, 120);
    expect(s[0]).toEqual({ offset: 0, value: 0 });
    expect(s.at(-1)).toEqual({ offset: 1, value: 1700 });
    expect(s.length).toBeGreaterThanOrEqual(1700 * 0.12);
  });
});
