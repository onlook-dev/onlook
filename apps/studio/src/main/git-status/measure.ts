import type { GitHead, GitMeasuredPullRequest, GitMeasurement, GitOriginKind, GitPrState } from '@studio/events';
import { type Env, userEnv } from '../env/shell-env.js';
import { defaultRemote, git } from '../workspace/git.js';
import { projectHasNoHistory } from '../workspace/store.js';
import { gitAvailable } from '../env/git-available.js';
import { ghReader } from './github/gh-reader.js';
import type { GitHubReader } from './github/reader.js';
import { runGit, USER_GIT_CONFIG } from '../env/git.js';
import { hostSshPath } from '../env/platform.js';
import type { GithubBackend } from '../github-import/backend.js';
import { selectGithubReader } from './github/account-reader.js';

const FETCH_TIMEOUT_MS = 20_000;

/** Appended to the user's own ssh command, never replacing it: `GIT_TERMINAL_PROMPT=0` does not silence ssh's prompts. */
const SSH_BATCH_OPTIONS = '-oBatchMode=yes -oConnectTimeout=10';

/** `GIT_ASKPASS=''` too: a GUI askpass helper obeys neither, and the interval fetch would turn it into a recurring dialog. */
const FETCH_ENV = {
  GIT_PAGER: 'cat',
  GIT_TERMINAL_PROMPT: '0',
  GIT_ASKPASS: '',
} as const;

/** On every read: a SIGKILL mid-`status` otherwise strands `index.lock`, blocking every later status, fetch, and commit. */
const READ_ENV = { GIT_OPTIONAL_LOCKS: '0' } as const;

export async function fetchEnv(worktree: string, user?: Env): Promise<Env> {
  let ssh = (user ?? (await userEnv()))['GIT_SSH_COMMAND'];
  if (!ssh) {
    const configured = await runGit(worktree, ['config', '--global', '--get', 'core.sshCommand'], { config: USER_GIT_CONFIG, timeoutMs: FETCH_TIMEOUT_MS, env: READ_ENV });
    if (configured.ok && configured.out) ssh = configured.out;
  }
  const hostSsh = hostSshPath();
  return { ...FETCH_ENV, GIT_SSH_COMMAND: `${ssh || `"${hostSsh}"`} ${SSH_BATCH_OPTIONS}` };
}

export interface MeasureOptions {
  baseBranch: string;
  fetch: boolean;
}

export interface MeasureDeps {
  reader?: GitHubReader;
  backend?: GithubBackend;
}

export interface MeasureOutcome {
  measurement: GitMeasurement;
  /** `undefined` = no fetch attempted; `false` = attempted and failed; `true` advances `fetchedAt`. */
  fetched: boolean | undefined;
}

interface StatusFacts {
  head: GitHead;
  branch?: string;
  dirty: boolean;
  aheadOfUpstream: boolean;
  hasUpstream: boolean;
}

export function emptyMeasurement(baseBranch: string, gitInstalled: boolean): GitMeasurement {
  return {
    gitInstalled,
    ghInstalled: false,
    ghAuthed: false,
    origin: 'none',
    access: 'unknown',
    head: 'unborn',
    baseBranch,
    baseExists: false,
    ahead: 0,
    behind: 0,
    dirty: false,
    aheadOfUpstream: false,
  };
}

export async function measure(
  worktree: string,
  options: MeasureOptions,
  deps: MeasureDeps = {},
): Promise<MeasureOutcome> {
  if (projectHasNoHistory(worktree)) {
    return { measurement: { ...emptyMeasurement(options.baseBranch, await gitAvailable()), history: 'none' }, fetched: undefined };
  }
  const { measurement, fetched, remote } = await measureGit(worktree, options);
  const selected = measurement.head === 'branch' && measurement.origin === 'github'
    ? await selectGithubReader(deps.backend, deps.reader ?? ghReader(worktree))
    : { reader: deps.reader ?? ghReader(worktree), connectViaBrowser: false, failure: undefined };
  if (selected.connectViaBrowser) measurement.connectViaBrowser = true;
  const m = await probeGithub(measurement, selected.reader);
  const failure = selected.failure?.();
  if (failure !== undefined) m.githubReadFailure = failure;
  const base = m.pr?.baseRefName;
  if (base === undefined || base === m.baseBranch || remote === undefined) return { measurement: m, fetched };
  // `behind` offers Download changes, so it counts against the branch the PR merges into, never the one the project was cut from (ONL-2411).
  const refetched = options.fetch ? await fetchBase(worktree, remote, base) : fetched;
  const compared = await compareToBase(worktree, `${remote}/${base}`);
  // A base a fetch has never landed counts zero of everything, which is not the same as up to date (ONL-2411).
  return { measurement: { ...m, baseBranch: base, ...compared }, fetched: compared.baseExists ? refetched : false };
}

interface GitPass {
  measurement: GitMeasurement;
  fetched: boolean | undefined;
  remote: string | undefined;
}

async function measureGit(worktree: string, options: MeasureOptions): Promise<GitPass> {
  const m = emptyMeasurement(options.baseBranch, true);

  const remote = await defaultRemote(worktree);
  const [fetched, status] = await Promise.all([
    remote !== undefined && options.fetch ? fetchBase(worktree, remote, options.baseBranch) : Promise.resolve(undefined),
    git(worktree, ['status', '--porcelain=v2', '--branch'], { env: READ_ENV }),
  ]);
  if (!status.ok) {
    if (!status.missing) throw new Error(`git status failed: ${status.err}`);
    m.gitInstalled = false;
    return { measurement: m, fetched, remote };
  }
  const { hasUpstream, ...facts } = parseStatus(status.out);
  Object.assign(m, facts);

  if (remote === undefined) return { measurement: m, fetched, remote };

  const [url, compared, pushed] = await Promise.all([
    git(worktree, ['config', '--get', `remote.${remote}.url`], { env: READ_ENV }),
    m.head !== 'unborn' ? compareToBase(worktree, `${remote}/${options.baseBranch}`) : Promise.resolve(undefined),
    !hasUpstream && m.branch
      ? git(worktree, ['rev-list', '--count', `${remote}/${m.branch}..HEAD`], { env: READ_ENV })
      : undefined,
  ]);
  const identity = url.ok ? classifyRemote(url.out) : undefined;
  m.origin = identity?.kind ?? 'other';
  if (identity?.repo) m.repo = identity.repo;

  if (compared !== undefined) {
    Object.assign(m, compared);
    // Studio cuts branches `--no-track`; a push without `-u` still moves the remote-tracking ref.
    if (!hasUpstream) m.aheadOfUpstream = pushed?.ok ? Number(pushed.out) > 0 : m.ahead > 0;
  }
  return { measurement: m, fetched, remote };
}

async function fetchBase(worktree: string, remote: string, baseBranch: string): Promise<boolean> {
  const result = await git(worktree, ['fetch', '--quiet', '--prune', '--', remote, baseBranch], {
    timeoutMs: FETCH_TIMEOUT_MS,
    env: await fetchEnv(worktree),
  });
  return result.ok;
}

function parseStatus(out: string): StatusFacts {
  const facts: StatusFacts = { head: 'branch', dirty: false, aheadOfUpstream: false, hasUpstream: false };
  for (const line of out.split('\n')) {
    if (!line) continue;
    if (!line.startsWith('#')) {
      facts.dirty = true;
      continue;
    }
    const [key, ...rest] = line.slice(2).split(' ');
    const value = rest.join(' ');
    if (key === 'branch.oid' && value === '(initial)') facts.head = 'unborn';
    if (key === 'branch.head') {
      if (value === '(detached)') facts.head = 'detached';
      else facts.branch = value;
    }
    if (key === 'branch.upstream') facts.hasUpstream = true;
    if (key === 'branch.ab') facts.aheadOfUpstream = /\+[1-9]/.test(rest[0] ?? '');
  }
  return facts;
}

const GITHUB_URL = /^(?:https?:\/\/(?:[^@/]+@)?github\.com\/|ssh:\/\/(?:[^@/]+@)?github\.com(?::\d+)?\/|(?:[^@/]+@)?github\.com:)([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i;

export function classifyRemote(url: string): { kind: GitOriginKind; repo?: string } {
  const match = GITHUB_URL.exec(url.trim());
  if (!match) return { kind: 'other' };
  return { kind: 'github', repo: `${match[1]}/${match[2]}` };
}

async function compareToBase(
  worktree: string,
  baseRef: string,
): Promise<Pick<GitMeasurement, 'baseExists' | 'ahead' | 'behind'>> {
  const counts = await git(worktree, ['rev-list', '--left-right', '--count', `${baseRef}...HEAD`], { env: READ_ENV });
  if (!counts.ok) return { baseExists: false, ahead: 0, behind: 0 };
  const [behind = '0', ahead = '0'] = counts.out.split(/\s+/);
  return { baseExists: true, ahead: Number(ahead) || 0, behind: Number(behind) || 0 };
}

export async function probeGithub(facts: GitMeasurement, reader: GitHubReader): Promise<GitMeasurement> {
  const m = { ...facts };
  const branch = m.branch;
  if (m.head !== 'branch' || m.origin !== 'github' || !branch) return m;

  const present = await reader.present();
  if (!present.ok) {
    if (present.partial) {
      m.ghInstalled = true;
      m.partial = true;
    }
    return m;
  }
  m.ghInstalled = true;

  const identity = await reader.identity();
  if (!identity.ok) {
    if (identity.partial) m.partial = true;
    return m;
  }
  m.ghAuthed = true;
  if (identity.value.account) m.ghAccount = identity.value.account;

  const access = await reader.access(m.repo);
  if (!access.ok) {
    m.partial = true;
    return m;
  }
  m.access = access.value.permission;
  if (access.value.reason !== undefined) m.accessReason = access.value.reason;
  if (m.access !== 'granted') return m;

  // A fork's PRs live on the parent, where the bare branch name matches every fork; the origin's owner is the filter.
  const { parent, parentPermission, owner } = access.value;
  const headOwner = owner ?? m.repo?.split('/')[0];
  if (parent !== undefined && headOwner !== undefined) {
    const upstream = await reader.pullRequests(parent, branch, { headOwner, ...(m.ghAccount ? { account: m.ghAccount } : {}) });
    if (!upstream.ok) {
      m.partial = true;
      return m;
    }
    const pr = pickPullRequest(upstream.value, m.baseBranch);
    if (pr) {
      m.pr = parentPermission === 'granted' ? pr : { ...pr, viewerCanMerge: false };
      return m;
    }
  }

  // Parent first: a PR opened against the fork itself lives on the origin and ranks second.
  const own = await reader.pullRequests(m.repo, branch);
  if (!own.ok) {
    m.partial = true;
    return m;
  }
  const pr = pickPullRequest(own.value, m.baseBranch);
  if (pr) m.pr = pr;
  return m;
}

const STATE_RANK: Record<GitPrState, number> = { OPEN: 0, MERGED: 1, CLOSED: 2 };

export function pickPullRequest(list: GitMeasuredPullRequest[], baseBranch: string): GitMeasuredPullRequest | undefined {
  return [...list].sort((a, b) => {
    const rank = (STATE_RANK[a.state] ?? 3) - (STATE_RANK[b.state] ?? 3);
    if (rank !== 0) return rank;
    const base = Number(b.baseRefName === baseBranch) - Number(a.baseRefName === baseBranch);
    if (base !== 0) return base;
    return b.updatedAt.localeCompare(a.updatedAt);
  })[0];
}
