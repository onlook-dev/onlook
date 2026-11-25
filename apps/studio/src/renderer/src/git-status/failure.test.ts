import { describe, expect, it } from 'bun:test';
import { classifyPrFailure, prFailureFor, prFailureMark, retiresPrFailure } from './failure.js';
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
  it('retires a reason once the step it asked for is done', () => {
    const asFailed = row(measurement({ ahead: 0, dirty: false }));
    const mark = prFailureMark(asFailed);
    expect(retiresPrFailure(asFailed, 'no-changes', mark)).toBe(false);
    expect(retiresPrFailure(row(measurement({ ahead: 1 })), 'no-changes', mark)).toBe(true);
    expect(retiresPrFailure(row(measurement({ dirty: true })), 'no-changes', mark)).toBe(true);
    const signedOut = prFailureMark(row(measurement({ ghAuthed: false })));
    expect(retiresPrFailure(row(measurement({ ghAuthed: false })), 'sign-in', signedOut)).toBe(false);
    expect(retiresPrFailure(row(measurement({ ghAuthed: true })), 'sign-in', signedOut)).toBe(true);
    expect(retiresPrFailure(row(measurement({}, {})), 'push-refused', mark)).toBe(true);
    expect(retiresPrFailure(asFailed, undefined, mark)).toBe(false);
  });

  it('keeps a reason the attempt already measured, so unpushed work does not clear it', () => {
    const ahead = row(measurement({ ahead: 1, dirty: true }));
    const mark = prFailureMark(ahead);
    expect(retiresPrFailure(ahead, 'no-changes', mark)).toBe(false);
    expect(retiresPrFailure(row(measurement({ ahead: 1, dirty: true })), 'no-changes', mark)).toBe(false);
    expect(retiresPrFailure(row(measurement({ ghAuthed: true })), 'sign-in', prFailureMark(row(measurement({ ghAuthed: true }))))).toBe(false);
  });

  it('keeps a reason no local comparison can disprove', () => {
    const mark = prFailureMark(row(measurement({ ahead: 0, dirty: false })));
    const fresh = row(measurement({ ahead: 3, dirty: true }));
    for (const failure of ['push-refused', 'org-approval', 'unknown'] as const) {
      expect(retiresPrFailure(fresh, failure, mark)).toBe(false);
    }
  });

  it('keeps every reason while the comparison is stale or incomplete', () => {
    const mark = prFailureMark(row(measurement({ ahead: 0, dirty: false, ghAuthed: false })));
    const changed = measurement({ ahead: 1, ghAuthed: true });
    expect(retiresPrFailure(row(changed, { stale: true }), 'no-changes', mark)).toBe(false);
    expect(retiresPrFailure(row({ ...changed, partial: true }), 'sign-in', mark)).toBe(false);
  });

  for (const [output, expected] of [
    ['No commits between main and feature', 'no-changes'],
    ['No commits between main and feature/saml-settings', 'no-changes'],
    ['! [rejected] feature/saml-settings -> feature/saml-settings (non-fast-forward)', 'push-refused'],
    ['nothing to commit, working tree clean', undefined],
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
