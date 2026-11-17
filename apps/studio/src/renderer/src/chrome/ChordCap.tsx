/**
 * The key cap shown over a band control while ⌘ is held (ONL-2364). The band's
 * hairline, never an accent: a coloured chip on every control at once drowns
 * the status dots, which ARE statuses.
 *
 * ⚠️ Not a button, and not a press target — it legends a key already held.
 * ⚠️ `⌘` does NOT go through `t()`: it is the glyph on the key, not a sentence.
 */
import type { CSSProperties } from 'react';

const CHORD_SYMBOL = '⌘';
export const CHORD_WIDTH = 28;
export const CHORD_HEIGHT = 18;

const CAP: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: CHORD_WIDTH,
  height: CHORD_HEIGHT,
  fontSize: 'var(--text-supporting-size)',
  lineHeight: 1,
  fontWeight: 'var(--font-weight-medium)',
  fontVariantNumeric: 'tabular-nums',
  color: 'var(--color-text-primary)',
  background: 'var(--color-overlay-hover)',
  border: '0.5px solid var(--color-border)',
  borderRadius: 'var(--radius-element)',
  pointerEvents: 'none',
};

export function ChordCap({
  keyLabel,
  isShown,
  testId,
}: {
  keyLabel: string;
  isShown: boolean;
  testId: string;
}): React.JSX.Element {
  return (
    <span
      data-testid={testId}
      aria-hidden
      style={{ ...CAP, visibility: isShown ? 'visible' : 'hidden' }}
    >
      {isShown ? `${CHORD_SYMBOL}${keyLabel}` : ''}
    </span>
  );
}
