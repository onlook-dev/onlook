/** Refusals, never degraded modes: a connect-anyway path puts the agent on the user's real checkout (ONL-1829). */
export type WorkspaceRefusalReason = 'already-copied' | 'no-base-ref' | 'name-unavailable' | 'nothing-to-copy';

export type BaseRefSource = 'upstream' | 'remote-head' | 'sole-remote-branch' | 'conventional-name' | 'local-main';

export type WorkspacePlan =
  | {
      kind: 'refused';
      reason: WorkspaceRefusalReason;
      detail?: string;
      projectName?: string;
    }
  | {
      kind: 'ready';
      sourcePath: string;
      sourceRepoRoot: string;
      sourceRepoName: string;
      repoIdentity: string;
      baseBranch: string;
      baseRef: string;
      baseRefSource: BaseRefSource;
      workspaceName: string;
      branchName: string;
      workspacePath: string;
      origin?: 'copied' | 'duplicate';
      duplicateSourceName?: string;
      /** Never folded into `origin`: a copied origin's rollback removes the bucket every sibling is cut from (ONL-2442). */
      held?: { origin: HeldOrigin; sourcePath: string };
    };

export type ComfortChoice = 'design' | 'experiment' | 'ship';
export const COMFORT_CHOICES = ['design', 'experiment', 'ship'] as const satisfies readonly ComfortChoice[];

export type BlankEntryPoint = 'onboarding' | 'projects';
export type CreationEntryPoint = BlankEntryPoint | 'switcher' | 'band';

export type WorkspaceOrigin = 'blank' | 'imported' | 'copied' | 'duplicate';

/** The repository is Studio's own, in the workspace's bucket. */
export type HeldOrigin = 'blank' | 'copied';

export const DISPLAY_NAME_SOURCES = ['user', 'agent', 'provisional'] as const;
export type DisplayNameSource = (typeof DISPLAY_NAME_SOURCES)[number];

export interface DuplicateProjectRequest {
  workspacePath: string;
}

export interface WorkspaceCreated {
  internal?: 'artifacts';
  workspacePath: string;
  workspaceName: string;
  branchName: string;
  baseBranch: string;
  sourceRepoName: string;
  sourcePath: string;
  sourceRepoRoot: string;
  repoIdentity: string;
  /** Presentation only; `workspaceName` stays the identity (folder, briefing, telemetry). */
  displayName?: string;
  /** Absent beside a `displayName` means the user, from before the field existed (ONL-2181). */
  displayNameSource?: DisplayNameSource;
  /** Absent means `imported`: a record older than the field (ONL-2152). */
  origin?: WorkspaceOrigin;
  heldOrigin?: HeldOrigin;
  comfort?: ComfortChoice;
  copiedEnvFiles: string[];
}

export function workspaceDisplayName(workspace: {
  workspaceName: string;
  displayName?: string;
}): string {
  return workspace.displayName ?? workspace.workspaceName;
}

export interface CopyFailure {
  step: 'claim' | 'copy_files' | 'git_init' | 'git_config' | 'git_add' | 'git_commit' | 'worktree_cut';
  cause: 'ignored_files' | 'permission_denied' | 'folder_unavailable' | 'copy_in_progress' | 'disk_full' | 'git_timed_out' | 'git_failed' | 'unknown';
}

export type WorkspaceCreateResult =
  | {
      ok: true;
      workspace: WorkspaceCreated;
    }
  | { ok: false; reason: WorkspaceRefusalReason | 'create-failed'; detail?: string; copyFailure?: CopyFailure };

export type BlankCreateStage = 'setting-up' | 'installing' | 'starting';

export interface CreateBlankRequest {
  entryPoint: BlankEntryPoint;
  openInNewTab?: boolean;
}

/** Resolves at frame-live, or only after the rollback finished: the renderer reads the answer as "nothing of the attempt remains". */
export type BlankCreateResult =
  | { ok: true; workspace: WorkspaceCreated }
  /** `explanation` is what the machine checks say the person can do about it, beside whatever the failing step reported. */
  | { ok: false; stage: BlankCreateStage; canceled: boolean; detail?: string; explanation?: string };

export type ProjectCreatePhase = 'planning' | 'copying' | 'installing' | 'starting';

/** `planning.sourceRepoName` is the picked path's last segment, which can differ from the repo's name; later arms carry the plan's. */
export type ProjectCreateState =
  | { kind: 'planning'; sourceRepoName: string; duplicateSourceName?: string }
  | { kind: 'copying'; sourceRepoName: string; workspaceName: string; duplicateSourceName?: string }
  | { kind: 'ready'; workspace: WorkspaceCreated }
  | { kind: 'installing'; workspace: WorkspaceCreated }
  | { kind: 'starting'; workspace: WorkspaceCreated }
  | { kind: 'live'; workspace: WorkspaceCreated }
  | {
      kind: 'refused';
      sourceRepoName: string;
      reason: WorkspaceRefusalReason;
      detail?: string;
      projectName?: string;
    }
  | {
      kind: 'failed';
      sourceRepoName: string;
      phase: ProjectCreatePhase;
      detail?: string;
      copyFailure?: CopyFailure;
      workspace?: WorkspaceCreated;
    }
  | { kind: 'canceled'; detail?: string };

export function creationWorkspace(state: ProjectCreateState): WorkspaceCreated | undefined {
  return 'workspace' in state ? state.workspace : undefined;
}

/** `entryPoint` is a person's pick and feeds telemetry only; a plan without one records nothing (ONL-2895). */
export interface WorkspacePlanRequest {
  sourcePath: string;
  entryPoint?: BlankEntryPoint;
}
