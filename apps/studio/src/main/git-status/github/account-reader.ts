import type { GitChecksRollup, GitMeasuredPullRequest, GitPrState } from '@studio/events';
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

const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const PR_STATES: readonly GitPrState[] = ['OPEN', 'CLOSED', 'MERGED'];
const PR_CHECKS: readonly GitChecksRollup[] = ['failing', 'pending', 'passing', 'none'];

function bounded(value: unknown, limit: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= limit;
}

function measuredPullRequest(row: GitMeasuredPullRequest, repository: string): GitMeasuredPullRequest | undefined {
  if (row === null || typeof row !== 'object' || !REPOSITORY.test(repository)) return undefined;
  if (!Number.isSafeInteger(row.number) || row.number <= 0) return undefined;
  // The renderer opens this address, and the repository is known here, so nothing else counts as this pull request.
  if (typeof row.url !== 'string' || row.url.toLowerCase() !== `https://github.com/${repository}/pull/${row.number}`.toLowerCase()) return undefined;
  if (!PR_STATES.includes(row.state) || !PR_CHECKS.includes(row.checks)) return undefined;
  if (!bounded(row.mergeStateStatus, 64) || !bounded(row.baseRefName, 255) || !bounded(row.updatedAt, 64)) return undefined;
  return {
    number: row.number,
    url: row.url,
    state: row.state,
    isDraft: row.isDraft === true,
    mergeStateStatus: row.mergeStateStatus,
    checks: row.checks,
    baseRefName: row.baseRefName,
    updatedAt: row.updatedAt,
    ...(typeof row.viewerCanMerge === 'boolean' ? { viewerCanMerge: row.viewerCanMerge } : {}),
  };
}

const PROVIDER_UNAVAILABLE = { status: 'unavailable', reason: 'provider_unavailable' } as const;

/** A tenth of the measurement deadline: one measurement makes up to four of these reads in order, so even four hung reads publish well inside it. */
export const PROVIDER_READ_DEADLINE_MS = 18_000;

async function safely<Result>(read: () => Promise<Result>, boundMs: number): Promise<Result | typeof PROVIDER_UNAVAILABLE> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const answered = (async () => {
    try { return await read(); } catch { return PROVIDER_UNAVAILABLE; }
  })();
  const bound = new Promise<typeof PROVIDER_UNAVAILABLE>((resolve) => {
    timer = setTimeout(() => resolve(PROVIDER_UNAVAILABLE), boundMs);
  });
  try {
    return await Promise.race([answered, bound]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function accountReader(reads: GithubReads, identity: GoverningIdentity, boundMs: number): Selection {
  let failure: GithubReadFailure | undefined = identity.status === 'connected' ? undefined : identity;
  const reader: GitHubReader = {
    present: async () => ({ ok: true, value: true }),
    identity: async () => ({ ok: true, value: identity.status === 'connected' ? { account: identity.account } : {} }),
    async access(repository) {
      if (identity.status !== 'connected') return { ok: true, value: { permission: 'denied', reason: identity.status } };
      if (repository === undefined) return { ok: false, partial: true };
      const result = await safely(() => reads.repositoryAccess(repository), boundMs);
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
      const result = await safely(() => reads.pullRequests(repository, branch, filter?.headOwner), boundMs);
      if (result.status !== 'connected') {
        failure = result;
        return { ok: false, partial: true };
      }
      const rows = Array.isArray(result.pullRequests) ? result.pullRequests : [];
      return { ok: true, value: rows.map((row) => measuredPullRequest(row, repository)).filter((row) => row !== undefined) };
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

export function readGithubIdentity(backend: GithubBackend & GithubReads, boundMs: number = PROVIDER_READ_DEADLINE_MS): Promise<GithubIdentity> {
  return safely(() => backend.identity(), boundMs);
}

async function cliSignedIn(fallback: GitHubReader): Promise<boolean> {
  const present = await fallback.present();
  return present.ok && (await fallback.identity()).ok;
}

export async function selectGithubReader(
  backend: GithubBackend | undefined,
  fallback: GitHubReader,
  boundMs: number = PROVIDER_READ_DEADLINE_MS,
): Promise<Selection> {
  if (!hasGithubStatusReads(backend)) return { reader: fallback, connectViaBrowser: false, via: 'cli' };
  const reads: GithubReads = backend;
  const identity = await safely(() => reads.identity(), boundMs);
  if (identity.status === 'connected') return accountReader(reads, identity, boundMs);
  // An organisation blocking this connection is not the designer losing the access their own CLI still has.
  const blocked = identity.status === 'sso_required' || identity.status === 'approval_required';
  if (blocked && !(await cliSignedIn(fallback))) return accountReader(reads, identity, boundMs);
  return { reader: fallback, connectViaBrowser: true, via: 'cli', failure: () => identity };
}
