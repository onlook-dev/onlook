import { statSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { cleanupTempFixtures, gitOutput as sh, makeGitRepo, outcome } from '@studio/fixtures';
import type { GitMeasuredPullRequest, GitMeasurement } from '@studio/events';
import { gh } from './gh.js';
import { forkView, MISSING, ok, rawPr, scriptedGh, scriptedReader } from './github/test-support.js';
import { classifyRemote, emptyMeasurement, fetchEnv, measure, pickPullRequest, probeGithub } from './measure.js';
import { PROVIDER_READ_DEADLINE_MS } from './github/account-reader.js';
import { MEASURE_DEADLINE_MS } from './index.js';
import { GITHUB_READ_FAILURES, githubBackendFixture } from '../github-import/backend-fixtures.js';
import type { GithubIdentity } from '../github-import/backend.js';

for (const status of ['disconnected', 'reconnect'] as const) {
  for (const method of ['repositoryAccess', 'pullRequests'] as const) {
    it(`clears authenticated facts when ${method} reports ${status} after identity succeeded`, async () => {
      const failure = status === 'disconnected' ? { status } : { status, reason: 'revoked' as const };
      const backend = githubBackendFixture('connected', { [method]: failure });
      const { measurement } = await measure(shared.repo, { baseBranch: 'main', fetch: false }, { backend });
      expect(measurement.connectViaBrowser).toBe(true);
      expect(measurement.githubReadFailure).toEqual(failure);
      expect(measurement.ghAuthed).toBe(false);
      expect(measurement.ghAccount).toBeUndefined();
      expect(measurement.pr).toBeUndefined();
      expect(measurement.partial).toBeUndefined();
    });
  }
}

const SILENT_IDENTITY = GITHUB_READ_FAILURES.filter(
  (failure) => failure.status !== 'disconnected' && failure.status !== 'reconnect'
    && failure.status !== 'sso_required' && failure.status !== 'approval_required',
);
const SIGNED_OUT_GH = { auth: ok(JSON.stringify({ hosts: { 'github.com': [] } })) };

describe('an identity read that does not establish the account connection', () => {
  const measured = (identity: GithubIdentity, script = {}) => {
    const { reader, calls } = scriptedGh(script);
    const backend = githubBackendFixture('connected', { identity });
    return measure(shared.repo, { baseBranch: 'main', fetch: false }, { reader, backend }).then((outcome) => ({ ...outcome, calls }));
  };

  for (const failure of [...SILENT_IDENTITY, { status: 'reconnect', reason: 'revoked' } as const, { status: 'disconnected' } as const]) {
    it(`leaves a signed-in gh user measured by gh after ${JSON.stringify(failure)}`, async () => {
      const { measurement: m, calls } = await measured(failure);
      expect(m.ghAuthed).toBe(true);
      expect(m.ghAccount).toBe('wrenquill');
      expect(m.access).toBe('granted');
      expect(m.partial).toBeUndefined();
      expect(m.githubReadFailure).toEqual(failure);
      expect(m.connectViaBrowser).toBe(true);
      expect(calls.map((call) => call[0])).toEqual(['--version', 'auth', 'repo', 'pr']);
    });
  }

  for (const failure of SILENT_IDENTITY) {
    it(`keeps the measurement incomplete when neither the account connection nor gh answers ${JSON.stringify(failure)}`, async () => {
      const { measurement: m } = await measured(failure, SIGNED_OUT_GH);
      expect(m.partial).toBe(true);
      expect(m.ghAuthed).toBe(false);
      expect(m.ghAccount).toBeUndefined();
      expect(m.access).toBe('unknown');
      expect(m.githubReadFailure).toEqual(failure);
    });
  }

  it('a signed-out account connection asks for the browser connection without an incomplete read', async () => {
    const { measurement: m } = await measured({ status: 'disconnected' }, SIGNED_OUT_GH);
    expect(m.partial).toBeUndefined();
    expect(m.ghAuthed).toBe(false);
    expect(m.connectViaBrowser).toBe(true);
  });

  for (const status of ['sso_required', 'approval_required'] as const) {
    it(`reports no access with its reason when gh has no signed-in user and the connection answers ${status}`, async () => {
      const { measurement: m } = await measured({ status }, SIGNED_OUT_GH);
      expect(m.access).toBe('denied');
      expect(m.accessReason).toBe(status);
      expect(m.ghAccount).toBeUndefined();
      expect(m.githubReadFailure).toEqual({ status });
    });

    it(`leaves a signed-in gh user where gh puts them when the connection answers ${status}`, async () => {
      const { measurement: m } = await measured({ status });
      expect(m.access).toBe('granted');
      expect(m.accessReason).toBeUndefined();
      expect(m.ghAccount).toBe('wrenquill');
      expect(m.githubReadFailure).toEqual({ status });
    });
  }
});

describe('a provider read that never answers', () => {
  const hang = () => new Promise<never>(() => undefined);
  const hangingBackend = (read: 'identity' | 'repositoryAccess') => {
    const backend = githubBackendFixture('connected');
    if (read === 'identity') backend.identity = hang;
    else backend.repositoryAccess = hang;
    return backend;
  };
  const bounded = (backend: ReturnType<typeof githubBackendFixture>) =>
    measure(shared.repo, { baseBranch: 'main', fetch: false }, { backend, reader: scriptedGh({}).reader, providerReadMs: 20 });

  it('degrades the identity read to unavailable, and gh measures instead', async () => {
    const { measurement: m } = await bounded(hangingBackend('identity'));
    expect(m.githubReadFailure).toEqual({ status: 'unavailable', reason: 'provider_unavailable' });
    expect(m.ghAccount).toBe('wrenquill');
    expect(m.access).toBe('granted');
  });

  it('leaves access unknown and the measurement incomplete when the repository read hangs', async () => {
    const { measurement: m } = await bounded(hangingBackend('repositoryAccess'));
    expect(m.access).toBe('unknown');
    expect(m.partial).toBe(true);
    expect(m.githubReadFailure).toEqual({ status: 'unavailable', reason: 'provider_unavailable' });
  });

  it('keeps every read a measurement makes well inside the measurement deadline', () => {
    expect(PROVIDER_READ_DEADLINE_MS * 4).toBeLessThan(MEASURE_DEADLINE_MS / 2);
  });

  it('answers inside the bound without waiting for it', async () => {
    const started = Date.now();
    const { measurement: m } = await measure(shared.repo, { baseBranch: 'main', fetch: false }, {
      backend: githubBackendFixture('connected'), reader: scriptedGh({}).reader, providerReadMs: 30_000,
    });
    expect(Date.now() - started).toBeLessThan(5_000);
    expect(m.access).toBe('granted');
  });
});

it('a forbidden repository answer leaves access unknown instead of denying it', async () => {
  const backend = githubBackendFixture('connected', { repositoryAccess: { status: 'forbidden' } });
  const { measurement: m } = await measure(shared.repo, { baseBranch: 'main', fetch: false }, { backend, reader: scriptedGh({}).reader });
  expect(m.access).toBe('unknown');
  expect(m.accessReason).toBeUndefined();
  expect(m.partial).toBe(true);
  expect(m.pr).toBeUndefined();
  expect(m.githubReadFailure).toEqual({ status: 'forbidden' });
});

const GITHUB_URL = 'https://github.com/onlook-dev/fixture.git';

let shared: { root: string; repo: string; origin: string };

beforeAll(async () => {
  const { root, origin, path } = makeGitRepo({ name: 'measure' });
  sh(path, ['config', 'remote.origin.url', GITHUB_URL]);
  sh(path, ['config', `url.${origin}.insteadOf`, GITHUB_URL]);
  shared = { root, origin, repo: path };
});

afterAll(() => {
  cleanupTempFixtures();
});

afterEach(() => {
  delete process.env.STUDIO_GH_BIN;
});

function worktree(name: string, args: string[] = ['--detach']): string {
  const path = join(shared.root, name);
  sh(shared.repo, ['worktree', 'add', '-q', ...args, path, 'origin/main']);
  return path;
}

function branch(name: string): string {
  return worktree(name.replace('/', '-'), ['--no-track', '-b', name]);
}

function clone(name: string, args: string[] = []): string {
  const path = join(shared.root, name);
  sh(shared.root, ['clone', '-q', '--branch', 'main', ...args, shared.origin, path]);
  return path;
}

function onGithub(overrides: Partial<GitMeasurement> = {}): GitMeasurement {
  return { ...emptyMeasurement('main', true), origin: 'github', repo: 'onlook-dev/fixture', head: 'branch', branch: 'feat/x', baseExists: true, ...overrides };
}

const PARTIAL = { ok: false, partial: true } as const;

function measuredPr(overrides: Partial<GitMeasuredPullRequest>): GitMeasuredPullRequest {
  return {
    number: 1,
    url: 'https://github.com/onlook-dev/fixture/pull/1',
    state: 'OPEN',
    isDraft: false,
    mergeStateStatus: 'CLEAN',
    checks: 'none',
    baseRefName: 'main',
    updatedAt: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}

describe('classifyRemote', () => {
  it('reads owner/name from every GitHub remote form', () => {
    for (const url of [
      'https://github.com/onlook-dev/fixture.git',
      'https://wrenquill@github.com/onlook-dev/fixture',
      'git@github.com:onlook-dev/fixture.git',
      'ssh://git@github.com/onlook-dev/fixture.git',
      'ssh://git@github.com:22/onlook-dev/fixture',
    ]) {
      expect(classifyRemote(url), url).toEqual({ kind: 'github', repo: 'onlook-dev/fixture' });
    }
  });
  it('anything else is another host', () => {
    expect(classifyRemote('git@gitlab.com:onlook-dev/fixture.git')).toEqual({ kind: 'other' });
    expect(classifyRemote('https://github.com.evil.example/onlook-dev/fixture')).toEqual({ kind: 'other' });
  });
});

describe('git facts', () => {
  it('clean checkout with a github-shaped remote: fetch lands on the bare repo', async () => {
    const { reader, calls } = scriptedGh({});
    const { measurement: m, fetched } = await measure(shared.repo, { baseBranch: 'main', fetch: true }, { reader });
    expect(fetched).toBe(true);
    expect(m.origin).toBe('github');
    expect(m.repo).toBe('onlook-dev/fixture');
    expect(m.head).toBe('branch');
    expect(m.branch).toBe('main');
    expect(m.baseExists).toBe(true);
    expect(m.ahead).toBe(0);
    expect(m.behind).toBe(0);
    expect(m.dirty).toBe(false);
    expect(m.aheadOfUpstream).toBe(false);
    expect(m.ghInstalled).toBe(true);
    expect(m.ghAuthed).toBe(true);
    expect(m.ghAccount).toBe('wrenquill');
    expect(m.access).toBe('granted');
    expect(m.pr).toBeUndefined();
    expect(m.partial).toBeUndefined();
    expect(calls.map((c) => c[0])).toEqual(['--version', 'auth', 'repo', 'pr']);
  });

  it('dirty tree', async () => {
    const repo = branch('feat/dirty');
    writeFileSync(join(repo, 'index.js'), '// edited\n');
    const { measurement: m } = await measure(repo, { baseBranch: 'main', fetch: false }, scriptedGh({}));
    expect(m.dirty).toBe(true);
  });

  it('ahead of base and of upstream on a feature branch', async () => {
    const repo = branch('feat/x');
    sh(repo, ['push', '-q', '-u', 'origin', 'feat/x']);
    sh(repo, ['commit', '-q', '--allow-empty', '-m', 'one']);
    sh(repo, ['commit', '-q', '--allow-empty', '-m', 'two']);
    const { measurement: m } = await measure(repo, { baseBranch: 'main', fetch: false }, scriptedGh({}));
    expect(m.branch).toBe('feat/x');
    expect(m.ahead).toBe(2);
    expect(m.behind).toBe(0);
    expect(m.aheadOfUpstream).toBe(true);
  });

  it('a --no-track branch with commits reads as ahead of upstream (Studio cuts branches untracked)', async () => {
    const repo = branch('feat/z');
    const before = await measure(repo, { baseBranch: 'main', fetch: false }, scriptedGh({}));
    expect(before.measurement.aheadOfUpstream).toBe(false);
    sh(repo, ['commit', '-q', '--allow-empty', '-m', 'one']);
    const { measurement: m } = await measure(repo, { baseBranch: 'main', fetch: false }, scriptedGh({}));
    expect(m.ahead).toBe(1);
    expect(m.aheadOfUpstream).toBe(true);
  });

  it('a --no-track branch pushed without -u reads as pushed', async () => {
    const repo = branch('feat/p');
    sh(repo, ['commit', '-q', '--allow-empty', '-m', 'one']);
    sh(repo, ['push', '-q', 'origin', 'HEAD']);
    const { measurement: m } = await measure(repo, { baseBranch: 'main', fetch: false }, scriptedGh({}));
    expect(m.ahead).toBe(1);
    expect(m.aheadOfUpstream).toBe(false);
    sh(repo, ['commit', '-q', '--allow-empty', '-m', 'two']);
    const after = await measure(repo, { baseBranch: 'main', fetch: false }, scriptedGh({}));
    expect(after.measurement.aheadOfUpstream).toBe(true);
  });

  it('a git status failure is a failed measurement, never a confident Local Only', async () => {
    expect(await outcome(measure(shared.root, { baseBranch: 'main', fetch: false }, scriptedGh({})))).toThrow('git status failed');
  });

  it('behind base after the remote moves', async () => {
    sh(shared.repo, ['push', '-q', 'origin', 'HEAD:refs/heads/base-moves']);
    const collaborator = clone('collaborator');
    sh(collaborator, ['-c', 'user.email=f@example.com', '-c', 'user.name=F', 'commit', '-q', '--allow-empty', '-m', 'moved']);
    sh(collaborator, ['push', '-q', 'origin', 'HEAD:base-moves']);
    const repo = branch('feat/y');
    const { measurement: m, fetched } = await measure(repo, { baseBranch: 'base-moves', fetch: true }, scriptedGh({}));
    expect(fetched).toBe(true);
    expect(m.behind).toBe(1);
    expect(m.ahead).toBe(0);
  });

  it('a PR aimed elsewhere is counted against its own base, not the recorded one (ONL-2411)', async () => {
    sh(shared.repo, ['push', '-q', 'origin', 'HEAD:refs/heads/recorded-base']);
    const collaborator = clone('recorded-base-moves');
    sh(collaborator, ['-c', 'user.email=f@example.com', '-c', 'user.name=F', 'commit', '-q', '--allow-empty', '-m', 'moved']);
    sh(collaborator, ['push', '-q', 'origin', 'HEAD:recorded-base']);
    const repo = branch('feat/pr-elsewhere');
    const { reader } = scriptedGh({ prs: ok(JSON.stringify([rawPr({ number: 883, baseRefName: 'main' })])) });
    const { measurement: m, fetched } = await measure(repo, { baseBranch: 'recorded-base', fetch: true }, { reader });
    expect(fetched).toBe(true);
    expect(m.pr?.number).toBe(883);
    expect(m.behind).toBe(0);
    expect(m.ahead).toBe(0);
    expect(m.baseBranch).toBe('main');
    expect(m.baseExists).toBe(true);
  });

  it('a PR aimed at the recorded base leaves the recorded-base counts alone', async () => {
    const repo = branch('feat/pr-agrees');
    sh(repo, ['commit', '-q', '--allow-empty', '-m', 'one']);
    const { reader } = scriptedGh({ prs: ok(JSON.stringify([rawPr({ number: 7, baseRefName: 'main' })])) });
    const { measurement: m, fetched } = await measure(repo, { baseBranch: 'main', fetch: true }, { reader });
    expect(fetched).toBe(true);
    expect(m.pr?.number).toBe(7);
    expect(m.baseBranch).toBe('main');
    expect(m.ahead).toBe(1);
    expect(m.behind).toBe(0);
  });

  it("a PR base no fetch has landed is stale, never a confident zero (ONL-2411)", async () => {
    const repo = branch('feat/pr-unfetched');
    const { reader } = scriptedGh({ prs: ok(JSON.stringify([rawPr({ number: 12, baseRefName: 'never-fetched' })])) });
    const { measurement: m, fetched } = await measure(repo, { baseBranch: 'main', fetch: false }, { reader });
    expect(m.pr?.number).toBe(12);
    expect(m.baseBranch).toBe('never-fetched');
    expect(m.baseExists).toBe(false);
    expect(m.behind).toBe(0);
    // `false`, not `undefined`: the row the host writes has to read stale (index.ts).
    expect(fetched).toBe(false);
  });

  it('a dash-leading PR base stays a ref on both the fetch and the count', async () => {
    const repo = branch('feat/pr-dashed');
    const { reader } = scriptedGh({ prs: ok(JSON.stringify([rawPr({ number: 13, baseRefName: '--dry-run' })])) });
    const { measurement: m, fetched } = await measure(repo, { baseBranch: 'main', fetch: true }, { reader });
    expect(m.pr?.number).toBe(13);
    expect(m.baseExists).toBe(false);
    expect(m.behind).toBe(0);
    expect(fetched).toBe(false);
  });

  it('no remote: Local Only from git alone, gh never spawned', async () => {
    const path = clone('no-remote');
    sh(path, ['remote', 'remove', 'origin']);
    const { reader, calls } = scriptedGh({});
    const { measurement: m, fetched } = await measure(path, { baseBranch: 'main', fetch: true }, { reader });
    expect(fetched).toBeUndefined();
    expect(m.origin).toBe('none');
    expect(m.baseExists).toBe(false);
    expect(m.head).toBe('branch');
    expect(calls).toEqual([]);
  });

  it('sole remote named upstream with a github URL classifies as github', async () => {
    const path = clone('upstream-remote', ['--origin', 'upstream']);
    sh(path, ['config', 'remote.upstream.url', GITHUB_URL]);
    sh(path, ['config', `url.${shared.origin}.insteadOf`, GITHUB_URL]);
    const { reader, calls } = scriptedGh({});
    const { measurement: m } = await measure(path, { baseBranch: 'main', fetch: true }, { reader });
    expect(m.origin).toBe('github');
    expect(m.repo).toBe('onlook-dev/fixture');
    expect(m.baseExists).toBe(true);
    expect(calls.length).toBe(4);
  });

  it('non-github remote: origin other, gh never spawned', async () => {
    const path = clone('other-remote');
    const { reader, calls } = scriptedGh({});
    const { measurement: m } = await measure(path, { baseBranch: 'main', fetch: false }, { reader });
    expect(m.origin).toBe('other');
    expect(m.repo).toBeUndefined();
    expect(m.baseExists).toBe(true);
    expect(calls).toEqual([]);
  });

  it('detached HEAD short-circuits before gh', async () => {
    const repo = worktree('detached');
    const { reader, calls } = scriptedGh({});
    const { measurement: m } = await measure(repo, { baseBranch: 'main', fetch: false }, { reader });
    expect(m.head).toBe('detached');
    expect(m.branch).toBeUndefined();
    expect(m.baseExists).toBe(true);
    expect(calls).toEqual([]);
  });

  it('unborn HEAD short-circuits before gh', async () => {
    const repo = worktree('unborn');
    sh(repo, ['checkout', '-q', '--orphan', 'fresh']);
    const { reader, calls } = scriptedGh({});
    const { measurement: m } = await measure(repo, { baseBranch: 'main', fetch: false }, { reader });
    expect(m.head).toBe('unborn');
    expect(m.baseExists).toBe(false);
    expect(calls).toEqual([]);
  });

  it('deleted base: baseExists false, fetch fails, nothing throws', async () => {
    const { measurement: m, fetched } = await measure(shared.repo, { baseBranch: 'develop', fetch: true }, scriptedGh({}));
    expect(fetched).toBe(false);
    expect(m.baseExists).toBe(false);
    expect(m.ahead).toBe(0);
    expect(m.behind).toBe(0);
    expect(m.origin).toBe('github');
    expect(m.ghAuthed).toBe(true);
  });
});

describe('fetch', () => {
  it('an unreachable remote returns without a prompt, git facts still measured', async () => {
    const path = clone('unreachable');
    sh(path, ['config', 'remote.origin.url', 'http://127.0.0.1:9/nowhere.git']);
    const started = Date.now();
    const { measurement: m, fetched } = await measure(path, { baseBranch: 'main', fetch: true }, scriptedGh({}));
    expect(Date.now() - started).toBeLessThan(15_000);
    expect(fetched).toBe(false);
    expect(m.origin).toBe('other');
    expect(m.head).toBe('branch');
    expect(m.baseExists).toBe(true);
  }, 20_000);

  it('a dash-leading base branch is a ref, never an option: --dry-run fails as a missing ref instead of dry-running the fetch', async () => {
    const { measurement: m, fetched } = await measure(shared.repo, { baseBranch: '--dry-run', fetch: true }, scriptedGh({}));
    expect(fetched).toBe(false);
    expect(m.baseExists).toBe(false);
    expect(m.head).toBe('branch');
  });

  it('runs prompt-free over git, ssh, and GUI askpass helpers', async () => {
    const env = await fetchEnv(shared.repo, {});
    expect(env.GIT_TERMINAL_PROMPT).toBe('0');
    expect(env.GIT_ASKPASS).toBe('');
    expect(env.GIT_SSH_COMMAND).toBe('"/usr/bin/ssh" -oBatchMode=yes -oConnectTimeout=10');
  });

  it('security ignores repository SSH commands and retains the explicit user environment', async () => {
    const repo = join(shared.root, 'ssh-user');
    sh(shared.root, ['init', '-q', repo]);
    sh(repo, ['config', 'core.sshCommand', 'ssh -i /fixture/config-key']);
    expect((await fetchEnv(repo, {})).GIT_SSH_COMMAND).toBe('"/usr/bin/ssh" -oBatchMode=yes -oConnectTimeout=10');
    const fromEnv = await fetchEnv(repo, { GIT_SSH_COMMAND: 'ssh -i /fixture/env-key' });
    expect(fromEnv.GIT_SSH_COMMAND).toBe('ssh -i /fixture/env-key -oBatchMode=yes -oConnectTimeout=10');
    expect(fromEnv.GIT_TERMINAL_PROMPT).toBe('0');
  });

  it('the read path takes no index lock: a status that would refresh the index leaves it untouched', async () => {
    const repo = branch('feat/locks');
    const index = sh(repo, ['rev-parse', '--path-format=absolute', '--git-path', 'index']);
    const INDEX_T = 1_000_000;
    const stale = (): void => {
      utimesSync(join(repo, 'index.js'), 2_000_000, 2_000_000);
      utimesSync(index, INDEX_T, INDEX_T);
    };
    stale();
    await measure(repo, { baseBranch: 'main', fetch: false }, scriptedGh({}));
    expect(statSync(index).mtimeMs).toBe(INDEX_T * 1000);
    // Positive control: the same status with locks allowed rewrites the index.
    stale();
    sh(repo, ['status', '--porcelain=v2', '--branch']);
    expect(statSync(index).mtimeMs).not.toBe(INDEX_T * 1000);
  });
});

describe('gh runner', () => {
  it('STUDIO_GH_BIN at a missing path reports ENOENT distinctly', async () => {
    process.env.STUDIO_GH_BIN = '/nonexistent/gh';
    const result = await gh(process.cwd(), ['--version']);
    expect(result.ok).toBe(false);
    expect(result.missing).toBe(true);
    expect(result.timedOut).toBe(false);
  });
});

describe('gh trust rungs', () => {
  it('a missing gh ends the probe: ghInstalled false, nothing further spawned', async () => {
    const { reader, calls } = scriptedGh({ version: MISSING });
    const m = await probeGithub(onGithub(), reader);
    expect(m.ghInstalled).toBe(false);
    expect(m.ghAuthed).toBe(false);
    expect(m.partial).toBeUndefined();
    expect(calls.length).toBe(1);
  });

  it('preserves a measured denial reason without copying account names into the reason', async () => {
    for (const reason of ['repo-not-visible', 'read-only'] as const) {
      const { reader } = scriptedReader({ access: async () => ({ ok: true, value: { permission: 'denied', reason } }) });
      const measured = await probeGithub(onGithub(), reader);
      expect(measured.accessReason).toBe(reason);
      expect(measured.access).toBe('denied');
    }
  });

  it('a reader answering denied is no access, pull requests never asked', async () => {
    const { reader, asked } = scriptedReader({ access: async () => ({ ok: true, value: { permission: 'denied' } }) });
    const m = await probeGithub(onGithub(), reader);
    expect(m.ghInstalled).toBe(true);
    expect(m.ghAuthed).toBe(true);
    expect(m.access).toBe('denied');
    expect(m.pr).toBeUndefined();
    expect(m.partial).toBeUndefined();
    expect(asked).toEqual(['present', 'identity', 'access']);
  });

  it('a reader with no identity is connect-github', async () => {
    const { reader, asked } = scriptedReader({ identity: async () => ({ ok: false, partial: false }) });
    const m = await probeGithub(onGithub(), reader);
    expect(m.ghInstalled).toBe(true);
    expect(m.ghAuthed).toBe(false);
    expect(m.access).toBe('unknown');
    expect(m.partial).toBeUndefined();
    expect(asked).toEqual(['present', 'identity']);
  });

  it('a reader with an open PR lands it via pickPullRequest', async () => {
    const { reader, asked } = scriptedReader({
      pullRequests: async () => ({
        ok: true,
        value: [measuredPr({ number: 9, state: 'MERGED' }), measuredPr({ number: 8, checks: 'failing' })],
      }),
    });
    const m = await probeGithub(onGithub(), reader);
    expect(m.access).toBe('granted');
    expect(m.pr?.number).toBe(8);
    expect(m.pr?.checks).toBe('failing');
    expect(asked).toEqual(['present', 'identity', 'access', 'pullRequests']);
  });

  it('a reader answering partial keeps the rungs already climbed', async () => {
    const present = await probeGithub(onGithub(), scriptedReader({ present: async () => PARTIAL }).reader);
    expect(present.ghInstalled).toBe(true);
    expect(present.ghAuthed).toBe(false);
    expect(present.partial).toBe(true);

    const identity = await probeGithub(onGithub(), scriptedReader({ identity: async () => PARTIAL }).reader);
    expect(identity.ghAuthed).toBe(false);
    expect(identity.partial).toBe(true);

    const access = await probeGithub(onGithub(), scriptedReader({ access: async () => PARTIAL }).reader);
    expect(access.ghAuthed).toBe(true);
    expect(access.access).toBe('unknown');
    expect(access.partial).toBe(true);

    const prs = await probeGithub(onGithub(), scriptedReader({ pullRequests: async () => PARTIAL }).reader);
    expect(prs.access).toBe('granted');
    expect(prs.pr).toBeUndefined();
    expect(prs.partial).toBe(true);
  });

  it('a reader that rejects rejects the measurement', async () => {
    const { reader } = scriptedReader({ identity: async () => { throw new Error('provider exploded'); } });
    expect(await outcome(probeGithub(onGithub(), reader))).toThrow('provider exploded');
  });
});

describe('fork checkouts', () => {
  const upstreamRows = [
    rawPr({ number: 5, url: 'https://github.com/up/stream/pull/5', headRepositoryOwner: { login: 'onlook-dev' } }),
    rawPr({ number: 6, url: 'https://github.com/up/stream/pull/6', headRepositoryOwner: { login: 'other' }, updatedAt: '2026-08-09T00:00:00Z' }),
  ];
  const fork = (overrides: Partial<GitMeasurement> = {}) => onGithub({ branch: 'feat/fork', ...overrides });

  it('lists the parent first with the bare branch, the origin owner and the signed-in login, then the origin unfiltered when the parent has none', async () => {
    const listed: unknown[][] = [];
    const { reader } = scriptedReader({
      access: async () => ({ ok: true, value: { permission: 'granted', parent: 'up/stream', parentPermission: 'granted', owner: 'onlook-dev' } }),
      pullRequests: async (...args) => {
        listed.push(args);
        return { ok: true, value: [] };
      },
    });
    await probeGithub(fork(), reader);
    expect(listed).toEqual([
      ['up/stream', 'feat/fork', { headOwner: 'onlook-dev', account: 'wrenquill' }],
      ['onlook-dev/fixture', 'feat/fork', undefined],
    ]);
  });

  it("the head owner is the API's spelling when the view names the repo, else the remote's", async () => {
    const listed: unknown[][] = [];
    const record = async (...args: unknown[]) => {
      listed.push(args);
      return { ok: true as const, value: [] };
    };
    const named = scriptedReader({
      access: async () => ({ ok: true, value: { permission: 'granted', parent: 'up/stream', parentPermission: 'granted', owner: 'onlook-dev' } }),
      pullRequests: record,
    }).reader;
    await probeGithub(fork({ repo: 'Onlook-Dev/fixture' }), named);
    const unnamed = scriptedReader({
      access: async () => ({ ok: true, value: { permission: 'granted', parent: 'up/stream', parentPermission: 'granted' } }),
      pullRequests: record,
    }).reader;
    await probeGithub(fork({ repo: 'Onlook-Dev/fixture' }), unnamed);
    const filters = listed.map((args) => args[2] as { headOwner: string } | undefined);
    expect(filters.map((f) => f?.headOwner)).toEqual(['onlook-dev', undefined, 'Onlook-Dev', undefined]);
  });

  it('a PR opened against the fork itself: the parent lists none, the origin answers it, never stamped by the parent permission', async () => {
    const { reader, calls } = scriptedGh({
      repo: forkView('ADMIN'),
      views: { 'up/stream': ok(JSON.stringify({ viewerPermission: 'READ' })) },
      lists: { 'up/stream': ok('[]') },
      prs: ok(JSON.stringify([rawPr({ number: 9 })])),
    });
    const m = await probeGithub(fork(), reader);
    expect(m.pr?.number).toBe(9);
    expect(m.pr?.viewerCanMerge).toBeUndefined();
    expect(m.partial).toBeUndefined();
    expect(calls.filter((c) => c[0] === 'pr').map((c) => c[3])).toEqual(['up/stream', 'onlook-dev/fixture']);
  });

  it('a non-fork lists PRs on the origin with no filter', async () => {
    const listed: unknown[][] = [];
    const { reader } = scriptedReader({
      pullRequests: async (...args) => {
        listed.push(args);
        return { ok: true, value: [] };
      },
    });
    await probeGithub(fork(), reader);
    expect(listed).toEqual([['onlook-dev/fixture', 'feat/fork', undefined]]);
  });

  it('parent WRITE: the upstream PR lands with viewerCanMerge unset and repo stays the origin', async () => {
    const { reader, calls } = scriptedGh({
      repo: forkView('ADMIN'),
      views: { 'up/stream': ok(JSON.stringify({ viewerPermission: 'WRITE' })) },
      lists: { 'up/stream': ok(JSON.stringify(upstreamRows)) },
    });
    const m = await probeGithub(fork(), reader);
    expect(m.repo).toBe('onlook-dev/fixture');
    expect(m.access).toBe('granted');
    expect(m.pr?.number).toBe(5);
    expect(m.pr?.viewerCanMerge).toBeUndefined();
    expect(calls.filter((c) => c[0] === 'repo').map((c) => c[2])).toEqual(['onlook-dev/fixture', 'up/stream']);
    const lists = calls.filter((c) => c[0] === 'pr');
    expect(lists).toHaveLength(1);
    expect(lists[0]?.slice(2, 6)).toEqual(['-R', 'up/stream', '--head', 'feat/fork']);
  });

  it('parent READ: the upstream PR still shows, carrying viewerCanMerge false', async () => {
    const { reader } = scriptedGh({
      repo: forkView('WRITE'),
      views: { 'up/stream': ok(JSON.stringify({ viewerPermission: 'READ' })) },
      lists: { 'up/stream': ok(JSON.stringify(upstreamRows)) },
    });
    const m = await probeGithub(fork(), reader);
    expect(m.access).toBe('granted');
    expect(m.pr?.number).toBe(5);
    expect(m.pr?.viewerCanMerge).toBe(false);
    expect(m.partial).toBeUndefined();
  });
});

describe('pickPullRequest', () => {
  it('open beats merged beats closed', () => {
    const list = [
      measuredPr({ number: 1, state: 'CLOSED', updatedAt: '2026-08-03T00:00:00Z' }),
      measuredPr({ number: 2, state: 'MERGED', updatedAt: '2026-08-02T00:00:00Z' }),
      measuredPr({ number: 3, state: 'OPEN', updatedAt: '2026-08-01T00:00:00Z' }),
    ];
    expect(pickPullRequest(list, 'main')?.number).toBe(3);
    expect(pickPullRequest(list.slice(0, 2), 'main')?.number).toBe(2);
    expect(pickPullRequest(list.slice(0, 1), 'main')?.number).toBe(1);
  });
  it('same state: base-targeting beats other base', () => {
    const list = [
      measuredPr({ number: 1, baseRefName: 'develop', updatedAt: '2026-08-05T00:00:00Z' }),
      measuredPr({ number: 2, baseRefName: 'main', updatedAt: '2026-08-01T00:00:00Z' }),
    ];
    expect(pickPullRequest(list, 'main')?.number).toBe(2);
  });
  it('same state and base: most recently updated', () => {
    const list = [
      measuredPr({ number: 1, updatedAt: '2026-08-01T00:00:00Z' }),
      measuredPr({ number: 2, updatedAt: '2026-08-05T00:00:00Z' }),
    ];
    expect(pickPullRequest(list, 'main')?.number).toBe(2);
  });
  it('empty list is no PR', () => {
    expect(pickPullRequest([], 'main')).toBeUndefined();
  });
});
