import type { GitSnapshotRow, GitStatusList } from '@studio/events';
import { defineDomain } from '../state/store.js';
import { normalizePath, workspaceRoot } from '../workspace/store.js';

interface GitStatusRegistryState {
  rows: Record<string, GitSnapshotRow>;
}

const domain = defineDomain<GitStatusRegistryState>({
  name: 'git-status',
  version: 1,
  fallback: () => ({ rows: {} }),
  root: workspaceRoot,
});

const removedProjects = new Set<string>();
const projectGenerations = new Map<string, number>();

export function gitStatusProjectGeneration(worktreePath: string): number {
  return projectGenerations.get(normalizePath(worktreePath)) ?? 0;
}

export function reopenGitStatusRow(worktreePath: string): void {
  removedProjects.delete(worktreePath);
  removedProjects.delete(normalizePath(worktreePath));
}

export function gitStatusRowFor(worktreePath: string): GitSnapshotRow | undefined {
  return domain.read().rows[normalizePath(worktreePath)];
}

export function listGitStatusRows(): GitStatusList {
  return { ...domain.read().rows };
}

export function writeGitStatusRow(worktreePath: string, row: GitSnapshotRow): void {
  const key = normalizePath(worktreePath);
  if (removedProjects.has(key)) return;
  domain.update((state) => ({ rows: { ...state.rows, [key]: row } }));
}

export function forgetGitStatusRow(worktreePath: string): void {
  const key = normalizePath(worktreePath);
  removedProjects.add(key);
  projectGenerations.set(key, (projectGenerations.get(key) ?? 0) + 1);
  if (domain.read().rows[key] === undefined) return;
  domain.update((state) => {
    const rows = { ...state.rows };
    delete rows[key];
    return { rows };
  });
}

export function resetGitStatusCache(): void {
  domain.reset();
  removedProjects.clear();
  projectGenerations.clear();
}
