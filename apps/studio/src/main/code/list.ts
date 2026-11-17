import { readdirSync, statSync, type Dirent, type Stats } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { CodeListRequest, CodeListResult } from '@studio/events';
import { canonicalPath } from '../lib/canonical-path.js';
import { isExcludedPath } from './exclusions.js';
import { resolveInWorktree, worktreeRelative } from './scope.js';

/** A walk that reaches this answers `truncated`: a picker over a monorepo is not worth an unbounded read (ONL-2563). */
const CODE_LIST_MAX_FILES = 20_000;

export interface WalkOptions {
  /** Absent walks the whole worktree. */
  start?: string | undefined;
  limit?: number;
}

export interface Walk {
  files: string[];
  truncated: boolean;
}

// Exclusions also apply to symlink targets, not just their browsed names (ONL-2563).
export function walkWorktree(worktree: string, options: WalkOptions = {}): Walk {
  const root = canonicalPath(worktree);
  const limit = options.limit ?? CODE_LIST_MAX_FILES;
  const files: string[] = [];
  // The chain being descended, not every directory seen: a mirror of a folder is two real paths and belongs in the list twice, while a link onto an ancestor is a cycle.
  const chain = new Set<string>();
  let truncated = false;

  const spell = (path: string): string => relative(root, path).split(sep).join('/');

  const descend = (dir: string): void => {
    if (truncated) return;
    const canonical = canonicalPath(dir);
    if (chain.has(canonical)) return;
    chain.add(canonical);
    try {
      let entries: Dirent[];
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      const take = (path: string): void => {
        files.push(spell(path));
        if (files.length >= limit) truncated = true;
      };

      for (const entry of entries) {
        if (truncated) return;
        const path = join(dir, entry.name);
        // `.git` is a FILE in a worktree checkout, and a link's own name says nothing about its target.
        if (isExcludedPath(spell(path))) continue;

        if (entry.isSymbolicLink()) {
          // A link is followed only through the scope module, which is what refuses the one pointing out of the worktree.
          const scope = resolveInWorktree(worktree, spell(path));
          if (!scope.ok) continue;
          if (isExcludedPath(worktreeRelative(worktree, scope.path))) continue;
          let kind: Stats;
          try {
            kind = statSync(scope.path);
          } catch {
            continue;
          }
          if (kind.isDirectory()) descend(path);
          else if (kind.isFile()) take(path);
          continue;
        }

        if (entry.isDirectory()) {
          descend(path);
          continue;
        }

        if (entry.isFile()) take(path);
      }
    } finally {
      chain.delete(canonical);
    }
  };

  const start = options.start ?? root;
  // The worktree root counts as already on the chain, so a link back to it is a cycle from a sub-walk too.
  if (canonicalPath(start) !== root) chain.add(root);
  descend(start);
  files.sort();
  return { files, truncated };
}

export function listCodeFiles(
  worktree: string | undefined,
  request: CodeListRequest,
): CodeListResult {
  if (worktree === undefined) return { ok: false, code: 'no-project' };
  const requested = request.path ?? '';
  const scope = resolveInWorktree(worktree, requested === '' ? '.' : requested);
  if (!scope.ok) return scope;
  if (isExcludedPath(worktreeRelative(worktree, scope.path))) {
    return { ok: false, code: 'out-of-scope' };
  }

  try {
    if (!statSync(scope.path).isDirectory()) return { ok: false, code: 'unreadable' };
  } catch (error) {
    return {
      ok: false,
      code: (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'not-found' : 'unreadable',
    };
  }

  const walk = walkWorktree(worktree, { start: scope.path });
  return { ok: true, files: walk.files, truncated: walk.truncated };
}
