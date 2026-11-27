import { describe, expect, it } from 'bun:test';
import type { WebContentsView } from 'electron';
import { TabActivation } from './activation.js';
import { TabBook } from './book.js';
import type { TabPresence } from './presence.js';
import type { TabPresentation } from './presentation.js';
import type { Owned, Tab } from './tab.js';
import type { TabViewPool } from './view-pool.js';
import type { TabWindow } from './window.js';

function rig() {
  const log: string[] = [];
  const requested: string[] = [];
  const book = new TabBook(undefined);
  book.finishBoot();
  Object.assign(book, { persist: () => { log.push('persist'); } });
  let resumed: { resolve: () => void; reject: (error: unknown) => void } | undefined;
  const views = {
    noteActivity: (id: string) => { log.push(`activity:${id}`); },
    resume: (tab: Tab) => {
      log.push(`resume:${tab.id}`);
      return new Promise<void>((resolve, reject) => {
        resumed = { resolve: () => { delete (tab as Owned<'idle'>).idle; resolve(); }, reject };
      });
    },
    teardown: (id: string) => { log.push(`teardown:${id}`); const tab = book.tabById(id); if (tab) { delete (tab as Owned<'idle'>).idle; delete (tab as Owned<'view'>).view; } },
  } as unknown as TabViewPool;
  const presentation = {
    pressed: (tab: Tab) => { log.push(`pressed:${tab.id}`); },
    present: () => { log.push(`present:selected=${String(book.selectedId)}`); },
    dropCover: () => { log.push('drop-cover'); },
    warm: (tab: Tab) => { log.push(`warm:${tab.id}`); return tab; },
    showLoading: (tab: Tab) => { log.push(`show-loading:${tab.id}`); },
    forgetWarm: (tab: Tab) => { log.push(`forget-warm:${tab.id}`); },
    assign: (tab: Tab) => { log.push(`assign:${tab.id}`); },
    promoteRestored: () => false,
    requestFirstPaint: (tab: Tab) => { requested.push(tab.id); },
  } as unknown as TabPresentation;
  const presence = {
    pushOnScreen: () => { log.push('on-screen'); },
    noteActiveProjectShown: (by: string) => { log.push(`shown:${by}`); },
  } as unknown as TabPresence;
  const window = { expand: (extent: { kind: string }) => { log.push(`expand:${extent.kind}`); return { height: 0 }; } } as unknown as TabWindow;
  const activation = new TabActivation(book, window, views, presentation, presence, {
    followSettingsRequest: (leavingId) => { log.push(`follow-settings:${String(leavingId)}`); },
    tabsChanged: () => { log.push('tabs-changed'); },
  });
  const view = (id: number): WebContentsView => ({ webContents: { id, isDestroyed: () => false } }) as unknown as WebContentsView;
  const enter = (tab: Tab): Tab => { book.enter(tab); return tab; };
  return { book, activation, log, requested, enter, view, resumed: () => resumed! };
}

describe('a press on a Tab', () => {
  it('runs in one order: cover dropped, warmed, selected, presented, the warm ended, Settings followed, the band rested, then everyone told', () => {
    const { book, activation, log, enter, view } = rig();
    enter({ id: 'home', isWorking: false, view: view(1) });
    enter({ id: 'a', workspacePath: '/p/a', isWorking: false, view: view(2) });
    book.select('home');
    activation.activate('a', 'click');
    expect(book.selectedId).toBe('a');
    expect(log).toEqual([
      'pressed:a', 'drop-cover', 'warm:a', 'present:selected=a', 'forget-warm:a', 'follow-settings:home',
      'expand:band', 'activity:a', 'tabs-changed', 'persist', 'on-screen', 'shown:click',
    ]);
  });

  it('tells a Tab that was cold which Project it holds, after Settings has followed', () => {
    const { book, activation, log, enter, view } = rig();
    enter({ id: 'home', isWorking: false, view: view(1) });
    enter({ id: 'cold', workspacePath: '/p/cold', isWorking: false });
    book.select('home');
    activation.activate('cold');
    expect(log.slice(5, 8)).toEqual(['follow-settings:home', 'assign:cold', 'expand:band']);
  });

  it('on the Tab already selected asks for its frame again and changes nothing else (ONL-3121)', () => {
    const { book, activation, log, requested, enter, view } = rig();
    enter({ id: 'a', isWorking: false, view: view(2), firstPaint: { kind: 'loading', run: 1, ready: true } });
    book.select('a');
    activation.activate('a');
    expect(log).toEqual(['pressed:a', 'present:selected=a']);
    expect(requested).toEqual(['a']);
  });

  it('shows a held-back Tab\'s loading ground at once when its wait is already past holding it back', () => {
    const { book, activation, log, requested, enter, view } = rig();
    enter({ id: 'home', isWorking: false, view: view(1) });
    enter({ id: 'a', isWorking: false, view: view(2), firstPaint: { kind: 'loading', run: 1, ready: true } });
    book.select('home');
    activation.activate('a');
    expect(log).toContain('show-loading:a');
    expect(log.some((line) => line.startsWith('present'))).toBe(false);
    expect(requested).toEqual(['a']);
  });

  it('acknowledges `done` in the record (ONL-2364)', () => {
    const { activation, enter, view } = rig();
    const tab = enter({ id: 'a', workspacePath: '/p/a', isWorking: false, status: 'done', view: view(2) });
    activation.activate('a');
    expect(tab.status).toBeUndefined();
  });

  it('on a Tab that is gone does nothing', () => {
    const { activation, log } = rig();
    activation.activate('gone');
    expect(log).toEqual([]);
  });
});

describe('a press on a sleeping Tab', () => {
  const idle = () => ({ wake: async () => undefined, sleep: async () => undefined });

  it('wakes it first and is named as waking until it is awake, then goes through as a press', async () => {
    const { book, activation, log, enter, view, resumed } = rig();
    enter({ id: 'home', isWorking: false, view: view(1) });
    enter({ id: 'a', workspacePath: '/p/a', isWorking: false, view: view(2), idle: idle() });
    book.select('home');
    activation.activate('a', 'hotkey_jump');
    expect(activation.wakingTabId).toBe('a');
    expect(log).toEqual(['pressed:a', 'activity:a', 'resume:a']);
    expect(book.selectedId).toBe('home');
    resumed().resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(activation.wakingTabId).toBeUndefined();
    expect(book.selectedId).toBe('a');
    expect(log.at(-1)).toBe('shown:hotkey_jump');
  });

  it('is dropped when another press came while it was waking', async () => {
    const { book, activation, log, enter, view, resumed } = rig();
    enter({ id: 'home', isWorking: false, view: view(1) });
    enter({ id: 'a', workspacePath: '/p/a', isWorking: false, view: view(2), idle: idle() });
    enter({ id: 'b', workspacePath: '/p/b', isWorking: false, view: view(3) });
    book.select('home');
    activation.activate('a');
    const wake = resumed();
    activation.activate('b');
    expect(activation.wakingTabId).toBeUndefined();
    wake.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(book.selectedId).toBe('b');
    expect(log.filter((line) => line === 'warm:a')).toEqual([]);
  });

  it('a wake that fails discards the view and presses again, unless the Tab is busy', async () => {
    const { book, activation, log, enter, view, resumed } = rig();
    enter({ id: 'home', isWorking: false, view: view(1) });
    enter({ id: 'a', workspacePath: '/p/a', isWorking: false, view: view(2), idle: idle() });
    const busy = enter({ id: 'b', workspacePath: '/p/b', isWorking: true, view: view(3), idle: idle() });
    book.select('home');
    activation.activate('a');
    resumed().reject(new Error('CDP refused'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(log).toContain('teardown:a');
    expect(book.selectedId).toBe('a');
    activation.activate('b');
    resumed().reject(new Error('CDP refused'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(log).not.toContain('teardown:b');
    expect(book.selectedId).toBe('a');
    expect(busy.idle).toBeDefined();
  });
});
