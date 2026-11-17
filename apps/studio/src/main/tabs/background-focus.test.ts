import { expect, test } from 'bun:test';
import { focusBackgroundTab } from './background-focus.js';

test('notification Open activates Studio before focusing the restored tab', () => {
  const calls: string[] = [];
  focusBackgroundTab({ isMinimized: () => true, restore: () => { calls.push('restore'); }, show: () => { calls.push('show'); }, focus: () => { calls.push('window'); } }, { focus: () => { calls.push('contents'); } }, { focus: (options) => { calls.push(options?.steal ? 'activate' : 'passive'); } });
  expect(calls).toEqual(['restore', 'activate', 'show', 'window', 'contents']);
});

test('an open window is not restored and missing contents are safe', () => {
  const calls: string[] = [];
  focusBackgroundTab({ isMinimized: () => false, restore: () => { calls.push('restore'); }, show: () => { calls.push('show'); }, focus: () => { calls.push('window'); } }, undefined, { focus: () => { calls.push('activate'); } });
  expect(calls).toEqual(['activate', 'show', 'window']);
});
