import { afterAll, expect, spyOn, test } from 'bun:test';
import { ipcMain as electronIpc } from 'electron';
import { IPC_INVOKE, IPC_SEND } from '@studio/events';
import { setViewSource } from '../window/host.js';
import { registerStudioChromeSender } from './roles.js';
import { handle, on } from './bridge.js';

const invokes = new Map<string, Parameters<typeof electronIpc.handle>[1]>();
const sends = new Map<string, Parameters<typeof electronIpc.on>[1]>();
const invokeRegistration = spyOn(electronIpc, 'handle').mockImplementation((channel, listener) => { invokes.set(channel, listener); });
const sendRegistration = spyOn(electronIpc, 'on').mockImplementation((channel, listener) => { sends.set(channel, listener); return electronIpc; });
const tab = { id: 1, mainFrame: {}, isDestroyed: () => false } as unknown as Electron.WebContents;
const chrome = { id: 2, mainFrame: {}, isDestroyed: () => false } as unknown as Electron.WebContents;
const guest = { id: 3, mainFrame: {}, isDestroyed: () => false } as unknown as Electron.WebContents;
registerStudioChromeSender(chrome);
setViewSource({ active: () => tab, all: () => [tab, chrome] });
const invokeEvent = (sender: Electron.WebContents, senderFrame = sender.mainFrame) => ({ sender, senderFrame }) as Electron.IpcMainInvokeEvent;
const sendEvent = (sender: Electron.WebContents, senderFrame = sender.mainFrame) => ({ sender, senderFrame }) as Electron.IpcMainEvent;
/** Every row, whatever its contract: the sender check is the same one and runs before any handler. */
const handleAny = handle as unknown as (channel: string, handler: () => unknown, declined?: () => unknown) => void;
const onAny = on as unknown as (channel: string, listener: () => void) => void;
afterAll(() => { invokeRegistration.mockRestore(); sendRegistration.mockRestore(); setViewSource(undefined); });

test('publication IPC guards every invoke channel against guests and subframes', async () => {
  for (const channel of Object.values(IPC_INVOKE)) {
    let reached = 0;
    handleAny(channel, () => { reached += 1; }, () => { reached += 1; });
    const invoke = invokes.get(channel)!;
    await expect(invoke(invokeEvent(guest))).rejects.toThrow();
    await expect(invoke(invokeEvent(tab, {} as Electron.WebFrameMain))).rejects.toThrow();
    expect(reached).toBe(0);
  }
});

test('publication IPC drops every foreign send without crashing main', () => {
  for (const channel of Object.values(IPC_SEND)) {
    let reached = 0;
    onAny(channel, () => { reached += 1; });
    const send = sends.get(channel)!;
    expect(() => send(sendEvent(guest))).not.toThrow();
    expect(() => send(sendEvent(tab, {} as Electron.WebFrameMain))).not.toThrow();
    expect(() => send({} as Electron.IpcMainEvent)).not.toThrow();
    expect(reached).toBe(0);
  }
});

test('publication IPC keeps chrome controls working without granting Project capabilities', async () => {
  handleAny(IPC_INVOKE.chromeExpand, () => 'expanded');
  handleAny(IPC_INVOKE.updateStatus, () => 'idle');
  handleAny(IPC_INVOKE.agentCommand, () => 'started');
  expect(await invokes.get(IPC_INVOKE.chromeExpand)!(invokeEvent(chrome))).toBe('expanded');
  expect(await invokes.get(IPC_INVOKE.updateStatus)!(invokeEvent(chrome))).toBe('idle');
  await expect(invokes.get(IPC_INVOKE.agentCommand)!(invokeEvent(chrome))).rejects.toThrow();
  await expect(invokes.get(IPC_INVOKE.chromeExpand)!(invokeEvent(tab))).rejects.toThrow();
});
