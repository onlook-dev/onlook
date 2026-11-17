export type GitHead = 'branch' | 'detached' | 'unborn';
export type GitOriginKind = 'none' | 'github' | 'other';
export type GitRepoAccess = 'unknown' | 'granted' | 'denied';
export type GitPrState = 'OPEN' | 'CLOSED' | 'MERGED';
export type GitChecksRollup = 'failing' | 'pending' | 'passing' | 'none';

export interface GitMeasuredPullRequest {
  number: number;
  url: string;
  state: GitPrState;
  isDraft: boolean;
  mergeStateStatus: string;
  checks: GitChecksRollup;
  baseRefName: string;
  updatedAt: string;
  viewerCanMerge?: boolean;
}

export interface GitMeasurement {
  gitInstalled: boolean;
  ghInstalled: boolean;
  ghAuthed: boolean;
  ghAccount?: string;
  origin: GitOriginKind;
  /** `owner/name`. */
  repo?: string;
  access: GitRepoAccess;
  accessReason?: 'repo-not-visible' | 'read-only' | 'unknown';
  branch?: string;
  head: GitHead;
  /** What `ahead`/`behind` count against: `pr.baseRefName` when a PR was measured, else the project's recorded base (ONL-2411). */
  baseBranch: string;
  baseExists: boolean;
  ahead: number;
  behind: number;
  dirty: boolean;
  aheadOfUpstream: boolean;
  pr?: GitMeasuredPullRequest;
  /** `gh` failed part-way; the git facts hold and `pr` is unknown, not absent. */
  partial?: boolean;
}

export type GitMeasureTrigger = 'open' | 'turn-end' | 'interval' | 'focus' | 'activate';
export type GitCadenceTrigger = Extract<GitMeasureTrigger, 'interval' | 'focus' | 'activate'>;

export interface GitSnapshotRow {
  measurement: GitMeasurement;
  /** Stamped before the first git command runs. */
  measuredAt: string;
  /** Last successful fetch. */
  fetchedAt?: string;
  trigger: GitMeasureTrigger;
  /** The measurement failed; `measurement` is the previous one. */
  stale: boolean;
}

export interface GitStatusChange {
  worktreePath: string;
  row: GitSnapshotRow;
}

export type GitStatusList = Record<string, GitSnapshotRow>;

export type GitNoPrDefault = 'create-pr' | 'push';
export type GitReadyDefault = 'open-in-browser' | 'merge';

export interface GitPillDefaults {
  noPr: GitNoPrDefault;
  ready: GitReadyDefault;
}

export const GIT_PILL_SHIPPED_DEFAULTS: GitPillDefaults = { noPr: 'create-pr', ready: 'open-in-browser' };

export type GitPillDefaultsPatch = Partial<GitPillDefaults>;
