import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';

const { chosenHarness, clearOnboarded, completeOnboarding, readOnboardingState, resetOnboardingCache } =
  await import('./state.js');
const { resetSettingsCache, settingsHarness } = await import('../settings/state.js');

const savedStateRoot = process.env['STUDIO_STATE_ROOT'];
const savedFirstRun = process.env['STUDIO_FIRST_RUN'];

afterAll(() => {
  // `bun test` runs every suite in one process; a leftover STUDIO_FIRST_RUN answers for later suites.
  restore('STUDIO_STATE_ROOT', savedStateRoot);
  restore('STUDIO_FIRST_RUN', savedFirstRun);
  resetOnboardingCache();
  resetSettingsCache();
  cleanupTempFixtures();
});

function restore(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function useOwnStateRoot(name: string): string {
  const root = makeStateRoot({ name });
  process.env['STUDIO_STATE_ROOT'] = root;
  delete process.env['STUDIO_FIRST_RUN'];
  resetOnboardingCache();
  resetSettingsCache();
  return root;
}

it('preserves a future onboarding record on first completion, read, and reset', () => {
  const root = useOwnStateRoot('onboarding-future');
  const path = join(root, 'onboarding.json');
  const bytes = '{"version":99,"data":{"completedAt":"future","harness":"codex"}}\n';
  writeFileSync(path, bytes);
  completeOnboarding({ harness: 'codex' });
  resetOnboardingCache();
  expect(readOnboardingState()).toEqual({ hasOnboarded: false });
  clearOnboarded();
  expect(readFileSync(path, 'utf8')).toBe(bytes);
  expect(settingsHarness()).toBeUndefined();
});

describe('STUDIO_FIRST_RUN — the forced answer', () => {
  it('reports NOT onboarded over a completed state, and writes nothing', () => {
    const root = useOwnStateRoot('onboarding-forced-show');
    const statePath = join(root, 'onboarding.json');

    completeOnboarding();
    expect(existsSync(statePath)).toBe(true);
    expect(readOnboardingState().hasOnboarded).toBe(true);

    // A 2020 stamp: two `toISOString()` writes in one millisecond would be byte-identical.
    const seeded = JSON.stringify({ completedAt: '2020-01-01T00:00:00.000Z' }, null, 2);
    writeFileSync(statePath, seeded, 'utf8');
    resetOnboardingCache();
    expect(readOnboardingState().hasOnboarded).toBe(true);

    process.env['STUDIO_FIRST_RUN'] = '1';
    resetOnboardingCache();
    expect(readOnboardingState().hasOnboarded).toBe(false);

    completeOnboarding();
    expect(readFileSync(statePath, 'utf8')).toBe(seeded);

    delete process.env['STUDIO_FIRST_RUN'];
    resetOnboardingCache();
    expect(readOnboardingState().hasOnboarded).toBe(true);
  });

  it('reports onboarded without reading disk, which says the opposite', () => {
    const root = useOwnStateRoot('onboarding-forced-skip');
    const statePath = join(root, 'onboarding.json');

    expect(existsSync(statePath)).toBe(false);
    expect(readOnboardingState().hasOnboarded).toBe(false);

    process.env['STUDIO_FIRST_RUN'] = '0';
    resetOnboardingCache();
    expect(readOnboardingState().hasOnboarded).toBe(true);

    completeOnboarding();
    expect(existsSync(statePath)).toBe(false);
  });
});


describe('the recorded harness choice', () => {
  it('persists a choice and reads it back', () => {
    useOwnStateRoot('onboarding-harness-codex');
    completeOnboarding({ harness: 'codex' });
    resetOnboardingCache();
    expect(readOnboardingState()).toEqual({ hasOnboarded: true, harness: 'codex' });
    expect(chosenHarness()).toBe('codex');
  });

  it('records a completion with no choice as no choice, never as claude', () => {
    useOwnStateRoot('onboarding-harness-absent');
    completeOnboarding();
    resetOnboardingCache();
    const state = readOnboardingState();
    expect(state.hasOnboarded).toBe(true);
    expect(state.harness).toBeUndefined();
    expect(chosenHarness()).toBeUndefined();
  });

  it('reports no choice under a forced run, whatever disk says', () => {
    const root = useOwnStateRoot('onboarding-harness-forced');
    completeOnboarding({ harness: 'codex' });
    const seeded = readFileSync(join(root, 'onboarding.json'), 'utf8');
    expect(seeded).toContain('codex');

    for (const forced of ['1', '0']) {
      process.env['STUDIO_FIRST_RUN'] = forced;
      resetOnboardingCache();
      expect(readOnboardingState().harness).toBeUndefined();
      expect(chosenHarness()).toBeUndefined();
    }

    completeOnboarding({ harness: 'claude' });
    expect(readFileSync(join(root, 'onboarding.json'), 'utf8')).toBe(seeded);

    delete process.env['STUDIO_FIRST_RUN'];
    resetOnboardingCache();
    expect(chosenHarness()).toBe('codex');
  });

  it('drops the choice with the completion when onboarding is cleared', () => {
    const root = useOwnStateRoot('onboarding-harness-cleared');
    completeOnboarding({ harness: 'codex' });
    expect(existsSync(join(root, 'onboarding.json'))).toBe(true);

    clearOnboarded();

    expect(existsSync(join(root, 'onboarding.json'))).toBe(false);
    expect(readOnboardingState().hasOnboarded).toBe(false);
    expect(chosenHarness()).toBeUndefined();
    // The sealed completion writes neither the file nor the settings default (ONL-2115).
    completeOnboarding({ harness: 'claude' });
    expect(existsSync(join(root, 'onboarding.json'))).toBe(false);
    resetSettingsCache();
    expect(settingsHarness()).toBe('codex');
  });
});
