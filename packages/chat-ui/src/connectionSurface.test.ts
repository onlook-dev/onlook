import { describe, expect, test } from 'bun:test';

import { connectionSurface, connectionVerdict, isSignInShaped, signInPlacement } from './connectionSurface.js';

describe('what answers a connection (ONL-2187)', () => {
  test('a usable connection answers with nothing', () => {
    expect(connectionSurface({ status: 'ok' }, true, undefined)).toBe('none');
    expect(connectionSurface({ status: 'unknown' }, true, undefined)).toBe('none');
  });

  test('an in-flight remedy keeps its banner through unknown and a prior dismissal', () => {
    const pending = { status: 'unknown', harness: 'codex' } as const;
    expect(connectionSurface(pending, false, connectionVerdict(pending), true)).toBe('banner');
  });

  test("Claude signed out takes the card, and the card is not dismissible", () => {
    const signedOut = { status: 'unauthenticated' } as const;
    expect(connectionSurface(signedOut, true, undefined)).toBe('card');
    expect(connectionSurface(signedOut, true, connectionVerdict(signedOut))).toBe('card');
  });

  test('codex signed out keeps the banner — the card drives Claude’s sign-in only', () => {
    expect(isSignInShaped({ status: 'unauthenticated', harness: 'codex' })).toBe(false);
    expect(connectionSurface({ status: 'unauthenticated', harness: 'codex' }, true, undefined)).toBe('banner');
  });

  test('states a sign-in cannot fix keep the banner, and keep their dismissal', () => {
    const missing = { status: 'cli_missing' } as const;
    expect(connectionSurface(missing, true, undefined)).toBe('banner');
    expect(connectionSurface(missing, true, connectionVerdict(missing))).toBe('none');
  });

  test('a dismissal is scoped to its own verdict, not to the next one', () => {
    const dismissed = connectionVerdict({ status: 'cli_missing' });
    expect(connectionSurface({ status: 'error' }, true, dismissed)).toBe('banner');
  });

  test('the same status on different runtimes are different verdicts', () => {
    expect(connectionVerdict({ status: 'cli_missing' })).not.toBe(
      connectionVerdict({ status: 'cli_missing', harness: 'codex' }),
    );
  });
});

describe('where the card sits (ONL-2187)', () => {
  test('a turn that died signed out puts the card in the transcript, after the message that died', () => {
    expect(signInPlacement({ failedTurn: { turnId: 't1', code: 'unauthenticated' } })).toBe('transcript');
  });

  test('signed out before any turn has failed keeps the band — there is no point of failure to follow', () => {
    expect(signInPlacement({})).toBe('band');
    expect(signInPlacement({ failedTurn: undefined })).toBe('band');
  });

  test('a turn that failed for another reason does not move the card', () => {
    expect(signInPlacement({ failedTurn: { turnId: 't1', code: 'unknown' } })).toBe('band');
    expect(signInPlacement({ failedTurn: { turnId: 't1' } })).toBe('band');
  });

  test('a refused credential that raised the card answers its turn in place, as a sign-out does (ONL-2903)', () => {
    expect(signInPlacement({ failedTurn: { turnId: 't1', code: 'credential_rejected' } })).toBe('transcript');
    expect(signInPlacement({ failedTurn: { turnId: 't1', code: 'unknown' } })).toBe('band');
  });
});
