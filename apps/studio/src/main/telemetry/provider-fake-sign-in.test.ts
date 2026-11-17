import { afterAll, expect, mock, spyOn, test } from 'bun:test';
import { app } from 'electron';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IPC_EMIT, type StudioIdentity } from '@studio/events';
import { createFakeProvider } from '../cloud/provider-fake.js';
import { readIdentity, resetIdentityCache } from '../identity/store.js';
import { readStateFile } from '../state/file.js';
import { currentDistinctId, identifyPerson, initTelemetry, peekQueueForTesting, resetTelemetryForTesting, setAppForTesting } from './index.js';

const verified: StudioIdentity = { email: 'designer@onlook.test', source: 'provider', subject: 'user_provider', previousSubject: 'legacy_provider' };
const broadcasts: StudioIdentity[] = [];
const provider = createFakeProvider();
mock.module('@onlook/cloud-provider', () => provider.module);
mock.module('../tabs/sender.js', () => ({ requireStudioTabSender: () => {} }));
mock.module('../window/host.js', () => ({ everyRenderer: () => [], restoreAllMinimized: () => {} }));
mock.module('../tabs/broadcast.js', () => ({ broadcastToRenderers: (channel: string, identity: StudioIdentity) => {
  if (channel === IPC_EMIT.authChanged) broadcasts.push(identity);
} }));
const { completeBrowserSignIn, registerIdentityHandlers } = await import('../identity/ipc.js');
const root = mkdtempSync(join(tmpdir(), 'studio-fake-identify-'));
const keys = ['STUDIO_STATE_ROOT', 'STUDIO_POSTHOG_KEY', 'STUDIO_POSTHOG_HOST', 'STUDIO_TELEMETRY'] as const;
const saved = keys.map((key) => process.env[key]);
const originalFocus = app.focus;
app.focus = () => {};
const fetch = spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

afterAll(() => {
  resetTelemetryForTesting();
  resetIdentityCache();
  setAppForTesting(undefined);
  fetch.mockRestore();
  app.focus = originalFocus;
  keys.forEach((key, index) => { if (saved[index] === undefined) delete process.env[key]; else process.env[key] = saved[index]; });
  rmSync(root, { recursive: true, force: true });
});

test('an identity a provider hands back at sign-in is stored, announced, identified once with the install id and merged once, and a relaunch identifies nobody until the account is named again', async () => {
  process.env['STUDIO_STATE_ROOT'] = root;
  process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
  process.env['STUDIO_POSTHOG_HOST'] = 'http://127.0.0.1:9';
  delete process.env['STUDIO_TELEMETRY'];
  resetIdentityCache();
  resetTelemetryForTesting();
  setAppForTesting({ getPath: () => root, getVersion: () => '0.0.0-test', getLocale: () => 'en-US', isPackaged: false });
  initTelemetry();
  const install = readStateFile(join(root, 'install-id'), 1);
  expect(install.kind).toBe('data');
  registerIdentityHandlers();
  const client = provider.module.createOnlookClient({ url: 'http://127.0.0.1:1', onIdentity: completeBrowserSignIn });
  provider.signInResult = verified;
  await client.signIn('google');
  await client.signIn('google');
  expect(readIdentity()).toEqual(verified);
  expect(broadcasts).toEqual([verified, verified]);
  expect(currentDistinctId()).toBe('user_provider');
  const events = peekQueueForTesting();
  const identifies = events.filter((event) => event.event === '$identify');
  expect(identifies).toHaveLength(1);
  expect(identifies[0]?.properties).toEqual({
    $anon_distinct_id: install.kind === 'data' ? install.data : null,
    $set: { email: verified.email, identity_source: expect.any(String) },
  });
  expect(events.filter((event) => event.event === '$merge_dangerously').map((event) => event.properties)).toEqual([{ alias: 'legacy_provider' }]);
  expect(readStateFile(join(root, 'posthog-merge-completed.json'), 1).kind).toBe('data');

  resetTelemetryForTesting();
  resetIdentityCache();
  initTelemetry();
  expect(peekQueueForTesting().filter((event) => event.event === '$identify')).toHaveLength(0);
  identifyPerson(verified);
  expect(peekQueueForTesting().filter((event) => event.event === '$identify')).toHaveLength(1);
  expect(peekQueueForTesting().some((event) => event.event === '$merge_dangerously')).toBe(false);
});
