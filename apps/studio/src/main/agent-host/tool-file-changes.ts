import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { isRecord, type ToolFileChange } from '@studio/events';
import { inWorktree, writtenPath } from './written-paths.js';
import { DELETE_PROJECT_FILE_TOOL, DELETE_PROJECT_FILE_TOOL_NAME } from './tool-names.js';

const MAX_LINE_DIFF_CELLS = 1_000_000;

function textLines(text: string): string[] {
  return text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

function replacementCounts(before: string, after: string): { additions: number; deletions: number } | undefined {
  const beforeLines = textLines(before);
  const afterLines = textLines(after);
  let start = 0;
  while (start < beforeLines.length && start < afterLines.length && beforeLines[start] === afterLines[start]) start += 1;
  let beforeEnd = beforeLines.length;
  let afterEnd = afterLines.length;
  while (beforeEnd > start && afterEnd > start && beforeLines[beforeEnd - 1] === afterLines[afterEnd - 1]) {
    beforeEnd -= 1;
    afterEnd -= 1;
  }
  const beforeCount = beforeEnd - start;
  const afterCount = afterEnd - start;
  if (beforeCount === 0 || afterCount === 0) return { additions: afterCount, deletions: beforeCount };
  if (beforeCount * afterCount > MAX_LINE_DIFF_CELLS) return undefined;
  const shared = new Uint32Array(afterCount + 1);
  for (let beforeIndex = start; beforeIndex < beforeEnd; beforeIndex += 1) {
    let diagonal = 0;
    for (let afterIndex = 1; afterIndex <= afterCount; afterIndex += 1) {
      const previous = shared[afterIndex]!;
      shared[afterIndex] = beforeLines[beforeIndex] === afterLines[start + afterIndex - 1] ? diagonal + 1 : Math.max(previous, shared[afterIndex - 1]!);
      diagonal = previous;
    }
  }
  const unchanged = shared[afterCount]!;
  return { additions: afterCount - unchanged, deletions: beforeCount - unchanged };
}

function patchCounts(diff: unknown): { additions: number; deletions: number } | undefined {
  if (typeof diff !== 'string' || !diff.includes('@@')) return undefined;
  let inHunk = false;
  let additions = 0;
  let deletions = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('@@')) inHunk = true;
    else if (inHunk && line.startsWith('+')) additions += 1;
    else if (inHunk && line.startsWith('-')) deletions += 1;
    else if (line.startsWith('diff ') || line.startsWith('--- ') || line.startsWith('+++ ')) inHunk = false;
  }
  return { additions, deletions };
}

function editCounts(fields: Record<string, unknown> | undefined): { additions: number; deletions: number } | undefined {
  if (typeof fields?.['old_string'] !== 'string' || typeof fields['new_string'] !== 'string' || fields['replace_all'] === true) return undefined;
  return replacementCounts(fields['old_string'], fields['new_string']);
}

export function toolFileChanges(name: string, input: unknown, cwd: string, exists: (path: string) => boolean = existsSync, known?: ReadonlyMap<string, ToolFileChange>): ToolFileChange[] {
  const fields = isRecord(input) ? input : undefined;
  const changes: ToolFileChange[] = [];
  const add = (raw: unknown, operation: ToolFileChange['operation'], counts?: { additions: number; deletions: number }): void => {
    const path = inWorktree(raw, cwd);
    if (path !== null) changes.push({ path, operation, ...counts });
  };
  if (name === DELETE_PROJECT_FILE_TOOL || name === DELETE_PROJECT_FILE_TOOL_NAME) {
    add(fields?.['path'], 'delete');
  } else if (name === 'dynamicToolCall' && fields?.['tool'] === DELETE_PROJECT_FILE_TOOL_NAME) {
    const argumentsBag = fields['arguments'] ?? fields['args'];
    if (isRecord(argumentsBag)) add(argumentsBag['path'], 'delete');
  } else if (name === 'fileChange' && Array.isArray(fields?.['changes'])) {
    for (const raw of fields['changes'] as unknown[]) {
      const change = isRecord(raw) ? raw : undefined;
      const rawKind = change?.['kind'];
      const kind = isRecord(rawKind) ? rawKind : undefined;
      const type = kind?.['type'];
      if (type === 'add') add(change?.['path'], 'create', patchCounts(change?.['diff']));
      else if (type === 'delete') add(change?.['path'], 'delete', patchCounts(change?.['diff']));
      else if (type === 'update') {
        const destination = kind?.['move_path'];
        add(change?.['path'], typeof destination === 'string' ? 'delete' : 'edit', typeof destination === 'string' ? undefined : patchCounts(change?.['diff']));
        if (typeof destination === 'string') add(destination, 'create');
      }
    }
  } else {
    const path = writtenPath(name, fields, cwd);
    if (path !== null) {
      const operation = known?.get(path)?.operation ?? (name === 'Write' && !exists(resolve(cwd, path)) ? 'create' : 'edit');
      let counts = name === 'Edit' ? editCounts(fields) : undefined;
      if (name === 'Write' && operation === 'create' && typeof fields?.['content'] === 'string') counts = { additions: textLines(fields['content']).length, deletions: 0 };
      if (name === 'MultiEdit' && Array.isArray(fields?.['edits'])) {
        const edits = fields['edits'].map((edit: unknown) => editCounts(isRecord(edit) ? edit : undefined));
        if (edits.length > 0 && edits.every((edit) => edit !== undefined)) counts = edits.reduce((total, edit) => ({ additions: total.additions + edit.additions, deletions: total.deletions + edit.deletions }), { additions: 0, deletions: 0 });
      }
      changes.push({ path, operation, ...counts });
    }
  }
  return changes;
}
