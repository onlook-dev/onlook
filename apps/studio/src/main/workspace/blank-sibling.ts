import { existsSync } from 'node:fs';
import { cp, mkdir, rm } from 'node:fs/promises';
import type { WorkspaceCreateResult, WorkspacePlan } from '@studio/events';
import type { ReadyWorkspacePlan } from './index.js';
import { generateWorkspaceName } from './naming.js';
import { heldWorkspaceAt, workspacePathFor } from './store.js';

const claimed = new WeakSet<ReadyWorkspacePlan>();

export function planBlankSibling(sourcePath: string): WorkspacePlan | undefined {
  const source = heldWorkspaceAt(sourcePath);
  if (source?.heldOrigin !== 'blank' || source.history !== 'none') return undefined;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const workspaceName = generateWorkspaceName();
    const workspacePath = workspacePathFor(source.repoIdentity, workspaceName);
    if (existsSync(workspacePath)) continue;
    return {
      kind: 'ready', sourcePath: source.sourceRepoRoot, sourceRepoRoot: source.sourceRepoRoot,
      sourceRepoName: source.sourceRepoName, repoIdentity: source.repoIdentity,
      baseBranch: source.baseBranch, baseRef: 'main', baseRefSource: 'local-main',
      workspaceName, workspacePath, branchName: `onlook/${workspaceName}`, origin: 'blank', history: 'none',
    };
  }
  return { kind: 'refused', reason: 'name-unavailable' };
}

export async function fabricateBlankSibling(plan: ReadyWorkspacePlan): Promise<WorkspaceCreateResult> {
  const source = heldWorkspaceAt(plan.sourceRepoRoot);
  if (source?.heldOrigin !== 'blank' || source.history !== 'none' || plan.workspacePath !== workspacePathFor(source.repoIdentity, plan.workspaceName)) {
    return { ok: false, reason: 'create-failed' };
  }
  try {
    await mkdir(plan.workspacePath);
    claimed.add(plan);
    await cp(plan.sourceRepoRoot, plan.workspacePath, { recursive: true, force: false, verbatimSymlinks: true });
    const { kind: _kind, baseRef: _baseRef, baseRefSource: _baseRefSource, held: _held, duplicateSourceName: _duplicate, ...workspace } = plan;
    return { ok: true, workspace: { ...workspace, copiedEnvFiles: [] } };
  } catch (error) {
    await rollbackBlankSibling(plan);
    return { ok: false, reason: 'create-failed', detail: String(error) };
  }
}

export async function rollbackBlankSibling(plan: ReadyWorkspacePlan): Promise<void> {
  if (!claimed.has(plan)) return;
  await rm(plan.workspacePath, { recursive: true, force: true });
  claimed.delete(plan);
}
