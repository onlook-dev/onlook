import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, jest } from 'bun:test';
import type { WebContentsView } from 'electron';
import { IPC_SEND } from '@studio/events';
import { TabBook } from './book.js';
import { SPARE_IDLE_MS } from './spare.js';
import type { Tab } from './tab.js';
import { fromMainFrame, fromSubframe } from './test-support.js';
import { TabViewPool, type ViewPoolPort } from './view-pool.js';
import type { TabWindow } from './window.js';

function fakeView(id: number, log: string[] = []) {
  let destroyed = false;
  const contents = Object.assign(new EventEmitter(), {
    id,
    ipc: new EventEmitter(),
    isDestroyed: () => destroyed,
    close: () => { destroyed = true; log.push(`close:${String(id)}`); },
    loadFile: async () => undefined,
    loadURL: async () => undefined,
  });
  const bounds: unknown[] = [];
  const view = { webContents: contents, setBounds: (rect: unknown) => { bounds.push(rect); }, setVisible: () => undefined };
  return { view: view as unknown as WebContentsView, contents, bounds };
}

function rig() {
  const log: string[] = [];
  let shownId: string | undefined;
  let wakingId: string | undefined;
  const book = new TabBook(undefined);
  const window = {
    window: { isDestroyed: () => false },
    body: { x: 0, y: 40, width: 800, height: 560 },
    quitting: false,
    chromeContents: { id: 1, isDestroyed: () => false },
    attach: () => { log.push('attach'); },
    detach: () => { log.push('detach'); },
  };
  const port: ViewPoolPort = {
    shownId: () => shownId,
    wakingId: () => wakingId,
    viewReleased: (viewId) => { log.push(`released:${String(viewId)}`); },
    healthReported: (tab) => { log.push(`health-reported:${tab.id}`); },
    viewDiscarded: (tab) => { log.push(`discarded:${tab.id}:view=${String(tab.view !== undefined)}:health=${String(tab.health)}`); },
    retire: (worktree) => { log.push(`retire:${worktree}`); },
    tabsChanged: () => { log.push('tabs-changed'); },
  };
  const pool = new TabViewPool(book, window as unknown as TabWindow, port);
  const enter = (id: string, viewId: number | undefined, workspacePath?: string): { tab: Tab; contents?: ReturnType<typeof fakeView>['contents'] } => {
    const tab: Tab = { id, isWorking: false, ...(workspacePath === undefined ? {} : { workspacePath }) };
    book.enter(tab);
    if (viewId === undefined) return { tab };
    const made = fakeView(viewId, log);
    pool.adopt(tab, made.view);
    return { tab, contents: made.contents };
  };
  return { book, pool, log, enter, show: (id: string | undefined) => { shownId = id; }, wake: (id: string | undefined) => { wakingId = id; } };
}

afterEach(() => { jest.useRealTimers(); });

describe('the view pool discarding a Tab\'s view', () => {
  it('goes cold in one order: the view and its health off the record, the presentation told, the view released and closed, the worktree retired, the strip told', () => {
    const { pool, log, enter } = rig();
    const { tab } = enter('a', 7, '/p/a');
    pool.setHealth(tab, 'failed');
    pool.teardown('a');
    expect(tab.view).toBeUndefined();
    expect(tab.health).toBeUndefined();
    expect(log).toEqual(['discarded:a:view=false:health=undefined', 'released:7', 'detach', 'close:7', 'retire:/p/a', 'tabs-changed']);
  });

  it('never discards the selected Tab, the one on screen, a busy one or a cold one', () => {
    const { book, pool, log, enter, show } = rig();
    const { tab } = enter('a', 7, '/p/a');
    enter('cold', undefined, '/p/cold');
    book.select('a');
    pool.teardown('a');
    book.select(undefined);
    show('a');
    pool.teardown('a');
    show(undefined);
    book.setWorking(tab, true);
    pool.teardown('a');
    pool.teardown('cold');
    pool.teardown('gone');
    expect(log).toEqual([]);
    expect(tab.view).toBeDefined();
  });

  it('leaves the worktree running while another Tab, warm or cold, still holds it (ONL-2315)', () => {
    const { pool, log, enter } = rig();
    enter('a', 7, '/p/shared');
    enter('b', 8, '/p/shared');
    pool.teardown('a');
    pool.teardown('b');
    expect(log.filter((line) => line.startsWith('retire'))).toEqual([]);
    expect(log.filter((line) => line.startsWith('close'))).toEqual(['close:7', 'close:8']);
  });

  it('destroying a view releases what was reserved for it before the view leaves the window', () => {
    const { pool, log } = rig();
    const made = fakeView(9, log);
    pool.destroyView(made.view);
    expect(log).toEqual(['released:9', 'detach', 'close:9']);
  });
});

describe('the view pool watching a view\'s health', () => {
  it('a failed load releases the view\'s reservation, tells the presentation, then the strip', () => {
    const { log, enter } = rig();
    const { tab, contents } = enter('a', 7);
    contents!.emit('did-fail-load', {}, -105, 'NAME_NOT_RESOLVED', 'file:///x', true);
    expect(tab.health).toBe('failed');
    expect(log).toEqual(['released:7', 'health-reported:a', 'tabs-changed']);
  });

  it('a finished load clears the health and tells the strip, and nothing else', () => {
    const { pool, log, enter } = rig();
    const { tab, contents } = enter('a', 7);
    pool.setHealth(tab, 'failed');
    contents!.emit('did-finish-load');
    expect(tab.health).toBeUndefined();
    expect(log).toEqual(['tabs-changed']);
    contents!.emit('did-finish-load');
    expect(log).toEqual(['tabs-changed']);
  });

  it('a main-frame navigation releases the view\'s reservation; a subframe\'s does not', () => {
    const { log, enter } = rig();
    const { contents } = enter('a', 7);
    contents!.emit('did-start-navigation', {}, 'file:///x', false, false);
    expect(log).toEqual([]);
    contents!.emit('did-start-navigation', {}, 'file:///x', false, true);
    expect(log).toEqual(['released:7']);
  });

  it('stops listening to a view the Tab no longer holds', () => {
    const { pool, log, enter } = rig();
    const { tab, contents } = enter('a', 7);
    pool.release(tab);
    contents!.emit('did-fail-load', {}, -105, 'NAME_NOT_RESOLVED', 'file:///x', true);
    expect(tab.health).toBeUndefined();
    expect(log).toEqual([]);
  });
});

describe('the view pool putting a Tab to sleep', () => {
  it('refuses the selected Tab, the one on screen and the one a press is waking', () => {
    const { book, pool, enter, show, wake } = rig();
    const { tab } = enter('a', 7, '/p/a');
    book.select('a');
    expect(pool.cool('a')).toBeUndefined();
    book.select(undefined);
    show('a');
    expect(pool.cool('a')).toBeUndefined();
    show(undefined);
    wake('a');
    expect(pool.cool('a')).toBeUndefined();
    expect(tab.idle).toBeUndefined();
  });
});

describe('the spare view', () => {
  function withSpare() {
    jest.useFakeTimers();
    const subject = rig();
    const made = fakeView(21, subject.log);
    Object.assign(subject.pool, { newView: () => made.view });
    Object.assign(subject.book, { isUsable: () => true });
    subject.pool.arm();
    jest.advanceTimersByTime(SPARE_IDLE_MS);
    return { ...subject, made };
  }

  it('is minted once armed, joins every broadcast, and is sized with the Tabs', () => {
    const { pool, enter, made } = withSpare();
    enter('a', 7);
    expect(pool.everyRenderer().map((contents) => contents.id)).toEqual([1, 7, 21]);
    expect(pool.viewRoles().map((entry) => entry.role)).toEqual(['band', 'tab', 'spare']);
    const body = { x: 0, y: 40, width: 1000, height: 700 };
    pool.resize(body);
    expect(made.bounds.at(-1)).toEqual(body);
  });

  it('counts as painted once its own main frame reports ready, never on a subframe\'s word', () => {
    const { pool, made } = withSpare();
    made.contents.ipc.emit(IPC_SEND.uiReady, fromSubframe(made.contents));
    made.contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(made.contents));
    const spare = pool.takeSpare();
    expect(spare?.hasPainted).toBe(true);
    expect(pool.takeSpare()).toBeUndefined();
  });

  it('is not painted on a subframe\'s report alone', () => {
    const { pool, made } = withSpare();
    made.contents.ipc.emit(IPC_SEND.uiReady, fromSubframe(made.contents));
    expect(pool.takeSpare()?.hasPainted).toBeUndefined();
  });

  it('is destroyed, not kept, when the pool is disposed for quit (ONL-2254)', () => {
    const { pool, log } = withSpare();
    pool.dispose();
    expect(log).toEqual(['released:21', 'detach', 'close:21']);
    expect(pool.takeSpare()).toBeUndefined();
  });
});
