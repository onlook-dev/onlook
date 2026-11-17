export type Span = readonly [number, number];

function cubicBezier(x1: number, y1: number, x2: number, y2: number): (k: number) => number {
  const a = (p1: number, p2: number) => 1 - 3 * p2 + 3 * p1;
  const b = (p1: number, p2: number) => 3 * p2 - 6 * p1;
  const c = (p1: number) => 3 * p1;
  const at = (s: number, p1: number, p2: number) => ((a(p1, p2) * s + b(p1, p2)) * s + c(p1)) * s;
  const slope = (s: number, p1: number, p2: number) => 3 * a(p1, p2) * s * s + 2 * b(p1, p2) * s + c(p1);
  const solve = (x: number): number => {
    let s = x;
    for (let i = 0; i < 8; i += 1) {
      const dx = at(s, x1, x2) - x;
      if (Math.abs(dx) < 1e-7) return s;
      const d = slope(s, x1, x2);
      if (Math.abs(d) < 1e-6) break;
      s -= dx / d;
    }
    let lo = 0;
    let hi = 1;
    s = x;
    for (let i = 0; i < 40; i += 1) {
      const v = at(s, x1, x2);
      if (Math.abs(v - x) < 1e-7) return s;
      if (v < x) lo = s;
      else hi = s;
      s = (lo + hi) / 2;
    }
    return s;
  };
  return (k) => (k <= 0 ? 0 : k >= 1 ? 1 : at(solve(k), y1, y2));
}

export const EASE_OUT = cubicBezier(0.2, 0, 0, 1);
export const EASE_IN_OUT = cubicBezier(0.4, 0, 0.2, 1);
export const EASE_SLIDE = cubicBezier(0.32, 0.72, 0, 1);
const LINEAR = (k: number) => k;

export function span(t: number, [a, b]: Span, ease: (k: number) => number = LINEAR): number {
  return ease(Math.min(1, Math.max(0, (t - a) / (b - a))));
}

export const mix = (a: number, b: number, k: number): number => a + (b - a) * k;

export interface Sample<T> {
  /** 0–1 along the animation, as a WAAPI keyframe `offset`. */
  offset: number;
  value: T;
}

/** At least `hz` samples a second across `[0, end]`, both ends included. */
export function sample<T>(end: number, at: (t: number) => T, hz = 120): Sample<T>[] {
  const count = Math.max(1, Math.ceil((end / 1000) * hz));
  const out: Sample<T>[] = [];
  for (let i = 0; i <= count; i += 1) {
    const t = (end * i) / count;
    out.push({ offset: i / count, value: at(t) });
  }
  return out;
}
