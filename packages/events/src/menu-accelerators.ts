/** Who fires the key: the menu item itself, or — for `registerAccelerator: false` — the side that reads it off the input stream (ONL-1989, ONL-2042). */
export type AcceleratorFiredBy = 'menu' | 'renderer' | 'main-chords';

export interface MenuAccelerator {
  readonly key: string;
  readonly firedBy: AcceleratorFiredBy;
}

// Here rather than beside the menu so the renderer's conflict guard reads the same table main builds from, with no import across the process seam (ONL-2350).
export const MENU_ACCELERATORS = {
  closeTab: { key: 'CmdOrCtrl+W', firedBy: 'menu' },
  report: { key: 'Shift+CmdOrCtrl+/', firedBy: 'menu' },
  /** Main's input seat, never the renderer's registry: the editor's host is an editable target, so a registry binding is deaf exactly where ⌘S matters (ONL-2563). */
  saveCode: { key: 'CmdOrCtrl+S', firedBy: 'main-chords' },
  actualSize: { key: 'CmdOrCtrl+0', firedBy: 'main-chords' },
  zoomIn: { key: 'CmdOrCtrl+=', firedBy: 'main-chords' },
  zoomOut: { key: 'CmdOrCtrl+-', firedBy: 'main-chords' },
  undo: { key: 'CmdOrCtrl+Z', firedBy: 'renderer' },
  redo: { key: 'Shift+CmdOrCtrl+Z', firedBy: 'renderer' },
} as const satisfies Record<string, MenuAccelerator>;
