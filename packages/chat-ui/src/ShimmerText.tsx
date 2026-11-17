/** Only the clone's gradient moves, under a fixed glyph mask: a moving mask forces paint every frame (ONL-2200). */
import { createContext, type ComponentProps, type ReactNode } from 'react';
import { Text } from '@astryxdesign/core/Text';

const SHIMMER_HREF = 'studio-chat-tool-shimmer';

/** True inside the clone: its glyphs are a static mask, so an animation in it freezes mid-move. */
export const ShimmerCloneContext = createContext(false);

// Tuned by eye (ONL-2200).
export const SHIMMER_SWEEP_MS = 1300;
/** Per-row stagger, negative: row N starts N steps INTO the cycle. */
export const SHIMMER_STAGGER_MS = Math.round((-23 / 100) * SHIMMER_SWEEP_MS);
/** Half the crest's width, as a fraction of the period. */
export const SHIMMER_CREST_FRACTION = 31 / 73;

const SWEEP_MS = SHIMMER_SWEEP_MS;
export const SHIMMER_PERIOD_CH = 73;
const SPREAD_RATIO = 31 / 73;
export const SHIMMER_CREST_ALPHA = 80;
const STAGGER_DELAY_MS = SHIMMER_STAGGER_MS;

/* Custom properties keep one hoisted stylesheet however many periods are in play. */
const PERIOD = 'var(--studio-shimmer-period)';
const SPREAD = 'var(--studio-shimmer-spread)';

const SHIMMER_STYLE = `
@keyframes studio-shimmer-sweep {
  from { translate: 0 0; }
  to   { translate: ${PERIOD} 0; }
}
.studio-shimmer-wrapper {
  position: relative;
  /* inline-block would take the parent's line-height strut, not the text's. */
  display: inline-flex;
  vertical-align: top;
  /* min-width:auto refuses to shrink below the text and pushes the row's next item out (ONL-2485). */
  min-width: 0;
  max-width: 100%;
}
.studio-shimmer-wrapper > :first-child {
  min-width: 0;
}
.studio-shimmer-clone {
  position: absolute;
  inset: 0;
  padding: inherit;
  overflow: clip;
  color: transparent;
  contain: var(--studio-shimmer-contain, strict);
  pointer-events: none;
}
@supports (-webkit-mask-clip: text) {
  .studio-shimmer-clone {
    mask-image: linear-gradient(white, white);
    -webkit-mask-clip: text;
    mask-clip: text;
  }
}
@media (prefers-reduced-motion: reduce) {
  .studio-shimmer-clone { display: none; }
}
/* Resting under hasStableLayers: the clone still lays out, but paints nothing. */
.studio-shimmer-wrapper[data-shimmer-resting] .studio-shimmer-clone::after {
  content: none;
}
.studio-shimmer-clone::after {
  content: '';
  position: absolute;
  inset: 0 auto 0 calc(-1 * ${PERIOD});
  width: calc(100% + 2 * ${PERIOD});
  background: linear-gradient(
    90deg,
    transparent calc(50% - ${SPREAD}),
    var(--studio-shimmer-crest) 50%,
    transparent calc(50% + ${SPREAD})
  );
  background-size: ${PERIOD} 100%;
  background-repeat: repeat-x;
  will-change: transform;
  pointer-events: none;
  animation: studio-shimmer-sweep var(--studio-shimmer-sweep, ${String(SWEEP_MS)}ms) linear infinite;
  animation-delay: calc(var(--studio-shimmer-phase, 0) * ${String(STAGGER_DELAY_MS)}ms);
  filter: var(--studio-shimmer-glow, none);
}
`;

export interface ShimmerTextProps {
  children: ReactNode;
  isActive: boolean;
  type?: ComponentProps<typeof Text>['type'];
  size?: ComponentProps<typeof Text>['size'];
  weight?: ComponentProps<typeof Text>['weight'];
  /** The default crest is the ink reserved for what the human said; a caller below the prose passes its own. */
  base?: string;
  crest?: string;
  /** Off for small, dense labels: at button size the blur reads as a stray grey box. */
  hasGlow?: boolean;
  /** Lands on the wrapper: each property either inherits into both layers or belongs to the flex participant (ONL-2194). */
  style?: ComponentProps<typeof Text>['style'];
  maxLines?: ComponentProps<typeof Text>['maxLines'];
  hasTruncateTooltip?: ComponentProps<typeof Text>['hasTruncateTooltip'];
  ref?: ComponentProps<typeof Text>['ref'];
  /** Resting only: the active branch paints `base` (ONL-2194). */
  color?: ComponentProps<typeof Text>['color'];
  /** A row index, so concurrently shimmering rows do not pulse in lockstep (ONL-2200). */
  phase?: number;
  /** Roughly the label's width; the default suits transcript rows only. */
  periodCh?: number;
  sweepMs?: number;
  /** Half the crest's width; the default scales with the period and floods a label shorter than it. */
  crestCh?: number;
  /** For children that animate across the active flip, which the single-`Text` rest would unmount; a second layout at rest, so not for lists. */
  hasStableLayers?: boolean;
}

export function ShimmerText({
  children,
  isActive,
  type = 'body',
  size,
  weight = 'medium',
  base = 'var(--color-text-gray)',
  crest = 'var(--color-text-primary)',
  hasGlow = true,
  style,
  maxLines,
  hasTruncateTooltip,
  ref,
  color = 'inherit',
  phase = 0,
  periodCh = SHIMMER_PERIOD_CH,
  sweepMs,
  crestCh,
  hasStableLayers = false,
}: ShimmerTextProps): React.JSX.Element {
  const passthrough = {
    ...(maxLines !== undefined ? { maxLines } : {}),
    ...(hasTruncateTooltip !== undefined ? { hasTruncateTooltip } : {}),
  };

  if (!isActive && !hasStableLayers) {
    return (
      <Text
        type={type}
        {...(size ? { size } : {})}
        weight={weight}
        color={color}
        {...(style ? { style } : {})}
        {...passthrough}
        {...(ref !== undefined ? { ref } : {})}
      >
        {children}
      </Text>
    );
  }

  const wrapperStyle = {
    ...style,
    '--studio-shimmer-crest': `color-mix(in srgb, ${crest} ${String(SHIMMER_CREST_ALPHA)}%, transparent)`,
    '--studio-shimmer-phase': phase,
    '--studio-shimmer-period': `${String(periodCh)}ch`,
    '--studio-shimmer-spread': `${String(crestCh ?? periodCh * SPREAD_RATIO)}ch`,
    ...(sweepMs === undefined ? {} : { '--studio-shimmer-sweep': `${String(sweepMs)}ms` }),
    ...(hasGlow
      ? {
          '--studio-shimmer-glow': `drop-shadow(0 0 10px color-mix(in srgb, ${crest} 40%, transparent))`,
          // `contain: strict` paint-contains the clone and would crop the glow's drop-shadow.
          '--studio-shimmer-contain': 'none',
        }
      : {}),
  } as React.CSSProperties;
  // `Text` sets line-height by class, so a caller's leading stops at the wrapper unless restated.
  const leading = style?.lineHeight !== undefined ? { lineHeight: style.lineHeight } : {};

  return (
    <>
      <style href={SHIMMER_HREF} precedence="medium">
        {SHIMMER_STYLE}
      </style>
      <span
        className="studio-shimmer-wrapper"
        {...(isActive ? { 'data-tool-shimmer': '' } : { 'data-shimmer-resting': '' })}
        style={wrapperStyle}
      >
        <Text
          type={type}
          {...(size ? { size } : {})}
          weight={weight}
          color={isActive ? 'inherit' : color}
          display="block"
          style={{ ...(isActive ? { color: base } : {}), ...leading }}
          {...passthrough}
          {...(ref !== undefined ? { ref } : {})}
        >
          {children}
        </Text>
        <Text
          type={type}
          {...(size ? { size } : {})}
          weight={weight}
          color="inherit"
          display="block"
          aria-hidden="true"
          className="studio-shimmer-clone"
          style={leading}
          {...(maxLines !== undefined ? { maxLines } : {})}
          hasTruncateTooltip={false}
        >
          <ShimmerCloneContext value={true}>{children}</ShimmerCloneContext>
        </Text>
      </span>
    </>
  );
}
