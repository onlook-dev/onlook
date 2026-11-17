import { describe, expect, it } from 'bun:test';

import { keysGlyph } from './glyphs.js';

describe('a registry key string as a menu shows it', () => {
  it('puts the modifiers in the macOS order before the key', () => {
    expect(keysGlyph('mod+shift+t')).toBe('⇧⌘T');
    expect(keysGlyph('mod+d')).toBe('⌘D');
  });

  it('leaves a bare punctuation key as it is', () => {
    expect(keysGlyph(']')).toBe(']');
  });
});
