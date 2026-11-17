/** Metadata only; does not gate firing. */
type ShortcutGroup = 'Global' | 'Canvas' | 'Frame' | 'Chat';

export interface ShortcutEntry {
  keys: string;
  group: ShortcutGroup;
  description: string;
  hidden?: boolean;
  /** Default `true`; a bare-letter binding otherwise fires mid-sentence. */
  suppressInEditable?: boolean;
  /** Default `false`; a repeated toggle strobed 30 times a second. Stepped bindings only. */
  allowRepeat?: boolean;
  /** A capture match swallows the keystroke app-wide; set only when something else demonstrably claims the combo first. */
  capture?: boolean;
}
