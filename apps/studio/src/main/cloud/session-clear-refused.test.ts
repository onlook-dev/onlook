import { afterAll, expect, mock, spyOn, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IPC_INVOKE } from '@studio/events';
import { ipcMain } from 'electron';
import { resetIdentityCache } from '../identity/store.js';
import { setStatePackagedForTesting } from '../state/build.js';
import { statePublisher } from './client.js';

let resets = 0;
let sessionPresent = true;
let sessionChanged: (change?: 'signed-out') => void = () => {};
const handlers = new Map<string, Parameters<typeof ipcMain.handle>[1]>();
const identity = {
  enabled: () => true, configured: () => true,
  prepareSession: () => ({ url: 'http://127.0.0.1:1' }),
  hasSession: () => sessionPresent,
  clearSession: () => { sessionPresent = false; sessionChanged('signed-out'); },
  onSessionChanged: (listener: (change?: 'signed-out') => void) => { sessionChanged = listener; return () => { sessionChanged = () => {}; }; },
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
  setProfile: () => {}, signIn: async () => {}, signOut: async () => {}, deleteAccount: async () => {},
}) }));
mock.module('../window/host.js', () => ({ everyRenderer: () => [], restoreAllMinimized: () => {} }));
mock.module('../tabs/broadcast.js', () => ({ broadcastToRenderers: () => {} }));
mock.module('../tabs/sender.js', () => ({ requireStudioTabSender: () => {} }));
mock.module('../identity/picture.js', () => ({ resolvePicture: async () => null }));
mock.module('../telemetry/index.js', () => ({
  capture: () => {}, identifyPerson: () => {}, resetTelemetryIdentity: () => { resets += 1; },
}));

test('a record the running build cannot erase still loses the session and the right to delete the account', async () => {
  const keys = ['MAIN_VITE_ONLOOK_CLOUD', 'AGENT_HEADLESS', 'STUDIO_STATE_ROOT', 'STUDIO_CLOUD_TEST_TOKENS', 'STUDIO_CLOUD_TEST_URL'] as const;
  const saved = keys.map((key) => process.env[key]);
  const root = mkdtempSync(join(tmpdir(), 'studio-provider-refused-'));
  for (const key of keys) delete process.env[key];
  process.env['MAIN_VITE_ONLOOK_CLOUD'] = 'true';
  process.env['STUDIO_STATE_ROOT'] = root;
  resetIdentityCache();
  sessionPresent = true;
  // Only a newer build's format refuses to erase, which is the one way clearAccountIdentity throws.
  const future = '{"version":99,"data":{"email":"future@example.com","source":"workos"}}\n';
  writeFileSync(join(root, 'identity.json'), future);
  const { initializeOnlook, registerOnlookHandlers, disposeOnlook } = await import('./index.js');
  try {
    await initializeOnlook();
    registerOnlookHandlers();
    const ask = async (channel: string, argument?: unknown) =>
      handlers.get(channel)!({} as Electron.IpcMainInvokeEvent, argument);
    const signedIn = await ask(IPC_INVOKE.onlookState) as { session: string; sessionEpoch: number };
    expect(signedIn.session).toBe('signed-in');

    identity.clearSession();

    expect(resets).toBe(1);
    // The refusal is loud for the record and silent for the session: signed-out either way.
    expect(readFileSync(join(root, 'identity.json'), 'utf8')).toBe(future);
    expect(publisher.snapshot().session).toBe('signed-out');
    const lost = await ask(IPC_INVOKE.onlookState) as { session: string; sessionEpoch: number };
    expect(lost.session).toBe('signed-out');
    expect(await ask(IPC_INVOKE.onlookDeleteAccount, signedIn.sessionEpoch)).toEqual({ ok: false, code: 'superseded' });
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
