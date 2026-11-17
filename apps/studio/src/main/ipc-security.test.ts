import { afterAll, beforeEach, expect, mock, spyOn, test } from 'bun:test';
import { EventEmitter } from 'node:events';
import { ipcMain } from 'electron';
import { IPC_INVOKE } from '@studio/events';
import { protectAppContents, setViewSource } from './window/host.js';
import * as settings from './settings/state.js';
import { rendererFlags } from './flags/index.js';

mock.module('./pty.js', () => ({ ptyEcho: async () => ({ output: '' }) }));
const { registerIpcHandlers } = await import('./ipc.js');
const handlers = new Map<string, Parameters<typeof ipcMain.handle>[1]>();
const registration = spyOn(ipcMain, 'handle').mockImplementation((channel, listener) => { handlers.set(channel, listener); });

function contents(id: number, chrome = false) {
  const sender = Object.assign(new EventEmitter(), {
    id, mainFrame: {}, isDestroyed: () => false,
    setWindowOpenHandler: () => {},
  });
  protectAppContents(sender as unknown as Electron.WebContents, { allowGuests: !chrome, role: chrome ? 'chrome' : undefined });
  return sender as unknown as Electron.WebContents;
}

const tab = contents(1);
const chrome = contents(2, true);
const guest = contents(3);
beforeEach(() => {
  setViewSource({ active: () => tab, all: () => [tab, chrome] });
  registerIpcHandlers();
});
afterAll(() => { registration.mockRestore(); setViewSource(undefined); });

test('publication IPC refuses guest and subframe invokes before touching app state', async () => {
  const invoke = handlers.get(IPC_INVOKE.appFlags)!;
  for (const event of [
    { sender: guest, senderFrame: guest.mainFrame },
    { sender: tab, senderFrame: {} },
    { sender: { ...tab, isDestroyed: () => true }, senderFrame: tab.mainFrame },
  ]) {
    await expect(Promise.resolve().then(() => invoke(event as Electron.IpcMainInvokeEvent))).rejects.toThrow();
  }
  expect(await invoke({ sender: tab, senderFrame: tab.mainFrame } as Electron.IpcMainInvokeEvent)).toEqual(rendererFlags());
});

test('publication IPC refuses chrome invoking a Tab-only capability', async () => {
  const invoke = handlers.get(IPC_INVOKE.appFlags)!;
  await expect(Promise.resolve().then(() => invoke({ sender: chrome, senderFrame: chrome.mainFrame } as Electron.IpcMainInvokeEvent))).rejects.toThrow();
});

test('publication IPC guards the merged Frame picture and telemetry consent handlers', async () => {
  const { registerFrameHandlers } = await import('./frames/index.js');
  const { registerTelemetryHandlers } = await import('./telemetry/ipc.js');
  registerFrameHandlers();
  registerTelemetryHandlers();
  for (const channel of [IPC_INVOKE.framePicture, IPC_INVOKE.telemetryConsent]) {
    const invoke = handlers.get(channel)!;
    for (const event of [
      { sender: guest, senderFrame: guest.mainFrame },
      { sender: tab, senderFrame: {} },
      { sender: chrome, senderFrame: chrome.mainFrame },
    ]) {
      await expect(Promise.resolve().then(() => invoke(event as Electron.IpcMainInvokeEvent, {}))).rejects.toThrow();
    }
  }
  const event = { sender: tab, senderFrame: tab.mainFrame } as Electron.IpcMainInvokeEvent;
  expect(await handlers.get(IPC_INVOKE.framePicture)!(event, {})).toBeNull();
  expect(await handlers.get(IPC_INVOKE.telemetryConsent)!(event)).toBe(settings.analyticsChoiceStored() ? settings.analyticsEnabled() : null);
});

test('the Task Manager reaches only its own channels, and no Tab reaches them', async () => {
  const { registerTaskManagerSender } = await import('./ipc/roles.js');
  const { registerTaskManagerHandlers } = await import('./task-manager/window.js');
  registerTaskManagerHandlers();
  const taskManager = contents(4);
  registerTaskManagerSender(taskManager);
  const fromTaskManager = { sender: taskManager, senderFrame: taskManager.mainFrame } as Electron.IpcMainInvokeEvent;
  await expect(Promise.resolve().then(() => handlers.get(IPC_INVOKE.appFlags)!(fromTaskManager))).rejects.toThrow();
  const fromTab = { sender: tab, senderFrame: tab.mainFrame } as Electron.IpcMainInvokeEvent;
  await expect(Promise.resolve().then(() => handlers.get(IPC_INVOKE.taskManagerSnapshot)!(fromTab))).rejects.toThrow('not available');
});

for (const [consent, expected] of [
  ['unknown', null],
  ['accepted', true],
  ['declined', false],
  ['removed', false],
] as const) {
  test(`publication IPC preserves ${consent} Source telemetry consent`, async () => {
    const consentRead = spyOn(settings, 'telemetryConsent').mockReturnValue(consent);
    const choiceRead = spyOn(settings, 'analyticsChoiceStored').mockReturnValue(true);
    const enabledRead = spyOn(settings, 'analyticsEnabled').mockReturnValue(true);
    try {
      const { registerTelemetryHandlers } = await import('./telemetry/ipc.js');
      registerTelemetryHandlers();
      const event = { sender: tab, senderFrame: tab.mainFrame } as Electron.IpcMainInvokeEvent;
      expect(await handlers.get(IPC_INVOKE.telemetryConsent)!(event)).toBe(expected);
    } finally {
      consentRead.mockRestore();
      choiceRead.mockRestore();
      enabledRead.mockRestore();
    }
  });
}
