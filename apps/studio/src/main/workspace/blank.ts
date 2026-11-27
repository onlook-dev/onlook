// `source/` lives inside the bucket, so one `rm` takes repo, worktree and branch; the boot sweep depends on it, running before git is reachable (ONL-2152).

import { log } from '../log/index.js';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { canWriteStateFile, eraseStateFile, readStateFile, writeStateFile } from '../state/file.js';
import { dirname, join } from 'node:path';
import { closeCanvas } from '../canvas/index.js';
import { pathSpellings } from '../lib/canonical-path.js';
import { closeServerBookProject } from '../server/index.js';
import { isContainedIn } from '../server/owner.js';
import { systemAuthorArgs } from '../starter/retire.js';
import type { ManagerChoice, StarterAdapter } from '../starter/adapter.js';
import { writeScaffold } from '../starter/scaffold.js';
import { type BlankCreationFailure, gitFailure, systemErrorCode } from './creation-failure.js';
import { deleteBranch, git, gitFailureDetail, initializeRepository, removeWorktree } from './git.js';
import type { ReadyWorkspacePlan } from './index.js';
import { generateWorkspaceName, mintBlankIdentity, SWEPT_DIR_PREFIXES, titleCaseWorkspaceName } from './naming.js';
import { workspacePathFor, workspaceRoot } from './store.js';
import { canForgetProjectState, forgetProjectState } from './project-state.js';
import { gitAvailable } from '../env/git-available.js';
import type { WorkspaceCreated } from '@studio/events';

const logger = log('workspace');

export const BLANK_SOURCE_DIR = 'source';
export const BLANK_MARKER_FILE = 'creating';
const BLANK_INIT_COMMIT_MESSAGE = 'Blank project scaffold';
const BLANK_HANDLE = 'onlook';

export interface BlankBucket {
  identityDir: string;
  source: string;
  worktree: string;
  marker: string;
}

export function blankBucketPaths(repoIdentity: string, workspaceName: string, sourcePath?: string): BlankBucket {
  const worktree = workspacePathFor(repoIdentity, workspaceName, sourcePath);
  const identityDir = dirname(worktree);
  return {
    identityDir,
    source: join(identityDir, BLANK_SOURCE_DIR),
    worktree,
    marker: join(identityDir, BLANK_MARKER_FILE),
  };
}

interface BlankMarker {
  repoIdentity: string;
  workspacePath: string;
  branchName: string;
}

export interface BlankClaim {
  repoIdentity: string;
  workspaceName: string;
  title: string;
  branchName: string;
  bucket: BlankBucket;
}

export type BlankClaimResult =
  | { ok: true; claim: BlankClaim }
  | { ok: false; reason: 'bucket-exists' };

export function claimBlankBucket(options: { repoIdentity?: string } = {}): BlankClaimResult {
  const repoIdentity = options.repoIdentity ?? mintBlankIdentity();
  const workspaceName = generateWorkspaceName();
  const branchName = `${BLANK_HANDLE}/${workspaceName}`;
  const claimed = claimBucket({ repoIdentity, workspaceName, branchName });
  if (!claimed.ok) return claimed;
  return {
    ok: true,
    claim: { repoIdentity, workspaceName, title: titleCaseWorkspaceName(workspaceName), branchName, bucket: claimed.bucket },
  };
}

export function claimBucket(claim: {
  repoIdentity: string;
  workspaceName: string;
  branchName: string;
  sourcePath?: string;
}): { ok: true; bucket: BlankBucket } | { ok: false; reason: 'bucket-exists' } {
  const bucket = blankBucketPaths(claim.repoIdentity, claim.workspaceName, claim.sourcePath);
  mkdirSync(dirname(bucket.identityDir), { recursive: true });
  try {
    // Non-recursive: EEXIST is the refusal; a recursive mkdir would merge into an existing bucket.
    mkdirSync(bucket.identityDir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EEXIST') return { ok: false, reason: 'bucket-exists' };
    throw err;
  }
  try {
    const record: BlankMarker = {
      repoIdentity: claim.repoIdentity,
      workspacePath: bucket.worktree,
      branchName: claim.branchName,
    };
    // Marker before `source/`: a crash at any later step leaves a bucket the boot sweep recognises.
    if (!writeStateFile(bucket.marker, 1, record)) return { ok: false, reason: 'bucket-exists' };
    mkdirSync(bucket.source);
    return { ok: true, bucket };
  } catch (err) {
    try {
      removeDir(bucket.identityDir);
    } catch (cleanupError) {
      logger.error('blank bucket could not be removed', { system_error: systemErrorCode(cleanupError) });
    }
    throw err;
  }
}

export async function initBlankSource(
  claim: BlankClaim,
  adapter: StarterAdapter,
  manager?: ManagerChoice,
  available: () => Promise<boolean> = () => gitAvailable(),
): Promise<{ ok: true; history?: 'none' } | { ok: false; detail: string; failure: BlankCreationFailure }> {
  const { source } = claim.bucket;
  if (!await available()) {
    writeScaffold(source, adapter.files(manager));
    mkdirSync(claim.bucket.worktree);
    writeScaffold(claim.bucket.worktree, adapter.files(manager));
    return { ok: true, history: 'none' };
  }
  writeScaffold(source, adapter.files(manager));
  const initialized = await initializeRepository(source);
  if (!initialized.ok) return { ok: false, detail: gitFailureDetail('init', initialized), failure: gitFailure('git_init', initialized) };
  const steps = [
    { command: 'config', step: 'git_init', args: ['config', 'core.autocrlf', 'false'] },
    { command: 'add', step: 'git_add', args: ['add', '-A'] },
    { command: 'commit', step: 'git_commit', args: [...systemAuthorArgs(), 'commit', '--quiet', '-m', BLANK_INIT_COMMIT_MESSAGE] },
  ] as const;
  for (const step of steps) {
    const result = await git(source, [...step.args]);
    if (!result.ok) return { ok: false, detail: gitFailureDetail(step.command, result), failure: gitFailure(step.step, result) };
  }
  return { ok: true };
}

export function constructBlankPlan(claim: BlankClaim): ReadyWorkspacePlan {
  return {
    kind: 'ready',
    sourcePath: claim.bucket.source,
    sourceRepoRoot: claim.bucket.source,
    sourceRepoName: claim.title,
    repoIdentity: claim.repoIdentity,
    baseBranch: 'main',
    baseRef: 'main',
    baseRefSource: 'local-main',
    workspaceName: claim.workspaceName,
    branchName: claim.branchName,
    workspacePath: claim.bucket.worktree,
  };
}

export function blankWithoutHistory(claim: BlankClaim): WorkspaceCreated {
  const { kind: _kind, baseRef: _baseRef, baseRefSource: _baseRefSource, ...workspace } = constructBlankPlan(claim);
  return {
    ...workspace,
    origin: 'blank',
    history: 'none',
    copiedEnvFiles: [],
  };
}

export function clearBlankMarker(bucket: BlankBucket): void {
  eraseStateFile(bucket.marker, 1);
}

export interface BlankRollbackDeps {
  stopStarter?: (worktreePath: string) => Promise<void>;
  /** True only when creation itself opened this worktree in the hosts; a project the user opened meanwhile stays open. */
  opened?: boolean;
  rm?: RemoveDir;
}

type RemoveDir = (path: string) => void;
const removeDir: RemoveDir = (path) => {
  rmSync(path, { recursive: true, force: true });
};

export async function rollbackBlank(
  claim: Pick<BlankClaim, 'bucket' | 'branchName'>,
  deps: BlankRollbackDeps = {},
): Promise<void> {
  const { bucket } = claim;
  if (!canWriteStateFile(bucket.marker, 1)) return;
  const spellings = pathSpellings(bucket.worktree);
  const cwd = spellings[0] ?? bucket.worktree;
  if (!canForgetProjectState(cwd, spellings)) return;
  if (deps.opened) closeServerBookProject(bucket.worktree);
  await deps.stopStarter?.(bucket.worktree);
  if (deps.opened) await closeCanvas(bucket.worktree);
  if (existsSync(join(bucket.source, '.git'))) {
    // Both fail when the cut never happened; expected.
    await removeWorktree(bucket.source, bucket.worktree);
    await deleteBranch(bucket.source, claim.branchName);
  }
  // Swallowed: a rollback runs on an already-failing path, and the caller's error is the one the user sees.
  try {
    (deps.rm ?? removeDir)(bucket.identityDir);
    forgetProjectState(cwd, spellings);
  } catch (err) {
    logger.error('blank bucket could not be removed', { system_error: systemErrorCode(err) });
  }
}

// The name prefix, not the marker, keeps an imported repo out of reach: the agent can write a `creating` file into any bucket (ONL-2152, ONL-2177).
export function sweepBlankBuckets(deps: { rm?: RemoveDir } = {}): string[] {
  const root = workspaceRoot();
  if (!existsSync(root)) return [];
  const swept: string[] = [];
  let dirents;
  try {
    dirents = readdirSync(root, { withFileTypes: true });
  } catch (err) {
    logger.error('workspace root unreadable; blank sweep skipped', { error: err });
    return swept;
  }
  for (const entry of dirents) {
    if (!entry.isDirectory() || !SWEPT_DIR_PREFIXES.some((prefix) => entry.name.startsWith(prefix))) continue;
    const identityDir = join(root, entry.name);
    const markerPath = join(identityDir, BLANK_MARKER_FILE);
    if (!existsSync(markerPath)) continue;
    // Per bucket: one that cannot go would otherwise throw past the boot sweep on every launch.
    try {
      if (!canWriteStateFile(markerPath, 1)) continue;
      const marker = readMarker(markerPath);
      let project: { cwd: string; spellings: string[] } | undefined;
      // The marker is agent-writable: its `workspacePath` is honoured only inside its own bucket.
      if (
        marker !== undefined &&
        marker.workspacePath !== identityDir &&
        isContainedIn(marker.workspacePath, identityDir)
      ) {
        const spellings = pathSpellings(marker.workspacePath);
        const cwd = spellings[0] ?? marker.workspacePath;
        if (!canForgetProjectState(cwd, spellings)) continue;
        project = { cwd, spellings };
      }
      (deps.rm ?? removeDir)(identityDir);
      if (project !== undefined) forgetProjectState(project.cwd, project.spellings);
      swept.push(identityDir);
    } catch (err) {
      logger.error('blank bucket could not be swept; continuing', { error: err });
    }
  }
  return swept;
}

function readMarker(path: string): BlankMarker | undefined {
  try {
    const file = readStateFile(path, 1);
    if (file.kind !== 'data') return undefined;
    const parsed = file.data as Partial<BlankMarker> | null;
    if (typeof parsed?.workspacePath !== 'string') return undefined;
    return parsed as BlankMarker;
  } catch (err) {
    logger.error('blank marker unreadable; removing the bucket only', { error: err });
    return undefined;
  }

}
