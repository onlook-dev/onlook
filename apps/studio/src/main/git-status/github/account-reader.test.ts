import { describe, expect, it } from 'bun:test';
import { GIT_PILL_SHIPPED_DEFAULTS } from '@studio/events';
import { derivePillState } from '@studio/git-ui/derive';
import { emptyMeasurement, probeGithub } from '../measure.js';
import { selectGithubReader } from './account-reader.js';
import { scriptedReader } from './test-support.js';
import { GITHUB_READ_FAILURES, githubBackendFixture } from '../../github-import/backend-fixtures.js';

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

  it('keeps transient failures partial instead of declaring access denied', async () => {
    const result = await measured('unavailable');
    expect(result.measurement.partial).toBe(true);
    expect(result.measurement.access).toBe('unknown');
    expect(result.fallback.asked).toEqual([]);
  });

  it('offers the browser connection when disconnected without gh', async () => {
    const result = await measured('disconnected');
    expect(result.state.id).toBe('connect-github');
    expect(result.selected.connectViaBrowser).toBe(true);
  });

  it('uses gh unchanged when a provider has no reads', async () => {
    const fallback = scriptedReader({});
    expect(await selectGithubReader(undefined, fallback.reader)).toEqual({ reader: fallback.reader, connectViaBrowser: false });
    expect(await selectGithubReader({ ...githubBackendFixture('connected'), identity: undefined }, fallback.reader))
      .toEqual({ reader: fallback.reader, connectViaBrowser: false });
  });

  it('keeps an authenticated gh user working without an account connection', async () => {
    const fallback = scriptedReader({});
    const selected = await selectGithubReader(githubBackendFixture('disconnected'), fallback.reader);
    expect(selected.reader).toBe(fallback.reader);
  });

  for (const failure of GITHUB_READ_FAILURES) {
    it(`preserves the typed ${JSON.stringify(failure)} failure without granting access`, async () => {
      const fallback = scriptedReader({});
      const selected = await selectGithubReader(githubBackendFixture('connected', { repositoryAccess: failure }), fallback.reader);
      const result = await selected.reader.access('example/design');
      expect(selected.failure?.()).toEqual(failure);
      if (result.ok) expect(result.value.permission).toBe('denied');
      else expect(result.partial).toBe(true);
      expect(fallback.asked).toEqual([]);
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

  it('treats a rejected read as unavailable, never as no pull requests', async () => {
    const backend = githubBackendFixture('connected');
    backend.pullRequests = async () => { throw new Error('offline'); };
    const selected = await selectGithubReader(backend, scriptedReader({}).reader);
    expect(await selected.reader.pullRequests('example/design', 'design')).toEqual({ ok: false, partial: true });
    expect(selected.failure?.()).toEqual({ status: 'unavailable', reason: 'provider_unavailable' });
  });
});
