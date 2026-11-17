import { expect, it } from 'bun:test';
import { HOTKEYS, shownHotkeys } from './hotkeys.js';

const ids = (shown: { codeEnabled: boolean }): string[] => shownHotkeys(HOTKEYS, shown).flatMap((group) => group.rows.map((row) => row.id));

it('lists the code keys only with the code panel on', () => {
  expect(ids({ codeEnabled: true })).toContain('saveCode');
  expect(ids({ codeEnabled: false })).not.toContain('saveCode');
});
