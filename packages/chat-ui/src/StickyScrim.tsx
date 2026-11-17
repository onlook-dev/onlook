/* A gradient, not `backdrop-filter`: a blur stack banded and cost five
   compositing layers per pinned row. Sampled easing: a
   linear ramp spends its darkest values over the text. */
const STOPS: [number, number][] = [
  [0, 1],
  [22, 0.94],
  [38, 0.82],
  [52, 0.64],
  [65, 0.45],
  [76, 0.28],
  [86, 0.14],
  [94, 0.05],
  [100, 0],
];

const RAMP = STOPS.map(
  ([at, alpha]) => `color-mix(in srgb, var(--color-background-body) ${alpha * 100}%, transparent) ${at}%`,
).join(', ');

/* 1 from the first pixel of travel: the transcript passes behind the row as soon as it sticks, while `--stuck` is still ramping. */
const STUCK = 'min(1, calc(var(--stuck, 0) * 1000))';

const LAYER = { position: 'absolute', insetInline: 'calc(var(--spacing-3) * -1)', zIndex: 'var(--studio-layer-behind)', pointerEvents: 'none' } as const;

export function StickyScrim(): React.JSX.Element {
  return (
    <div aria-hidden="true" data-testid="chat-sticky-scrim" style={{ display: 'contents' }}>
      {/* Overhangs scale with `--stuck`: an absolutely positioned box at `opacity: 0` still adds scrollable overflow in every unpinned row. */}
      <div
        style={{
          ...LAYER,
          insetBlockStart: `calc(var(--spacing-3) * -1 * ${STUCK})`,
          insetBlockEnd: `calc(var(--spacing-3) * -1 * ${STUCK})`,
          opacity: STUCK,
          background: 'var(--color-background-body)',
        }}
      />
      <div
        style={{
          ...LAYER,
          insetBlockStart: `calc(100% + var(--spacing-3) * ${STUCK})`,
          height: 'calc(var(--spacing-12) * var(--stuck, 0))',
          opacity: 'var(--stuck, 0)',
          background: `linear-gradient(to bottom, ${RAMP})`,
        }}
      />
    </div>
  );
}
