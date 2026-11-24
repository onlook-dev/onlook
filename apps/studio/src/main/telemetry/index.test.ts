import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import os from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import type { AppLike } from './index.js';

const { resetIdentityCache, writeIdentity } = await import('../identity/store.js');
const { peekLinesForTesting, recordLinesForTesting, resetLogForTesting } = await import('../log/index.js');
const {
  adoptSessionId,
  capture,
  captureDurable,
  correlation,
  currentSessionId,
  currentTelemetryConfig,
  flush,
  identifyPerson,
  initTelemetry,
  noteAppShown,
  peekQueueForTesting,
  prepareTelemetry,
  recordActivationSurface,
  recordDeadEndShown,
  resetTelemetryForTesting,
  refreshTelemetryConsent,
  receiveWebAttribution,
  setAppForTesting,
  setTelemetryRendererWorkspace,
  showTelemetryRenderer,
  shutdownTelemetry,
  workspaceTelemetryId,
} = await import('./index.js');
const { views, workspaceOf } = await import('../tabs/views.js');
const { rememberProject, resetWorkspaceCache } = await import('../workspace/store.js');
const { isUuidV7 } = await import('./session-id.js');
const { primeFlags, resetFlagsForTesting } = await import('../flags/index.js');
const { outboxDir, pendingBatches, readBatch } = await import('./outbox.js');
const { analyticsEnabled, dismissTipsPill, resetSettingsCache, setAnalyticsEnabled } = await import('../settings/state.js');
const { readWebAttribution } = await import('./attribution.js');
const { createQuitTeardown } = await import('../quit-teardown.js');
const { claimRunningMarker, runningMarkerPath } = await import('../errors/crash-marker.js');
const { composeReport } = await import('../report/payload.js');
const { setLocale } = await import('@studio/i18n');

const made: string[] = [];

function makeRoot(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `studio-telemetry-${name}-`));
  made.push(root);
  return root;
}

function fakeApp(userData: string): AppLike {
  return {
    getPath: () => userData,
    getVersion: () => '0.0.0-test',
    getLocale: () => 'en-US',
    isPackaged: false,
  };
}

const ENV_KEYS = [
  'STUDIO_STATE_ROOT',
  'STUDIO_POSTHOG_KEY',
  'STUDIO_POSTHOG_HOST',
  'STUDIO_TELEMETRY',
  'MAIN_VITE_POSTHOG_KEY',
  'AGENT_HEADLESS',
  'STUDIO_TELEMETRY_HEADLESS',
  'STUDIO_FLAGS',
  'MAIN_VITE_FLAG_DEFAULTS',
] as const;
const originalEnv = new Map<string, string | undefined>(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

let fetchCalls = 0;
const realFetch = globalThis.fetch;

const warnings = (): Array<Record<string, unknown>> =>
  peekLinesForTesting().filter((line) => line.subsystem === 'telemetry' && line.level === 'warn');

const offline = (): void => {
  globalThis.fetch = (() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
};

describe('analytics consent', () => {
  function statePath(name: string): string {
    return join(process.env['STUDIO_STATE_ROOT']!, name);
  }

  function recordPosts(): string[] {
    const posted: string[] = [];
    globalThis.fetch = ((_url: unknown, init: { body: string }) => {
      fetchCalls += 1;
      posted.push(init.body);
      return Promise.resolve(new Response('{"status":1}'));
    }) as unknown as typeof fetch;
    return posted;
  }

  it('never sends a withdrawn batch whose file could not be erased, and keeps delivering new events', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    offline();
    initTelemetry();
    capture('dead_end_shown', { state: 'other' });
    await flush();
    const withdrawn = pendingBatches();
    expect(withdrawn).toHaveLength(1);

    // Readable but unwritable, so the withdrawal's erase fails and the batch survives.
    chmodSync(outboxDir(), 0o500);
    try {
      setAnalyticsEnabled(false);
      refreshTelemetryConsent();
      expect(pendingBatches()).toEqual(withdrawn);

      const posted = recordPosts();
      setAnalyticsEnabled(true);
      refreshTelemetryConsent();
      await flush();
      capture('frame_tool_armed', {});
      await flush();

      expect(posted.some((body) => body.includes('dead_end_shown'))).toBe(false);
      expect(posted.some((body) => body.includes('frame_tool_armed'))).toBe(true);
      expect(pendingBatches()).toEqual(withdrawn);
    } finally {
      chmodSync(outboxDir(), 0o700);
    }
  });

  it('keeps an unerased withdrawn batch unsent across a relaunch', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    offline();
    initTelemetry();
    capture('dead_end_shown', { state: 'other' });
    await flush();
    expect(pendingBatches()).toHaveLength(1);

    chmodSync(outboxDir(), 0o500);
    try {
      setAnalyticsEnabled(false);
      refreshTelemetryConsent();
      expect(pendingBatches()).toHaveLength(1);
      setAnalyticsEnabled(true);

      // The relaunch: module state goes, the settings file and the undeleted batch stay.
      const posted = recordPosts();
      relaunch();
      await flush();

      expect(posted.some((body) => body.includes('dead_end_shown'))).toBe(false);
      expect(posted.some((body) => body.includes('app_opened'))).toBe(true);
    } finally {
      chmodSync(outboxDir(), 0o700);
    }
  });

  it('still replays a batch written after analytics was switched back on', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    setAnalyticsEnabled(false);
    refreshTelemetryConsent();
    setAnalyticsEnabled(true);
    refreshTelemetryConsent();
    offline();
    capture('frame_tool_armed', {});
    await flush();
    expect(pendingBatches()).toHaveLength(1);

    const posted = recordPosts();
    await flush();

    expect(pendingBatches()).toEqual([]);
    expect(posted.some((body) => body.includes('frame_tool_armed'))).toBe(true);
  });

  function relaunch(): void {
    resetTelemetryForTesting();
    resetIdentityCache();
    resetSettingsCache();
    initTelemetry();
  }

  it('delivers a batch the previous launch could not send, and leaves nothing stale behind', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    offline();
    initTelemetry();
    capture('frame_tool_armed', {});
    await flush();
    expect(pendingBatches()).toHaveLength(1);

    const posted = recordPosts();
    relaunch();
    await flush();
    expect(posted.some((body) => body.includes('frame_tool_armed'))).toBe(true);
    expect(pendingBatches()).toEqual([]);
  });

  it('never revives a withdrawn batch through a quarantined preference file and a launch that finds none', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    const settings = statePath('settings.json');
    offline();
    initTelemetry();
    capture('dead_end_shown', { state: 'other' });
    await flush();
    expect(pendingBatches()).toHaveLength(1);
    // A batch from a build that stamped no grant into the name at all.
    const legacy = [{ event: 'legacy_event', properties: {}, timestamp: '2026-10-20T00:00:00.000Z', uuid: 'legacy-uuid', distinct_id: 'person' }];
    writeFileSync(join(outboxDir(), 'legacy-000001.json'), JSON.stringify({ version: 1, data: { batch: legacy } }), 'utf8');

    chmodSync(outboxDir(), 0o500);
    let kept: string[];
    try {
      setAnalyticsEnabled(false);
      refreshTelemetryConsent();
      kept = pendingBatches();
      expect(kept).toHaveLength(2);
    } finally {
      chmodSync(outboxDir(), 0o700);
    }

    // The preference file is corrupt, so this launch is set aside with nothing to say about consent.
    writeFileSync(settings, '{ this is not json', 'utf8');
    const posted = recordPosts();
    relaunch();
    await flush();
    expect(posted).toEqual([]);
    expect(pendingBatches()).toEqual(kept);

    // The quarantine left no preference file, so this launch reads analytics as on by default.
    expect(existsSync(settings)).toBe(false);
    relaunch();
    await flush();
    expect(posted.some((body) => body.includes('dead_end_shown'))).toBe(false);
    expect(posted.some((body) => body.includes('legacy_event'))).toBe(false);
    expect(posted.some((body) => body.includes('app_opened'))).toBe(true);
    expect(pendingBatches()).toEqual([]);
  });

  it('never reuses a grant the preference file no longer records a choice for', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    offline();
    initTelemetry();
    capture('dead_end_shown', { state: 'other' });
    await flush();
    const kept = pendingBatches();
    expect(kept).toHaveLength(1);

    // Neither the grant nor the batch can be written from here on, while the state root stays writable.
    chmodSync(outboxDir(), 0o500);
    chmodSync(statePath('telemetry'), 0o500);
    const posted = recordPosts();
    try {
      // The withdrawal lands even though the rotation and the erase both fail.
      expect(setAnalyticsEnabled(false)).toBe(true);
      refreshTelemetryConsent();
      expect(pendingBatches()).toEqual(kept);

      writeFileSync(statePath('settings.json'), '{ this is not json', 'utf8');
      relaunch();
      await flush();
      expect(posted).toEqual([]);
      expect(existsSync(statePath('settings.json'))).toBe(false);

      // Analytics reads as on by default again, with no explicit re-enable anywhere.
      relaunch();
      await flush();
      expect(posted.some((body) => body.includes('dead_end_shown'))).toBe(false);
      expect(posted.some((body) => body.includes('app_opened'))).toBe(true);
      // Still on disk and refused, rather than swept out from under the assertion.
      expect(pendingBatches()).toEqual(kept);
    } finally {
      chmodSync(statePath('telemetry'), 0o700);
      chmodSync(outboxDir(), 0o700);
    }
  });

  it('stops collecting when a withdrawal cannot be saved at all', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    await flush();
    const posted = recordPosts();

    // Nothing in the state root can be written from here on, so the preference itself cannot land.
    chmodSync(process.env['STUDIO_STATE_ROOT']!, 0o500);
    try {
      // The version gate passes and the write itself fails, which is the case a retry cannot clear.
      expect(() => setAnalyticsEnabled(false)).toThrow(/EACCES/);
      refreshTelemetryConsent();
      capture('dead_end_shown', { state: 'other' });
      await flush();

      expect(analyticsEnabled()).toBe(false);
      expect(currentTelemetryConfig()).toEqual({ enabled: false });
      expect(posted).toEqual([]);
    } finally {
      chmodSync(process.env['STUDIO_STATE_ROOT']!, 0o700);
    }
  });

  it('keeps a settings file it could not read fail-closed through another preference write', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    writeFileSync(statePath('settings.json'), '{ this is not json', 'utf8');
    resetSettingsCache();
    const posted = recordPosts();
    initTelemetry();
    expect(currentTelemetryConfig()).toEqual({ enabled: false });

    // The quarantine cleared the store's fallback flag; an unrelated preference lands on top of it.
    dismissTipsPill();
    capture('dead_end_shown', { state: 'other' });
    await flush();

    expect(analyticsEnabled()).toBe(false);
    expect(currentTelemetryConfig()).toEqual({ enabled: false });
    expect(posted).toEqual([]);
  });

  it('never reuses a grant through a preference file another setting wrote back', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    offline();
    initTelemetry();
    capture('dead_end_shown', { state: 'other' });
    await flush();
    const kept = pendingBatches();
    expect(kept).toHaveLength(1);

    chmodSync(outboxDir(), 0o500);
    try {
      chmodSync(statePath('telemetry'), 0o500);
      try {
        expect(setAnalyticsEnabled(false)).toBe(true);
        refreshTelemetryConsent();
        expect(pendingBatches()).toEqual(kept);
      } finally {
        // Only the outbox stays stuck: the next launch can mint again, and the withdrawn batch is still there.
        chmodSync(statePath('telemetry'), 0o700);
      }

      writeFileSync(statePath('settings.json'), '{ this is not json', 'utf8');
      const posted = recordPosts();
      relaunch();
      // The quarantine took the choice with it, and an unrelated preference writes the file back without one.
      dismissTipsPill();
      expect(readFileSync(statePath('settings.json'), 'utf8')).not.toContain('analyticsEnabled');

      relaunch();
      await flush();
      expect(posted.some((body) => body.includes('dead_end_shown'))).toBe(false);
      expect(posted.some((body) => body.includes('app_opened'))).toBe(true);
    } finally {
      chmodSync(outboxDir(), 0o700);
    }
  });

  it('keeps a withdrawal effective across a relaunch when the grant cannot be rotated', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    offline();
    initTelemetry();
    capture('dead_end_shown', { state: 'other' });
    await flush();
    const kept = pendingBatches();
    expect(kept).toHaveLength(1);

    chmodSync(outboxDir(), 0o500);
    chmodSync(statePath('telemetry'), 0o500);
    const posted = recordPosts();
    try {
      expect(setAnalyticsEnabled(false)).toBe(true);
      refreshTelemetryConsent();
      relaunch();
      await flush();
      capture('frame_tool_armed', {});
      await flush();

      expect(posted).toEqual([]);
      expect(analyticsEnabled()).toBe(false);
      expect(pendingBatches()).toEqual(kept);
    } finally {
      chmodSync(statePath('telemetry'), 0o700);
      chmodSync(outboxDir(), 0o700);
    }
  });

  it('sends under one grant on a launch that cannot record its choice', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    // A preference file from a newer build: readable, never written over, so no choice of this launch's is recorded.
    writeFileSync(statePath('settings.json'), JSON.stringify({ version: 99, data: {} }), 'utf8');
    const posted = recordPosts();
    initTelemetry();
    capture('frame_tool_armed', {});
    await flush();

    expect(posted.some((body) => body.includes('frame_tool_armed'))).toBe(true);
    expect(pendingBatches()).toEqual([]);
    expect(readFileSync(statePath('settings.json'), 'utf8')).toContain('"version":99');
  });

  it('delivers a batch across a relaunch after an explicit opt-in', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    setAnalyticsEnabled(false);
    refreshTelemetryConsent();
    setAnalyticsEnabled(true);
    refreshTelemetryConsent();
    offline();
    capture('frame_tool_armed', {});
    await flush();
    expect(pendingBatches()).toHaveLength(1);

    const posted = recordPosts();
    relaunch();
    await flush();
    expect(posted.some((body) => body.includes('frame_tool_armed'))).toBe(true);
    expect(pendingBatches()).toEqual([]);
  });

  it('never revives a batch between two withdrawals a frozen clock cannot tell apart', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    const clock = spyOn(Date, 'now').mockReturnValue(1_793_169_000_123);
    try {
      offline();
      initTelemetry();
      setAnalyticsEnabled(false);
      refreshTelemetryConsent();
      setAnalyticsEnabled(true);
      refreshTelemetryConsent();
      capture('dead_end_shown', { state: 'other' });
      await flush();
      const between = pendingBatches();
      expect(between).toHaveLength(1);

      // Readable but unwritable from here on: no erase the switch attempts can land.
      chmodSync(outboxDir(), 0o500);
      try {
        setAnalyticsEnabled(false);
        refreshTelemetryConsent();
        expect(pendingBatches()).toEqual(between);

        const posted = recordPosts();
        setAnalyticsEnabled(true);
        refreshTelemetryConsent();
        await flush();
        expect(pendingBatches()).toEqual(between);
        expect(posted.some((body) => body.includes('dead_end_shown'))).toBe(false);

        relaunch();
        await flush();
        expect(posted.some((body) => body.includes('dead_end_shown'))).toBe(false);
        expect(posted.some((body) => body.includes('app_opened'))).toBe(true);
      } finally {
        chmodSync(outboxDir(), 0o700);
      }
    } finally {
      clock.mockRestore();
    }
  });

  it('starts opted out without events, replay config, or remote requests', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    setAnalyticsEnabled(false);
    initTelemetry();
    capture('app_opened', { is_first_launch: false, locale: 'en-US' });
    expect(await captureDurable('app_closed', { duration_ms: 1, session_duration_seconds: 0, last_surface: 'setup' })).toBe('disabled');
    await flush();
    expect(currentTelemetryConfig()).toEqual({ enabled: false });
    expect(peekQueueForTesting()).toEqual([]);
    expect(fetchCalls).toBe(0);
  });

  it('discards queued events and durable retry batches before resuming', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    offline();
    initTelemetry();
    await flush();
    expect(pendingBatches().length).toBeGreaterThan(0);
    capture('dead_end_shown', { state: 'other' });
    setAnalyticsEnabled(false);
    refreshTelemetryConsent();
    expect(peekQueueForTesting()).toEqual([]);
    expect(pendingBatches()).toEqual([]);
    capture('dead_end_shown', { state: 'setup_failed' });
    setAnalyticsEnabled(true);
    refreshTelemetryConsent();
    expect(currentTelemetryConfig().enabled).toBe(true);
    expect(peekQueueForTesting().some((event) => event.event === 'dead_end_shown')).toBe(false);
    capture('dead_end_shown', { state: 'other' });
    expect(peekQueueForTesting().some((event) => event.event === 'dead_end_shown')).toBe(true);
  });

  it('aborts an in-flight send and does not drain another pending batch', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    let signal: AbortSignal | undefined;
    let announceSend: (() => void) | undefined;
    const started = new Promise<void>((resolve) => { announceSend = resolve; });
    globalThis.fetch = ((_url: unknown, options: RequestInit) => {
      fetchCalls += 1;
      signal = options.signal ?? undefined;
      announceSend?.();
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      });
    }) as unknown as typeof fetch;
    const pending = flush();
    await started;
    expect(signal?.aborted).toBe(false);
    setAnalyticsEnabled(false);
    refreshTelemetryConsent();
    expect(signal?.aborted).toBe(true);
    await pending;
    expect(pendingBatches()).toEqual([]);
    expect(fetchCalls).toBe(1);
  });

  it('does not override an environment opt-out when the switch is enabled', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    process.env['STUDIO_TELEMETRY'] = '0';
    setAnalyticsEnabled(false);
    refreshTelemetryConsent();
    setAnalyticsEnabled(true);
    refreshTelemetryConsent();
    expect(currentTelemetryConfig()).toEqual({ enabled: false });
    capture('dead_end_shown', { state: 'other' });
    expect(peekQueueForTesting()).toEqual([]);
    expect(fetchCalls).toBe(0);
  });

  it('does not retain website attribution received while opted out for a later opt-in', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    setAnalyticsEnabled(false);
    initTelemetry();
    receiveWebAttribution(new URLSearchParams({ ph_id: 'off-web-id', utm_source: 'off-source' }));
    expect(readWebAttribution()).toBeUndefined();
    setAnalyticsEnabled(true);
    refreshTelemetryConsent();
    expect(peekQueueForTesting().some((event) => JSON.stringify(event).includes('off-source'))).toBe(false);
  });
});

beforeEach(() => {
  resetTelemetryForTesting();
  resetLogForTesting();
  recordLinesForTesting();
  // The store caches its one read for the process; an identity written by a sibling suite would leak a `$set` in here.
  resetIdentityCache();
  for (const key of ENV_KEYS) delete process.env[key];
  process.env['STUDIO_STATE_ROOT'] = makeRoot('state');
  resetSettingsCache();
  setAppForTesting(fakeApp(makeRoot('userdata')));
  fetchCalls = 0;
  globalThis.fetch = (() => {
    fetchCalls += 1;
    return Promise.resolve(new Response('{"status":1}'));
  }) as unknown as typeof fetch;
});

afterEach(() => {
  mock.restore();
  resetTelemetryForTesting();
  resetLogForTesting();
  setAppForTesting(undefined);
  globalThis.fetch = realFetch;
  for (const key of ENV_KEYS) {
    const value = originalEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

it('preserves future install metadata through prepare, replay, and shutdown', async () => {
  const root = makeRoot('future-install');
  const path = join(root, 'install-id');
  const bytes = '{"version":99,"data":"future-install"}\n';
  writeFileSync(path, bytes);
  setAppForTesting(fakeApp(root));
  process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
  prepareTelemetry();
  expect(correlation()?.installId).not.toBe('future-install');
  initTelemetry();
  await shutdownTelemetry();
  expect(readFileSync(path, 'utf8')).toBe(bytes);
});

it('keeps legacy plain install ids and writes new ids in an envelope', () => {
  const root = makeRoot('legacy-install');
  const path = join(root, 'install-id');
  writeFileSync(path, 'legacy-install-id\n');
  setAppForTesting(fakeApp(root));
  prepareTelemetry();
  expect(correlation()?.installId).toBe('legacy-install-id');
  expect(readFileSync(path, 'utf8')).toBe('legacy-install-id\n');
  resetTelemetryForTesting();
  const nextRoot = makeRoot('new-install');
  setAppForTesting(fakeApp(nextRoot));
  prepareTelemetry();
  expect(JSON.parse(readFileSync(join(nextRoot, 'install-id'), 'utf8'))).toEqual({ version: 1, data: correlation()?.installId });
});

describe('super properties', () => {
  it('includes cached machine properties on every event without the raw CPU model', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    const model = 'Apple M4 Max';
    const cpuRead = spyOn(os, 'cpus').mockReturnValue([
      { model, speed: 0, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } },
    ]);
    let translationReads = 0;
    setAppForTesting({
      ...fakeApp(makeRoot('hardware')),
      get runningUnderARM64Translation() {
        translationReads += 1;
        return true;
      },
    });
    prepareTelemetry();
    initTelemetry();
    initTelemetry();
    cpuRead.mockReturnValue([]);
    capture('frame_tool_armed', {});
    const events = peekQueueForTesting();
    expect(events.map((event) => event.event)).toEqual(['app_opened', 'frame_tool_armed']);
    for (const event of events) {
      expect(event.properties['under_rosetta']).toBe(process.platform === 'darwin');
      expect(event.properties['cpu_family']).toBe('apple-m4');
      expect(event.properties['arch']).toBe(process.arch);
      expect(JSON.stringify(event)).not.toContain(model);
    }
    expect(cpuRead).toHaveBeenCalledTimes(1);
    expect(translationReads).toBe(process.platform === 'darwin' ? 1 : 0);
  });

  it('uses other when the CPU list is unavailable', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    spyOn(os, 'cpus').mockReturnValue([]);
    initTelemetry();
    expect(peekQueueForTesting()[0]?.properties['cpu_family']).toBe('other');
    expect(peekQueueForTesting()[0]?.properties['under_rosetta']).toBe(false);
  });

  it('opt-out suppresses machine properties, hardware reads and network sends', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    process.env['STUDIO_TELEMETRY'] = '0';
    const cpuRead = spyOn(os, 'cpus');
    let translationReads = 0;
    setAppForTesting({
      ...fakeApp(makeRoot('hardware-off')),
      get runningUnderARM64Translation() {
        translationReads += 1;
        return true;
      },
    });
    initTelemetry();
    capture('frame_tool_armed', {});
    await flush();
    expect(peekQueueForTesting()).toEqual([]);
    expect(cpuRead).not.toHaveBeenCalled();
    expect(translationReads).toBe(0);
    expect(fetchCalls).toBe(0);
  });

  it('crash provenance overrides the reporting release, including a versionless legacy marker', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const previousId = '0199e1e0-0000-7000-8000-000000000001';
    claimRunningMarker(previousId, '0.4.0');
    const previous = claimRunningMarker(correlation()!.launchId, '0.0.0-test')!;
    capture('crash_detected', { previous_launch_id: previous.launchId, app_version: previous.appVersion, reporter_app_version: '0.0.0-test' });
    writeFileSync(runningMarkerPath(), previousId);
    const legacy = claimRunningMarker(correlation()!.launchId, '0.0.0-test')!;
    capture('crash_detected', { previous_launch_id: legacy.launchId, app_version: legacy.appVersion, reporter_app_version: '0.0.0-test' });
    const crashes = peekQueueForTesting().filter((event) => event.event === 'crash_detected');
    expect(crashes.map((event) => [event.properties['app_version'], event.properties['reporter_app_version']])).toEqual([
      ['0.4.0', '0.0.0-test'],
      [null, '0.0.0-test'],
    ]);
  });

  it("every queued event carries platform: 'desktop', native $os, and an honest $lib", () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    capture('frame_tool_armed', {});

    const events = peekQueueForTesting();
    expect(events.map((event) => event.event)).toEqual(['app_opened', 'frame_tool_armed']);
    for (const event of events) {
      expect(event.properties['platform']).toBe('desktop');
      const osNames: Record<string, string> = {
        darwin: 'Mac OS X',
        win32: 'Windows',
        linux: 'Linux',
      };
      expect(event.properties['$os']).toBe(osNames[process.platform] ?? process.platform);
      expect(event.properties['$lib']).toBe('studio-desktop');
    }
    for (const event of events) {
      expect(event.properties['platform']).not.toBe(process.platform);
      expect(event.properties['os']).toBe(event.properties['$os']);
      expect(event.properties['os_version']).toBeString();
    }
  });
});

describe('person processing (the anonymous window)', () => {
  it('before any identity exists, every event opts out of person processing', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    capture('frame_tool_armed', {});

    const events = peekQueueForTesting();
    expect(events).toHaveLength(2);
    for (const event of events) {
      expect(event.properties['$process_person_profile']).toBe(false);
    }
  });

  it('an identity — either door — closes the window for every later event', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    capture('frame_tool_armed', {});
    identifyPerson(writeIdentity({ email: 'wren@example.com', source: 'manual' }));
    capture('frame_tool_armed', {});

    const [before, , after] = peekQueueForTesting();
    expect(before?.properties['$process_person_profile']).toBe(false);
    expect(after?.properties['$process_person_profile']).toBeUndefined();

    resetTelemetryForTesting();
    initTelemetry();
    const [appOpened] = peekQueueForTesting();
    expect(appOpened?.event).toBe('app_opened');
    expect(appOpened?.properties['$process_person_profile']).toBeUndefined();
  });
});

describe("app_opened's languages", () => {
  afterEach(() => setLocale(undefined));

  it('reports the language on screen beside the system locale, English while none was chosen', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    expect(peekQueueForTesting()[0]?.properties).toMatchObject({ locale: 'en-US', ui_language: 'en' });

    resetTelemetryForTesting();
    setLocale('ja');
    initTelemetry();
    expect(peekQueueForTesting()[0]?.properties).toMatchObject({ locale: 'en-US', ui_language: 'ja' });
  });
});

describe('the off-switches', () => {
  it('no key: capture queues nothing and flush never fetches', async () => {
    initTelemetry();
    capture('frame_tool_armed', {});

    expect(peekQueueForTesting()).toHaveLength(0);
    await flush();
    expect(fetchCalls).toBe(0);
  });

  it('a packaged build with no env carries the checked-in prod token', () => {
    setAppForTesting({ ...fakeApp(makeRoot('packaged')), isPackaged: true });
    initTelemetry();

    const [appOpened] = peekQueueForTesting();
    expect(appOpened?.event).toBe('app_opened');
    expect(appOpened?.properties['is_packaged']).toBe(true);
  });

  it('STUDIO_TELEMETRY=0 silences a packaged build too — the hard off outranks the checked-in token', async () => {
    process.env['STUDIO_TELEMETRY'] = '0';
    setAppForTesting({ ...fakeApp(makeRoot('packaged-off')), isPackaged: true });
    initTelemetry();
    capture('frame_tool_armed', {});

    expect(peekQueueForTesting()).toHaveLength(0);
    await flush();
    expect(fetchCalls).toBe(0);
  });

  it('STUDIO_TELEMETRY=0 wins over a present key', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    process.env['STUDIO_TELEMETRY'] = '0';
    initTelemetry();
    capture('frame_tool_armed', {});

    expect(peekQueueForTesting()).toHaveLength(0);
    await flush();
    expect(fetchCalls).toBe(0);
  });
});

describe('flush', () => {
  it('drains a queue from capture(), then replays the kept batch on an empty queue', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    prepareTelemetry();
    globalThis.fetch = (() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    capture('frame_tool_armed', {});
    await flush();

    expect(peekQueueForTesting()).toHaveLength(0);
    expect(pendingBatches()).toHaveLength(1);

    const bodies: string[] = [];
    globalThis.fetch = ((_url: string, init: { body: string }) => {
      bodies.push(init.body);
      return Promise.resolve(new Response('{"status":1}'));
    }) as unknown as typeof fetch;
    await flush();

    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain('frame_tool_armed');
    expect(pendingBatches()).toHaveLength(0);
  });

  it('a non-2xx response warns with the status and the batch stays dropped', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    expect(peekQueueForTesting()).toHaveLength(1);

    globalThis.fetch = (() => {
      fetchCalls += 1;
      return Promise.resolve(new Response('revoked', { status: 401 }));
    }) as unknown as typeof fetch;
    await flush();
    expect(fetchCalls).toBe(1);
    expect(warnings()).toHaveLength(1);
    const line = warnings()[0]!;
    expect(line['status']).toBe(401);
    // The body and the URL stay out of the line.
    expect(JSON.stringify(line)).not.toContain('revoked');
    expect(JSON.stringify(line)).not.toContain('posthog');

    expect(peekQueueForTesting()).toHaveLength(0);
    await flush();
    expect(fetchCalls).toBe(1);
  });

  function queueMergeBatch(): void {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    const identity = writeIdentity({
      email: 'wren@example.com',
      source: 'provider',
      subject: 'user_workos123',
      previousSubject: 'ext_neon_42',
    });
    initTelemetry();
    // The merge rides the provider's answer, never the record alone (ONL-2882).
    identifyPerson(identity);
    expect(peekQueueForTesting().map((event) => event.event)).toEqual([
      'app_opened',
      '$identify',
      '$merge_dangerously',
    ]);
  }

  it('a refused batch carrying the merge warns a second line, and the alias never reaches the log', async () => {
    queueMergeBatch();
    globalThis.fetch = (() =>
      Promise.resolve(new Response('revoked', { status: 401 }))) as unknown as typeof fetch;
    await flush();
    expect(warnings()).toHaveLength(2);
    expect(warnings()[0]!['status']).toBe(401);
    expect(JSON.stringify(warnings()[1])).not.toContain('ext_neon_42');
  });

  it('a network failure keeps the merge batch for retry — no split line, and it lands once the network is back', async () => {
    queueMergeBatch();
    globalThis.fetch = (() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    await flush();
    expect(warnings()).toHaveLength(1);
    expect(peekQueueForTesting()).toHaveLength(0);
    const bodies: string[] = [];
    globalThis.fetch = ((_url: string, init: { body: string }) => {
      bodies.push(init.body);
      return Promise.resolve(new Response('{"status":1}'));
    }) as unknown as typeof fetch;
    await flush();
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain('$merge_dangerously');
    await flush();
    expect(bodies).toHaveLength(1);
  });
});

describe("the replay config channel's derivation", () => {
  it('no key: replay is told to stay off', () => {
    initTelemetry();
    expect(currentTelemetryConfig()).toEqual({ enabled: false });
  });

  it('an anonymous install answers the SAME install id before and after init', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    const early = currentTelemetryConfig();
    if (!early.enabled) throw new Error('expected an enabled config');
    expect(early.key).toBe('phc_test');
    expect(early.isIdentified).toBe(false);

    initTelemetry();
    const live = currentTelemetryConfig();
    if (!live.enabled) throw new Error('expected an enabled config');
    expect(live.distinctId).toBe(early.distinctId);
    expect(live.isIdentified).toBe(false);
  });

  it("a pre-init config ask does not corrupt app_opened's is_first_launch", () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    const early = currentTelemetryConfig();
    if (!early.enabled) throw new Error('expected an enabled config');

    initTelemetry();
    const [appOpened] = peekQueueForTesting();
    expect(appOpened?.event).toBe('app_opened');
    expect(appOpened?.properties['is_first_launch']).toBe(true);
  });

  it('a WorkOS identity answers its user id, flagged identified, once the provider has named it', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    const identity = writeIdentity({
      email: 'wren@example.com',
      source: 'provider',
      subject: 'user_workos123',
    });
    initTelemetry();
    const unanswered = currentTelemetryConfig();
    if (!unanswered.enabled) throw new Error('expected an enabled config');
    expect(unanswered.distinctId).not.toBe('user_workos123');
    expect(unanswered.isIdentified).toBe(false);

    identifyPerson(identity);
    const config = currentTelemetryConfig();
    if (!config.enabled) throw new Error('expected an enabled config');
    expect(config.distinctId).toBe('user_workos123');
    expect(config.isIdentified).toBe(true);
    // The revision moves, so a replay already bootstrapped anonymous is told to adopt the account.
    expect(config.identityRevision).toBeGreaterThan(unanswered.identityRevision);
  });
});

describe('the launch id (ONL-2343)', () => {
  it('every event carries $session_id equal to the id replay bootstraps with, and no app_session_id', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    capture('frame_tool_armed', {});
    const config = currentTelemetryConfig();
    if (!config.enabled) throw new Error('expected an enabled config');
    expect(isUuidV7(config.sessionId)).toBe(true);
    for (const event of peekQueueForTesting()) {
      expect(event.properties['$session_id']).toBe(config.sessionId);
      expect(event.properties['launch_id']).toBe(config.sessionId);
      expect(event.properties['app_session_id']).toBeUndefined();
      expect(event.properties['release_channel']).toBe('dev');
    }
  });

  it('a pre-window config ask and the launch share one session id', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    const early = currentTelemetryConfig();
    if (!early.enabled) throw new Error('expected an enabled config');
    noteAppShown({ bootOutcome: 'reported' });
    const [appOpened] = peekQueueForTesting();
    expect(appOpened?.properties['$session_id']).toBe(early.sessionId);
    expect(appOpened?.properties['boot_outcome']).toBe('reported');
  });

  it('the launch reports how long it waited for the flag answer', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    noteAppShown({ flagWaitMs: 1800 });
    const [appOpened] = peekQueueForTesting();
    expect(appOpened?.properties['flag_wait_ms']).toBe(1800);
  });

  it('a launch that waited for nothing reports no flag wait', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    noteAppShown({});
    const [appOpened] = peekQueueForTesting();
    expect(appOpened?.properties['flag_wait_ms']).toBeUndefined();
  });

  it('a reported rotation moves $session_id; null returns to the launch id', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const launch = currentSessionId();
    const rotated = '01920000-0000-7000-8000-00000000abcd';
    adoptSessionId(rotated);
    capture('frame_tool_armed', {});
    expect(peekQueueForTesting().at(-1)?.properties['$session_id']).toBe(rotated);
    expect(peekQueueForTesting().at(-1)?.properties['launch_id']).toBe(launch);
    adoptSessionId(null);
    capture('frame_tool_armed', {});
    expect(peekQueueForTesting().at(-1)?.properties['$session_id']).toBe(launch);
  });

  it('with no key, prepare still mints ids for the logger and capture stays a no-op', () => {
    prepareTelemetry();
    const ids = correlation();
    expect(ids).toBeDefined();
    expect(isUuidV7(ids!.launchId)).toBe(true);
    expect(ids!.sessionId).toBe(ids!.launchId);
    expect(ids!.installId.length).toBeGreaterThan(0);
    capture('frame_tool_armed', {});
    expect(peekQueueForTesting()).toHaveLength(0);
  });
});

describe('the headless door (ONL-2356)', () => {
  it('AGENT_HEADLESS with a key and no door: nothing is queued, ids still exist', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    process.env['AGENT_HEADLESS'] = '1';
    initTelemetry({ bootOutcome: 'reported' });
    capture('frame_tool_armed', {});
    expect(peekQueueForTesting()).toHaveLength(0);
    expect(correlation()).toBeDefined();
    expect(currentTelemetryConfig()).toEqual({ enabled: false });
  });

  it('AGENT_HEADLESS with the door open emits like a shown window', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    process.env['AGENT_HEADLESS'] = '1';
    process.env['STUDIO_TELEMETRY_HEADLESS'] = '1';
    initTelemetry({ bootOutcome: 'reported' });
    expect(peekQueueForTesting().map((event) => event.event)).toEqual(['app_opened']);
    expect(currentTelemetryConfig().enabled).toBe(true);
  });

  it('a PACKAGED headless drive with no key of its own stays dark — the prod project never takes verification traffic', async () => {
    delete process.env['STUDIO_POSTHOG_KEY'];
    process.env['AGENT_HEADLESS'] = '1';
    process.env['STUDIO_TELEMETRY_HEADLESS'] = '1';
    setAppForTesting({ ...fakeApp(makeRoot('packaged-headless')), isPackaged: true });
    initTelemetry({ bootOutcome: 'reported' });
    capture('frame_tool_armed', {});

    expect(peekQueueForTesting()).toHaveLength(0);
    expect(currentTelemetryConfig()).toEqual({ enabled: false });
    await flush();
    expect(fetchCalls).toBe(0);
  });

  it('STUDIO_TELEMETRY=0 outranks the door', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    process.env['AGENT_HEADLESS'] = '1';
    process.env['STUDIO_TELEMETRY_HEADLESS'] = '1';
    process.env['STUDIO_TELEMETRY'] = '0';
    initTelemetry();
    expect(peekQueueForTesting()).toHaveLength(0);
    expect(currentTelemetryConfig()).toEqual({ enabled: false });
  });
});

const REPORT = {
  lane: 'bug',
  entry_point: 'menu',
  install_id: 'install-test',
  message: 'the canvas forgot my page',
  $geoip_disable: true,
  $ip: null,
} as const;

const hangingFetch = (): { started: () => number } => {
  let started = 0;
  globalThis.fetch = (() => {
    started += 1;
    return new Promise(() => {});
  }) as unknown as typeof fetch;
  return { started: () => started };
};

describe('captureDurable (ONL-2350)', () => {
  it('persists feedback contact details in the durable outbox without adding them to ordinary events', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    prepareTelemetry();
    hangingFetch();
    const composed = composeReport(
      { lane: 'bug', entryPoint: 'menu', message: 'The canvas froze' },
      correlation()!.installId,
      { email: 'designer@onlook.test', source: 'provider', subject: 'user_designer' },
    );
    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    capture('frame_tool_armed', {});
    expect(await captureDurable('report_submitted', composed.properties)).toBe('queued');

    const batches = pendingBatches();
    expect(batches).toHaveLength(1);
    const events = readBatch(batches[0]!);
    expect(events?.map((event) => event.event)).toEqual(['frame_tool_armed', 'report_submitted']);
    expect(events?.[1]?.properties['email']).toBe('designer@onlook.test');
    expect(events?.[1]?.properties['account_id']).toBe('user_designer');
    expect(events?.[0]?.properties).not.toHaveProperty('email');
    expect(events?.[0]?.properties).not.toHaveProperty('account_id');
  });

  it('keeps attributed feedback subject to the existing telemetry opt-out', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    process.env['STUDIO_TELEMETRY'] = '0';
    prepareTelemetry();
    const composed = composeReport(
      { lane: 'feature', entryPoint: 'rail', message: 'Add a ruler' },
      'test-install',
      { email: 'designer@onlook.test', source: 'provider', subject: 'user_designer' },
    );
    expect(composed.ok).toBe(true);
    if (!composed.ok) return;

    expect(await captureDurable('report_submitted', composed.properties)).toBe('disabled');
    expect(peekQueueForTesting()).toHaveLength(0);
    expect(pendingBatches()).toHaveLength(0);
    expect(fetchCalls).toBe(0);
  });

  it('answers queued from the outbox write, not from the network', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    prepareTelemetry();
    globalThis.fetch = (() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;

    expect(await captureDurable('report_submitted', REPORT)).toBe('queued');

    const pending = pendingBatches();
    expect(pending).toHaveLength(1);
    const batch = readBatch(pending[0]!);
    expect(batch?.map((event) => event.event)).toEqual(['report_submitted']);
    expect(batch?.[0]?.properties['message']).toBe('the canvas forgot my page');
    expect(batch?.[0]?.properties['$geoip_disable']).toBe(true);
    expect(batch?.[0]?.properties['$ip']).toBeNull();
    expect(batch?.[0]?.properties['platform']).toBe('desktop');
    expect(batch?.[0]?.properties['$session_id']).toBe(correlation()!.sessionId);
    expect(batch?.[0]?.distinct_id).toBe(correlation()!.installId);
  });

  it('answers while a replay of earlier batches is still hung on its first POST', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    prepareTelemetry();
    const network = hangingFetch();

    capture('frame_tool_armed', {});
    void flush();
    capture('frame_tool_armed', {});
    void flush();
    expect(pendingBatches()).toHaveLength(2);

    // A macrotask sentinel: an answer that waited on the hung replay can never win this race.
    const answer = await Promise.race([
      captureDurable('report_submitted', REPORT),
      new Promise<'waited'>((resolve) => setTimeout(() => resolve('waited'), 0)),
    ]);

    expect(answer).toBe('queued');
    expect(network.started()).toBe(1);
    expect(pendingBatches()).toHaveLength(3);
  });

  it('no key: the report is refused, and nothing reaches the disk or the network', async () => {
    initTelemetry();

    expect(await captureDurable('report_submitted', REPORT)).toBe('disabled');
    expect(peekQueueForTesting()).toHaveLength(0);
    expect(pendingBatches()).toHaveLength(0);
    expect(fetchCalls).toBe(0);
  });

  it('an unwritable state root answers from the POST: sent when it lands, lost when it does not', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    prepareTelemetry();
    const blocked = makeRoot('blocked');
    writeFileSync(join(blocked, 'a-file'), '', 'utf8');
    process.env['STUDIO_STATE_ROOT'] = join(blocked, 'a-file', 'state');

    expect(await captureDurable('report_submitted', REPORT)).toBe('sent');
    expect(fetchCalls).toBe(1);
    expect(pendingBatches()).toHaveLength(0);

    globalThis.fetch = (() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    expect(await captureDurable('report_submitted', REPORT)).toBe('lost');
    expect(pendingBatches()).toHaveLength(0);
  });

  it('a quit capped shorter than its chain leaves the queued report on disk', async () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    prepareTelemetry();
    globalThis.fetch = (() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    expect(await captureDurable('report_submitted', REPORT)).toBe('queued');

    let telemetryDrained = false;
    await new Promise<void>((resolve) => {
      createQuitTeardown({
        synchronous: [],
        drainChain: [
          () => new Promise(() => {}),
          async () => {
            telemetryDrained = true;
            await shutdownTelemetry();
          },
        ],
        capMs: 25,
        onDone: () => resolve(),
      }).run();
    });

    expect(telemetryDrained).toBe(false);
    const pending = pendingBatches();
    expect(pending).toHaveLength(1);
    expect(readBatch(pending[0]!)?.[0]?.properties['message']).toBe('the canvas forgot my page');
  });
});

describe('dead_end_shown and last_surface (ONL-2686)', () => {
  it('recordDeadEndShown captures a dead_end_shown event with the right shape', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    recordDeadEndShown('setup_failed', 'dependency_install_failed');

    const deadEnd = peekQueueForTesting().find((e) => e.event === 'dead_end_shown');
    expect(deadEnd?.properties).toMatchObject({ state: 'setup_failed', error_class: 'dependency_install_failed' });
  });

  it('recordDeadEndShown without error_class omits the field', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    recordDeadEndShown('other');

    const deadEnd = peekQueueForTesting().find((e) => e.event === 'dead_end_shown');
    expect(deadEnd?.properties).toMatchObject({ state: 'other' });
    expect(deadEnd?.properties['error_class']).toBeUndefined();
  });

  describe('a dead end is sent when the tab shows something other than what it last showed (ONL-3260)', () => {
    const originalWorkspaceRoot = process.env['STUDIO_WORKSPACE_ROOT'];
    const deadEnds = (): Record<string, unknown>[] =>
      peekQueueForTesting().filter((event) => event.event === 'dead_end_shown').map((event) => event.properties);
    const notRunning = { surface: 'error_state', dead_end: { state: 'preview_failed', error_class: 'port_unreachable' } } as const;
    const project = (workspacePath: string, repoIdentity: string): void => {
      rememberProject({ workspacePath, workspaceName: 'slate-swift', branchName: 'tester/slate-swift', baseBranch: 'main', sourceRepoName: 'test', sourcePath: '/private-source', sourceRepoRoot: '/private-source', repoIdentity, copiedEnvFiles: [] });
    };

    beforeEach(() => {
      process.env['STUDIO_WORKSPACE_ROOT'] = mkdtempSync(join(tmpdir(), 'studio-dead-end-workspaces-'));
      resetWorkspaceCache();
      process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
      initTelemetry();
      setTelemetryRendererWorkspace(workspaceOf);
      project('/private/dead-end/one', 'github.com/team/dead-end-one');
      project('/private/dead-end/two', 'github.com/team/dead-end-two');
      views.register(101, '/private/dead-end/one', { send: () => undefined });
      views.register(102, '/private/dead-end/two', { send: () => undefined });
    });

    afterEach(() => {
      views.unregister(101);
      views.unregister(102);
      rmSync(process.env['STUDIO_WORKSPACE_ROOT']!, { recursive: true, force: true });
      if (originalWorkspaceRoot === undefined) delete process.env['STUDIO_WORKSPACE_ROOT'];
      else process.env['STUDIO_WORKSPACE_ROOT'] = originalWorkspaceRoot;
      resetWorkspaceCache();
    });

    it('switching back to a tab whose dead end has not changed sends nothing', () => {
      showTelemetryRenderer(101);
      recordActivationSurface(101, notRunning);
      showTelemetryRenderer(102);
      showTelemetryRenderer(101);
      showTelemetryRenderer(102);
      showTelemetryRenderer(101);
      expect(deadEnds()).toEqual([expect.objectContaining({ state: 'preview_failed', error_class: 'port_unreachable', project_id: workspaceTelemetryId('github.com/team/dead-end-one') })]);
    });

    it('a dead end reached while the tab was hidden is sent once when the tab is shown', () => {
      showTelemetryRenderer(102);
      recordActivationSurface(101, notRunning);
      expect(deadEnds()).toHaveLength(0);
      showTelemetryRenderer(101);
      showTelemetryRenderer(102);
      showTelemetryRenderer(101);
      expect(deadEnds()).toHaveLength(1);
    });

    it('a dead end that clears and returns in front of the person is sent again', () => {
      showTelemetryRenderer(101);
      recordActivationSurface(101, notRunning);
      recordActivationSurface(101, { surface: 'canvas' });
      recordActivationSurface(101, notRunning);
      expect(deadEnds()).toHaveLength(2);
    });

    it('a different dead end on the same tab is sent', () => {
      showTelemetryRenderer(101);
      recordActivationSurface(101, notRunning);
      recordActivationSurface(101, { surface: 'error_state', dead_end: { state: 'preview_failed', error_class: 'load_failed' } });
      expect(deadEnds().map((row) => row['error_class'])).toEqual(['port_unreachable', 'load_failed']);
    });

    it('the same dead end on a tab that now holds another project is sent, with that project', () => {
      showTelemetryRenderer(101);
      recordActivationSurface(101, notRunning);
      showTelemetryRenderer(102);
      views.register(101, '/private/dead-end/two', { send: () => undefined });
      showTelemetryRenderer(101);
      expect(deadEnds().map((row) => row['project_id'])).toEqual([
        workspaceTelemetryId('github.com/team/dead-end-one'),
        workspaceTelemetryId('github.com/team/dead-end-two'),
      ]);
    });

    it('a tab with no project sends its dead end without one', () => {
      showTelemetryRenderer(103);
      recordActivationSurface(103, { surface: 'error_state', dead_end: { state: 'other', error_class: 'unknown' } });
      expect(Object.keys(deadEnds()[0] ?? {})).not.toContain('project_id');
    });
  });
});

describe('flag state on every event (ONL-2901)', () => {
  afterEach(() => {
    resetFlagsForTesting();
  });

  it('carries no flag before the flags are primed', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    capture('frame_tool_armed', {});
    expect(Object.keys(peekQueueForTesting().at(-1)?.properties ?? {}).some((key) => key.startsWith('$feature/'))).toBe(false);
  });

  it('carries every flag as this launch resolved it, an override winning', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    primeFlags((key) => (key === 'rail-foot' ? true : undefined));
    capture('frame_tool_armed', {});
    const primed = peekQueueForTesting().at(-1)?.properties ?? {};
    expect(primed['$feature/rail-foot']).toBe(true);
    expect(primed['$feature/frame-covers']).toBe(false);
    process.env['STUDIO_FLAGS'] = '-rail-foot';
    capture('frame_tool_armed', {});
    expect(peekQueueForTesting().at(-1)?.properties['$feature/rail-foot']).toBe(false);
  });
});
