import { afterAll, afterEach, beforeEach, expect, test } from 'bun:test';
import '../testing/dom.js';
import { replayRequestConsent, type ReplayTransportSdk } from './request-consent.js';

const originalFetch = globalThis.fetch;
globalThis.fetch = Object.assign(async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }), { preconnect: originalFetch.preconnect }) as typeof fetch;
const posthog = (await import('posthog-js/dist/module.no-external')).default;
afterAll(() => { globalThis.fetch = originalFetch; });

interface Request {
  method?: string;
  url?: string;
  data?: unknown;
  callback?: (response: { statusCode: number; json?: unknown }) => void;
}

interface TestSdk extends ReplayTransportSdk {
  capture: (event: string) => void;
  opt_out_capturing: () => void;
  opt_in_capturing: (options: { captureEventName: false }) => void;
  set_config: (options: Record<string, unknown>) => void;
  get_property: (key: string) => unknown;
  _remoteConfigLoader: { _loadRemoteConfigJSON: (receive: (config: unknown) => void) => void; _onRemoteConfig: (config: unknown) => void; stop: () => void };
  _requestQueue: { _queue: unknown[]; _clearFlushTimeout: () => void; _formatQueue: () => Record<string, Request> };
  _retryQueue: { _queue: unknown[]; retriableRequest: (request: Request) => void; _flush: () => void; unload: () => void };
}

let sdk: TestSdk;
let sent: Request[];
let consent: (enabled: boolean) => void;
let instance = 0;

beforeEach(() => {
  sdk = posthog.init('phc_consent_test', {
    api_host: 'https://collector.invalid',
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    advanced_disable_flags: true,
    disable_external_dependency_loading: true,
    disable_session_recording: true,
    disableDeviceModel: true,
    persistence: 'memory',
    opt_out_capturing_persistence_type: 'localStorage',
    opt_out_useragent_filter: true,
  }, `consent_${++instance}`) as unknown as TestSdk;
  sent = [];
  sdk._send_request = (request) => { sent.push(request as Request); };
  consent = replayRequestConsent(sdk);
  consent(true);
  sdk.opt_in_capturing({ captureEventName: false });
});

afterEach(() => {
  consent(false);
  sdk.opt_out_capturing();
  sdk._requestQueue._clearFlushTimeout();
  sdk._retryQueue.unload();
  sdk._remoteConfigLoader.stop();
});

test('the pinned SDK drops failed replay retries across off and on', () => {
  sdk._retryQueue.retriableRequest({ url: 'https://collector.invalid/s/', data: [{ event: '$snapshot' }] });
  expect(sent).toHaveLength(1);
  sent[0]?.callback?.({ statusCode: 503 });
  expect(sdk._retryQueue._queue).toHaveLength(1);

  consent(false);
  consent(true);
  sdk._retryQueue._flush();

  expect(sdk._retryQueue._queue).toHaveLength(0);
  expect(sent).toHaveLength(1);
  sdk._retryQueue.retriableRequest({ url: 'https://collector.invalid/s/', data: [{ event: 'new-snapshot' }] });
  expect(sent).toHaveLength(2);
});

test('a failed in-flight response after rapid off and on cannot enqueue its old payload', () => {
  sdk._retryQueue.retriableRequest({ url: 'https://collector.invalid/s/', data: [{ event: '$snapshot' }] });
  const response = sent[0]?.callback;
  expect(response).toBeDefined();
  consent(false);
  consent(true);
  response?.({ statusCode: 503 });

  expect(sdk._retryQueue._queue).toHaveLength(0);
  expect(sent).toHaveLength(1);
});

test('rapid off and on discards buffered requests and never collects while opted out', () => {
  sdk.capture('before-withdrawal');
  expect(sdk._requestQueue._queue.length).toBeGreaterThan(0);
  consent(false);
  sdk.opt_out_capturing();
  sdk.capture('while-off');
  consent(true);
  sdk.opt_in_capturing({ captureEventName: false });

  expect(sdk.__request_queue).toHaveLength(0);
  expect(sdk._requestQueue._queue).toHaveLength(0);
  expect(sdk._requestQueue._formatQueue()).toEqual({});
  expect(sent).toHaveLength(0);
});

test('an incompatible SDK queue layout leaves transport disabled after withdrawal', () => {
  consent(false);
  consent(true);
  sdk._requestQueue._queue = undefined as unknown as unknown[];
  consent(false);
  consent(true);
  sdk._send_request({});
  expect(sent).toHaveLength(0);
  sdk._requestQueue._queue = [];
});

test('a delayed initial recording configuration still loads across off and on', () => {
  expect(sdk.get_property('$session_recording_remote_config')).toBeUndefined();
  sdk.set_config({ advanced_disable_flags: false, disable_session_recording: false });
  sdk._remoteConfigLoader._loadRemoteConfigJSON((config) => { sdk._remoteConfigLoader._onRemoteConfig(config); });
  const request = sent.find((candidate) => candidate.method === 'GET' && candidate.url?.includes('/array/phc_consent_test/config'));
  expect(request?.callback).toBeDefined();

  consent(false);
  sdk.opt_out_capturing();
  consent(true);
  sdk.opt_in_capturing({ captureEventName: false });
  request?.callback?.({ statusCode: 200, json: { token: 'phc_consent_test', sessionRecording: { endpoint: '/s/', recorderVersion: 'v2' }, hasFeatureFlags: false } });

  expect(sdk.get_property('$session_recording_remote_config')).toMatchObject({ enabled: true });
});
