import { describe, expect, it, mock } from 'bun:test';
import type { WebContents, WebContentsView } from 'electron';
import { IPC_EMIT } from '@studio/events';

const shown: [string, string][] = [];
mock.module('../telemetry/turn-seen.js', () => ({
  noteProjectShown: (path: string, by: string) => shown.push([path, by]),
  setTurnSeenLocator: () => {},
  noteTurnEnded: () => {},
  beginTurnSeenQuit: () => {},
}));
const { TabBook } = await import('./book.js');
const { TabPresence } = await import('./presence.js');

function rig(isFocused: boolean) {
  shown.length = 0;
  const sent: [number, string, unknown][] = [];
  const contents = (id: number) => ({ id, isDestroyed: () => false, send: (channel: string, payload: unknown) => { sent.push([id, channel, payload]); } });
  const view = (id: number) => ({ webContents: contents(id) }) as unknown as WebContentsView;
  const book = new TabBook(undefined);
  book.enter({ id: 'home', isWorking: false, view: view(1) });
  book.enter({ id: 'a', isWorking: false, workspacePath: '/p/a', view: view(2) });
  book.enter({ id: 'cold', isWorking: false, workspacePath: '/p/cold' });
  book.select('a');
  const presence = new TabPresence(book, { window: { isFocused: () => isFocused } } as never);
  return { book, presence, sent };
}

describe('presence', () => {
  it('a Tab is on screen when it is the selected one and the window has focus', () => {
    const { book, presence } = rig(true);
    expect(presence.onScreenFrom(book.contentsFor('a') as WebContents)).toEqual({ isOnScreen: true });
    expect(presence.onScreenFrom(book.contentsFor('home') as WebContents)).toEqual({ isOnScreen: false });
    expect(rig(false).presence.onScreenFrom(book.contentsFor('a') as WebContents)).toEqual({ isOnScreen: false });
  });

  it('tells every Tab that has a renderer, and no cold one', () => {
    const { presence, sent } = rig(true);
    presence.pushOnScreen();
    expect(sent).toEqual([
      [1, IPC_EMIT.tabOnScreen, { isOnScreen: false }],
      [2, IPC_EMIT.tabOnScreen, { isOnScreen: true }],
    ]);
  });

  it('counts the selected Project as shown only in a focused window', () => {
    rig(true).presence.noteActiveProjectShown('window_focus');
    expect(shown).toEqual([['/p/a', 'window_focus']]);
    rig(false).presence.noteActiveProjectShown('window_focus');
    expect(shown).toEqual([]);
  });

  it('shows nothing while the Projects Screen is selected', () => {
    const { book, presence } = rig(true);
    book.select('home');
    presence.noteActiveProjectShown('click');
    expect(shown).toEqual([]);
  });

  it('answers whether a Project is the one a person is looking at', () => {
    const { presence } = rig(true);
    expect(presence.presenceFor('/p/a')).toEqual({ windowFocused: true, projectTabActive: true });
    expect(presence.presenceFor('/p/cold')).toEqual({ windowFocused: true, projectTabActive: false });
    expect(rig(false).presence.presenceFor('/p/a')).toEqual({ windowFocused: false, projectTabActive: true });
  });
});
