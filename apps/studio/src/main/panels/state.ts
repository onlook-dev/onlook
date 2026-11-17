import { PANEL_DEFAULTS, PANEL_LIMITS, type PanelsState } from '@studio/events';
import { defineDomain } from '../state/store.js';

const domain = defineDomain<PanelsState>({
  name: 'panels',
  version: 1,
  fallback: () => ({ ...PANEL_DEFAULTS }),
  // No pre-ONL-1953 file existed; an unversioned one is not ours.
  migrate: (_data, from) => {
    throw new Error(`no migration from version ${String(from)}`);
  },
  debounceMs: 400,
});

const inRange = (value: unknown, limit: { min: number; max: number }): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= limit.min && value <= limit.max;

// Drop, never clamp: a clamped width persists a value nobody chose.
// A key the file does not hold takes its default, which is what lets a key be
// added without the version bump `migrate` would throw on (ONL-2563).
function sanitize(value: unknown): PanelsState {
  const v = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  return {
    sidebar: inRange(v['sidebar'], PANEL_LIMITS.sidebar) ? v['sidebar'] : PANEL_DEFAULTS.sidebar,
    end: inRange(v['end'], PANEL_LIMITS.end) ? v['end'] : PANEL_DEFAULTS.end,
    code: inRange(v['code'], PANEL_LIMITS.code) ? v['code'] : PANEL_DEFAULTS.code,
  };
}

export function readPanels(): PanelsState {
  return sanitize(domain.read());
}

/** Merges: a caller sends the widths that moved, so a drag of one panel cannot erase another's (ONL-2563). */
export function writePanels(next: Partial<PanelsState>): void {
  domain.update((current) => sanitize({ ...sanitize(current), ...next }));
}

export function resetPanelsCache(): void {
  domain.reset();
}
