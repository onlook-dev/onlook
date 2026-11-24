import type { StringKey } from '@studio/i18n';

type HotkeyIcon =
  | 'openTips'
  | 'hidePanels'
  | 'switchTab'
  | 'select'
  | 'pan'
  | 'addBrowser'
  | 'addText'
  | 'addImage'
  | 'design'
  | 'preview'
  | 'undo'
  | 'redo'
  | 'duplicate'
  | 'front'
  | 'back'
  | 'zoomIn'
  | 'zoomOut'
  | 'fit'
  | 'selection'
  | 'actual'
  | 'measure'
  | 'scrollPage'
  | 'saveCode';

interface HotkeyRow {
  id: HotkeyIcon;
  label: StringKey;
  /** Each combo in `Kbd` notation; alternatives read "or" between them. */
  combos: readonly string[];
  /** A word after the keys, for a binding that is a key plus a gesture. */
  word?: StringKey;
}

export interface HotkeyGroup {
  label: StringKey;
  rows: readonly HotkeyRow[];
}

export const HOTKEYS: readonly HotkeyGroup[] = [
  {
    label: 'tips.keys.group.general',
    rows: [
      { id: 'openTips', label: 'tips.keys.openTips', combos: ['mod+/'] },
      { id: 'hidePanels', label: 'tips.keys.hidePanels', combos: ['mod+.', 'mod+\\'] },
      { id: 'switchTab', label: 'tips.keys.switchTab', combos: ['mod+1–9'] },
    ],
  },
  {
    label: 'tips.keys.group.tools',
    rows: [
      { id: 'select', label: 'tips.keys.select', combos: ['v'] },
      { id: 'pan', label: 'tips.keys.pan', combos: ['h'] },
      { id: 'addBrowser', label: 'tips.keys.addBrowser', combos: ['b'] },
      { id: 'addText', label: 'tips.keys.addText', combos: ['t'] },
      { id: 'addImage', label: 'tips.keys.addImage', combos: ['mod+shift+k'] },
    ],
  },
  {
    label: 'tips.keys.group.modes',
    rows: [
      { id: 'design', label: 'tips.keys.design', combos: ['d'] },
      { id: 'preview', label: 'tips.keys.preview', combos: ['p'] },
    ],
  },
  {
    label: 'tips.keys.group.code',
    rows: [{ id: 'saveCode', label: 'tips.keys.saveCode', combos: ['mod+s'] }],
  },
  {
    label: 'tips.keys.group.edit',
    rows: [
      { id: 'undo', label: 'tips.keys.undo', combos: ['mod+z'] },
      { id: 'redo', label: 'tips.keys.redo', combos: ['mod+shift+z'] },
      { id: 'duplicate', label: 'tips.keys.duplicate', combos: ['mod+d'] },
      { id: 'front', label: 'tips.keys.front', combos: [']'] },
      { id: 'back', label: 'tips.keys.back', combos: ['['] },
    ],
  },
  {
    label: 'tips.keys.group.view',
    rows: [
      { id: 'zoomIn', label: 'tips.keys.zoomIn', combos: ['mod+=', 'shift+plus'] },
      { id: 'zoomOut', label: 'tips.keys.zoomOut', combos: ['mod+−', 'shift+−'] },
      { id: 'fit', label: 'tips.keys.fit', combos: ['shift+1'] },
      { id: 'selection', label: 'tips.keys.selection', combos: ['shift+2'] },
      { id: 'actual', label: 'tips.keys.actual', combos: ['mod+0', 'shift+0'] },
      { id: 'measure', label: 'tips.keys.measure', combos: ['alt'], word: 'tips.keys.hover' },
      { id: 'scrollPage', label: 'tips.keys.scrollPage', combos: ['s'], word: 'tips.keys.scroll' },
    ],
  },
];

/** The code keys need the code panel, so the list never teaches a key that does nothing. */
export function shownHotkeys(groups: readonly HotkeyGroup[], shown: { codeEnabled: boolean }): HotkeyGroup[] {
  return groups.filter((group) => shown.codeEnabled || group.label !== 'tips.keys.group.code');
}
