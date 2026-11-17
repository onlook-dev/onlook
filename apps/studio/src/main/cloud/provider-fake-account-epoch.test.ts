import { afterAll, expect, mock, spyOn, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { app, ipcMain } from 'electron';
import { IPC_EMIT, IPC_INVOKE, type OnlookState, type StudioIdentity } from '@studio/events';
import { readIdentity, resetIdentityCache, writeIdentity } from '../identity/store.js';
import { createFakeProvider } from './provider-fake.js';

let resets = 0;
const snapshots: OnlookState[] = [];
const announced: StudioIdentity[] = [];
const provider = createFakeProvider();
const handlers = new Map<string, Parameters<typeof ipcMain.handle>[1]>();
const registration = spyOn(ipcMain, 'handle').mockImplementation((channel, handler) => { handlers.set(channel, handler); });
const originalFocus = app.focus;
app.focus = () => {};
mock.module('@onlook/cloud-provider', () => provider.module);
mock.module('../window/host.js', () => ({ everyRenderer: () => [], restoreAllMinimized: () => {} }));
mock.module('../tabs/broadcast.js', () => ({ broadcastToRenderers: (channel: string, payload: unknown) => {
  if (channel === IPC_EMIT.onlookState) snapshots.push(payload as OnlookState);
  if (channel === IPC_EMIT.authChanged) announced.push(payload as StudioIdentity);
} }));
mock.module('../tabs/sender.js', () => ({ requireStudioTabSender: () => {} }));
mock.module('../identity/picture.js', () => ({ resolvePicture: async () => null }));
mock.module('../telemetry/index.js', () => ({ capture: () => {}, identifyPerson: () => {}, resetTelemetryIdentity: () => { resets += 1; } }));
mock.module('../log/index.js', () => ({ log: () => ({ warn: () => {} }) }));

const saved = process.env['STUDIO_STATE_ROOT'];
const root = mkdtempSync(join(tmpdir(), 'studio-fake-account-epoch-'));

afterAll(() => {
  registration.mockRestore();
  app.focus = originalFocus;
  resetIdentityCache();
  if (saved === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = saved;
  rmSync(root, { recursive: true, force: true });
});

test('sign-out and deletion supersede a pending sign-in first, and a deletion confirmed for one session epoch cannot act on another', async () => {
  process.env['STUDIO_STATE_ROOT'] = root;
  resetIdentityCache();
  const { initializeOnlook, registerOnlookHandlers, disposeOnlook } = await import('./index.js');
  const { completeBrowserSignIn } = await import('../identity/ipc.js');
  const ask = async (channel: string, argument?: unknown) => handlers.get(channel)!({} as Electron.IpcMainInvokeEvent, argument);
  const state = async () => await ask(IPC_INVOKE.onlookState) as OnlookState;
  const count = (call: typeof provider.calls[number]) => provider.calls.filter((made) => made === call).length;
  const SUPERSEDED = { ok: false, code: 'superseded' };
  await initializeOnlook();
  registerOnlookHandlers();
  try {
    // A sign-in step is progress within one session, so it moves the revision and never the epoch.
    const before = await state();
    provider.setSignInStep('email-verification');
    const verifying = await state();
    expect(verifying.signInStep).toBe('email-verification');
    expect(verifying.revision).toBeGreaterThan(before.revision);
    expect(verifying.sessionEpoch).toBe(before.sessionEpoch);
    expect(snapshots.at(-1)).toEqual(verifying);
    provider.setSignInStep(null);

    provider.signInResult = { email: 'designer@onlook.test', source: 'provider', subject: 'first-user' };
    expect(await ask(IPC_INVOKE.onlookSignIn, 'email')).toEqual({ ok: true });
    expect(announced).toEqual([{ email: 'designer@onlook.test', source: 'provider', subject: 'first-user' }]);
    const original = await state();
    expect(original.session).toBe('signed-in');
    expect(original.sessionEpoch).not.toBe(before.sessionEpoch);
    // A rotated credential is the same session.
    provider.setSession(true);
    expect((await state()).sessionEpoch).toBe(original.sessionEpoch);

    provider.calls.length = 0;
    expect(await ask(IPC_INVOKE.onlookSignOut)).toEqual({ ok: true });
    expect(provider.calls.indexOf('supersedeSignIn')).toBeGreaterThanOrEqual(0);
    expect(provider.calls.indexOf('supersedeSignIn')).toBeLessThan(provider.calls.indexOf('signOut'));
    // The remote sign-out answers before the local session is cleared.
    expect(provider.calls.indexOf('signOut')).toBeLessThan(provider.calls.indexOf('clearSession'));
    expect(readIdentity()).toBeNull();
    expect(resets).toBe(1);
    expect((await state()).session).toBe('signed-out');

    const enriching = writeIdentity({ email: 'legacy@onlook.test', source: 'provider' });
    provider.setSession(true);
    const legacy = await state();
    const legacyProviderRevision = provider.publisher.snapshot().revision;
    // The same account gaining its id is not another session.
    writeIdentity({ ...enriching, subject: 'legacy-user' });
    expect(await state()).toEqual(legacy);
    expect(provider.publisher.snapshot().revision).toBe(legacyProviderRevision);
    // Only the server names the account a confirmation may delete.
    expect(await ask(IPC_INVOKE.onlookDeleteAccount, legacy.sessionEpoch)).toEqual(SUPERSEDED);
    provider.nameAccount('legacy-user', 'legacy@onlook.test');
    // A deletion the provider refuses clears nothing.
    provider.failures.deleteAccount = new Error('last_admin');
    expect(await ask(IPC_INVOKE.onlookDeleteAccount, legacy.sessionEpoch)).toEqual({ ok: false, code: 'last_admin' });
    expect(readIdentity()?.subject).toBe('legacy-user');
    expect(count('clearSession')).toBe(1);
    delete provider.failures.deleteAccount;
    provider.calls.length = 0;
    expect(await ask(IPC_INVOKE.onlookDeleteAccount, legacy.sessionEpoch)).toEqual({ ok: true });
    expect(provider.calls.indexOf('supersedeSignIn')).toBeGreaterThanOrEqual(0);
    expect(provider.calls.indexOf('supersedeSignIn')).toBeLessThan(provider.calls.indexOf('deleteAccount'));
    expect(provider.calls.indexOf('deleteAccount')).toBeLessThan(provider.calls.indexOf('clearSession'));
    expect(readIdentity()).toBeNull();
    expect(resets).toBe(2);

    provider.calls.length = 0;
    provider.setSession(true);
    const replacement = completeBrowserSignIn({ email: 'replacement@onlook.test', source: 'provider', subject: 'replacement-user' });
    provider.nameAccount('replacement-user', 'replacement@onlook.test');
    // A confirmation given to an earlier session names an account this session is not.
    expect(await ask(IPC_INVOKE.onlookDeleteAccount, original.sessionEpoch)).toEqual(SUPERSEDED);
    expect(await ask(IPC_INVOKE.onlookDeleteAccount, legacy.sessionEpoch)).toEqual(SUPERSEDED);
    expect(await ask(IPC_INVOKE.onlookDeleteAccount, String((await state()).sessionEpoch))).toEqual(SUPERSEDED);
    const current = await state();
    const providerRevision = provider.publisher.snapshot().revision;
    // A record replaced without a word from the provider is another account, and the confirmation does not follow it.
    writeIdentity({ ...replacement, subject: 'silent-replacement-user' });
    expect(await ask(IPC_INVOKE.onlookDeleteAccount, current.sessionEpoch)).toEqual(SUPERSEDED);
    const updated = await state();
    expect(updated.sessionEpoch).not.toBe(current.sessionEpoch);
    expect(updated.revision).toBeGreaterThan(current.revision);
    expect(provider.publisher.snapshot().revision).toBe(providerRevision);
    expect(snapshots.at(-1)).toEqual(updated);
    expect(await state()).toEqual(updated);
    provider.publisher.publish({ connection: 'offline' });
    const reconnected = await state();
    expect(reconnected.revision).toBeGreaterThan(updated.revision);
    expect(reconnected.sessionEpoch).toBe(updated.sessionEpoch);
    // A record the server has not matched to this session stays undeletable until it does.
    expect(await ask(IPC_INVOKE.onlookDeleteAccount, reconnected.sessionEpoch)).toEqual(SUPERSEDED);
    expect(count('deleteAccount')).toBe(0);
    provider.nameAccount('silent-replacement-user', 'replacement@onlook.test');
    const confirmed = await state();
    expect(confirmed.sessionEpoch).not.toBe(reconnected.sessionEpoch);
    expect(await ask(IPC_INVOKE.onlookDeleteAccount, confirmed.sessionEpoch)).toEqual({ ok: true });
    expect(count('deleteAccount')).toBe(1);
    expect(readIdentity()).toBeNull();
    expect(resets).toBe(3);

    // A typed email is the install's, so a provider session coming and going leaves it.
    provider.setSession(true);
    writeIdentity({ email: 'manual@onlook.test', source: 'manual' });
    provider.setSession(false);
    expect(resets).toBe(3);
    expect(readIdentity()).toEqual({ email: 'manual@onlook.test', source: 'manual' });
  } finally {
    await disposeOnlook();
  }
});
