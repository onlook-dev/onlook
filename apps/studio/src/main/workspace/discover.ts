import { existsSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import type { DiscoveredWorktree, ProjectImportRefusalReason, WorkspaceCreated } from '@studio/events';
import { canonicalPath } from '../lib/canonical-path.js';
import { canvasDir } from '../canvas/dir.js';
import { BLANK_MARKER_FILE, BLANK_SOURCE_DIR } from './blank.js';
import {
  classifyCandidate,
  heldBy,
  type CandidateBucket,
  type CandidateFacts,
  type WorktreeCandidate,
} from './candidate.js';
import { isCreationRunningFor } from './creation-probe.js';
import {
  currentBranch,
  defaultRemote,
  gitCommonDir,
  gitDir,
  latestOwnCommitSubject,
  listsWorktree,
  remoteUrl,
  repoRoot,
  resolveBaseRefBelowUpstream,
  resolveLocalBaseRef,
  worktreePointer,
} from './git.js';
import { SWEPT_DIR_PREFIXES } from './naming.js';
import {
  acceptsStoredSourcePath,
  readQuarantinedProjects,
  type QuarantinedProject,
  type QuarantineLookup,
} from './quarantine.js';
import { isRemovingProject } from './remove-project.js';
import { registeredProject, workspaceRoot } from './store.js';
import { recordWorktreesDiscovered } from './telemetry.js';

interface RecoveredProject {
  workspace: WorkspaceCreated;
  createdAt?: string;
  lastOpenedAt?: string;
  completedBy: 'record' | 'git';
  /** The Workspace's stored name for this `repoIdentity`; no live worktree can answer it. */
  groupName?: string;
}

export type RecoveryOutcome =
  | { ok: true; project: RecoveredProject }
  | { ok: false; reason: ProjectImportRefusalReason };

export interface WorktreeDiscovery {
  projects: RecoveredProject[];
  /** Candidates the scan looked at and did not offer, a stray non-bucket directory included; a count, never a path (ONL-2522). */
  refused: number;
}

/** The composition both entry points use: every path canonical, every repository fact read through `git.ts`. */
export async function candidateFactsFor(path: string): Promise<CandidateFacts> {
  // Before any `rev-parse`: inside a worktree whose repository is gone, the pointer is the only surviving signal.
  const pointer = worktreePointer(path);
  const canonical = canonicalPath(path);
  const bucket = bucketOf(canonical);
  const [dir, common, topLevel] = await Promise.all([gitDir(path), gitCommonDir(path), repoRoot(path)]);
  if (dir === undefined || common === undefined || topLevel === undefined) {
    return { path: canonical, pointer, repository: undefined, linked: false, bucket };
  }
  // Canonical on both sides: the equality below is what separates a checkout from a linked worktree (ONL-2522).
  const canonicalGitDir = canonicalPath(dir);
  const canonicalCommonDir = canonicalPath(common);
  const sourceRepoRoot = dirname(canonicalCommonDir);
  const [remote, linked] = await Promise.all([
    defaultRemote(sourceRepoRoot),
    listsWorktree(sourceRepoRoot, canonical),
  ]);
  // Only an imported candidate's identity reads the URL, and the bucket name already settles that; a held one would spawn a `get-url` nothing reads.
  const needsUrl = remote !== undefined && heldBy(bucket?.name) === undefined;
  return {
    path: canonical,
    pointer,
    linked,
    bucket,
    repository: {
      gitDir: canonicalGitDir,
      gitCommonDir: canonicalCommonDir,
      topLevel: canonicalPath(topLevel),
      sourceRepoRoot,
      remote,
      remoteUrl: needsUrl ? await remoteUrl(sourceRepoRoot, remote) : undefined,
    },
  };
}

/** Undefined outside the workspace root: a picked `/anywhere/blank-foo/ws` is nobody's bucket, and `origin: 'blank'` would fabricate a source the removal flow cannot find (ONL-2522). */
function bucketOf(canonicalCandidate: string): CandidateBucket | undefined {
  const bucket = dirname(canonicalCandidate);
  const root = canonicalPath(workspaceRoot());
  if (dirname(bucket) !== root) return undefined;
  const name = basename(bucket);
  return {
    name,
    beingCleanedUp:
      SWEPT_DIR_PREFIXES.some((prefix) => name.startsWith(prefix)) &&
      existsSync(join(bucket, BLANK_MARKER_FILE)),
  };
}

export async function recoverWorktreeAt(path: string, lookup: QuarantineLookup): Promise<RecoveryOutcome> {
  const facts = await candidateFactsFor(path);
  const decided = classifyCandidate({
    facts,
    registered: (at) => registeredProject(at) !== undefined,
    creating: isCreationRunningFor,
    removing: isRemovingProject,
  });
  if (!decided.ok) return { ok: false, reason: decided.reason };
  return complete(decided.candidate, facts.repository?.remote, lookup);
}

export async function discoverWorktrees(): Promise<WorktreeDiscovery> {
  const root = workspaceRoot();
  const lookup = readQuarantinedProjects(root);
  const projects: RecoveredProject[] = [];
  let refused = 0;
  // Concurrent: each candidate pays its own git ladder, and in the recovery this scan exists for nothing is skipped.
  // Settled, not `all`: one candidate that throws would otherwise empty the whole offer (ONL-2522).
  const outcomes = await Promise.allSettled(
    unregisteredWorktreesIn(root).map((path) => recoverWorktreeAt(path, lookup)),
  );
  for (const outcome of outcomes) {
    if (outcome.status === 'fulfilled' && outcome.value.ok) projects.push(outcome.value.project);
    else refused += 1;
  }
  recordWorktreesDiscovered({ offered: projects.length, refused });
  return { projects, refused };
}

/** What a discovered row renders, with the path as the handle it passes back (ONL-2522). */
export async function discoveredWorktrees(): Promise<DiscoveredWorktree[]> {
  const { projects } = await discoverWorktrees();
  const subjects = await Promise.all(
    projects.map(({ workspace }) =>
      latestOwnCommitSubject(workspace.workspacePath, workspace.baseBranch).catch(() => undefined),
    ),
  );
  return projects.map(({ workspace, completedBy, groupName, lastOpenedAt }, index) => ({
    ...(lastOpenedAt === undefined ? {} : { lastEditedAt: lastOpenedAt }),
    ...(subjects[index] === undefined ? {} : { latestCommit: subjects[index] }),
    handle: workspace.workspacePath,
    name: workspace.displayName ?? workspace.workspaceName,
    branchName: workspace.branchName,
    // The repository's own folder when no quarantine named the Workspace; `listWorkspaces` derives its name the same way.
    groupName: groupName ?? basename(workspace.sourceRepoRoot),
    repoIdentity: workspace.repoIdentity,
    completedBy,
  }));
}

function listDirectories(path: string): string[] {
  try {
    return readdirSync(path, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

// Everything skipped here costs directory reads and no git call, which in a healthy registry is every entry.
function unregisteredWorktreesIn(root: string): string[] {
  const canvas = canvasDir();
  const found: string[] = [];
  for (const bucketName of listDirectories(root)) {
    const bucket = join(root, bucketName);
    if (bucket === canvas) continue;
    // Swept prefixes only: `sweepBlankBuckets` clears no other bucket, so a marker elsewhere would hide its worktrees for good (ONL-2522).
    if (
      SWEPT_DIR_PREFIXES.some((prefix) => bucketName.startsWith(prefix)) &&
      existsSync(join(bucket, BLANK_MARKER_FILE))
    ) {
      continue;
    }
    for (const name of listDirectories(bucket)) {
      // The held repository, not a worktree: importing it would point the agent at a main checkout.
      if (name === BLANK_SOURCE_DIR) continue;
      const path = join(bucket, name);
      if (registeredProject(path) !== undefined) continue;
      if (isCreationRunningFor(path)) continue;
      found.push(path);
    }
  }
  return found;
}

async function complete(
  candidate: WorktreeCandidate,
  remote: string | undefined,
  lookup: QuarantineLookup,
): Promise<RecoveryOutcome> {
  const record = lookup.projects.get(candidate.path);
  const branchName = await currentBranch(candidate.path);
  // The cut is `--no-track`, so nothing on disk records where a branch came from; the record answers first.
  const baseBranch = record?.baseBranch ?? (await resolveRecoveredBase(candidate.sourceRepoRoot, remote));
  if (branchName === undefined || baseBranch === undefined) return { ok: false, reason: 'fields-incomplete' };

  // The stored values win: the Workspace's name is keyed by `repoIdentity`, so a re-derived one loses the user's own name.
  const repoIdentity = candidate.origin === 'imported'
    ? record?.repoIdentity ?? candidate.repoIdentity
    : candidate.repoIdentity;
  const groupName = lookup.workspaceNames.get(repoIdentity);
  const workspace: WorkspaceCreated = {
    workspacePath: candidate.path,
    workspaceName: basename(candidate.path),
    branchName,
    baseBranch,
    sourceRepoName: basename(candidate.sourceRepoRoot),
    sourcePath: acceptedSourcePath(record, candidate),
    sourceRepoRoot: candidate.sourceRepoRoot,
    repoIdentity,
    origin: record?.origin === 'duplicate' ? 'duplicate' : candidate.origin,
    ...(record?.origin === 'duplicate' && (candidate.origin === 'blank' || candidate.origin === 'copied')
      ? { heldOrigin: candidate.origin }
      : {}),
    ...(record?.displayName === undefined ? {} : { displayName: record.displayName }),
    ...(record?.displayNameSource === undefined ? {} : { displayNameSource: record.displayNameSource }),
    ...(record?.comfort === undefined ? {} : { comfort: record.comfort }),
    // The record of what a creation copied; a recovery copies nothing (ONL-2522).
    copiedEnvFiles: [],
  };
  return {
    ok: true,
    project: {
      workspace,
      completedBy: record === undefined ? 'git' : 'record',
      ...(record?.createdAt === undefined ? {} : { createdAt: record.createdAt }),
      ...(record?.lastOpenedAt === undefined ? {} : { lastOpenedAt: record.lastOpenedAt }),
      ...(groupName === undefined ? {} : { groupName }),
    },
  };
}

// Containment is the imported candidate's check alone: a held Project's stored source is the user's own folder, which sits outside the bucket by construction (ONL-2522).
function acceptedSourcePath(
  record: QuarantinedProject | undefined,
  candidate: WorktreeCandidate,
): string {
  const claimed = record?.sourcePath;
  if (claimed === undefined) return candidate.sourceRepoRoot;
  if (candidate.origin === 'imported' && !acceptsStoredSourcePath(claimed, candidate.sourceRepoRoot)) {
    return candidate.sourceRepoRoot;
  }
  return claimed;
}

async function resolveRecoveredBase(
  sourceRepoRoot: string,
  remote: string | undefined,
): Promise<string | undefined> {
  const base =
    remote === undefined
      ? await resolveLocalBaseRef(sourceRepoRoot)
      : await resolveBaseRefBelowUpstream(sourceRepoRoot, remote);
  return base.ok ? base.branch : undefined;
}
