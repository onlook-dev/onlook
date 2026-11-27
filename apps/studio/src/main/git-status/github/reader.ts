import type { GitMeasuredPullRequest, GitRepoAccess } from '@studio/events';

/** `ok:false, partial:false` is the explicit negative; `partial:true` is unreachable, rate-limited or timed out. */
type Probe<T> = { ok: true; value: T } | { ok: false; partial: boolean };

// `access` and `pullRequests` carry their negative as a value ('denied', []); a `Probe` here would invite a second, unreachable negative.
type Answered<T> = { ok: true; value: T } | { ok: false; partial: true };

interface GitHubIdentity {
  /** Absent when the connection is established but reports no login. */
  account?: string;
}

export type GitHubAccess = Exclude<GitRepoAccess, 'unknown'>;

export interface GitHubRepoAccess {
  permission: GitHubAccess;
  reason?: 'repo-not-visible' | 'read-only' | 'unknown' | 'sso_required' | 'approval_required';
  parent?: string;
  parentPermission?: GitHubAccess;
  /** The origin's owner as GitHub spells it; the remote URL's spelling may differ in case. */
  owner?: string;
}

interface PullRequestFilter {
  headOwner?: string;
  account?: string;
}

export interface GitHubReader {
  present(): Promise<Probe<true>>;
  identity(): Promise<Probe<GitHubIdentity>>;
  access(repo?: string): Promise<Answered<GitHubRepoAccess>>;
  pullRequests(repo: string | undefined, head: string, filter?: PullRequestFilter): Promise<Answered<GitMeasuredPullRequest[]>>;
}
