/** The tour's backdrop painted once into a flat bitmap: a misty charcoal void over a floor lit from below, with a brushed sheen and grain. One texture costs the GPU nothing to zoom; the live blur and blend layers it replaces re-rendered on every camera frame. Coordinates are the backdrop layer's own px (scene px + 400). */

const W0 = 2320;
const H0 = 1800;
/** The backdrop is soft everywhere, so half resolution is indistinguishable and a quarter of the work. */
const BACKDROP_SCALE = 0.5;

function hash(x: number, y: number, seed: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return h - Math.floor(h);
}
function noise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, y: number, seed: number): number {
  let s = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < 4; i++) {
    s += amp * noise(x * f, y * f, seed + i);
    f *= 2.03;
    amp *= 0.5;
  }
  return s;
}
const clamp = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const ramp = (y: number, stops: readonly [number, number][]): number => {
  if (y <= stops[0]![0]) return stops[0]![1];
  for (let i = 1; i < stops.length; i++) {
    const [y1, v1] = stops[i]!;
    const [y0, v0] = stops[i - 1]!;
    if (y <= y1) return v0 + ((v1 - v0) * (y - y0)) / (y1 - y0);
  }
  return stops[stops.length - 1]![1];
};
const radial = (x: number, y: number, cx: number, cy: number, rx: number, ry: number, a: number, end: number): number => {
  const t = Math.hypot((x - cx) / rx, (y - cy) / ry) / end;
  return t >= 1 ? 0 : a * (1 - t) * (1 - t);
};

// Grey levels 0..1 for each layer, matching the CSS stack it replaces.
const VOID: [number, number][] = [[0, 0x0b], [900, 0x0e], [1150, 0x12]].map(([y, v]) => [y!, v! / 255]);
const FLOOR_A: [number, number][] = [[1110, 0], [1170, 1], [1800, 1]];
const FLOOR_V: [number, number][] = [[1110, 0x2d], [1170, 0x2d], [1250, 0x9b], [1340, 0xdc], [1480, 0xec], [1800, 0xc9]].map(([y, v]) => [y!, v! / 255]);
const MIST_MASK: [number, number][] = [[0, 0.35], [700, 0.7], [1050, 1], [1220, 0]];
const SIDE_MASK: [number, number][] = [[0, 1], [1050, 1], [1250, 0]];
const BRUSH_MASK: [number, number][] = [[1150, 0], [1260, 1]];

export function paintBackdrop(cv: HTMLCanvasElement | OffscreenCanvas): void {
  const w = Math.round(W0 * BACKDROP_SCALE);
  const h = Math.round(H0 * BACKDROP_SCALE);
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  const img = c.createImageData(w, h);
  const D = img.data;
  for (let py = 0; py < h; py++) {
    const y = py / BACKDROP_SCALE;
    const voidV = ramp(y, VOID);
    const floorA = ramp(y, FLOOR_A);
    const floorV = ramp(y, FLOOR_V);
    const mistMask = ramp(y, MIST_MASK);
    const sideMask = ramp(y, SIDE_MASK);
    const brushMask = ramp(y, BRUSH_MASK);
    for (let px = 0; px < w; px++) {
      const x = px / BACKDROP_SCALE;
      let v = voidV + radial(x, y, 900, 300, 1100, 700, 0.0275, 0.7);
      if (mistMask > 0) {
        const m1 = clamp(1.1 * fbm(x * 0.00175, y * 0.0035, 12) - 0.38);
        const m2 = clamp(1.1 * fbm((W0 - x) * 0.0023, y * 0.0043, 31) - 0.38);
        v += ((m1 + m2) / 2) * 0.62 * 0.15 * mistMask;
      }
      v = v * (1 - floorA) + floorV * floorA;
      v +=
        (radial(x, y, 900, 1330, 520, 130, 0.55, 0.7) +
          radial(x, y, 1420, 1350, 420, 110, 0.45, 0.72) +
          radial(x, y, 1180, 1260, 700, 90, 0.35, 0.75)) *
        (1 - v) *
        0.9;
      if (brushMask > 0) v *= 1 + (fbm(x * 0.002, y * 0.18, 4) - 0.5) * 0.12 * brushMask;
      v += radial(x, y, 1160, 1190, 800, 120, 0.2, 0.7) * (1 - v);
      const xr = x / W0;
      const side = xr < 0.22 ? 0.4 * (1 - xr / 0.22) : xr > 0.8 ? 0.45 * ((xr - 0.8) / 0.2) : 0;
      v = v * (1 - side * sideMask) + (8 / 255) * side * sideMask;
      v += (hash(px, py, 9) - 0.5) * 0.03;
      const k = clamp(v) * 255;
      const i = (py * w + px) * 4;
      D[i] = k;
      D[i + 1] = k;
      D[i + 2] = Math.min(255, k + 1.5);
      D[i + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
}
