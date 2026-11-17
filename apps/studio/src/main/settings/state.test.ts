import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it, spyOn } from 'bun:test';
import type { HarnessId } from '@studio/events';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';

const {
  clearSettingsHarness,
  discoverCtaResolved,
  resetSettingsCache,
  resolveDiscoverCta,
  setSettingsHarness,
  settingsHarness,
  notificationSoundSettings,
  setNotificationSoundSettings,
  experimentalCodePanel,
  setExperimentalCodePanel,
  analyticsChoiceStored,
  analyticsEnabled,
  analyticsWithdrawn,
  setAnalyticsEnabled,
  storeAnalyticsDefault,
  connectorsNoticeDismissed,
  dismissConnectorsNotice,
  resetTips,
  stampTipsBaseline,
} = await import('./state.js');
const { readGrant } = await import('../telemetry/grant.js');
const stateRootModule = await import('../state/root.js');
const { resolvedHarness } = await import('./resolve.js');
const { settingsState } = await import('./changed.js');
const { chosenHarness, completeOnboarding, resetOnboardingCache } = await import('../onboarding/state.js');

const saved = {
  STUDIO_STATE_ROOT: process.env['STUDIO_STATE_ROOT'],
  STUDIO_FIRST_RUN: process.env['STUDIO_FIRST_RUN'],
  STUDIO_HARNESS: process.env['STUDIO_HARNESS'],
};

afterAll(() => {
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  resetSettingsCache();
  resetOnboardingCache();
  cleanupTempFixtures();
});

function useOwnStateRoot(name: string): string {
  const root = makeStateRoot({ name });
  process.env['STUDIO_STATE_ROOT'] = root;
  delete process.env['STUDIO_FIRST_RUN'];
  delete process.env['STUDIO_HARNESS'];
  resetSettingsCache();
  resetOnboardingCache();
  return root;
}

function settingsPath(root: string): string {
  return join(root, 'settings.json');
}

function seedSettings(root: string, data: unknown): void {
  writeFileSync(settingsPath(root), JSON.stringify({ version: 1, data }), 'utf8');
  resetSettingsCache();
}

describe('connectors notice', () => {
  it('persists dismissal across Projects and a fresh settings read', () => {
    useOwnStateRoot('connectors-notice');
    expect(connectorsNoticeDismissed()).toBe(false);
    dismissConnectorsNotice();
    setSettingsHarness('codex');
    resetSettingsCache();
    expect(connectorsNoticeDismissed()).toBe(true);
    expect(settingsState().connectorsNoticeDismissed).toBe(true);
    expect(settingsHarness()).toBe('codex');
  });
});

describe('resetting tips', () => {
  it('brings back every tip and first-run marker and keeps the notification choice and the Harness', () => {
    const root = useOwnStateRoot('reset-tips');
    seedSettings(root, {
      harness: 'codex',
      analyticsEnabled: false,
      discoverCtaResolved: true,
      tipsPillDismissed: true,
      connectorsNoticeDismissed: true,
      tourSeen: true,
      notifications: { enabled: false, invitation: 'snoozed', snoozedUntil: 99, delivery: 'delivered' },
    });
    resetTips();
    resetSettingsCache();
    const state = settingsState();
    expect(state.discoverCtaResolved).toBeUndefined();
    expect(state.tipsPillDismissed).toBeUndefined();
    expect(state.connectorsNoticeDismissed).toBeUndefined();
    expect(state.tourSeen).toBeUndefined();
    expect(state.notifications).toStrictEqual({ enabled: false, invitation: 'unseen', delivery: 'delivered' });
    expect(state.harness).toBe('codex');
    expect(analyticsEnabled()).toBe(false);
  });

  it('leaves notifications on when they are on', () => {
    const root = useOwnStateRoot('reset-tips-enabled');
    seedSettings(root, { notifications: { enabled: true, invitation: 'dismissed', delivery: 'delivered' } });
    resetTips();
    expect(settingsState().notifications).toStrictEqual({ enabled: true, invitation: 'dismissed', delivery: 'delivered' });
  });
});

describe('the tips baseline (ONL-2960)', () => {
  const at = new Date('2026-11-04T12:00:00.000Z');

  it('records how many projects the install had at its first launch with tip moments, once', () => {
    useOwnStateRoot('tips-baseline-stamp');
    stampTipsBaseline(() => 4, at);
    stampTipsBaseline(() => 9, new Date('2026-11-05T12:00:00.000Z'));
    resetSettingsCache();
    expect(settingsState().tipsBaseline).toStrictEqual({ at: at.toISOString(), projects: 4 });
  });

  it('is rewritten as a new person by Reset tips, and not re-stamped after', () => {
    useOwnStateRoot('tips-baseline-reset');
    stampTipsBaseline(() => 4, at);
    const resetAt = new Date('2026-11-04T13:00:00.000Z');
    resetTips(resetAt);
    stampTipsBaseline(() => 4, at);
    resetSettingsCache();
    expect(settingsState().tipsBaseline).toStrictEqual({ at: resetAt.toISOString(), projects: 0 });
  });

  function asForcedFirstRunOnOwnProfile(run: () => void): void {
    process.env['STUDIO_FIRST_RUN'] = '1';
    const ownProfile = spyOn(stateRootModule, 'stateRootOverridden').mockReturnValue(false);
    try {
      run();
    } finally {
      ownProfile.mockRestore();
      delete process.env['STUDIO_FIRST_RUN'];
    }
  }

  it('reads as no baseline on a forced first run on the person\'s own profile', () => {
    const root = useOwnStateRoot('tips-baseline-forced-read');
    seedSettings(root, { tipsBaseline: { at: at.toISOString(), projects: 4 } });
    asForcedFirstRunOnOwnProfile(() => expect(settingsState().tipsBaseline).toBeUndefined());
    expect(settingsState().tipsBaseline).toStrictEqual({ at: at.toISOString(), projects: 4 });
  });

  it('stamps nothing on a forced first run on the person\'s own profile', () => {
    useOwnStateRoot('tips-baseline-forced-stamp');
    asForcedFirstRunOnOwnProfile(() => stampTipsBaseline(() => 4, at));
    resetSettingsCache();
    expect(settingsState().tipsBaseline).toBeUndefined();
  });

  it('ignores a hand-edited value that is not a baseline', () => {
    const root = useOwnStateRoot('tips-baseline-junk');
    seedSettings(root, { tipsBaseline: { at: 5, projects: 'many' } });
    expect(settingsState().tipsBaseline).toBeUndefined();
    stampTipsBaseline(() => 2, at);
    expect(settingsState().tipsBaseline).toStrictEqual({ at: at.toISOString(), projects: 2 });
  });
});

describe('notification sounds', () => {
  it('a failed write does not replace the saved preference in memory', () => {
    const root = useOwnStateRoot('notification-sound-failed-write');
    setNotificationSoundSettings({ enabled: false, sound: 'two-tone' });
    const blocker = join(root, 'not-a-directory');
    writeFileSync(blocker, 'blocked');
    process.env['STUDIO_STATE_ROOT'] = blocker;
    expect(() => setNotificationSoundSettings({ enabled: true, sound: 'chirp' })).toThrow();
    process.env['STUDIO_STATE_ROOT'] = root;
    expect(notificationSoundSettings()).toEqual({ enabled: false, sound: 'two-tone' });
  });

  it('keeps existing defaults and persists both fields through a cold read', () => {
    const root = useOwnStateRoot('notification-sound');
    expect(notificationSoundSettings()).toBeUndefined();
    setSettingsHarness('codex');
    resolveDiscoverCta();
    setNotificationSoundSettings({ enabled: false, sound: 'two-tone' });
    resetSettingsCache();
    expect(notificationSoundSettings()).toEqual({ enabled: false, sound: 'two-tone' });
    expect(settingsHarness()).toBe('codex');
    expect(discoverCtaResolved()).toBe(true);
    expect(JSON.parse(readFileSync(settingsPath(root), 'utf8')).data.notificationSound).toEqual({ enabled: false, sound: 'two-tone' });
    setSettingsHarness('claude');
    resetSettingsCache();
    expect(notificationSoundSettings()).toEqual({ enabled: false, sound: 'two-tone' });
  });

  it('normalizes corrupt stored preferences and rejects invalid writes', () => {
    const root = useOwnStateRoot('notification-sound-invalid');
    for (const value of [null, [], 'chirp', { enabled: 'yes', sound: 'chirp' }, { enabled: true, sound: 'paused' }]) {
      seedSettings(root, { notificationSound: value });
      expect(notificationSoundSettings()).toEqual({ enabled: true, sound: 'chirp' });
      expect(() => setNotificationSoundSettings(value)).toThrow();
    }
  });
});

describe('experimental Code panel', () => {
  it('defaults off for fresh and pre-existing profiles, and normalizes invalid values', () => {
    const root = useOwnStateRoot('experimental-code-default');
    expect(experimentalCodePanel()).toBe(false);
    for (const value of [undefined, false, 'true', 1, null]) {
      seedSettings(root, { harness: 'codex', experimentalCodePanel: value });
      expect(experimentalCodePanel()).toBe(false);
      expect(settingsState().experimentalCodePanel).toBe(false);
    }
  });

  it('persists both choices and preserves unrelated settings', () => {
    const root = useOwnStateRoot('experimental-code-persist');
    setSettingsHarness('codex');
    resolveDiscoverCta();
    for (const enabled of [true, false]) {
      expect(setExperimentalCodePanel(enabled)).toBe(true);
      resetSettingsCache();
      expect(experimentalCodePanel()).toBe(enabled);
      expect(settingsHarness()).toBe('codex');
      expect(discoverCtaResolved()).toBe(true);
      expect(setExperimentalCodePanel(enabled)).toBe(false);
      expect(JSON.parse(readFileSync(settingsPath(root), 'utf8')).data.experimentalCodePanel).toBe(enabled);
    }
  });

  it('rejects malformed writes without changing the saved choice', () => {
    useOwnStateRoot('experimental-code-validation');
    setExperimentalCodePanel(true);
    for (const value of ['false', 0, null, undefined, {}]) {
      expect(() => setExperimentalCodePanel(value)).toThrow('Invalid Code panel preference');
      expect(experimentalCodePanel()).toBe(true);
    }
  });
});

describe('the settings default', () => {
  it('persists a set and resolves it after a cold read', () => {
    const root = useOwnStateRoot('settings-set');
    expect(resolvedHarness()).toBeUndefined();

    setSettingsHarness('codex');
    expect(existsSync(settingsPath(root))).toBe(true);
    resetSettingsCache();
    expect(settingsHarness()).toBe('codex');
    expect(resolvedHarness()).toBe('codex');

    clearSettingsHarness();
    resetSettingsCache();
    expect(settingsHarness()).toBeUndefined();
    expect(resolvedHarness()).toBeUndefined();
  });

  it('resolves nothing from a fresh root, and writes nothing to answer', () => {
    const root = useOwnStateRoot('settings-fresh');
    expect(settingsHarness()).toBeUndefined();
    expect(resolvedHarness()).toBeUndefined();
    expect(existsSync(settingsPath(root))).toBe(false);
  });

  it('reads a hand-edited unknown value as no default, never codex', () => {
    const root = useOwnStateRoot('settings-garbage');
    seedSettings(root, { harness: 'gpt' });
    expect(settingsHarness()).toBeUndefined();
    expect(resolvedHarness()).toBeUndefined();

    seedSettings(root, 'codex');
    expect(settingsHarness()).toBeUndefined();
    expect(resolvedHarness()).toBeUndefined();
  });

  it('refuses an unknown value on the WRITE too, clearing rather than storing it', () => {
    const root = useOwnStateRoot('settings-write-guard');
    setSettingsHarness('codex');
    expect(settingsHarness()).toBe('codex');

    expect(setSettingsHarness('gpt' as HarnessId)).toBe(true);
    resetSettingsCache();
    expect(settingsHarness()).toBeUndefined();
    expect(resolvedHarness()).toBeUndefined();
    expect(readFileSync(settingsPath(root), 'utf8')).not.toContain('gpt');
  });
});

describe('analytics consent', () => {
  it('defaults to on and preserves a saved opt-out across cache resets', () => {
    const root = useOwnStateRoot('analytics-consent');
    expect(analyticsEnabled()).toBe(true);
    seedSettings(root, { harness: 'codex', analyticsEnabled: false });
    expect(analyticsEnabled()).toBe(false);
    expect(settingsState().analyticsEnabled).toBe(false);
    expect(setAnalyticsEnabled(true)).toBe(true);
    resetSettingsCache();
    expect(analyticsEnabled()).toBe(true);
    expect(settingsHarness()).toBe('codex');
    expect(setAnalyticsEnabled(false)).toBe(true);
    resetSettingsCache();
    expect(analyticsEnabled()).toBe(false);
    expect(setAnalyticsEnabled(false)).toBe(false);
  });

  it('normalizes malformed preferences and rejects non-boolean writes', () => {
    const root = useOwnStateRoot('analytics-invalid');
    seedSettings(root, { analyticsEnabled: 'false' });
    expect(analyticsEnabled()).toBe(true);
    for (const value of [undefined, null, 0, 'false', {}]) {
      expect(() => setAnalyticsEnabled(value)).toThrow('Invalid analytics preference');
    }
  });

  it('mints a fresh grant on each move of the switch, under a clock that never advances', () => {
    useOwnStateRoot('analytics-grant');
    expect(readGrant()).toBeUndefined();
    const clock = spyOn(Date, 'now').mockReturnValue(1_793_169_000_123);
    try {
      const minted: Array<string | undefined> = [];
      for (const value of [false, true, false, true]) {
        expect(setAnalyticsEnabled(value)).toBe(true);
        minted.push(readGrant());
      }
      expect(minted.every((grant) => grant !== undefined && /^[0-9a-f]{32}$/.test(grant))).toBe(true);
      expect(new Set(minted).size).toBe(4);
      resetSettingsCache();
      expect(readGrant()).toBe(minted[3]);
    } finally {
      clock.mockRestore();
    }
  });

  it('withdraws even when the grant cannot be rotated, and refuses to consent again without one', () => {
    const root = useOwnStateRoot('analytics-grant-unwritable');
    expect(setAnalyticsEnabled(false)).toBe(true);
    expect(setAnalyticsEnabled(true)).toBe(true);
    const granted = readGrant();
    const telemetry = join(root, 'telemetry');
    expect(existsSync(telemetry)).toBe(true);
    chmodSync(telemetry, 0o500);
    try {
      expect(setAnalyticsEnabled(false)).toBe(true);
      expect(analyticsWithdrawn()).toBe(true);
      expect(readGrant()).toBe(granted);
      expect(() => setAnalyticsEnabled(true)).toThrow('Analytics preference cannot be saved');
      resetSettingsCache();
      expect(analyticsEnabled()).toBe(false);
    } finally {
      chmodSync(telemetry, 0o700);
    }
  });

  it('records the standing default, and never a choice the file already names', () => {
    const root = useOwnStateRoot('analytics-default');
    expect(analyticsChoiceStored()).toBe(false);
    storeAnalyticsDefault();
    expect(analyticsChoiceStored()).toBe(true);
    expect(analyticsEnabled()).toBe(true);
    resetSettingsCache();
    expect(JSON.parse(readFileSync(settingsPath(root), 'utf8')).data.analyticsEnabled).toBe(true);

    expect(setAnalyticsEnabled(false)).toBe(true);
    storeAnalyticsDefault();
    expect(analyticsEnabled()).toBe(false);
  });

  it('reads an unreadable settings file as neither consented, withdrawn, nor a stored choice', () => {
    const root = useOwnStateRoot('analytics-unreadable');
    writeFileSync(settingsPath(root), '{ this is not json', 'utf8');
    resetSettingsCache();
    expect(analyticsEnabled()).toBe(false);
    expect(analyticsWithdrawn()).toBe(false);
    expect(analyticsChoiceStored()).toBe(false);
    storeAnalyticsDefault();
    expect(analyticsChoiceStored()).toBe(false);
  });

  it('tells an explicit opt-out apart from a readable file that never named one', () => {
    const root = useOwnStateRoot('analytics-withdrawn');
    expect(analyticsWithdrawn()).toBe(false);
    seedSettings(root, { analyticsEnabled: false });
    expect(analyticsWithdrawn()).toBe(true);
    seedSettings(root, { analyticsEnabled: true });
    expect(analyticsWithdrawn()).toBe(false);
    // Present and readable, with every field but the one that names the choice.
    seedSettings(root, { harness: 'codex' });
    expect(analyticsChoiceStored()).toBe(false);
  });

  it('refuses a future-version file, and still withholds collection for the launch', () => {
    const root = useOwnStateRoot('analytics-future');
    const saved = JSON.stringify({ version: 99, data: { analyticsEnabled: true } });
    writeFileSync(settingsPath(root), saved);
    resetSettingsCache();
    expect(() => setAnalyticsEnabled(false)).toThrow('Analytics preference cannot be saved');
    expect(analyticsEnabled()).toBe(false);
    expect(readFileSync(settingsPath(root), 'utf8')).toBe(saved);
    // Nothing durable was recorded, so the next launch reads the newer build's file again.
    resetSettingsCache();
    expect(analyticsEnabled()).toBe(true);
  });

  it('honors an explicit opt-out in a future settings file without overwriting it', () => {
    const root = useOwnStateRoot('analytics-future-off');
    const saved = JSON.stringify({ version: 99, data: { analyticsEnabled: false, harness: 'codex' } });
    writeFileSync(settingsPath(root), saved);
    resetSettingsCache();
    expect(analyticsEnabled()).toBe(false);
    expect(() => setAnalyticsEnabled(true)).toThrow();
    expect(readFileSync(settingsPath(root), 'utf8')).toBe(saved);
    expect(settingsHarness()).toBeUndefined();
  });
});

describe('a settings write keeps its siblings (ONL-2443)', () => {
  function storedSettings(root: string): Record<string, unknown> {
    const envelope = JSON.parse(readFileSync(settingsPath(root), 'utf8')) as { data: unknown };
    return envelope.data as Record<string, unknown>;
  }

  it('changing the harness leaves an unrelated field present and unchanged', () => {
    const root = useOwnStateRoot('settings-sibling-set');
    seedSettings(root, { harness: 'codex', discoverCta: 'dismissed' });

    expect(setSettingsHarness('claude')).toBe(true);
    resetSettingsCache();
    expect(settingsHarness()).toBe('claude');
    expect(storedSettings(root)).toEqual({ harness: 'claude', discoverCta: 'dismissed' });
  });

  it('clearing the harness leaves an unrelated field present and the harness absent', () => {
    const root = useOwnStateRoot('settings-sibling-clear');
    seedSettings(root, { harness: 'codex', discoverCta: 'dismissed' });

    clearSettingsHarness();
    resetSettingsCache();
    expect(settingsHarness()).toBeUndefined();
    expect(storedSettings(root)).toEqual({ discoverCta: 'dismissed' });
  });

  it('setting the stored harness again reports no change and writes nothing', () => {
    const root = useOwnStateRoot('settings-sibling-noop');
    seedSettings(root, { harness: 'codex', discoverCta: 'dismissed' });
    const before = readFileSync(settingsPath(root), 'utf8');

    expect(setSettingsHarness('codex')).toBe(false);
    expect(readFileSync(settingsPath(root), 'utf8')).toBe(before);
  });

  it('writes a clean object over a scalar a hand edit left behind', () => {
    const root = useOwnStateRoot('settings-sibling-scalar');
    seedSettings(root, 'codex');

    resolveDiscoverCta();
    resetSettingsCache();
    expect(storedSettings(root)).toEqual({ discoverCtaResolved: true });
  });

  it('writes a clean object over an array a hand edit left behind', () => {
    const root = useOwnStateRoot('settings-sibling-array');
    seedSettings(root, ['codex']);

    resolveDiscoverCta();
    resetSettingsCache();
    expect(storedSettings(root)).toEqual({ discoverCtaResolved: true });
  });
});

describe('resolution order', () => {
  it('STUDIO_HARNESS beats a stored codex', () => {
    useOwnStateRoot('settings-pin-wins');
    setSettingsHarness('codex');
    expect(resolvedHarness()).toBe('codex');
    process.env['STUDIO_HARNESS'] = 'claude';
    expect(resolvedHarness()).toBe('claude');
    expect(settingsHarness()).toBe('codex');
  });

  it("falls through to onboarding's record when settings holds nothing", () => {
    const root = useOwnStateRoot('settings-onboarding-fallback');
    writeFileSync(
      join(root, 'onboarding.json'),
      JSON.stringify({ completedAt: '2026-08-01T00:00:00.000Z', harness: 'codex' }),
      'utf8',
    );
    resetOnboardingCache();
    expect(chosenHarness()).toBe('codex');
    expect(settingsHarness()).toBeUndefined();
    expect(resolvedHarness()).toBe('codex');
  });

  it('a settings claude beats an onboarding codex', () => {
    const root = useOwnStateRoot('settings-beats-onboarding');
    writeFileSync(
      join(root, 'onboarding.json'),
      JSON.stringify({ completedAt: '2026-08-01T00:00:00.000Z', harness: 'codex' }),
      'utf8',
    );
    resetOnboardingCache();
    setSettingsHarness('claude');
    expect(chosenHarness()).toBe('codex');
    expect(resolvedHarness()).toBe('claude');
  });
});

describe('the discover CTA resolution (ONL-2443)', () => {
  it('reaches disk, so a cold read after a cache reset still reports it resolved', () => {
    const root = useOwnStateRoot('discover-resolve');
    expect(discoverCtaResolved()).toBe(false);

    resolveDiscoverCta();
    resetSettingsCache();
    expect(discoverCtaResolved()).toBe(true);
    const envelope = JSON.parse(readFileSync(settingsPath(root), 'utf8')) as { data: unknown };
    expect(envelope.data).toEqual({ discoverCtaResolved: true });
  });

  it('writes nothing under a forced run with no isolated state root', () => {
    const root = useOwnStateRoot('discover-forced-profile');
    process.env['STUDIO_FIRST_RUN'] = '0';
    delete process.env['STUDIO_STATE_ROOT'];

    resolveDiscoverCta();

    process.env['STUDIO_STATE_ROOT'] = root;
    resetSettingsCache();
    expect(existsSync(settingsPath(root))).toBe(false);
    expect(discoverCtaResolved()).toBe(false);
  });

  it('persists under a forced run when the state root is isolated', () => {
    useOwnStateRoot('discover-forced-isolated');
    process.env['STUDIO_FIRST_RUN'] = '0';

    resolveDiscoverCta();
    resetSettingsCache();
    expect(discoverCtaResolved()).toBe(true);
  });
});

describe('the settings:changed payload (ONL-2443)', () => {
  it('carries the resolution beside the resolved harness', () => {
    useOwnStateRoot('changed-both');
    setSettingsHarness('codex');
    resolveDiscoverCta();
    resetSettingsCache();

    expect(settingsState()).toEqual({ harness: 'codex', discoverCtaResolved: true, experimentalCodePanel: false, analyticsEnabled: true });
  });

  it('still reports the environment-pinned harness', () => {
    useOwnStateRoot('changed-pinned');
    process.env['STUDIO_HARNESS'] = 'claude';

    expect(settingsState()).toEqual({ harness: 'claude', experimentalCodePanel: false, analyticsEnabled: true });
  });

  it("still reports a harness stored only in onboarding's record", () => {
    const root = useOwnStateRoot('changed-onboarding');
    writeFileSync(
      join(root, 'onboarding.json'),
      JSON.stringify({ completedAt: '2026-08-01T00:00:00.000Z', harness: 'codex' }),
      'utf8',
    );
    resetOnboardingCache();

    expect(settingsHarness()).toBeUndefined();
    expect(settingsState()).toEqual({ harness: 'codex', experimentalCodePanel: false, analyticsEnabled: true });
  });
});

describe('onboarding completion writes the default too', () => {
  it('a completion with no choice clears a stored codex', () => {
    const root = useOwnStateRoot('settings-completion-clears');
    setSettingsHarness('codex');
    expect(resolvedHarness()).toBe('codex');

    completeOnboarding({});
    resetSettingsCache();
    resetOnboardingCache();
    expect(settingsHarness()).toBeUndefined();
    expect(resolvedHarness()).toBeUndefined();
    expect(readFileSync(settingsPath(root), 'utf8')).not.toContain('codex');
  });

  it('a completion carrying claude overwrites a stored codex', () => {
    useOwnStateRoot('settings-completion-overwrites');
    setSettingsHarness('codex');

    completeOnboarding({ harness: 'claude' });
    resetSettingsCache();
    resetOnboardingCache();
    expect(settingsHarness()).toBe('claude');
    expect(chosenHarness()).toBe('claude');
    expect(resolvedHarness()).toBe('claude');
  });

  it('under STUDIO_FIRST_RUN a completion leaves settings.json absent', () => {
    const root = useOwnStateRoot('settings-forced-no-write');
    for (const forced of ['1', '0']) {
      process.env['STUDIO_FIRST_RUN'] = forced;
      resetOnboardingCache();
      completeOnboarding({ harness: 'codex' });
      expect(existsSync(settingsPath(root))).toBe(false);
      expect(existsSync(join(root, 'onboarding.json'))).toBe(false);
    }
    setSettingsHarness('codex');
    expect(existsSync(settingsPath(root))).toBe(true);
    resetSettingsCache();
    expect(resolvedHarness()).toBe('codex');
  });
});
