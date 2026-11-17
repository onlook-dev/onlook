import { describe, expect, test } from 'bun:test';

import { PAGES_SHARE, SECTION_FLOOR, clampPagesHeight, pagesSectionBox } from './pageSplit.js';

const PANEL = 600;

describe('the boundary between the two sections', () => {
  test('a project with no stored split hugs its rows, up to a share of the panel', () => {
    expect(pagesSectionBox(undefined, PANEL)).toEqual({
      kind: 'hug',
      maxHeight: Math.round(PANEL * PAGES_SHARE),
    });
  });

  test('one page and no stored split leaves the rest of the panel to the designs list', () => {
    const box = pagesSectionBox(undefined, PANEL);
    expect(box.kind).toBe('hug');
    expect(PANEL - (box.kind === 'hug' ? box.maxHeight : 0)).toBeGreaterThan(PANEL / 2);
  });

  test('a stored split is a height, and it wins over hugging however few rows are left', () => {
    expect(pagesSectionBox(320, PANEL)).toEqual({ kind: 'fixed', height: 320 });
    expect(pagesSectionBox(SECTION_FLOOR, PANEL)).toEqual({ kind: 'fixed', height: SECTION_FLOOR });
  });

  test('neither section is ever dragged below one row', () => {
    expect(clampPagesHeight(0, PANEL)).toBe(SECTION_FLOOR);
    expect(clampPagesHeight(-100, PANEL)).toBe(SECTION_FLOOR);
    expect(clampPagesHeight(PANEL, PANEL)).toBe(PANEL - SECTION_FLOOR);
    expect(clampPagesHeight(PANEL * 4, PANEL)).toBe(PANEL - SECTION_FLOOR);
    for (const height of [0, 1, 71, 72, 300, 528, 529, 600, 5000]) {
      const answer = clampPagesHeight(height, PANEL);
      expect(answer).toBeGreaterThanOrEqual(SECTION_FLOOR);
      expect(PANEL - answer).toBeGreaterThanOrEqual(SECTION_FLOOR);
    }
  });

  test('a panel too short for both floors still keeps the pages section its row', () => {
    expect(clampPagesHeight(0, 40)).toBe(SECTION_FLOOR);
    expect(clampPagesHeight(999, 40)).toBe(SECTION_FLOOR);
  });

  test('a stored split past the panel leaves the designs list its row', () => {
    expect(pagesSectionBox(9000, PANEL)).toEqual({ kind: 'fixed', height: PANEL - SECTION_FLOOR });
  });

  test('a share too small for one row still opens at one row', () => {
    expect(pagesSectionBox(undefined, 100)).toEqual({ kind: 'hug', maxHeight: SECTION_FLOOR });
  });
});
