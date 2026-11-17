import { expect, mock, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { clearIdentity, readIdentity, resetIdentityCache, writeIdentity } from '../identity/store.js';
import { statePublisher } from './client.js';

let clears = 0;
let sessionPresent = false;
let sessionChanged: (change?: 'signed-out') => void = () => {};
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
mock.module('electron', () => ({ app: { isPackaged: false }, ipcMain: { handle: () => {} }, default: {} }));
mock.module('@onlook/cloud-provider', () => ({ identity, createOnlookClient: () => ({
  start: () => {}, close: async () => {}, snapshot: publisher.snapshot, subscribe: publisher.subscribe,
  setSession: (signedIn: boolean) => publisher.publish({ session: signedIn ? 'signed-in' : 'signed-out' }),
  setProfile: () => {}, signIn: async () => {}, signOut: async () => {}, deleteAccount: async () => {},
}) }));
mock.module('../identity/ipc.js', () => ({
  clearAccountIdentity: () => { clears += 1; clearIdentity(); },
  onIdentity: () => {}, completeBrowserSignIn: () => {},
}));
mock.module('../window/host.js', () => ({ everyRenderer: () => [] }));
mock.module('../tabs/broadcast.js', () => ({ broadcastToRenderers: () => {} }));
mock.module('../tabs/sender.js', () => ({ requireStudioTabSender: () => {} }));
mock.module('../identity/picture.js', () => ({ resolvePicture: async () => null }));
mock.module('../telemetry/index.js', () => ({ capture: () => {}, identifyPerson: () => {} }));

test('an unavailable startup session preserves identity until explicit sign-out', async () => {
  const keys = ['MAIN_VITE_ONLOOK_CLOUD', 'AGENT_HEADLESS', 'STUDIO_STATE_ROOT', 'STUDIO_CLOUD_TEST_TOKENS', 'STUDIO_CLOUD_TEST_URL'] as const;
  const saved = keys.map((key) => process.env[key]);
  const root = mkdtempSync(join(tmpdir(), 'studio-provider-unavailable-'));
  for (const key of keys) delete process.env[key];
  process.env['MAIN_VITE_ONLOOK_CLOUD'] = 'true';
  process.env['STUDIO_STATE_ROOT'] = root;
  resetIdentityCache();
  const account = writeIdentity({ email: 'account@example.com', source: 'provider', subject: 'account-a' });
  const { initializeOnlook, disposeOnlook } = await import('./index.js');
  try {
    await initializeOnlook();
    expect(clears).toBe(0);
    expect(readIdentity()).toEqual(account);
    sessionChanged();
    expect(clears).toBe(0);
    expect(readIdentity()).toEqual(account);
    writeIdentity(account);
    sessionPresent = true;
    sessionChanged();
    expect(publisher.snapshot().session).toBe('signed-in');
    identity.clearSession();
    expect(clears).toBe(1);
    expect(readIdentity()).toBeNull();
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
