import { afterAll, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { ipcMain } from 'electron';
import { IPC_INVOKE, type ReportSubmitOutcome } from '@studio/events';
import type { ReportProperties } from './payload.js';

const tab = { id: 7, mainFrame: {}, isDestroyed: () => false };
const handlers = new Map<string, Parameters<typeof ipcMain.handle>[1]>();
const registration = spyOn(ipcMain, 'handle').mockImplementation((channel, handler) => {
  handlers.set(channel, handler);
});
const captured: ReportProperties[] = [];

mock.module('@onlook/cloud-provider', () => ({ identity: { enabled: () => false } }));
mock.module('./provider.js', () => ({ reportProvider: async () => undefined }));
mock.module('../identity/store.js', () => ({
  readIdentity: () => ({ email: 'designer@onlook.test', source: 'manual' }),
}));
mock.module('../telemetry/index.js', () => ({
  correlation: () => ({ installId: 'test-install' }),
  captureDurable: async (_event: string, properties: ReportProperties) => {
    captured.push(properties);
    return 'queued';
  },
}));
mock.module('../window/host.js', () => ({ everyRenderer: () => [tab] }));

const { registerReportHandlers, resetReportBoundsForTesting } = await import('./index.js');
registerReportHandlers();

const request = { lane: 'bug', entryPoint: 'menu', message: 'the canvas froze' };
const from = (sender: unknown, frame: unknown = (sender as { mainFrame: unknown }).mainFrame) =>
  ({ sender, senderFrame: frame }) as unknown as Electron.IpcMainInvokeEvent;
const submit = (event: Electron.IpcMainInvokeEvent) =>
  handlers.get(IPC_INVOKE.reportSubmit)!(event, request) as Promise<ReportSubmitOutcome>;
const askCapability = (event: Electron.IpcMainInvokeEvent) =>
  handlers.get(IPC_INVOKE.reportCapability)!(event) as Promise<boolean>;

beforeEach(() => {
  captured.length = 0;
  resetReportBoundsForTesting();
});

afterAll(() => {
  registration.mockRestore();
});

describe('who may reach the report channels', () => {
  it('takes a report for a Studio Tab', async () => {
    expect(await submit(from(tab))).toEqual({ kind: 'queued' });
    expect(await askCapability(from(tab))).toBe(false);
    expect(captured).toHaveLength(1);
  });

  it('refuses report channels for a sender that is not a Studio Tab, capturing nothing', async () => {
    const stranger = { id: 9, mainFrame: {}, isDestroyed: () => false };

    expect(() => submit(from(stranger))).toThrow('Studio Tab');
    await expect(askCapability(from(stranger))).rejects.toThrow('Studio Tab');
    expect(captured).toEqual([]);
  });

  it('refuses report channels for a subframe of a Studio Tab, capturing nothing', async () => {
    expect(() => submit(from(tab, {}))).toThrow('Studio Tab');
    await expect(askCapability(from(tab, {}))).rejects.toThrow('Studio Tab');
    expect(captured).toEqual([]);
  });
});
