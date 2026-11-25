import { describe, expect, it } from 'bun:test';
import { classifyPrFailure, prFailureFor } from './failure.js';
import { measurement, row } from '@studio/git-ui/measurement-fixtures';

describe('Create PR failure reasons', () => {
  it('infers no changes only from a complete fresh comparison', () => {
    const unchanged = row(measurement({ ahead: 0, dirty: false, baseExists: true }));
    expect(prFailureFor(unchanged, undefined)).toBe('no-changes');
    expect(prFailureFor({ ...unchanged, stale: true }, undefined)).toBe('unknown');
    for (const patch of [{ partial: true }, { baseExists: false }, { ahead: 1 }, { dirty: true }]) {
      expect(prFailureFor({ ...unchanged, measurement: { ...unchanged.measurement, ...patch } }, undefined)).toBe('unknown');
    }
    expect(prFailureFor(unchanged, 'sign-in')).toBe('sign-in');
  });
  for (const [output, expected] of [
    ['No commits between main and feature', 'no-changes'],
    ['nothing to commit, working tree clean', 'no-changes'],
    ['! [rejected] feature -> feature (non-fast-forward)', 'push-refused'],
    ['remote: Permission to repository denied.\nfatal: unable to access remote', 'push-refused'],
    ['remote: The organization has enabled SAML SSO. Authorize your token.', 'org-approval'],
    ['Resource protected by organization SAML enforcement', 'org-approval'],
    ['Personal access token requires organization approval', 'org-approval'],
    ['To get started with GitHub CLI, please run: gh auth login', 'sign-in'],
    ['HTTP 401: Bad credentials', 'sign-in'],
    ['fatal: Authentication failed for remote', 'sign-in'],
    ['network connection timed out', undefined],
  ] as const) {
    it(`classifies ${output}`, () => expect(classifyPrFailure(output)).toBe(expected));
  }
});
