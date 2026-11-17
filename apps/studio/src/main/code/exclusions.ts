import { isEnvFile } from '../workspace/env-files.js';

/** Never walked by the picker or the search; a fourth list, deliberately its own, because the copy step's, the detector's and the git-exclude rules each answer a different question (ONL-2563). */
const NEVER_BROWSED_DIRS: readonly string[] = [
  '.git',
  '.hg',
  '.svn',
  'node_modules',
  '.yarn',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.output',
  '.turbo',
  '.cache',
  '.parcel-cache',
  '.vite',
  '.vercel',
  '.netlify',
];

const NEVER_BROWSED_DIR_SET = new Set(NEVER_BROWSED_DIRS);

const NEVER_BROWSED_FILES: readonly string[] = ['.DS_Store', 'Thumbs.db'];

const NEVER_BROWSED_FILE_SET = new Set(NEVER_BROWSED_FILES);

export function isExcludedDir(name: string): boolean {
  return NEVER_BROWSED_DIR_SET.has(name);
}

/** Env files included: Studio copies the user's own into the worktree, and keeping them out of git does not keep them off disk. */
export function isExcludedFile(name: string): boolean {
  return NEVER_BROWSED_FILE_SET.has(name) || isEnvFile(name);
}

/** Decided on a worktree-relative spelling, segment by segment, so naming an excluded folder outright is refused as well as skipped. */
export function isExcludedPath(relPath: string): boolean {
  const segments = relPath.split('/').filter((segment) => segment !== '' && segment !== '.');
  const name = segments.at(-1);
  return segments.some(isExcludedDir) || (name !== undefined && isExcludedFile(name));
}
