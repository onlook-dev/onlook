import { realpathSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import type { CodeRefusalCode } from '@studio/events';
import { canonicalPath } from '../lib/canonical-path.js';
import { isContainedIn } from '../server/owner.js';
import { isExcludedPath } from './exclusions.js';

export type CodeScopeVerdict =
  | { ok: true; path: string }
  | { ok: false; code: CodeRefusalCode };

/** The worktree's git pointer: overwriting it severs the Project from the only copy of the designer's work. */
const GIT_DIR = '.git';

interface Anchor {
  canonical: string;
  /** The segments below the anchor, which do not exist yet. */
  rest: readonly string[];
}

/** `canonicalPath()` falls back to `resolve()` for a path that does not exist, which is lexical and cannot see a symlink; this walks up to a path that does (ONL-2563). */
function nearestCanonical(target: string): Anchor | undefined {
  const rest: string[] = [];
  let at = target;
  for (;;) {
    try {
      return { canonical: realpathSync.native(at), rest: [...rest].reverse() };
    } catch {
      const parent = dirname(at);
      if (parent === at) return undefined;
      rest.push(basename(at));
      at = parent;
    }
  }
}

function reachesGitDir(root: string, path: string): boolean {
  return relative(root, path).split(sep).includes(GIT_DIR);
}

// Missing files are contained through their nearest existing canonical ancestor (ONL-2563).
export function resolveInWorktree(worktree: string, requested: string): CodeScopeVerdict {
  if (typeof requested !== 'string' || requested.includes('\0')) {
    return { ok: false, code: 'out-of-scope' };
  }
  const root = canonicalPath(worktree);
  const anchor = nearestCanonical(resolve(root, requested));
  if (anchor === undefined) return { ok: false, code: 'out-of-scope' };
  if (!isContainedIn(anchor.canonical, root)) return { ok: false, code: 'out-of-scope' };

  const path = join(anchor.canonical, ...anchor.rest);
  if (!isContainedIn(path, root)) return { ok: false, code: 'out-of-scope' };
  // Decided on the resolved form: `src/../.git` and a link named for anything else both reach it.
  if (reachesGitDir(root, path)) return { ok: false, code: 'out-of-scope' };
  if (isExcludedPath(relative(root, path).split(sep).join('/'))) {
    return { ok: false, code: 'out-of-scope' };
  }
  return { ok: true, path };
}

/** The spelling the renderer holds a tab under: worktree-relative, forward-slashed. */
export function worktreeRelative(worktree: string, path: string): string {
  return relative(canonicalPath(worktree), path).split(sep).join('/');
}
