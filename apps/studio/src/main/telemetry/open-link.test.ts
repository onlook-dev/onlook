import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { EventEmitter } from 'node:events';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openLinkParams, parseDeepLink, registerAttributionLinks, type OpenLinkParams } from './attribution-links.js';
import { flush, initTelemetry, receiveOpenLink, resetTelemetryForTesting, setAppForTesting } from './index.js';
import { resetIdentityCache } from '../identity/store.js';
import { resetFlagsForTesting } from '../flags/index.js';
import type { OutboxEvent } from './outbox.js';

const ENV_KEYS = ['STUDIO_STATE_ROOT', 'STUDIO_POSTHOG_KEY', 'STUDIO_POSTHOG_HOST', 'STUDIO_TELEMETRY', 'AGENT_HEADLESS', 'STUDIO_TELEMETRY_HEADLESS', 'STUDIO_FLAGS', 'MAIN_VITE_FLAG_DEFAULTS'] as const;
const originalEnv = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;
let state: string;
let userData: string;
let sent: OutboxEvent[];

beforeEach(() => {
  resetTelemetryForTesting();
  resetIdentityCache();
  resetFlagsForTesting();
  for (const key of ENV_KEYS) delete process.env[key];
  state = mkdtempSync(join(tmpdir(), 'studio-open-link-state-'));
  userData = mkdtempSync(join(tmpdir(), 'studio-open-link-userdata-'));
  process.env['STUDIO_STATE_ROOT'] = state;
  process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
  process.env['STUDIO_POSTHOG_HOST'] = 'https://collector.invalid';
  setAppForTesting({ getPath: () => userData, getVersion: () => '0.0.0-test', getLocale: () => 'en-US', isPackaged: false });
  sent = [];
  globalThis.fetch = Object.assign(async (_input: unknown, init?: RequestInit) => {
    sent.push(...(JSON.parse(String(init?.body)) as { batch: OutboxEvent[] }).batch);
    return new Response('{}', { status: 200 });
  }, { preconnect: originalFetch.preconnect }) as typeof fetch;
});

afterEach(async () => {
  await flush();
  resetTelemetryForTesting();
  resetIdentityCache();
  resetFlagsForTesting();
  setAppForTesting(undefined);
  globalThis.fetch = originalFetch;
  for (const key of ENV_KEYS) {
    const value = originalEnv.get(key);
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

const openLinkEvents = (): OutboxEvent[] => sent.filter((event) => event.event === 'app_opened_from_link');

describe('openLinkParams validator', () => {
  it('accepts all recognized UTM params, stage, and link_id', () => {
    const params = new URLSearchParams({
      utm_source: 'website', utm_medium: 'cta', utm_campaign: 'launch',
      utm_content: 'hero_button', utm_term: 'design tool',
      stage: 'open_page', link_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(openLinkParams(params)).toEqual({
      utm_source: 'website', utm_medium: 'cta', utm_campaign: 'launch',
      utm_content: 'hero_button', utm_term: 'design tool',
      stage: 'open_page', link_id: '550e8400-e29b-41d4-a716-446655440000',
    });
  });

  it('accepts a subset of params', () => {
    expect(openLinkParams(new URLSearchParams('utm_source=website'))).toEqual({ utm_source: 'website' });
    expect(openLinkParams(new URLSearchParams('link_id=550e8400-e29b-41d4-a716-446655440000'))).toEqual({ link_id: '550e8400-e29b-41d4-a716-446655440000' });
    expect(openLinkParams(new URLSearchParams(''))).toEqual({});
  });

  it('drops unknown keys by rejecting the whole link', () => {
    expect(openLinkParams(new URLSearchParams('utm_source=website&unknown=value'))).toBeUndefined();
    expect(openLinkParams(new URLSearchParams('ph_id=person'))).toBeUndefined();
    expect(openLinkParams(new URLSearchParams('code=secret'))).toBeUndefined();
  });

  it('rejects duplicate keys', () => {
    const params = new URLSearchParams();
    params.append('utm_source', 'one');
    params.append('utm_source', 'two');
    expect(openLinkParams(params)).toBeUndefined();
  });

  it('rejects UTM values longer than 200 chars', () => {
    expect(openLinkParams(new URLSearchParams({ utm_source: 'a'.repeat(200) }))).toBeDefined();
    expect(openLinkParams(new URLSearchParams({ utm_source: 'a'.repeat(201) }))).toBeUndefined();
    expect(openLinkParams(new URLSearchParams({ utm_medium: 'a'.repeat(201) }))).toBeUndefined();
    expect(openLinkParams(new URLSearchParams({ utm_campaign: 'a'.repeat(201) }))).toBeUndefined();
    expect(openLinkParams(new URLSearchParams({ utm_content: 'a'.repeat(201) }))).toBeUndefined();
    expect(openLinkParams(new URLSearchParams({ utm_term: 'a'.repeat(201) }))).toBeUndefined();
  });

  it('rejects non-printable ASCII in UTM values', () => {
    expect(openLinkParams(new URLSearchParams({ utm_source: 'ok value' }))).toBeDefined();
    expect(openLinkParams(new URLSearchParams({ utm_source: 'has\ttab' }))).toBeUndefined();
    expect(openLinkParams(new URLSearchParams({ utm_source: 'has\nnewline' }))).toBeUndefined();
    expect(openLinkParams(new URLSearchParams({ utm_source: 'has\x00null' }))).toBeUndefined();
    expect(openLinkParams(new URLSearchParams({ utm_source: 'has\x7fDEL' }))).toBeUndefined();
  });

  it('rejects a stage that does not match /^[a-z0-9_]{1,64}$/', () => {
    expect(openLinkParams(new URLSearchParams({ stage: 'open_page' }))).toBeDefined();
    expect(openLinkParams(new URLSearchParams({ stage: 'a1_b2' }))).toBeDefined();
    expect(openLinkParams(new URLSearchParams({ stage: 'a'.repeat(64) }))).toBeDefined();
    expect(openLinkParams(new URLSearchParams({ stage: 'a'.repeat(65) }))).toBeUndefined();
    expect(openLinkParams(new URLSearchParams({ stage: 'HAS_UPPER' }))).toBeUndefined();
    expect(openLinkParams(new URLSearchParams({ stage: 'has-dash' }))).toBeUndefined();
    expect(openLinkParams(new URLSearchParams({ stage: 'has space' }))).toBeUndefined();
    expect(openLinkParams(new URLSearchParams({ stage: '' }))).toEqual({});
  });

  it('rejects a link_id that is not a valid UUID', () => {
    expect(openLinkParams(new URLSearchParams({ link_id: '550e8400-e29b-41d4-a716-446655440000' }))).toBeDefined();
    expect(openLinkParams(new URLSearchParams({ link_id: 'ABCDEF00-E29B-41D4-A716-446655440000' }))).toBeDefined();
    expect(openLinkParams(new URLSearchParams({ link_id: 'not-a-uuid' }))).toBeUndefined();
    expect(openLinkParams(new URLSearchParams({ link_id: '550e8400e29b41d4a716446655440000' }))).toBeUndefined();
    expect(openLinkParams(new URLSearchParams({ link_id: '550e8400-e29b-41d4-a716-44665544000' }))).toBeUndefined();
    expect(openLinkParams(new URLSearchParams({ link_id: '550e8400-e29b-41d4-a716-4466554400000' }))).toBeUndefined();
    expect(openLinkParams(new URLSearchParams({ link_id: '' }))).toEqual({});
  });

  it('skips empty values without rejecting', () => {
    expect(openLinkParams(new URLSearchParams({ utm_source: '', utm_medium: 'cta' }))).toEqual({ utm_medium: 'cta' });
  });

  it('rejects unicode values that survive percent decoding', () => {
    expect(openLinkParams(new URLSearchParams({ utm_source: '\u2713' }))).toBeUndefined();
    expect(openLinkParams(new URLSearchParams({ utm_source: '\u00e9' }))).toBeUndefined();
    expect(openLinkParams(new URLSearchParams({ utm_campaign: '\ud83d\ude00' }))).toBeUndefined();
  });

  it('rejects CRLF injection attempts', () => {
    expect(openLinkParams(new URLSearchParams({ utm_source: 'ok\r\nHeader: injected' }))).toBeUndefined();
    expect(openLinkParams(new URLSearchParams({ utm_source: 'ok\rcarriage' }))).toBeUndefined();
    expect(openLinkParams(new URLSearchParams({ utm_source: 'ok\nline' }))).toBeUndefined();
  });

  it('allows javascript: as a plain string value since it is never evaluated', () => {
    const result = openLinkParams(new URLSearchParams({ utm_source: 'javascript:alert(1)' }));
    expect(result).toEqual({ utm_source: 'javascript:alert(1)' });
  });
});

describe('parseDeepLink', () => {
  it('routes onlook://open to the open kind', () => {
    const result = parseDeepLink('onlook://open?utm_source=website&utm_campaign=launch');
    expect(result).toEqual({ kind: 'open', params: { utm_source: 'website', utm_campaign: 'launch' } });
  });

  it('routes onlook://attribution to the attribution kind', () => {
    const result = parseDeepLink('onlook://attribution?ph_id=web-id&utm_source=website');
    expect(result?.kind).toBe('attribution');
  });

  it('routes onlook://web-link to the attribution kind', () => {
    const result = parseDeepLink('onlook://web-link?ph_id=web-id&first_utm_source=website');
    expect(result?.kind).toBe('attribution');
  });

  it('rejects unknown hosts', () => {
    expect(parseDeepLink('onlook://elsewhere?utm_source=website')).toBeUndefined();
    expect(parseDeepLink('onlook://auth/callback?code=secret')).toBeUndefined();
  });

  it('rejects open links with invalid params', () => {
    expect(parseDeepLink('onlook://open?utm_source=website&unknown=bad')).toBeUndefined();
    expect(parseDeepLink('onlook://open?link_id=not-a-uuid')).toBeUndefined();
  });

  it('enforces the 16,384-char limit', () => {
    expect(parseDeepLink(`onlook://open?utm_source=${'a'.repeat(16_384)}`)).toBeUndefined();
  });

  it('rejects userinfo, port, path, and hash on open links', () => {
    expect(parseDeepLink('onlook://user@open?utm_source=website')).toBeUndefined();
    expect(parseDeepLink('onlook://open:8080?utm_source=website')).toBeUndefined();
    expect(parseDeepLink('onlook://open/path?utm_source=website')).toBeUndefined();
    expect(parseDeepLink('onlook://open?utm_source=website#fragment')).toBeUndefined();
    expect(parseDeepLink('onlook://user:pass@open?utm_source=website')).toBeUndefined();
  });

  it('rejects non-onlook protocols', () => {
    expect(parseDeepLink('https://open?utm_source=website')).toBeUndefined();
  });

  it('accepts a trailing slash, as Windows may pass onlook://open/?...', () => {
    const result = parseDeepLink('onlook://open/?utm_source=website&stage=open_page');
    expect(result).toEqual({ kind: 'open', params: { utm_source: 'website', stage: 'open_page' } });
  });

  it('accepts onlook://open with no query params at all', () => {
    expect(parseDeepLink('onlook://open')).toEqual({ kind: 'open', params: {} });
    expect(parseDeepLink('onlook://open/')).toEqual({ kind: 'open', params: {} });
  });
});

describe('registerAttributionLinks with open links', () => {
  it('delivers cold open links from argv', () => {
    const app = Object.assign(new EventEmitter(), { isPackaged: true, setAsDefaultProtocolClient: () => true });
    const opens: { params: OpenLinkParams; launch: 'cold' | 'warm' }[] = [];
    registerAttributionLinks(
      app as unknown as Parameters<typeof registerAttributionLinks>[0],
      () => {},
      (params, launch) => { opens.push({ params, launch }); },
      ['app', 'onlook://open?utm_source=website&utm_campaign=launch'],
    );
    expect(opens).toEqual([{ params: { utm_source: 'website', utm_campaign: 'launch' }, launch: 'cold' }]);
  });

  it('delivers warm open links from open-url', () => {
    const app = Object.assign(new EventEmitter(), { isPackaged: true, setAsDefaultProtocolClient: () => true });
    const opens: { params: OpenLinkParams; launch: 'cold' | 'warm' }[] = [];
    let prevented = 0;
    registerAttributionLinks(
      app as unknown as Parameters<typeof registerAttributionLinks>[0],
      () => {},
      (params, launch) => { opens.push({ params, launch }); },
    );
    app.emit('open-url', { preventDefault: () => { prevented += 1; } }, 'onlook://open?utm_source=website');
    expect(opens).toEqual([{ params: { utm_source: 'website' }, launch: 'warm' }]);
    expect(prevented).toBe(1);
  });

  it('delivers warm open links from second-instance', () => {
    const app = Object.assign(new EventEmitter(), { isPackaged: true, setAsDefaultProtocolClient: () => true });
    const opens: { params: OpenLinkParams; launch: 'cold' | 'warm' }[] = [];
    registerAttributionLinks(
      app as unknown as Parameters<typeof registerAttributionLinks>[0],
      () => {},
      (params, launch) => { opens.push({ params, launch }); },
    );
    app.emit('second-instance', {}, ['app', 'onlook://open?utm_source=website&stage=open_page']);
    expect(opens).toEqual([{ params: { utm_source: 'website', stage: 'open_page' }, launch: 'warm' }]);
  });

  it('routes attribution and open links to their respective callbacks', () => {
    const app = Object.assign(new EventEmitter(), { isPackaged: true, setAsDefaultProtocolClient: () => true });
    const attributions: string[] = [];
    const opens: OpenLinkParams[] = [];
    registerAttributionLinks(
      app as unknown as Parameters<typeof registerAttributionLinks>[0],
      (params) => { attributions.push(params.get('ph_id')!); },
      (params) => { opens.push(params); },
      ['app', 'onlook://attribution?ph_id=cold', 'onlook://open?utm_source=cold_open'],
    );
    app.emit('open-url', { preventDefault: () => {} }, 'onlook://open?utm_source=warm_open');
    app.emit('open-url', { preventDefault: () => {} }, 'onlook://attribution?ph_id=warm');
    expect(attributions).toEqual(['cold', 'warm']);
    expect(opens).toEqual([{ utm_source: 'cold_open' }, { utm_source: 'warm_open' }]);
  });

  it('silently drops malformed open links without calling any callback', () => {
    const app = Object.assign(new EventEmitter(), { isPackaged: true, setAsDefaultProtocolClient: () => true });
    const opens: OpenLinkParams[] = [];
    const attributions: string[] = [];
    registerAttributionLinks(
      app as unknown as Parameters<typeof registerAttributionLinks>[0],
      (params) => { attributions.push(params.toString()); },
      (params) => { opens.push(params); },
      ['app', 'onlook://open?utm_source=ok&unknown=bad', 'onlook://open?link_id=not-a-uuid'],
    );
    app.emit('open-url', { preventDefault: () => {} }, 'onlook://open?stage=HAS_UPPER');
    expect(opens).toHaveLength(0);
    expect(attributions).toHaveLength(0);
  });
});

describe('app_opened_from_link telemetry event', () => {
  it('fires once per received link with UTM properties', async () => {
    initTelemetry();
    receiveOpenLink({ utm_source: 'website', utm_campaign: 'launch' }, 'warm');
    await flush();
    expect(openLinkEvents()).toMatchObject([{
      event: 'app_opened_from_link',
      properties: expect.objectContaining({ utm_source: 'website', utm_campaign: 'launch', launch: 'warm' }),
    }]);
  });

  it('fires with all optional properties when provided', async () => {
    initTelemetry();
    receiveOpenLink({
      utm_source: 'website', utm_medium: 'cta', utm_campaign: 'launch',
      utm_content: 'hero', utm_term: 'design', stage: 'open_page',
      link_id: '550e8400-e29b-41d4-a716-446655440000',
    }, 'cold');
    await flush();
    const events = openLinkEvents();
    expect(events).toHaveLength(1);
    expect(events[0]!.properties).toMatchObject({
      utm_source: 'website', utm_medium: 'cta', utm_campaign: 'launch',
      utm_content: 'hero', utm_term: 'design', stage: 'open_page',
      link_id: '550e8400-e29b-41d4-a716-446655440000', launch: 'cold',
    });
  });

  it('fires multiple events for multiple links', async () => {
    initTelemetry();
    receiveOpenLink({ utm_source: 'first' }, 'cold');
    receiveOpenLink({ utm_source: 'second' }, 'warm');
    await flush();
    expect(openLinkEvents()).toHaveLength(2);
  });

  it('queues a link arriving before telemetry init and drains it after', async () => {
    receiveOpenLink({ utm_source: 'website', utm_campaign: 'early' }, 'cold');
    expect(openLinkEvents()).toHaveLength(0);
    initTelemetry();
    await flush();
    expect(openLinkEvents()).toMatchObject([{
      event: 'app_opened_from_link',
      properties: expect.objectContaining({ utm_source: 'website', utm_campaign: 'early', launch: 'cold' }),
    }]);
  });

  it('respects STUDIO_TELEMETRY=0', async () => {
    process.env['STUDIO_TELEMETRY'] = '0';
    initTelemetry();
    receiveOpenLink({ utm_source: 'website' }, 'warm');
    await flush();
    expect(openLinkEvents()).toHaveLength(0);
  });

  it('respects missing PostHog key (no key = no-op)', async () => {
    delete process.env['STUDIO_POSTHOG_KEY'];
    initTelemetry();
    receiveOpenLink({ utm_source: 'website' }, 'warm');
    await flush();
    expect(sent).toHaveLength(0);
  });

  it('carries $process_person_profile: false before sign-in', async () => {
    initTelemetry();
    receiveOpenLink({ utm_source: 'website' }, 'warm');
    await flush();
    const events = openLinkEvents();
    expect(events).toHaveLength(1);
    expect(events[0]!.properties['$process_person_profile']).toBe(false);
  });

  it('pre-init queue drains exactly once; a second init does not replay', async () => {
    receiveOpenLink({ utm_source: 'queued' }, 'cold');
    initTelemetry();
    await flush();
    expect(openLinkEvents()).toHaveLength(1);
    sent = [];
    resetTelemetryForTesting();
    for (const key of ENV_KEYS) delete process.env[key];
    process.env['STUDIO_STATE_ROOT'] = state;
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    process.env['STUDIO_POSTHOG_HOST'] = 'https://collector.invalid';
    setAppForTesting({ getPath: () => userData, getVersion: () => '0.0.0-test', getLocale: () => 'en-US', isPackaged: false });
    initTelemetry();
    await flush();
    expect(openLinkEvents()).toHaveLength(0);
  });

  it('pre-init queue is bounded and silently drops excess links', async () => {
    for (let i = 0; i < 20; i++) receiveOpenLink({ utm_source: `link_${i}` }, 'cold');
    initTelemetry();
    await flush();
    expect(openLinkEvents()).toHaveLength(16);
  });

  it('pre-init queue is cleared when telemetry is disabled, not drained later', async () => {
    receiveOpenLink({ utm_source: 'early' }, 'cold');
    process.env['STUDIO_TELEMETRY'] = '0';
    initTelemetry();
    await flush();
    expect(openLinkEvents()).toHaveLength(0);
    sent = [];
    delete process.env['STUDIO_TELEMETRY'];
    resetTelemetryForTesting();
    for (const key of ENV_KEYS) delete process.env[key];
    process.env['STUDIO_STATE_ROOT'] = state;
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    process.env['STUDIO_POSTHOG_HOST'] = 'https://collector.invalid';
    setAppForTesting({ getPath: () => userData, getVersion: () => '0.0.0-test', getLocale: () => 'en-US', isPackaged: false });
    initTelemetry();
    await flush();
    expect(openLinkEvents()).toHaveLength(0);
  });

  it('headless launches do not fire the event', async () => {
    process.env['AGENT_HEADLESS'] = '1';
    initTelemetry();
    receiveOpenLink({ utm_source: 'website' }, 'warm');
    await flush();
    expect(openLinkEvents()).toHaveLength(0);
  });
});
