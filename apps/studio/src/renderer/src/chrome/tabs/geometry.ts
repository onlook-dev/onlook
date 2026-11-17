export const TAB_HEIGHT = 36;

export const TAB_WIDTH = 200;

/** Not from the design, which draws one width: eight characters of a real name read at the floor. Re-derive if the label's type changes; REGISTER.md §19. */
export const MIN_TAB_WIDTH = 128;

export const TAB_PADDING_INLINE = 12;

/** Neither is reserved: the sum is the width the status dot animates open and closed (ONL-2364). */
export const STATUS_DOT_SIZE = 6;
export const STATUS_DOT_GAP = 6;

/** Overlays the label's faded tail rather than taking width from it. */
export const CLOSE_SIZE = 24;

export const LABEL_FADE = 16;

/** 0.5 divider + 5 + the 32 chip + 4: off-centre deliberately, the divider carries visual weight. */
export const PLUS_WIDTH = 41;
export const PLUS_INSET = 4;
export const PLUS_PADDING = 6;
export const PLUS_PADDING_BLOCK = 4;
/** The divider is a 0.5px border on the start side; 4.5 makes the clear band 5. */
export const PLUS_INSET_START = 4.5;

export const OVERFLOW_FADE_WIDTH = 48;

export const DIVIDER = '0.5px solid var(--color-border)';

/** Reserved on every tab: without it activating one moves the strip by half a point. */
export const DIVIDER_RESERVED = '0.5px solid transparent';
