import { afterAll, afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { mkdtempSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ipcMain as electronIpc } from 'electron';
import { CHANNELS, IPC_INVOKE, IPC_SEND, type InvokeRow, type SendRow } from '@studio/events';
import { setViewSource } from '../window/host.js';
import { views } from '../tabs/views.js';
import { canvasDocIdFor, resetCanvasRegistryCache } from '../canvas/registry.js';
import { resetWorkspaceCache } from '../workspace/store.js';
import { registerStudioChromeSender } from './roles.js';
import { handle, on } from './bridge.js';
import type { SenderProject } from './project-scope.js';

const invokes = new Map<string, Parameters<typeof electronIpc.handle>[1]>();
const sends = new Map<string, Parameters<typeof electronIpc.on>[1]>();
const invokeRegistration = spyOn(electronIpc, 'handle').mockImplementation((channel, listener) => { invokes.set(channel, listener); });
const sendRegistration = spyOn(electronIpc, 'on').mockImplementation((channel, listener) => { sends.set(channel, listener); return electronIpc; });
const contents = (id: number) => ({ id, mainFrame: {}, isDestroyed: () => false }) as unknown as Electron.WebContents;
const owner = contents(701);
const other = contents(702);
const bare = contents(703);
const chrome = contents(704);
const guest = contents(705);
registerStudioChromeSender(chrome);
const from = (sender: Electron.WebContents, senderFrame = sender.mainFrame) => ({ sender, senderFrame }) as Electron.IpcMainInvokeEvent & Electron.IpcMainEvent;
const savedState = process.env['STUDIO_STATE_ROOT'];
const savedWorkspaces = process.env['STUDIO_WORKSPACE_ROOT'];
let own: string;
let foreign: string;

beforeEach(() => {
  process.env['STUDIO_STATE_ROOT'] = mkdtempSync(join(tmpdir(), 'project-door-state-'));
  process.env['STUDIO_WORKSPACE_ROOT'] = mkdtempSync(join(tmpdir(), 'project-door-registry-'));
  own = realpathSync(mkdtempSync(join(tmpdir(), 'project-door-own-')));
  foreign = realpathSync(mkdtempSync(join(tmpdir(), 'project-door-foreign-')));
  resetWorkspaceCache(); resetCanvasRegistryCache();
  views.register(owner.id, own, { send: () => {} });
  views.register(other.id, foreign, { send: () => {} });
  setViewSource({ active: () => owner, all: () => [owner, other, bare, chrome] });
});
afterEach(() => {
  views.unregister(owner.id); views.unregister(other.id); setViewSource(undefined);
  if (savedState === undefined) delete process.env['STUDIO_STATE_ROOT']; else process.env['STUDIO_STATE_ROOT'] = savedState;
  if (savedWorkspaces === undefined) delete process.env['STUDIO_WORKSPACE_ROOT']; else process.env['STUDIO_WORKSPACE_ROOT'] = savedWorkspaces;
  resetWorkspaceCache(); resetCanvasRegistryCache();
});
afterAll(() => { invokeRegistration.mockRestore(); sendRegistration.mockRestore(); });

test('a Project channel hands its handler the sending view\'s own Project', async () => {
  const seen: SenderProject[] = [];
  handle(IPC_INVOKE.sidebarLayoutState, (project) => { seen.push(project); return { pagesHeight: 1 }; }, () => ({}));
  const invoke = invokes.get(IPC_INVOKE.sidebarLayoutState)!;
  const docId = canvasDocIdFor(own);
  expect(await invoke(from(owner))).toEqual({ pagesHeight: 1 });
  expect(await invoke(from(other))).toEqual({ pagesHeight: 1 });
  expect(seen.map((project) => project.root)).toEqual([own, foreign]);
  expect(seen[0]).toEqual({ key: own as SenderProject['key'], root: own, canvasDocument: docId });
  expect(seen[1]?.canvasDocument).toBeUndefined();
});

test('a view showing no Project is answered the decline and never reaches the handler', async () => {
  let reached = 0;
  handle(IPC_INVOKE.codeRead, () => { reached += 1; return { ok: false, code: 'not-found' }; }, () => ({ ok: false, code: 'no-project' }));
  on(IPC_SEND.serverIntent, () => { reached += 1; });
  expect(await invokes.get(IPC_INVOKE.codeRead)!(from(bare), { path: 'a.txt' })).toEqual({ ok: false, code: 'no-project' });
  sends.get(IPC_SEND.serverIntent)!(from(bare), { press: 'start' });
  expect(reached).toBe(0);
});

test('a Tab that names another Project or its Canvas document is refused', async () => {
  let reached = 0;
  handle(IPC_INVOKE.draftState, () => { reached += 1; return { text: 'held', images: [] }; }, () => ({ text: '', images: [] }));
  handle(IPC_INVOKE.canvasPageCameras, () => { reached += 1; return { byPage: { page: { x: 1, y: 1, zoom: 1 } } }; }, () => ({ byPage: {} }));
  on(IPC_SEND.canvasUndo, () => { reached += 1; });
  on(IPC_SEND.draftSave, () => { reached += 1; });
  const ownDoc = canvasDocIdFor(own);
  const foreignDoc = canvasDocIdFor(foreign);

  expect(await invokes.get(IPC_INVOKE.draftState)!(from(owner), { cwd: foreign })).toEqual({ text: '', images: [] });
  expect(await invokes.get(IPC_INVOKE.canvasPageCameras)!(from(owner), { docId: foreignDoc })).toEqual({ byPage: {} });
  sends.get(IPC_SEND.canvasUndo)!(from(owner), { docId: foreignDoc });
  sends.get(IPC_SEND.draftSave)!(from(owner), { cwd: foreign, draft: { text: 'x', images: [] } });
  for (const malformed of [undefined, null, 'x', {}, { cwd: 7 }, { cwd: `${own}\0` }]) {
    expect(await invokes.get(IPC_INVOKE.draftState)!(from(owner), malformed)).toEqual({ text: '', images: [] });
  }
  expect(reached).toBe(0);

  expect(await invokes.get(IPC_INVOKE.draftState)!(from(owner), { cwd: own })).toEqual({ text: 'held', images: [] });
  expect(await invokes.get(IPC_INVOKE.canvasPageCameras)!(from(owner), { docId: ownDoc })).toEqual({ byPage: { page: { x: 1, y: 1, zoom: 1 } } });
  sends.get(IPC_SEND.canvasUndo)!(from(owner), { docId: ownDoc });
  sends.get(IPC_SEND.draftSave)!(from(owner), { cwd: own, draft: { text: 'x', images: [] } });
  expect(reached).toBe(4);
});

test('the chrome view and a guest are refused on every Project channel before the Project is looked at', async () => {
  const scoped = (rows: Record<string, InvokeRow | SendRow>) => Object.values(rows).filter((row) => row.scope !== undefined).map((row) => row.name);
  const invokeNames = scoped(CHANNELS.invoke);
  const sendNames = scoped(CHANNELS.send);
  expect(invokeNames.length + sendNames.length).toBe(38);
  let reached = 0;
  for (const channel of invokeNames) {
    (handle as unknown as (channel: string, handler: () => void, declined: () => void) => void)(channel, () => { reached += 1; }, () => { reached += 1; });
    const invoke = invokes.get(channel)!;
    await expect(invoke(from(chrome))).rejects.toThrow('Onlook IPC is not available to this view');
    await expect(invoke(from(guest))).rejects.toThrow('Onlook requires a Studio Tab');
    await expect(invoke(from(owner, {} as Electron.WebFrameMain))).rejects.toThrow('Onlook requires a Studio Tab');
  }
  for (const channel of sendNames) {
    (on as unknown as (channel: string, listener: () => void) => void)(channel, () => { reached += 1; });
    const send = sends.get(channel)!;
    send(from(chrome)); send(from(guest)); send(from(owner, {} as Electron.WebFrameMain));
  }
  expect(reached).toBe(0);
});

test('a channel that answers with or without a Project hands its handler the sender\'s own, or none', async () => {
  const roots: (string | undefined)[] = [];
  handle(IPC_INVOKE.agentProbe, (project) => { roots.push(project?.root); return { state: 'connected' } as never; });
  await invokes.get(IPC_INVOKE.agentProbe)!(from(bare));
  await invokes.get(IPC_INVOKE.agentProbe)!(from(owner));
  expect(roots).toEqual([undefined, own]);
  await expect(invokes.get(IPC_INVOKE.agentProbe)!(from(chrome))).rejects.toThrow('Onlook IPC is not available to this view');
  expect(roots).toHaveLength(2);
});

test('a Project channel cannot be registered with a handler that takes no Project', () => {
  const misuse = (): void => {
    // @ts-expect-error the decline a view without a Project is answered is missing
    handle(IPC_INVOKE.codeRead, () => ({ ok: false, code: 'no-project' }));
    // @ts-expect-error the first argument is the Project, not the event
    handle(IPC_INVOKE.codeRead, (event: Electron.IpcMainInvokeEvent) => ({ ok: false, code: event.sender.id === 0 ? 'no-project' : 'not-found' }), () => ({ ok: false, code: 'no-project' }));
    // @ts-expect-error the first argument is the Project, not the event
    on(IPC_SEND.canvasUndo, (event: Electron.IpcMainEvent) => { void event.sender; });
  };
  expect(misuse).toBeFunction();
});
