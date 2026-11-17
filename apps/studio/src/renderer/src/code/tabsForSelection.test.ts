import { describe, expect, it } from 'bun:test';

import { tabsAfterClose, tabsForSelection } from './tabsForSelection.js';

const BUTTON = 'src/components/Button.tsx';
const CARD = 'src/components/Card.tsx';

describe('which file a pick points the panel at', () => {
  it('leaves the active tab and the tinted file alone on a shift-added second selection', () => {
    const before = [BUTTON];

    const after = tabsForSelection(before, BUTTON, CARD, true);

    expect(after.activePath).toBe(BUTTON);
    expect(after.openPaths).toBe(before);
    expect(after.toRead).toBeNull();
  });

  it('opens a new tab and activates it for a plain pick in another file, keeping the one before it', () => {
    const after = tabsForSelection([BUTTON], BUTTON, CARD, false);

    expect(after.openPaths).toEqual([BUTTON, CARD]);
    expect(after.activePath).toBe(CARD);
    expect(after.toRead).toBe(CARD);
  });

  it('adds no tab for a pick in the file already open, so it re-tints in place', () => {
    const before = [BUTTON, CARD];

    const after = tabsForSelection(before, CARD, CARD, false);

    expect(after.openPaths).toBe(before);
    expect(after.activePath).toBe(CARD);
    expect(after.toRead).toBeNull();
  });

  it('re-points at the remaining selection when the first of two is removed', () => {
    const after = tabsForSelection([BUTTON, CARD], CARD, BUTTON, false);

    expect(after.activePath).toBe(BUTTON);
    expect(after.toRead).toBeNull();
  });

  it('activates the existing tab rather than opening a file twice', () => {
    const after = tabsForSelection([BUTTON, CARD], BUTTON, CARD, false);

    expect(after.openPaths).toEqual([BUTTON, CARD]);
    expect(after.activePath).toBe(CARD);
    expect(after.toRead).toBeNull();
  });

  it('stays where it is when the pick mapped to nothing', () => {
    const before = [BUTTON];

    const after = tabsForSelection(before, BUTTON, null, false);

    expect(after.openPaths).toBe(before);
    expect(after.activePath).toBe(BUTTON);
    expect(after.toRead).toBeNull();
  });
});

describe('what a close leaves active', () => {
  it('selects the next tab', () => {
    const after = tabsAfterClose([BUTTON, CARD, 'src/app.css'], CARD, CARD);

    expect(after.openPaths).toEqual([BUTTON, 'src/app.css']);
    expect(after.activePath).toBe('src/app.css');
  });

  it('selects the previous tab when the closed one was last', () => {
    const after = tabsAfterClose([BUTTON, CARD], CARD, CARD);

    expect(after.activePath).toBe(BUTTON);
  });

  it('leaves nothing active when the last tab closes', () => {
    const after = tabsAfterClose([BUTTON], BUTTON, BUTTON);

    expect(after.openPaths).toEqual([]);
    expect(after.activePath).toBeNull();
  });

  it('keeps the active tab when another one closes', () => {
    const after = tabsAfterClose([BUTTON, CARD], CARD, BUTTON);

    expect(after.openPaths).toEqual([CARD]);
    expect(after.activePath).toBe(CARD);
  });
});
