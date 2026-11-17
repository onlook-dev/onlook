import { afterAll, expect, mock, spyOn, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ipcMain } from 'electron';
import { IPC_INVOKE, type OnlookState } from '@studio/events';
import { readIdentity, resetIdentityCache, writeIdentity } from '../identity/store.js';
import type { LaunchSessionResult } from './client.js';
import { createFakeProvider } from './provider-fake.js';

let answer!: (result: LaunchSessionResult) => void;
let checking: AbortSignal | undefined;
const events: string[] = [];
const provider = createFakeProvider({
  session: true,
  checkLaunchSession: (signal) => new Promise((resolve) => { checking = signal; answer = resolve; }),
});
const handlers = new Map<string, Parameters<typeof ipcMain.handle>[1]>();
const registration = spyOn(ipcMain, 'handle').mockImplementation((channel, handler) => { handlers.set(channel, handler); });
mock.module('@onlook/cloud-provider', () => provider.module);
mock.module('../window/host.js', () => ({ everyRenderer: () => [], restoreAllMinimized: () => {} }));
mock.module('../tabs/broadcast.js', () => ({ broadcastToRenderers: () => {} }));
mock.module('../tabs/sender.js', () => ({ requireStudioTabSender: () => {} }));
mock.module('../identity/picture.js', () => ({ resolvePicture: async () => null }));
mock.module('../telemetry/index.js', () => ({ capture: (event: string) => { events.push(event); }, identifyPerson: () => {}, resetTelemetryIdentity: () => {} }));
mock.module('../log/index.js', () => ({ log: () => ({ warn: () => {} }) }));

afterAll(() => { registration.mockRestore(); });

test('a sign-in press supersedes the pending launch check even when the press fails, so a late expiry clears nothing', async () => {
  const saved = process.env['STUDIO_STATE_ROOT'];
  const root = mkdtempSync(join(tmpdir(), 'studio-fake-launch-session-'));
  process.env['STUDIO_STATE_ROOT'] = root;
  resetIdentityCache();
  const account = writeIdentity({ email: 'wren@example.com', source: 'provider', subject: 'user_01TEST' });
  const { initializeOnlook, registerOnlookHandlers, disposeOnlook } = await import('./index.js');
  const ask = async (channel: string, argument?: unknown) => handlers.get(channel)!({} as Electron.IpcMainInvokeEvent, argument);
  try {
    await initializeOnlook();
    registerOnlookHandlers();
    expect(provider.calls.filter((call) => call === 'checkLaunchSession')).toHaveLength(1);
    expect(checking?.aborted).toBe(false);

    provider.signInResult = new Error('denied');
    expect(await ask(IPC_INVOKE.onlookSignIn, 'google')).toEqual({ ok: false, code: 'denied' });
    expect(checking?.aborted).toBe(true);

    answer({ status: 'ended', reason: 'expired' });
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    const state = await ask(IPC_INVOKE.onlookState) as OnlookState;
    expect(state.session).toBe('signed-in');
    expect(state.sessionEnded).toBe(false);
    expect(readIdentity()).toEqual(account);
    expect(events).not.toContain('session_ended_at_launch');
    expect(provider.calls).not.toContain('clearSession');
    expect(provider.calls.filter((call) => call === 'checkLaunchSession')).toHaveLength(1);
  } finally {
    await disposeOnlook();
    resetIdentityCache();
    if (saved === undefined) delete process.env['STUDIO_STATE_ROOT'];
    else process.env['STUDIO_STATE_ROOT'] = saved;
    rmSync(root, { recursive: true, force: true });
  }
});
