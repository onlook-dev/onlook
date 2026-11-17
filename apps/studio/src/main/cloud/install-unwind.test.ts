import { afterAll, beforeAll, expect, it, mock, spyOn } from 'bun:test';
import { ipcMain } from 'electron';
import { IPC_EMIT, IPC_INVOKE, type OnlookState, type StudioIdentity } from '@studio/events';

const keys = ['MAIN_VITE_ONLOOK_CLOUD'] as const;
const saved = keys.map((key) => process.env[key]);
const RECORD: StudioIdentity = { email: 'designer@onlook.test', source: 'provider', subject: 'fixture-user' };
const state: OnlookState = { revision: 0, session: 'signed-out', connection: 'idle', me: null, profile: null };
const handlers = new Map<string, Parameters<typeof ipcMain.handle>[1]>();
const registration = spyOn(ipcMain, 'handle').mockImplementation((channel, handler) => { handlers.set(channel, handler); });
const stopped: string[] = [];
const published: OnlookState[] = [];
let identityObservers = 0;
let created = 0;
let closes = 0;

mock.module('@onlook/cloud-provider', () => ({
  identity: {
    enabled: () => true, configured: () => true, prepareSession: () => ({ url: 'http://127.0.0.1:1' }), hasSession: () => false,
    signIn: async () => RECORD, supersedeSignIn: () => {}, clearSession: () => {}, refreshSession: async () => {}, dispose: () => {},
    signInStep: () => null,
    onSignInProgress: () => () => { stopped.push('sign-in-progress'); },
    onSessionChanged: () => () => { stopped.push('session'); },
  },
  // Everything a client needs exists; only the connection it opens last does not (ONL-2950).
  createOnlookClient: () => {
    created += 1;
    return {
      start: () => { throw new Error('the socket refused'); },
      close: async () => { closes += 1; },
      snapshot: () => state, subscribe: () => () => { stopped.push('state'); },
      setSession: () => {}, setProfile: () => {}, signIn: async () => {}, signOut: async () => {},
      deleteAccount: async () => {}, teamCommand: async () => ({ ok: false, error: 'unavailable' }),
    };
  },
}));
mock.module('../identity/ipc.js', () => ({
  clearAccountIdentity: () => {},
  onIdentity: () => { identityObservers += 1; },
  completeBrowserSignIn: (identity: unknown) => identity,
}));
mock.module('../tabs/broadcast.js', () => ({ broadcastToRenderers: (channel: string, payload: unknown) => {
  if (channel === IPC_EMIT.onlookState) published.push(payload as OnlookState);
} }));
mock.module('../tabs/sender.js', () => ({ requireStudioTabSender: () => {} }));
mock.module('../window/host.js', () => ({ everyRenderer: () => [], restoreAllMinimized: () => {} }));
mock.module('../identity/store.js', () => ({ readIdentity: () => RECORD, writeIdentity: (record: unknown) => record, clearIdentity: () => {} }));
mock.module('../identity/picture.js', () => ({ resolvePicture: async () => null }));
mock.module('../telemetry/index.js', () => ({ capture: () => {}, identifyPerson: () => {}, resetTelemetryIdentity: () => {} }));
mock.module('../log/index.js', () => ({ log: () => ({ warn: () => {} }) }));

beforeAll(() => { process.env['MAIN_VITE_ONLOOK_CLOUD'] = 'true'; });

afterAll(() => {
  registration.mockRestore();
  keys.forEach((key, index) => { if (saved[index] === undefined) delete process.env[key]; else process.env[key] = saved[index]; });
});

it('takes a half-installed client back out, leaves nothing it subscribed behind, and retries a bounded number of presses', async () => {
  const { registerOnlookHandlers, initializeOnlook, disposeOnlook } = await import('./index.js');
  registerOnlookHandlers();
  const event = {} as Electron.IpcMainInvokeEvent;
  const press = async (): Promise<unknown> => handlers.get(IPC_INVOKE.onlookSignIn)!(event, 'google');
  const session = async (): Promise<string> => ((await handlers.get(IPC_INVOKE.onlookState)!(event)) as OnlookState).session;

  await initializeOnlook();
  expect(created).toBe(1);
  // Nothing the attempt subscribed survives it, and the client it opened is closed.
  expect(stopped).toEqual(['state', 'sign-in-progress', 'session']);
  expect(closes).toBe(1);
  // The local client is back, and the renderers were told, so none holds the discarded client's session (ONL-2780).
  expect(await session()).toBe('local');
  expect(published.at(-1)?.session).toBe('local');

  // Not latched: each press attempts the install again, and each failure unwinds the same way.
  for (const attempt of [2, 3, 4]) {
    expect(await press()).toEqual({ ok: false, code: 'not_configured' });
    expect(created).toBe(attempt);
  }
  expect(stopped).toHaveLength(12);
  expect(closes).toBe(4);

  // Bounded: past the presses a launch gets, one more refuses without importing the provider again.
  expect(await press()).toEqual({ ok: false, code: 'not_configured' });
  expect(created).toBe(4);
  // One observer for the launch, however many clients it installed.
  expect(identityObservers).toBe(1);
  await disposeOnlook();
});
