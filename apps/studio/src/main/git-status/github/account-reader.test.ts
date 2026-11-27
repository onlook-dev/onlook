import { describe, expect, it } from 'bun:test';
import { GIT_PILL_SHIPPED_DEFAULTS, type GitMeasuredPullRequest } from '@studio/events';
import { derivePillState } from '@studio/git-ui/derive';
import { emptyMeasurement, probeGithub } from '../measure.js';
import { hasGithubStatusReads, selectGithubReader } from './account-reader.js';
import { scriptedReader } from './test-support.js';
import { GITHUB_READ_FAILURES, githubBackendFixture } from '../../github-import/backend-fixtures.js';
import type { GithubReadFailure } from '../../github-import/backend.js';

async function measured(scenario: Parameters<typeof githubBackendFixture>[0]) {
  const backend = githubBackendFixture(scenario);
  const fallback = scriptedReader({ present: { ok: false, partial: false } });
  const selected = await selectGithubReader(backend, fallback.reader);
  const measurement = await probeGithub({
    ...emptyMeasurement('main', true), origin: 'github', repo: 'example/design', branch: 'design', head: 'branch', dirty: scenario !== 'pull-request-open',
  }, selected.reader);
  const row = { measurement, measuredAt: '2026-01-01T00:00:00Z', trigger: 'open' as const, stale: false };
  return { measurement, state: derivePillState(row, GIT_PILL_SHIPPED_DEFAULTS), fallback, selected };
}

describe('account-backed GitHub status', () => {
  it('shows Create PR for a connected account without invoking gh', async () => {
    const result = await measured('connected');
    expect(result.state.id).toBe('create-pr');
    expect(result.fallback.asked).toEqual([]);
    expect(result.selected.connectViaBrowser).toBe(true);
  });

  it('shows no access instead of asking a connected account to sign in', async () => {
    expect((await measured('no-access')).state.id).toBe('no-access');
  });

  it('shows the connected account’s open pull request', async () => {
    const result = await measured('pull-request-open');
    expect(result.measurement.pr?.number).toBe(42);
    expect(result.state.id).toBe('ready-to-merge');
  });

  it('asks gh after a transient failure instead of declaring access denied', async () => {
    const result = await measured('unavailable');
    expect(result.selected.reader).toBe(result.fallback.reader);
    expect(result.selected.failure?.()).toEqual({ status: 'unavailable', reason: 'provider_unavailable' });
    expect(result.measurement.access).toBe('unknown');
  });

  it('offers the browser connection when disconnected without gh', async () => {
    const result = await measured('disconnected');
    expect(result.state.id).toBe('connect-github');
    expect(result.selected.connectViaBrowser).toBe(true);
  });

  it('uses gh unchanged when a provider has no reads', async () => {
    const fallback = scriptedReader({});
    expect(await selectGithubReader(undefined, fallback.reader)).toEqual({ reader: fallback.reader, connectViaBrowser: false, via: 'cli' });
    expect(await selectGithubReader({ ...githubBackendFixture('connected'), identity: undefined }, fallback.reader))
      .toEqual({ reader: fallback.reader, connectViaBrowser: false, via: 'cli' });
  });

  it('calls a provider status-capable only when it carries all three reads', () => {
    const backend = githubBackendFixture('connected');
    expect(hasGithubStatusReads(backend)).toBe(true);
    expect(hasGithubStatusReads({ ...backend, identity: undefined })).toBe(false);
    expect(hasGithubStatusReads({ ...backend, repositoryAccess: undefined })).toBe(false);
    expect(hasGithubStatusReads({ ...backend, pullRequests: undefined })).toBe(false);
    expect(hasGithubStatusReads(undefined)).toBe(false);
  });

  it('keeps an authenticated gh user working without an account connection', async () => {
    const fallback = scriptedReader({});
    const selected = await selectGithubReader(githubBackendFixture('disconnected'), fallback.reader);
    expect(selected.reader).toBe(fallback.reader);
  });

  const deniedBy = async (failure: GithubReadFailure) => {
    const fallback = scriptedReader({});
    const selected = await selectGithubReader(githubBackendFixture('connected', { repositoryAccess: failure }), fallback.reader);
    const result = await selected.reader.access('example/design');
    expect(selected.failure?.()).toEqual(failure);
    expect(fallback.asked).toEqual([]);
    return result;
  };

  for (const [failure, reason] of [
    [{ status: 'not_found' }, 'repo-not-visible'],
    [{ status: 'sso_required' }, 'sso_required'],
    [{ status: 'approval_required' }, 'approval_required'],
  ] as const) {
    it(`establishes no access, and says why, for ${failure.status}`, async () => {
      expect(await deniedBy(failure)).toEqual({ ok: true, value: { permission: 'denied', reason } });
    });
  }

  for (const failure of GITHUB_READ_FAILURES.filter(
    (entry) => entry.status !== 'not_found' && entry.status !== 'sso_required' && entry.status !== 'approval_required',
  )) {
    it(`leaves the read incomplete, never a denial, for ${JSON.stringify(failure)}`, async () => {
      expect(await deniedBy(failure)).toEqual({ ok: false, partial: true });
    });
  }

  it('keeps a fork’s owner filter and its parent’s read-only merge restriction', async () => {
    const calls: unknown[][] = [];
    const backend = githubBackendFixture('connected', { repositoryAccess: {
      status: 'connected', repository: { fullName: 'example/design', permission: 'WRITE', parent: { fullName: 'upstream/design', permission: 'READ' } },
    } });
    const list = githubBackendFixture('pull-request-open').pullRequests!;
    backend.pullRequests = async (...args) => { calls.push(args); return list(...args); };
    const selected = await selectGithubReader(backend, scriptedReader({}).reader);
    const result = await probeGithub({ ...emptyMeasurement('main', true), head: 'branch', branch: 'design', origin: 'github', repo: 'example/design' }, selected.reader);
    expect(calls).toEqual([['upstream/design', 'design', 'example']]);
    expect(result.pr?.viewerCanMerge).toBe(false);
  });

  describe('a provider pull-request row', () => {
    const row = {
      number: 42, url: 'https://github.com/example/design/pull/42', state: 'OPEN' as const, isDraft: false,
      mergeStateStatus: 'CLEAN', checks: 'passing' as const, baseRefName: 'main', updatedAt: '2026-01-01T00:00:00Z',
    };
    const second = { ...row, number: 7, url: 'https://github.com/example/design/pull/7' };
    const listed = async (rows: unknown[]) => {
      const backend = githubBackendFixture('connected', {
        pullRequests: { status: 'connected', pullRequests: rows as GitMeasuredPullRequest[] },
      });
      const selected = await selectGithubReader(backend, scriptedReader({}).reader);
      return selected.reader.pullRequests('example/design', 'design');
    };

    it('reaches the measurement as its known fields and nothing else', async () => {
      const extra = { ...row, viewerCanMerge: false, headRepositoryOwner: { login: 'example' }, author: 'designer' };
      expect(await listed([extra])).toEqual({ ok: true, value: [{ ...row, viewerCanMerge: false }] });
    });

    it('is dropped whole when any field fails its check, and the sound rows stay', async () => {
      const broken: Array<Record<string, unknown>> = [
        { number: 4.2 }, { number: -1 }, { number: '42' },
        { url: 'javascript:alert(1)' },
        { url: 'https://designer:token@github.com/example/design/pull/42' },
        { url: 'https://github.example.com/example/design/pull/42' },
        { url: 'https://github.com/example/other/pull/42' },
        { url: 'https://github.com/example/design/pull/43' },
        { state: 'DRAFT' }, { checks: 'green' },
        { mergeStateStatus: '' }, { baseRefName: 'x'.repeat(300) }, { updatedAt: 42 },
      ];
      for (const over of broken) {
        expect(await listed([{ ...row, ...over }, second]), JSON.stringify(over)).toEqual({ ok: true, value: [second] });
      }
    });

    it('a list whose every row fails is an empty answer, never an incomplete read', async () => {
      expect(await listed([{ ...row, state: 'DRAFT' }])).toEqual({ ok: true, value: [] });
    });

    it('is pinned to the repository asked about however the remote spells it', async () => {
      const backend = githubBackendFixture('connected', { pullRequests: { status: 'connected', pullRequests: [row] } });
      const selected = await selectGithubReader(backend, scriptedReader({}).reader);
      expect(await selected.reader.pullRequests('Example/Design', 'design')).toEqual({ ok: true, value: [row] });
    });
  });

  it('treats a rejected read as unavailable, never as no pull requests', async () => {
    const backend = githubBackendFixture('connected');
    backend.pullRequests = async () => { throw new Error('offline'); };
    const selected = await selectGithubReader(backend, scriptedReader({}).reader);
    expect(await selected.reader.pullRequests('example/design', 'design')).toEqual({ ok: false, partial: true });
    expect(selected.failure?.()).toEqual({ status: 'unavailable', reason: 'provider_unavailable' });
  });
});
