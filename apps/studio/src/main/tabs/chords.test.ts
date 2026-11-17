import { describe, expect, it } from 'bun:test';
import { chordHintForInput, chordReleasedByPointer } from './chords.js';

type Part = { meta?: boolean; control?: boolean; alt?: boolean; shift?: boolean };

const down = (key: string, part: Part = {}) => ({
  type: 'keyDown' as const,
  key,
  meta: part.meta ?? false,
  control: part.control ?? false,
  alt: part.alt ?? false,
  shift: part.shift ?? false,
});
const up = (key: string, part: Part = {}) => ({ ...down(key, part), type: 'keyUp' as const });

describe('chordHintForInput', () => {
  it('lights on ⌘ down and puts the legends away on ⌘ up', () => {
    expect(chordHintForInput(down('Meta', { meta: true }), true)).toBe(true);
    expect(chordHintForInput(up('Meta', { meta: true }), true)).toBe(false);
    expect(chordHintForInput(down('Control', { control: true }), false)).toBe(true);
    expect(chordHintForInput(up('Control', { control: true }), false)).toBe(false);
  });

  // A held ⌘ must survive the keys pressed under it.
  it('stays as it was through a digit pressed under a held ⌘', () => {
    expect(chordHintForInput(down('1', { meta: true }), true)).toBe(null);
    expect(chordHintForInput(up('1', { meta: true }), true)).toBe(null);
  });

  // ⌘C, ⌘V and ⌘A while typing must not flash the legends.
  it('puts the legends away when ⌘ joins any key but a tab digit', () => {
    expect(chordHintForInput(down('c', { meta: true }), true)).toBe(false);
    expect(chordHintForInput(down('v', { meta: true }), true)).toBe(false);
    expect(chordHintForInput(down('0', { meta: true }), true)).toBe(false);
    expect(chordHintForInput(down('a', { control: true }), false)).toBe(false);
  });

  // A legend lit for another binding's modifier promises a chord that will not fire.
  it('never lights for a modifier that is not the chord’s', () => {
    expect(chordHintForInput(down('1', { meta: true, shift: true }), true)).toBe(false);
    expect(chordHintForInput(down('1', { meta: true, alt: true }), true)).toBe(false);
    expect(chordHintForInput(down('1', { meta: true, control: true }), true)).toBe(false);
    expect(chordHintForInput(down('a'), true)).toBe(false);
    // ⌘ off-mac is a foreign modifier; ⌃ is the chord there.
    expect(chordHintForInput(down('1', { meta: true }), false)).toBe(false);
  });
});

describe('chordReleasedByPointer', () => {
  it('releases on a pointer event without the chord modifier, and on nothing else', () => {
    expect(chordReleasedByPointer({ type: 'mouseMove', modifiers: [] }, true)).toBe(true);
    expect(chordReleasedByPointer({ type: 'mouseDown', modifiers: ['shift'] }, true)).toBe(true);
    expect(chordReleasedByPointer({ type: 'mouseMove', modifiers: ['ctrl'] }, false)).toBe(false);

    expect(chordReleasedByPointer({ type: 'mouseMove', modifiers: ['meta'] }, true)).toBe(false);
    expect(chordReleasedByPointer({ type: 'keyUp', modifiers: [] }, true)).toBe(false);
  });
});
