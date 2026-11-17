import { expect, mock } from 'bun:test';
import { EventEmitter } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IPC_INVOKE, type StudioIdentity } from '@studio/events';
import { clearIdentity, readIdentity, resetIdentityCache, writeIdentity } from '../identity/store.js';
import { writeStateFile } from '../state/file.js';
import { statePublisher, type CloudIdentity, type LaunchSessionResult } from './client.js';

export async function exerciseLaunchSession(
  outcome: 'ended' | 'unavailable' | 'superseded' | 'sign-out-pending',
  load: () => Promise<{ initializeOnlook(): Promise<void>; disposeOnlook(): Promise<void>; registerOnlookHandlers(): void }>,
  handlers: Map<string, Parameters<Electron.IpcMain['handle']>[1]> = new Map(),
) {
  const root = mkdtempSync(join(tmpdir(), 'studio-launch-session-'));
  const savedRoot = process.env['STUDIO_STATE_ROOT'];
  const savedCloud = process.env['MAIN_VITE_ONLOOK_CLOUD'];
  process.env['STUDIO_STATE_ROOT'] = root;
  process.env['MAIN_VITE_ONLOOK_CLOUD'] = 'true';
  let beginAction!: () => void;
  const actionStarted = new Promise<void>((resolve) => { beginAction = resolve; });
  let finishSignOut!: () => void;
  resetIdentityCache();
  const stored = writeIdentity({ email: 'designer@example.com', source: 'manual' });
  const before = readFileSync(join(root, 'identity.json'), 'utf8');
  writeStateFile(join(root, 'launch-activity.json'), 1, Date.now() - 52 * 60 * 60 * 1000);
  let session = true;
  let changed = () => {};
  let signedIn: (identity: StudioIdentity) => void = () => {};
  let finish!: (result: LaunchSessionResult) => void;
  const events: { event: string; properties: unknown }[] = [];
  const logs: unknown[] = [];
  const states: { sessionEnded?: boolean; session: string }[] = [];
  const publisher = statePublisher({ revision: 0, session: 'signed-out', connection: 'offline', me: null, profile: null });
  const identity: CloudIdentity = {
    enabled: () => true, configured: () => true, prepareSession: () => ({}), hasSession: () => session,
    clearSession: () => { session = false; changed(); },
    signIn: async () => stored, refreshSession: async () => {}, supersedeSignIn: () => {}, dispose: () => {},
    signInStep: () => null, onSignInProgress: () => () => {},
    onSessionChanged(listener) { changed = listener; return () => {}; },
    checkLaunchSession: () => new Promise((resolve) => { finish = resolve; }),
  };
  mock.module('@onlook/cloud-provider', () => ({ identity, createOnlookClient: () => ({
    start: () => {}, close: async () => {}, snapshot: publisher.snapshot, subscribe: publisher.subscribe,
    setSession: (present: boolean) => publisher.publish({ session: present ? 'signed-in' : 'signed-out' }),
    setProfile: (profile: Parameters<typeof publisher.publish>[0]['profile']) => publisher.publish({ profile }),
    signIn: async () => {},
    signOut: () => new Promise<void>((resolve) => { finishSignOut = resolve; beginAction(); }),
    deleteAccount: async () => {},
  }) }));
  mock.module('../identity/ipc.js', () => ({
    clearAccountIdentity: () => { clearIdentity(); },
    onIdentity: (listener: typeof signedIn) => { signedIn = listener; }, completeBrowserSignIn: () => {},
  }));
  mock.module('../window/host.js', () => ({ everyRenderer: () => [] }));
  mock.module('../tabs/broadcast.js', () => ({ broadcastToRenderers: (_channel: string, state: typeof states[number]) => { states.push(state); } }));
  mock.module('../tabs/sender.js', () => ({ requireStudioTabSender: () => {} }));
  mock.module('../identity/picture.js', () => ({ resolvePicture: async () => null }));
  mock.module('../telemetry/index.js', () => ({ capture: (event: string, properties: unknown) => { events.push({ event, properties }); }, identifyPerson: () => {} }));
  mock.module('../log/index.js', () => ({ log: () => ({ warn: (_message: string, properties: unknown) => { logs.push(properties); } }) }));
  const { initializeOnlook, disposeOnlook, registerOnlookHandlers } = await load();
  try {
    await initializeOnlook();
    let action: unknown;
    if (outcome === 'sign-out-pending') {
      registerOnlookHandlers();
      const sender = Object.assign(new EventEmitter(), { id: 71 });
      action = handlers.get(IPC_INVOKE.onlookSignOut)!({ sender } as unknown as Electron.IpcMainInvokeEvent);
      await actionStarted;
    }
    if (outcome === 'superseded') { signedIn(stored); changed(); }
    finish(outcome === 'unavailable' ? { status: 'unavailable' } : { status: 'ended', reason: 'expired' });
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    if (outcome === 'ended') {
      expect(readIdentity()).toBeNull();
      expect(publisher.snapshot().session).toBe('signed-out');
      expect(states.at(-1)?.sessionEnded).toBe(true);
      expect(events).toHaveLength(1);
      expect(events[0]?.event).toBe('session_ended_at_launch');
      expect(events[0]?.properties).toEqual({ reason: 'expired', unopened_ms: expect.any(Number) });
      const elapsed = (events[0]!.properties as { unopened_ms: number }).unopened_ms;
      expect(elapsed).toBeGreaterThanOrEqual(52 * 60 * 60 * 1000);
      expect(elapsed).toBeLessThan(52 * 60 * 60 * 1000 + 5000);
      expect(logs).toEqual([events[0]?.properties]);
    } else {
      expect(readIdentity()).toEqual(stored);
      expect(readFileSync(join(root, 'identity.json'), 'utf8')).toBe(before);
      expect(publisher.snapshot().session).toBe('signed-in');
      expect(states.at(-1)?.sessionEnded).toBe(false);
      expect(events).toEqual([]);
      expect(logs).toEqual([]);
    }
    if (outcome === 'sign-out-pending') {
      finishSignOut();
      await action;
      expect(readIdentity()).toBeNull();
      expect(publisher.snapshot().session).toBe('signed-out');
      expect(states.at(-1)?.sessionEnded).toBe(false);
    }
  } finally {
    await disposeOnlook();
    resetIdentityCache();
    if (savedRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
    else process.env['STUDIO_STATE_ROOT'] = savedRoot;
    if (savedCloud === undefined) delete process.env['MAIN_VITE_ONLOOK_CLOUD'];
    else process.env['MAIN_VITE_ONLOOK_CLOUD'] = savedCloud;
    rmSync(root, { recursive: true, force: true });
  }
}
