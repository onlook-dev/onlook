import { describe, expect, it } from 'bun:test';
import { matchesHotkey, parseHotkey, type KeyStroke } from './matchHotkey.js';

const stroke = (over: Partial<KeyStroke> & { key: string }): KeyStroke => ({
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...over,
});

describe('parseHotkey', () => {
  it('splits modifiers from the one key they qualify', () => {
    expect(parseHotkey('mod+shift+z')).toEqual({
      mod: true,
      shift: true,
      alt: false,
      key: 'z',
    });
  });

  it('reads a bare key as no modifiers', () => {
    expect(parseHotkey('escape')).toEqual({
      mod: false,
      shift: false,
      alt: false,
      key: 'escape',
    });
  });
});

describe('matchesHotkey', () => {
  it('matches the combo it was given', () => {
    expect(matchesHotkey(stroke({ key: '.', metaKey: true }), parseHotkey('mod+.'))).toBe(true);
  });

  it('accepts ctrl for mod, so a registry entry stays portable', () => {
    expect(matchesHotkey(stroke({ key: '.', ctrlKey: true }), parseHotkey('mod+.'))).toBe(true);
  });

  it('does not match when the modifier is missing', () => {
    expect(matchesHotkey(stroke({ key: '.' }), parseHotkey('mod+.'))).toBe(false);
  });

  it('does not match when an extra modifier is held', () => {
    expect(
      matchesHotkey(stroke({ key: '.', metaKey: true, shiftKey: true }), parseHotkey('mod+.')),
    ).toBe(false);
  });

  it('does not match a different key', () => {
    expect(matchesHotkey(stroke({ key: 'k', metaKey: true }), parseHotkey('mod+.'))).toBe(false);
  });

  // A stroke producing `|` holds shift; one without it is impossible.
  it('matches a backslash binding on a layout where that key reports |', () => {
    expect(
      matchesHotkey(
        stroke({ key: '|', code: 'Backslash', shiftKey: true, metaKey: true }),
        parseHotkey('mod+shift+\\'),
      ),
    ).toBe(true);
  });

  it('falls back to the physical key for ⌘. on a layout that reports another character', () => {
    expect(
      matchesHotkey(stroke({ key: 'ж', code: 'Period', metaKey: true }), parseHotkey('mod+.')),
    ).toBe(true);
  });

  it('does not treat the backslash key as a match for an unrelated combo', () => {
    expect(
      matchesHotkey(stroke({ key: '|', code: 'Backslash', metaKey: true }), parseHotkey('mod+.')),
    ).toBe(false);
  });

  it('is case-insensitive about the reported key', () => {
    expect(matchesHotkey(stroke({ key: 'Z', metaKey: true }), parseHotkey('mod+z'))).toBe(true);
  });
});
