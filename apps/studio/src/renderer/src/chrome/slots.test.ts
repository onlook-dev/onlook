import { describe, expect, it } from 'bun:test';
import { sendsSlotAction } from './slots.js';

const behind = { activeId: 'tab-2', projectedTabId: 'tab-1' };
const caughtUp = { activeId: 'tab-2', projectedTabId: 'tab-2' };

describe('Projects while the band is behind the strip (ONL-3121)', () => {
  it('sends while the slots on screen still belong to another tab', () => {
    expect(sendsSlotAction({ tabId: 'tab-2', slot: 'folder' }, behind)).toBe(true);
  });

  it('sends before any tab is selected', () => {
    expect(sendsSlotAction({ tabId: '', slot: 'folder' }, { activeId: '', projectedTabId: '' })).toBe(true);
  });
});

describe('the sidebar and git controls', () => {
  it('wait while the slots on screen still belong to another tab', () => {
    expect(sendsSlotAction({ tabId: 'tab-2', slot: 'rail', side: 'left' }, behind)).toBe(false);
    expect(sendsSlotAction({ tabId: 'tab-2', slot: 'git', kind: 'action' }, behind)).toBe(false);
    expect(sendsSlotAction({ tabId: 'tab-2', slot: 'git', kind: 'pick', option: 'commit' }, behind)).toBe(false);
  });

  it('act once the slots belong to the highlighted tab', () => {
    expect(sendsSlotAction({ tabId: 'tab-2', slot: 'rail', side: 'right' }, caughtUp)).toBe(true);
    expect(sendsSlotAction({ tabId: 'tab-2', slot: 'git', kind: 'action' }, caughtUp)).toBe(true);
  });

  it('withholds a press with no tab selected', () => {
    expect(sendsSlotAction({ tabId: '', slot: 'rail', side: 'left' }, { activeId: '', projectedTabId: '' })).toBe(false);
  });
});
