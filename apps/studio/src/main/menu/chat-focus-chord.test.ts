import { expect, test } from 'bun:test';
import { isChatFocusChord } from './chat-focus-chord.js';

const chord = { type: 'keyDown', key: 'C', meta: true, control: false, alt: false, shift: true, isAutoRepeat: false } as const;

test('chat focus uses the main-owned chord and ignores releases, repeats and other modifiers', () => {
  expect(isChatFocusChord(chord, true)).toBe(true);
  expect(isChatFocusChord({ ...chord, meta: false, control: true }, false)).toBe(true);
  for (const change of [{ shift: false }, { alt: true }, { control: true }, { key: 'k' }, { type: 'keyUp' as const }, { isAutoRepeat: true }]) {
    expect(isChatFocusChord({ ...chord, ...change }, true)).toBe(false);
  }
});
