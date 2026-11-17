import { expect, it } from 'bun:test';
import { frameWheelScroll, scrollKeyAfter } from './scrollKey.js';

const press = { type: 'keydown' as const, code: 'KeyS', isChord: false, isInField: false, isRepeat: false };

it('holds on a bare S and lets go on its release or a lost window', () => {
  expect(scrollKeyAfter(false, press)).toBe(true);
  expect(scrollKeyAfter(true, { ...press, code: 'KeyA' })).toBe(true);
  expect(scrollKeyAfter(true, { type: 'keyup', code: 'KeyA' })).toBe(true);
  expect(scrollKeyAfter(true, { type: 'keyup', code: 'KeyS' })).toBe(false);
  expect(scrollKeyAfter(true, { type: 'blur' })).toBe(false);
});

it('never holds while typing in a field or under a modifier, so ⇧S and ⌘S stay their own', () => {
  expect(scrollKeyAfter(false, { ...press, isInField: true })).toBe(false);
  expect(scrollKeyAfter(false, { ...press, isChord: true })).toBe(false);
  expect(scrollKeyAfter(true, { ...press, isChord: true })).toBe(false);
});

it('holds only on a fresh press, so a repeat after ⇧S or after leaving a field never starts one', () => {
  expect(scrollKeyAfter(false, { ...press, isRepeat: true })).toBe(false);
  expect(scrollKeyAfter(true, { ...press, isRepeat: true })).toBe(true);
  expect(scrollKeyAfter(true, { ...press, isRepeat: true, isInField: true })).toBe(false);
});

const down = { deltaX: 0, deltaY: 120, deltaMode: 0, ctrlKey: false, metaKey: false };

it('leaves a wheel without S to the canvas, over a selected Frame whose page it could scroll too (ONL-2960)', () => {
  expect(frameWheelScroll(down, { viewport: null, isKeyHeld: false, zoom: 1 })).toBeNull();
  expect(frameWheelScroll(down, { viewport: 800, isKeyHeld: false, zoom: 1 })).toBeNull();
});

it('scrolls the page under the pointer while S is held, and counts it once the page is found (ONL-2960)', () => {
  expect(frameWheelScroll(down, { viewport: null, isKeyHeld: true, zoom: 1 })).toEqual({ delta: 120, movesPageByKey: false });
  expect(frameWheelScroll(down, { viewport: 800, isKeyHeld: true, zoom: 2 })).toEqual({ delta: 60, movesPageByKey: true });
  expect(frameWheelScroll({ ...down, metaKey: true }, { viewport: null, isKeyHeld: true, zoom: 1 })).toBeNull();
});
