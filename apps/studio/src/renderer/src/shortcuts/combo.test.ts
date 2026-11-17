import { describe, expect, it } from 'bun:test';

import { comboText } from './combo.js';

describe('a chord written as text', () => {
  it('runs glyphs together on the Mac', () => {
    expect(comboText('mod+shift+t')).toBe('⌘⇧T');
  });

  it('spells each key out on Windows, joined by plus signs', () => {
    expect(comboText('mod+shift+t', 'windows')).toBe('Ctrl+Shift+T');
    expect(comboText('mod+,', 'windows')).toBe('Ctrl+,');
    expect(comboText('mod+=', 'windows')).toBe('Ctrl+=');
    expect(comboText('f11', 'windows')).toBe('F11');
  });

  it('puts Windows modifiers in its own order, Ctrl first', () => {
    expect(comboText('shift+mod+z', 'windows')).toBe('Ctrl+Shift+Z');
  });
});
