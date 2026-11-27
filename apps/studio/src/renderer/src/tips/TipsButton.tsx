import { Button } from '@astryxdesign/core/Button';
import { useShortcut } from '../shortcuts/useShortcut.js';
import { t } from '@studio/i18n';
import { GlyphTips } from '../icons/glyphs.js';
import { toggleTips, useTipsStore } from './store.js';
import { LAYER } from '../overlay/layers.js';

const SHIMMER_HREF = 'studio-tips-shimmer';
// Two lights travel the pill's own border from opposite sides in one steady lap, with a bloom behind them, then rest; it repeats until Tips is first opened.
const SHIMMER_RULES = `
.tips-pill-ring, .tips-pill-bloom { position: absolute; inset: -1px; border-radius: inherit; pointer-events: none; }
.tips-pill-ring { padding: 1.5px; -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude; }
.tips-pill-bloom { z-index: ${LAYER.behind}; opacity: 0; box-shadow: 0 0 22px 3px rgba(255,255,255,.14), 0 0 6px rgba(255,255,255,.08);
  animation: tips-bloom 9s ease-in-out 1.6s infinite; will-change: opacity; }
@keyframes tips-bloom { 0%, 30%, 100% { opacity: 0; } 14% { opacity: 1; } }
.tips-pill-light { position: absolute; top: 0; left: 0; border-radius: 50%; offset-path: padding-box; offset-rotate: 0deg;
  offset-anchor: center; opacity: 0; animation: tips-lap 9s linear 1.6s infinite; will-change: transform, opacity; }
.tips-pill-ring .tips-pill-light { width: 44px; height: 44px;
  background: radial-gradient(closest-side, rgba(255,255,255,.95), rgba(255,255,255,.35) 45%, transparent); }
.tips-pill-light.is-counter { --tips-from: 50%; }
@keyframes tips-lap {
  0% { offset-distance: calc(var(--tips-from, 0%) + 0%); opacity: 0; }
  4% { offset-distance: calc(var(--tips-from, 0%) + 13%); opacity: .55; }
  8% { offset-distance: calc(var(--tips-from, 0%) + 28%); opacity: 1; }
  20% { offset-distance: calc(var(--tips-from, 0%) + 72%); opacity: 1; }
  24% { offset-distance: calc(var(--tips-from, 0%) + 87%); opacity: .55; }
  28%, 100% { offset-distance: calc(var(--tips-from, 0%) + 100%); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) { .tips-pill-light, .tips-pill-bloom { animation: none; } }
`;

/** Over the left panel, or beside the canvas help button when the panel is hidden; under the guide’s backdrop, so it never appears or vanishes as the guide toggles. With no inset it sits in flow, as in the Left Rail foot. */
export function TipsButton({
  insetInlineStart,
  bottom,
  className,
  ref,
}: {
  insetInlineStart?: string;
  bottom?: string;
  /** The seat's own class, which is how the corner hides the pill on a canvas with no room for it. */
  className?: string;
  /** The pill's own box, which the toast lane measures where the pill floats over the canvas (ONL-3182). */
  ref?: React.Ref<HTMLSpanElement>;
}): React.JSX.Element {
  const hasOpened = useTipsStore((s) => s.hasOpened);
  return (
    <span
      ref={ref}
      {...(className === undefined ? {} : { className })}
      style={{
        position: insetInlineStart === undefined && bottom === undefined ? 'relative' : 'absolute',
        insetInlineStart,
        bottom,
        display: 'inline-flex',
        pointerEvents: 'auto',
        borderRadius: 'var(--radius-full)',
        isolation: 'isolate',
      }}
    >
      <style href={SHIMMER_HREF} precedence="medium">
        {SHIMMER_RULES}
      </style>
      <Button
        variant="secondary"
        size="lg"
        label={t('tips.button')}
        icon={<GlyphTips mode="raw" size={16} />}
        onClick={() => {
          toggleTips('button');
        }}
        data-testid="canvas-tips"
        // The bulb is narrow inside its box: tighter on its side, so the gaps read even around glyph and word.
        style={{ borderRadius: 'var(--radius-full)', boxShadow: 'var(--shadow-med)', gap: 3, paddingInlineStart: 9, paddingInlineEnd: 14 }}
      />
      {hasOpened ? null : (
        <>
          {/* Behind the pill: the bloom swells past its edge while the lights run. */}
          <span className="tips-pill-bloom" aria-hidden="true" />
          <span className="tips-pill-ring" aria-hidden="true">
            <span className="tips-pill-light" />
            <span className="tips-pill-light is-counter" />
          </span>
        </>
      )}
    </span>
  );
}

/** ⌘/ from anywhere on the Canvas screen; the open dialog handles its own ⌘/, since shortcuts are muted under a modal. */
export function useTipsShortcut(): void {
  useShortcut('tips.toggle', () => {
    toggleTips('shortcut');
  });
}
