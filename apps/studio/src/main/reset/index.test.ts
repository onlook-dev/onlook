import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import { app } from 'electron';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import { ARTIFACT_FIRST_PAGE_PATH } from '@studio/events';

const { clearResetState, isResetAvailable } = await import('./index.js');
const { discoverCtaResolved, resetSettingsCache, settingsHarness } = await import(
  '../settings/state.js'
);
const { completeOnboarding, readOnboardingState, resetOnboardingCache } = await import(
  '../onboarding/state.js'
);

const savedStateRoot = process.env['STUDIO_STATE_ROOT'];

describe('reset availability by release channel', () => {
  for (const [version, packaged, available] of [
    ['0.2.1-alpha.61', true, true],
    ['0.2.0-beta.3', true, false],
    ['0.1.1-beta.3151', true, false],
    ['0.2.0', true, false],
    ['0.2.0-rc.1', true, false],
    ['0.2.0-alpha.invalid', true, false],
    ['0.2.0', false, true],
  ] as const) {
    it(`reset available=${available} for ${version} packaged=${packaged}`, () => {
      const savedVersion = Object.getOwnPropertyDescriptor(app, 'getVersion');
      const savedPackaged = Object.getOwnPropertyDescriptor(app, 'isPackaged');
      try {
        Object.defineProperty(app, 'getVersion', { configurable: true, value: () => version });
        Object.defineProperty(app, 'isPackaged', { configurable: true, value: packaged });
        expect(isResetAvailable()).toBe(available);
      } finally {
        if (savedVersion) Object.defineProperty(app, 'getVersion', savedVersion);
        else Reflect.deleteProperty(app, 'getVersion');
        if (savedPackaged) Object.defineProperty(app, 'isPackaged', savedPackaged);
        else Reflect.deleteProperty(app, 'isPackaged');
      }
    });
  }
});

afterAll(() => {
  if (savedStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = savedStateRoot;
  resetSettingsCache();
  resetOnboardingCache();
  cleanupTempFixtures();
});

function useOwnStateRoot(name: string): string {
  const root = makeStateRoot({ name });
  process.env['STUDIO_STATE_ROOT'] = root;
  resetSettingsCache();
  resetOnboardingCache();
  return root;
}

function settingsPath(root: string): string {
  return join(root, 'settings.json');
}

function storedSettings(root: string): Record<string, unknown> {
  const envelope = JSON.parse(readFileSync(settingsPath(root), 'utf8')) as { data: unknown };
  return envelope.data as Record<string, unknown>;
}

function seedSettings(root: string, data: unknown): void {
  writeFileSync(settingsPath(root), JSON.stringify({ version: 1, data }), 'utf8');
  resetSettingsCache();
}

describe("a reset's state clear (ONL-2443)", () => {
  it('leaves a resolved discover card unresolved', () => {
    const root = useOwnStateRoot('reset-discover');
    seedSettings(root, { discoverCtaResolved: true });
    expect(discoverCtaResolved()).toBe(true);

    clearResetState();
    resetSettingsCache();

    expect(discoverCtaResolved()).toBe(false);
    expect(storedSettings(root)).toEqual({});
  });

  it('leaves a stored harness untouched', () => {
    const root = useOwnStateRoot('reset-discover-keeps-harness');
    seedSettings(root, { harness: 'codex', discoverCtaResolved: true });

    clearResetState();
    resetSettingsCache();

    expect(settingsHarness()).toBe('codex');
    expect(storedSettings(root)).toEqual({ harness: 'codex' });
  });

  it('still clears onboarding when the settings write fails, and reports the failure', () => {
    const root = useOwnStateRoot('reset-partial-failure');
    completeOnboarding({ harness: 'codex' });
    expect(readOnboardingState().hasOnboarded).toBe(true);
    /* A directory where the file goes: the atomic write cannot replace it, so the clear throws. */
    rmSync(settingsPath(root), { force: true });
    mkdirSync(settingsPath(root), { recursive: true });
    resetSettingsCache();

    expect(() => {
      clearResetState();
    }).toThrow();

    resetOnboardingCache();
    expect(readOnboardingState().hasOnboarded).toBe(false);
  });
});

describe('a Reset preserves artifacts and unrelated state (ONL-2568)', () => {
  it('clears onboarding and discover resolution without removing artifact bytes or neighbouring state', () => {
    const root = useOwnStateRoot('reset-preserves-artifacts');
    const artifact = join(root, 'artifacts', 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa');
    mkdirSync(join(artifact, 'pages'), { recursive: true });
    writeFileSync(join(artifact, ARTIFACT_FIRST_PAGE_PATH), '<h1>the work</h1>');
    writeFileSync(join(artifact, 'manifest.json'), '{"id":"x"}');
    writeFileSync(join(root, 'artifacts-index.json'), '{"version":1,"data":{"artifacts":{}}}');
    writeFileSync(join(root, 'panels.json'), '{"version":1,"data":{"sidebar":220,"end":480}}');
    seedSettings(root, { harness: 'claude', discoverCtaResolved: true });
    completeOnboarding({ harness: 'claude' });
    expect(readOnboardingState().hasOnboarded).toBe(true);
    expect(discoverCtaResolved()).toBe(true);

    clearResetState();
    resetOnboardingCache();
    resetSettingsCache();

    expect(readOnboardingState().hasOnboarded).toBe(false);
    expect(existsSync(join(root, 'onboarding.json'))).toBe(false);
    expect(discoverCtaResolved()).toBe(false);
    expect(settingsHarness()).toBe('claude');
    expect(readFileSync(join(artifact, ARTIFACT_FIRST_PAGE_PATH), 'utf8')).toBe('<h1>the work</h1>');
    expect(readFileSync(join(artifact, 'manifest.json'), 'utf8')).toBe('{"id":"x"}');
    expect(readFileSync(join(root, 'artifacts-index.json'), 'utf8')).toBe('{"version":1,"data":{"artifacts":{}}}');
    expect(readFileSync(join(root, 'panels.json'), 'utf8')).toBe('{"version":1,"data":{"sidebar":220,"end":480}}');
  });
});
