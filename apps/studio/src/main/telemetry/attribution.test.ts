import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { EventEmitter } from 'node:events';
import { mkdirSync, mkdtempSync, renameSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { attributionParams, registerAttributionLinks } from './attribution-links.js';
import { pendingAttribution, readWebAttribution, retainAttribution } from './attribution.js';
import { resetIdentityCache, writeIdentity } from '../identity/store.js';
import { writeStateFile } from '../state/file.js';
import * as stateFiles from '../state/file.js';
import { pendingBatches, writeBatch, type OutboxEvent } from './outbox.js';
import { readGrant } from './grant.js';
import { primeFlags, resetFlagsForTesting } from '../flags/index.js';
import { capture, currentDistinctId, flush, identifyPerson, initTelemetry, receiveWebAttribution, resetTelemetryForTesting, setAppForTesting } from './index.js';

const ENV_KEYS = ['STUDIO_STATE_ROOT', 'STUDIO_POSTHOG_KEY', 'STUDIO_POSTHOG_HOST', 'STUDIO_TELEMETRY', 'AGENT_HEADLESS', 'STUDIO_TELEMETRY_HEADLESS', 'STUDIO_FLAGS', 'MAIN_VITE_FLAG_DEFAULTS'] as const;
const originalEnv = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;
let state: string;
let userData: string;
let sent: OutboxEvent[];
let status: number;
const params = (id = 'web-anonymous-id', source = 'test'): URLSearchParams => new URLSearchParams({
  ph_id: id, utm_source: source, utm_medium: 'social', utm_campaign: 'attribution-check', utm_content: 'button', utm_term: 'design',
  initial_referrer: 'https://referrer.test/article?secret=private#token', initial_referring_domain: 'referrer.test',
  landing_page: 'https://onlook.com/start?utm_source=test&code=private#token',
});
const webLink = (id = 'web-anonymous-id', source = 'test'): URLSearchParams => attributionParams(`onlook://web-link?${new URLSearchParams({
  ph_id: id, first_utm_source: source, first_utm_medium: 'social', first_utm_campaign: 'attribution-check', first_utm_content: 'button', first_utm_term: 'design',
  first_referrer: 'https://referrer.test/article?secret=private#token', first_referring_domain: 'referrer.test',
  first_landing_page: 'https://onlook.com/start?utm_source=test&code=private#token',
})}`)!;
const firstTouch = {
  first_utm_source: 'test', first_utm_medium: 'social', first_utm_campaign: 'attribution-check', first_utm_content: 'button', first_utm_term: 'design',
  first_referrer: 'https://referrer.test/article', first_referring_domain: 'referrer.test', first_landing_page: 'https://onlook.com/start',
};
const attributionEvents = (): OutboxEvent[] => sent.filter((event) => event.event.startsWith('web_attribution'));

beforeEach(() => {
  resetTelemetryForTesting();
  resetIdentityCache();
  resetFlagsForTesting();
  for (const key of ENV_KEYS) delete process.env[key];
  state = mkdtempSync(join(tmpdir(), 'studio-attribution-state-'));
  userData = mkdtempSync(join(tmpdir(), 'studio-attribution-userdata-'));
  process.env['STUDIO_STATE_ROOT'] = state;
  process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
  process.env['STUDIO_POSTHOG_HOST'] = 'https://collector.invalid';
  setAppForTesting({ getPath: () => userData, getVersion: () => '0.0.0-test', getLocale: () => 'en-US', isPackaged: false });
  sent = [];
  status = 200;
  globalThis.fetch = Object.assign(async (_input: unknown, init?: RequestInit) => {
    sent.push(...(JSON.parse(String(init?.body)) as { batch: OutboxEvent[] }).batch);
    return new Response('{}', { status });
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

describe('website attribution link-only wire behavior', () => {
  it.each([false, true])('a nearly full queue persists its attribution receipt with flag=%s', async (enabled) => {
    if (enabled) process.env['STUDIO_FLAGS'] = 'web-attribution-link';
    initTelemetry();
    await flush();
    for (let count = 0; count < 19; count += 1) capture('app_opened', { is_first_launch: false, locale: 'en-US' });
    receiveWebAttribution(params());
    await flush();
    expect(enabled ? readWebAttribution()?.linked : readWebAttribution()?.queued).toBe(true);
    receiveWebAttribution(params());
    await flush();
    resetTelemetryForTesting();
    initTelemetry();
    await flush();
    expect(attributionEvents()).toHaveLength(1);
  });
  it('flag off logs a candidate without changing person properties', async () => {
    initTelemetry();
    const installId = currentDistinctId();
    receiveWebAttribution(params());
    await flush();
    expect(currentDistinctId()).toBe(installId);
    expect(attributionEvents()).toMatchObject([{ event: 'web_attribution_candidate', distinct_id: installId, properties: { website_person_id: 'web-anonymous-id', ...firstTouch, $process_person_profile: false } }]);
    expect(sent.some((event) => event.event.startsWith('$'))).toBe(false);
    receiveWebAttribution(params());
    resetTelemetryForTesting();
    initTelemetry();
    await flush();
    expect(attributionEvents()).toHaveLength(1);
  });

  it('flag on sets first touch once and emits one linked event', async () => {
    process.env['STUDIO_FLAGS'] = 'web-attribution-link';
    initTelemetry();
    const installId = currentDistinctId();
    receiveWebAttribution(params());
    receiveWebAttribution(params('web-anonymous-id', 'later'));
    await flush();
    expect(currentDistinctId()).toBe(installId);
    expect(sent.filter((event) => event.event === '$set')).toMatchObject([{ distinct_id: installId, properties: { $set_once: { website_person_id: 'web-anonymous-id', ...firstTouch } } }]);
    expect(sent.filter((event) => event.event === '$set')).toHaveLength(1);
    expect(attributionEvents()).toMatchObject([{ event: 'web_attribution_linked', distinct_id: installId, properties: { website_person_id: 'web-anonymous-id', ...firstTouch } }]);
    resetTelemetryForTesting();
    initTelemetry();
    receiveWebAttribution(params());
    await flush();
    expect(attributionEvents()).toHaveLength(1);
  });

  it('never identifies aliases or merges the web ID before or after sign-in', async () => {
    process.env['STUDIO_FLAGS'] = 'web-attribution-link';
    receiveWebAttribution(params());
    initTelemetry();
    const installId = currentDistinctId();
    expect(installId).not.toBe('web-anonymous-id');
    identifyPerson(writeIdentity({ email: 'person@example.com', source: 'provider', subject: 'user_existing' }));
    receiveWebAttribution(params());
    await flush();
    expect(currentDistinctId()).toBe('user_existing');
    expect(sent.filter((event) => event.event === '$identify').map((event) => event.properties['$anon_distinct_id'])).toEqual([installId]);
    expect(sent.some((event) => event.event === '$create_alias')).toBe(false);
    expect(sent.filter((event) => ['$identify', '$create_alias', '$merge_dangerously'].includes(event.event)).some((event) => JSON.stringify(event).includes('web-anonymous-id'))).toBe(false);
    expect(sent.some((event) => event.distinct_id === 'web-anonymous-id')).toBe(false);
  });

  it('a second web ID is ignored across restarts and flag transitions', async () => {
    initTelemetry();
    receiveWebAttribution(params());
    await flush();
    resetTelemetryForTesting();
    process.env['STUDIO_FLAGS'] = 'web-attribution-link';
    initTelemetry();
    receiveWebAttribution(params('second-web', 'second'));
    await flush();
    expect(sent.filter((event) => event.event === 'web_attribution_linked')).toHaveLength(1);
    expect(sent.filter((event) => event.event === '$set')).toMatchObject([{ properties: { $set_once: { website_person_id: 'web-anonymous-id', ...firstTouch } } }]);
    expect(JSON.stringify(sent)).not.toContain('second-web');
    expect(readWebAttribution()?.attribution.phId).toBe('web-anonymous-id');
  });

  it('a web-link handoff links the same first touch without merging or replacing the first web ID', async () => {
    initTelemetry();
    const installId = currentDistinctId();
    receiveWebAttribution(webLink());
    await flush();
    expect(attributionEvents()).toMatchObject([{ event: 'web_attribution_candidate', distinct_id: installId, properties: { website_person_id: 'web-anonymous-id', ...firstTouch, $process_person_profile: false } }]);
    expect(sent.some((event) => event.event.startsWith('$'))).toBe(false);
    resetTelemetryForTesting();
    process.env['STUDIO_FLAGS'] = 'web-attribution-link';
    initTelemetry();
    receiveWebAttribution(webLink('second-web', 'second'));
    await flush();
    expect(currentDistinctId()).toBe(installId);
    expect(sent.filter((event) => event.event === '$set')).toMatchObject([{ distinct_id: installId, properties: { $set_once: { website_person_id: 'web-anonymous-id', ...firstTouch } } }]);
    expect(sent.filter((event) => event.event === 'web_attribution_linked')).toHaveLength(1);
    expect(sent.some((event) => ['$identify', '$create_alias', '$merge_dangerously'].includes(event.event))).toBe(false);
    expect(JSON.stringify(sent)).not.toContain('second-web');
  });

  it('malformed handoffs cannot send attribution or change identity', async () => {
    process.env['STUDIO_FLAGS'] = 'web-attribution-link';
    initTelemetry();
    const installId = currentDistinctId();
    for (const query of ['ph_id=', 'ph_id=bad%20id', 'ph_id=bad%0A', 'ph_id=one&ph_id=two', 'ph_id=web&email=secret', 'ph_id=web&utm_source=ok&utm_source=bad', 'ph_id=web&landing_page=javascript:alert(1)', `ph_id=${'x'.repeat(201)}`, `ph_id=web&utm_term=${'x'.repeat(513)}`, 'ph_id=web&first_utm_source=ok']) receiveWebAttribution(new URLSearchParams(query));
    await flush();
    expect(currentDistinctId()).toBe(installId);
    expect(attributionEvents()).toHaveLength(0);
    expect(sent.some((event) => event.event === '$set')).toBe(false);
    expect(readWebAttribution()).toBeUndefined();
  });

  it('a signed-in candidate writes no person properties and stays owned across account switches', async () => {
    initTelemetry();
    identifyPerson(writeIdentity({ email: 'first@example.com', source: 'provider', subject: 'user_first' }));
    await flush();
    sent = [];
    receiveWebAttribution(params());
    await flush();
    expect(sent).toHaveLength(1);
    expect(sent).toMatchObject([{ event: 'web_attribution_candidate', distinct_id: 'user_first', properties: { $process_person_profile: false } }]);
    expect(readWebAttribution()?.boundTo).toBe('user_first');
    process.env['STUDIO_FLAGS'] = 'web-attribution-link';
    identifyPerson(writeIdentity({ email: 'second@example.com', source: 'provider', subject: 'user_second' }));
    await flush();
    expect(sent.some((event) => event.event === 'web_attribution_linked')).toBe(false);
    identifyPerson(writeIdentity({ email: 'first@example.com', source: 'provider', subject: 'user_first' }));
    await flush();
    expect(sent.filter((event) => event.event === 'web_attribution_linked')).toMatchObject([{ distinct_id: 'user_first' }]);
  });

  it('attribution arriving during sign-in waits for the verified account', async () => {
    process.env['STUDIO_FLAGS'] = 'web-attribution-link';
    writeIdentity({ email: 'person@example.com', source: 'provider', subject: 'user_existing' });
    initTelemetry();
    retainAttribution(params());
    expect(attributionEvents()).toHaveLength(0);
    identifyPerson(writeIdentity({ email: 'person@example.com', source: 'provider', subject: 'user_existing' }));
    await flush();
    expect(sent.filter((event) => event.event === 'web_attribution_linked')).toMatchObject([{ distinct_id: 'user_existing' }]);
    expect(sent.filter((event) => event.properties['$set_once'] !== undefined)).toMatchObject([{ distinct_id: 'user_existing' }]);
  });

  it('offline delivery replays links with the same dedupe UUIDs', async () => {
    process.env['STUDIO_FLAGS'] = 'web-attribution-link';
    status = 503;
    initTelemetry();
    receiveWebAttribution(params());
    await flush();
    const linked = sent.find((event) => event.event === 'web_attribution_linked');
    expect(linked).toBeDefined();
    expect(pendingBatches().length).toBeGreaterThan(0);
    resetTelemetryForTesting();
    status = 200;
    initTelemetry();
    await flush();
    expect(sent.filter((event) => event.event === 'web_attribution_linked').every((event) => event.uuid === linked?.uuid)).toBe(true);
    expect(pendingBatches()).toHaveLength(0);
  });

  it('failed outbox persistence retries without retargeting another account', async () => {
    process.env['STUDIO_FLAGS'] = 'web-attribution-link';
    mkdirSync(join(state, 'telemetry'), { recursive: true });
    writeFileSync(join(state, 'telemetry', 'outbox'), 'not a directory');
    initTelemetry();
    identifyPerson(writeIdentity({ email: 'first@example.com', source: 'provider', subject: 'user_first' }));
    receiveWebAttribution(params());
    await flush();
    expect(readWebAttribution()?.boundTo).toBe('user_first');
    // The receipt lands even when the batch cannot: a link this launch already sent is never counted twice.
    expect(readWebAttribution()?.linked).toBe(true);
    expect(sent.filter((event) => event.event === 'web_attribution_linked')).toMatchObject([{ distinct_id: 'user_first' }]);
    resetTelemetryForTesting();
    renameSync(join(state, 'telemetry', 'outbox'), join(state, 'telemetry', 'outbox-blocked'));
    writeIdentity({ email: 'second@example.com', source: 'provider', subject: 'user_second' });
    initTelemetry();
    identifyPerson(writeIdentity({ email: 'second@example.com', source: 'provider', subject: 'user_second' }));
    await flush();
    expect(sent.some((event) => event.distinct_id === 'user_second' && event.event === 'web_attribution_linked')).toBe(false);
    identifyPerson(writeIdentity({ email: 'first@example.com', source: 'provider', subject: 'user_first' }));
    await flush();
    expect(readWebAttribution()?.linked).toBe(true);
    expect(sent.filter((event) => event.event === 'web_attribution_linked')).toHaveLength(1);
  });

  it('an unwritable receipt sends no link at all rather than one per launch', async () => {
    process.env['STUDIO_FLAGS'] = 'web-attribution-link';
    initTelemetry();
    receiveWebAttribution(params());
    await flush();
    sent = [];
    resetTelemetryForTesting();
    const originalWrite = stateFiles.writeStateFile;
    const write = spyOn(stateFiles, 'writeStateFile').mockImplementation((path, version, data) => path === join(state, 'telemetry', 'web-attribution.json') ? false : originalWrite(path, version, data));
    try {
      initTelemetry();
      await flush();
      expect(attributionEvents()).toHaveLength(0);
      expect(sent.some((event) => event.event === '$set')).toBe(false);
    } finally {
      write.mockRestore();
    }
  });

  it('a remotely enabled flag links a candidate the install already logged', async () => {
    primeFlags(() => false);
    initTelemetry();
    receiveWebAttribution(params());
    await flush();
    expect(attributionEvents()).toMatchObject([{ event: 'web_attribution_candidate' }]);
    sent = [];
    resetTelemetryForTesting();
    resetFlagsForTesting();
    // The rollout answer arrives through `primeFlags`, not the env override every other case here uses.
    primeFlags((key) => key === 'web-attribution-link');
    initTelemetry();
    await flush();
    expect(attributionEvents()).toMatchObject([{ event: 'web_attribution_linked', properties: { website_person_id: 'web-anonymous-id', ...firstTouch } }]);
    sent = [];
    resetTelemetryForTesting();
    primeFlags((key) => key === 'web-attribution-link');
    initTelemetry();
    await flush();
    expect(attributionEvents()).toHaveLength(0);
  });

  it('legacy persisted web IDs never return as desktop identities after restart', async () => {
    writeStateFile(join(state, 'telemetry', 'web-attribution.json'), 1, { attribution: { phId: 'web-anonymous-id', firstTouch: { ...firstTouch, first_referring_domain: 'example.com.' } }, queued: true, linked: true, useWebId: true });
    writeStateFile(join(userData, 'telemetry-anonymous-id'), 1, { id: 'web-anonymous-id', reset: false });
    initTelemetry();
    const replacement = currentDistinctId();
    expect(replacement).not.toBe('web-anonymous-id');
    await flush();
    resetTelemetryForTesting();
    initTelemetry();
    expect(currentDistinctId()).toBe(replacement);
    identifyPerson(writeIdentity({ email: 'person@example.com', source: 'provider', subject: 'user_existing' }));
    await flush();
    expect(sent.filter((event) => event.event === '$identify').map((event) => event.properties['$anon_distinct_id'])).not.toContain('web-anonymous-id');
  });

  it('legacy identity migration stays safe when the replacement cannot persist', async () => {
    writeStateFile(join(state, 'telemetry', 'web-attribution.json'), 1, { attribution: { phId: 'web-anonymous-id', firstTouch }, queued: true, linked: false, useWebId: true });
    writeStateFile(join(userData, 'telemetry-anonymous-id'), 1, { id: 'web-anonymous-id', reset: false });
    const originalWrite = stateFiles.writeStateFile;
    const write = spyOn(stateFiles, 'writeStateFile').mockImplementation((path, version, data) => path === join(userData, 'telemetry-anonymous-id') ? false : originalWrite(path, version, data));
    try {
      initTelemetry();
      expect(currentDistinctId()).not.toBe('web-anonymous-id');
      identifyPerson(writeIdentity({ email: 'person@example.com', source: 'provider', subject: 'user_existing' }));
      await flush();
      expect(sent.filter((event) => ['$identify', '$merge_dangerously'].includes(event.event)).some((event) => JSON.stringify(event).includes('web-anonymous-id'))).toBe(false);
    } finally {
      write.mockRestore();
    }
  });

  it('legacy outbox replay drops website merges and property writes but preserves desktop sign-in', async () => {
    initTelemetry();
    await flush();
    const grant = readGrant();
    if (grant === undefined) throw new Error('missing consent grant');
    const event = (name: string, properties: Record<string, unknown>, id = 'user_existing'): OutboxEvent => ({ event: name, properties, distinct_id: id, timestamp: new Date().toISOString(), uuid: crypto.randomUUID() });
    const unrelated = event('$identify', { $anon_distinct_id: 'desktop-install' });
    writeBatch('old-launch', [event('$identify', { $anon_distinct_id: 'web-anonymous-id' }), event('$create_alias', { alias: 'web-anonymous-id' }), event('$merge_dangerously', { distinct_ids: ['user_existing', 'web-anonymous-id'] }), event('$set', { $set_once: firstTouch }), event('app_opened', {}, 'web-anonymous-id'), unrelated], grant);
    resetTelemetryForTesting();
    writeStateFile(join(state, 'telemetry', 'web-attribution.json'), 1, { attribution: { phId: 'web-anonymous-id', firstTouch: { ...firstTouch, first_referring_domain: 'example.com.' } }, queued: true, linked: true, useWebId: false });
    sent = [];
    initTelemetry();
    await flush();
    expect(sent.filter((entry) => entry.event.startsWith('$'))).toEqual([unrelated]);
    expect(sent.some((entry) => entry.distinct_id === 'web-anonymous-id')).toBe(false);
    expect(attributionEvents()).toHaveLength(1);
    expect(pendingBatches()).toHaveLength(0);
  });

  it('legacy outbox replay still drops website merges when the record no longer validates', async () => {
    initTelemetry();
    await flush();
    const grant = readGrant();
    if (grant === undefined) throw new Error('missing consent grant');
    const event = (name: string, properties: Record<string, unknown>, id = 'user_existing'): OutboxEvent => ({ event: name, properties, distinct_id: id, timestamp: new Date().toISOString(), uuid: crypto.randomUUID() });
    const unrelated = event('$identify', { $anon_distinct_id: 'desktop-install' });
    writeBatch('old-launch', [event('$merge_dangerously', { alias: 'web-anonymous-id' }), event('app_opened', {}, 'web-anonymous-id'), unrelated], grant);
    resetTelemetryForTesting();
    // A v1 file with no `useWebId` fails the full record read, so only the raw web ID can arm the scrub.
    writeStateFile(join(state, 'telemetry', 'web-attribution.json'), 1, { attribution: { phId: 'web-anonymous-id', firstTouch }, queued: true, linked: true });
    expect(readWebAttribution()).toBeUndefined();
    sent = [];
    initTelemetry();
    await flush();
    expect(sent.filter((entry) => entry.event.startsWith('$'))).toEqual([unrelated]);
    expect(sent.some((entry) => entry.distinct_id === 'web-anonymous-id')).toBe(false);
  });

  it('keyless opt-out and headless launches leave handoffs pending', async () => {
    delete process.env['STUDIO_POSTHOG_KEY'];
    initTelemetry();
    receiveWebAttribution(params());
    await flush();
    expect(sent).toHaveLength(0);
    expect(pendingAttribution()?.phId).toBe('web-anonymous-id');
    for (const setting of ['STUDIO_TELEMETRY', 'AGENT_HEADLESS'] as const) {
      resetTelemetryForTesting();
      process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
      process.env[setting] = setting === 'STUDIO_TELEMETRY' ? '0' : '1';
      initTelemetry();
      await flush();
      expect(sent).toHaveLength(0);
      expect(pendingAttribution()?.phId).toBe('web-anonymous-id');
      delete process.env[setting];
    }
  });
});

it('attribution and auth callbacks remain independent across all delivery channels', () => {
  const app = Object.assign(new EventEmitter(), { isPackaged: true, setAsDefaultProtocolClient: () => true });
  const received: string[] = [];
  registerAttributionLinks(app as unknown as Parameters<typeof registerAttributionLinks>[0], (payload) => { received.push(payload.get('ph_id')!); }, () => {}, ['app', 'onlook://auth/callback?code=secret&state=auth', 'onlook://attribution?ph_id=cold', 'onlook://web-link?ph_id=cold-link']);
  let prevented = 0;
  app.emit('open-url', { preventDefault: () => { prevented += 1; } }, 'onlook://auth/callback?code=secret&state=auth');
  expect(prevented).toBe(0);
  app.emit('open-url', { preventDefault: () => { prevented += 1; } }, 'onlook://attribution?ph_id=mac');
  app.emit('open-url', { preventDefault: () => { prevented += 1; } }, 'onlook://web-link?ph_id=mac-link');
  app.emit('second-instance', {}, ['app', 'onlook://attribution?ph_id=warm', 'onlook://web-link?ph_id=warm-link', 'onlook://auth/callback?code=secret&state=auth']);
  expect(received).toEqual(['cold', 'cold-link', 'mac', 'mac-link', 'warm', 'warm-link']);
  expect(prevented).toBe(2);
  for (const raw of ['https://attribution?ph_id=web', 'onlook://elsewhere?ph_id=web', 'onlook://attribution/path?ph_id=web', 'onlook://user@attribution?ph_id=web', 'onlook://attribution?ph_id=web#secret', 'malformed', `onlook://attribution?ph_id=${'x'.repeat(16_384)}`,
    'onlook://web-link?ph_id=web&utm_source=legacy', 'onlook://web-link?ph_id=web&first_utm_source=one&first_utm_source=two', 'onlook://web-link?ph_id=one&ph_id=two', 'onlook://web-link?ph_id=web&email=secret', 'onlook://web-link/path?ph_id=web', 'onlook://web-link?ph_id=web#secret',
    'onlook://user@web-link?ph_id=web', 'onlook://user:password@web-link?ph_id=web', 'onlook://web-link:8080?ph_id=web', `onlook://web-link?ph_id=${'x'.repeat(16_384)}`]) expect(attributionParams(raw)).toBeUndefined();
  expect(attributionParams('onlook://web-link?ph_id=web&first_utm_source=site&first_referring_domain=referrer.test&first_landing_page=https%3A%2F%2Fonlook.com%2Fstart')?.toString())
    .toBe(new URLSearchParams({ ph_id: 'web', utm_source: 'site', initial_referring_domain: 'referrer.test', landing_page: 'https://onlook.com/start' }).toString());
});
