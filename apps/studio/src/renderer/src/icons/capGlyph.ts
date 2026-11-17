import type { CSSProperties } from 'react';

/* A glyph beside text is sized from that text's cap height: the drawing fills the middle two-thirds of its box,
   so 1.8cap draws a mark 1.2 capitals tall (ONL-2744). */
export const CAP_GLYPH = {
  display: 'block', alignSelf: 'center', marginBlock: 'auto',
  width: 'calc(1cap * 1.8)', height: 'calc(1cap * 1.8)',
} as const satisfies CSSProperties;

/** The same ratio inside a `Button`, whose icon slot forces a 16px font that `1cap` would otherwise measure (ONL-3069). */
export const CAP_GLYPH_ON_LABEL = {
  ...CAP_GLYPH, fontSize: 'var(--text-label-size)',
} as const satisfies CSSProperties;
