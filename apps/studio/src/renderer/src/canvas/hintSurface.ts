/* Tooltips and the tool preview both sit on a near-black ground; `Kbd`'s
   translucent fill and secondary ink are re-pointed so the cap matches its label. */
export const HINT_SURFACE = {
  '--color-neutral': 'rgba(255, 255, 255, 0.12)',
  '--color-text-secondary': 'var(--color-on-dark)',
  // Kbd sizes itself from these two; a tooltip's cap sits a step below the
  // library's default.
  '--spacing-5': 'var(--spacing-4)',
  '--text-supporting-size': 'var(--font-size-xs)',
} as React.CSSProperties;
