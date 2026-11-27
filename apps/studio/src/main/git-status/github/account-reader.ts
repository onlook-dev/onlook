import type { GithubBackend, GithubIdentity, GithubPermission, GithubReadFailure, GithubReads } from '../../github-import/backend.js';
import type { GitHubAccess, GitHubReader, GitHubRepoAccess } from './reader.js';

function permissionFor(permission: GithubPermission | null): GitHubAccess {
  return permission === 'ADMIN' || permission === 'MAINTAIN' || permission === 'WRITE' ? 'granted' : 'denied';
}

/** A 403 is a rate limit, a scope or SAML, so `forbidden` establishes no permission; only 404 and the two organisation blocks demote. */
function denied(failure: GithubReadFailure): GitHubRepoAccess | undefined {
  if (failure.status === 'not_found') return { permission: 'denied', reason: 'repo-not-visible' };
  if (failure.status === 'sso_required' || failure.status === 'approval_required') return { permission: 'denied', reason: failure.status };
  return undefined;
}

async function safely<Result>(read: () => Promise<Result>): Promise<Result | { status: 'unavailable'; reason: 'provider_unavailable' }> {
  try { return await read(); } catch { return { status: 'unavailable', reason: 'provider_unavailable' }; }
}

function accountReader(reads: GithubReads, identity: GoverningIdentity): Selection {
  let failure: GithubReadFailure | undefined = identity.status === 'connected' ? undefined : identity;
  const reader: GitHubReader = {
    present: async () => ({ ok: true, value: true }),
    identity: async () => ({ ok: true, value: { account: identity.status === 'connected' ? identity.account : '' } }),
    async access(repository) {
      if (identity.status !== 'connected') return { ok: true, value: { permission: 'denied', reason: identity.status } };
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
  return { reader, connectViaBrowser: true, via: 'account', failure: () => failure };
}

type GoverningIdentity = Extract<GithubIdentity, { status: 'connected' | 'sso_required' | 'approval_required' }>;

interface Selection {
  reader: GitHubReader;
  connectViaBrowser: boolean;
  /** Which reader the measurement's facts came from. */
  via: 'account' | 'cli';
  failure?: () => GithubReadFailure | undefined;
}

export function hasGithubStatusReads(backend: GithubBackend | undefined): backend is GithubBackend & GithubReads {
  return backend?.identity !== undefined && backend.repositoryAccess !== undefined && backend.pullRequests !== undefined;
}

async function cliSignedIn(fallback: GitHubReader): Promise<boolean> {
  const present = await fallback.present();
  return present.ok && (await fallback.identity()).ok;
}

export async function selectGithubReader(backend: GithubBackend | undefined, fallback: GitHubReader): Promise<Selection> {
  if (!hasGithubStatusReads(backend)) return { reader: fallback, connectViaBrowser: false, via: 'cli' };
  const reads: GithubReads = backend;
  const identity = await safely(() => reads.identity());
  if (identity.status === 'connected') return accountReader(reads, identity);
  // An organisation blocking this connection is not the designer losing the access their own CLI still has.
  const blocked = identity.status === 'sso_required' || identity.status === 'approval_required';
  if (blocked && !(await cliSignedIn(fallback))) return accountReader(reads, identity);
  return { reader: fallback, connectViaBrowser: true, via: 'cli', failure: () => identity };
}
