import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';

const {
  forgetSession,
  harnessKey,
  planSession,
  rememberAppServerThread,
  rememberSession,
  resetSessionsCache,
  storedAppServerThread,
} = await import('./sessions.js');

const savedStateRoot = process.env['STUDIO_STATE_ROOT'];

afterAll(() => {
  if (savedStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = savedStateRoot;
  cleanupTempFixtures();
});

let stateRoot: string;
let a: string;
let b: string;

beforeEach(() => {
  stateRoot = makeStateRoot({ name: 'sessions' });
  process.env['STUDIO_STATE_ROOT'] = stateRoot;
  resetSessionsCache();
  // Real directories: keys canonicalise through the filesystem.
  a = join(stateRoot, 'a');
  b = join(stateRoot, 'b');
  for (const dir of [a, b]) mkdirSync(dir, { recursive: true });
});

function storedKeys(): string[] {
  const raw = readFileSync(join(stateRoot, 'sessions.json'), 'utf8');
  const written = JSON.parse(raw) as { data: { byWorkspace: Record<string, unknown> } };
  return Object.keys(written.data.byWorkspace);
}

describe('forgetSession', () => {
  it('drops the Claude record, so the next plan is fresh (ONL-2198)', async () => {
    rememberSession(a, 'session-to-forget');
    expect(storedKeys()).toContain(harnessKey(a, 'claude'));

    forgetSession(a, 'claude');

    expect(storedKeys()).not.toContain(harnessKey(a, 'claude'));
    expect(await planSession(a)).toMatchObject({ kind: 'fresh' });
  });

  it('drops the codex thread, so the next start cannot resume it (ONL-2198)', () => {
    rememberAppServerThread(a, 'thread-to-forget');
    expect(storedAppServerThread(a)).toBe('thread-to-forget');

    forgetSession(a, 'appserver');

    expect(storedAppServerThread(a)).toBeUndefined();
  });

  it('forgets one runtime only — the other keeps its record for the same project', () => {
    rememberSession(a, 'claude-session');
    rememberAppServerThread(a, 'codex-thread');

    forgetSession(a, 'claude');

    expect(storedKeys()).not.toContain(harnessKey(a, 'claude'));
    expect(storedAppServerThread(a)).toBe('codex-thread');
  });

  it('forgets one project only — another project keeps its record', () => {
    rememberAppServerThread(a, 'thread-a');
    rememberAppServerThread(b, 'thread-b');

    forgetSession(a, 'appserver');

    expect(storedAppServerThread(a)).toBeUndefined();
    expect(storedAppServerThread(b)).toBe('thread-b');
  });

  it('forgetting an absent record is a no-op, not a throw', () => {
    rememberAppServerThread(b, 'thread-b');

    expect(() => {
      forgetSession(a, 'claude');
    }).not.toThrow();
    expect(storedAppServerThread(b)).toBe('thread-b');
  });

  it('survives a cache drop — the record is gone from disk, not just from memory', () => {
    rememberAppServerThread(a, 'thread-a');
    forgetSession(a, 'appserver');
    resetSessionsCache();

    expect(storedAppServerThread(a)).toBeUndefined();
  });
});
