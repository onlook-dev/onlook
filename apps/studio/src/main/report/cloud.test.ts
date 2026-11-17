import { beforeEach, expect, test } from 'bun:test';
import type { ReportProviderRequest } from '@studio/events';
import { MIN_REPORT_INTERVAL_MS, REPORTS_PER_LAUNCH, resetReportBoundsForTesting, submitReport, type ReportDeps } from './index.js';
import { ReportSubmissionError } from '../cloud/client.js';
import type { ReportProperties } from './payload.js';

const image = { contentType: 'image/png' as const,
  bytes: new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64')) };
const request = { message: 'My frame disappeared', lane: 'bug' as const, entryPoint: 'menu' as const, image };
const context = { installId: 'install', launchId: 'launch', appVersion: '1', releaseChannel: 'alpha', platform: 'desktop' };

function harness() {
  const filed: ReportProviderRequest[] = [];
  const analytics: ReportProperties[] = [];
  const deps: ReportDeps = {
    now: () => 10000,
    installId: () => 'install',
    identity: () => null,
    context: () => context,
    capture: async (properties) => { analytics.push(properties); return 'queued'; },
    imageSize: () => ({ width: 1, height: 1 }),
    provider: async () => async (report) => { filed.push(report); return { identifier: 'TEST-1', url: 'https://example.invalid/1' }; },
  };
  return { filed, analytics, deps };
}

beforeEach(resetReportBoundsForTesting);

test('files through the provider with image bytes but emits only whitelisted analytics', async () => {
  const { deps, filed, analytics } = harness();
  expect(await submitReport(request, deps)).toStrictEqual({ kind: 'filed' });
  expect(filed).toEqual([{ ...context, ...request }]);
  expect(analytics).toEqual([{ lane: 'bug', entry_point: 'menu', install_id: 'install', message: request.message,
    $geoip_disable: true, $ip: null, filed_by: 'cloud' }]);
});

test('cloud failure never queues the report and emits no false filed event', async () => {
  const { deps, analytics } = harness();
  deps.provider = async () => async () => { throw new Error('offline'); };
  expect(await submitReport(request, deps)).toEqual({ kind: 'refused', reason: 'send-failed' });
  expect(analytics).toEqual([]);
});

test('cloud filing preserves current-account analytics without copying identity into the provider payload', async () => {
  const { deps, filed, analytics } = harness();
  deps.identity = () => ({ email: 'designer@onlook.test', source: 'provider', subject: 'account-1' });
  expect((await submitReport(request, deps)).kind).toBe('filed');
  expect(analytics[0]).toMatchObject({ email: 'designer@onlook.test', account_id: 'account-1', filed_by: 'cloud' });
  expect(filed[0]).not.toHaveProperty('email');
  expect(filed[0]).not.toHaveProperty('account_id');
});

test('analytics failure after filing does not invite a duplicate ticket', async () => {
  const { deps, filed } = harness();
  deps.capture = async () => { throw new Error('analytics unavailable'); };
  expect(await submitReport(request, deps)).toStrictEqual({ kind: 'filed' });
  expect(filed).toHaveLength(1);
});

test('an absent capability keeps text-only queuing and rejects forged attachments', async () => {
  const { deps, analytics, filed } = harness();
  deps.provider = async () => undefined;
  expect(await submitReport(request, deps)).toEqual({ kind: 'refused', reason: 'malformed' });
  const { image: omitted, ...text } = request;
  expect(omitted).toBeDefined();
  expect(await submitReport(text, deps)).toEqual({ kind: 'queued' });
  expect(analytics[0]).not.toHaveProperty('filed_by');
  expect(filed).toEqual([]);
});

test('main rejects corrupt decoded bytes before provider or telemetry sees them', async () => {
  const { deps, filed, analytics } = harness();
  deps.imageSize = () => null;
  expect(await submitReport(request, deps)).toEqual({ kind: 'refused', reason: 'image-unreadable' });
  expect(filed).toEqual([]);
  expect(analytics).toEqual([]);
});

test('quota refusal happens before native image decoding', async () => {
  const { deps } = harness();
  let decodes = 0;
  deps.imageSize = () => { decodes += 1; return { width: 1, height: 1 }; };
  expect((await submitReport(request, deps)).kind).toBe('filed');
  expect(await submitReport(request, deps)).toEqual({ kind: 'refused', reason: 'too-many' });
  expect(decodes).toBe(1);
});

test('partial filing is successful, keeps our ticket out of the answer and emits cloud analytics', async () => {
  const { deps, analytics } = harness();
  deps.provider = async () => async () => ({ identifier: 'TEST-1', url: 'https://example.invalid/1', partial: true });
  expect(await submitReport(request, deps)).toStrictEqual({ kind: 'filed', partial: true });
  expect(analytics[0]?.filed_by).toBe('cloud');
});

test('a definitely failed cloud send releases both bounds for immediate retry', async () => {
  const { deps } = harness();
  const workingProvider = deps.provider;
  deps.provider = async () => async () => { throw new ReportSubmissionError('send-failed'); };
  expect(await submitReport(request, deps)).toEqual({ kind: 'refused', reason: 'send-failed' });
  deps.provider = workingProvider;
  expect((await submitReport(request, deps)).kind).toBe('filed');
});

test('uncertain cloud sends retain interval and launch quota even when the issue may exist', async () => {
  const { deps } = harness();
  let clock = 10000;
  let attempts = 0;
  deps.now = () => clock;
  deps.provider = async () => async () => { attempts += 1; throw new ReportSubmissionError('delivery-unknown'); };
  for (let attempt = 0; attempt < REPORTS_PER_LAUNCH; attempt += 1) {
    expect(await submitReport(request, deps)).toEqual({ kind: 'refused', reason: 'delivery-unknown' });
    expect(await submitReport(request, deps)).toEqual({ kind: 'refused', reason: 'too-many' });
    clock += MIN_REPORT_INTERVAL_MS;
  }
  expect(await submitReport(request, deps)).toEqual({ kind: 'refused', reason: 'too-many' });
  expect(attempts).toBe(REPORTS_PER_LAUNCH);
});

test('a slow cloud failure does not refund a later successful submission or its interval', async () => {
  const { deps, filed } = harness();
  const workingProvider = deps.provider;
  let rejectFirst!: (error: Error) => void;
  deps.provider = async () => () => new Promise((_resolve, reject) => { rejectFirst = reject; });
  const pending = submitReport(request, deps);
  await Promise.resolve();
  deps.now = () => 10000 + MIN_REPORT_INTERVAL_MS;
  deps.provider = workingProvider;
  expect((await submitReport(request, deps)).kind).toBe('filed');
  rejectFirst(new ReportSubmissionError('send-failed'));
  expect(await pending).toEqual({ kind: 'refused', reason: 'send-failed' });
  expect(await submitReport(request, deps)).toEqual({ kind: 'refused', reason: 'too-many' });
  expect(filed).toHaveLength(1);
});
