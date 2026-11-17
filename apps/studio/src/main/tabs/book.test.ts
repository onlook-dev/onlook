import { describe, expect, it } from 'bun:test';
import type { WebContentsView } from 'electron';
import { TabBook } from './book.js';
import type { Tab } from './tab.js';

function view(id: number): WebContentsView {
  return { webContents: { id } } as unknown as WebContentsView;
}

function bookOf(...tabs: Tab[]): TabBook {
  const book = new TabBook(undefined);
  for (const tab of tabs) book.enter(tab);
  return book;
}

describe('the tab book', () => {
  it('keeps Tabs in the order they entered, and one coming back takes the place it left', () => {
    const book = bookOf({ id: 'a', isWorking: false }, { id: 'b', isWorking: false });
    book.enter({ id: 'c', isWorking: false }, 1);
    expect(book.tabIds).toEqual(['a', 'c', 'b']);
    expect(book.openTabCount).toBe(3);
  });

  it('mints ids that never repeat, whether or not the Tab they were for entered', () => {
    const book = bookOf();
    expect([book.nextTabId(), book.nextTabId(), book.nextTabId()]).toEqual(['tab-1', 'tab-2', 'tab-3']);
  });

  it('drops the record before its place in the order, so a closing Tab is counted out but still listed', () => {
    const book = bookOf({ id: 'a', isWorking: false }, { id: 'b', isWorking: false });
    book.remove('a');
    expect(book.hasTab('a')).toBe(false);
    expect(book.recordCount).toBe(1);
    expect(book.openTabCount).toBe(2);
    book.unlist('a');
    expect(book.tabIds).toEqual(['b']);
  });

  describe('re-keying a Tab (ONL-2318)', () => {
    it('hands back a new record that carries every field, in the old one\'s place and selection', () => {
      const old: Tab = { id: 'tab-1', workspacePath: '/p/a', isWorking: true, status: 'done', presentationStartedAt: 7 };
      const book = bookOf({ id: 'home', isWorking: false }, old, { id: 'tab-2', isWorking: false });
      book.select('tab-1');
      const moved = book.rekey(old, 'spare-9');
      expect(moved).not.toBe(old);
      expect(moved).toEqual({ ...old, id: 'spare-9' });
      expect(book.tabIds).toEqual(['home', 'spare-9', 'tab-2']);
      expect(book.selectedId).toBe('spare-9');
      expect(book.tabById('tab-1')).toBeUndefined();
      expect(book.tabById('spare-9')).toBe(moved);
    });

    it('leaves the old record as it was: a closure still holding it never sees the new one\'s state', () => {
      const old: Tab = { id: 'tab-1', workspacePath: '/p/a', isWorking: false };
      const book = bookOf(old);
      const moved = book.rekey(old, 'spare-9');
      book.setWorking(moved, true);
      book.setWorkspace(moved, undefined);
      expect(old).toEqual({ id: 'tab-1', workspacePath: '/p/a', isWorking: false });
    });

    it('is the same record when the id does not change', () => {
      const tab: Tab = { id: 'tab-1', isWorking: false };
      const book = bookOf(tab);
      expect(book.rekey(tab, 'tab-1')).toBe(tab);
    });

    it('leaves another Tab\'s selection alone', () => {
      const old: Tab = { id: 'tab-1', isWorking: false };
      const book = bookOf(old, { id: 'tab-2', isWorking: false });
      book.select('tab-2');
      book.rekey(old, 'spare-9');
      expect(book.selectedId).toBe('tab-2');
    });
  });

  it('writes the identity fields, and clears a Project or a context by removing the field', () => {
    const tab: Tab = { id: 'a', isWorking: false };
    const book = bookOf(tab);
    book.setWorkspace(tab, '/p/a');
    book.setContextSource(tab, '/src/a');
    book.setWorking(tab, true);
    book.setStatus(tab, 'waiting');
    expect(tab).toEqual({ id: 'a', isWorking: true, workspacePath: '/p/a', contextSource: '/src/a', status: 'waiting' });
    book.setWorkspace(tab, undefined);
    book.setContextSource(tab, undefined);
    expect('workspacePath' in tab).toBe(false);
    expect('contextSource' in tab).toBe(false);
  });

  it('finds a Tab by the Project it holds, and says when another Tab holds the same one (ONL-2315)', () => {
    const book = bookOf({ id: 'a', workspacePath: '/p/one', isWorking: false }, { id: 'b', workspacePath: '/p/one', isWorking: false }, { id: 'c', workspacePath: '/p/two', isWorking: false });
    expect(book.tabForWorkspace('/p/one')).toBe('a');
    expect(book.tabIdsForWorkspace('/p/one')).toEqual(['a', 'b']);
    expect(book.heldByAnotherTab('/p/one', 'a')).toBe(true);
    expect(book.heldByAnotherTab('/p/two', 'c')).toBe(false);
    expect(book.tabForWorkspace('/p/none')).toBeUndefined();
  });

  it('finds a Tab by its view, and the selected Tab\'s contents', () => {
    const book = bookOf({ id: 'a', isWorking: false, view: view(11) }, { id: 'b', isWorking: false });
    expect(book.tabForViewId(11)?.id).toBe('a');
    expect(book.tabForViewId(12)).toBeUndefined();
    expect(book.activeContents()).toBeUndefined();
    book.select('a');
    expect(book.activeContents()?.id).toBe(11);
    book.select('b');
    expect(book.activeContents()).toBeUndefined();
  });

  it('counts Project Tabs only: the Projects Screen never counts against the limit', () => {
    const book = bookOf({ id: 'home', isWorking: false }, { id: 'a', workspacePath: '/p/a', isWorking: false }, { id: 'b', workspacePath: '/p/b', isWorking: false });
    expect(book.purposeOf(book.tabById('home')!)).toBe('projects');
    expect(book.projectTabCount()).toBe(2);
    book.remove('b');
    expect(book.projectTabCount()).toBe(1);
  });

  it('reports a Tab busy while it works or waits on an answer', () => {
    const tab: Tab = { id: 'a', workspacePath: '/p/a', isWorking: false };
    const book = bookOf(tab);
    expect(book.decisionsFor(tab).isBusy).toBe(false);
    book.setWorking(tab, true);
    expect(book.decisionsFor(tab).isBusy).toBe(true);
    book.setWorking(tab, false);
    book.setStatus(tab, 'waiting');
    expect(book.decisionsFor(tab).isBusy).toBe(true);
  });
});
