import { afterAll, expect, mock, spyOn, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IPC_INVOKE, type OnlookState, type StudioIdentity } from '@studio/events';
import type { ProviderMe } from '../identity/provider-shape.js';
import { ipcMain } from 'electron';
import { resetIdentityCache, writeIdentity } from '../identity/store.js';
import { setStatePackagedForTesting } from '../state/build.js';
import { statePublisher } from './client.js';

let sessionPresent = true;
let sessionChanged = () => {};
let deletions = 0;
const handlers = new Map<string, Parameters<typeof ipcMain.handle>[1]>();
const identity = {
  enabled: () => true, configured: () => true,
  prepareSession: () => ({ url: 'http://127.0.0.1:1' }),
  hasSession: () => sessionPresent,
  clearSession: () => { sessionPresent = false; sessionChanged(); },
  onSessionChanged: (listener: () => void) => { sessionChanged = listener; return () => { sessionChanged = () => {}; }; },
  signInStep: () => null, onSignInProgress: () => () => {},
  supersedeSignIn: () => {}, refreshSession: async () => {}, dispose: () => {},
  signIn: async () => { throw new Error('Unexpected sign-in'); },
};
const publisher = statePublisher({ revision: 0, session: 'signed-out', connection: 'idle', me: null, profile: null });
const registration = spyOn(ipcMain, 'handle').mockImplementation((channel, handler) => { handlers.set(channel, handler); });
setStatePackagedForTesting(false);
afterAll(() => { registration.mockRestore(); setStatePackagedForTesting(undefined); });
mock.module('@onlook/cloud-provider', () => ({ identity, createOnlookClient: () => ({
  start: () => {}, close: async () => {}, snapshot: publisher.snapshot, subscribe: publisher.subscribe,
  setSession: (signedIn: boolean) => publisher.publish({ session: signedIn ? 'signed-in' : 'signed-out' }),
  setProfile: (profile: Parameters<typeof publisher.publish>[0]['profile']) => publisher.publish({ profile }),
  signIn: async () => {}, signOut: async () => {}, deleteAccount: async () => { deletions += 1; },
}) }));
mock.module('../window/host.js', () => ({ everyRenderer: () => [], restoreAllMinimized: () => {} }));
mock.module('../tabs/broadcast.js', () => ({ broadcastToRenderers: () => {} }));
mock.module('../tabs/sender.js', () => ({ requireStudioTabSender: () => {} }));
mock.module('../identity/picture.js', () => ({ resolvePicture: async () => null }));
const identified: StudioIdentity[] = [];
mock.module('../telemetry/index.js', () => ({
  capture: () => {}, resetTelemetryIdentity: () => {},
  identifyPerson: (person: StudioIdentity) => { identified.push(person); },
}));

function serverAccount(workosUserId: string, email: string): ProviderMe {
  return { user: { id: `row_${workosUserId}`, workosUserId, email, createdAt: 0 }, orgId: null, role: null };
}

test('a record naming another account than the server confirms is never shown, and never deletes one', async () => {
  const keys = ['MAIN_VITE_ONLOOK_CLOUD', 'AGENT_HEADLESS', 'STUDIO_STATE_ROOT', 'STUDIO_CLOUD_TEST_TOKENS', 'STUDIO_CLOUD_TEST_URL'] as const;
  const saved = keys.map((key) => process.env[key]);
  const root = mkdtempSync(join(tmpdir(), 'studio-mixed-record-'));
  for (const key of keys) delete process.env[key];
  process.env['MAIN_VITE_ONLOOK_CLOUD'] = 'true';
  process.env['STUDIO_STATE_ROOT'] = root;
  resetIdentityCache();
  sessionPresent = true;
  // The clobbered record this card's isolation now prevents: account B's metadata beside account A's credentials.
  writeIdentity({ email: 'b@example.com', source: 'workos', workosUserId: 'user_B' });
  const { initializeOnlook, registerOnlookHandlers, disposeOnlook } = await import('./index.js');
  try {
    await initializeOnlook();
    registerOnlookHandlers();
    const ask = async (channel: string, argument?: unknown) =>
      handlers.get(channel)!({} as Electron.IpcMainInvokeEvent, argument);

    const unverified = await ask(IPC_INVOKE.onlookState) as OnlookState;
    expect(unverified.session).toBe('signed-in');
    expect(unverified.profile?.email).toBe('b@example.com');
    // Nothing has named the account yet, so nothing may authorize deleting one.
    expect(await ask(IPC_INVOKE.onlookDeleteAccount, unverified.sessionEpoch)).toEqual({ ok: false, code: 'superseded' });
    expect(deletions).toBe(0);
    // Nothing has named the account, so telemetry has no person to attribute this session to either (ONL-2882).
    expect(identified).toEqual([]);

    publisher.publish({ me: serverAccount('user_A', 'a@example.com'), connection: 'connected' });

    const contradicted = await ask(IPC_INVOKE.onlookState) as OnlookState;
    expect(contradicted.session).toBe('signed-in');
    expect(contradicted.profile).toBeNull();
    expect(contradicted.sessionEpoch).not.toBe(unverified.sessionEpoch);
    // The confirmation the person gave before the server answered named an account this session is not.
    expect(await ask(IPC_INVOKE.onlookDeleteAccount, unverified.sessionEpoch)).toEqual({ ok: false, code: 'superseded' });
    expect(await ask(IPC_INVOKE.onlookDeleteAccount, contradicted.sessionEpoch)).toEqual({ ok: false, code: 'superseded' });
    expect(deletions).toBe(0);
    // The server named an account the record contradicts, so the record's account is still identified as nobody.
    expect(identified).toEqual([]);

    // A dropped connection says nothing new, so it cannot restore the contradicted record as this session's account.
    publisher.publish({ me: null, connection: 'offline' });
    const flapped = await ask(IPC_INVOKE.onlookState) as OnlookState;
    expect(flapped.session).toBe('signed-in');
    expect(flapped.profile).toBeNull();
    expect(await ask(IPC_INVOKE.onlookDeleteAccount, flapped.sessionEpoch)).toEqual({ ok: false, code: 'superseded' });
    expect(deletions).toBe(0);
    publisher.publish({ me: serverAccount('user_A', 'a@example.com'), connection: 'connected' });

    // A typed email is a property of the install, never the name of an authenticated account.
    writeIdentity({ email: 'typed@example.com', source: 'manual' });
    const typed = await ask(IPC_INVOKE.onlookState) as OnlookState;
    expect(typed.profile).toBeNull();
    expect(await ask(IPC_INVOKE.onlookDeleteAccount, typed.sessionEpoch)).toEqual({ ok: false, code: 'superseded' });
    expect(deletions).toBe(0);

    writeIdentity({ email: 'a@example.com', source: 'workos', workosUserId: 'user_A' });
    // The refresh that repairs the record rotates the pair, which the provider reports as a session change.
    sessionChanged();
    const repaired = await ask(IPC_INVOKE.onlookState) as OnlookState;
    expect(repaired.profile?.email).toBe('a@example.com');
    expect(await ask(IPC_INVOKE.onlookDeleteAccount, repaired.sessionEpoch)).toEqual({ ok: true });
    expect(deletions).toBe(1);
    // Only now is there an account to attribute to, it is the one the server named, and a snapshot per ask does not announce it again.
    expect(identified.map((person) => person.subject)).toEqual(['user_A']);
  } finally {
    await disposeOnlook();
    resetIdentityCache();
    keys.forEach((key, index) => {
      if (saved[index] === undefined) delete process.env[key];
      else process.env[key] = saved[index];
    });
    rmSync(root, { recursive: true, force: true });
  }
});
