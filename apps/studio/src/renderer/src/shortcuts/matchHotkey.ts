export interface KeyStroke {
  key: string;
  code?: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

export interface ParsedHotkey {
  mod: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
}

const MODIFIERS = new Set(['mod', 'shift', 'alt']);

export function parseHotkey(combo: string): ParsedHotkey {
  const parts = combo.toLowerCase().split('+');
  return {
    mod: parts.includes('mod'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    key: parts.find((part) => !MODIFIERS.has(part)) ?? '',
  };
}

/** Exact modifiers: `mod+.` must not fire on `mod+shift+.`. */
export function matchesHotkey(event: KeyStroke, parsed: ParsedHotkey): boolean {
  const modHeld = event.metaKey === true || event.ctrlKey === true;
  if (parsed.mod !== modHeld) return false;
  if (parsed.shift !== (event.shiftKey === true)) return false;
  if (parsed.alt !== (event.altKey === true)) return false;

  const pressed = event.key.toLowerCase();
  if (pressed === parsed.key) return true;

  // `event.code`, never a character alias: a shifted key arrives as its character (`shift+1` is `!`), so the ⇧ digit bindings match only here (ONL-1979).
  const physical = CODE_FOR_KEY[parsed.key];
  if (physical !== undefined && event.code === physical) return true;

  return false;
}

const CODE_FOR_KEY: Record<string, string | undefined> = {
  '\\': 'Backslash',
  '.': 'Period',
  ',': 'Comma',
  '=': 'Equal',
  '-': 'Minus',
  '/': 'Slash',
  ';': 'Semicolon',
  "'": 'Quote',
  '[': 'BracketLeft',
  ']': 'BracketRight',
  '0': 'Digit0',
  '1': 'Digit1',
  '2': 'Digit2',
};
