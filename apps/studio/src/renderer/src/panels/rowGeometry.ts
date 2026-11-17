export const HAIRLINE = 'var(--border-width) solid var(--color-border)';
export { PANEL_SURFACE as SURFACE } from './surface.js';
/** A var, not the Teal/101 literal: the literal cannot follow an accent scope. */
export const SELECTED_INK = 'var(--studio-on-accent-muted)';

/**
 * The design's leading verbatim, because Astryx lands on 20px at both 12px and
 * 13px and the difference compounds down a list — left on it the selected row
 * is 28px instead of 23. `apps/studio/src/theme/REGISTER.md` §7.1 leaves this call to the
 * dense surfaces. `hasCapsize` overshoots in the other direction.
 */
export const DESIGN_LEADING_12 = 'normal';

export const LIST_PADDING_INLINE = 10;
export const ROW_PADDING_INLINE = 8;
export const ROW_PADDING_BLOCK = 6;
/** The row's icon/label gap, on the spacing scale (`gap={ROW_GAP}`). */
export const ROW_GAP = 2;
/** The design's 14, off the icon ramp — see `DesignRow`'s note. */
export const ROW_ICON_BOX = 14;
/** The caret's box, reserved on every design row so a Section's glyph lines up with a plain row's. */
export const ROW_CARET_BOX = 12;
/** One level of nesting: the caret box plus the row's gap, so a child's glyph sits under its Section's. */
export const ROW_INDENT = ROW_CARET_BOX + 4;
/**
 * Half the visual space between rows, carried by each row as a transparent
 * block border so the space is still CLICKABLE. Two adjacent rows contribute
 * one each, so the gap a user sees is twice this.
 */
export const ROW_GAP_BORDER = 2;

/** The rows touch: the transparent block border is the separation AND the hit area, so a `gap` here would be unclickable. */
export const ROW_BOX: React.CSSProperties = {
  appearance: 'none',
  border: 0,
  borderBlock: `${String(ROW_GAP_BORDER)}px solid transparent`,
  backgroundClip: 'padding-box',
  margin: 0,
  font: 'inherit',
  textAlign: 'inherit',
  cursor: 'pointer',
  paddingInline: ROW_PADDING_INLINE,
  paddingBlock: ROW_PADDING_BLOCK,
  borderRadius: 'var(--radius-element)',
};

/** 18 = the scroller's 10 + the row's own 8, so a section label lines up with the ROW's ink. */
export const SECTION_PADDING_INLINE = LIST_PADDING_INLINE + ROW_PADDING_INLINE;

/** No padding below: the seat under a tip, or `FOOT_EDGE_GAP` when none is drawn, is the space. */
export const TIP_PADDING = 'var(--spacing-3) var(--spacing-3) 0';
/** The rail's foot elements sit `--spacing-2` off its bottom edge, level with the help door. */
export const FOOT_EDGE_GAP = 'var(--spacing-2)';
