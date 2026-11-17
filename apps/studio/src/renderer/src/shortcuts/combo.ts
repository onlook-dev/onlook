const GLYPH: Record<string, string> = { mod: '⌘', shift: '⇧', alt: '⌥', ctrl: '⌃', plus: '+' };

const WORD: Record<string, string> = { mod: 'Ctrl', ctrl: 'Ctrl', shift: 'Shift', alt: 'Alt', plus: 'Plus' };

/** Windows writes Ctrl, then Alt, then Shift, whatever order the chord was declared in. */
const WINDOWS_MODIFIER_ORDER = ['mod', 'ctrl', 'alt', 'shift'] as const;

/** `mac` draws glyphs run together; `windows` spells each key, joined by `+`, as Windows menus do. */
export type ComboStyle = 'mac' | 'windows';

/** One combo in `Kbd` notation, split into the caps a surface draws. Mac-first, as the rest of Studio's chrome is. */
export function comboCaps(keys: string): string[] {
  return keys.split('+').map((key) => GLYPH[key] ?? key.toUpperCase());
}

/** The same combo as one run of text, for a row that shows its key as text rather than as caps (ONL-2563). */
export function comboText(keys: string, style: ComboStyle = 'mac'): string {
  if (style === 'mac') return comboCaps(keys).join('');
  const parts = keys.split('+');
  const modifiers = WINDOWS_MODIFIER_ORDER.filter((modifier) => parts.includes(modifier));
  const rest = parts.filter((part) => !(WINDOWS_MODIFIER_ORDER as readonly string[]).includes(part));
  return [...new Set([...modifiers, ...rest].map((key) => WORD[key] ?? key.toUpperCase()))].join('+');
}
