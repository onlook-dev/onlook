import { expect, it } from 'bun:test';
import { HOTKEYS, shownHotkeys } from './hotkeys.js';

const ids = (shown: { codeEnabled: boolean }): string[] => shownHotkeys(HOTKEYS, shown).flatMap((group) => group.rows.map((row) => row.id));

it('lists the code keys only with the code panel on', () => {
  expect(ids({ codeEnabled: true })).toContain('saveCode');
  expect(ids({ codeEnabled: false })).not.toContain('saveCode');
});

it('places Code after Modes so it shares the shorter first column', () => {
  expect(shownHotkeys(HOTKEYS, { codeEnabled: true }).map((group) => group.label)).toEqual([
    'tips.keys.group.general',
    'tips.keys.group.tools',
    'tips.keys.group.modes',
    'tips.keys.group.code',
    'tips.keys.group.edit',
    'tips.keys.group.view',
  ]);
});

it('keeps the Code-off group order unchanged', () => {
  expect(shownHotkeys(HOTKEYS, { codeEnabled: false }).map((group) => group.label)).toEqual([
    'tips.keys.group.general',
    'tips.keys.group.tools',
    'tips.keys.group.modes',
    'tips.keys.group.edit',
    'tips.keys.group.view',
  ]);
});
