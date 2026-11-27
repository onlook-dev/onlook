import { describe, expect, it } from 'bun:test';
import type { GitMeasurement } from '@studio/events';
import { emptyMeasurement } from '../git-status/measure.js';
import { gitStateProperties } from './git-state.js';

const facts: GitMeasurement = {
  ...emptyMeasurement('private-base', true), head: 'branch', origin: 'github',
  ghInstalled: true, ghAuthed: true, access: 'granted',
  repo: 'private-owner/private-repo', branch: 'private-branch', ghAccount: 'private-account',
};

describe('git state scalars', () => {
  it('keeps unmeasured CLI and comparison facts null', () => {
    expect(gitStateProperties(undefined, 'open', undefined)).toMatchObject({
      reason: 'measurement-unavailable', git_installed: null, gh_installed: null,
      gh_authenticated: null, ahead: null, behind: null, fetch_succeeded: null,
    });
    expect(gitStateProperties({ ...facts, origin: 'other' }, 'focus', false)).toMatchObject({
      reason: 'non-github', gh_installed: null, gh_authenticated: null, fetch_succeeded: false,
    });
    expect(gitStateProperties({ ...facts, partial: true, ghAuthed: false }, 'focus', undefined)).toMatchObject({
      reason: 'partial', gh_installed: null, gh_authenticated: null, access: null,
    });
  });

  it('counts the two organisation blocks apart from a plain denial', () => {
    expect(gitStateProperties({ ...facts, access: 'denied', accessReason: 'sso_required' }, 'open', true).reason).toBe('sso-required');
    expect(gitStateProperties({ ...facts, access: 'denied', accessReason: 'approval_required' }, 'open', true).reason).toBe('approval-required');
    expect(gitStateProperties({ ...facts, access: 'denied' }, 'open', true).reason).toBe('access-denied');
  });

  it('names which reader answered and the typed failure the measurement carried', () => {
    const account = gitStateProperties(facts, 'open', true, 'account');
    expect(account.reader).toBe('account');
    expect(account.read_failure).toBeNull();
    const cli = gitStateProperties(
      { ...facts, githubReadFailure: { status: 'unavailable', reason: 'rate_limited' } }, 'open', true, 'cli',
    );
    expect(cli.reader).toBe('cli');
    expect(cli.read_failure).toBe('unavailable');
    expect(gitStateProperties(undefined, 'open', undefined)).toMatchObject({ reader: null, read_failure: null });
    expect(JSON.stringify([account, cli])).not.toContain('private-');
  });

  it('separates missing CLI, signed-out CLI and measured access failures without shipping identity', () => {
    for (const [measurement, reason] of [
      [{ ...facts, ghInstalled: false, ghAuthed: false }, 'gh-missing'],
      [{ ...facts, ghAuthed: false }, 'gh-signed-out'],
      [{ ...facts, access: 'denied', accessReason: 'read-only' }, 'read-only'],
      [{ ...facts, access: 'denied', accessReason: 'repo-not-visible' }, 'repo-not-visible'],
    ] as const) {
      const properties = gitStateProperties(measurement, 'open', true);
      expect(properties.reason).toBe(reason);
      expect(JSON.stringify(properties)).not.toContain('private-');
    }
  });
});
