import { describe, expect, it } from 'bun:test';
import type { WebContentsView } from 'electron';
import { IPC_EMIT } from '@studio/events';
import { TabBook } from './book.js';
import { TabCloser, type TabCloserPort } from './closer.js';
import type { TabPresentation } from './presentation.js';
import type { Tab } from './tab.js';
import type { TabViewPool } from './view-pool.js';

function rig(options: { confirm?: boolean } = {}) {
  const log: string[] = [];
  let shownId: string | undefined;
  const book = new TabBook(undefined);
  book.finishBoot();
  Object.assign(book, { persist: () => { log.push('persist'); } });
  const views = {
    forgetCooling: (id: string) => { log.push(`forget-cooling:${id}`); },
    destroyView: (view: WebContentsView) => { log.push(`destroy:${String(view.webContents.id)}`); },
  } as unknown as TabViewPool;
  const presentation = {
    get shownId() { return shownId; },
    forgetShown: (id: string) => { log.push(`forget-shown:${id}`); },
    forgetPresentDeadline: (id: string) => { log.push(`forget-deadline:${id}`); },
    forgetSlots: (id: string) => { log.push(`forget-slots:${id}`); },
    endWatch: (tab: Tab) => { log.push(`end-watch:${tab.id}`); },
    present: () => { log.push('present'); },
    assign: (tab: Tab) => { log.push(`assign:${tab.id}`); },
  } as unknown as TabPresentation;
  const port: TabCloserPort = {
    activate: (id, method) => { log.push(`activate:${id}:${method}`); book.select(id); },
    isAtProjectLimit: () => false,
    confirmClose: async (name, losses) => { log.push(`confirm:${name}:${losses.join('+')}`); return options.confirm ?? true; },
    retire: (worktree) => { log.push(`retire:${worktree}`); },
    tabsChanged: () => { log.push('tabs-changed'); },
  };
  const closer = new TabCloser(book, views, presentation, port);
  const enter = (id: string, viewId: number | undefined, workspacePath?: string): Tab => {
    const sent = (channel: string, payload: unknown): void => { log.push(`send:${channel}:${JSON.stringify(payload)}`); };
    const view = viewId === undefined ? undefined : ({ webContents: { id: viewId, isDestroyed: () => false, send: sent } } as unknown as WebContentsView);
    const tab: Tab = { id, isWorking: false, ...(view === undefined ? {} : { view }), ...(workspacePath === undefined ? {} : { workspacePath }) };
    book.enter(tab);
    return tab;
  };
  return { book, closer, log, enter, show: (id: string | undefined) => { shownId = id; } };
}

describe('closing a Tab', () => {
  it('a background Tab: forgets what was kept for it, destroys its view, stops its session, tells the strip, persists', () => {
    const { book, closer, log, enter, show } = rig();
    enter('home', 1);
    enter('a', 2, '/p/a');
    book.select('home');
    show('home');
    closer.close('a');
    expect(book.tabIds).toEqual(['home']);
    expect(log).toEqual(['forget-shown:a', 'forget-deadline:a', 'forget-slots:a', 'end-watch:a', 'forget-cooling:a', 'destroy:2', 'retire:/p/a', 'tabs-changed', 'persist']);
  });

  it('a Tab still cold has no view to destroy: the record and the chip go, and its session stops', () => {
    const { book, closer, log, enter, show } = rig();
    enter('home', 1);
    enter('cold', undefined, '/p/cold');
    book.select('home');
    show('home');
    closer.close('cold');
    expect(book.hasTab('cold')).toBe(false);
    expect(book.tabIds).toEqual(['home']);
    expect(log).toEqual(['forget-shown:cold', 'forget-deadline:cold', 'forget-slots:cold', 'end-watch:cold', 'forget-cooling:cold', 'retire:/p/cold', 'tabs-changed', 'persist']);
  });

  it('the selected Tab: the last Tab in the order is selected in its place, and the press does the telling', () => {
    const { book, closer, log, enter } = rig();
    enter('home', 1);
    enter('a', 2, '/p/a');
    enter('b', 3, '/p/b');
    book.select('a');
    closer.close('a', 'hotkey');
    expect(log.slice(-3)).toEqual(['retire:/p/a', 'activate:b:tab_closed', 'persist']);
    expect(log).not.toContain('tabs-changed');
    expect(book.selectedId).toBe('b');
  });

  it('the Tab on screen, with another selected behind it, brings the selected one on screen (ONL-3121)', () => {
    const { book, closer, log, enter, show } = rig();
    enter('home', 1);
    enter('a', 2, '/p/a');
    book.select('home');
    show('a');
    closer.close('a');
    expect(log.slice(-3)).toEqual(['present', 'tabs-changed', 'persist']);
  });

  it('keeps the session of a worktree another Tab still holds (ONL-2315)', () => {
    const { book, closer, log, enter } = rig();
    enter('home', 1);
    enter('a', 2, '/p/shared');
    enter('b', 3, '/p/shared');
    book.select('home');
    closer.close('a');
    expect(log.filter((line) => line.startsWith('retire'))).toEqual([]);
  });

  it('the only Tab leaves its Project and stays: the view is kept, told to go home, and assigned again', () => {
    const { book, closer, log, enter } = rig();
    const tab = enter('a', 2, '/p/a');
    book.select('a');
    closer.close('a');
    expect(book.tabIds).toEqual(['a']);
    expect('workspacePath' in tab).toBe(false);
    expect(log).toEqual([
      'retire:/p/a', 'tabs-changed', 'persist',
      `send:${IPC_EMIT.chromeActionForwarded}:${JSON.stringify({ tabId: 'a', slot: 'folder', closing: true })}`,
      'assign:a',
    ]);
  });

  it('a Tab already gone is nothing to close', () => {
    const { closer, log } = rig();
    closer.close('gone');
    expect(log).toEqual([]);
  });
});

describe('asking before a close', () => {
  it('closes at once when nothing would be lost', async () => {
    const { book, closer, log, enter } = rig();
    enter('home', 1);
    enter('a', 2, '/p/a');
    book.select('home');
    expect(await closer.requestClose('a')).toBe(true);
    expect(log.some((line) => line.startsWith('confirm'))).toBe(false);
    expect(book.hasTab('a')).toBe(false);
  });

  it('asks while the Tab is working, and `Wait` keeps the Tab and its view', async () => {
    const { book, closer, log, enter } = rig({ confirm: false });
    enter('home', 1);
    const tab = enter('a', 2, '/p/a');
    book.setWorking(tab, true);
    book.select('home');
    expect(await closer.requestClose('a')).toBe(false);
    expect(log.filter((line) => line.startsWith('confirm'))).toHaveLength(1);
    expect(book.hasTab('a')).toBe(true);
    expect(log.some((line) => line.startsWith('destroy'))).toBe(false);
  });

  it('closes on `Close`, and a Tab that went while the question was up is nothing to close (ONL-2315)', async () => {
    const { book, closer, log, enter } = rig({ confirm: true });
    enter('home', 1);
    const tab = enter('a', 2, '/p/a');
    book.setWorking(tab, true);
    book.select('home');
    const asked = closer.requestClose('a');
    book.remove('a');
    expect(await asked).toBe(true);
    expect(log.some((line) => line.startsWith('destroy'))).toBe(false);
  });

  it('closes every Tab on a worktree, and stops at the first `Wait`', async () => {
    const { book, closer, enter } = rig();
    enter('home', 1);
    enter('a', 2, '/p/shared');
    enter('b', 3, '/p/shared');
    book.select('home');
    expect(await closer.closeForWorkspace('/p/shared')).toBe(true);
    expect(book.tabIds).toEqual(['home']);
  });
});
