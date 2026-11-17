import { describe, expect, it } from 'bun:test';
import type { WebContentsView } from 'electron';
import { IPC_EMIT, MAX_PROJECT_TABS } from '@studio/events';
import { TabBook } from './book.js';
import { ProjectOpens, type ProjectOpensPort } from './project-opens.js';
import type { Tab } from './tab.js';
import type { TabViewPool } from './view-pool.js';

function rig() {
  const log: string[] = [];
  const sent: [number, string][] = [];
  const book = new TabBook(undefined);
  book.finishBoot();
  Object.assign(book, { persist: () => { log.push('persist'); }, hasReachedProduct: () => true });
  const views = { noteActivity: (id: string) => { log.push(`activity:${id}`); } } as unknown as TabViewPool;
  const port: ProjectOpensPort = {
    open: (createFrom, method) => { log.push(`open:${createFrom}:${method}`); return 'new-tab'; },
    activate: (id, method) => { log.push(`activate:${id}:${method}`); },
    close: (id, method) => { log.push(`close:${id}:${method}`); },
    projectShown: (by) => { log.push(`shown:${by}`); },
    tabsChanged: () => { log.push('tabs-changed'); },
  };
  const opens = new ProjectOpens(book, views, port);
  const enter = (id: string, viewId: number, workspacePath?: string): Tab => {
    const view = { webContents: { id: viewId, isDestroyed: () => false, send: (channel: string) => { sent.push([viewId, channel]); } } } as unknown as WebContentsView;
    const tab: Tab = { id, isWorking: false, view, ...(workspacePath === undefined ? {} : { workspacePath }) };
    book.enter(tab);
    return tab;
  };
  return { book, opens, log, sent, enter };
}

describe('a Tab naming its Project', () => {
  it('takes the Project, tells the strip, persists, and counts it shown when the Tab is the selected one', () => {
    const { book, opens, log, enter } = rig();
    const tab = enter('home', 5);
    book.select('home');
    opens.noteWorkspace(5, '/p/a');
    expect(tab.workspacePath).toBe('/p/a');
    expect(log).toEqual(['tabs-changed', 'persist', 'shown:project_opened']);
  });

  it('is not counted shown from a background Tab', () => {
    const { opens, log, enter } = rig();
    enter('home', 5);
    opens.noteWorkspace(5, '/p/a');
    expect(log).toEqual(['tabs-changed', 'persist']);
  });

  it('one Tab per worktree: a fresh Tab landing on an open Project selects that Tab and closes itself', () => {
    const { opens, log, enter } = rig();
    enter('a', 4, '/p/a');
    const fresh = enter('fresh', 5);
    opens.noteWorkspace(5, '/p/a');
    expect(log).toEqual(['activate:a:click', 'close:fresh:switch']);
    expect(fresh.workspacePath).toBeUndefined();
  });

  it('a Tab that already held a Project selects the other Tab and stays open', () => {
    const { opens, log, enter } = rig();
    enter('a', 4, '/p/a');
    enter('b', 5, '/p/b');
    opens.noteWorkspace(5, '/p/a');
    expect(log).toEqual(['activate:a:click']);
  });

  it('the Projects Screen reporting no Project on every mount writes nothing back (ONL-2208)', () => {
    const { opens, log, enter } = rig();
    enter('home', 5);
    opens.noteWorkspace(5, undefined);
    expect(log).toEqual([]);
  });

  it('leaving a Project clears it, tells the strip and persists', () => {
    const { opens, log, enter } = rig();
    const tab = enter('a', 5, '/p/a');
    opens.noteWorkspace(5, undefined);
    expect('workspacePath' in tab).toBe(false);
    expect(log).toEqual(['tabs-changed', 'persist']);
  });

  it('a landing takes its reservation with it, and an unchanged report still tells the strip the slot is free', () => {
    const { opens, log, enter } = rig();
    enter('home', 5);
    expect(opens.reserveProjectOpen(5, '/p/a')).toBe(true);
    expect(opens.reservedOpenCount).toBe(1);
    log.length = 0;
    opens.noteWorkspace(5, undefined);
    expect(opens.reservedOpenCount).toBe(0);
    expect(log).toEqual(['tabs-changed']);
  });

  it('ignores a view that is no Tab', () => {
    const { opens, log } = rig();
    opens.noteWorkspace(99, '/p/a');
    expect(log).toEqual([]);
  });
});

describe('the Project limit', () => {
  it('counts Project Tabs, the draft being created and the opens reserved ahead of their landing', () => {
    const { opens, enter } = rig();
    enter('home', 1);
    for (let index = 0; index < MAX_PROJECT_TABS - 2; index += 1) enter(`p${String(index)}`, 10 + index, `/p/${String(index)}`);
    expect(opens.isAtProjectLimit()).toBe(false);
    expect(opens.beginDraftCreation()).toBe(true);
    expect(opens.isAtProjectLimit()).toBe(false);
    expect(opens.reserveProjectOpen(1, '/p/saved')).toBe(true);
    expect(opens.isAtProjectLimit()).toBe(true);
    opens.releaseProjectOpen(1);
    expect(opens.isAtProjectLimit()).toBe(false);
  });

  it('a view that is destroyed or navigates gives its reservation back, and the strip is told once', () => {
    const { opens, log, enter } = rig();
    enter('home', 1);
    opens.reserveProjectOpen(1, '/p/saved');
    log.length = 0;
    opens.releaseProjectOpen(1);
    opens.releaseProjectOpen(1);
    expect(log).toEqual(['tabs-changed']);
  });
});

describe('a draft request', () => {
  it('is pushed to the selected Tab and held for that Tab alone until taken', () => {
    const { book, opens, sent, enter } = rig();
    enter('home', 1);
    enter('a', 2, '/p/a');
    book.select('a');
    opens.newDraft();
    expect(sent).toEqual([[2, IPC_EMIT.tabsDraftRequested]]);
    expect(opens.takeDraftRequest(1)).toBe(false);
    expect(opens.takeDraftRequest(2)).toBe(true);
    expect(opens.takeDraftRequest(2)).toBe(false);
  });
});
