import type { ProjectImportEntryPoint, ProjectImportRefusalReason, WorkspaceCreated } from '@studio/events';
import { capture } from '../telemetry/index.js';
import { recoverWorktreeAt } from './discover.js';
import { readQuarantinedProjects } from './quarantine.js';
import { nameUnnamedWorkspace, registeredProject, rememberProject, workspaceRoot } from './store.js';
import { recordProjectImported, type Capture } from './telemetry.js';
import { broadcastWorkspacesChanged } from './workspaces-changed.js';
import { checkWslTools } from '../env/wsl-tools.js';
import { wslProject } from '../env/wsl.js';

export type ProjectImportResult =
  | { ok: true; workspace: WorkspaceCreated }
  | { ok: false; reason: ProjectImportRefusalReason; detail?: string };

export interface ProjectImportDeps {
  capture: Capture;
  changed: () => void;
}

const defaultDeps: ProjectImportDeps = { capture, changed: broadcastWorkspacesChanged };

/** Classified here, never trusted from the caller: the discovered list goes stale, and the folder picker enters the same way (ONL-2522). */
export async function importWorktreeAt(
  workspacePath: string,
  entryPoint: ProjectImportEntryPoint,
  deps: ProjectImportDeps = defaultDeps,
): Promise<ProjectImportResult> {
  try {
    await checkWslTools(workspacePath, ['git', 'node']);
    return await importWorktreeInRuntime(workspacePath, entryPoint, deps);
  } catch (error) {
    if (wslProject(workspacePath) === undefined) throw error;
    recordProjectImported(entryPoint, { ok: false, refusal: 'runtime-unavailable' }, deps.capture);
    return { ok: false, reason: 'runtime-unavailable', detail: error instanceof Error ? error.message : String(error) };
  }
}

async function importWorktreeInRuntime(workspacePath: string, entryPoint: ProjectImportEntryPoint, deps: ProjectImportDeps): Promise<ProjectImportResult> {
  const outcome = await recoverWorktreeAt(workspacePath, readQuarantinedProjects(workspaceRoot()));
  if (!outcome.ok) {
    recordProjectImported(entryPoint, { ok: false, refusal: outcome.reason }, deps.capture);
    return { ok: false, reason: outcome.reason };
  }

  const { workspace, createdAt, lastOpenedAt, groupName, completedBy } = outcome.project;
  // Re-read: the classifier's gate opened before the branch and base ladder ran, and a second click fits inside that window (ONL-2522).
  if (registeredProject(workspace.workspacePath) !== undefined) {
    recordProjectImported(entryPoint, { ok: false, refusal: 'already-a-project' }, deps.capture);
    return { ok: false, reason: 'already-a-project' };
  }
  // The one registry write; a second door is a hole in the guard `main/agent-host` depends on.
  rememberProject({
    ...workspace,
    ...(createdAt === undefined ? {} : { createdAt }),
    ...(lastOpenedAt === undefined ? {} : { lastOpenedAt }),
  });
  // Keyed off the identity the record is actually imported with, so the lookup cannot miss.
  if (groupName !== undefined) nameUnnamedWorkspace(workspace.repoIdentity, groupName);
  deps.changed();
  recordProjectImported(entryPoint, { ok: true, record: workspace, completedBy }, deps.capture);
  return { ok: true, workspace };
}
