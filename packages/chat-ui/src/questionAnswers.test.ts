import { expect, test } from 'bun:test';
import { questionNumberIndex } from './questionAnswers.js';

test('number keys leave edits, Escape, chords, composition and repeats alone', () => {
  const event = { key: '2', altKey: false, metaKey: false, ctrlKey: false, shiftKey: false, repeat: false, defaultPrevented: false, isComposing: false };
  expect(questionNumberIndex(event, false)).toBe(1);
  expect(questionNumberIndex(event, true)).toBeUndefined();
  for (const patch of [{ key: 'Escape' }, { repeat: true }, { isComposing: true }, { metaKey: true }, { defaultPrevented: true }]) expect(questionNumberIndex({ ...event, ...patch }, false)).toBeUndefined();
});
