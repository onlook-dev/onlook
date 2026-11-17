import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'bun:test';
import { MENU_ACCELERATORS } from '@studio/events';
import { en } from '@studio/i18n/strings';
import { HELP_ITEMS } from './help.js';
import { isSaveChord } from './save-chord.js';
import { zoomActionForInput } from './zoom-chords.js';

const menuSource = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');

describe('the Help menu items', () => {
  it('carries the lane each item claims, the problem lane holding the shortcut', () => {
    expect(HELP_ITEMS.map((item) => item.lane)).toEqual(['bug', 'feature']);
    expect(HELP_ITEMS[0]?.accelerator).toBe(MENU_ACCELERATORS.report.key);
    expect(HELP_ITEMS[1]?.accelerator).toBeUndefined();
  });

  it('labels every item from the catalog', () => {
    for (const item of HELP_ITEMS) {
      expect(typeof en[item.labelKey], `${item.labelKey} is not in the catalog`).toBe('string');
    }
  });
});

describe('the menu accelerator table', () => {
  // An accelerator written at a call site is invisible to the collision guard in
  // renderer/src/shortcuts/registry.test.ts, which reads this table (ONL-2350).
  it('holds every accelerator menu.ts hands to Electron', () => {
    const literals = [
      ...menuSource.matchAll(/'(?:(?:Cmd|CmdOrCtrl|Command|CommandOrControl|Ctrl|Control|Shift|Alt|Option)\+)+[^']*'/g),
    ].map((match) => match[0]);
    expect(literals).toEqual([]);
  });

  /* Close Tab is the one hand-built item whose accelerator Electron registers: its click
     resolves its own target, so nothing in the renderer needs the keydown first. Every other
     item leaves it to `installMainChords`, and a second registration fires the chord twice
     (ONL-1989, ONL-2563). */
  it('registers exactly one hand-built item’s accelerator, and it is Close Tab', () => {
    const registered = [...menuSource.matchAll(/commandItem\('([^']+)'[^)]*?,\s*true\)/g)].map(
      (match) => match[1],
    );
    expect(registered).toEqual(['close-tab']);
  });

  /* The other half of the mirror lives in renderer/src/shortcuts/registry.test.ts,
     which cannot see these matchers. Generalised past the zoom one when ⌘S
     joined the seat: the claim is that SOME matcher in main fires the key, not
     that the zoom matcher does (ONL-2563). */
  it('leaves every main-fired accelerator to a chord main actually matches', () => {
    for (const [id, item] of Object.entries(MENU_ACCELERATORS)) {
      if (item.firedBy !== 'main-chords') continue;
      const key = item.key.split('+').at(-1) ?? '';
      const input = { type: 'keyDown' as const, key, meta: true, control: false, alt: false };
      const fired =
        zoomActionForInput(input, true) !== null || isSaveChord({ ...input, shift: false }, true);
      expect(fired, `menu.${id} shows "${item.key}" but no chord in main fires it`).toBe(true);
    }
  });
});
