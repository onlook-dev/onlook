import { expect, mock, spyOn, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { OutboxEvent } from '../telemetry/outbox.js';
import { createFakeProvider } from './provider-fake.js';

const provider = createFakeProvider();
mock.module('@onlook/cloud-provider', () => provider.module);
mock.module('../window/host.js', () => ({ everyRenderer: () => [], restoreAllMinimized: () => {} }));
mock.module('../tabs/broadcast.js', () => ({ broadcastToRenderers: () => {} }));
mock.module('../tabs/sender.js', () => ({ requireStudioTabSender: () => {} }));
mock.module('../identity/picture.js', () => ({ resolvePicture: async () => null }));

test('a provider session that comes and goes before the first account keeps the tour anonymous id, and the first account the server names is linked to it without a merge', async () => {
  const keys = [
    'MAIN_VITE_ONLOOK_CLOUD', 'MAIN_VITE_TELEMETRY', 'MAIN_VITE_POSTHOG_KEY', 'AGENT_HEADLESS', 'STUDIO_STATE_ROOT',
    'STUDIO_POSTHOG_KEY', 'STUDIO_POSTHOG_HOST', 'STUDIO_TELEMETRY', 'STUDIO_TELEMETRY_HEADLESS',
  ] as const;
  const saved = keys.map((key) => process.env[key]);
  const root = mkdtempSync(join(tmpdir(), 'studio-fake-anonymous-'));
  for (const key of keys) delete process.env[key];
  process.env['STUDIO_STATE_ROOT'] = root;
  process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
  process.env['STUDIO_POSTHOG_HOST'] = 'http://127.0.0.1:1';
  const batches: { batch: OutboxEvent[] }[] = [];
  const collector = Object.assign(async (input: Parameters<typeof fetch>[0], options?: Parameters<typeof fetch>[1]) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname === '/batch/') batches.push(JSON.parse(String(options?.body)) as { batch: OutboxEvent[] });
    return new Response('{}', { status: 200 });
  }, { preconnect: globalThis.fetch.preconnect });
  const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(collector);
  const sent = (name: string) => batches.flatMap((batch) => batch.batch).filter((event) => event.event === name);
  const telemetry = await import('../telemetry/index.js');
  const { configureLogExport } = await import('../log/index.js');
  const { readStateFile } = await import('../state/file.js');
  const { readIdentity, resetIdentityCache, writeIdentity } = await import('../identity/store.js');
  const cloud = await import('./index.js');
  const userData = join(root, 'userdata');
  telemetry.resetTelemetryForTesting();
  resetIdentityCache();
  telemetry.setAppForTesting({ getPath: () => userData, getVersion: () => '0.0.0-test', getLocale: () => 'en-US', isPackaged: false });
  try {
    telemetry.initTelemetry();
    telemetry.capture('tour_opened', { source: 'first_run' });
    await telemetry.flush();
    const opened = sent('tour_opened');
    expect(opened).toHaveLength(1);
    const install = readStateFile(join(userData, 'install-id'), 1);
    if (install.kind !== 'data' || typeof install.data !== 'string') throw new Error('Missing install ID');
    const anonymousId = opened[0]!.distinct_id;
    expect(anonymousId).toBe(install.data);

    await cloud.initializeOnlook();
    expect(provider.publisher.snapshot().session).toBe('signed-out');
    for (const change of [undefined, 'unreadable', 'signed-out'] as const) {
      provider.setSession(true);
      expect(provider.publisher.snapshot().session).toBe('signed-in');
      provider.setSession(false, change);
      expect(provider.publisher.snapshot().session).toBe('signed-out');
      expect(readIdentity()).toBeNull();
      expect(telemetry.currentDistinctId()).toBe(anonymousId);
    }
    await telemetry.flush();
    expect(sent('$identify')).toHaveLength(0);

    // A stored record and a session are still only a claim: nobody is identified until the server names the account.
    const account = writeIdentity({ email: 'wren@example.com', source: 'provider', subject: 'user_01TEST' });
    provider.setSession(true);
    expect(telemetry.currentDistinctId()).toBe(anonymousId);
    provider.nameAccount('user_01TEST', account.email);
    expect(telemetry.currentDistinctId()).toBe('user_01TEST');
    telemetry.capture('tour_closed', { step: 'wrap', completed: true });
    await telemetry.flush();

    const identified = sent('$identify');
    expect(identified).toHaveLength(1);
    expect(identified[0]!.distinct_id).toBe('user_01TEST');
    expect(identified[0]!.properties['$anon_distinct_id']).toBe(anonymousId);
    expect(sent('tour_closed').map((event) => event.distinct_id)).toEqual(['user_01TEST']);
    expect(sent('$merge_dangerously')).toHaveLength(0);
  } finally {
    await cloud.disposeOnlook();
    telemetry.resetTelemetryForTesting();
    telemetry.setAppForTesting(undefined);
    configureLogExport(undefined);
    resetIdentityCache();
    fetchSpy.mockRestore();
    for (const [index, key] of keys.entries()) {
      const value = saved[index];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(root, { recursive: true, force: true });
  }
});
