import { describe, expect, it } from 'bun:test';
import { MENU_ACCELERATORS, TAB_SHORTCUTS } from '@studio/events';
import { SHORTCUTS } from './registry.js';
import type { ShortcutEntry } from './types.js';

const MODIFIERS = new Set(['mod', 'shift', 'alt']);

/** Escape may bind per mode, gated by `enabled`; every other combo is unique. */
const CONTEXT_MULTIPLEXED_KEYS = new Set(['escape']);

const ACCELERATOR_MODIFIERS: Record<string, string> = {
  cmd: 'mod',
  cmdorctrl: 'mod',
  command: 'mod',
  commandorcontrol: 'mod',
  control: 'ctrl',
  ctrl: 'ctrl',
  option: 'alt',
};

/** An Electron accelerator in the registry's `keys` spelling. */
function comboFromAccelerator(accelerator: string): string {
  return accelerator
    .split('+')
    .map((part) => ACCELERATOR_MODIFIERS[part.toLowerCase()] ?? part.toLowerCase())
    .join('+');
}

function normalizeCombo(keys: string): string {
  return keys
    .toLowerCase()
    .split('+')
    .map((part) => part.trim())
    .sort()
    .join('+');
}

type Binding = readonly [id: string, keys: string];

function conflictsIn(bindings: readonly Binding[]): string[] {
  const seen = new Map<string, string>();
  const conflicts: string[] = [];

  for (const [id, keys] of bindings) {
    const finalKey = keys
      .toLowerCase()
      .split('+')
      .filter((part) => !MODIFIERS.has(part))[0];
    if (finalKey && CONTEXT_MULTIPLEXED_KEYS.has(finalKey)) continue;

    const combo = normalizeCombo(keys);
    const existing = seen.get(combo);
    if (existing) {
      conflicts.push(`"${keys}" is bound by both ${existing} and ${id}`);
    } else {
      seen.set(combo, id);
    }
  }

  return conflicts;
}

describe('SHORTCUTS registry', () => {
  const entries = Object.entries(SHORTCUTS);

  it('gives every entry a combo of modifiers plus exactly one key', () => {
    for (const [id, entry] of entries) {
      const keys = entry.keys
        .toLowerCase()
        .split('+')
        .filter((part) => !MODIFIERS.has(part));
      expect(keys.length, `${id} has a malformed combo "${entry.keys}"`).toBe(1);
      expect(keys[0], `${id} has an empty key in "${entry.keys}"`).not.toBe('');
    }
  });

  const claimed: Binding[] = [
    ...entries.map(([id, entry]) => [id, entry.keys] as const),
    ...TAB_SHORTCUTS.map((entry) => [entry.id, entry.keys] as const),
    ...Object.entries(MENU_ACCELERATORS)
      .filter(([, item]) => item.firedBy === 'menu')
      .map(([id, item]) => [`menu.${id}`, comboFromAccelerator(item.key)] as const),
  ];

  it('binds no combo twice, the menu-fired accelerators included', () => {
    const conflicts = conflictsIn(claimed);
    expect(conflicts, `Conflicting bindings:\n${conflicts.join('\n')}`).toEqual([]);
  });

  it('names the pair when two spellings of one combo are bound', () => {
    const duplicate = conflictsIn([
      ['fixture.renderer', 'mod+shift+/'],
      ['fixture.menu', comboFromAccelerator('Shift+CmdOrCtrl+/')],
    ]);
    expect(duplicate).toHaveLength(1);
    expect(duplicate[0]).toContain('fixture.renderer');
    expect(duplicate[0]).toContain('fixture.menu');
    expect(
      conflictsIn([
        ['fixture.a', 'mod+shift+/'],
        ['fixture.b', 'mod+shift+p'],
      ]),
    ).toEqual([]);
  });

  // `registerAccelerator: false` leaves the key to the renderer, so the item's accelerator is a label for a chord that has to exist (ONL-1989, ONL-2042).
  // The `main-chords` half is checked in `main/menu/help.test.ts`; this project cannot see that matcher.
  it('mirrors every renderer-fired menu accelerator onto a binding this registry holds', () => {
    const fired = new Set(claimed.map(([, keys]) => normalizeCombo(keys)));
    for (const [id, item] of Object.entries(MENU_ACCELERATORS)) {
      if (item.firedBy !== 'renderer') continue;
      const combo = normalizeCombo(comboFromAccelerator(item.key));
      expect(
        fired.has(combo),
        `menu.${id} shows "${item.key}" but nothing in the renderer fires it`,
      ).toBe(true);
    }
  });

  // The canvas's own text node is a contentEditable region, and this is the whole
  // reason a caret in one does not swap tools or change mode (ONL-2486).
  it('leaves every bare-letter binding suppressed wherever a caret is, the text tool included', () => {
    const bare = entries.filter(([, entry]) => /^[a-z]$/.test(entry.keys));
    expect(bare.map(([id]) => id)).toContain('canvas.tool-text');
    for (const [id, entry] of bare) {
      const spec: ShortcutEntry = entry;
      expect(spec.suppressInEditable, `${id} fires mid-sentence`).toBeUndefined();
    }
  });
});
