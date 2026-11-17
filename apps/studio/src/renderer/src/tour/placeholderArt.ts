/* Computed placeholder imagery for the tour's sample app: brushed-metal ribbons and cast concrete, drawn at runtime so the tour ships no image assets. */

type Vec3 = [number, number, number];

const hash = (n: number): number => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const ss = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const norm = (v: number[]): number[] => {
  const l = Math.hypot(...v) || 1;
  return v.map((x) => x / l);
};
const dot = (a: number[], b: number[]): number => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
const cross = (a: number[], b: number[]): Vec3 => [
  a[1]! * b[2]! - a[2]! * b[1]!,
  a[2]! * b[0]! - a[0]! * b[2]!,
  a[0]! * b[1]! - a[1]! * b[0]!,
];
type Pt = [number, number];
const bez = (p: Pt[], t: number): Pt => {
  const u = 1 - t;
  const k = (i: 0 | 1): number =>
    u * u * u * p[0]![i] + 3 * u * u * t * p[1]![i] + 3 * u * t * t * p[2]![i] + t * t * t * p[3]![i];
  return [k(0), k(1)];
};

type Cv = HTMLCanvasElement | OffscreenCanvas;
type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
let size: [number, number] = [0, 0];

function setup(cv: Cv): { c: Ctx; W: number; H: number; S: number } {
  // The tour never shows a picture larger than ~0.6 of its CSS size, so 1.25x stays crisp at a third of the pixels of 2x.
  const dpr = 1.25;
  const [W, H] = size;
  cv.width = W * dpr;
  cv.height = H * dpr;
  const c = cv.getContext('2d') as Ctx;
  c.scale(dpr, dpr);
  return { c, W, H, S: Math.max(W, H) };
}
function grain(c: Ctx, cv: Cv, amt: number): void {
  const id = c.getImageData(0, 0, cv.width, cv.height);
  const D = id.data;
  for (let p = 0; p < D.length; p += 4) {
    const n = (Math.random() - 0.5) * amt;
    D[p]! += n;
    D[p + 1]! += n;
    D[p + 2]! += n;
  }
  c.putImageData(id, 0, 0);
}
/** Maps the grey render onto a warm duotone so it sits with the cream sample app: lifted shadows, paper highlights. */
function warm(c: Ctx, cv: Cv): void {
  const id = c.getImageData(0, 0, cv.width, cv.height);
  const D = id.data;
  const lo = [62, 56, 49];
  const hi = [247, 243, 235];
  for (let p = 0; p < D.length; p += 4) {
    const l = (D[p]! * 0.299 + D[p + 1]! * 0.587 + D[p + 2]! * 0.114) / 255;
    const t = Math.pow(l, 0.85);
    D[p] = lo[0]! + (hi[0]! - lo[0]!) * t;
    D[p + 1] = lo[1]! + (hi[1]! - lo[1]!) * t;
    D[p + 2] = lo[2]! + (hi[2]! - lo[2]!) * t;
  }
  c.putImageData(id, 0, 0);
}
function vignette(c: Ctx, W: number, H: number, S: number, a: number): void {
  const g = c.createRadialGradient(W / 2, H / 2, S * 0.3, W / 2, H / 2, S * 0.8);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${a})`);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

const P = new Float32Array(512);
for (let i = 0; i < 512; i++) P[i] = hash(i * 0.913 + 0.17);
const vnoise = (x: number, y: number): number => {
  const f = (t: number): number => t * t * (3 - 2 * t);
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const h = (a: number, b: number): number => P[(((a * 73 + b * 151) % 512) + 512) % 512]!;
  const a = h(xi, yi);
  const b = h(xi + 1, yi);
  const c = h(xi, yi + 1);
  const d = h(xi + 1, yi + 1);
  const u = f(x - xi);
  const v = f(y - yi);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x: number, y: number, o: number): number => {
  let s = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < o; i++) {
    s += a * vnoise(x * f, y * f);
    f *= 2.03;
    a *= 0.5;
  }
  return s;
};

function corner(C: Pt, e1: Pt, e2: Pt, e3: Pt, lit: Vec3): (x: number, y: number) => number {
  const solve = (d: Pt, a: Pt, b: Pt): Pt => {
    const det = a[0] * b[1] - a[1] * b[0];
    return [(d[0] * b[1] - d[1] * b[0]) / det, (a[0] * d[1] - a[1] * d[0]) / det];
  };
  const distTo = (d: Pt, e: Pt): number => {
    const n = Math.hypot(e[0], e[1]);
    const t = (d[0] * e[0] + d[1] * e[1]) / n;
    return t < 0 ? 1e9 : Math.abs(d[0] * e[1] - d[1] * e[0]) / n;
  };
  return (x, y) => {
    const d: Pt = [x - C[0], y - C[1]];
    const top = solve(d, e2, e3);
    const left = solve(d, e1, e2);
    if (top[0] >= 0 && top[1] >= 0) {
      let l = lit[0] * (1 - 0.08 * Math.exp(-Math.min(distTo(d, e2), distTo(d, e3)) * 30));
      if (distTo(d, e2) < 0.006 || distTo(d, e3) < 0.006) l = Math.min(1, l + 0.12);
      return l;
    }
    if (left[0] >= 0 && left[1] >= 0)
      return lit[1] * (1 - 0.25 * y) * (1 - 0.18 * Math.exp(-Math.min(distTo(d, e1), distTo(d, e2)) * 18));
    return lit[2] * (1 - 0.3 * y) * (1 - 0.22 * Math.exp(-Math.min(distTo(d, e1), distTo(d, e3)) * 14));
  };
}

const SCENES: Record<string, (A: number) => (u: number, v: number) => number> = {
  ledge: () => (u, v) => {
    const e = 0.74 - 0.06 * u;
    if (v < e) {
      let l = 0.66 - 0.16 * u + 0.06 * (1 - v);
      l *= 1 - 0.38 * Math.exp(-(e - v) * 22);
      return l * (1 - 0.42 * ss(-0.06, 0.06, u * 1.15 + v * 0.55 - 0.92));
    }
    if (v < e + 0.02) return 0.93 - 0.1 * u;
    return (0.8 - 0.12 * u) * (1 - 0.25 * ss(e, 1, v));
  },
  cube: (A) => {
    const f = corner([0.58 * A, 0.58], [0.06, 1], [-1, -0.38], [1, -0.52], [0.86, 0.5, 0.24]);
    return (u, v) => f(u * A, v);
  },
  cube2: (A) => {
    const f = corner([0.3 * A, 0.3], [0.1, 1], [-1, -0.6], [1, -0.2], [0.7, 0.36, 0.16]);
    return (u, v) => f(u * A, v) * (1 + 0.25 * Math.exp(-((u - 0.85) ** 2 + (v - 0.15) ** 2) * 5));
  },
};

function slab(cv: Cv, scene: string): void {
  const { c, W, H, S } = setup(cv);
  const w = cv.width;
  const h = cv.height;
  const sc = SCENES[scene]!(w / h);
  const img = c.createImageData(w, h);
  const D = img.data;
  const seed = hash(w * 3 + h) * 50;
  // The canvas is already at 1.25x, so one sample per pixel is enough.
  const N = 1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let l = 0;
      for (let sy = 0; sy < N; sy++) for (let sx = 0; sx < N; sx++) l += sc((x + (sx + 0.5) / N) / w, (y + (sy + 0.5) / N) / h);
      l /= N * N;
      const X = (x / w) * (S / 6) + seed;
      const Y = (y / h) * ((S * h) / w / 6);
      const m = 0.86 + 0.2 * fbm(X * 0.35, Y * 0.35, 4) + 0.08 * (fbm(X * 3, Y * 3, 3) - 0.5) + 0.05 * (hash(x * 12.9898 + y * 78.233 + seed) - 0.5);
      const k = Math.pow(Math.max(0, Math.min(1, l * m)), 1.05) * 255;
      const i = (y * w + x) * 4;
      D[i] = k + 2;
      D[i + 1] = k + 1;
      D[i + 2] = k;
      D[i + 3] = 255;
    }
  c.putImageData(img, 0, 0);
  vignette(c, W, H, S, 0.22);
  warm(c, cv);
}

interface Preset { path: Pt[]; w: number; t0: number; t1: number; wave: number; freq: number; light: Vec3; bg: Pt }
const PRESETS: Record<string, Preset> = {
  fold: { path: [[0.08, 1.15], [0.3, 0.05], [0.95, -0.25], [1.02, 0.75]], w: 0.3, t0: 0.15, t1: 2.9, wave: 0.25, freq: 1, light: [0.55, -0.75, 0.45], bg: [0.78, 0.12] },
  sweep: { path: [[-0.15, 1.05], [0.35, 0.92], [0.62, 0.25], [1.15, -0.08]], w: 0.42, t0: 0.35, t1: 1.55, wave: 0.12, freq: 0.8, light: [0.65, -0.6, 0.45], bg: [0.85, 0.05] },
  twist: { path: [[0.05, 1.1], [0.25, 0.4], [0.75, 0.7], [0.98, -0.1]], w: 0.34, t0: -0.4, t1: 2.4, wave: 0.3, freq: 1.4, light: [0.4, -0.8, 0.5], bg: [0.7, 0.15] },
  wave: { path: [[-0.1, 0.7], [0.3, 0.1], [0.7, 1.0], [1.1, 0.3]], w: 0.26, t0: 0.9, t1: 1.9, wave: 0.6, freq: 2, light: [0.6, -0.5, 0.6], bg: [0.8, 0.2] },
  coil: { path: [[0.5, 1.15], [-0.2, 0.45], [1.2, 0.35], [0.45, -0.15]], w: 0.22, t0: 0, t1: 4.2, wave: 0.15, freq: 1.5, light: [0.3, -0.85, 0.45], bg: [0.5, 0.45] },
};
interface Look { bg: [string, string, string]; env: number; base: number; strip: number; vig: number; center?: Pt; dark?: number; spec?: number; spot?: boolean }
const LOOKS: Record<string, Look> = {
  night: { bg: ['#424242', '#1a1a1a', '#030303'], env: 1, base: 0, strip: 0.55, vig: 0.5 },
  highkey: { bg: ['#f2f2f0', '#c4c4c2', '#8e8e8c'], env: 0.75, base: 0.04, strip: 0.2, vig: 0.18, center: [0.3, 0.2], dark: 0.55 },
  rim: { bg: ['#141414', '#070707', '#000'], env: 0.28, base: 0, strip: 0.9, vig: 0.6, spec: 2.6 },
  side: { bg: ['#7a7a7a', '#2c2c2c', '#080808'], env: 1.25, base: 0.02, strip: -0.2, vig: 0.45, center: [0.02, 0.55] },
  spot: { bg: ['#5c5c5c', '#0d0d0d', '#000'], env: 0.9, base: 0, strip: 0, vig: 0.7, center: [0.5, 0.45], spot: true },
};
const studio = (r: number[], Lk: Look): number => {
  const y = r[1]!;
  const x = r[0]!;
  const box = ss(0.55, 0.75, -y) * (1 - ss(0.92, 1, -y));
  const strip = Math.exp(-Math.pow((x - Lk.strip) * 9, 2)) * 0.9;
  const card = Math.exp(-Math.pow((x + 0.7) * 5, 2)) * 0.25;
  return 0.02 + box * 1.1 + strip + card + ss(0.2, 0.9, y) * 0.08;
};

interface Vert { x: number; y: number; z: number; n: number[]; v: number }
function ribbon(cv: Cv, preset: string, look: string): void {
  const Pr = PRESETS[preset]!;
  const Lk = LOOKS[look]!;
  const { c, W, H, S } = setup(cv);
  const ctr = Lk.center ?? Pr.bg;
  const g = c.createRadialGradient(W * ctr[0], H * ctr[1], 0, W * ctr[0], H * ctr[1], S * (Lk.spot ? 0.55 : 1.1));
  g.addColorStop(0, Lk.bg[0]);
  g.addColorStop(0.3, Lk.bg[1]);
  g.addColorStop(1, Lk.bg[2]);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  const L = norm(Pr.light);
  const Hh = norm([L[0]!, L[1]!, L[2]! + 1]);
  // Strip count follows the picture's size: a 70px thumbnail needs a fraction of a hero's detail.
  const NS = Math.round(Math.min(200, Math.max(60, S * 0.55)));
  const NV = Math.round(Math.min(30, Math.max(14, S / 9)));
  const pts: Vert[][] = [];
  for (let i = 0; i <= NS; i++) {
    const s = i / NS;
    const C = bez(Pr.path, s);
    const C2 = bez(Pr.path, Math.min(1, s + 0.002));
    const C1 = bez(Pr.path, Math.max(0, s - 0.002));
    const T = norm([(C2[0] - C1[0]) * W, (C2[1] - C1[1]) * H, 0]);
    const Nr = [-T[1]!, T[0]!];
    const th = Pr.t0 + (Pr.t1 - Pr.t0) * s + Pr.wave * Math.sin(Math.PI * 2 * s * Pr.freq);
    const w = Pr.w * S * (0.35 + 0.65 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, s * 1.05))), 0.6));
    const row: Vert[] = [];
    for (let j = 0; j <= NV; j++) {
      const v = (j / NV) * 2 - 1;
      const cs = Math.cos(th);
      const sn = Math.sin(th);
      const a = norm([Nr[0]! * cs, Nr[1]! * cs - sn * 0.55, sn]);
      let n: number[] = norm(cross(T, a));
      if (n[2]! < 0) n = n.map((q) => -q);
      row.push({ x: C[0] * W + Nr[0]! * v * w * cs, y: C[1] * H + Nr[1]! * v * w * cs - v * w * sn * 0.55, z: v * w * sn + s * 0.001, n, v });
    }
    pts.push(row);
  }
  const quads: { a: Vert; b: Vert; d: Vert; e: Vert; z: number; i: number; j: number }[] = [];
  for (let i = 0; i < NS; i++)
    for (let j = 0; j < NV; j++) {
      const a = pts[i]![j]!;
      const e = pts[i + 1]![j + 1]!;
      quads.push({ a, b: pts[i + 1]![j]!, d: pts[i]![j + 1]!, e, z: (a.z + e.z) / 2, i, j });
    }
  quads.sort((p, q) => p.z - q.z);
  for (const q of quads) {
    const n = q.a.n;
    let env = studio([2 * n[2]! * n[0]!, 2 * n[2]! * n[1]!], Lk) * Lk.env;
    if (Lk.spot) {
      const dx = q.a.x / W - ctr[0];
      const dy = q.a.y / H - ctr[1];
      env *= 0.25 + 1.1 * Math.exp(-(dx * dx + dy * dy) * 9);
    }
    const fres = 0.55 + 0.45 * Math.pow(1 - Math.max(0, n[2]!), 3);
    const spec = Math.pow(Math.max(0, dot(n, Hh)), 140) * (Lk.spec ?? 1.6);
    const brush = (hash(q.j * 13.7) - 0.5) * 0.09 + (hash(q.i * 0.37 + q.j) - 0.5) * 0.03;
    let lum = (env * fres + spec + Math.max(0, dot(n, L)) * 0.08 + brush + Lk.base) * (1 - Math.pow(Math.abs(q.a.v), 10) * 0.5);
    if (Lk.dark) lum *= Lk.dark + (1 - Lk.dark) * Math.min(1, spec * 2);
    lum = Math.max(0, Math.min(1, lum / (1 + lum * 0.35)));
    const k = Math.round(255 * Math.pow(lum, 0.9));
    const col = `rgb(${k},${k},${Math.min(255, k + 4)})`;
    c.fillStyle = col;
    c.strokeStyle = col;
    c.lineWidth = 0.6;
    c.beginPath();
    c.moveTo(q.a.x, q.a.y);
    c.lineTo(q.b.x, q.b.y);
    c.lineTo(q.e.x, q.e.y);
    c.lineTo(q.d.x, q.d.y);
    c.closePath();
    c.fill();
    c.stroke();
  }
  c.globalCompositeOperation = 'screen';
  const rim = pts.map((r) => r[NV]!);
  c.beginPath();
  rim.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
  c.strokeStyle = 'rgba(255,255,255,.7)';
  c.lineWidth = 0.8;
  c.shadowColor = 'rgba(255,255,255,.9)';
  c.shadowBlur = 7;
  c.stroke();
  c.shadowBlur = 0;
  c.globalCompositeOperation = 'source-over';
  grain(c, cv, 12);
  vignette(c, W, H, S, Lk.vig * 0.7);
  warm(c, cv);
}

/** `art` is `slab:<scene>` or `metal:<preset>:<look>`. */
/** Paints one picture at a CSS size onto any canvas. Runs inside the art worker. */
export function paintInto(cv: Cv, art: string, W: number, H: number): void {
  size = [W, H];
  const [kind, a, b] = art.split(':');
  if (kind === 'slab') slab(cv, a!);
  else ribbon(cv, a!, b ?? 'night');
}
