import type { GithubBackend, GithubIdentity, GithubPermission, GithubReadFailure, GithubReads } from '../../github-import/backend.js';
import type { GitHubAccess, GitHubReader, GitHubRepoAccess } from './reader.js';

function permissionFor(permission: GithubPermission | null): GitHubAccess {
  return permission === 'ADMIN' || permission === 'MAINTAIN' || permission === 'WRITE' ? 'granted' : 'denied';
}

function denied(failure: GithubReadFailure): GitHubRepoAccess | undefined {
  if (failure.status === 'not_found') return { permission: 'denied', reason: 'repo-not-visible' };
  if (failure.status === 'forbidden') return { permission: 'denied', reason: 'unknown' };
  if (failure.status === 'sso_required' || failure.status === 'approval_required') return { permission: 'denied', reason: failure.status };
  return undefined;
}

async function safely<Result>(read: () => Promise<Result>): Promise<Result | { status: 'unavailable'; reason: 'provider_unavailable' }> {
  try { return await read(); } catch { return { status: 'unavailable', reason: 'provider_unavailable' }; }
}

function accountReader(reads: GithubReads, identity: GithubIdentity): Selection {
  let failure: GithubReadFailure | undefined = identity.status === 'connected' ? undefined : identity;
  const reader: GitHubReader = {
    present: async () => ({ ok: true, value: true }),
    identity: async () => identity.status === 'connected' || identity.status === 'sso_required' || identity.status === 'approval_required'
      ? { ok: true, value: { account: identity.status === 'connected' ? identity.account : '' } }
      : { ok: false, partial: identity.status !== 'disconnected' && identity.status !== 'reconnect' },
    async access(repository) {
      if (repository === undefined) return { ok: false, partial: true };
      const result = await safely(() => reads.repositoryAccess(repository));
      if (result.status !== 'connected') {
        failure = result;
        const value = denied(result);
        return value === undefined ? { ok: false, partial: true } : { ok: true, value };
      }
      const { fullName, permission, parent } = result.repository;
      const access = permissionFor(permission);
      return { ok: true, value: {
        permission: access, owner: fullName.split('/')[0],
        ...(access === 'denied' ? { reason: 'read-only' as const } : {}),
        ...(parent === null ? {} : { parent: parent.fullName, parentPermission: permissionFor(parent.permission) }),
      } };
    },
    async pullRequests(repository, branch, filter) {
      if (repository === undefined) return { ok: false, partial: true };
      const result = await safely(() => reads.pullRequests(repository, branch, filter?.headOwner));
      if (result.status !== 'connected') failure = result;
      return result.status === 'connected' ? { ok: true, value: result.pullRequests } : { ok: false, partial: true };
    },
  };
  return { reader, connectViaBrowser: true, failure: () => failure };
}

interface Selection {
  reader: GitHubReader;
  connectViaBrowser: boolean;
  failure?: () => GithubReadFailure | undefined;
}

export async function selectGithubReader(backend: GithubBackend | undefined, fallback: GitHubReader): Promise<Selection> {
  const { identity, repositoryAccess, pullRequests } = backend ?? {};
  if (identity === undefined || repositoryAccess === undefined || pullRequests === undefined) {
    return { reader: fallback, connectViaBrowser: false };
  }
  const reads: GithubReads = {
    identity: () => identity.call(backend),
    repositoryAccess: (repository) => repositoryAccess.call(backend, repository),
    pullRequests: (repository, branch, headOwner) => pullRequests.call(backend, repository, branch, headOwner),
  };
  const account = await safely(() => reads.identity());
  return account.status === 'disconnected' ? { reader: fallback, connectViaBrowser: true, failure: () => account } : accountReader(reads, account);
}
