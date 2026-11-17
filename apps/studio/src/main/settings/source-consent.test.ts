import { afterEach, expect, test } from 'bun:test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeStateRoot } from '@studio/fixtures';

process.env['STUDIO_TEST_OFFICIAL_BUILD'] = '0';
const { OFFICIAL_BUILD } = await import('../build-kind.js');
const { analyticsEnabled, analyticsChoiceStored, resetSettingsCache, setAnalyticsEnabled, storeAnalyticsDefault } = await import('./state.js');
const { capture, captureException, currentTelemetryConfig, initTelemetry, peekQueueForTesting, refreshTelemetryConsent, resetTelemetryForTesting, setAppForTesting } = await import('../telemetry/index.js');
const { TurnSeenWatch } = await import('../telemetry/turn-seen.js');

const turn = { project_id: 'p', workspace_instance_id: 'w', agent_session_id: 's', harness: 'codex' as const, turn_id: 't', origin: 'user' as const, outcome: 'success' as const };

function turnWatch(sent: unknown[]): InstanceType<typeof TurnSeenWatch> {
  return new TurnSeenWatch((properties) => sent.push(properties), undefined, { idleMs: () => 0, screenLocked: () => false });
}

afterEach(() => {
  resetTelemetryForTesting();
  resetSettingsCache();
  delete process.env['STUDIO_POSTHOG_KEY'];
});

function fresh(): string {
  const root = makeStateRoot({ name: 'source-consent' });
  process.env['STUDIO_STATE_ROOT'] = root;
  resetSettingsCache();
  return root;
}

test('source boot never treats a missing analytics choice as consent', () => {
  fresh();
  expect(OFFICIAL_BUILD).toBe(false);
  expect(analyticsEnabled()).toBe(false);
  expect(analyticsChoiceStored()).toBe(false);
  storeAnalyticsDefault();
  expect(analyticsChoiceStored()).toBe(false);
});

test('declining on first run is durable even though analytics was already off', () => {
  fresh();
  expect(setAnalyticsEnabled(false)).toBe(true);
  resetSettingsCache();
  expect(analyticsChoiceStored()).toBe(true);
  expect(analyticsEnabled()).toBe(false);
});

test('accepting and withdrawing reuse the settings consent authority', () => {
  fresh();
  expect(setAnalyticsEnabled(true)).toBe(true);
  resetSettingsCache();
  expect(analyticsEnabled()).toBe(true);
  expect(analyticsChoiceStored()).toBe(true);
  expect(setAnalyticsEnabled(false)).toBe(true);
  resetSettingsCache();
  expect(analyticsEnabled()).toBe(false);
});

test('accepted source analytics never enables replay or remote exceptions', () => {
  const root = fresh();
  setAnalyticsEnabled(true);
  process.env['STUDIO_POSTHOG_KEY'] = 'source-test-key';
  setAppForTesting({ getPath: () => root, getVersion: () => '0.0.0', getLocale: () => 'en-US', isPackaged: true });
  initTelemetry();
  expect(currentTelemetryConfig()).toEqual({ enabled: false });
  capture('app_opened', { is_first_launch: true, locale: 'en-US' });
  captureException({ type: 'Error', value: 'source-only error' });
  expect(peekQueueForTesting().some((event) => event.event === 'app_opened')).toBe(true);
  expect(peekQueueForTesting().some((event) => event.event === '$exception')).toBe(false);
});

test('source turns observed while declined never enter a later analytics grant', () => {
  const root = fresh();
  setAppForTesting({ getPath: () => root, getVersion: () => '0.0.0', getLocale: () => 'en-US', isPackaged: true });
  setAnalyticsEnabled(false);
  const sent: unknown[] = [];
  const watch = turnWatch(sent);
  watch.ended('/projects/a', turn);
  setAnalyticsEnabled(true);
  refreshTelemetryConsent();
  watch.shown('/projects/a', 'click');
  expect(sent).toEqual([]);
  watch.ended('/projects/a', turn);
  watch.shown('/projects/a', 'click');
  expect(sent).toHaveLength(1);
});

test('source consent refresh discards pending turns before reaccepting analytics', () => {
  const root = fresh();
  setAppForTesting({ getPath: () => root, getVersion: () => '0.0.0', getLocale: () => 'en-US', isPackaged: true });
  setAnalyticsEnabled(true);
  refreshTelemetryConsent();
  const sent: unknown[] = [];
  const watch = turnWatch(sent);
  watch.ended('/projects/a', turn);
  setAnalyticsEnabled(false);
  refreshTelemetryConsent();
  setAnalyticsEnabled(true);
  refreshTelemetryConsent();
  watch.shown('/projects/a', 'click');
  watch.quit();
  expect(sent).toEqual([]);
});

test('source failed withdrawal also discards pending turns without a consent refresh', () => {
  const root = fresh();
  setAppForTesting({ getPath: () => root, getVersion: () => '0.0.0', getLocale: () => 'en-US', isPackaged: true });
  setAnalyticsEnabled(true);
  refreshTelemetryConsent();
  const sent: unknown[] = [];
  const watch = turnWatch(sent);
  watch.ended('/projects/a', turn);
  const settings = join(root, 'settings.json');
  const original = readFileSync(settings, 'utf8');
  writeFileSync(settings, JSON.stringify({ version: 99, data: { analyticsEnabled: true } }));
  expect(() => setAnalyticsEnabled(false)).toThrow('Analytics preference cannot be saved');
  expect(analyticsEnabled()).toBe(false);
  watch.shown('/projects/a', 'click');
  writeFileSync(settings, original);
  setAnalyticsEnabled(true);
  refreshTelemetryConsent();
  watch.shown('/projects/a', 'click');
  watch.quit();
  expect(sent).toEqual([]);
});
