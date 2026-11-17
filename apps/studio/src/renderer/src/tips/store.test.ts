import { beforeEach, describe, expect, it } from 'bun:test';
import { HOTKEYS } from './hotkeys.js';
import { filterHotkeys } from './HotkeyList.js';
import { FEATURED, PROMPTS, promptsFor } from './content.js';
import { STAGES } from './previews.js';
import { closeTips, openTips, resetTipsForTesting, setTipsDetail, toggleTips, useTipsStore } from './store.js';

const sent: unknown[] = [];

beforeEach(() => {
  sent.length = 0;
  Object.defineProperty(globalThis, 'window', {
    value: { studio: { telemetryEvent: (payload: unknown) => sent.push(payload) } },
    configurable: true,
    writable: true,
  });
  resetTipsForTesting();
});

describe('the Tips guide (ONL-2468)', () => {
  it('toggles open and closed, and reports only the opening', () => {
    toggleTips('shortcut');
    expect(useTipsStore.getState().isOpen).toBe(true);
    toggleTips('shortcut');
    expect(useTipsStore.getState().isOpen).toBe(false);
    expect(sent).toEqual([{ event: 'tips_opened', properties: { source: 'shortcut' } }]);
  });

  it('keeps the open prompt across a close, so reopening lands where the user was', () => {
    openTips('button');
    setTipsDetail('tidy');
    closeTips();
    openTips('button');
    expect(useTipsStore.getState().detail).toBe('tidy');
  });

  it('lists every prompt once under Featured, and each under its own tab', () => {
    expect(new Set(FEATURED).size).toBe(PROMPTS.length);
    expect(promptsFor('featured')).toHaveLength(PROMPTS.length);
    for (const prompt of PROMPTS) {
      if (prompt.category !== 'featured') expect(promptsFor(prompt.category)).toContain(prompt);
      expect(STAGES[prompt.id]().length).toBeGreaterThan(0);
    }
  });

  it('finds hotkeys by row or by group, and nothing for a miss', () => {
    expect(filterHotkeys(HOTKEYS, 'zoom').flatMap((g) => g.rows).length).toBe(5);
    expect(filterHotkeys(HOTKEYS, 'edit')).toHaveLength(1);
    expect(filterHotkeys(HOTKEYS, 'zebra')).toHaveLength(0);
  });
});
