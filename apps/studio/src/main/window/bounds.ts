import { defineDomain } from '../state/store.js';

/** Electron's `Rectangle`, restated so this module stays Electron-free. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WindowState {
  bounds?: Rect;
  isMaximized?: boolean;
}

export const DEFAULT_SIZE = { width: 1440, height: 900 } as const;

const MIN_VISIBLE = { width: 96, height: 48 } as const;

const domain = defineDomain<WindowState>({
  name: 'window',
  version: 1,
  fallback: () => ({}),
  // No earlier version of this domain existed; anything unversioned is not ours.
  migrate: (_data, from) => {
    throw new Error(`no migration from version ${String(from)}`);
  },
  debounceMs: 400,
});

function overlap(a: Rect, b: Rect): { width: number; height: number } {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return { width, height };
}

/** `undefined`, never clamped onto a display: a shoved window reads as a bug, a centred default as a fresh start. */
export function chooseBounds(saved: Rect | undefined, displays: readonly Rect[]): Rect | undefined {
  if (!saved) return undefined;
  if (!Number.isFinite(saved.x) || !Number.isFinite(saved.y)) return undefined;
  if (saved.width < MIN_VISIBLE.width || saved.height < MIN_VISIBLE.height) return undefined;

  const reachable = displays.some((display) => {
    const seen = overlap(saved, display);
    return seen.width >= MIN_VISIBLE.width && seen.height >= MIN_VISIBLE.height;
  });
  return reachable ? saved : undefined;
}

export function restoreWindowOptions(displays: readonly Rect[]): Rect | typeof DEFAULT_SIZE {
  return chooseBounds(domain.read().bounds, displays) ?? DEFAULT_SIZE;
}

export function wasMaximized(): boolean {
  return domain.read().isMaximized === true;
}

export function rememberWindow(state: { bounds: Rect; isMaximized: boolean }): void {
  // A maximized window's bounds are the screen; keep the last normal rectangle.
  domain.update((current) => ({
    bounds: state.isMaximized ? current.bounds : state.bounds,
    isMaximized: state.isMaximized,
  }));
}
