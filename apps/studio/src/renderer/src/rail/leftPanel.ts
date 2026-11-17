import type { PanelsState } from '@studio/events';

import { REGION } from '../layout.js';

/** Which view the left panel is showing. Not `mode`: `CanvasMode` is the Design/Preview axis, with its own switch and keys (ONL-2563). */
export type LeftPanelView = 'designs' | 'artifacts' | 'code';

/** The Code view falls back to Designs while its experiment is off. */
export function shownLeftPanelView(stored: LeftPanelView, isCodeEnabled: boolean): LeftPanelView {
  return stored === 'code' && !isCodeEnabled ? 'designs' : stored;
}

export function leftPanelWidth(view: LeftPanelView, panels: PanelsState): number {
  return view === 'code' ? panels.code : panels.sidebar;
}

/** What the left side of the canvas is covered by: the rail and the open panel together. An overlay inset, never a column budget (ONL-1889). */
export function leftOverlayWidth(view: LeftPanelView, panels: PanelsState): number {
  return REGION.rail + leftPanelWidth(view, panels);
}
