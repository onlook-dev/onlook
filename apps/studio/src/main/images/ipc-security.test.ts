import { afterAll, afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dialog, ipcMain } from 'electron';
import { IPC_INVOKE } from '@studio/events';
import { setViewSource } from '../window/host.js';
import * as windowHost from '../window/host.js';
import { views } from '../tabs/views.js';
import { registerImageHandlers } from './index.js';
import { attachmentBelongsTo, clearWorkspaceImages, registerImage, resetImagesStore } from './store.js';

const handlers = new Map<string, Parameters<typeof ipcMain.handle>[1]>();
const registration = spyOn(ipcMain, 'handle').mockImplementation((channel, listener) => { handlers.set(channel, listener); });
const owner = spyOn(windowHost, 'ownerOf').mockReturnValue(undefined);
const saved = process.env['STUDIO_STATE_ROOT'];
const tab = { id: 41, mainFrame: {}, isDestroyed: () => false } as unknown as Electron.WebContents;
const event = { sender: tab, senderFrame: tab.mainFrame } as Electron.IpcMainInvokeEvent;
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0, 255]);
let own: string;
let other: string;
beforeEach(() => {
  process.env['STUDIO_STATE_ROOT'] = mkdtempSync(join(tmpdir(), 'image-ipc-state-'));
  own = realpathSync(mkdtempSync(join(tmpdir(), 'image-ipc-own-')));
  other = realpathSync(mkdtempSync(join(tmpdir(), 'image-ipc-other-')));
  resetImagesStore();
  views.register(tab.id, own, { send: () => {} });
  setViewSource({ active: () => tab, all: () => [tab] });
  registerImageHandlers();
});
afterEach(() => {
  views.unregister(tab.id);
  resetImagesStore();
  setViewSource(undefined);
  if (saved === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = saved;
});
afterAll(() => { registration.mockRestore(); owner.mockRestore(); });

test('publication images refuse reads from another Project even with a valid blob id', async () => {
  const foreign = registerImage(other, png);
  const local = registerImage(own, png);
  if (!foreign.ok || !local.ok) throw new Error('fixture image refused');
  const read = handlers.get(IPC_INVOKE.imageBytes)!;
  expect(await read(event, { id: foreign.image.id })).toBeNull();
  expect(await read(event, { id: local.image.id })).not.toBeNull();
});

for (const channel of [IPC_INVOKE.pickImages, IPC_INVOKE.pickAttachments]) {
  test(`publication file picker ${channel} admits a selected file for the unchanged Project`, async () => {
    const path = join(own, 'picked.png');
    writeFileSync(path, png);
    let finish: ((result: Electron.OpenDialogReturnValue) => void) | undefined;
    const picker = spyOn(dialog, 'showOpenDialog').mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    try {
      const pending = handlers.get(channel)!(event, { cwd: own, agent: 'codex', target: 'chat', filterLabel: 'Images' });
      expect(finish).toBeDefined();
      finish!({ canceled: false, filePaths: [path] });
      const result = await pending;
      expect(result.canceled).toBe(false);
      const id = channel === IPC_INVOKE.pickImages ? result.images[0].image.id : result.files[0].id;
      expect(attachmentBelongsTo(own, id)).toBe(true);
    } finally {
      picker.mockRestore();
    }
  });
  for (const changed of ['project', 'sender', 'generation'] as const) {
    test(`publication file picker ${channel} cancels after ${changed} changes while open`, async () => {
      let finish: ((result: Electron.OpenDialogReturnValue) => void) | undefined;
      const picker = spyOn(dialog, 'showOpenDialog').mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
      const destroyed = spyOn(tab, 'isDestroyed');
      try {
        const pending = handlers.get(channel)!(event, { cwd: own, agent: 'codex', target: 'chat', filterLabel: 'Images' });
        expect(finish).toBeDefined();
        if (changed === 'project') views.register(tab.id, other, { send: () => {} });
        if (changed === 'sender') destroyed.mockReturnValue(true);
        if (changed === 'generation') clearWorkspaceImages(own);
        finish!({ canceled: false, filePaths: ['/not-a-picked-file.png'] });
        expect(await pending).toEqual({ canceled: true });
      } finally {
        picker.mockRestore();
        destroyed.mockRestore();
      }
    });
  }
}

test('publication images refuse registration into a different Project', async () => {
  const write = handlers.get(IPC_INVOKE.registerImage)!;
  expect(await write(event, { cwd: other, bytes: png, target: 'canvas' })).toEqual({ ok: false, reason: 'unreadable' });
  expect(await write(event, { cwd: own, bytes: png, target: 'canvas' })).toMatchObject({ ok: true });
});
