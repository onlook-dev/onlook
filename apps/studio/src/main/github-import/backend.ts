import type { GithubConnection, GithubFailure, GithubReadFailure, GithubRepositoryPage, GithubStart, GitMeasuredPullRequest } from '@studio/events';

export type { GithubReadFailure } from '@studio/events';
export type GithubIdentity = GithubReadFailure | { status: 'connected'; account: string };
export type GithubPermission = 'ADMIN' | 'MAINTAIN' | 'WRITE' | 'TRIAGE' | 'READ';
export type GithubRepositoryAccess = GithubReadFailure | {
  status: 'connected';
  repository: { fullName: string; permission: GithubPermission; parent: { fullName: string; permission: GithubPermission | null } | null };
};
export type GithubPullRequests = GithubReadFailure | { status: 'connected'; pullRequests: GitMeasuredPullRequest[] };

export interface GithubReads {
  identity(): Promise<GithubIdentity>;
  repositoryAccess(repository: string): Promise<GithubRepositoryAccess>;
  pullRequests(repository: string, branch: string, headOwner?: string): Promise<GithubPullRequests>;
}

export type GithubCredential = GithubFailure | {
  status: 'ready'; remoteUrl: string; username: 'x-access-token'; password: string; expiresAt: number;
};

export interface GithubBackend extends Partial<GithubReads> {
  start(): Promise<GithubStart>;
  status(): Promise<GithubConnection>;
  repositories(page: number): Promise<GithubRepositoryPage>;
  credential(repository: string, operation: 'clone' | 'push'): Promise<GithubCredential>;
}
