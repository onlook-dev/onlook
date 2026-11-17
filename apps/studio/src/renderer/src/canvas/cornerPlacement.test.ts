import { describe, expect, it } from 'bun:test';
import {
  CORNER_GUTTER,
  helpButtonVisible,
  tipsPillPlacement,
  tipsPillVisible,
} from './cornerPlacement.js';

const SHOWN = { chromeHidden: false, isInteract: false, isLeftPanelHidden: false };

describe('which corner carries help (ONL-2350, ONL-2563)', () => {
  it('leaves the corner to the rail while the rail is there', () => {
    expect(helpButtonVisible(SHOWN)).toBe(false);
  });

  it('leaves the corner empty in Preview (ONL-2593)', () => {
    expect(helpButtonVisible({ chromeHidden: false, isInteract: true, isLeftPanelHidden: true })).toBe(false);
    expect(tipsPillVisible({ chromeHidden: false, isInteract: true, isInspireTipShown: false })).toBe(false);
  });

  it('takes the corner back when the designer hides the left panel by hand', () => {
    expect(helpButtonVisible({ ...SHOWN, isLeftPanelHidden: true })).toBe(true);
  });

  it('shows no door at all when the user hides the chrome from design', () => {
    expect(helpButtonVisible({ chromeHidden: true, isInteract: false, isLeftPanelHidden: true })).toBe(false);
  });
});

describe('the guide’s invitation keeps its own corner', () => {
  it('stays up while the rail carries help, so the first-run invitation is untouched', () => {
    expect(tipsPillVisible({ ...SHOWN, isInspireTipShown: false })).toBe(true);
  });

  it('steps aside while the inspiration tip is on screen, and comes back once it is gone (ONL-2960)', () => {
    expect(tipsPillVisible({ ...SHOWN, isInspireTipShown: true })).toBe(false);
    expect(tipsPillVisible({ ...SHOWN, isInspireTipShown: false })).toBe(true);
  });

  it('follows the chrome', () => {
    expect(tipsPillVisible({ chromeHidden: true, isInteract: false, isInspireTipShown: false })).toBe(false);
  });

  it('stays out of the corner while its kill switch hides it (ONL-2995)', () => {
    expect(tipsPillVisible({ ...SHOWN, isInspireTipShown: false, isTipsPillHidden: true })).toBe(false);
  });
});

describe('where the guide’s invitation sits (ONL-2563)', () => {
  const hidden = { ...SHOWN, isLeftPanelHidden: true };

  it('floats over the left panel’s lower corner while the panel is there (ONL-2593)', () => {
    expect(tipsPillPlacement(SHOWN)).toEqual({
      onPanel: true,
      insetInlineStart: CORNER_GUTTER,
      bottom: CORNER_GUTTER,
    });
  });

  it('clears the corner’s own help button, and drops to its level, once the rail is gone', () => {
    const placed = tipsPillPlacement(hidden);
    expect(placed.onPanel).toBe(false);
    expect(placed.bottom).toBe(CORNER_GUTTER);
    expect(placed.insetInlineStart).toContain('var(--size-element-lg)');
  });

  it('stacks above whatever holds the panel’s foot, and drops back once it is gone (ONL-2973)', () => {
    expect(tipsPillPlacement(SHOWN, 76).bottom).toBe(`calc(${CORNER_GUTTER} + 76px)`);
    expect(tipsPillPlacement(SHOWN, 0).bottom).toBe(CORNER_GUTTER);
  });

  it('ignores the panel’s foot once the rail is gone, since the pill has left the panel', () => {
    expect(tipsPillPlacement(hidden, 76).bottom).toBe(CORNER_GUTTER);
  });

  it('spends only tokens, so nothing here is a width in disguise', () => {
    for (const state of [SHOWN, hidden]) {
      const { insetInlineStart, bottom } = tipsPillPlacement(state);
      for (const length of [insetInlineStart, bottom]) {
        expect(length).toMatch(/var\(--/);
      }
    }
  });
});
