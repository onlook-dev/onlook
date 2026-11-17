// Pure functions only — the boundary's arithmetic, provable without a mount.

import { ROW_GAP_BORDER, ROW_PADDING_BLOCK } from '../panels/rowGeometry.js';

/** `DESIGN_LEADING_12` leaves the leading to the font, so the design's own 16 stands in for it here. */
const SUPPORTING_LINE = 16;
const SECTION_PADDING_BLOCK = 12;

/** A section's header and one row: under this a drag would hide a section (ONL-2488). */
export const SECTION_FLOOR =
  SUPPORTING_LINE +
  SECTION_PADDING_BLOCK * 2 +
  (SUPPORTING_LINE + ROW_PADDING_BLOCK * 2 + ROW_GAP_BORDER * 2);

/** The most of the panel the Pages section hugs into while this project has no stored split (ONL-2488). */
export const PAGES_SHARE = 0.4;

export type PagesSectionBox =
  /** Content height, capped: the Designs list keeps whatever the rows do not need (ONL-2488). */
  | { kind: 'hug'; maxHeight: number }
  | { kind: 'fixed'; height: number };

/** A panel too short for both floors gives the Pages section its row and lets the Designs list scroll. */
export function clampPagesHeight(height: number, panelHeight: number): number {
  return Math.min(Math.max(height, SECTION_FLOOR), Math.max(SECTION_FLOOR, panelHeight - SECTION_FLOOR));
}

export function pagesSectionBox(
  storedHeight: number | undefined,
  panelHeight: number,
): PagesSectionBox {
  if (storedHeight === undefined) {
    return { kind: 'hug', maxHeight: clampPagesHeight(Math.round(panelHeight * PAGES_SHARE), panelHeight) };
  }
  return { kind: 'fixed', height: clampPagesHeight(storedHeight, panelHeight) };
}
