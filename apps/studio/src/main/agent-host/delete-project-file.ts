import { lstatSync, unlinkSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { canonicalPath } from '../lib/canonical-path.js';
import { resolveInWorktree, worktreeRelative } from '../code/scope.js';
import { DELETE_PROJECT_FILE_TOOL_NAME } from './tool-names.js';

export type DeleteProjectFileOutcome =
  | { ok: true; path: string }
  | { ok: false; reason: string };

export type DeleteProjectFileReport = (
  path: string,
  signal?: AbortSignal,
) => DeleteProjectFileOutcome | Promise<DeleteProjectFileOutcome>;

export function deleteProjectFile(
  worktree: string,
  path: string,
  signal?: AbortSignal,
): DeleteProjectFileOutcome {
  signal?.throwIfAborted();
  const scope = resolveInWorktree(worktree, path);
  if (!scope.ok) return { ok: false, reason: 'The path is outside the allowed project files.' };
  const requested = resolve(canonicalPath(worktree), path);
  if (relative(canonicalPath(worktree), requested).split(sep).includes('.git')) {
    return { ok: false, reason: 'Git metadata cannot be deleted.' };
  }
  if (!lstatSync(requested).isFile() || !lstatSync(scope.path).isFile()) {
    return { ok: false, reason: 'Only an existing regular project file can be deleted.' };
  }
  signal?.throwIfAborted();
  unlinkSync(scope.path);
  return { ok: true, path: worktreeRelative(worktree, scope.path) };
}

const schema = { path: z.string().min(1).max(4096).describe('The existing project file to remove, relative to the project root.') };

export function deleteProjectFileTool(onDeleteProjectFile: DeleteProjectFileReport) {
  return tool(
    DELETE_PROJECT_FILE_TOOL_NAME,
    'Delete one existing regular project file. Use delete_project_file for every project file removal, ' +
      'not Bash, rm, or another shell command, so Onlook can report the deletion in the changed-files list. ' +
      'Directories, Git metadata, and paths outside the project are refused. Normal destructive permission approval applies.',
    schema,
    async (args, extra) => {
      try {
        const { path } = z.object(schema).parse(args);
        const signal = (extra as { signal?: AbortSignal } | undefined)?.signal;
        signal?.throwIfAborted();
        const result = await onDeleteProjectFile(path, signal);
        return {
          ...(!result.ok ? { isError: true } : {}),
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Onlook could not delete the project file: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    },
    {
      alwaysLoad: true,
      annotations: { title: 'Delete a project file', readOnlyHint: false, destructiveHint: true },
    },
  );
}
