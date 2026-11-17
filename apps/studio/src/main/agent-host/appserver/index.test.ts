import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import type { StudioEvent } from '@studio/events';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';

const { createAppServerSession, selectedHarness } = await import('./index.js');
const { resetOnboardingCache } = await import('../../onboarding/state.js');
const { resetSettingsCache, setSettingsHarness } = await import('../../settings/state.js');

const saved = {
  STUDIO_STATE_ROOT: process.env['STUDIO_STATE_ROOT'],
  STUDIO_FIRST_RUN: process.env['STUDIO_FIRST_RUN'],
  STUDIO_FLAGS: process.env['STUDIO_FLAGS'],
  STUDIO_HARNESS: process.env['STUDIO_HARNESS'],
  STUDIO_CODEX_ROOT: process.env['STUDIO_CODEX_ROOT'],
};

afterAll(() => {
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  resetOnboardingCache();
  resetSettingsCache();
  cleanupTempFixtures();
});

function useOwnStateRoot(name: string): string {
  const root = makeStateRoot({ name });
  process.env['STUDIO_STATE_ROOT'] = root;
  delete process.env['STUDIO_FIRST_RUN'];
  delete process.env['STUDIO_FLAGS'];
  delete process.env['STUDIO_HARNESS'];
  resetOnboardingCache();
  resetSettingsCache();
  return root;
}

function seed(name: string, contents: string): string {
  const root = useOwnStateRoot(name);
  writeFileSync(join(root, 'onboarding.json'), contents);
  resetOnboardingCache();
  return root;
}

describe('the backend a session opens on', () => {
  it('runs a completion with no recorded harness on Claude', () => {
    seed('backend-unrecorded', JSON.stringify({ completedAt: '2026-07-01T00:00:00.000Z' }));
    expect(selectedHarness()).toBe('claude');
  });

  it('runs an unreadable state file on Claude', () => {
    seed('backend-unreadable', 'not json {');
    expect(selectedHarness()).toBe('claude');
  });

  it('runs an explicit codex choice on codex', () => {
    seed(
      'backend-codex',
      JSON.stringify({ completedAt: '2026-08-01T00:00:00.000Z', harness: 'codex' }),
    );
    expect(selectedHarness()).toBe('codex');
  });
});

describe('the settings default', () => {
  it('selects codex under a forced run, which blinds onboarding but not settings', () => {
    useOwnStateRoot('backend-settings-forced');
    process.env['STUDIO_FIRST_RUN'] = '0';
    resetOnboardingCache();
    setSettingsHarness('codex');
    expect(selectedHarness()).toBe('codex');
  });
});

describe('STUDIO_HARNESS', () => {
  it('selects codex on a forced run, and writes nothing', () => {
    const root = useOwnStateRoot('backend-pinned-codex');
    process.env['STUDIO_FIRST_RUN'] = '0';
    process.env['STUDIO_HARNESS'] = 'codex';
    resetOnboardingCache();
    expect(selectedHarness()).toBe('codex');
    expect(existsSync(join(root, 'onboarding.json'))).toBe(false);
  });

  it('throws on a value that is not a harness, rather than ignoring it', () => {
    useOwnStateRoot('backend-pinned-bogus');
    process.env['STUDIO_HARNESS'] = 'gpt';
    resetOnboardingCache();
    expect(() => selectedHarness()).toThrow(/STUDIO_HARNESS/);
  });
});

describe('a codex install that cannot run', () => {
  it('opens a session whose error shows the user no filesystem path', async () => {
    const state = useOwnStateRoot('codex-unusable');
    const codexRoot = join(state, 'codex-install');
    mkdirSync(codexRoot);
    process.env['STUDIO_CODEX_ROOT'] = codexRoot;
    const events: StudioEvent[] = [];

    const session = createAppServerSession({
      cwd: state,
      onEvent: (event) => events.push(event),
      onState: () => undefined,
      onConnection: () => undefined,
    });
    session.open();
    await session.close();

    const errors = events.flatMap((event) => (event.type === 'session.error' ? [event.message] : []));
    expect(errors).toHaveLength(1);
    expect(errors[0]).not.toContain(codexRoot);
    expect(errors[0]).not.toMatch(/\/[^\s/]+\//);
  });
});
