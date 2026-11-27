import type { GitChecksRollup, GitMeasuredPullRequest, GitPrState } from '@studio/events';
import { gh, type GhResult, type GhRunner } from '../gh.js';
import type { GitHubAccess, GitHubReader, GitHubRepoAccess } from './reader.js';

const NOT_LOGGED_IN = /not logged in/i;
const NO_JSON_FLAG = /unknown flag: --json/;
// `as NAME` before gh 2.40, `account NAME` from there on.
const TEXT_LOGGED_IN = /Logged in to github\.com (?:account|as) (\S+)/;
const TEXT_FAILED_LOGIN = /Failed to log in to github\.com/;
const TEXT_ACTIVE = /Active account: true/;
const TEXT_BAD_TOKEN = /The token in .+ is invalid\./;
// 403 is a rate limit, a scope, or SAML — never a permission fact; only 404 and not-found demote.
const NO_REPO_ACCESS = /Could not resolve to a Repository|HTTP 404/;

export function ghReader(cwd: string, runner: GhRunner = gh): GitHubReader {
  return {
    async present() {
      const version = await runner(cwd, ['--version']);
      if (version.missing) return { ok: false, partial: false };
      if (!version.ok) return { ok: false, partial: true };
      return { ok: true, value: true };
    },

    async identity() {
      const auth = await runner(cwd, ['auth', 'status', '--json', 'hosts']);
      if (!auth.ok) {
        if (auth.timedOut) return { ok: false, partial: true };
        if (NOT_LOGGED_IN.test(`${auth.out}\n${auth.err}`)) return { ok: false, partial: false };
        // `--json` arrived in gh 2.81.0; an older gh rejects the flag, and that is not a sign-out (ONL-2316).
        if (NO_JSON_FLAG.test(auth.err)) return identityFromText(await runner(cwd, ['auth', 'status', '--hostname', 'github.com']));
        return { ok: false, partial: true };
      }
      const account = signedInAccount(auth.out);
      if (account === undefined) return { ok: false, partial: hostsUnreachable(auth.out) };
      return { ok: true, value: { account } };
    },

    async access(repo) {
      const view = await runner(cwd, ['repo', 'view', ...(repo ? [repo] : []), '--json', 'viewerPermission,nameWithOwner,isFork,parent']);
      if (!view.ok) {
        if (!view.timedOut && NO_REPO_ACCESS.test(view.err)) return { ok: true, value: { permission: 'denied', reason: 'repo-not-visible' } };
        return { ok: false, partial: true };
      }
      const parsed = parseJson<RawRepoView>(view.out);
      const permission = accessFromPermission(parsed?.viewerPermission);
      const parent = parentSlug(parsed);
      if (permission !== 'granted' || parent === undefined) {
        const reason: NonNullable<GitHubRepoAccess['reason']> = parsed?.viewerPermission === 'READ' || parsed?.viewerPermission === 'TRIAGE' ? 'read-only' : 'unknown';
        return { ok: true, value: { permission, ...(permission === 'denied' ? { reason } : {}) } };
      }

      const parentView = await runner(cwd, ['repo', 'view', parent, '--json', 'viewerPermission']);
      if (!parentView.ok) return { ok: false, partial: true };
      const parentPermission = permissionFrom(parentView);
      const owner = parsed?.nameWithOwner?.split('/')[0];
      const value: GitHubRepoAccess = { permission, parent, parentPermission, ...(owner ? { owner } : {}) };
      return { ok: true, value };
    },

    async pullRequests(repo, head, filter) {
      // `--head owner:branch` returns no rows (gh 2.90); the bare name matches every fork, so the user's rows narrow by `--author` and an org fork takes a deeper page.
      const headOwner = filter?.headOwner;
      const author = filter?.account !== undefined && headOwner !== undefined && sameLogin(headOwner, filter.account) ? filter.account : undefined;
      const list = await runner(cwd, [
        'pr',
        'list',
        ...repoArgs(repo),
        '--head',
        head,
        '--state',
        'all',
        ...(author === undefined ? [] : ['--author', author]),
        '--limit',
        author === undefined ? '200' : '50',
        '--json',
        'number,url,state,isDraft,mergeStateStatus,statusCheckRollup,baseRefName,updatedAt,headRepositoryOwner',
      ]);
      if (!list.ok) return { ok: false, partial: true };
      const raw = parseJson<unknown>(list.out);
      const rows = Array.isArray(raw) ? (raw as RawPullRequest[]) : [];
      const kept = headOwner === undefined ? rows : rows.filter((row) => sameLogin(row.headRepositoryOwner?.login, headOwner));
      return { ok: true, value: kept.map(normalisePullRequest) };
    },
  };
}

function repoArgs(repo: string | undefined): string[] {
  return repo ? ['-R', repo] : [];
}

function sameLogin(a: string | undefined, b: string): boolean {
  return a !== undefined && a.toLowerCase() === b.toLowerCase();
}

interface AuthHost {
  state?: string;
  login?: string;
  active?: boolean;
  error?: string;
}

const CREDENTIAL_ERROR = /token|401|bad credentials|not logged in/i;

/** `gh auth status` exits 0 offline with the host in `state: 'error'`; that is a sign-out only when the error names the credential. */
function hostsUnreachable(json: string): boolean {
  const parsed = parseJson<{ hosts?: Record<string, AuthHost[]> }>(json);
  const hosts = parsed?.hosts?.['github.com'] ?? [];
  return hosts.length > 0 && hosts.every((h) => h.state !== 'success' && !CREDENTIAL_ERROR.test(h.error ?? ''));
}

type Identity = Awaited<ReturnType<GitHubReader['identity']>>;

function identityFromText(status: GhResult): Identity {
  if (status.timedOut) return { ok: false, partial: true };
  // gh moves the whole report to stderr once any account on the host fails; a healthy sign-in can be on either stream.
  const report = `${status.out}\n${status.err}`;
  const account = signedInAccountText(report);
  if (account !== undefined) return { ok: true, value: { account } };
  if (NOT_LOGGED_IN.test(report) || TEXT_BAD_TOKEN.test(report)) return { ok: false, partial: false };
  return { ok: false, partial: true };
}

export function signedInAccountText(text: string): string | undefined {
  let first: string | undefined;
  let current: string | undefined;
  for (const line of text.split('\n')) {
    if (TEXT_FAILED_LOGIN.test(line)) {
      current = undefined;
      continue;
    }
    const login = TEXT_LOGGED_IN.exec(line)?.[1];
    if (login !== undefined) {
      current = login;
      first ??= login;
      continue;
    }
    if (current !== undefined && TEXT_ACTIVE.test(line)) return current;
  }
  return first;
}

export function signedInAccount(json: string): string | undefined {
  const parsed = parseJson<{ hosts?: Record<string, AuthHost[]> }>(json);
  const hosts = parsed?.hosts?.['github.com'] ?? [];
  const active = hosts.find((h) => h.state === 'success' && h.active) ?? hosts.find((h) => h.state === 'success');
  if (!active) return undefined;
  return active.login ?? '';
}

export interface RawRepoView {
  viewerPermission?: string;
  nameWithOwner?: string;
  isFork?: boolean;
  /** gh never emits a `nameWithOwner` on the parent; `null` on a non-fork. */
  parent?: { id?: string; name?: string; owner?: { id?: string; login?: string } } | null;
}

export function accessFromPermission(permission: string | undefined): GitHubAccess {
  return permission === 'WRITE' || permission === 'MAINTAIN' || permission === 'ADMIN' ? 'granted' : 'denied';
}

function permissionFrom(result: GhResult): GitHubAccess {
  return accessFromPermission(parseJson<RawRepoView>(result.out)?.viewerPermission);
}

function parentSlug(view: RawRepoView | undefined): string | undefined {
  const parent = view?.parent;
  if (!parent?.name || !parent.owner?.login) return undefined;
  return `${parent.owner.login}/${parent.name}`;
}

export type RollupItem =
  | { __typename: 'CheckRun'; status?: string; conclusion?: string | null }
  | { __typename: 'StatusContext'; state?: string }
  | { __typename?: string };

const FAILING_CONCLUSIONS = new Set(['FAILURE', 'TIMED_OUT', 'CANCELLED', 'ACTION_REQUIRED', 'STARTUP_FAILURE']);

export function reduceChecks(rollup: RollupItem[] | null | undefined): GitChecksRollup {
  if (!rollup || rollup.length === 0) return 'none';
  let pending = false;
  for (const item of rollup) {
    if (item.__typename === 'CheckRun') {
      const check = item as { status?: string; conclusion?: string | null };
      if (check.conclusion && FAILING_CONCLUSIONS.has(check.conclusion)) return 'failing';
      if (check.status !== 'COMPLETED') pending = true;
    } else if (item.__typename === 'StatusContext') {
      const state = (item as { state?: string }).state;
      if (state === 'ERROR' || state === 'FAILURE') return 'failing';
      if (state === 'PENDING' || state === 'EXPECTED') pending = true;
    }
  }
  return pending ? 'pending' : 'passing';
}

export interface RawPullRequest {
  number: number;
  url: string;
  state: GitPrState;
  isDraft: boolean;
  mergeStateStatus: string;
  statusCheckRollup?: RollupItem[] | null;
  baseRefName: string;
  updatedAt: string;
  headRepositoryOwner?: { login?: string } | null;
}

function normalisePullRequest(raw: RawPullRequest): GitMeasuredPullRequest {
  return {
    number: raw.number,
    url: raw.url,
    state: raw.state,
    isDraft: raw.isDraft,
    mergeStateStatus: raw.mergeStateStatus,
    checks: reduceChecks(raw.statusCheckRollup),
    baseRefName: raw.baseRefName,
    updatedAt: raw.updatedAt,
  };
}

function parseJson<T>(text: string): T | undefined {
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}
