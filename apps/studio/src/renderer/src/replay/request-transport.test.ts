// Drives the pinned production SDK entry, not a stand-in: the window this covers is inside
// posthog-js's own `request()`, between an awaited gzip and the transport call (ONL-2904).

import { afterAll, afterEach, beforeEach, expect, test } from 'bun:test';
import { gunzipSync } from 'node:zlib';
import '../testing/dom.js';
import { replayRequestConsent, type ReplayTransportSdk } from './request-consent.js';

interface Dispatch {
  url: string;
  body: string;
  signal: AbortSignal | undefined;
}

const dispatched: Dispatch[] = [];
let heldResponse: Promise<void> | undefined;

function readBody(body: BodyInit | null | undefined): string {
  if (body === undefined || body === null) return '';
  if (typeof body === 'string') return body;
  const view = body instanceof ArrayBuffer ? new Uint8Array(body) : (body as Uint8Array);
  const bytes = Buffer.from(view.buffer, view.byteOffset, view.byteLength);
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) return gunzipSync(bytes).toString('utf8');
  return bytes.toString('utf8');
}

function abortError(): Error {
  const error = new Error('aborted');
  error.name = 'AbortError';
  return error;
}

/** Enough of a recorder configuration for `_onRemoteConfig` to accept it. */
const RECORDER_CONFIG = { token: 'phc_transport_test', sessionRecording: { endpoint: '/s/', recorderVersion: 'v2' }, hasFeatureFlags: false };

const realFetch = globalThis.fetch;
// Records before it reads the signal: a withdrawn payload handed to `fetch` at all is a reached
// sink, whether or not the browser would then refuse to put it on the wire.
const sink = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const signal = init?.signal ?? undefined;
  dispatched.push({ url: String(input), body: readBody(init?.body), signal });
  if (signal?.aborted === true) return Promise.reject(abortError());
  const body = String(input).includes('/config') ? JSON.stringify(RECORDER_CONFIG) : '{}';
  const answer = new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } });
  if (heldResponse === undefined) return Promise.resolve(answer);
  return new Promise<Response>((resolve, reject) => {
    signal?.addEventListener('abort', () => { reject(abortError()); }, { once: true });
    void heldResponse?.then(() => { resolve(answer); });
  });
};
globalThis.fetch = Object.assign(sink, { preconnect: realFetch.preconnect }) as typeof fetch;

interface Gate {
  wait: Promise<void>;
  failWith?: Error;
}

let gate: Gate | undefined;
const NativeCompressionStream = globalThis.CompressionStream;

/** Holds the SDK's native gzip open, so the toggles below land while the payload is mid-compression. */
function holdCompression(failWith?: Error): () => void {
  let open = (): void => {};
  const wait = new Promise<void>((resolve) => { open = resolve; });
  gate = { wait, ...(failWith === undefined ? {} : { failWith }) };
  return open;
}

class GatedCompressionStream {
  readonly writable: WritableStream<BufferSource>;
  readonly readable: ReadableStream<Uint8Array>;

  constructor(format: string) {
    const native = new NativeCompressionStream(format as 'gzip');
    this.writable = native.writable;
    const held = gate;
    this.readable = held === undefined
      ? native.readable
      : new ReadableStream<Uint8Array>({
        async start(controller) {
          await held.wait;
          if (held.failWith !== undefined) {
            controller.error(held.failWith);
            return;
          }
          const reader = native.readable.getReader();
          for (;;) {
            const chunk = await reader.read();
            if (chunk.done) break;
            controller.enqueue(chunk.value);
          }
          controller.close();
        },
      });
  }
}
globalThis.CompressionStream = GatedCompressionStream as unknown as typeof CompressionStream;

const posthog = (await import('posthog-js/dist/module.no-external')).default;

afterAll(() => {
  globalThis.fetch = realFetch;
  globalThis.CompressionStream = NativeCompressionStream;
});

interface TransportRequest {
  method?: string;
  url?: string;
  data?: unknown;
  compression?: string;
  timeout?: number;
  callback?: (response: { statusCode: number }) => void;
}

interface TestSdk extends ReplayTransportSdk {
  _send_request: (request: TransportRequest) => void;
  opt_in_capturing: (options: { captureEventName: false }) => void;
  opt_out_capturing: () => void;
  set_config: (options: Record<string, unknown>) => void;
  get_property: (key: string) => unknown;
  _requestQueue: { _queue: unknown[]; _clearFlushTimeout: () => void };
  _retryQueue: { _queue: unknown[]; unload: () => void };
  _remoteConfigLoader: {
    stop: () => void;
    _loadRemoteConfigJSON: (receive: (config: unknown) => void) => void;
    _onRemoteConfig: (config: unknown) => void;
  };
}

const WITHDRAWN = '$snapshot-before-withdrawal';
const AFTERWARDS = '$snapshot-after-opt-in';

let sdk: TestSdk;
let consent: (enabled: boolean) => void;
let instance = 0;

function snapshot(event: string, compression?: string): TransportRequest {
  return {
    method: 'POST',
    url: 'https://collector.invalid/s/',
    data: [{ event, properties: { $session_id: 'session' } }],
    ...(compression === undefined ? {} : { compression }),
  };
}

beforeEach(() => {
  sdk = posthog.init('phc_transport_test', {
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
  }, `transport_${++instance}`) as unknown as TestSdk;
  consent = replayRequestConsent(sdk);
  consent(true);
  sdk.opt_in_capturing({ captureEventName: false });
  dispatched.length = 0;
  gate = undefined;
  heldResponse = undefined;
});

afterEach(() => {
  consent(false);
  sdk.opt_out_capturing();
  sdk._requestQueue._clearFlushTimeout();
  sdk._retryQueue.unload();
  sdk._remoteConfigLoader.stop();
});

test('a gzipped payload whose compression finishes while analytics is on is delivered', async () => {
  const release = holdCompression();
  sdk._send_request(snapshot(WITHDRAWN, 'gzip-js'));
  expect(dispatched).toEqual([]);
  release();
  await Promise.resolve();
  await new Promise((resolve) => { setTimeout(resolve, 0); });

  expect(dispatched).toHaveLength(1);
  expect(dispatched[0]?.body).toContain(WITHDRAWN);
});

test('a gzipped payload whose compression finishes after analytics went off and on is never dispatched', async () => {
  const release = holdCompression();
  sdk._send_request(snapshot(WITHDRAWN, 'gzip-js'));
  consent(false);
  consent(true);
  sdk.opt_in_capturing({ captureEventName: false });
  release();
  await new Promise((resolve) => { setTimeout(resolve, 0); });

  expect(dispatched).toEqual([]);

  sdk._send_request(snapshot(AFTERWARDS));
  expect(dispatched.map((call) => call.body.includes(AFTERWARDS))).toEqual([true]);
});

test('a compression failure after analytics went off and on dispatches neither fallback', async () => {
  const release = holdCompression(new Error('compression broke'));
  sdk._send_request(snapshot(WITHDRAWN, 'gzip-js'));
  consent(false);
  consent(true);
  sdk.opt_in_capturing({ captureEventName: false });
  release();
  await new Promise((resolve) => { setTimeout(resolve, 0); });

  expect(dispatched).toEqual([]);
});

test('a recorder configuration in flight across an off and on is not aborted and still lands', async () => {
  let answer = (): void => {};
  heldResponse = new Promise<void>((resolve) => { answer = resolve; });
  sdk.set_config({ advanced_disable_flags: false, disable_session_recording: false });
  sdk._remoteConfigLoader._loadRemoteConfigJSON((config) => { sdk._remoteConfigLoader._onRemoteConfig(config); });
  const asked = dispatched.find((call) => call.url.includes('/array/phc_transport_test/config'));
  expect(asked).toBeDefined();

  consent(false);
  consent(true);
  sdk.opt_in_capturing({ captureEventName: false });
  expect(asked?.signal?.aborted).toBe(false);
  answer();
  await new Promise((resolve) => { setTimeout(resolve, 0); });

  expect(sdk.get_property('$session_recording_remote_config')).toMatchObject({ enabled: true });
});

test('an uncompressed request already on the wire is aborted the moment analytics goes off', async () => {
  let answer = (): void => {};
  heldResponse = new Promise<void>((resolve) => { answer = resolve; });
  sdk._send_request(snapshot(WITHDRAWN));
  expect(dispatched).toHaveLength(1);
  expect(dispatched[0]?.signal?.aborted).toBe(false);

  consent(false);
  expect(dispatched[0]?.signal?.aborted).toBe(true);
  answer();
  await new Promise((resolve) => { setTimeout(resolve, 0); });
});

// Last: a read error latches posthog-js's module-level `nativeAsyncGzipDisabled`, after which no
// later request in this process takes the asynchronous path at all.
test('a native gzip read error after analytics went off and on dispatches no uncompressed retry', async () => {
  const readError = new Error('stream unreadable');
  readError.name = 'NotReadableError';
  const release = holdCompression(readError);
  sdk._send_request(snapshot(WITHDRAWN, 'gzip-js'));
  consent(false);
  consent(true);
  sdk.opt_in_capturing({ captureEventName: false });
  release();
  await new Promise((resolve) => { setTimeout(resolve, 0); });

  expect(dispatched).toEqual([]);
});
