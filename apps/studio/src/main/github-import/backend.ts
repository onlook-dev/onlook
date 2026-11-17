import type { GithubConnection, GithubFailure, GithubRepositoryPage, GithubStart } from '@studio/events';

export type GithubCredential = GithubFailure | {
  status: 'ready'; remoteUrl: string; username: 'x-access-token'; password: string; expiresAt: number;
};

export interface GithubBackend {
  start(): Promise<GithubStart>;
  status(): Promise<GithubConnection>;
  repositories(page: number): Promise<GithubRepositoryPage>;
  credential(repository: string, operation: 'clone' | 'push'): Promise<GithubCredential>;
}
