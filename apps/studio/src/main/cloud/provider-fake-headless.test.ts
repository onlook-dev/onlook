import { expect, mock, spyOn, test } from 'bun:test';
import { ipcMain } from 'electron';
import { IPC_INVOKE, type OnlookState } from '@studio/events';
import { createFakeProvider } from './provider-fake.js';

const provider = createFakeProvider({ session: true });
provider.prepared = null;
const warnings: string[] = [];
const handlers = new Map<string, Parameters<typeof ipcMain.handle>[1]>();
const registration = spyOn(ipcMain, 'handle').mockImplementation((channel, handler) => { handlers.set(channel, handler); });
mock.module('@onlook/cloud-provider', () => provider.module);
mock.module('../window/host.js', () => ({ everyRenderer: () => [], restoreAllMinimized: () => {} }));
mock.module('../tabs/broadcast.js', () => ({ broadcastToRenderers: () => {} }));
mock.module('../tabs/sender.js', () => ({ requireStudioTabSender: () => {} }));
mock.module('../log/index.js', () => ({ log: () => ({ warn: (message: string) => { warnings.push(message); } }) }));
mock.module('../telemetry/index.js', () => ({ capture: () => {}, identifyPerson: () => {}, resetTelemetryIdentity: () => {} }));

test('a launch the provider prepares no session for installs no client and never asks for the stored session', async () => {
  const { initializeOnlook, registerOnlookHandlers, disposeOnlook } = await import('./index.js');
  try {
    await initializeOnlook();
    await initializeOnlook();
    expect(provider.calls).toEqual(['prepareSession', 'prepareSession']);
    // Declining to open a session is an answer, not a failed install.
    expect(warnings).toEqual([]);
    registerOnlookHandlers();
    const state = await handlers.get(IPC_INVOKE.onlookState)!({} as Electron.IpcMainInvokeEvent) as OnlookState;
    expect(state.session).toBe('local');
    expect(await handlers.get(IPC_INVOKE.onlookSignOut)!({} as Electron.IpcMainInvokeEvent)).toEqual({ ok: false, code: 'not_configured' });
    expect(provider.calls).not.toContain('hasSession');
    expect(provider.calls).not.toContain('createOnlookClient');
    expect(provider.calls).not.toContain('clearSession');
  } finally {
    await disposeOnlook();
    registration.mockRestore();
  }
});
