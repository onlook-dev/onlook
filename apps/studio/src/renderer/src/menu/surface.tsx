import { Text } from '@astryxdesign/core/Text';
import './menu.css';

/* `astryx-dropdown-menu` sits inside the element painting the surface, so a theme override cannot replace the fill (ONL-1908). */
export const MENU_SURFACE = {
  '--color-background-popover': 'var(--color-background-surface)',
  backdropFilter: 'blur(16px)',
  border: '0.5px solid var(--color-border)',
  boxShadow: 'var(--shadow-med)',
  borderRadius: 'var(--radius-container)',
  /* `isFullBleed` separators spend these and fall back to 0 without them. */
  '--container-padding-inline-start': 'var(--spacing-1)',
  '--container-padding-inline-end': 'var(--spacing-1)',
} as React.CSSProperties;

/** A hand-built popover menu's list, with the popover's own surface off: the same panel `MENU_SURFACE` gives a library menu. */
export const MENU_PANEL = {
  ...MENU_SURFACE,
  backgroundColor: 'var(--color-background-popover)',
  padding: 'var(--spacing-1)',
} as React.CSSProperties;

// Divider opacity stays separate from the menu's outer hairline (ONL-2563).
export const MENU_DIVIDER = {
  '--color-border': 'var(--color-overlay-pressed)',
} as React.CSSProperties;

/** A shade quieter than the row's label, and clear of it, so the label reads first (ONL-3127). */
const KEY_HINT = {
  color: 'var(--color-text-gray)',
  marginInlineStart: 'var(--spacing-4)',
} as React.CSSProperties;

/** A row's key glyphs, far right; glyphs, not sentences, so they skip `t()`. */
export function MenuKeyHint({ keys }: { keys: string }): React.JSX.Element {
  return (
    <Text type="supporting" color="inherit" style={KEY_HINT}>
      {keys}
    </Text>
  );
}
