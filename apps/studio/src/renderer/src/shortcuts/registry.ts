import type { ShortcutEntry } from './types.js';

// A focused <webview> sends the host no key events: ⌘= ⌘− ⌘0 are read in main off each webContents (ONL-1989); here they double-fire or go deaf.
export const SHORTCUTS = {
  // capture: the browser's own ⌘. and React Flow claim the combo first.
  'ui.toggle-chrome': {
    keys: 'mod+.',
    group: 'Global',
    description: 'Hide the panels and show only the canvas',
    suppressInEditable: false,
    capture: true,
  },
  'ui.toggle-chrome-alt': {
    keys: 'mod+\\',
    group: 'Global',
    description: 'Hide the panels and show only the canvas (⌘\\)',
    suppressInEditable: false,
    capture: true,
  },

  // Bare letters: `suppressInEditable` stays default, or typing "have" in the composer swaps tools.
  'canvas.tool-select': {
    keys: 'v',
    group: 'Canvas',
    description: 'Move tool',
  },
  'canvas.tool-pan': {
    keys: 'h',
    group: 'Canvas',
    description: 'Hand tool',
  },
  'canvas.tool-frame': {
    keys: 'b',
    group: 'Canvas',
    description: 'Browser tool',
  },
  'canvas.tool-section': {
    keys: 'shift+s',
    group: 'Canvas',
    description: 'Section tool',
  },
  'canvas.tool-text': {
    keys: 't',
    group: 'Canvas',
    description: 'Text tool',
  },
  'canvas.tool-artifact': {
    keys: 'a',
    group: 'Canvas',
    description: 'Artifact tool',
  },
  // A chord, not a bare letter: every letter that reads as "image" is taken (`i` is Interact), and this is the chord users arrive with.
  'canvas.place-image': {
    keys: 'mod+shift+k',
    group: 'Canvas',
    description: 'Place an image',
  },
  'canvas.mode-design': {
    keys: 'd',
    group: 'Canvas',
    description: 'Design mode',
  },
  'canvas.mode-interact': {
    keys: 'p',
    group: 'Canvas',
    description: 'Preview mode',
  },

  'canvas.bring-to-front': {
    keys: ']',
    group: 'Canvas',
    description: 'Bring the selected node to front',
  },
  'canvas.send-to-back': {
    keys: '[',
    group: 'Canvas',
    description: 'Send the selected node to back',
  },
  'canvas.duplicate-frame': {
    keys: 'mod+d',
    group: 'Canvas',
    description: 'Duplicate the selected frame',
  },

  // `suppressInEditable` stays default: ⌘Z in the composer is text undo (ONL-2042).
  'canvas.undo': {
    keys: 'mod+z',
    group: 'Canvas',
    description: 'Undo the last canvas change',
  },
  'canvas.redo': {
    keys: 'mod+shift+z',
    group: 'Canvas',
    description: 'Redo the last undone canvas change',
  },
  // Figma's ⇧ view chords (ONL-1979) match by `event.code` (the character is +, _, !); a focused guest relays them from preload/guest.ts.
  'canvas.zoom-in-alt': {
    keys: 'shift+=',
    group: 'Canvas',
    description: 'Zoom in (⇧+)',
    allowRepeat: true,
  },
  'canvas.zoom-out-alt': {
    keys: 'shift+-',
    group: 'Canvas',
    description: 'Zoom out (⇧−)',
    allowRepeat: true,
  },
  'canvas.zoom-fit': {
    keys: 'shift+1',
    group: 'Canvas',
    description: 'Zoom to fit',
  },
  'canvas.zoom-selection': {
    keys: 'shift+2',
    group: 'Canvas',
    description: 'Zoom to selection',
  },
  'canvas.zoom-actual-alt': {
    keys: 'shift+0',
    group: 'Canvas',
    description: 'Zoom to 100% (⇧0)',
  },
  // Fires in the composer too: it is a chord, and the guide's own prompts land there (ONL-2468).
  'tips.toggle': {
    keys: 'mod+/',
    group: 'Global',
    description: 'Open or close Tips',
    suppressInEditable: false,
  },
} as const satisfies Record<string, ShortcutEntry>;

export type ShortcutId = keyof typeof SHORTCUTS;
