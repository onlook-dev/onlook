import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import { attributionQuery, bindWebAttribution, markAttributionQueued, parseAttribution, pendingAttribution, readWebAttribution, retainAttribution } from './attribution.js';

const savedRoot = process.env['STUDIO_STATE_ROOT'];
let root = '';

beforeEach(() => {
  root = makeStateRoot({ name: 'attribution-input' });
  process.env['STUDIO_STATE_ROOT'] = root;
});

afterAll(() => {
  if (savedRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = savedRoot;
  cleanupTempFixtures();
});

function statePath(): string {
  return join(root, 'telemetry', 'web-attribution.json');
}

function seed(version: number, data: unknown): void {
  mkdirSync(join(root, 'telemetry'), { recursive: true });
  writeFileSync(statePath(), JSON.stringify({ version, data }));
}

const attribution = { phId: 'website-person', firstTouch: { first_utm_source: 'website' } };

describe('attribution input', () => {
  it('maps only documented fields and strips URL credentials, queries and fragments', () => {
    const params = new URLSearchParams({
      ph_id: 'website-person',
      utm_source: 'website',
      utm_medium: 'social',
      utm_campaign: 'launch',
      utm_content: 'banner',
      utm_term: 'design',
      initial_referrer: 'https://user:password@referrer.example/path?secret=value#token',
      initial_referring_domain: 'REFERRER.EXAMPLE',
      landing_page: 'https://user:password@onlook.example/download?token=value#secret',
    });
    expect(parseAttribution(params)).toEqual({
      phId: 'website-person',
      firstTouch: {
        first_utm_source: 'website',
        first_utm_medium: 'social',
        first_utm_campaign: 'launch',
        first_utm_content: 'banner',
        first_utm_term: 'design',
        first_referrer: 'https://referrer.example/path',
        first_referring_domain: 'referrer.example',
        first_landing_page: 'https://onlook.example/download',
      },
    });
  });

  it('allows absent and empty optional fields and the direct-referrer sentinel', () => {
    expect(parseAttribution(new URLSearchParams('ph_id=website-person&utm_source=&landing_page='))).toEqual({ phId: 'website-person', firstTouch: {} });
    expect(parseAttribution(new URLSearchParams('ph_id=website-person&initial_referrer=$direct&initial_referring_domain=$direct'))?.firstTouch).toEqual({ first_referrer: '$direct', first_referring_domain: '$direct' });
  });

  it.each([
    'ph_id=website-person&unknown=value',
    'ph_id=website-person&code=credential',
    'ph_id=website-person&ph_id=website-person',
    'ph_id=website-person&utm_source=one&utm_source=one',
    'ph_id=website-person&landing_page=&landing_page=',
    'ph_id=website-person&initial_referring_domain=one&initial_referring_domain=two',
    'ph_id=website%20person',
    'ph_id=%20website-person',
    'ph_id=',
    'utm_source=website',
    'ph_id=website-person&utm_source=%00',
    'ph_id=website-person&utm_source=%09website',
    'ph_id=website-person&utm_source=website%0a',
    'ph_id=website-person&initial_referrer=%09https://example.com',
    'ph_id=website-person&initial_referring_domain=example.com%0d',
    'ph_id=website-person&utm_medium=%7f',
    'ph_id=website-person&utm_campaign=%20%20',
    'ph_id=website-person&initial_referrer=not-a-url',
    'ph_id=website-person&landing_page=file:///private/path',
    'ph_id=website-person&initial_referring_domain=https://example.com',
    'ph_id=website-person&initial_referring_domain=example..com',
    'ph_id=website-person&initial_referring_domain=-example.com',
  ])('rejects the entire malformed payload: %s', (query) => {
    expect(parseAttribution(new URLSearchParams(query))).toBeUndefined();
    expect(retainAttribution(new URLSearchParams(query))).toBe(false);
    expect(readWebAttribution()).toBeUndefined();
  });

  it('bounds the encoded payload and each decoded field', () => {
    const valid = new URLSearchParams({ ph_id: 'a'.repeat(200), utm_source: 'a'.repeat(512), initial_referring_domain: 'a'.repeat(63) });
    expect(parseAttribution(valid)).toBeDefined();
    for (const [key, value] of [
      ['ph_id', 'a'.repeat(201)],
      ['utm_source', 'a'.repeat(513)],
      ['utm_source', ` ${'a'.repeat(512)}`],
      ['utm_medium', `${'a'.repeat(512)} `],
      ['initial_referrer', `${' '.repeat(2048)}https://example.com`],
      ['initial_referring_domain', `${' '.repeat(253)}example.com`],
      ['initial_referrer', `https://example.com/${'a'.repeat(2048)}`],
      ['landing_page', `https://example.com/${'a'.repeat(2048)}`],
      ['initial_referring_domain', 'a'.repeat(254)],
    ] as const) {
      const params = new URLSearchParams({ ph_id: 'website-person' });
      params.set(key, value);
      expect(parseAttribution(params)).toBeUndefined();
    }
    const params = new URLSearchParams({ ph_id: 'website-person' });
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) params.set(key, '☃'.repeat(512));
    expect(params.toString().length).toBeGreaterThan(16_384);
    expect(parseAttribution(params)).toBeUndefined();
  });

  it('projects callbacks without credentials or unknown keys, preserving attribution duplicates', () => {
    const projected = attributionQuery(new URLSearchParams('code=secret&state=csrf&unknown=private&ph_id=website-person&utm_source=website'));
    expect(parseAttribution(projected)).toEqual(attribution);
    expect([...projected.keys()]).toEqual(['ph_id', 'utm_source']);
    projected.append('ph_id', 'website-person');
    expect(parseAttribution(attributionQuery(projected))).toBeUndefined();
  });

  it('refuses a callback speaking the web-link spelling instead of retaining its ID alone', () => {
    for (const query of ['code=secret&state=csrf&ph_id=website-person&first_utm_source=website', 'ph_id=website-person&first_landing_page=https://onlook.example/download', 'ph_id=website-person&utm_source=website&first_referrer=$direct']) {
      expect([...attributionQuery(new URLSearchParams(query)).keys()]).toEqual([]);
      expect(retainAttribution(attributionQuery(new URLSearchParams(query)))).toBe(false);
    }
    expect(readWebAttribution()).toBeUndefined();
    // The real handoff still lands afterwards, with its first touch intact.
    expect(retainAttribution(new URLSearchParams('ph_id=website-person&utm_source=website'))).toBe(true);
    expect(readWebAttribution()?.attribution).toEqual(attribution);
  });
});

describe('attribution v2 state', () => {
  it('retains the first valid payload and never replaces it with a different ID or later touch', () => {
    expect(retainAttribution(new URLSearchParams('ph_id=website-person&utm_source=website'))).toBe(true);
    expect(retainAttribution(new URLSearchParams('ph_id=other-person'))).toBe(false);
    expect(retainAttribution(new URLSearchParams('ph_id=website-person&utm_source=later'))).toBe(false);
    expect(readWebAttribution()).toEqual({ attribution, queued: false, linked: false });
    expect(JSON.parse(readFileSync(statePath(), 'utf8'))).toEqual({ version: 2, data: { attribution, queued: false, linked: false } });
    expect(pendingAttribution()).toEqual(attribution);
  });

  it('persists candidate and linked receipts independently across reads', () => {
    retainAttribution(new URLSearchParams('ph_id=website-person&utm_source=website'));
    markAttributionQueued(true);
    expect(readWebAttribution()).toEqual({ attribution, queued: false, linked: true });
    expect(pendingAttribution()).toBeUndefined();
    markAttributionQueued();
    expect(readWebAttribution()).toEqual({ attribution, queued: true, linked: true });
    expect(pendingAttribution()).toBeUndefined();
  });

  it('binds an account durably without requiring a receipt and refuses another account', () => {
    retainAttribution(new URLSearchParams('ph_id=website-person&utm_source=website'));
    expect(bindWebAttribution('')).toBe(false);
    expect(bindWebAttribution('user_first')).toBe(true);
    expect(bindWebAttribution('user_first')).toBe(true);
    expect(bindWebAttribution('user_second')).toBe(false);
    expect(readWebAttribution()).toEqual({ attribution, queued: false, linked: false, boundTo: 'user_first' });
    markAttributionQueued();
    expect(readWebAttribution()).toEqual({ attribution, queued: true, linked: false, boundTo: 'user_first' });
  });

  it.each([true, false])('migrates v1 useWebId=%s with fresh receipts and durable legacy provenance', (useWebId) => {
    seed(1, { attribution, queued: true, linked: true, useWebId, boundTo: 'user_first' });
    expect(readWebAttribution()).toEqual({ attribution, queued: false, linked: false, boundTo: 'user_first', legacyWebId: attribution.phId });
    expect(pendingAttribution()).toEqual(attribution);
    markAttributionQueued();
    const data = { attribution, queued: true, linked: false, boundTo: 'user_first', legacyWebId: attribution.phId };
    expect(JSON.parse(readFileSync(statePath(), 'utf8'))).toEqual({ version: 2, data });
    markAttributionQueued(true);
    expect(readWebAttribution()).toEqual({ ...data, linked: true });
    expect(bindWebAttribution('user_second')).toBe(false);
  });

  it('upgrades an unbound v1 record when ownership is persisted', () => {
    seed(1, { attribution, queued: true, linked: true, useWebId: false });
    expect(bindWebAttribution('user_first')).toBe(true);
    expect(JSON.parse(readFileSync(statePath(), 'utf8'))).toEqual({ version: 2, data: { attribution, queued: false, linked: false, boundTo: 'user_first', legacyWebId: attribution.phId } });
  });

  it.each([
    { attribution, queued: true, linked: true },
    { attribution, queued: true, linked: true, useWebId: 'true' },
    { attribution, queued: true, linked: true, useWebId: false, boundTo: 12 },
  ])('rejects invalid legacy shapes instead of trusting old receipts: %j', (data) => {
    seed(1, data);
    expect(readWebAttribution()).toBeUndefined();
  });

  it.each([
    { first_utm_source: 1 },
    { private: 'secret' },
    { first_referrer: 'file:///private' },
    { first_referring_domain: 'example.com.' },
  ])('preserves legacy identity provenance while dropping invalid optional metadata: %j', (firstTouch) => {
    seed(1, { attribution: { phId: 'website-person', firstTouch }, queued: true, linked: true, useWebId: false, boundTo: 'user_first' });
    expect(readWebAttribution()).toEqual({ attribution: { phId: 'website-person', firstTouch: {} }, queued: false, linked: false, legacyWebId: 'website-person', boundTo: 'user_first' });
    expect(retainAttribution(new URLSearchParams('ph_id=other-person'))).toBe(false);
  });

  it('rejects mismatched v2 provenance and preserves future schemas byte for byte', () => {
    seed(2, { attribution, queued: false, linked: false, legacyWebId: 'other-person' });
    expect(readWebAttribution()).toBeUndefined();
    seed(3, { attribution, queued: false, linked: false });
    const bytes = readFileSync(statePath(), 'utf8');
    expect(readWebAttribution()).toBeUndefined();
    expect(retainAttribution(new URLSearchParams('ph_id=other-person'))).toBe(false);
    expect(bindWebAttribution('user_first')).toBe(false);
    markAttributionQueued(true);
    expect(readFileSync(statePath(), 'utf8')).toBe(bytes);
  });

  it('does not claim ownership or receipts if persistence fails', () => {
    mkdirSync(statePath(), { recursive: true });
    expect(retainAttribution(new URLSearchParams('ph_id=website-person'))).toBe(false);
    expect(bindWebAttribution('user_first')).toBe(false);
    markAttributionQueued();
    expect(readWebAttribution()).toBeUndefined();
  });
});
