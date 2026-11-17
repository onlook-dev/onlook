import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyticsEnabled, resetSettingsCache, setAnalyticsEnabled, telemetryConsent } from '../settings/state.js';
import { resetIdentityCache, writeIdentity } from '../identity/store.js';
import { resetLogForTesting } from '../log/index.js';
import { writeStateFile } from '../state/file.js';
import { capture, captureDurable, captureException, currentTelemetryConfig, flush, identifyPerson, initTelemetry, peekQueueForTesting, receiveWebAttribution, recordActivationSurface, refreshTelemetryConsent, resetTelemetryForTesting, setAppForTesting, showTelemetryRenderer, shutdownTelemetry } from './index.js';
import { pendingBatches, writeBatch } from './outbox.js';
import { readGrant } from './grant.js';
import { retainAttribution } from './attribution.js';
import * as disabled from './disabled.js';

const keys = ['STUDIO_STATE_ROOT', 'MAIN_VITE_ONLOOK_CLOUD', 'MAIN_VITE_TELEMETRY', 'STUDIO_POSTHOG_KEY', 'STUDIO_POSTHOG_HOST', 'STUDIO_TELEMETRY', 'AGENT_HEADLESS'] as const;
const original = new Map(keys.map((key) => [key, process.env[key]]));
const realFetch = globalThis.fetch;
let root: string;
let posts: string[];

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'studio-source-consent-'));
  process.env['STUDIO_STATE_ROOT'] = root;
  process.env['MAIN_VITE_ONLOOK_CLOUD'] = 'false';
  delete process.env['MAIN_VITE_TELEMETRY'];
  process.env['STUDIO_POSTHOG_KEY'] = 'phc_source_test';
  process.env['STUDIO_POSTHOG_HOST'] = 'https://collector.invalid';
  delete process.env['STUDIO_TELEMETRY'];
  delete process.env['AGENT_HEADLESS'];
  resetTelemetryForTesting();
  resetSettingsCache();
  resetIdentityCache();
  resetLogForTesting();
  setAppForTesting({ getPath: () => root, getVersion: () => '0.0.0-test', getLocale: () => 'en-US', isPackaged: false });
  posts = [];
  globalThis.fetch = (async (_url: unknown, init: RequestInit) => {
    posts.push(String(init.body));
    return new Response('{}', { status: 200 });
  }) as typeof fetch;
});

afterEach(() => {
  resetTelemetryForTesting();
  resetSettingsCache();
  resetLogForTesting();
  setAppForTesting(undefined);
  globalThis.fetch = realFetch;
  rmSync(root, { recursive: true, force: true });
  for (const key of keys) {
    const value = original.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('source build consent', () => {
  it('aborts an in-flight source request on withdrawal and never replays it after regrant', async () => {
    setAnalyticsEnabled(true);
    initTelemetry();
    await flush();
    let aborted = false;
    let started!: () => void;
    const sending = new Promise<void>((resolve) => { started = resolve; });
    globalThis.fetch = (async (_url: unknown, init: RequestInit) => {
      started();
      return await new Promise<Response>((_resolve, reject) => {
        init.signal!.addEventListener('abort', () => {
          aborted = true;
          reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
      });
    }) as typeof fetch;
    capture('frame_tool_armed', {});
    const draining = flush();
    await sending;
    setAnalyticsEnabled(false);
    refreshTelemetryConsent();
    expect(aborted).toBe(true);
    expect(pendingBatches()).toEqual([]);
    posts = [];
    globalThis.fetch = (async (_url: unknown, init: RequestInit) => {
      posts.push(String(init.body));
      return new Response('{}', { status: 200 });
    }) as typeof fetch;
    setAnalyticsEnabled(true);
    refreshTelemetryConsent();
    await draining;
    await flush();
    expect(posts).toEqual([]);
    capture('frame_tool_armed', {});
    await flush();
    expect(posts.flatMap((body) => JSON.parse(body).batch)).toHaveLength(1);
  });

  it('rejects official and legacy persisted batches when returning to a consenting source build', async () => {
    setAnalyticsEnabled(true);
    process.env['MAIN_VITE_ONLOOK_CLOUD'] = 'true';
    globalThis.fetch = (async (_url: unknown, _init: RequestInit) => new Response('{}', { status: 503 })) as typeof fetch;
    initTelemetry();
    identifyPerson({ email: 'official-private@onlook.test', source: 'manual' });
    await flush();
    const grant = readGrant()!;
    expect(pendingBatches().length).toBeGreaterThan(0);
    for (const [event, properties] of [['$exception', { build_kind: 'source' }], ['report_submitted', { build_kind: 'source' }], ['frame_tool_armed', {}]] as const) {
      writeBatch('legacy', [{ event, properties, distinct_id: 'private-legacy', uuid: event, timestamp: new Date().toISOString() }], grant);
    }
    const malformed = writeBatch('malformed', [], grant)!;
    writeStateFile(malformed, 1, { batch: [null, { event: 'frame_tool_armed' }, { event: 7, properties: { build_kind: 'source' } }] });
    resetTelemetryForTesting();
    resetSettingsCache();
    process.env['MAIN_VITE_ONLOOK_CLOUD'] = 'false';
    posts = [];
    globalThis.fetch = (async (_url: unknown, init: RequestInit) => {
      posts.push(String(init.body));
      return new Response('{}', { status: 200 });
    }) as typeof fetch;
    initTelemetry();
    await flush();
    const events = posts.flatMap((body) => JSON.parse(body).batch);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((event) => event.properties.build_kind === 'source' && !event.event.startsWith('$') && event.event !== 'report_submitted')).toBe(true);
    expect(posts.join('')).not.toContain('official-private');
    expect(posts.join('')).not.toContain('private-legacy');
    expect(pendingBatches()).toEqual([]);
  });

  it('retains local activation surfaces without sending pre-consent events', async () => {
    initTelemetry();
    showTelemetryRenderer(1);
    recordActivationSurface(1, { surface: 'project_picker' });
    await flush();
    expect(posts).toEqual([]);
    setAnalyticsEnabled(true);
    refreshTelemetryConsent();
    recordActivationSurface(1, { surface: 'error_state', dead_end: { state: 'other', error_class: 'unknown' } });
    await shutdownTelemetry();
    const events = posts.flatMap((body) => JSON.parse(body).batch);
    expect(events.some((event) => event.event === 'dead_end_shown')).toBe(true);
    expect(events.find((event) => event.event === 'app_closed')?.properties.last_surface).toBe('error_state');
  });

  for (const future of [false, true]) {
    it(`allows an unsaved refusal for this launch only with ${future ? 'future' : 'unwritable'} settings`, () => {
      const path = join(root, 'settings.json');
      const contents = JSON.stringify({ version: future ? 999 : 1, data: {} });
      writeFileSync(path, contents);
      if (!future) chmodSync(root, 0o500);
      try {
        expect(() => setAnalyticsEnabled(true)).toThrow();
        expect(telemetryConsent()).toBe('unknown');
        expect(() => setAnalyticsEnabled(false)).toThrow();
        expect(telemetryConsent()).toBe('declined');
        expect(analyticsEnabled()).toBe(false);
        expect(readFileSync(path, 'utf8')).toBe(contents);
        expect(() => setAnalyticsEnabled(true)).toThrow();
        expect(telemetryConsent()).toBe('declined');
        resetSettingsCache();
        expect(telemetryConsent()).toBe('unknown');
      } finally {
        chmodSync(root, 0o700);
      }
    });
  }

  it('excludes retained and incoming attribution and live WorkOS identities', async () => {
    process.env['MAIN_VITE_ONLOOK_CLOUD'] = 'true';
    retainAttribution(new URLSearchParams('ph_id=private-attribution&utm_source=private-campaign'));
    process.env['MAIN_VITE_ONLOOK_CLOUD'] = 'false';
    const identity = { email: 'private-workos@onlook.test', source: 'provider' as const, subject: 'private-account' };
    writeIdentity(identity);
    setAnalyticsEnabled(true);
    initTelemetry();
    identifyPerson(identity);
    receiveWebAttribution(new URLSearchParams('ph_id=private-incoming&utm_source=private-new-campaign'));
    await flush();
    const sent = posts.join('');
    for (const value of ['private-', '$identify', '$set', 'utm_source']) expect(sent).not.toContain(value);
    expect(sent).toContain('source:');
  });

  it('sends nothing before an explicit answer, including activation and durable events', async () => {
    initTelemetry();
    capture('frame_tool_armed', {});
    showTelemetryRenderer(1);
    recordActivationSurface(1, { surface: 'project_picker', dead_end: { state: 'other', error_class: 'unknown' } });
    expect(await captureDurable('app_closed', { duration_ms: 1, session_duration_seconds: 0, last_surface: 'project_picker' })).toBe('disabled');
    await flush();
    expect(telemetryConsent()).toBe('unknown');
    expect(analyticsEnabled()).toBe(false);
    expect(currentTelemetryConfig()).toEqual({ enabled: false });
    expect(peekQueueForTesting()).toEqual([]);
    expect(pendingBatches()).toEqual([]);
    expect(posts).toEqual([]);
  });

  it('does not mistake the legacy automatically stored default for source consent', async () => {
    writeStateFile(join(root, 'settings.json'), 1, { analyticsEnabled: true });
    initTelemetry();
    await flush();
    expect(telemetryConsent()).toBe('unknown');
    expect(posts).toEqual([]);
  });

  it('persists both answers and marks accepted usage as source without enabling replay', async () => {
    expect(setAnalyticsEnabled(false)).toBe(true);
    resetSettingsCache();
    expect(telemetryConsent()).toBe('declined');
    expect(setAnalyticsEnabled(true)).toBe(true);
    resetSettingsCache();
    expect(telemetryConsent()).toBe('accepted');
    initTelemetry();
    capture('frame_tool_armed', {});
    await flush();
    expect(posts.join('')).toContain('"build_kind":"source"');
    expect(posts.join('')).toContain('frame_tool_armed');
    expect(currentTelemetryConfig()).toEqual({ enabled: false });
  });

  it('never sends source exceptions or report messages even after acceptance', async () => {
    setAnalyticsEnabled(true);
    initTelemetry();
    await flush();
    posts = [];
    captureException({ type: 'Error', value: 'private-error' });
    expect(await captureDurable('report_submitted', { message: 'private-report', lane: 'bug', entry_point: 'menu', install_id: 'test', $geoip_disable: true, $ip: null })).toBe('disabled');
    await flush();
    expect(posts).toEqual([]);
  });

  it('does not identify source usage with an existing account or web attribution', async () => {
    writeIdentity({ email: 'private@onlook.test', source: 'manual' });
    setAnalyticsEnabled(true);
    initTelemetry();
    capture('frame_tool_armed', {});
    await flush();
    expect(posts.join('')).not.toContain('private@onlook.test');
    expect(posts.join('')).not.toContain('"event":"$set"');
    expect(posts.join('')).toContain('"distinct_id":"source:');
    expect(posts.join('')).toContain('"$process_person_profile":false');
  });

  it('withdraws immediately, discards queued batches and retains the refusal after restart', async () => {
    setAnalyticsEnabled(true);
    initTelemetry();
    await flush();
    capture('frame_tool_armed', {});
    setAnalyticsEnabled(false);
    refreshTelemetryConsent();
    posts = [];
    capture('frame_tool_armed', {});
    await flush();
    expect(posts).toEqual([]);
    expect(pendingBatches()).toEqual([]);
    resetTelemetryForTesting();
    resetSettingsCache();
    initTelemetry();
    await flush();
    expect(telemetryConsent()).toBe('declined');
    expect(posts).toEqual([]);
  });

  for (const data of ['{broken', JSON.stringify({ version: 1, data: { telemetryConsent: 'yes', analyticsEnabled: true } }), JSON.stringify({ version: 999, data: { telemetryConsent: 'accepted', analyticsEnabled: true } })]) {
    it(`fails closed for untrusted settings ${data}`, () => {
      writeFileSync(join(root, 'settings.json'), data);
      expect(telemetryConsent()).toBe('unknown');
      expect(analyticsEnabled()).toBe(false);
    });
  }

  it('requires a durable affirmative answer and refuses this launch when withdrawal cannot be saved', () => {
    writeStateFile(join(root, 'settings.json'), 1, {});
    chmodSync(root, 0o500);
    try {
      expect(() => setAnalyticsEnabled(true)).toThrow();
      expect(analyticsEnabled()).toBe(false);
    } finally {
      chmodSync(root, 0o700);
    }
    setAnalyticsEnabled(true);
    chmodSync(root, 0o500);
    try {
      expect(() => setAnalyticsEnabled(false)).toThrow();
      expect(analyticsEnabled()).toBe(false);
    } finally {
      chmodSync(root, 0o700);
    }
  });

  it('removed builds cannot enable collection even with a key and an accepted answer', async () => {
    setAnalyticsEnabled(true);
    process.env['MAIN_VITE_TELEMETRY'] = 'false';
    expect(telemetryConsent()).toBe('removed');
    expect(setAnalyticsEnabled(true)).toBe(false);
    initTelemetry();
    capture('frame_tool_armed', {});
    await flush();
    expect(posts).toEqual([]);
    expect(disabled.currentTelemetryConfig()).toEqual({ enabled: false });
    expect(disabled.telemetryRequestsAllowed()).toBe(false);
    expect(disabled.telemetryConsentSignal()).toBeUndefined();
    expect(await disabled.captureDurable('frame_tool_armed', {})).toBe('disabled');
  });

  it('keeps official defaults unchanged and marks official events', async () => {
    process.env['MAIN_VITE_ONLOOK_CLOUD'] = 'true';
    expect(telemetryConsent()).toBeUndefined();
    expect(analyticsEnabled()).toBe(true);
    initTelemetry();
    await flush();
    expect(posts.join('')).toContain('"build_kind":"official"');
    expect(currentTelemetryConfig().enabled).toBe(true);
    expect(readFileSync(join(root, 'settings.json'), 'utf8')).not.toContain('telemetryConsent');
  });
});
