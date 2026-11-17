import { describe, expect, it } from 'bun:test';
import type { WebContentsView } from 'electron';
import { composeTabs } from './compose.js';
import type { Tab } from './tab.js';
import { seatShownTab } from './test-support.js';
import { TabWindow, type TabWindowEvents } from './window.js';

/** The pieces as composed, with each piece's method the test watches replaced by a line in one log. */
function composed() {
  const log: string[] = [];
  let events!: TabWindowEvents;
  const pieces = composeTabs({
    window: (given) => {
      events = given;
      return Object.assign(Object.create(TabWindow.prototype) as TabWindow, { events: given, window: { isDestroyed: () => false }, detach: () => undefined });
    },
    saved: undefined,
    confirmClose: async () => true,
    retire: (worktree) => { log.push(`retire:${worktree}`); },
  });
  const watch = (piece: object, name: string, returns?: unknown): void => {
    Object.assign(piece, { [name]: (...args: unknown[]) => { log.push(`${name}(${args.map((arg) => (typeof arg === 'object' && arg !== null ? (arg as { id?: unknown }).id ?? 'object' : String(arg))).join(',')})`); return returns; } });
  };
  return { pieces, events: () => events, log, watch };
}

describe('the composition', () => {
  it('a blur puts the chord legends away before any Tab is told it left the screen; a focus also counts the Project shown', () => {
    const { pieces, events, log, watch } = composed();
    watch(pieces.chordHint, 'push');
    watch(pieces.presence, 'pushOnScreen');
    watch(pieces.presence, 'noteActiveProjectShown');
    events().focusTold(false);
    events().focusChanged(false);
    expect(log).toEqual(['push(false)', 'pushOnScreen()']);
    log.length = 0;
    events().focusTold(true);
    events().focusChanged(true);
    expect(log).toEqual(['pushOnScreen()', 'noteActiveProjectShown(window_focus)']);
  });

  it('a closed window ends the present deadline, then drops the cover', () => {
    const { pieces, events, log, watch } = composed();
    watch(pieces.presentation, 'clearPresentDeadline');
    watch(pieces.presentation, 'dropCover');
    events().closed();
    expect(log).toEqual(['clearPresentDeadline()', 'dropCover()']);
  });

  it('a layout sizes the pool\'s views', () => {
    const { pieces, events, log, watch } = composed();
    watch(pieces.views, 'resize');
    events().laidOut({ x: 0, y: 40, width: 10, height: 10 });
    expect(log).toEqual(['resize(object)']);
  });

  it('every piece that changes what the strip shows reaches the one broadcast', () => {
    const { pieces, log, watch } = composed();
    watch(pieces.strip, 'broadcast');
    pieces.opens.setDraftCreating(true);
    pieces.closer.reopenClosed();
    pieces.strip.noteContext(404, undefined);
    expect(log).toEqual(['broadcast()', 'broadcast()']);
  });

  it('the pool asks the presentation what is on screen and the press what is waking, and tells the right piece what happened to a view', () => {
    const { pieces, log, watch } = composed();
    watch(pieces.opens, 'releaseProjectOpen');
    watch(pieces.presentation, 'viewDiscarded');
    watch(pieces.strip, 'broadcast');
    const closed: number[] = [];
    const view = { webContents: { id: 7, isDestroyed: () => false, close: () => { closed.push(7); }, on: () => undefined } } as unknown as WebContentsView;
    const tab: Tab = { id: 'a', workspacePath: '/p/a', isWorking: false };
    pieces.book.enter(tab);
    pieces.views.adopt(tab, view);
    seatShownTab(pieces.presentation, 'a');
    pieces.views.teardown('a');
    expect(log).toEqual([]);
    seatShownTab(pieces.presentation, undefined);
    pieces.views.teardown('a');
    expect(log).toEqual(['viewDiscarded(a)', 'releaseProjectOpen(7)', 'retire:/p/a', 'broadcast()']);
    expect(closed).toEqual([7]);
  });

  it('a Project landing on a Tab reaches the press and the closer, and the closer asks Project opens for the limit', () => {
    const { pieces, log, watch } = composed();
    watch(pieces.activation, 'activate');
    watch(pieces.closer, 'close');
    watch(pieces.strip, 'broadcast');
    const view = (id: number): WebContentsView => ({ webContents: { id } }) as unknown as WebContentsView;
    pieces.book.enter({ id: 'a', workspacePath: '/p/a', isWorking: false, view: view(1) });
    pieces.book.enter({ id: 'fresh', isWorking: false, view: view(2) });
    pieces.opens.noteWorkspace(2, '/p/a');
    expect(log).toEqual(['activate(a,click,undefined)', 'close(fresh,switch)']);
    log.length = 0;
    watch(pieces.opens, 'isAtProjectLimit', true);
    pieces.closer.reopenClosed();
    expect(log).toEqual(['isAtProjectLimit()', 'broadcast()']);
  });

  it('a press takes an untaken Settings request with it', () => {
    const { pieces, log, watch } = composed();
    watch(pieces.settingsRequest, 'follow');
    watch(pieces.strip, 'broadcast');
    Object.assign(pieces.window, { expand: () => ({ height: 0 }) });
    Object.assign(pieces.book, { persist: () => undefined });
    Object.assign(pieces.presence, { pushOnScreen: () => undefined, noteActiveProjectShown: () => undefined });
    Object.assign(pieces.presentation, { warm: (tab: Tab) => tab, present: () => undefined, pressed: () => undefined });
    const view = (id: number): WebContentsView => ({ webContents: { id, isDestroyed: () => false } }) as unknown as WebContentsView;
    pieces.book.enter({ id: 'home', isWorking: false, view: view(1) });
    pieces.book.enter({ id: 'a', workspacePath: '/p/a', isWorking: false, view: view(2) });
    pieces.book.select('home');
    pieces.activation.activate('a');
    expect(log).toEqual(['follow(home)', 'broadcast()']);
  });
});
