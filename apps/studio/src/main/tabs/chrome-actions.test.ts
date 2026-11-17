import { expect, test } from 'bun:test';
import { IPC_EMIT, type ChromeSlotAction, type ChromeSlotsPush } from '@studio/events';
import { SlotBook } from './slot-book.js';
import { seatedTabs } from './test-support.js';

test('incoming chrome is recorded but cannot replace the outgoing band before the tab is revealed', () => {
  const pushes: ChromeSlotsPush[] = [];
  const tab = { id: 'incoming' };
  const host = seatedTabs({
    activeId: tab.id,
    visibleId: 'outgoing',
    tabFor: () => tab,
    slots: new SlotBook(),
    cooling: { touch: () => {} },
    purposeOf: () => 'projects',
    hasReachedProduct: () => true,
    pushSlots: (push: ChromeSlotsPush) => { pushes.push(push); },
  });
  host.handleSlots({}, { tabId: tab.id, slots: { blendsIntoScreen: true } });
  host.handleSlots({}, { tabId: tab.id, slots: {} });
  host.handleSlots({}, { tabId: tab.id, slots: { showFolder: true } });
  expect(pushes).toEqual([]);
  host.visibleId = tab.id;
  host.publishVisibleSlots(tab);
  expect(pushes).toEqual([{ tabId: tab.id, slots: { showFolder: true } }]);
});

test('New Blank Draft stays in the active project while its request is delivered', () => {
  let homeVisits = 0;
  const forwarded: unknown[][] = [];
  const contents = { id: 12, isDestroyed: () => false, send: (...args: unknown[]) => { forwarded.push(args); } };
  const host = seatedTabs({
    activeId: 'project',
    hasReachedProduct: () => true,
    isAtProjectLimit: () => false,
    goHome: () => { homeVisits += 1; },
    contentsFor: () => contents,
  });
  host.newDraft();
  expect(homeVisits).toBe(0);
  expect(forwarded).toEqual([[IPC_EMIT.tabsDraftRequested, undefined]]);
  expect(host.takeDraftRequest(contents.id)).toBe(true);
  expect(host.takeDraftRequest(contents.id)).toBe(false);
});

test('New Blank Draft ignores requests while busy, at the tab limit, or behind the account gate', () => {
  for (const blockedBy of ['busy', 'limit', 'gate']) {
    const forwarded: unknown[] = [];
    const host = seatedTabs({
      activeId: 'project',
      isCreatingDraft: blockedBy === 'busy',
      hasReachedProduct: () => blockedBy !== 'gate',
      isAtProjectLimit: () => blockedBy === 'limit',
      contentsFor: () => ({ isDestroyed: () => false, send: () => { forwarded.push(true); } }),
    });
    host.newDraft();
    expect(forwarded).toEqual([]);
  }
});

test('Blank Draft creation reserves the final project slot and releases it on failure', () => {
  const broadcasts: boolean[] = [];
  const host = seatedTabs({
    isCreatingDraft: false,
    hasReachedProduct: () => true,
    projectTabCount: () => 8,
    broadcastTabs: () => { broadcasts.push(true); },
  });
  expect(host.beginDraftCreation()).toBe(true);
  expect(host.beginDraftCreation()).toBe(false);
  host.setDraftCreating(false);
  host.setDraftCreating(false);
  expect(broadcasts).toEqual([true, true]);
  expect(host.beginDraftCreation()).toBe(true);
});

test('a saved project cannot consume a Blank Draft reservation from the Projects tab', () => {
  const host = seatedTabs({
    isCreatingDraft: true,
    isAtProjectLimit: () => true,
    tabForViewId: (viewId: number) => viewId === 1 ? { id: 'projects' } : { id: 'editor', workspacePath: '/current' },
    tabForWorkspace: (workspacePath: string) => workspacePath === '/current' ? 'editor' : undefined,
  });
  expect(host.reserveProjectOpen(1, '/saved')).toBe(false);
  expect(host.reserveProjectOpen(1, '/current')).toBe(true);
  expect(host.reserveProjectOpen(2, '/saved')).toBe(true);
});

test('saved-project admission holds capacity through asynchronous renderer landing', () => {
  const host = seatedTabs({
    isCreatingDraft: true,
    projectTabCount: () => 7,
    tabForViewId: () => ({ id: 'projects' }),
    tabForWorkspace: () => undefined,
    hasReachedProduct: () => true,
    broadcastTabs: () => {},
  });
  expect(host.reserveProjectOpen(1, '/saved')).toBe(true);
  expect(host.reserveProjectOpen(1, '/missing')).toBe(true);
  host.releaseProjectOpen(1, '/missing');
  expect(host.reserveProjectOpen(2, '/other')).toBe(false);
  expect(host.reserveProjectOpen(1, '/saved')).toBe(true);
  host.releaseProjectOpen(1, '/saved');
  expect(host.reserveProjectOpen(2, '/other')).toBe(false);
  host.releaseProjectOpen(1, '/stale');
  expect(host.reserveProjectOpen(2, '/other')).toBe(false);
  host.releaseProjectOpen(1, '/saved');
  expect(host.reserveProjectOpen(2, '/other')).toBe(true);
});

test('queued chrome actions cannot reach the mounted editor after account access is blocked', () => {
  let ready = true;
  let homeVisits = 0;
  const forwarded: unknown[][] = [];
  const host = seatedTabs({
    activeId: 'project',
    visibleId: 'project',
    hasReachedProduct: () => ready,
    goHome: () => { homeVisits += 1; },
    contentsFor: () => ({ isDestroyed: () => false, send: (...args: unknown[]) => { forwarded.push(args); } }),
  });
  const actions: ChromeSlotAction[] = [
    { tabId: 'project', slot: 'folder' },
    { tabId: 'project', slot: 'rail', side: 'left' },
    { tabId: 'project', slot: 'git', kind: 'action' },
  ];
  ready = false;
  for (const action of actions) host.handleAction(action);
  expect(homeVisits).toBe(0);
  expect(forwarded).toEqual([]);
  ready = true;
  for (const action of actions) host.handleAction(action);
  expect(homeVisits).toBe(1);
  expect(forwarded).toEqual(actions.slice(1).map((action) => [IPC_EMIT.chromeActionForwarded, action]));
});

test('neither stale outgoing controls nor incoming actions reach a project while its cover is visible', () => {
  const forwarded: unknown[][] = [];
  const host = seatedTabs({
    activeId: 'incoming',
    visibleId: 'outgoing',
    hasReachedProduct: () => true,
    contentsFor: () => ({ isDestroyed: () => false, send: (...args: unknown[]) => { forwarded.push(args); } }),
  });
  for (const tabId of ['outgoing', 'incoming']) {
    host.handleAction({ tabId, slot: 'git', kind: 'action' });
    host.handleAction({ tabId, slot: 'rail', side: 'left' });
  }
  expect(forwarded).toEqual([]);
  host.visibleId = 'incoming';
  const action = { tabId: 'incoming', slot: 'git', kind: 'action' } as const;
  host.handleAction(action);
  expect(forwarded).toEqual([[IPC_EMIT.chromeActionForwarded, action]]);
});

test('Projects navigation works for either tab while active and visible tabs differ', () => {
  let homeVisits = 0;
  const host = seatedTabs({
    activeId: 'incoming', visibleId: 'outgoing',
    hasReachedProduct: () => true,
    goHome: () => { homeVisits += 1; },
  });
  for (const tabId of ['incoming', 'outgoing']) host.handleAction({ tabId, slot: 'folder' });
  expect(homeVisits).toBe(2);
});
