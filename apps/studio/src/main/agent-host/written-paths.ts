import { isAbsolute, relative, resolve, sep } from 'node:path';
import { pathSpellings } from '../lib/canonical-path.js';
import { isRecord } from '@studio/events';
import { DELETE_PROJECT_FILE_TOOL } from './tool-names.js';

/** The tools that WRITE. `Bash` deliberately is not one: a write a command made carries no path (ONL-2563). */
const WRITERS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

/** The target is relative to a RAW working directory and the worktree lookup returns a CANONICAL one; on macOS those differ, so every spelling is tried (ONL-2563). */
export function inWorktree(raw: unknown, worktree: string): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.includes('\0')) return null;

  for (const root of pathSpellings(worktree)) {
    const absolute = isAbsolute(raw) ? raw : resolve(root, raw);
    const inside = relative(root, absolute);
    // Empty is the worktree itself; a leading `..` left it.
    if (inside.length > 0 && inside !== '..' && !inside.startsWith(`..${sep}`) && !isAbsolute(inside)) {
      return inside.split(sep).join('/');
    }
  }
  return null;
}

export function writtenPath(name: string, input: unknown, worktree: string): string | null {
  if (name === DELETE_PROJECT_FILE_TOOL) {
    const record = isRecord(input) ? input : undefined;
    const fields = isRecord(record?.['arguments']) ? record['arguments'] : isRecord(record?.['args']) ? record['args'] : record;
    return inWorktree(fields?.['path'], worktree);
  }
  if (!WRITERS.has(name)) return null;
  const record = input as Record<string, unknown> | null;
  return inWorktree(record?.[name === 'NotebookEdit' ? 'notebook_path' : 'file_path'], worktree);
}

// Codex fileChange reaches this seam under its presented Edit/Write/Delete name (ONL-2563).
export function writtenPathsOfCall(name: string, input: unknown, worktree: string): string[] {
  const changes = (input as Record<string, unknown> | null)?.['changes'];
  if (Array.isArray(changes)) {
    const paths: string[] = [];
    for (const change of changes as unknown[]) {
      const path = inWorktree((change as Record<string, unknown> | null)?.['path'], worktree);
      if (path !== null) paths.push(path);
    }
    return paths;
  }
  const one = writtenPath(name, input, worktree);
  return one === null ? [] : [one];
}

/** Set once at startup. A sink rather than an option: the two backends build their logs in different files, and neither may import `electron` (ONL-2563). */
let sink: ((cwd: string, paths: readonly string[]) => void) | undefined;

export function setWrittenPathsSink(next: (cwd: string, paths: readonly string[]) => void): void {
  sink = next;
}

export function reportWrittenPaths(cwd: string, name: string, input: unknown): void {
  if (sink === undefined) return;
  const paths = writtenPathsOfCall(name, input, cwd);
  if (paths.length > 0) sink(cwd, paths);
}

export function resetWrittenPathsSinkForTests(): void {
  sink = undefined;
}
