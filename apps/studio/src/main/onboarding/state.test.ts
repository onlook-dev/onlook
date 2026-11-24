import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';

const { chosenHarness, clearOnboarded, completeOnboarding, readOnboardingState, resetOnboardingCache, saveOnboardingProgress, prepareOnboardingRecovery } =
  await import('./state.js');
const { resetSettingsCache, settingsHarness } = await import('../settings/state.js');
const { trackRunningLaunch } = await import('../errors/crash-marker.js');

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

it('resumes the first project after a crash without repeating surveys or losing the chosen agent', () => {
  useOwnStateRoot('onboarding-restart');
  saveOnboardingProgress({ resumeAt: 'found' });
  resetOnboardingCache();
  prepareOnboardingRecovery(true);
  expect(readOnboardingState()).toEqual({ hasOnboarded: false, resumeAt: 'found' });
  saveOnboardingProgress({ resumeAt: 'agent' });
  saveOnboardingProgress({ resumeAt: 'import', harness: 'codex' });
  resetOnboardingCache();
  prepareOnboardingRecovery(true);
  expect(readOnboardingState()).toEqual({ hasOnboarded: false, resumeAt: 'import', harness: 'codex' });
  expect(settingsHarness()).toBeUndefined();
  completeOnboarding({ harness: 'codex' });
  resetOnboardingCache();
  expect(readOnboardingState()).toEqual({ hasOnboarded: true, harness: 'codex' });
});

it('a normal quit starts incomplete onboarding without a saved step or agent choice', () => {
  useOwnStateRoot('onboarding-clean-restart');
  saveOnboardingProgress({ resumeAt: 'import', harness: 'codex' });
  resetOnboardingCache();
  prepareOnboardingRecovery(false);
  expect(readOnboardingState()).toEqual({ hasOnboarded: false });
  expect(chosenHarness()).toBeUndefined();
  saveOnboardingProgress({ resumeAt: 'found' });
  resetOnboardingCache();
  prepareOnboardingRecovery(true);
  expect(readOnboardingState()).toEqual({ hasOnboarded: false, resumeAt: 'found' });
});

it('does not resurrect a discarded clean-launch checkpoint after a later crash', () => {
  const root = useOwnStateRoot('onboarding-discarded-progress');
  saveOnboardingProgress({ resumeAt: 'import', harness: 'codex' });
  prepareOnboardingRecovery(false);
  expect(existsSync(join(root, 'onboarding.json'))).toBe(false);
  resetOnboardingCache();
  prepareOnboardingRecovery(true);
  expect(readOnboardingState()).toEqual({ hasOnboarded: false });
  expect(chosenHarness()).toBeUndefined();
});

it('leaves incomplete checkpoints intact when this launch does not own the running marker', () => {
  const root = useOwnStateRoot('onboarding-non-owning-launch');
  saveOnboardingProgress({ resumeAt: 'import', harness: 'codex' });
  const path = join(root, 'onboarding.json');
  const bytes = readFileSync(path, 'utf8');
  const headless = process.env['AGENT_HEADLESS'];
  let launch: ReturnType<typeof trackRunningLaunch>;
  try {
    process.env['AGENT_HEADLESS'] = '1';
    delete process.env['STUDIO_STATE_ROOT'];
    launch = trackRunningLaunch('1.0.0');
  } finally {
    restore('AGENT_HEADLESS', headless);
    process.env['STUDIO_STATE_ROOT'] = root;
  }
  expect(launch).toBeUndefined();
  prepareOnboardingRecovery(launch === undefined ? undefined : launch.previous !== undefined);
  expect(readOnboardingState()).toEqual({ hasOnboarded: false, resumeAt: 'import', harness: 'codex' });
  expect(readFileSync(path, 'utf8')).toBe(bytes);
});

it('recovers from a local crash without an analytics identity and clears the same launch on normal quit', () => {
  useOwnStateRoot('onboarding-local-launch');
  const first = trackRunningLaunch('1.0.0');
  expect(first?.previous).toBeUndefined();
  prepareOnboardingRecovery(first?.previous !== undefined);
  saveOnboardingProgress({ resumeAt: 'import', harness: 'codex' });
  const afterCrash = trackRunningLaunch('1.0.0');
  expect(afterCrash?.previous).toBeDefined();
  prepareOnboardingRecovery(afterCrash?.previous !== undefined);
  expect(readOnboardingState()).toEqual({ hasOnboarded: false, resumeAt: 'import', harness: 'codex' });
  afterCrash?.clear();
  const afterQuit = trackRunningLaunch('1.0.0');
  expect(afterQuit?.previous).toBeUndefined();
  prepareOnboardingRecovery(afterQuit?.previous !== undefined);
  expect(readOnboardingState()).toEqual({ hasOnboarded: false });
  afterQuit?.clear();
});

it('rejects malformed and late onboarding checkpoints and respects forced runs', () => {
  const root = useOwnStateRoot('onboarding-progress-validation');
  saveOnboardingProgress({ resumeAt: 'private text', harness: 'private text' } as never);
  expect(existsSync(join(root, 'onboarding.json'))).toBe(false);
  process.env['STUDIO_FIRST_RUN'] = '1';
  saveOnboardingProgress({ resumeAt: 'import', harness: 'codex' });
  expect(existsSync(join(root, 'onboarding.json'))).toBe(false);
  delete process.env['STUDIO_FIRST_RUN'];
  clearOnboarded();
  saveOnboardingProgress({ resumeAt: 'agent' });
  expect(existsSync(join(root, 'onboarding.json'))).toBe(false);
});

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
