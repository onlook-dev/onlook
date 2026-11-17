import { afterEach, expect, test } from 'bun:test';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import { registerTelemetryRequestGuard } from './renderer-requests.js';
import { resetSettingsCache, setAnalyticsEnabled } from '../settings/state.js';

const savedRoot = process.env['STUDIO_STATE_ROOT'];
const savedHost = process.env['STUDIO_POSTHOG_HOST'];
afterEach(() => {
  if (savedRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = savedRoot;
  if (savedHost === undefined) delete process.env['STUDIO_POSTHOG_HOST'];
  else process.env['STUDIO_POSTHOG_HOST'] = savedHost;
  resetSettingsCache();
  cleanupTempFixtures();
});

test('renderer requests use main’s current consent, including SDK retries and config assets', () => {
  process.env['STUDIO_STATE_ROOT'] = makeStateRoot();
  resetSettingsCache();
  let listener: ((_details: unknown, callback: (response: { cancel: boolean }) => void) => void) | undefined;
  let urls: string[] = [];
  registerTelemetryRequestGuard({ webRequest: {
    onBeforeRequest: (filter: { urls: string[] }, receive: typeof listener) => { urls = filter.urls; listener = receive; },
  } } as unknown as Pick<Electron.Session, 'webRequest'>);
  expect(urls).toContain('https://us-assets.i.posthog.com/*');
  const refused = (): boolean | undefined => {
    let cancelled: boolean | undefined;
    listener?.({}, (result) => { cancelled = result.cancel; });
    return cancelled;
  };
  setAnalyticsEnabled(false);
  expect(refused()).toBe(true);
  setAnalyticsEnabled(true);
  expect(refused()).toBe(process.env['STUDIO_TELEMETRY'] === '0' || (process.env['AGENT_HEADLESS'] !== undefined && process.env['STUDIO_TELEMETRY_HEADLESS'] !== '1'));
});

test('a malformed collector override does not prevent Studio from starting', () => {
  process.env['STUDIO_POSTHOG_HOST'] = 'not a URL';
  let urls: string[] = [];
  expect(() => registerTelemetryRequestGuard({ webRequest: {
    onBeforeRequest: (filter: { urls: string[] }) => { urls = filter.urls; },
  } } as unknown as Pick<Electron.Session, 'webRequest'>)).not.toThrow();
  expect(urls).toEqual(['https://us-assets.i.posthog.com/*', 'https://eu-assets.i.posthog.com/*']);
});
