import { existsSync, readdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { releaseAgentWorkspace } from '../agent-host/index.js';
import { closeCanvas } from '../canvas/index.js';
import { log } from '../log/index.js';
import { serverHost } from '../server/index.js';
import { appSweepDeps, sweepWorktree } from '../server/sweep.js';
import { starterHost } from '../starter/index.js';
import { pathSpellings } from '../lib/canonical-path.js';
import { forgetProjectSetup } from '../project-setup/service.js';
import { BLANK_SOURCE_DIR, blankBucketPaths, type BlankBucket } from './blank.js';
import { git, type GitResult, porcelainWorktreePaths, removeWorktree } from './git.js';
import { canForgetProjectState, forgetProjectState } from './project-state.js';
import { forgetCreation } from '../github-import/telemetry.js';
import {
  forgetProject,
  projectsOfRepo,
  registeredProject,
  registeredProjectKey,
  workspaceHeldOrigin,
  workspaceRoot,
} from './store.js';

const logger = log('workspace');

export type TeardownResult =
  | { ok: true; lastInGroup: boolean }
  | { ok: false; reason: 'unknown-project' }
  | { ok: false; reason: 'folder-remains'; detail: string };

export interface RemoveProjectDeps {
  forgetSetup?: (projectKey: string) => Promise<void>;
  rm?: (path: string) => Promise<void>;
  git?: (cwd: string, args: string[]) => Promise<GitResult>;
  removeWorktree?: (root: string, worktreePath: string) => Promise<GitResult>;
  stopStarter?: (worktreePath: string) => Promise<void>;
  closeServer?: (worktreePath: string) => Promise<void>;
  releaseSession?: (worktreePath: string) => Promise<void>;
  closeCanvas?: (worktreePath: string) => Promise<void>;
  sweep?: (worktreePath: string) => Promise<void>;
}

// Awaited, not `rmSync`: one process serves every tab, and a worktree carrying `node_modules` holds it for seconds.
const removeDir = (path: string): Promise<void> => rm(path, { recursive: true, force: true });

const closeServerWorkspace = async (worktreePath: string): Promise<void> => {
  await serverHost()?.closeWorkspace(worktreePath);
};

const stopStarterChild = async (worktreePath: string): Promise<void> => {
  await starterHost()?.stop(worktreePath);
};

const sweepProcesses = async (worktreePath: string): Promise<void> => {
  await sweepWorktree(worktreePath, workspaceRoot(), appSweepDeps());
};

function entriesOf(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

/** Disk, not the registry: a sibling's worktree is cut into the bucket before it is registered (ONL-2315). */
function bucketHoldsOnlyItsRepo(bucket: BlankBucket): boolean {
  const left = entriesOf(bucket.identityDir).filter((entry) => entry !== BLANK_SOURCE_DIR);
  return left.length === 0;
}

/** A bare `prune` deregisters every unreachable worktree in the user's repository, not only ours. */
async function pruneOnlyOurs(
  root: string,
  worktree: string,
  run: (cwd: string, args: string[]) => Promise<GitResult>,
): Promise<void> {
  const listed = await run(root, ['worktree', 'list', '--porcelain']);
  if (!listed.ok) return;
  const others = porcelainWorktreePaths(listed.out, (block) => block.includes('prunable')).filter(
    (path) => basename(path) !== basename(worktree),
  );
  if (others.length > 0) {
    logger.warn('left a stale worktree registration rather than pruning the repository', {
      others: others.length,
    });
    return;
  }
  await run(root, ['worktree', 'prune']);
}

export async function teardownProject(
  workspacePath: string,
  deps: RemoveProjectDeps = {},
): Promise<TeardownResult> {
  const projectKey = registeredProjectKey(workspacePath);
  const record = registeredProject(workspacePath);
  if (record === undefined || projectKey === undefined) return { ok: false, reason: 'unknown-project' };
  const worktree = record.workspacePath;
  const bucket =
    workspaceHeldOrigin(record) !== undefined
      ? blankBucketPaths(record.repoIdentity, record.workspaceName)
      : undefined;
  const erase = deps.rm ?? removeDir;
  // Both spellings: a card whose folder already went keys lexically, one that still exists keys through realpath (ONL-2315).
  const spellings = pathSpellings(worktree);

  try {
    if (!canForgetProjectState(worktree, spellings)) throw new Error('Project state belongs to a newer Onlook build or cannot be read');
    await (deps.forgetSetup ?? forgetProjectSetup)(projectKey);
    await (deps.closeServer ?? closeServerWorkspace)(worktree);
    await (deps.stopStarter ?? stopStarterChild)(worktree);
    await (deps.releaseSession ?? releaseAgentWorkspace)(worktree);
    await (deps.closeCanvas ?? closeCanvas)(worktree);
    await (deps.sweep ?? sweepProcesses)(worktree);

    const root = bucket?.source ?? record.sourceRepoRoot;
    if (root !== undefined && existsSync(join(root, '.git'))) {
      const removed = await (deps.removeWorktree ?? removeWorktree)(root, worktree);
      // A worktree whose directory already went refuses here, and its registration would stay in the user's own repository.
      if (!removed.ok) await pruneOnlyOurs(root, worktree, deps.git ?? git);
    }

    await erase(worktree);
    // Disk and registry both: a sibling mid-creation is not registered yet, and a sibling whose
    // folder is already gone leaves the bucket looking empty. `forgetProject` has not run, so this counts itself.
    const soleOnDisk = bucket !== undefined && bucketHoldsOnlyItsRepo(bucket);
    if (soleOnDisk && projectsOfRepo(record.repoIdentity).length <= 1) await erase(bucket.identityDir);
    forgetProjectState(spellings[0]!, spellings);
  } catch (err) {
    logger.error('removing a project did not finish; the card stays', { error: err });
    return { ok: false, reason: 'folder-remains', detail: String(err) };
  }

  // Read before the record goes, and after the delete decided what it took: the pre-confirm answer can be stale.
  const lastInGroup = projectsOfRepo(record.repoIdentity).length <= 1;
  // Last: a record forgotten before a failed delete leaves disk in use with no card and nothing to retry from.
  forgetProject(worktree);
  if (lastInGroup) forgetCreation(record.repoIdentity);
  return { ok: true, lastInGroup };
}
