import { afterAll, expect, it, mock, spyOn } from 'bun:test';
import { ipcMain } from 'electron';
import { held } from '@studio/fixtures';
import { IPC_EMIT, IPC_INVOKE, type OnlookState } from '@studio/events';

const keys = ['MAIN_VITE_ONLOOK_CLOUD'] as const;
const saved = keys.map((key) => process.env[key]);
let live: OnlookState = { revision: 0, session: 'signed-out', connection: 'idle', me: null, profile: null };
const handlers = new Map<string, Parameters<typeof ipcMain.handle>[1]>();
const registration = spyOn(ipcMain, 'handle').mockImplementation((channel, handler) => { handlers.set(channel, handler); });
const published: OnlookState[] = [];
/** Never opened: the transport of a discarded client that never finishes closing (ONL-2950). */
const closing = held();
let created = 0;
let closeAsks = 0;
let signIns = 0;

mock.module('@onlook/cloud-provider', () => ({
  identity: {
    enabled: () => true, configured: () => true, prepareSession: () => ({ url: 'http://127.0.0.1:1' }), hasSession: () => live.session === 'signed-in',
    signIn: async () => ({ email: 'designer@onlook.test', source: 'workos' }), supersedeSignIn: () => {}, clearSession: () => {},
    refreshSession: async () => {}, dispose: () => {}, signInStep: () => null,
    onSignInProgress: () => () => {}, onSessionChanged: () => () => {},
  },
  // The first two clients cannot open their connection; the third can (ONL-2950).
  createOnlookClient: () => {
    created += 1;
    const broken = created <= 2;
    return {
      start: () => { if (broken) throw new Error('the socket refused'); },
      close: () => { closeAsks += 1; return broken ? closing.wait() : Promise.resolve(); },
      snapshot: () => live, subscribe: () => () => {},
      setSession: () => {}, setProfile: () => {},
      signIn: async () => { signIns += 1; live = { ...live, session: 'signed-in' }; }, signOut: async () => {}, deleteAccount: async () => {},
      teamCommand: async () => ({ ok: false, error: 'unavailable' }),
    };
  },
}));
mock.module('../identity/ipc.js', () => ({ clearAccountIdentity: () => {}, onIdentity: () => {}, completeBrowserSignIn: (identity: unknown) => identity }));
mock.module('../identity/store.js', () => ({ readIdentity: () => null, writeIdentity: (record: unknown) => record, clearIdentity: () => {} }));
mock.module('../identity/picture.js', () => ({ resolvePicture: async () => null }));
mock.module('../tabs/broadcast.js', () => ({ broadcastToRenderers: (channel: string, payload: unknown) => {
  if (channel === IPC_EMIT.onlookState) published.push(payload as OnlookState);
} }));
mock.module('../tabs/sender.js', () => ({ requireStudioTabSender: () => {} }));
mock.module('../window/host.js', () => ({ everyRenderer: () => [], restoreAllMinimized: () => {} }));
mock.module('../telemetry/index.js', () => ({ capture: () => {}, identifyPerson: () => {}, resetTelemetryIdentity: () => {} }));
mock.module('../log/index.js', () => ({ log: () => ({ warn: () => {} }) }));

// Before the import: `initializeOnlook` picks its implementation from this value at module evaluation.
process.env['MAIN_VITE_ONLOOK_CLOUD'] = 'true';
const { initializeOnlook, registerOnlookHandlers } = await import('./index.js');
registerOnlookHandlers();
const event = {} as Electron.IpcMainInvokeEvent;
const press = async (): Promise<unknown> => handlers.get(IPC_INVOKE.onlookSignIn)!(event, 'google');
const session = async (): Promise<string> => ((await handlers.get(IPC_INVOKE.onlookState)!(event)) as OnlookState).session;

afterAll(() => {
  registration.mockRestore();
  closing.open();
  keys.forEach((key, index) => { if (saved[index] === undefined) delete process.env[key]; else process.env[key] = saved[index]; });
});

// Awaiting the close instead of retiring the client never reaches the first assertion: `closing` is the close that never finishes.
it('retires a client whose close never finishes, so boot answers and the launch reads as local', async () => {
  await initializeOnlook();
  expect(created).toBe(1);
  expect(closeAsks).toBe(1);
  expect(published.at(-1)?.session).toBe('local');
  expect(await session()).toBe('local');
});

it('two presses behind the gate share one retry', async () => {
  const [first, second] = await Promise.all([press(), press()]);
  expect(created).toBe(2);
  expect(first).toEqual({ ok: false, code: 'not_configured' });
  expect(second).toEqual({ ok: false, code: 'not_configured' });
  expect(closeAsks).toBe(2);
  expect(await session()).toBe('local');
});

it('a later press installs the client the failed launch could not, and signs in', async () => {
  expect(await press()).toEqual({ ok: true });
  expect(created).toBe(3);
  expect(signIns).toBe(1);
  expect(await session()).toBe('signed-in');
});
