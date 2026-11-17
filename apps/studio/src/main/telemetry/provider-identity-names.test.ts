import { afterAll, expect, mock, spyOn, test } from 'bun:test';
import { app } from 'electron';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { StudioIdentity } from '@studio/events';
import { IPC_EMIT } from '@studio/events';
import { readIdentity, resetIdentityCache } from '../identity/store.js';
import type { ProviderIdentity } from '../identity/provider-shape.js';
import { currentDistinctId, initTelemetry, peekQueueForTesting, resetTelemetryForTesting, setAppForTesting } from './index.js';

const broadcasts: StudioIdentity[] = [];
mock.module('@onlook/cloud-provider', () => ({ identity: { configured: () => true } }));
mock.module('../tabs/sender.js', () => ({ requireStudioTabSender: () => {} }));
mock.module('../window/host.js', () => ({ everyRenderer: () => [], restoreAllMinimized: () => {} }));
mock.module('../tabs/broadcast.js', () => ({ broadcastToRenderers: (channel: string, identity: StudioIdentity) => {
  if (channel === IPC_EMIT.authChanged) broadcasts.push(identity);
} }));
const { completeBrowserSignIn, registerIdentityHandlers } = await import('../identity/ipc.js');
const keys = ['STUDIO_STATE_ROOT', 'STUDIO_POSTHOG_KEY', 'STUDIO_POSTHOG_HOST', 'STUDIO_TELEMETRY'] as const;
const saved = keys.map((key) => process.env[key]);
const originalFocus = app.focus;
app.focus = () => {};
const fetch = spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
const roots: string[] = [];
registerIdentityHandlers();

afterAll(() => {
  resetTelemetryForTesting();
  resetIdentityCache();
  setAppForTesting(undefined);
  fetch.mockRestore();
  app.focus = originalFocus;
  keys.forEach((key, index) => { if (saved[index] === undefined) delete process.env[key]; else process.env[key] = saved[index]; });
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

/** One fresh install signing in with what the provider handed over: what it stored, and who telemetry says it is. */
function signIn(handed: ProviderIdentity) {
  const root = mkdtempSync(join(tmpdir(), 'studio-provider-names-'));
  roots.push(root);
  process.env['STUDIO_STATE_ROOT'] = root;
  process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
  process.env['STUDIO_POSTHOG_HOST'] = 'http://127.0.0.1:9';
  delete process.env['STUDIO_TELEMETRY'];
  resetIdentityCache();
  resetTelemetryForTesting();
  broadcasts.length = 0;
  setAppForTesting({ getPath: () => root, getVersion: () => '0.0.0-test', getLocale: () => 'en-US', isPackaged: false });
  initTelemetry();
  const returned = completeBrowserSignIn(handed);
  const events = peekQueueForTesting();
  return {
    returned,
    record: readIdentity(),
    announced: [...broadcasts],
    account: readFileSync(join(root, 'account.json'), 'utf8'),
    legacy: readFileSync(join(root, 'identity.json'), 'utf8'),
    distinctId: currentDistinctId(),
    person: events.filter((event) => event.event === '$identify').map((event) => (event.properties as { $set: unknown }).$set),
    merges: events.filter((event) => event.event === '$merge_dangerously').map((event) => event.properties),
  };
}

test('a provider on the vendor\'s names and one on the neutral names leave the same record and the same telemetry person', () => {
  const vendor = signIn({ email: 'designer@onlook.test', name: 'Designer', source: 'workos', workosUserId: 'user_provider', workosExternalId: 'legacy_provider' });
  const neutral = signIn({ email: 'designer@onlook.test', name: 'Designer', source: 'provider', subject: 'user_provider', previousSubject: 'legacy_provider' });
  expect(neutral).toEqual(vendor);
  const stored: StudioIdentity = { email: 'designer@onlook.test', name: 'Designer', source: 'provider', subject: 'user_provider', previousSubject: 'legacy_provider' };
  expect(vendor.record).toEqual(stored);
  expect(vendor.returned).toEqual(stored);
  expect(vendor.announced).toEqual([stored]);
  // The id and the person property every earlier build sent for this account.
  expect(vendor.distinctId).toBe('user_provider');
  expect(vendor.person).toEqual([{ email: 'designer@onlook.test', identity_source: 'workos' }]);
  expect(vendor.merges).toEqual([{ alias: 'legacy_provider' }]);
  expect(JSON.parse(vendor.legacy)).toEqual({ version: 1, data: { email: 'designer@onlook.test', name: 'Designer', source: 'workos', workosUserId: 'user_provider', workosExternalId: 'legacy_provider' } });
});

test('a typed email keeps its person property too', () => {
  const typed = signIn({ email: 'typed@onlook.test', source: 'manual' });
  expect(typed.record).toEqual({ email: 'typed@onlook.test', source: 'manual' });
  expect(typed.distinctId).not.toBe('typed@onlook.test');
  expect(peekQueueForTesting().filter((event) => event.event === '$set').map((event) => event.properties)).toEqual([{ $set: { email: 'typed@onlook.test', identity_source: 'manual' } }]);
});
