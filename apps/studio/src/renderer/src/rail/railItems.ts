import type { StringKey } from '@studio/i18n';
import type { LeftPanelView } from './leftPanel.js';

type RailItemId = 'mark' | LeftPanelView | 'help';

/** `head` is the mark, `views` the panel switch, `foot` help. The rail draws the three groups in that order. */
type RailPlace = 'head' | 'views' | 'foot';

export interface RailItem {
  id: RailItemId;
  label: StringKey;
  caption?: StringKey;
  place: RailPlace;
  /** The panel view this item shows, for the two that switch one. */
  view?: LeftPanelView;
}

const ITEMS: readonly RailItem[] = [
  { id: 'mark', label: 'rail.mark', place: 'head' },
  /* Labelled Files, the word the design uses; the view itself is the designs list and keeps its name. "Design" would also collide with the band's Design/Preview switch (ONL-2563). */
  { id: 'designs', label: 'rail.files', place: 'views', view: 'designs' },
  { id: 'artifacts', label: 'rail.artifacts', caption: 'rail.artifacts.caption', place: 'views', view: 'artifacts' },
  { id: 'code', label: 'rail.code', place: 'views', view: 'code' },
  { id: 'help', label: 'rail.help', place: 'foot' },
];

export function railItems(codeEnabled = false): readonly RailItem[] {
  return codeEnabled ? ITEMS : ITEMS.filter((item) => item.view !== 'code');
}
