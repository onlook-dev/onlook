import { afterEach, describe, expect, it, mock } from 'bun:test';

let enabled = true;
let credentialReads = 0;
mock.module('@onlook/cloud-provider', () => ({ identity: {
  enabled: () => enabled,
  hasSession: () => { credentialReads += 1; throw new Error('Unexpected credential read'); },
} }));

const { hasOnlookSession, noteOnlookSession } = await import('./access.js');

afterEach(() => {
  enabled = true;
  noteOnlookSession('signed-out');
  expect(credentialReads).toBe(0);
});

describe('main account access', () => {
  it('starts blocked before any session has been observed without reading credentials', () => {
    expect(hasOnlookSession()).toBe(false);
    expect(credentialReads).toBe(0);
  });

  it('tracks the last observed session rather than identity or server connection', () => {
    noteOnlookSession('signed-in');
    expect(hasOnlookSession()).toBe(true);
    noteOnlookSession('signed-out');
    expect(hasOnlookSession()).toBe(false);
    noteOnlookSession('signed-in');
    expect(hasOnlookSession()).toBe(true);
    noteOnlookSession('local');
    expect(hasOnlookSession()).toBe(false);
  });

  it('leaves source and flag-off builds neutral regardless of the observed session', () => {
    enabled = false;
    for (const session of ['local', 'signed-out', 'signed-in'] as const) {
      noteOnlookSession(session);
      expect(hasOnlookSession()).toBe(true);
    }
    noteOnlookSession('signed-out');
    enabled = true;
    expect(hasOnlookSession()).toBe(false);
  });
});
