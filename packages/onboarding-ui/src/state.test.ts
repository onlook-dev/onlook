import { describe, expect, test } from 'bun:test';
import { CHATGPT_SETUP_FIXTURES, CLAUDE_SETUP_FIXTURES, CLAUDE_SETUP_VARIANTS, claudeTile, codexTile } from './fixtures.js';
import { avatarFor, CHATGPT_SETUP_STATES, CLAUDE_SETUP_STATES, footerFor, isBusy, isSignedIn, markFor, otherAgentFor } from './state.js';

describe('markFor', () => {
  test('marks a tile for attention where the user is needed, connected once signed in, and nothing otherwise', () => {
    expect(markFor(claudeTile('fallback'))).toBe('attention');
    expect(markFor(claudeTile('cannot-connect'))).toBe('attention');
    expect(markFor(codexTile('setup-failed'))).toBe('attention');
    expect(markFor(codexTile('wont-start'))).toBe('attention');
    expect(markFor(codexTile('fallback'))).toBe('attention');
    expect(markFor(claudeTile('signed-in'))).toBe('connected');
    expect(markFor(codexTile('connected'))).toBe('connected');
    for (const state of ['idle', 'not-signed-in', 'checking', 'signing-in', 'paste-code'] as const) {
      expect(markFor(claudeTile(state))).toBeUndefined();
    }
    for (const state of ['idle', 'not-set-up', 'downloading', 'checking', 'not-signed-in', 'signing-in', 'out-of-date'] as const) {
      expect(markFor(codexTile(state))).toBeUndefined();
    }
    expect(markFor({ kind: 'coming-soon', id: 'opencode' })).toBeUndefined();
  });
});

describe('the setup states', () => {
  test('every state has a fixture whose footer names at least one action', () => {
    for (const fixture of [...Object.values(CLAUDE_SETUP_FIXTURES), ...Object.values(CLAUDE_SETUP_VARIANTS), ...Object.values(CHATGPT_SETUP_FIXTURES)]) {
      const footer = footerFor(fixture);
      expect(footer.primary ?? footer.ghost).toBeDefined();
    }
  });

  test('in-flight states are the busy ones', () => {
    expect((['signing-in', 'paste-code', 'downloading', 'checking'] as const).every(isBusy)).toBe(true);
    expect((['not-signed-in', 'signed-in', 'fallback', 'connected', 'cannot-connect'] as const).some(isBusy)).toBe(false);
  });

  test('a Claude check in flight draws the spinner; every other Claude state draws the brand mark (ONL-2496)', () => {
    expect(avatarFor(CLAUDE_SETUP_FIXTURES.checking)).toBe('spinner');
    for (const id of CLAUDE_SETUP_STATES) {
      if (id !== 'checking') expect(avatarFor(CLAUDE_SETUP_FIXTURES[id]), id).toBe('harness');
    }
  });

  test('the sheet that could not connect offers a retry, and the other agent as a card beside it rather than a footer button (ONL-2496, ONL-2903)', () => {
    expect(footerFor(CLAUDE_SETUP_FIXTURES['cannot-connect'])).toEqual({ primary: 'check-again' });
    expect(otherAgentFor(CLAUDE_SETUP_FIXTURES['cannot-connect'])).toEqual({ harness: 'codex', ready: false });
    expect(footerFor(CLAUDE_SETUP_FIXTURES.checking)).toEqual({ ghost: 'cancel' });
  });

  test('signed in is the signed-in and connected states, with or without an email (ONL-2186)', () => {
    expect(isSignedIn(CLAUDE_SETUP_FIXTURES['signed-in'])).toBe(true);
    expect(isSignedIn(CLAUDE_SETUP_VARIANTS['signed-in-no-email'])).toBe(true);
    expect(isSignedIn(CHATGPT_SETUP_FIXTURES.connected)).toBe(true);
    for (const id of CLAUDE_SETUP_STATES) {
      if (id !== 'signed-in') expect(isSignedIn(CLAUDE_SETUP_FIXTURES[id]), id).toBe(false);
    }
    for (const id of CHATGPT_SETUP_STATES) {
      if (id !== 'connected') expect(isSignedIn(CHATGPT_SETUP_FIXTURES[id]), id).toBe(false);
    }
  });
});
