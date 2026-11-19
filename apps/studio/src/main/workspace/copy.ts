// The user's folder is read and never written; `.git` is born in the copy (ONL-2177).

import { type Dirent, mkdirSync, writeFileSync } from 'node:fs';
import { chmod, copyFile, lstat, mkdir, readdir, readlink, symlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { CopyFailure, WorkspaceCreated, WorkspacePlan } from '@studio/events';
import { canonicalPath } from '../lib/canonical-path.js';
import { systemAuthorArgs } from '../starter/retire.js';
import {
  blankBucketPaths,
  claimBucket,
  clearBlankMarker,
  rollbackBlank,
  type BlankBucket,
  type BlankRollbackDeps,
} from './blank.js';
import { isStudioExcludedDir, isStudioExcludedFile, STUDIO_EXCLUDE_RULES, studioExcludePathspecs } from './env-files.js';
import { configuredUserName, git, gitFailureDetail, initializeRepository, WORKTREE_TIMEOUT_MS } from './git.js';
import type { ReadyWorkspacePlan } from './index.js';
import { copiedIdentityFor, generateWorkspaceName, resolveHandle } from './naming.js';
import { listWorkspaces, nameUnnamedWorkspace } from './store.js';
import { copyGitFailure, copyThrownFailure } from './creation-failure.js';

export const COPY_INIT_COMMIT_MESSAGE = 'Initial copy of the project folder';

// A nested `.git` would commit as a submodule; `node_modules` is rebuilt.
const NEVER_COPIED = new Set(['.git', 'node_modules']);

export function isKeptByCopy(relPath: string): boolean {
  const segments = relPath.split('/');
  const name = segments.pop() ?? '';
  if (segments.some((dir) => NEVER_COPIED.has(dir) || isStudioExcludedDir(dir))) return false;
  return !NEVER_COPIED.has(name) && !isStudioExcludedFile(name);
}

// Any unreadable folder answers true, so a doubtful walk falls through to the copy and its own error.
async function hasCopyableFile(dir: string, relDir = ''): Promise<boolean> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return true;
  }
  for (const entry of entries) {
    const relPath = relDir === '' ? entry.name : `${relDir}/${entry.name}`;
    if (entry.isFile() || entry.isSymbolicLink()) {
      if (isKeptByCopy(relPath)) return true;
    } else if (entry.isDirectory() && !NEVER_COPIED.has(entry.name) && !isStudioExcludedDir(entry.name)) {
      if (await hasCopyableFile(join(dir, entry.name), relPath)) return true;
    }
  }
  return false;
}

type CopiedPlan = Pick<ReadyWorkspacePlan, 'repoIdentity' | 'workspaceName'>;

export async function planCopiedWorkspace(sourcePath: string): Promise<WorkspacePlan> {
  const repoIdentity = copiedIdentityFor(canonicalPath(sourcePath));
  const existing = listWorkspaces().find((workspace) => workspace.repoIdentity === repoIdentity);
  if (existing !== undefined) {
    return { kind: 'refused', reason: 'already-copied', projectName: existing.name };
  }
  if (!(await hasCopyableFile(sourcePath))) return { kind: 'refused', reason: 'nothing-to-copy' };
  const handle = resolveHandle({ userName: await configuredUserName(sourcePath) });
  const workspaceName = generateWorkspaceName();
  const bucket = blankBucketPaths(repoIdentity, workspaceName);
  return {
    kind: 'ready',
    origin: 'copied',
    sourcePath,
    sourceRepoRoot: bucket.source,
    sourceRepoName: basename(sourcePath),
    repoIdentity,
    baseBranch: 'main',
    baseRef: 'main',
    baseRefSource: 'local-main',
    workspaceName,
    branchName: `${handle}/${workspaceName}`,
    workspacePath: bucket.worktree,
  };
}

export function copiedBucket(plan: CopiedPlan): BlankBucket {
  return blankBucketPaths(plan.repoIdentity, plan.workspaceName);
}

export type CopyInitResult =
  | { ok: true }
  /** `claimed: false` lost to an existing bucket and owns nothing; rolling it back removes another attempt's bucket. */
  | { ok: false; claimed: boolean; detail: string; copyFailure: CopyFailure };

export async function initCopiedSource(plan: ReadyWorkspacePlan): Promise<CopyInitResult> {
  let step: CopyFailure['step'] = 'claim';
  let ownsBucket = false;
  try {
    const claimed = claimBucket({
      repoIdentity: plan.repoIdentity,
      workspaceName: plan.workspaceName,
      branchName: plan.branchName,
    });
    if (!claimed.ok) {
      return { ok: false, claimed: false, detail: '', copyFailure: { step, cause: 'copy_in_progress' } };
    }
    ownsBucket = true;
    const { source } = claimed.bucket;
    step = 'copy_files';
    await copyTree(plan.sourcePath, source);

    step = 'git_init';
    const init = await initializeRepository(source);
    if (!init.ok) return { ok: false, claimed: true, detail: gitFailureDetail('init', init), copyFailure: copyGitFailure(step, init) };
    step = 'git_config';
    const bytes = await git(source, ['config', 'core.autocrlf', 'false']);
    if (!bytes.ok) return { ok: false, claimed: true, detail: gitFailureDetail('config', bytes), copyFailure: copyGitFailure(step, bytes) };
    writeStudioExcludes(source);
    // Excludes ride `add` as pathspecs: `info/exclude` alone loses to a user `.gitignore` that negates them, and a secret is committed.
    const steps: { command: string; args: string[]; timeoutMs?: number }[] = [
      { command: 'add', args: ['add', '-A', '--', '.', ...studioExcludePathspecs()], timeoutMs: WORKTREE_TIMEOUT_MS },
      { command: 'commit', args: [...systemAuthorArgs(), 'commit', '--quiet', '-m', COPY_INIT_COMMIT_MESSAGE] },
    ];
    for (const operation of steps) {
      step = operation.command === 'add' ? 'git_add' : 'git_commit';
      const result = await git(source, operation.args, operation.timeoutMs === undefined ? {} : { timeoutMs: operation.timeoutMs });
      if (!result.ok) {
        const detail = result.timedOut
          ? 'Copying the folder into git took too long and was stopped.'
          : gitFailureDetail(operation.command, result);
        let copyFailure = copyGitFailure(step, result);
        if (step === 'git_commit' && !result.timedOut) {
          const empty = await git(source, ['diff', '--cached', '--quiet', '--no-ext-diff', '--no-textconv', '--ignore-submodules=none']);
          if (empty.ok) copyFailure = { step, cause: 'ignored_files' };
        }
        return { ok: false, claimed: true, detail, copyFailure };
      }
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, claimed: ownsBucket, detail: String(error), copyFailure: copyThrownFailure(step, error) };
  }
}

function writeStudioExcludes(repo: string): void {
  const info = join(repo, '.git', 'info');
  mkdirSync(info, { recursive: true });
  writeFileSync(
    join(info, 'exclude'),
    `# Onlook keeps these out of the copy's history. Not committed; the worktree shares it.\n${STUDIO_EXCLUDE_RULES.join('\n')}\n`,
  );
}

async function copyTree(from: string, to: string): Promise<void> {
  for (const entry of await readdir(from, { withFileTypes: true })) {
    if (NEVER_COPIED.has(entry.name)) continue;
    const src = join(from, entry.name);
    const dest = join(to, entry.name);
    if (entry.isSymbolicLink()) {
      // Stored as its target string, never followed: a link out of the folder dangles in the copy, as git records it.
      await symlink(await readlink(src), dest);
    } else if (entry.isDirectory()) {
      await mkdir(dest, { mode: ((await lstat(src)).mode & 0o777) | 0o700 });
      await copyTree(src, dest);
    } else if (entry.isFile()) {
      await copyFile(src, dest);
      await copyMode(src, dest);
    }
  }
}

async function copyMode(src: string, dest: string): Promise<void> {
  await chmod(dest, (await lstat(src)).mode & 0o777);
}

export function completeCopiedRegistration(
  workspace: Pick<WorkspaceCreated, 'repoIdentity' | 'workspaceName' | 'sourcePath'>,
): void {
  // The read-time derivation would title the group `source`.
  nameUnnamedWorkspace(workspace.repoIdentity, basename(workspace.sourcePath));
  // After `rememberProject`: the marker is what keeps an unregistered bucket inside the sweep's reach.
  clearBlankMarker(copiedBucket(workspace));
}

export function rollbackCopied(
  plan: CopiedPlan & Pick<ReadyWorkspacePlan, 'branchName'>,
  deps: BlankRollbackDeps = {},
): Promise<void> {
  return rollbackBlank({ bucket: copiedBucket(plan), branchName: plan.branchName }, deps);
}
