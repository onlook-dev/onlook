import { expect, mock, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readIdentity, resetIdentityCache, writeIdentity } from '../identity/store.js';
import { statePublisher } from './client.js';

let resets = 0;
let sessionPresent = true;
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
// The real identity/ipc.js, so the telemetry reset this test names is the product's own, not a stand-in (ONL-2882).
mock.module('../window/host.js', () => ({ everyRenderer: () => [], restoreAllMinimized: () => {} }));
mock.module('../tabs/broadcast.js', () => ({ broadcastToRenderers: () => {} }));
mock.module('../tabs/sender.js', () => ({ requireStudioTabSender: () => {} }));
mock.module('../identity/picture.js', () => ({ resolvePicture: async () => null }));
mock.module('../telemetry/index.js', () => ({
  capture: () => {}, identifyPerson: () => {}, resetTelemetryIdentity: () => { resets += 1; },
}));

test('a provider session already active at startup resets telemetry even with manual metadata', async () => {
  const keys = ['MAIN_VITE_ONLOOK_CLOUD', 'AGENT_HEADLESS', 'STUDIO_STATE_ROOT', 'STUDIO_CLOUD_TEST_TOKENS', 'STUDIO_CLOUD_TEST_URL'] as const;
  const saved = keys.map((key) => process.env[key]);
  const root = mkdtempSync(join(tmpdir(), 'studio-provider-clear-'));
  for (const key of keys) delete process.env[key];
  process.env['MAIN_VITE_ONLOOK_CLOUD'] = 'true';
  process.env['STUDIO_STATE_ROOT'] = root;
  resetIdentityCache();
  sessionPresent = true;
  writeIdentity({ email: 'manual@example.com', source: 'manual' });
  const { initializeOnlook, disposeOnlook } = await import('./index.js');
  try {
    await initializeOnlook();
    expect(resets).toBe(0);
    expect(readIdentity()).toEqual({ email: 'manual@example.com', source: 'manual' });
    identity.clearSession();
    expect(resets).toBe(1);
    expect(readIdentity()).toBeNull();
    expect(publisher.snapshot().session).toBe('signed-out');
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
