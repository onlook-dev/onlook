import { SIDEBAR_LAYOUT_LIMITS, type SidebarLayout } from '@studio/events';
import { defineDomain } from '../state/store.js';
import { normalizePath, workspaceRoot } from '../workspace/store.js';

interface SidebarLayoutState {
  byWorkspace: Record<string, SidebarLayout>;
}

const domain = defineDomain<SidebarLayoutState>({
  name: 'sidebar-layout',
  version: 1,
  fallback: () => ({ byWorkspace: {} }),
  // Nothing predates version 1; an unversioned file is not ours.
  migrate: (_data, from) => {
    throw new Error(`no migration from version ${String(from)}`);
  },
  root: workspaceRoot,
  debounceMs: 400,
});

const removedProjects = new Set<string>();

export function reopenSidebarLayout(worktreePath: string): void {
  removedProjects.delete(worktreePath);
  removedProjects.delete(normalizePath(worktreePath));
}

const inRange = (value: unknown, limit: { min: number; max: number }): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= limit.min && value <= limit.max;

// Drop, never clamp: a clamped height persists a split nobody dragged, and absent means the section hugs its rows.
function sanitize(value: unknown): SidebarLayout {
  const v = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  return inRange(v['pagesHeight'], SIDEBAR_LAYOUT_LIMITS.pagesHeight)
    ? { pagesHeight: v['pagesHeight'] }
    : {};
}

export function readSidebarLayout(worktreePath: string): SidebarLayout {
  return sanitize(domain.read().byWorkspace[normalizePath(worktreePath)]);
}

export function writeSidebarLayout(worktreePath: string, next: SidebarLayout): void {
  const key = normalizePath(worktreePath);
  if (key === '' || removedProjects.has(key)) return;
  domain.update((state) => ({
    byWorkspace: { ...state.byWorkspace, [key]: sanitize(next) },
  }));
}

export function forgetSidebarLayout(worktreePath: string): void {
  const key = normalizePath(worktreePath);
  removedProjects.add(key);
  domain.update((state) => {
    if (state.byWorkspace[key] === undefined) return state;
    const byWorkspace = { ...state.byWorkspace };
    delete byWorkspace[key];
    return { byWorkspace };
  });
}

export function resetSidebarLayoutCache(): void {
  domain.reset();
  removedProjects.clear();
}
