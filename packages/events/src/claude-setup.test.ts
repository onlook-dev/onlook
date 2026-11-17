import { describe, expect, it } from 'bun:test';
import {
  CLAUDE_SETUP_DETAILS,
  CLAUDE_SETUP_STATUSES,
  claudeDetailNeedsSignIn,
  claudeStatusIsSettled,
  sanitizeCode,
} from './claude-setup.js';

describe('claudeDetailNeedsSignIn', () => {
  it('is true for a sign-out and a refused sign-in, and false for every other (ONL-2903)', () => {
    const fixable = ['turn-signed-out', 'turn-sign-in-rejected'];
    for (const detail of CLAUDE_SETUP_DETAILS) {
      expect(claudeDetailNeedsSignIn(detail), detail).toBe(fixable.includes(detail));
    }
  });

  it('is false when nothing said why, so an unexplained failure never offers a sign-in', () => {
    expect(claudeDetailNeedsSignIn(undefined)).toBe(false);
  });
});

describe('claudeStatusIsSettled', () => {
  it('names every status with something still running, so a restore can only land on a verdict (ONL-2496)', () => {
    const inFlight = CLAUDE_SETUP_STATUSES.filter((status) => !claudeStatusIsSettled(status));
    expect(inFlight).toEqual(['checking', 'signing-in', 'awaiting-code', 'verifying']);
  });

  it('counts a failed verification as settled, because the user can act on it', () => {
    expect(claudeStatusIsSettled('verification-failed')).toBe(true);
    expect(claudeStatusIsSettled('signed-in')).toBe(true);
    expect(claudeStatusIsSettled('signed-out')).toBe(true);
    expect(claudeStatusIsSettled('idle')).toBe(true);
    expect(claudeStatusIsSettled('failed')).toBe(true);
  });
});

describe('sanitizeCode', () => {
  it('drops control characters and surrounding space, and refuses an empty or oversized paste', () => {
    expect(sanitizeCode('  ab12\n-cd34\r\n ')).toBe('ab12-cd34');
    expect(sanitizeCode('   ')).toBeUndefined();
    expect(sanitizeCode('x'.repeat(513))).toBeUndefined();
  });
});
