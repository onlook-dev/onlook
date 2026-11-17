import { canonicalPath } from '../lib/canonical-path.js';

declare const PROJECT_KEY: unique symbol;

/** A Project's identity in main: its worktree path, canonicalised once here. Two spellings of one folder are one key. */
export type ProjectKey = string & { readonly [PROJECT_KEY]: true };

export function projectKey(worktree: string): ProjectKey {
  return canonicalPath(worktree) as ProjectKey;
}
