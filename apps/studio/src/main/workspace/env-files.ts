// Automatic, no opt-in and no dialog, reversing ONL-1829's guard.

import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { git } from './git.js';

export type UntrackedScope = 'ignored' | 'all';

// A loose glob, not an allow-list: a missed `.env.staging` fails the project; a false positive is unguarded.
export function isEnvFile(relPath: string): boolean {
  const base = relPath.slice(relPath.lastIndexOf('/') + 1);
  return base === '.env' || base.startsWith('.env.');
}

// The first two are `isEnvFile` as gitignore patterns. Written to `.git/info/exclude`, not a committed file: a user `.gitignore` stays byte-identical (ONL-2177).
export const STUDIO_EXCLUDE_RULES: readonly string[] = [
  '.env',
  '.env.*',
  'node_modules/',
  '.DS_Store',
  'Thumbs.db',
  'dist/',
  'build/',
  '.next/',
  'out/',
  '.turbo/',
  '*.pem',
  '*.key',
  '*.p12',
  'credentials.json',
  'credentials.yml',
  '.npmrc',
  '.netrc',
  'service-account*.json',
];

for (const rule of STUDIO_EXCLUDE_RULES) {
  if (!/^[\w.*-]+\/?$/.test(rule) || (rule.endsWith('/') && rule.includes('*'))) {
    throw new Error(`An exclude rule must be one name or one basename glob; ${rule} is neither.`);
  }
}

const EXCLUDED_DIR_NAMES = new Set(
  STUDIO_EXCLUDE_RULES.filter((rule) => rule.endsWith('/')).map((rule) => rule.slice(0, -1)),
);
const EXCLUDED_FILE_NAMES = STUDIO_EXCLUDE_RULES.filter((rule) => !rule.endsWith('/')).map(basenameGlob);

function basenameGlob(rule: string): RegExp {
  const escaped = rule.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\-]/g, '\\$&'));
  return new RegExp(`^${escaped.join('[^/]*')}$`);
}

export function isStudioExcludedDir(name: string): boolean {
  return EXCLUDED_DIR_NAMES.has(name);
}

export function isStudioExcludedFile(name: string): boolean {
  return EXCLUDED_FILE_NAMES.some((pattern) => pattern.test(name));
}

export function studioExcludePathspecs(): string[] {
  return STUDIO_EXCLUDE_RULES.map((rule) =>
    rule.endsWith('/') ? `:(exclude,glob)**/${rule}**` : `:(exclude,glob)**/${rule}`,
  );
}

export async function ignoredEnvFiles(root: string, untracked: UntrackedScope = 'ignored'): Promise<string[]> {
  const result = await git(root, [
    'ls-files',
    '--others',
    // A Studio-made copy kept env files out of its commit by pathspec, so a user `!.env` leaves them untracked but not ignored (ONL-2177).
    ...(untracked === 'ignored' ? ['--ignored', '--exclude-standard'] : []),
    // Without it this walks `node_modules` and offers the `.env` fixtures a dependency ships.
    '--directory',
    '-z',
  ]);
  if (!result.ok) return [];

  return result.out
    .split('\0')
    .filter(Boolean)
    // Collapsed directories end in `/`; skipping them is what excludes `node_modules`.
    .filter((entry) => !entry.endsWith('/'))
    .filter((entry) => isEnvFile(entry))
    .sort();
}

export async function copyEnvFiles(options: {
  repoRoot: string;
  workspacePath: string;
  untracked?: UntrackedScope;
}): Promise<string[]> {
  const { repoRoot, workspacePath } = options;
  // Candidates come from git alone; a list accepted from a caller across IPC would copy arbitrary files.
  const candidates = await ignoredEnvFiles(repoRoot, options.untracked);
  const copied: string[] = [];

  for (const relPath of candidates) {
    const from = join(repoRoot, relPath);
    const to = join(workspacePath, relPath);

    // Without this, a bad `.gitignore` becomes a write outside the project.
    if (!resolve(to).startsWith(resolve(workspacePath))) continue;

    try {
      mkdirSync(dirname(to), { recursive: true });
      // Kernel-side copy: the values never enter this process.
      copyFileSync(from, to);
      copied.push(relPath);
    } catch {
      // One unreadable file does not fail creation; the record omits it.
    }
  }

  return copied;
}
