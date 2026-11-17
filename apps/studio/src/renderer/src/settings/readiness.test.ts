import { describe, expect, it } from 'bun:test';
import {
  CLAUDE_SETUP_DETAILS,
  CLAUDE_SETUP_STATUSES,
  type ClaudeSetupStatus,
  type CodexSetupStatus,
} from '@studio/events';
import { claudeReadiness, codexReadiness, offersSetUp, readinessByHarness } from './readiness.js';

const CODEX_STATUSES = [
  'unsupported',
  'idle',
  'checking',
  'downloading',
  'validating',
  'ready',
  'failed',
  'broken',
  'outdated',
  'signed-out',
  'signing-in',
] as const satisfies readonly CodexSetupStatus[];

describe('claudeReadiness', () => {
  it('signed-out is not signed in, and offers Set up', () => {
    expect(claudeReadiness('signed-out')).toBe('not-signed-in');
    expect(offersSetUp(claudeReadiness('signed-out'))).toBe(true);
  });

  it('checking and verifying withhold Set up', () => {
    for (const status of ['checking', 'verifying'] as const) {
      expect(claudeReadiness(status)).toBe('checking');
      expect(offersSetUp(claudeReadiness(status))).toBe(false);
    }
  });

  it('unfinished sign-in keeps the action offered', () => {
    for (const status of ['signing-in', 'awaiting-code'] as const) {
      expect(claudeReadiness(status)).toBe('sign-in-incomplete');
      expect(offersSetUp(claudeReadiness(status))).toBe(true);
    }
  });

  it('idle keeps Set up offered: nothing is confirmed and a stopped check can land there (ONL-2496)', () => {
    // Withholding the control here is a dead end — a cancelled check leaves no detection to resolve it.
    expect(claudeReadiness('idle')).toBe('needs-attention');
    expect(offersSetUp(claudeReadiness('idle'))).toBe(true);
  });

  it('failed is not installed', () => {
    expect(claudeReadiness('failed')).toBe('not-installed');
  });

  it('a failed verification reads as a sign-in only when a sign-in is the remedy (ONL-2496)', () => {
    expect(claudeReadiness('verification-failed', 'turn-signed-out')).toBe('not-signed-in');
    for (const detail of ['turn-provider-refused', 'turn-usage-limit', 'turn-rate-limited', 'turn-service-error', 'turn-billing', 'turn-agent-error', 'turn-no-answer'] as const) {
      expect(claudeReadiness('verification-failed', detail)).toBe('needs-attention');
    }
  });

  it('a failed verification needs the user, not an install, and keeps Set up offered (ONL-2496)', () => {
    for (const detail of CLAUDE_SETUP_DETAILS) {
      const readiness = claudeReadiness('verification-failed', detail);
      expect(readiness).not.toBe('not-installed');
      expect(offersSetUp(readiness)).toBe(true);
    }
  });

  it('only signed-in is ready', () => {
    const ready = CLAUDE_SETUP_STATUSES.filter((status) => claudeReadiness(status) === 'ready');
    expect(ready).toEqual(['signed-in']);
  });
});

describe('codexReadiness', () => {
  it('idle is not installed, so Set up is pressable on a machine with no codex', () => {
    expect(codexReadiness('idle')).toBe('not-installed');
    expect(offersSetUp(codexReadiness('idle'))).toBe(true);
  });

  it('every genuinely in-flight status is checking, with Set up withheld', () => {
    for (const status of ['checking', 'downloading', 'validating', 'signing-in'] as const) {
      expect(codexReadiness(status)).toBe('checking');
      expect(offersSetUp(codexReadiness(status))).toBe(false);
    }
  });

  it('unsupported is not installed, and Set up stays offered', () => {
    expect(codexReadiness('unsupported')).toBe('not-installed');
    expect(offersSetUp(codexReadiness('unsupported'))).toBe(true);
    expect(codexReadiness('unsupported')).not.toBe('ready');
  });

  it('broken, outdated and failed are not installed', () => {
    for (const status of ['broken', 'outdated', 'failed'] as const) {
      expect(codexReadiness(status)).toBe('not-installed');
    }
  });

  it('signed-out is not signed in; signing-in is checking', () => {
    expect(codexReadiness('signed-out')).toBe('not-signed-in');
    expect(codexReadiness('signing-in')).toBe('checking');
  });

  it('only ready is ready', () => {
    const ready = CODEX_STATUSES.filter((status) => codexReadiness(status) === 'ready');
    expect(ready).toEqual(['ready']);
  });
});

describe('an unknown status', () => {
  it('is checking, never ready, for either harness', () => {
    const bogus = 'from-a-newer-main' as unknown;
    expect(claudeReadiness(bogus as ClaudeSetupStatus)).toBe('checking');
    expect(codexReadiness(bogus as CodexSetupStatus)).toBe('checking');
  });
});

describe('offersSetUp', () => {
  it('is true for every state the user can act on, and false for the rest', () => {
    expect(offersSetUp('not-installed')).toBe(true);
    expect(offersSetUp('not-signed-in')).toBe(true);
    expect(offersSetUp('sign-in-incomplete')).toBe(true);
    expect(offersSetUp('needs-attention')).toBe(true);
    expect(offersSetUp('ready')).toBe(false);
    expect(offersSetUp('checking')).toBe(false);
  });
});

describe('readinessByHarness', () => {
  it('maps both harnesses at once', () => {
    expect(readinessByHarness('signed-in', 'checking')).toEqual({ claude: 'ready', codex: 'checking' });
    expect(readinessByHarness('signed-out', 'unsupported')).toEqual({ claude: 'not-signed-in', codex: 'not-installed' });
    expect(readinessByHarness('awaiting-code', 'signing-in')).toEqual({ claude: 'sign-in-incomplete', codex: 'checking' });
  });
});
