import { TAB_SHORTCUTS } from '@studio/events';

import { SHORTCUTS, type ShortcutId } from './registry.js';

const MODIFIER_GLYPHS: Record<string, string> = { mod: '⌘', shift: '⇧', alt: '⌥', ctrl: '⌃' };
/* macOS menu order: ⌃⌥⇧⌘. */
const MODIFIER_ORDER = ['ctrl', 'alt', 'shift', 'mod'];

/** A registry `keys` string as a menu shows it: `mod+shift+t` is `⇧⌘T`. */
export function keysGlyph(keys: string): string {
  const parts = keys.split('+');
  const key = parts[parts.length - 1] ?? '';
  const modifiers = parts
    .slice(0, -1)
    .sort((a, b) => MODIFIER_ORDER.indexOf(a) - MODIFIER_ORDER.indexOf(b))
    .map((modifier) => MODIFIER_GLYPHS[modifier] ?? modifier);
  return `${modifiers.join('')}${key.length === 1 ? key.toUpperCase() : key}`;
}

export const shortcutGlyph = (id: ShortcutId): string => keysGlyph(SHORTCUTS[id].keys);

export function tabShortcutGlyph(id: string): string | undefined {
  const keys = TAB_SHORTCUTS.find((shortcut) => shortcut.id === id)?.keys;
  return keys === undefined ? undefined : keysGlyph(keys);
}
