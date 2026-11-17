import { EventEmitter } from 'node:events';
import { expect, test } from 'bun:test';
import { IPC_SEND } from '@studio/events';
import { appViewPreferences } from '../window/preferences.js';
import { onView, onceView } from './bridge.js';
import { registerStudioChromeSender, registerTaskManagerSender } from './roles.js';

function view() {
  const contents = Object.assign(new EventEmitter(), { id: 1, mainFrame: {}, ipc: new EventEmitter(), isDestroyed: () => false });
  const fromMain = () => ({ sender: contents, senderFrame: contents.mainFrame });
  const fromSubframe = () => ({ sender: contents, senderFrame: { parent: contents.mainFrame, isDestroyed: () => false } });
  return { contents, door: contents as unknown as Electron.WebContents, fromMain, fromSubframe };
}

const VIEW_CHANNELS = [IPC_SEND.uiReady, IPC_SEND.tabPresented, IPC_SEND.tabFramesApplied, IPC_SEND.canvasCaptureViewed] as const;

test('a view listener hears its own main frame on every channel a view listens on', () => {
  for (const channel of VIEW_CHANNELS) {
    const { contents, door, fromMain } = view();
    const heard: unknown[] = [];
    onView(door, channel, (_event, payload) => { heard.push(payload); });
    contents.ipc.emit(channel, fromMain(), 7);
    expect(heard).toEqual([7]);
  }
});

test('a send whose frame can no longer be resolved is heard, as the view\'s own listener heard it before the guard', () => {
  const gone = [
    null,
    undefined,
    { parent: null, isDestroyed: () => true },
    { isDestroyed: () => false, get parent(): unknown { throw new Error('Render frame was disposed'); } },
    // The previous document's top-level frame, still resolvable while its replacement commits.
    { parent: null, isDestroyed: () => false },
  ];
  for (const channel of VIEW_CHANNELS) {
    const { contents, door } = view();
    let reached = 0;
    onView(door, channel, () => { reached += 1; });
    for (const senderFrame of gone) contents.ipc.emit(channel, { sender: contents, senderFrame });
    expect(reached).toBe(gone.length);
  }
});

test('a view listener drops a send from a subframe of its view, and one with no event, without throwing', () => {
  for (const channel of VIEW_CHANNELS) {
    const { contents, door, fromSubframe } = view();
    let reached = 0;
    onView(door, channel, () => { reached += 1; });
    expect(() => contents.ipc.emit(channel, fromSubframe())).not.toThrow();
    expect(() => contents.ipc.emit(channel)).not.toThrow();
    expect(reached).toBe(0);
  }
});

test('a subframe could not send before the guard either: a Tab view runs its preload in the main frame alone', () => {
  const preferences = appViewPreferences('preload.cjs', { webviewTag: true });
  expect(preferences).toMatchObject({ sandbox: true, contextIsolation: true, nodeIntegration: false });
  expect(preferences.nodeIntegrationInSubFrames).toBeUndefined();
});

test('a view listener keeps the row\'s role: the band is refused a channel only a Tab sends', () => {
  const { contents, door, fromMain } = view();
  registerStudioChromeSender(contents);
  let reached = 0;
  onView(door, IPC_SEND.tabPresented, () => { reached += 1; });
  onView(door, IPC_SEND.uiReady, () => { reached += 10; });
  contents.ipc.emit(IPC_SEND.tabPresented, fromMain());
  contents.ipc.emit(IPC_SEND.uiReady, fromMain());
  expect(reached).toBe(10);
});

test('the Task Manager window is no Tab: a view listener refuses its role too', () => {
  const { contents, door, fromMain } = view();
  registerTaskManagerSender(contents);
  let reached = 0;
  for (const channel of VIEW_CHANNELS) onView(door, channel, () => { reached += 1; });
  for (const channel of VIEW_CHANNELS) contents.ipc.emit(channel, fromMain());
  expect(reached).toBe(0);
});

test('the returned call stops hearing, and removes nothing else', () => {
  const { contents, door, fromMain } = view();
  let reached = 0;
  const unhear = onView(door, IPC_SEND.uiReady, () => { reached += 1; });
  onView(door, IPC_SEND.uiReady, () => { reached += 10; });
  unhear();
  contents.ipc.emit(IPC_SEND.uiReady, fromMain());
  expect(reached).toBe(10);
  expect(contents.ipc.listenerCount(IPC_SEND.uiReady)).toBe(1);
});

test('a once listener hears one send from the main frame, and a refused send does not use it up', () => {
  const { contents, door, fromMain, fromSubframe } = view();
  let reached = 0;
  onceView(door, IPC_SEND.uiReady, () => { reached += 1; });
  contents.ipc.emit(IPC_SEND.uiReady, fromSubframe());
  expect(contents.ipc.listenerCount(IPC_SEND.uiReady)).toBe(1);
  contents.ipc.emit(IPC_SEND.uiReady, fromMain());
  contents.ipc.emit(IPC_SEND.uiReady, fromMain());
  expect(reached).toBe(1);
  expect(contents.ipc.listenerCount(IPC_SEND.uiReady)).toBe(0);
});

test('a once listener is gone before it runs, as `once` leaves it', () => {
  const { contents, door, fromMain } = view();
  let listening = -1;
  onceView(door, IPC_SEND.uiReady, () => { listening = contents.ipc.listenerCount(IPC_SEND.uiReady); });
  contents.ipc.emit(IPC_SEND.uiReady, fromMain());
  expect(listening).toBe(0);
});
