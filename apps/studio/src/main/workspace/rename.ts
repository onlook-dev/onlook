import { log } from '../log/index.js';
import type { TelemetryEventName, TelemetryProperties } from '../telemetry/events.js';
import { capture, workspaceTelemetryProperties, recordProjectRenamed } from '../telemetry/index.js';
import { noteTabLabelsChanged } from '../tabs/signals.js';
import { renameBranch, type RenameBranchResult } from './git.js';
import { broadcastWorkspacesChanged } from './workspaces-changed.js';
import { resolveHandle, slugify } from './naming.js';
import { knownProject, moveProjectBranch, renameProject } from './store.js';

const logger = log('workspace');

export type RenameProjectOutcome =
  | { ok: true; name: string; branchName: string }
  | { ok: false; reason: string };

const PROJECT_NAME_WORD_CAP = 3;

export function normalizeProjectName(raw: string): string {
  return raw.trim().split(/\s+/).filter(Boolean).slice(0, PROJECT_NAME_WORD_CAP).join(' ');
}

export function renameTargetFor(branchName: string | undefined, name: string): string | undefined {
  const branch = typeof branchName === 'string' ? branchName : '';
  const slash = branch.indexOf('/');
  const handle = slash > 0 ? branch.slice(0, slash) : resolveHandle({});
  const slug = slugify(name);
  return slug === '' ? undefined : `${handle}/${slug}`;
}

export interface RenameDeps {
  renameBranch(worktreePath: string, target: string): Promise<RenameBranchResult>;
  capture<N extends TelemetryEventName>(event: N, properties: TelemetryProperties<N>): void;
}

const defaultDeps: RenameDeps = { renameBranch, capture };

export function renameProjectByUser(workspacePath: string, name: string): void {
  renameProject(workspacePath, name, 'user');
  recordProjectRenamed(workspacePath, 'user');
  broadcastWorkspacesChanged();
  noteTabLabelsChanged();
}

function skipped(reason: string): RenameProjectOutcome {
  return { ok: false, reason };
}

export async function renameProjectByAgent(
  worktreePath: string,
  requested: string,
  deps: RenameDeps = defaultDeps,
): Promise<RenameProjectOutcome> {
  const name = normalizeProjectName(requested);
  if (name === '') return skipped('no name was given');
  // Read at call time, not from the prompt: a user rename that landed during the turn wins (ONL-2181).
  const record = knownProject(worktreePath);
  if (record === undefined) return skipped('this directory is not a Studio project');
  const userNamed = record.displayNameSource === 'user' || (record.displayNameSource === undefined && record.displayName !== undefined);
  if (userNamed) return skipped('the user named this project');
  if (record.displayNameSource === 'agent') return skipped('the project was already renamed');
  const target = renameTargetFor(record.branchName, name);
  if (target === undefined) return skipped('the name has no letters or digits in it');

  renameProject(worktreePath, name, 'agent');
  const moved = await deps.renameBranch(worktreePath, target);
  if (moved.ok) {
    if (moved.moved) moveProjectBranch(worktreePath, moved.branch);
  } else {
    logger.warn('rename_project kept the branch', { stderr: moved.detail });
  }
  broadcastWorkspacesChanged();
  noteTabLabelsChanged();
  deps.capture('project_renamed', { ...workspaceTelemetryProperties(record.repoIdentity), by: 'agent' });
  return { ok: true, name, branchName: moved.ok ? moved.branch : record.branchName };

}
