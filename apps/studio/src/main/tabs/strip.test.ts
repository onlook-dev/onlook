import { describe, expect, it } from 'bun:test';
import type { WebContents } from 'electron';
import { IPC_EMIT, MAX_PROJECT_TABS, type TabsState } from '@studio/events';
import { TabBook } from './book.js';
import { TabStrip, type TabStripFacts } from './strip.js';
import type { Tab } from './tab.js';
import type { TabViewPool } from './view-pool.js';

function rig(facts: Partial<TabStripFacts> = {}) {
  const log: string[] = [];
  const sent: [number, string, TabsState][] = [];
  const book = new TabBook(undefined);
  book.finishBoot();
  Object.assign(book, { persist: () => { log.push('persist'); }, sourceForActive: () => '/src' });
  const renderer = (id: number) => ({ id, isDestroyed: () => false, send: (channel: string, state: TabsState) => { sent.push([id, channel, state]); } }) as unknown as WebContents;
  const views = {
    everyRenderer: () => [renderer(1), renderer(2)],
    noteActivity: (id: string) => { log.push(`activity:${id}`); },
    resume: async (tab: Tab) => { log.push(`resume:${tab.id}`); },
  } as unknown as TabViewPool;
  const strip = new TabStrip(book, views, { isCreatingDraft: () => false, reservedOpenCount: () => 0, canReopen: () => false, ...facts });
  const enter = (tab: Tab): Tab => { book.enter(tab); return tab; };
  return { book, strip, log, sent, enter };
}

describe('the strip\'s state', () => {
  it('has one chip per Tab in order, each with what its record says', () => {
    const { book, strip, enter } = rig();
    enter({ id: 'home', isWorking: false });
    enter({ id: 'a', workspacePath: '/p/a', isWorking: true, status: 'waiting', health: 'failed' });
    book.select('a');
    const state = strip.state();
    expect(state.tabs.map((tab) => [tab.id, tab.purpose])).toEqual([['home', 'projects'], ['a', 'project']]);
    expect(state.tabs[1]).toMatchObject({ isWorking: true, status: 'waiting', health: 'failed', workspacePath: '/p/a' });
    expect(state.tabs[0]).not.toHaveProperty('isWorking');
    expect(state.activeId).toBe('a');
    expect(state.isHome).toBe(false);
  });

  it('is home with no selection or with the Projects Screen selected', () => {
    const { book, strip, enter } = rig();
    enter({ id: 'home', isWorking: false });
    expect(strip.state().isHome).toBe(true);
    expect(strip.state()).not.toHaveProperty('activeId');
    book.select('home');
    expect(strip.state().isHome).toBe(true);
  });

  it('offers a new Tab until Project Tabs and reserved opens fill the limit, and never while a draft is being created', () => {
    const full = rig({ reservedOpenCount: () => 1 });
    for (let index = 0; index < MAX_PROJECT_TABS - 1; index += 1) full.enter({ id: `p${String(index)}`, workspacePath: `/p/${String(index)}`, isWorking: false });
    expect(full.strip.state().canCreate).toBe(false);
    const room = rig();
    room.enter({ id: 'a', workspacePath: '/p/a', isWorking: false });
    expect(room.strip.state().canCreate).toBe(true);
    const drafting = rig({ isCreatingDraft: () => true });
    drafting.enter({ id: 'a', workspacePath: '/p/a', isWorking: false });
    expect(drafting.strip.state()).toMatchObject({ canCreate: false, isCreatingDraft: true });
  });

  it('says a closed Tab can be reopened only when the closer says so', () => {
    expect(rig().strip.state()).not.toHaveProperty('canReopen');
    expect(rig({ canReopen: () => true }).strip.state().canReopen).toBe(true);
  });
});

describe('telling the renderers', () => {
  it('sends one state to every renderer the pool lists', () => {
    const { strip, sent, enter } = rig();
    enter({ id: 'home', isWorking: false });
    strip.broadcast();
    expect(sent.map(([id, channel]) => [id, channel])).toEqual([[1, IPC_EMIT.tabsChanged], [2, IPC_EMIT.tabsChanged]]);
    expect(sent[0]![2]).toBe(sent[1]![2]);
  });

  it('an agent reaching a Project is activity and wakes a sleeping Tab, and only a changed flag is broadcast', () => {
    const { strip, log, sent, enter } = rig();
    const idle = { wake: async () => undefined, sleep: async () => undefined };
    const tab = enter({ id: 'a', workspacePath: '/p/a', isWorking: false, idle });
    enter({ id: 'b', workspacePath: '/p/b', isWorking: false });
    strip.noteWorking('/p/a', true);
    expect(tab.isWorking).toBe(true);
    expect(log).toEqual(['activity:a', 'resume:a']);
    expect(sent).toHaveLength(2);
    strip.noteWorking('/p/a', true);
    expect(log).toEqual(['activity:a', 'resume:a', 'activity:a', 'resume:a']);
    expect(sent).toHaveLength(2);
  });

  it('a `done` on the selected Tab is already seen, so it never lands in the record (ONL-2364)', () => {
    const { book, strip, enter } = rig();
    const selected = enter({ id: 'a', workspacePath: '/p/a', isWorking: false });
    const background = enter({ id: 'b', workspacePath: '/p/b', isWorking: false });
    book.select('a');
    strip.noteStatus('/p/a', 'done');
    strip.noteStatus('/p/b', 'done');
    expect(selected.status).toBeUndefined();
    expect(background.status).toBe('done');
  });

  it('a drag reorders Project chips, broadcasts and persists; a drop in place does neither (ONL-2324)', () => {
    const { book, strip, log, sent, enter } = rig();
    enter({ id: 'home', isWorking: false });
    enter({ id: 'a', workspacePath: '/p/a', isWorking: false });
    enter({ id: 'b', workspacePath: '/p/b', isWorking: false });
    strip.reorder('b', 0);
    expect(book.tabIds).toEqual(['home', 'b', 'a']);
    expect(log).toEqual(['persist']);
    expect(sent).toHaveLength(2);
    strip.reorder('b', 0);
    expect(log).toEqual(['persist']);
    expect(sent).toHaveLength(2);
  });
});
