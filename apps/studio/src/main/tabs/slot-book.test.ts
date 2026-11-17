import { describe, expect, it } from 'bun:test';
import { GIT_PILL_SHIPPED_DEFAULTS } from '@studio/events';
import { SlotBook, slotsForSession } from './slot-book.js';

it('hides tabs and project controls without a session and restores slots after sign-in', () => {
  const slots = { showFolder: true, rails: { left: true, right: false } };
  expect(slotsForSession(slots, false)).toEqual({ blendsIntoScreen: true, tabsHidden: true });
  expect(slotsForSession(slots, true)).toBe(slots);
  expect(slotsForSession({ blendsIntoScreen: true }, true)).toEqual({ blendsIntoScreen: true });
});

describe('SlotBook', () => {
  it('a project tab that has never pushed gets the scaffold — rails and a first-paint git pill, not an empty band', () => {
    const book = new SlotBook();
    expect(book.forTab('t1', 'project', true)).toEqual({
      showFolder: true,
      rails: { left: false, right: false },
      git: { defaults: GIT_PILL_SHIPPED_DEFAULTS, isWorking: false, canSubmit: false },
    });
  });

  it('a cold project tab gets a blended band until account access and setup are ready', () => {
    expect(new SlotBook().forTab('t1', 'project', false)).toEqual({ blendsIntoScreen: true });
  });

  it('the projects list draws its one control from the first push, not a beat after the window opens', () => {
    expect(new SlotBook().forTab('t1', 'projects', true)).toEqual({ showFolder: true });
  });

  it('a window that opens on setup gets the blended band, so it never shows a strip over that page (ONL-2625)', () => {
    expect(new SlotBook().forTab('t1', 'projects', false)).toEqual({ blendsIntoScreen: true });
  });

  it('a recorded push wins over the scaffold, and survives the tab going to the background', () => {
    const book = new SlotBook();
    book.record('t1', { showFolder: true, rails: { left: true, right: false } });
    book.record('t2', { showFolder: true, rails: { left: false, right: true } });
    expect(book.forTab('t1', 'project', true)).toEqual({ showFolder: true, rails: { left: true, right: false } });
    expect(book.forTab('t2', 'project', true)).toEqual({ showFolder: true, rails: { left: false, right: true } });
  });

  it('a recorded empty push is honoured — a tab back on the projects list has no controls', () => {
    const book = new SlotBook();
    book.record('t1', { showFolder: true, rails: { left: false, right: false } });
    book.record('t1', {});
    expect(book.forTab('t1', 'projects', true)).toEqual({});
  });

  it('suppresses recorded project and home controls while blocked and restores them on activation after unblock', () => {
    const book = new SlotBook();
    const project = { showFolder: true, rails: { left: true, right: false } };
    const home = { showFolder: true };
    book.record('project', project);
    book.record('home', home);
    expect(book.forTab('project', 'project', false)).toEqual({ blendsIntoScreen: true });
    expect(book.forTab('home', 'projects', false)).toEqual({ blendsIntoScreen: true });
    expect(book.forTab('project', 'project', true)).toEqual(project);
    expect(book.forTab('home', 'projects', true)).toEqual(home);
  });

  it('records late pushes and cleanup without exposing them while blocked', () => {
    const book = new SlotBook();
    book.record('t1', { showFolder: true });
    expect(book.forTab('t1', 'project', false)).toEqual({ blendsIntoScreen: true });
    book.record('t1', { rails: { left: false, right: true } });
    expect(book.forTab('t1', 'project', false)).toEqual({ blendsIntoScreen: true });
    expect(book.forTab('t1', 'project', true)).toEqual({ rails: { left: false, right: true } });
    book.record('t1', {});
    expect(book.forTab('t1', 'project', false)).toEqual({ blendsIntoScreen: true });
    expect(book.forTab('t1', 'project', true)).toEqual({});
  });

  it('a closed tab is forgotten, so a reused id starts from the first push again', () => {
    const book = new SlotBook();
    book.record('t1', { showFolder: true, rails: { left: true, right: true } });
    book.forget('t1');
    expect(book.forTab('t1', 'project', true)).toEqual(new SlotBook().forTab('t1', 'project', true));
    expect(book.forTab('t1', 'projects', false)).toEqual({ blendsIntoScreen: true });
  });
});
