import { expect, it } from 'bun:test';
import { homeVerdict } from './home.js';

it('is home only once main has Projects in front and that tab shows the Projects screen', () => {
  expect(homeVerdict({ isHome: true, activeTabId: 'tab-2', screen: 'projects' })).toEqual({ showing: true, tabId: 'tab-2' });
});

it('blames main while a project tab is still in front, whatever that tab renders', () => {
  expect(homeVerdict({ isHome: false, activeTabId: 'tab-1', screen: 'projects' })).toMatchObject({ showing: false, side: 'main' });
});

it('blames the tab while main has Projects in front but its screen has not followed', () => {
  expect(homeVerdict({ isHome: true, activeTabId: 'tab-2', screen: 'editor' })).toMatchObject({ showing: false, side: 'tab' });
  expect(homeVerdict({ isHome: true, activeTabId: 'tab-2', screen: null })).toMatchObject({ showing: false, side: 'tab' });
});
