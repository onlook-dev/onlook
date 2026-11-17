import { WINDOW_BAR_HEIGHT, type ChromeExtent } from '@studio/events';

export function chromeHeightFor(extent: ChromeExtent, contentHeight: number): number {
  const ceiling = Math.max(0, Math.floor(contentHeight));
  // A restored bounds record can be shorter than the band (ONL-2206).
  const band = Math.min(WINDOW_BAR_HEIGHT, ceiling);
  if (extent.kind === 'band') return band;
  if (extent.kind === 'full') return ceiling;
  // NaN and Infinity survive min/max, and a NaN reaches `setBounds` as a silent no-op.
  if (!Number.isFinite(extent.height)) return band;
  return Math.min(Math.max(Math.ceil(extent.height), band), ceiling);
}

/** A new chrome document starts believing the band is at rest, so main rests it too, or a grown band outlives its page over the tab (ONL-2609). */
export function restOnNewDocument(page: { on(event: 'did-navigate', listener: () => void): unknown }, rest: () => void): void {
  page.on('did-navigate', rest);
}
