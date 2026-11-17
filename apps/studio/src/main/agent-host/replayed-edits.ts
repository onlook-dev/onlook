import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative } from 'node:path';

export interface RecordedFileTool {
  name: string;
  input: Record<string, unknown>;
}

export type ReplayedEdit = { applied: string } | { skipped: 'no-path' | 'outside-worktree' | 'no-content' | 'not-an-edit' | 'text-gone' };

interface TextEdit {
  oldString: string;
  newString: string;
  replaceAll: boolean;
}

const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

function textEdit(input: Record<string, unknown>): TextEdit | undefined {
  const oldString = text(input['old_string']);
  const newString = text(input['new_string']);
  if (oldString === undefined || newString === undefined) return undefined;
  return { oldString, newString, replaceAll: input['replace_all'] === true };
}

function editsOf(use: RecordedFileTool): TextEdit[] | undefined {
  if (use.name === 'Edit') {
    const edit = textEdit(use.input);
    return edit === undefined ? undefined : [edit];
  }
  if (use.name === 'MultiEdit') {
    const edits = Array.isArray(use.input['edits']) ? use.input['edits'] : [];
    const parsed = edits.map((edit) => (edit !== null && typeof edit === 'object' ? textEdit(edit as Record<string, unknown>) : undefined));
    return parsed.every((edit) => edit !== undefined) ? (parsed as TextEdit[]) : undefined;
  }
  return undefined;
}

function rebased(recordedPath: string, recordedCwd: string, cwd: string): string | undefined {
  const inside = relative(recordedCwd, recordedPath);
  if (inside === '' || inside.startsWith('..') || isAbsolute(inside)) return undefined;
  return join(cwd, inside);
}

/** A replay re-runs Studio's own tools but never the CLI's, so the recorded file writes are made here, inside this run's worktree only. */
export function applyRecordedFileTool(use: RecordedFileTool, recordedCwd: string, cwd: string): ReplayedEdit {
  const recordedPath = text(use.input['file_path']);
  if (recordedPath === undefined) return { skipped: 'no-path' };
  const target = rebased(recordedPath, recordedCwd, cwd);
  if (target === undefined) return { skipped: 'outside-worktree' };
  if (use.name === 'Write') {
    const content = text(use.input['content']);
    if (content === undefined) return { skipped: 'no-content' };
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    return { applied: target };
  }
  const edits = editsOf(use);
  if (edits === undefined) return { skipped: 'not-an-edit' };
  if (!existsSync(target)) return { skipped: 'text-gone' };
  let body = readFileSync(target, 'utf8');
  for (const edit of edits) {
    if (!body.includes(edit.oldString)) return { skipped: 'text-gone' };
    body = edit.replaceAll ? body.split(edit.oldString).join(edit.newString) : body.replace(edit.oldString, () => edit.newString);
  }
  writeFileSync(target, body);
  return { applied: target };
}

export const RECORDED_FILE_TOOLS: ReadonlySet<string> = new Set(['Write', 'Edit', 'MultiEdit']);
