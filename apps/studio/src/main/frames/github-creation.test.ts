import { afterEach, expect, spyOn, test } from 'bun:test';
import electron from 'electron';
import { IPC_INVOKE } from '@studio/events';
import * as host from '../window/host.js';
import { registerStudioChromeSender } from '../ipc/roles.js';
import { beginCreation, creationRegistered } from '../github-import/telemetry.js';
import type { GithubObservation } from '../github-import/capture.js';
import { registerFrameHandlers } from './index.js';

const originalFlags = process.env['STUDIO_FLAGS'];
type ProofGlobal = typeof globalThis & { __studioGithubProof?: { observe(event: GithubObservation): void } };
afterEach(() => {
  if (originalFlags === undefined) delete process.env['STUDIO_FLAGS']; else process.env['STUDIO_FLAGS'] = originalFlags;
  delete (globalThis as ProofGlobal).__studioGithubProof;
});

test('folder picker measures the start before the OS answer and rejects Chrome without side effects', async () => {
  process.env['STUDIO_FLAGS'] = '';
  const events: GithubObservation[] = [];
  (globalThis as ProofGlobal).__studioGithubProof = { observe: (event) => { events.push(event); } };
  const handlers = new Map<string, Parameters<typeof electron.ipcMain.handle>[1]>();
  const registration = spyOn(electron.ipcMain, 'handle').mockImplementation((channel, listener) => { handlers.set(channel, listener); });
  const owner = spyOn(host, 'ownerOf').mockReturnValue(undefined);
  const tab = { id: 1, mainFrame: {}, isDestroyed: () => false } as Electron.WebContents;
  const chrome = { id: 2, mainFrame: {}, isDestroyed: () => false } as Electron.WebContents;
  registerStudioChromeSender(chrome);
  host.setViewSource({ active: () => tab, all: () => [tab, chrome] });
  let answer!: (result: Electron.OpenDialogReturnValue) => void;
  const originalDialog = electron.dialog.showOpenDialog;
  electron.dialog.showOpenDialog = (() => new Promise<Electron.OpenDialogReturnValue>((resolve) => { answer = resolve; })) as typeof electron.dialog.showOpenDialog;
  try {
    registerFrameHandlers();
    const invoke = handlers.get(IPC_INVOKE.pickFolder)!;
    const request = { title: 'Choose a folder', buttonLabel: 'Choose', creationSource: 'folder' };
    await expect(invoke({ sender: chrome, senderFrame: chrome.mainFrame } as Electron.IpcMainInvokeEvent, request)).rejects.toThrow();
    expect(events).toEqual([]);
    const pending = invoke({ sender: tab, senderFrame: tab.mainFrame } as Electron.IpcMainInvokeEvent, request);
    expect(events.map((event) => event.properties)).toEqual([{ source: 'folder', step: 'started', outcome: 'started' }]);
    answer({ canceled: true, filePaths: [] });
    expect(await pending).toEqual({ canceled: true });
    const picked = invoke({ sender: tab, senderFrame: tab.mainFrame } as Electron.IpcMainInvokeEvent, request);
    answer({ canceled: false, filePaths: ['/private/folder-start-proof'] });
    await picked;
    beginCreation('/private/folder-start-proof', 'folder');
    creationRegistered('/private/folder-start-proof', 'github.com/team/folder-start-proof');
    expect(events.filter((event) => 'step' in event.properties && event.properties.step === 'started')).toHaveLength(2);
    expect(events.at(-1)?.properties).toMatchObject({ source: 'folder', step: 'created' });
  } finally {
    registration.mockRestore(); owner.mockRestore(); host.setViewSource(undefined);
    if (originalDialog === undefined) Reflect.deleteProperty(electron.dialog, 'showOpenDialog'); else electron.dialog.showOpenDialog = originalDialog;
  }
});
