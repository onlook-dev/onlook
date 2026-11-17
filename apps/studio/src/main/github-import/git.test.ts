import { describe, expect, test } from 'bun:test';
import { cloneFailure, cloneProgress, validCredential } from './git.js';

describe('GitHub clone safety', () => {
  test('progress comes from Git object phases, stays monotonic and never invents a byte total', () => {
    let progress = 0;
    for (const [message, expected] of [
      ['Receiving objects: 50%', 40], ['Receiving objects: 10%', 40], ['Receiving objects: 100%', 80],
      ['Resolving deltas: 50%', 87], ['Resolving deltas: 100%', 95], ['Updating files: 100%', 99],
    ] as const) { progress = cloneProgress(progress, message); expect(progress).toBe(expected); }
  });
  test('credentials are bound to the exact clean HTTPS repository and real short expiry', () => {
    const now = Date.now();
    const credential = { status: 'ready' as const, remoteUrl: 'https://github.com/team/repo.git', username: 'x-access-token' as const, password: 'ephemeral-secret', expiresAt: now + 120_000 };
    expect(validCredential(credential, 'team/repo', now)).toBe(true);
    for (const remoteUrl of ['https://attacker.test/team/repo.git', 'https://token@github.com/team/repo.git', 'http://github.com/team/repo.git']) {
      expect(validCredential({ ...credential, remoteUrl }, 'team/repo', now)).toBe(false);
    }
    for (const expiresAt of [NaN, now, now + 9 * 60 * 60 * 1000]) expect(validCredential({ ...credential, expiresAt }, 'team/repo', now)).toBe(false);
    expect(validCredential({ ...credential, password: 'secret\nusername=attacker' }, 'team/repo', now)).toBe(false);
  });
  for (const [message, failure] of [['No space left on device', 'disk'], ['Authentication failed', 'access'], ['RPC failed', 'network'], ['empty repository', 'empty']] as const) {
    test(`clone failure has a bounded recovery category: ${failure}`, () => { expect(cloneFailure({ err: message })).toBe(failure); });
  }
  test('cancellation takes precedence over interrupted Git output', () => { expect(cloneFailure({ err: 'RPC failed' }, true)).toBe('cancelled'); });
});
