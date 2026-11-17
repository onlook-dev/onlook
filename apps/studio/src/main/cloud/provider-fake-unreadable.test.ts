import { afterAll, expect, mock, spyOn, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ipcMain } from 'electron';
import { IPC_INVOKE, type OnlookState } from '@studio/events';
import { readIdentity, resetIdentityCache, writeIdentity } from '../identity/store.js';
import { createFakeProvider } from './provider-fake.js';

let resets = 0;
let identifies = 0;
// The provider met the unreadable pair before anything was listening, so the launch starts with no session.
const provider = createFakeProvider({ session: false });
const handlers = new Map<string, Parameters<typeof ipcMain.handle>[1]>();
const registration = spyOn(ipcMain, 'handle').mockImplementation((channel, handler) => { handlers.set(channel, handler); });
mock.module('@onlook/cloud-provider', () => provider.module);
mock.module('../window/host.js', () => ({ everyRenderer: () => [], restoreAllMinimized: () => {} }));
mock.module('../tabs/broadcast.js', () => ({ broadcastToRenderers: () => {} }));
mock.module('../tabs/sender.js', () => ({ requireStudioTabSender: () => {} }));
mock.module('../identity/picture.js', () => ({ resolvePicture: async () => null }));
mock.module('../telemetry/index.js', () => ({
  capture: () => {}, resetTelemetryIdentity: () => { resets += 1; }, identifyPerson: () => { identifies += 1; },
}));
mock.module('../log/index.js', () => ({ log: () => ({ warn: () => {} }) }));

afterAll(() => { registration.mockRestore(); });

test('a session the provider reports unreadable reads signed-out while the account record and the telemetry identity stay, in either startup order', async () => {
  const saved = process.env['STUDIO_STATE_ROOT'];
  const root = mkdtempSync(join(tmpdir(), 'studio-fake-unreadable-'));
  process.env['STUDIO_STATE_ROOT'] = root;
  resetIdentityCache();
  const account = writeIdentity({ email: 'wren@example.com', source: 'provider', subject: 'user_01TEST' });
  const { initializeOnlook, registerOnlookHandlers, disposeOnlook } = await import('./index.js');
  const ask = async (channel: string, argument?: unknown) => handlers.get(channel)!({} as Electron.IpcMainInvokeEvent, argument);
  const signedOutWithRecord = async (): Promise<void> => {
    const lost = await ask(IPC_INVOKE.onlookState) as OnlookState;
    expect(lost.session).toBe('signed-out');
    expect(lost.profile).toBeNull();
    expect(await ask(IPC_INVOKE.onlookDeleteAccount, lost.sessionEpoch)).toEqual({ ok: false, code: 'superseded' });
    resetIdentityCache();
    expect(readIdentity()).toEqual(account);
    expect(resets).toBe(0);
    expect(identifies).toBe(0);
    expect(provider.calls).not.toContain('deleteAccount');
  };
  try {
    await initializeOnlook();
    registerOnlookHandlers();
    await signedOutWithRecord();

    // And with the session listener installed: the pair was readable at boot and stops being so.
    provider.setSession(true);
    expect((await ask(IPC_INVOKE.onlookState) as OnlookState).session).toBe('signed-in');
    provider.setSession(false, 'unreadable');
    await signedOutWithRecord();

    // A loss the provider does not call a sign-out keeps the record too.
    provider.setSession(true);
    provider.setSession(false);
    await signedOutWithRecord();

    // A record a newer build wrote is not this build's to erase either.
    const future = '{"version":99,"data":{"email":"future@example.com","source":"workos"}}\n';
    writeFileSync(join(root, 'identity.json'), future);
    resetIdentityCache();
    provider.setSession(true);
    provider.setSession(false, 'unreadable');
    expect(readFileSync(join(root, 'identity.json'), 'utf8')).toBe(future);
    expect(resets).toBe(0);
    expect(provider.publisher.snapshot().session).toBe('signed-out');
  } finally {
    await disposeOnlook();
    resetIdentityCache();
    if (saved === undefined) delete process.env['STUDIO_STATE_ROOT'];
    else process.env['STUDIO_STATE_ROOT'] = saved;
    rmSync(root, { recursive: true, force: true });
  }
});
