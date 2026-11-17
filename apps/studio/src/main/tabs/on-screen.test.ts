import { expect, it } from 'bun:test';
import { tabOnScreen } from './on-screen.js';

it('puts a tab on screen only while it is the active tab of the focused window, or the gate pins it (ONL-2960)', () => {
  expect(tabOnScreen({ isActive: true, isWindowFocused: true, isPinned: false })).toBe(true);
  expect(tabOnScreen({ isActive: true, isWindowFocused: false, isPinned: false })).toBe(false);
  expect(tabOnScreen({ isActive: false, isWindowFocused: true, isPinned: false })).toBe(false);
  expect(tabOnScreen({ isActive: false, isWindowFocused: false, isPinned: true })).toBe(true);
});
