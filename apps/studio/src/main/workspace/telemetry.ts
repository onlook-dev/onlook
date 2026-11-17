/** Hashed ids and counts only; a project path or a repo name is a customer's private codebase in a dashboard (ONL-2395). */

import type {
  BlankEntryPoint,
  ProjectImportEntryPoint,
  SetArchivedRequest,
  ProjectImportRefusalReason,
  WorkspaceCreated,
  WorkspaceOrigin,
  WorkspacePlan,
} from '@studio/events';
import type {
  TelemetryEventName,
  TelemetryProperties,
} from '../telemetry/events.js';
import { capture, workspaceTelemetryProperties, resolveWorkspaceTelemetryProperties } from '../telemetry/index.js';
import { listWorkspaces, workspaceOrigin } from './store.js';

export type Capture = <N extends TelemetryEventName>(
  event: N,
  properties: TelemetryProperties<N>,
) => void;

export function recordProjectRevealed(record: WorkspaceCreated, emit: Capture): void {
  const workspaceProperties = resolveWorkspaceTelemetryProperties(record.workspacePath);
  if (workspaceProperties === undefined) return;
  emit('project_revealed', { ...workspaceProperties, origin: workspaceOrigin(record) });
}

// Hashed off the record in hand, not through `resolveWorkspaceTelemetryId`: the registry has forgotten this project by the time a removal is recorded.
export function recordProjectRemoved(
  record: WorkspaceCreated,
  facts: { missing: boolean; last_in_group: boolean },
  emit: Capture,
): void {
  emit('project_removed', {
    ...workspaceTelemetryProperties(record.repoIdentity),
    origin: workspaceOrigin(record),
    ...facts,
  });
}

export type ProjectImportOutcome =
  | { ok: true; record: WorkspaceCreated; completedBy: 'record' | 'git' }
  | { ok: false; refusal: ProjectImportRefusalReason };

// Hashed off the record in hand, like a removal's: the registry does not hold the project yet when an import records (ONL-2522).
export function recordProjectImported(
  entry_point: ProjectImportEntryPoint,
  outcome: ProjectImportOutcome,
  emit: Capture,
): void {
  emit(
    'project_imported',
    outcome.ok
      ? {
          ...workspaceTelemetryProperties(outcome.record.repoIdentity),
          origin: workspaceOrigin(outcome.record),
          entry_point,
          completed_by: outcome.completedBy,
        }
      : { entry_point, refusal: outcome.refusal },
  );
}

export function recordFolderRefused(plan: WorkspacePlan, entryPoint: BlankEntryPoint | undefined, emit: Capture): void {
  if (plan.kind !== 'refused' || entryPoint === undefined) return;
  emit('project_folder_refused', { reason: plan.reason, entry_point: entryPoint });
}

export function recordWorktreesDiscovered(counts: { offered: number; refused: number }): void {
  capture('worktrees_discovered', counts);
}

export function recordWorkspaceRemoved(
  repoIdentity: string,
  facts: { origin: WorkspaceOrigin; project_count: number; missing_count: number },
  emit: Capture,
): void {
  emit('workspace_removed', { ...workspaceTelemetryProperties(repoIdentity), ...facts });
}

export function recordProjectArchived(req: SetArchivedRequest): void {
  const workspaceProperties =
    req.target === 'project'
      ? resolveWorkspaceTelemetryProperties(req.workspacePath)
      : workspaceTelemetryProperties(req.repoIdentity);
  if (workspaceProperties === undefined) return;
  capture('project_archived', {
    ...workspaceProperties,
    target: req.target,
    archived: req.archived,
    workspace_count: listWorkspaces().length,
  });
}

export function recordWorkspacesReordered(
  before: readonly string[],
  after: readonly string[],
): void {
  const place = new Map(before.map((id, index) => [id, index]));
  let moved_distance = 0;
  after.forEach((id, index) => {
    const from = place.get(id);
    if (from !== undefined) moved_distance = Math.max(moved_distance, Math.abs(from - index));
  });
  capture('workspaces_reordered', { workspace_count: after.length, moved_distance });
}
