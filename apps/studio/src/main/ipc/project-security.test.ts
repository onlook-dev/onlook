import { afterAll, afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { EventEmitter } from 'node:events';
import { mkdtempSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ipcMain, webContents } from 'electron';
import { IPC_INVOKE, IPC_SEND } from '@studio/events';
import { protectAppContents, setViewSource } from '../window/host.js';
import { views, workspaceOf } from '../tabs/views.js';
import { registerLocationHandlers } from '../location/index.js';
import { registerDraftsHandlers } from '../drafts/index.js';
import { readComposerDraft, writeComposerDraft, resetComposerDraftsCache } from '../drafts/state.js';
import { canvasDocIdFor, resetCanvasRegistryCache } from '../canvas/registry.js';
import { registerCanvasHandlers } from '../canvas/index.js';
import { readCanvasPageCameras } from '../canvas/camera.js';
import { frameMirror, installFrameMirror } from '../canvas/mirror.js';
import { resetWorkspaceCache } from '../workspace/store.js';
import { registerAgentHost, disposeAgentHost } from '../agent-host/index.js';
import { registerCodeHandlers } from '../code/index.js';

const invokes = new Map<string, Parameters<typeof ipcMain.handle>[1]>();
const sends = new Map<string, Parameters<typeof ipcMain.on>[1]>();
const invokeRegistration = spyOn(ipcMain, 'handle').mockImplementation((channel, listener) => { invokes.set(channel, listener); });
const sendRegistration = spyOn(ipcMain, 'on').mockImplementation((channel, listener) => { sends.set(channel, listener); return ipcMain; });
const tab = Object.assign(new EventEmitter(), { id: 81, mainFrame: {}, isDestroyed: () => false }) as unknown as Electron.WebContents;
const event = { sender: tab, senderFrame: tab.mainFrame } as Electron.IpcMainInvokeEvent;
const sendEvent = event as Electron.IpcMainEvent;
const savedState = process.env['STUDIO_STATE_ROOT'];
const savedWorkspaces = process.env['STUDIO_WORKSPACE_ROOT'];
let own: string;
let other: string;
beforeEach(() => {
  process.env['STUDIO_STATE_ROOT'] = mkdtempSync(join(tmpdir(), 'project-ipc-state-'));
  process.env['STUDIO_WORKSPACE_ROOT'] = mkdtempSync(join(tmpdir(), 'project-ipc-registry-'));
  own = realpathSync(mkdtempSync(join(tmpdir(), 'project-ipc-own-')));
  other = realpathSync(mkdtempSync(join(tmpdir(), 'project-ipc-other-')));
  resetWorkspaceCache(); resetCanvasRegistryCache(); resetComposerDraftsCache();
  views.register(tab.id, own, { send: () => {} });
  setViewSource({ active: () => tab, all: () => [tab] });
});
afterEach(() => {
  views.unregister(tab.id); setViewSource(undefined);
  if (savedState === undefined) delete process.env['STUDIO_STATE_ROOT']; else process.env['STUDIO_STATE_ROOT'] = savedState;
  if (savedWorkspaces === undefined) delete process.env['STUDIO_WORKSPACE_ROOT']; else process.env['STUDIO_WORKSPACE_ROOT'] = savedWorkspaces;
  resetWorkspaceCache(); resetCanvasRegistryCache(); resetComposerDraftsCache();
});
afterAll(() => { invokeRegistration.mockRestore(); sendRegistration.mockRestore(); });

test('publication Project selection cannot authorize an unregistered filesystem root', async () => {
  registerLocationHandlers();
  const pending = invokes.get(IPC_INVOKE.locationSet)!(event, { kind: 'project', workspacePath: other, repoIdentity: 'unregistered' });
  const selected = workspaceOf(tab.id);
  await pending;
  expect(selected).toBe(own);
});

test('publication agent startup cannot repoint a Tab to an unregistered filesystem root', async () => {
  registerAgentHost({ isDev: false });
  try {
    expect(await invokes.get(IPC_INVOKE.agentCommand)!(event, { type: 'session.start', cwd: other })).toEqual({ accepted: false });
    expect(workspaceOf(tab.id)).toBe(own);
  } finally {
    await disposeAgentHost();
  }
});

for (const provider of ['figma', 'mobbin'] as const) {
  test(`publication IPC guards merged ${provider} Connector commands and keeps the asking Project`, async () => {
    const host = registerAgentHost({ isDev: false });
    const command = spyOn(host, 'command').mockResolvedValue({ accepted: true });
    const guest = { id: 83, mainFrame: {}, isDestroyed: () => false };
    const chrome = Object.assign(new EventEmitter(), { id: 82, mainFrame: {}, isDestroyed: () => false, setWindowOpenHandler: () => {} }) as unknown as Electron.WebContents;
    protectAppContents(chrome, { role: 'chrome' });
    setViewSource({ active: () => tab, all: () => [tab, chrome] });
    const payload = { type: 'connectors.add', provider, cwd: other };
    try {
      const invoke = invokes.get(IPC_INVOKE.agentCommand)!;
      for (const request of [
        { sender: guest, senderFrame: guest.mainFrame },
        { sender: tab, senderFrame: {} },
        { sender: chrome, senderFrame: chrome.mainFrame },
      ]) {
        await expect(Promise.resolve().then(() => invoke(request as Electron.IpcMainInvokeEvent, payload))).rejects.toThrow(
          request.sender === chrome ? 'Onlook IPC is not available to this view' : 'Onlook requires a Studio Tab',
        );
      }
      expect(command).not.toHaveBeenCalled();
      expect(await invoke(event, payload)).toEqual({ accepted: true });
      expect(command).toHaveBeenCalledTimes(1);
      expect(command).toHaveBeenCalledWith(payload, own);
      expect(workspaceOf(tab.id)).toBe(own);
    } finally {
      command.mockRestore();
      await disposeAgentHost();
    }
  });
}

test('publication Code mapping refuses another Project Canvas document', async () => {
  registerCodeHandlers();
  for (const channel of [IPC_INVOKE.codeIdentify, IPC_INVOKE.codeComponentMap, IPC_INVOKE.codeMap]) {
    expect(await invokes.get(channel)!(event, { docId: canvasDocIdFor(other), frameId: 'foreign' })).toEqual({ ok: false, decline: 'unaddressable' });
  }
});

test('publication drafts refuse another Project text and writes', async () => {
  registerDraftsHandlers();
  writeComposerDraft(other, { text: 'foreign draft', images: [] });
  expect(await invokes.get(IPC_INVOKE.draftState)!(event, { cwd: other })).toEqual({ text: '', images: [] });
  sends.get(IPC_SEND.draftSave)!(sendEvent, { cwd: other, draft: { text: 'replaced', images: [] } });
  expect(readComposerDraft(other).text).toBe('foreign draft');
  sends.get(IPC_SEND.draftSave)!(sendEvent, { cwd: own, draft: { text: 'own draft', images: [] } });
  expect(readComposerDraft(own).text).toBe('own draft');
});

test('publication Canvas camera writes require the asking Tab document', () => {
  registerCanvasHandlers();
  const ownDoc = canvasDocIdFor(own);
  const foreignDoc = canvasDocIdFor(other);
  const camera = { x: 12, y: 34, zoom: 1 };
  sends.get(IPC_SEND.canvasViewport)!(sendEvent, { docId: foreignDoc, pageId: 'page-1', camera });
  expect(readCanvasPageCameras(foreignDoc)).toEqual({});
  sends.get(IPC_SEND.canvasViewport)!(sendEvent, { docId: ownDoc, pageId: 'page-1', camera });
  expect(readCanvasPageCameras(ownDoc)['page-1']).toEqual(camera);
});

test('publication Frame evidence cannot claim another Tab guest', () => {
  const fromId = spyOn(webContents, 'fromId').mockImplementation((id) => ({
    id, isDestroyed: () => false, getType: () => 'webview', hostWebContents: id === 901 ? tab : {},
  }) as Electron.WebContents);
  try {
    installFrameMirror();
    const docId = canvasDocIdFor(own);
    const facts = { id: 'frame', currentUrl: 'http://localhost:3000', health: 'live', title: 'Fixture' };
    sends.get(IPC_SEND.canvasFrames)!(sendEvent, { docId, frames: [{ ...facts, webContentsId: 902 }] });
    expect(frameMirror().peek(docId, 'frame')?.webContentsId).toBeUndefined();
    sends.get(IPC_SEND.canvasFrames)!(sendEvent, { docId, frames: [{ ...facts, webContentsId: 901 }] });
    expect(frameMirror().peek(docId, 'frame')?.webContentsId).toBe(901);
  } finally { fromId.mockRestore(); }
});
