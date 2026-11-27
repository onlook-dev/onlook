export type GitHead = 'branch' | 'detached' | 'unborn';
export type GitOriginKind = 'none' | 'github' | 'other';
export type GitRepoAccess = 'unknown' | 'granted' | 'denied';
export type GitPrState = 'OPEN' | 'CLOSED' | 'MERGED';
export type GitChecksRollup = 'failing' | 'pending' | 'passing' | 'none';

export const GIT_PR_FAILURES = ['no-changes', 'push-refused', 'org-approval', 'sign-in', 'unknown'] as const;
export type GitPrFailure = (typeof GIT_PR_FAILURES)[number];

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
  history?: 'none';
  gitInstalled: boolean;
  ghInstalled: boolean;
  ghAuthed: boolean;
  ghAccount?: string;
  /** The GitHub login the account connection reported when these facts were measured; absent when `gh` measured them, and absent when the connection named none. */
  connectionAccount?: string;
  /** Set when the account connection measured these facts, whether or not it named a login. */
  connectionMeasured?: boolean;
  connectViaBrowser?: boolean;
  githubReadFailure?: import('./github-import.js').GithubReadFailure;
  origin: GitOriginKind;
  /** `owner/name`. */
  repo?: string;
  access: GitRepoAccess;
  accessReason?: 'repo-not-visible' | 'read-only' | 'unknown' | 'sso_required' | 'approval_required';
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
  /** The pull-request answer arrived and could not be read, so a missing `pr` is not the absence of one (ONL-3371). */
  prUnknown?: boolean;
}

export type GitMeasureTrigger = 'open' | 'turn-end' | 'interval' | 'focus' | 'activate';
export type GitCadenceTrigger = Extract<GitMeasureTrigger, 'interval' | 'focus' | 'activate'>;

export interface GitSnapshotRow {
  invalidated?: boolean;
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
