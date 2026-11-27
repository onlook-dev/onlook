import { existsSync } from 'node:fs';
import { basename } from 'node:path';
import { handle } from '../ipc/bridge.js';
import { checkWslTools } from '../env/wsl-tools.js';
import { wslProject } from '../env/wsl.js';
import {
  IPC_EMIT,
  IPC_INVOKE,
  type OpenProjectRequest,
  type OpenProjectResult,
  type ProjectImportOutcome,
  type ProjectImportRequest,
  type RemoveProjectRequest,
  type RemoveProjectResult,
  type RenameRequest,
  type ReorderWorkspacesRequest,
  type RevealProjectRequest,
  type SetArchivedRequest,
  type WorkspaceCreated,
  type WorkspaceCreateResult,
  type WorkspacePlan,
  type WorkspacePlanRequest,
} from '@studio/events';
import { canvasPresentationFor } from '../canvas/index.js';
import { broadcastToRenderers } from '../tabs/broadcast.js';
import { discoveredWorktrees } from './discover.js';
import { importWorktreeAt } from './import.js';
import { capture, workspaceTelemetryProperties } from '../telemetry/index.js';
import { captureError } from '../errors/index.js';
import { log } from '../log/index.js';
import { beginCreation } from '../github-import/telemetry.js';
import { judgeWorktreeHead } from './head-check.js';
import { initCopiedSource, planCopiedWorkspace, rollbackCopied } from './copy.js';
import { copyGitFailure } from './creation-failure.js';
import { copyEnvFiles } from './env-files.js';
import { broadcastWorkspacesChanged, visibleWorkspaces } from './workspaces-changed.js';
import { isRemovingProject, removeProjectByUser, removeWorkspaceByUser } from './remove-project.js';
import { renameProjectByUser } from './rename.js';
import { revealProject } from './reveal.js';
import {
  addWorktree,
  branchExists,
  configuredUserName,
  defaultRemote,
  deleteBranch,
  remoteUrl,
  removeWorktree,
  repoRoot,
  resolveBaseRef,
  resolveCommit,
  resolveLocalBaseRef,
  worktreeHead,
  type GitResult,
} from './git.js';
import {
  generateWorkspaceName,
  isLocalPathRemote,
  repoIdentityFromRemoteUrl,
  repoNameFromRemoteUrl,
  resolveHandle,
} from './naming.js';
import { installSetupProofHook } from './setup-proof.js';
import { recordFolderRefused, recordProjectArchived, recordWorkspacesReordered } from './telemetry.js';
import {
  heldWorkspaceAt,
  listWorkspaces,
  projectAt,
  renameWorkspace,
  reorderWorkspaces,
  setProjectArchived,
  setWorkspaceArchived,
  touchProject,
  workspacePathFor,
} from './store.js';

const NAME_ATTEMPTS = 10;
const logger = log('workspace');

// Inspects and creates nothing, so every refusal lands before anything is touched (ONL-1829).
export async function planWorkspace(sourcePath: string): Promise<WorkspacePlan> {
  try {
    await checkWslTools(sourcePath, ['git', 'node']);
    return await planWorkspaceInRuntime(sourcePath);
  } catch (error) {
    if (wslProject(sourcePath) === undefined) throw error;
    return { kind: 'refused', reason: 'runtime-unavailable', detail: error instanceof Error ? error.message : String(error) };
  }
}

async function planWorkspaceInRuntime(sourcePath: string): Promise<WorkspacePlan> {
  beginCreation(sourcePath, 'folder');
  const root = await repoRoot(sourcePath);
  if (!root) return planCopiedWorkspace(sourcePath);
  // A held repository keeps the identity it was minted with, remote or not (ONL-2152, ONL-2442).
  const held = heldWorkspaceAt(root);

  const remote = await defaultRemote(root);
  // Local `main` is the one fallback, reached only with no remote (ONL-2152); a HEAD base passes every visual check with isolation gone.
  const base = remote ? await resolveBaseRef(root, remote) : await resolveLocalBaseRef(root);
  if (!base.ok) {
    return {
      kind: 'refused',
      reason: 'no-base-ref',
      detail: !remote
        ? 'No remote, and no local branch named main.'
        : base.candidates.length > 0
          ? `Remote branches found: ${base.candidates.join(', ')}`
          : `No remote-tracking branches for '${remote}'. Try fetching first.`,
    };
  }

  const url = remote ? await remoteUrl(root, remote) : undefined;
  const identitySource = url ?? (remote ? `${root}#${remote}` : root);
  const repoIdentity = held?.repoIdentity ?? repoIdentityFromRemoteUrl(identitySource);
  // A local-path remote's last segment is orchestrator plumbing (`local-origin.git`), not the repo's name.
  const sourceRepoName =
    held?.sourceRepoName ??
    (url && !isLocalPathRemote(url) ? repoNameFromRemoteUrl(url) : undefined) ??
    basename(root);
  const handle = resolveHandle({
    remoteUrl: url,
    userName: await configuredUserName(root),
  });

  const named = await proposeName(root, repoIdentity, handle);
  if (!named) {
    return {
      kind: 'refused',
      reason: 'name-unavailable',
      detail: `No unused workspace name after ${String(NAME_ATTEMPTS)} attempts.`,
    };
  }

  return {
    kind: 'ready',
    sourcePath,
    sourceRepoRoot: root,
    sourceRepoName,
    repoIdentity,
    baseBranch: base.branch,
    baseRef: base.ref,
    baseRefSource: base.source,
    workspaceName: named.workspaceName,
    branchName: named.branchName,
    workspacePath: named.workspacePath,
    ...(held === undefined ? {} : { held: { origin: held.heldOrigin, sourcePath: held.sourcePath } }),
  };
}

async function proposeName(
  root: string,
  repoIdentity: string,
  handle: string,
): Promise<{ workspaceName: string; branchName: string; workspacePath: string } | undefined> {
  for (let attempt = 0; attempt < NAME_ATTEMPTS; attempt += 1) {
    const workspaceName = generateWorkspaceName();
    const branchName = `${handle}/${workspaceName}`;
    const workspacePath = workspacePathFor(repoIdentity, workspaceName, root);
    if (existsSync(workspacePath)) continue;
    if (await branchExists(root, branchName)) continue;
    return { workspaceName, branchName, workspacePath };
  }
  return undefined;
}

export async function fabricateFromPlan(plan: ReadyWorkspacePlan): Promise<WorkspaceCreateResult> {
  if (plan.origin !== 'copied') return createWorkspaceFromPlan(plan);
  const inited = await initCopiedSource(plan);
  if (!inited.ok) {
    // A claim that lost to a bucket already there owns nothing and removes nothing (ONL-2177).
    if (inited.claimed) await rollbackCopied(plan);
    return { ok: false, reason: 'create-failed', detail: inited.detail, copyFailure: inited.copyFailure };
  }
  const created = await createWorkspaceFromPlan(plan);
  if (!created.ok) await rollbackCopied(plan);
  return created;
}

export async function rollbackFromPlan(plan: ReadyWorkspacePlan): Promise<void> {
  if (plan.origin === 'copied') {
    await rollbackCopied(plan);
    return;
  }
  await removeWorktree(plan.sourceRepoRoot, plan.workspacePath);
  await deleteBranch(plan.sourceRepoRoot, plan.branchName);
}

export type ReadyWorkspacePlan = Extract<WorkspacePlan, { kind: 'ready' }>;

// Registers nothing: registration is the setup machine's point of no return, after the cut and the cancel check.
export async function createWorkspaceFromPlan(
  plan: ReadyWorkspacePlan,
  onCutFailed?: (result: GitResult) => void,
): Promise<WorkspaceCreateResult> {
  // Resolved before the add: the ref can move while it runs.
  const expectedCommit = await resolveCommit(plan.sourceRepoRoot, plan.baseRef);

  const added = await addWorktree({
    root: plan.sourceRepoRoot,
    worktreePath: plan.workspacePath,
    branch: plan.branchName,
    // The trust guarantee: a remote ref or local `main`, never `'HEAD'`, which reaches the user's uncommitted work and turns nothing red but `tests/e2e/isolation.e2e.ts`.
    startPoint: plan.baseRef,
  });

  if (!added.ok) {
    // `worktree add` propagates a failing `post-checkout` hook's code, so a non-zero exit can sit on a complete worktree (ONL-1871); a timed-out hook leaves contents nobody can vouch for.
    const healthy =
      !added.timedOut &&
      expectedCommit !== undefined &&
      existsSync(plan.workspacePath) &&
      (await worktreeHead(plan.workspacePath)) === expectedCommit;

    if (!healthy) {
      await removeWorktree(plan.sourceRepoRoot, plan.workspacePath);
      await deleteBranch(plan.sourceRepoRoot, plan.branchName);
      onCutFailed?.(added);
      return {
        ok: false,
        reason: 'create-failed',
        detail: added.timedOut ? timedOutDetail(added.err) : added.err,
        // Only a copy is narrated as one: the same cut runs for a folder Onlook never copied (ONL-3285).
        ...(plan.origin === 'copied' ? { copyFailure: copyGitFailure('worktree_cut', added) } : {}),
      };
    }

    logger.warn('advisory hook failure, proceeding', { stderr: added.err || '(no output)' });
  }

  // Runs on the success path too; a mismatch is recorded as ours and the user's flow continues (ONL-2351).
  const judged = judgeWorktreeHead({
    expectedCommit,
    actualHead: await worktreeHead(plan.workspacePath),
    baseRefSource: plan.baseRefSource,
  });
  const workspaceTelemetry = workspaceTelemetryProperties(plan.repoIdentity);
  logger.info('worktree cut', { project_id: workspaceTelemetry.project_id, ...judged });
  capture('workspace_created', { ...workspaceTelemetry, ...judged });
  if (!judged.head_matches) {
    captureError(new Error(`worktree head does not match the ${judged.base_kind} base`), {
      owner: 'ours',
      subsystem: 'workspace',
      ...workspaceTelemetry,
      base_kind: judged.base_kind,
    });
  }

  const origin = plan.origin ?? plan.held?.origin;
  const copiedEnvFiles = await copyEnvFiles({
    repoRoot: plan.sourceRepoRoot,
    workspacePath: plan.workspacePath,
    ...(origin === 'copied' ? { untracked: 'all' as const } : {}),
  });

  const workspace: WorkspaceCreated = {
    workspacePath: plan.workspacePath,
    workspaceName: plan.workspaceName,
    branchName: plan.branchName,
    baseBranch: plan.baseBranch,
    sourceRepoName: plan.sourceRepoName,
    sourcePath: plan.held?.sourcePath ?? plan.sourcePath,
    sourceRepoRoot: plan.sourceRepoRoot,
    repoIdentity: plan.repoIdentity,
    ...(origin === undefined ? {} : { origin }),
    copiedEnvFiles,
  };

  return { ok: true, workspace };
}

function timedOutDetail(err: string): string {
  return (
    'Making the copy took too long and was stopped. ' +
    'A git hook in this repository may be waiting for input.' +
    (err ? `\n\n${err}` : '')
  );
}

export function noteWorkspaceOpened(path: string): void {
  touchProject(path);
  broadcastWorkspacesChanged();
}

// Starts nothing: a session started here is a second door into `session.start`, past `agent-host`'s isolation guard.
async function openProject(req: OpenProjectRequest): Promise<OpenProjectResult> {
  // Refused while its teardown runs: an open that completed mid-removal would leave a tab on a deleted path (ONL-2315).
  if (isRemovingProject(req.workspacePath)) return { ok: false, reason: 'removing' };
  const resolved = projectAt(req.workspacePath);
  if (!resolved.ok) return resolved;
  const presentation = await canvasPresentationFor(req.workspacePath);
  return { ok: true, workspace: resolved.workspace, ...presentation };
}

function setArchived(req: SetArchivedRequest): void {
  if (req.target === 'project') setProjectArchived(req.workspacePath, req.archived);
  else setWorkspaceArchived(req.repoIdentity, req.archived);
  recordProjectArchived(req);
  broadcastWorkspacesChanged();
}

// The imported row leaves the list here, not in `import.ts`, which owns the one registry write and no channel (ONL-2522).
async function importWorktree(req: ProjectImportRequest): Promise<ProjectImportOutcome> {
  const result = await importWorktreeAt(req.handle, req.entryPoint);
  if (!result.ok) return result;
  broadcastToRenderers(IPC_EMIT.discoveredWorktreesChanged, await discoveredWorktrees());
  return { ok: true };
}

function rename(req: RenameRequest): void {
  if (req.target === 'project') {
    renameProjectByUser(req.workspacePath, req.name);
    return;
  }
  renameWorkspace(req.repoIdentity, req.name);
  broadcastWorkspacesChanged();
}

export function registerWorkspaceHandlers(tabs: {
  reserveOpen(viewId: number, workspacePath: string): boolean;
  releaseOpen(viewId: number, workspacePath: string): void;
} = { reserveOpen: () => true, releaseOpen: () => {} }): void {
  installSetupProofHook();
  handle(IPC_INVOKE.workspacePlan, async (_event, req: WorkspacePlanRequest) => {
    const plan = await planWorkspace(req.sourcePath);
    recordFolderRefused(plan, req.entryPoint, capture);
    return plan;
  });
  handle(IPC_INVOKE.listWorkspaces, () => visibleWorkspaces());
  handle(IPC_INVOKE.listDiscoveredWorktrees, () => discoveredWorktrees());
  handle(IPC_INVOKE.importWorktree, (_event, req: ProjectImportRequest) =>
    importWorktree(req),
  );
  handle(IPC_INVOKE.openProject, async (event, req: OpenProjectRequest) => {
    if (!tabs.reserveOpen(event.sender.id, req.workspacePath)) return { ok: false, reason: 'at-limit' } as const;
    try {
      const result = await openProject(req);
      if (!result.ok) tabs.releaseOpen(event.sender.id, req.workspacePath);
      return result;
    } catch (error) {
      tabs.releaseOpen(event.sender.id, req.workspacePath);
      throw error;
    }
  });
  handle(IPC_INVOKE.setArchived, (_event, req: SetArchivedRequest) => {
    setArchived(req);
  });
  handle(IPC_INVOKE.rename, (_event, req: RenameRequest) => {
    rename(req);
  });
  handle(IPC_INVOKE.revealProject, (_event, req: RevealProjectRequest) =>
    revealProject(req.workspacePath),
  );
  handle(
    IPC_INVOKE.removeProject,
    (_event, req: RemoveProjectRequest): Promise<RemoveProjectResult> =>
      req.target === 'project'
        ? removeProjectByUser(req.workspacePath)
        : removeWorkspaceByUser(req.repoIdentity),
  );
  handle(IPC_INVOKE.reorderWorkspaces, (_event, req: ReorderWorkspacesRequest) => {
    // Read from the registry either side of the write, never off the payload: the order the user sees is the one that moved.
    const before = listWorkspaces().map((workspace) => workspace.repoIdentity);
    reorderWorkspaces(req.order);
    recordWorkspacesReordered(before, listWorkspaces().map((workspace) => workspace.repoIdentity));
    broadcastWorkspacesChanged();
  });
}

export { knownProject } from './store.js';
