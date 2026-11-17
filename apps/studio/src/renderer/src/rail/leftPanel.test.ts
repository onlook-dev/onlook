import { describe, expect, it } from 'bun:test';
import type { PanelsState } from '@studio/events';
import { leftOverlayWidth, leftPanelWidth } from './leftPanel.js';

const PANELS: PanelsState = { sidebar: 260, end: 300, code: 640 };

describe('which stored width a left-panel view opens at', () => {
  it('reads the designs view from one key and the code view from another', () => {
    expect(leftPanelWidth('designs', PANELS)).toBe(PANELS.sidebar);
    expect(leftPanelWidth('artifacts', PANELS)).toBe(PANELS.sidebar);
    expect(leftPanelWidth('code', PANELS)).toBe(PANELS.code);
  });

  it('answers a different number per view, so neither view inherits the other', () => {
    expect(leftPanelWidth('code', PANELS)).not.toBe(leftPanelWidth('designs', PANELS));
  });
});

describe('what the left side of the canvas is covered by', () => {
  it('counts the rail as well as the open panel', () => {
    expect(leftOverlayWidth('designs', PANELS)).toBeGreaterThan(PANELS.sidebar);
    expect(leftOverlayWidth('code', PANELS)).toBeGreaterThan(PANELS.code);
  });

  it('moves with the open view by exactly the difference between the two stored widths', () => {
    expect(leftOverlayWidth('code', PANELS) - leftOverlayWidth('designs', PANELS)).toBe(
      PANELS.code - PANELS.sidebar,
    );
  });
});
