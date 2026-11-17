import { Stack } from '@astryxdesign/core/Layout';

import { frameRingScale } from './geometry.js';

// An element, not an `outline` on the viewport Stack: an outline paints under the `<webview>`'s native surface and leaves stale pixels when the box shrinks.
// At rest the ring is a hairline, not nothing: the card colour is near the canvas value.
/** Selected and hovered alike. On a 1px base, never `--border-width`: a selection stroke is not a hairline. */
const EMPHASIS_WEIGHT = 1.75;

export function FrameRing({
  zoom,
  isEmphasised,
  accent,
}: {
  zoom?: number;
  isEmphasised: boolean;
  accent?: 'artifact';
}): React.JSX.Element {
  const width = zoom === undefined
    ? `calc(${isEmphasised ? String(EMPHASIS_WEIGHT) : '0.5'}px / max(var(--frame-zoom, 1), 0.01))`
    : isEmphasised
      ? `calc(1px * ${String(EMPHASIS_WEIGHT * frameRingScale(zoom))})`
      : `calc(0.5px * ${String(frameRingScale(zoom))})`;
  return (
    <Stack
      aria-hidden="true"
      data-testid="frame-ring"
      data-emphasis={isEmphasised ? 'active' : 'rest'}
      style={{
        position: 'absolute',
        inset: `calc(-1 * ${width})`,
        // An artifact at rest shows no edge; it wears the accent only when emphasised (ONL-2593).
        border: `${width} solid ${isEmphasised ? 'var(--color-accent)' : accent === 'artifact' ? 'transparent' : 'var(--color-border)'}`,
        pointerEvents: 'none',
      }}
    />
  );
}
