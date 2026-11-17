import { LAYER } from '../overlay/layers.js';

/** Screen px. */
const LINE = 2;
const RING = 8;

/** The row needs `position: relative`. */
export function DropLine({
  edge,
  isAtListEnd = false,
}: {
  edge: 'before' | 'after';
  /** The first row's top or the last row's bottom: a scrolling list clips anything past it, so the ring sits just inside. */
  isAtListEnd?: boolean;
}): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      data-testid="drop-line"
      style={{
        position: 'absolute',
        insetInline: 0,
        [edge === 'before' ? 'top' : 'bottom']: isAtListEnd ? (RING - LINE) / 2 : -LINE / 2,
        height: LINE,
        display: 'flex',
        alignItems: 'center',
        zIndex: LAYER.raised,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          flex: 'none',
          boxSizing: 'border-box',
          width: RING,
          height: RING,
          borderRadius: '50%',
          border: `${String(LINE)}px solid var(--color-accent)`,
          // The panel's own ground, so the ring reads hollow over any row.
          backgroundColor: 'var(--color-background-body)',
        }}
      />
      <div style={{ flex: 1, height: LINE, backgroundColor: 'var(--color-accent)' }} />
    </div>
  );
}
