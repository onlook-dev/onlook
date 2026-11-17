import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type {
  CodeSearchFileMatches,
  CodeSearchLine,
  CodeSearchRequest,
  CodeSearchResult,
} from '@studio/events';
import { canonicalPath } from '../lib/canonical-path.js';
import { isExcludedPath } from './exclusions.js';
import { walkWorktree } from './list.js';
import { resolveInWorktree, worktreeRelative } from './scope.js';

const CODE_SEARCH_MAX_NAMES = 50;

const CODE_SEARCH_MAX_FILES = 100;

/** The search's own cap on the walk: a one-character term must not read the whole project. */
const CODE_SEARCH_MAX_SCANNED_FILES = 2_000;

export const CODE_SEARCH_MAX_LINES_PER_FILE = 20;

/** Past this a file is a bundle or a fixture, not something a designer reads. */
const CODE_SEARCH_MAX_FILE_BYTES = 512 * 1024;

/** A matching line arrives trimmed: a minified line is one match and megabytes of payload. */
const CODE_SEARCH_MAX_LINE_CHARS = 240;

const NUL = 0x00;

function matchesIn(text: string, needle: string): { lines: CodeSearchLine[]; total: number } {
  const lines: CodeSearchLine[] = [];
  let total = 0;
  const rows = text.split('\n');
  for (const [index, row] of rows.entries()) {
    const column = row.toLowerCase().indexOf(needle);
    if (column < 0) continue;
    total += 1;
    if (lines.length < CODE_SEARCH_MAX_LINES_PER_FILE) {
      lines.push({
        line: index + 1,
        text: row.slice(0, CODE_SEARCH_MAX_LINE_CHARS).replace(/\r$/, ''),
        column,
      });
    }
  }
  return { lines, total };
}

/** One search over names and contents; a file that is not text contributes nothing (ONL-2563). */
export function searchCode(
  worktree: string | undefined,
  request: CodeSearchRequest,
): CodeSearchResult {
  if (worktree === undefined) return { ok: false, code: 'no-project' };
  const needle = typeof request.query === 'string' ? request.query.trim().toLowerCase() : '';
  const requested = request.path ?? '';
  const scope = resolveInWorktree(worktree, requested === '' ? '.' : requested);
  if (!scope.ok) return scope;
  if (isExcludedPath(worktreeRelative(worktree, scope.path))) {
    return { ok: false, code: 'out-of-scope' };
  }
  if (needle === '') return { ok: true, names: [], contents: [], truncated: false };

  const root = canonicalPath(worktree);
  const walk = walkWorktree(worktree, {
    start: scope.path,
    limit: CODE_SEARCH_MAX_SCANNED_FILES,
  });
  const names = walk.files
    .filter((file) => file.toLowerCase().includes(needle))
    .slice(0, CODE_SEARCH_MAX_NAMES);
  const contents: CodeSearchFileMatches[] = [];
  let truncated = walk.truncated;

  for (const file of walk.files) {
    if (contents.length >= CODE_SEARCH_MAX_FILES) {
      truncated = true;
      break;
    }
    const path = join(root, file);
    try {
      if (statSync(path).size > CODE_SEARCH_MAX_FILE_BYTES) continue;
      const bytes = readFileSync(path);
      if (bytes.includes(NUL)) continue;
      const found = matchesIn(bytes.toString('utf8'), needle);
      if (found.total > 0) contents.push({ path: file, lines: found.lines, total: found.total });
    } catch {
      continue;
    }
  }

  return { ok: true, names, contents, truncated };
}
