import type { CanvasCamera, CanvasPageId } from './canvas.js';
import type { WorkspaceCreated } from './workspace.js';

export interface ProjectSummary {
  workspacePath: string;
  name: string;
  /** The user's name or the bare draw, never the composed card name: committing that would freeze the repo prefix into a display name (ONL-2185). */
  editableName: string;
  branchName: string;
  repoIdentity: string;
  lastOpenedAt: string;
  createdAt: string;
  /** Listed, not dropped: only the user knows whether the deletion was deliberate. */
  missing: boolean;
  archived: boolean;
  /** Derived at summary time, absent when no capture has landed; the token is what versions the image (ONL-2471). */
  previewUrl?: string;
}

export interface WorkspaceSummary {
  repoIdentity: string;
  name: string;
  sourcePath: string;
  lastOpenedAt: string;
  archived: boolean;
  projects: ProjectSummary[];
}

/** A worktree on disk the registry has no record of, offered for import (ONL-2522). */
export interface DiscoveredWorktree {
  /** Main's own path for the worktree, passed back unchanged; the renderer composes no path. */
  handle: string;
  name: string;
  branchName: string;
  /** The Workspace this candidate would land in. */
  groupName: string;
  repoIdentity: string;
  /** `record` when a quarantined registry supplied the fields, `git` when only git answered. */
  completedBy: 'record' | 'git';
  /** Absent when only git answered: the cut records no edit time, so the row shows none (ONL-2522). */
  lastEditedAt?: string;
  /** The branch's newest own commit subject; absent when it has none past its base (ONL-2593). */
  latestCommit?: string;
}

/** Deliberately not `WorkspaceRefusalReason`, which types what project creation can refuse; import refuses other things and creation refuses none of these (ONL-2522). */
export type ProjectImportRefusalReason =
  | 'not-a-repository'
  | 'repository-gone'
  | 'is-the-repository'
  | 'inside-a-project'
  | 'already-a-project'
  | 'busy'
  /** The bucket is swept-prefixed and still carries the creating marker, so the boot sweep removes it whole (ONL-2522). */
  | 'being-cleaned-up'
  | 'fields-incomplete'
  | 'runtime-unavailable';

export type ProjectImportEntryPoint = 'discovered' | 'picked';

export interface ProjectImportRequest {
  /** A discovered row's handle, or the folder the picker answered. */
  handle: string;
  entryPoint: ProjectImportEntryPoint;
}

/** Listed, not opened: the imported Project arrives as an ordinary card (ONL-2522). */
export type ProjectImportOutcome =
  | { ok: true }
  | { ok: false; reason: ProjectImportRefusalReason; detail?: string };

export interface OpenProjectRequest {
  workspacePath: string;
}

export type OpenProjectResult =
  | {
      ok: true;
      workspace: WorkspaceCreated;
      /** Seeded before the editor mounts: React Flow reads its camera at init only. */
      camera?: CanvasCamera;
      /** The page the camera belongs to, and the one the user left (ONL-2488). */
      currentPageId?: CanvasPageId;
    }
  | {
      ok: false;
      /** `removing`: an open that completed mid-teardown would leave a tab on a deleted path (ONL-2315). */
      reason: 'unknown-project' | 'workspace-missing' | 'removing' | 'at-limit';
    };

export interface RevealProjectRequest {
  workspacePath: string;
}

export type RevealProjectResult =
  | { ok: true }
  | { ok: false; reason: 'unknown-project' | 'open-failed' };

export type RemoveProjectRequest =
  | { target: 'project'; workspacePath: string }
  | { target: 'workspace'; repoIdentity: string };

/** `cancelled` and `tab-held` are answers the user gave, and nothing was deleted under either; a folder's `tab-held` still leaves the tabs it already closed closed (ONL-2523). */
export type RemoveProjectResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'unknown-project' | 'in-flight' | 'cancelled' | 'tab-held' | 'folder-remains';
    };

export type SetArchivedRequest =
  | { target: 'project'; workspacePath: string; archived: boolean }
  | { target: 'workspace'; repoIdentity: string; archived: boolean };

/** Ids not listed keep their added order, after these. */
export interface ReorderWorkspacesRequest {
  order: string[];
}

export type RenameRequest =
  | { target: 'project'; workspacePath: string; name: string }
  | { target: 'workspace'; repoIdentity: string; name: string };

export type ProjectsSelection =
  | { kind: 'recent' }
  | { kind: 'artifacts' }
  | { kind: 'workspace'; repoIdentity: string };

export type NewProjectTarget =
  | { kind: 'workspace'; sourcePath: string }
  | { kind: 'pick' };

export function selectedWorkspaceFor(
  selection: ProjectsSelection,
  workspaces: readonly WorkspaceSummary[],
): WorkspaceSummary | undefined {
  return selection.kind === 'workspace'
    ? workspaces.find((workspace) => workspace.repoIdentity === selection.repoIdentity)
    : undefined;
}

/** Scoped by `repoIdentity`, unfiltered on Recent: one stray worktree must not appear under every Workspace (ONL-2522). */
export function discoveredWorktreesFor(
  selection: ProjectsSelection,
  discovered: readonly DiscoveredWorktree[],
): DiscoveredWorktree[] {
  if (selection.kind === 'artifacts') return [];
  if (selection.kind === 'recent') return [...discovered];
  return discovered.filter((candidate) => candidate.repoIdentity === selection.repoIdentity);
}

export function newProjectTargetFor(
  selection: ProjectsSelection,
  workspaces: readonly WorkspaceSummary[],
): NewProjectTarget {
  const workspace = selectedWorkspaceFor(selection, workspaces);
  if (workspace === undefined) return { kind: 'pick' };
  return { kind: 'workspace', sourcePath: workspace.sourcePath };
}
