import { useCallback, useEffect, useRef } from 'react';
import { HStack } from '@astryxdesign/core/Layout';
import { Button } from '@astryxdesign/core/Button';
import { Stack } from '@astryxdesign/core/Stack';
import { ToggleButton, ToggleButtonGroup } from '@astryxdesign/core/ToggleButton';

import { t } from '@studio/i18n';
import {
  GlyphSelect,
  GlyphPan,
  GlyphFrame,
  GlyphSection,
  GlyphImage,
  GlyphText,
  GlyphArtifact,
  GlyphPlayCircle,
  GlyphStopCircle,
  GlyphLoadingCircle,
} from '../icons/glyphs.js';
import { PANEL_SURFACE } from '../panels/surface.js';
import { type CanvasTool } from './store.js';
import { ToolPreviewPopover } from './toolPreview/ToolPreviewPopover.jsx';
import { useToolPreview } from './toolPreview/useToolPreview.js';
import { useSpring } from './spring.js';
import { ShimmerText } from '@studio/chat-ui';
import { LAYER } from '../overlay/layers.js';
import './canvas.css';

/**
 * Not Astryx's `Toolbar`: its `Section` owns a 16px inline padding, so the design's 4px frame is unreachable through the public API. The frame is an `HStack` with `role="toolbar"`.
 * The control label renders at 13px (`--text-label-size`, a theme role) against the design's 12; the measured widths below move with it.
 */

const PREVIEW_SLOT = { display: 'contents' } as const;

/**
 * `running` means a port answered and it is ours, never the agent's claim (`main/server/owner.ts`).
 * ⚠️ A pending state carries a spinner, not the stop glyph the design draws: a stop glyph on a server that has not started reads as an action the user could take. `stopping` reuses `starting`'s treatment (ONL-1931).
 */
type CanvasToolbarState = 'idle' | 'starting' | 'running' | 'stopping';

export interface CanvasToolbarProps {
  state?: CanvasToolbarState;
  tool?: CanvasTool;
  onToolChange?: (tool: CanvasTool) => void;
  /** Opens the file picker at once: placing an image has no armed mode to enter (ONL-2486). */
  onPlaceImage?: () => void;
  onRunToggle?: () => void;
  /** Whether pressing this can do anything: a control that submits into nothing looks identical to one that worked. */
  isRunEnabled?: boolean;
  /** What `starting` says instead of its default — the setup machine's stage name (ONL-2179). */
  pendingLabel?: string;
  isPreview?: boolean;
  hasFrames?: boolean;
  /** The Section tool sits behind the `sections` flag (ONL-2661). */
  hasSectionTool?: boolean;
  /** Off while an import's setup runs: the Left Rail's foot says where it is (ONL-2961). */
  hasRunControl?: boolean;
}

/**
 * Fixed, not intrinsic: the labels differ in length, and the centred cluster would jog sideways on every state change. Geometry, never the theme's.
 * ⚠️ THE PENDING LABELS ARE THE FLOOR, NOT THE RESTING ONES: `Stopping...` is 67.60px at Inter 500 13px, more than twice `Start`. The box is `9 (pad start) + 20 (glyph) + 8 (gap) + 67.60 + 12 (pad end) = 116.60`; 122 leaves slack.
 * ⚠️ Re-measure when the copy changes. Below the floor every state ellipsises and nothing fails.
 */
const RUN_WIDTH = '122px';

/**
 * Trimmed from Astryx's 12 for optical balance (ONL-1911): an eye's number, not a derivation.
 * ⚠️ The cause is area density, not the glyph's own balance: a hollow ring sits against a solid block of text. Re-judge the number if this icon stops being a hollow ring (ONL-1936).
 */
const RUN_PADDING_START = 9;

const SURFACE = {
  isolation: 'isolate',
  border: '0.5px solid var(--color-border)',
  borderRadius: 'var(--radius-container)',
  boxShadow: 'var(--shadow-med)',
  padding: 'var(--spacing-1)',
} as const;

/**
 * ⚠️ Astryx clamps a Button's icon to a fixed box — 16px at `sm` AND `md`, 20px
 * at `lg` (`iconSizeStyles`, Button.js) — and silently scales a larger SVG down
 * to it. This number only lands because the controls below are `size="lg"`;
 * change a control's size and you silently resize its glyph (ONL-1936).
 */
const GLYPH = 20;

const FROST = {
  ...PANEL_SURFACE,
  position: 'absolute',
  inset: 0,
  zIndex: LAYER.behind,
  borderRadius: 'inherit',
  pointerEvents: 'none',
} as const;

/** The rule between the view tools and the object tools. Height is the control's
 *  own, inset a little so it reads as a separator and not a third edge. */
const DIVIDER = {
  flex: '0 0 auto',
  alignSelf: 'center',
  width: '0.5px',
  height: '20px',
  /* 3px of air per side, reached by pulling back the group's own 4px gap: flush reads as a hard edge, and the full gap makes the rule a fourth item in the row. */
  marginInline: 'calc(3px - var(--spacing-1))',
  backgroundColor: 'var(--color-border)',
} as const;

/** The family draws a static ring, so the spin reuses `frame-reload-turn` from `styles.css`. `flex: 0 0 auto` keeps the ring's 20px box; a bare flex item renders a sliver. */
const RUN_SPINNER = {
  display: 'flex',
  flex: '0 0 auto',
  animation: 'frame-reload-turn 900ms linear infinite',
  /* Its own layer, so the rotation runs on the compositor instead of joining
     the shimmer's main-thread repaint — the two start in the SAME frame as the
     chat message this button submits. */
  willChange: 'transform',
} as const;

/**
 * `size="lg"` is taken for its 20px ICON SLOT, not its height, and Astryx ties
 * both to the one prop — so each control takes `lg` and pins the height back to
 * the `md` token. Dropping the pin makes every control 4px taller.
 */
const CONTROL_HEIGHT = 'var(--size-element-md)';

/** The tool chip's and the run button's raised fill is the theme's, re-pointed per component in `studioTheme.ts`: a root-level re-point of `--color-overlay-pressed` is shadowed by the theme's `@scope`d block. */

/** `hiddenMargin` swallows the row gap a folded group would leave behind. */
function Collapse({
  isHidden,
  shownMargin = 0,
  hiddenMargin = -4,
  children,
}: {
  isHidden: boolean;
  shownMargin?: number;
  hiddenMargin?: number;
  children: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const shownRef = useRef(isHidden ? 0 : 1);
  const paint = useCallback((shown: number): void => {
    shownRef.current = shown;
    const el = box.current;
    if (!el) return;
    // The row, not `el.scrollWidth`: right-pinned content overflows to the left, which scroll extents never count.
    const natural = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
    const clamped = Math.max(0, Math.min(1, shown));
    el.style.width = `${String(natural * clamped)}px`;
    el.style.opacity = String(clamped * clamped * (3 - 2 * clamped));
    el.style.marginInlineStart = `${String(hiddenMargin + (shownMargin - hiddenMargin) * clamped)}px`;
  }, [hiddenMargin, shownMargin]);
  useSpring(isHidden ? 0 : 1, paint);
  // The row's width can change at rest (a font load, a locale switch); the measured width follows it.
  useEffect(() => {
    const row = box.current?.firstElementChild;
    if (!row) return undefined;
    const observer = new ResizeObserver(() => paint(shownRef.current));
    observer.observe(row);
    return () => observer.disconnect();
  }, [paint]);
  return (
    <div
      ref={box}
      inert={isHidden}
      aria-hidden={isHidden || undefined}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden', flexShrink: 0 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)', width: 'max-content', flexShrink: 0 }}>{children}</div>
    </div>
  );
}

export function CanvasToolbar({
  state = 'idle',
  tool = 'select',
  onToolChange,
  onPlaceImage,
  onRunToggle,
  isRunEnabled = false,
  pendingLabel,
  isPreview = false,
  hasFrames = true,
  hasSectionTool = false,
  hasRunControl = true,
}: CanvasToolbarProps): React.JSX.Element {
  // Derived once so the variant, the glyph and the label cannot come apart.
  const isRunning = state === 'running';
  const isPending = state === 'starting' || state === 'stopping';
  const isEngaged = isRunning || isPending;
  const runLabel = isRunning
    ? t('canvas.run.stop')
    : state === 'starting'
      ? (pendingLabel ?? t('canvas.run.starting'))
      : state === 'stopping'
        ? t('canvas.run.stopping')
        : t('canvas.run.start');

  const preview = useToolPreview();

  return (
    <HStack
      ref={preview.rootRef}
      onPointerOver={preview.onEnter}
      onPointerLeave={preview.onLeave}
      onPointerDownCapture={preview.onPointerDown}
      onFocusCapture={preview.onEnter}
      onBlurCapture={preview.onLeave}
      role="toolbar"
      className="canvas-toolbar"
      aria-label={t('canvas.toolbar.label')}
      align="center"
      gap={1}
      style={{ ...SURFACE, position: 'relative' }}
      data-testid="canvas-toolbar"
      // On the root: `ToggleButtonGroup` drops any data-* it does not destructure, so the group cannot carry the armed tool.
      data-tool={tool}
    >
      <span aria-hidden="true" style={FROST} />
      <ToolPreviewPopover state={preview.state} id={preview.popoverId} running={isEngaged} hasFrames={hasFrames} />
      <ToggleButtonGroup
        label={t('canvas.tools.label')}
        type="single"
        size="lg"
        value={tool}
        onChange={(value) => {
          // The group reports a click on the active toggle as null. Only an object tool's untoggle disarms to select; pan and select re-clicks are no-ops.
          if (value === null) {
            if (tool === 'frame' || tool === 'text' || tool === 'artifact' || tool === 'section') onToolChange?.('select');
            return;
          }
          if (
            value === 'select' ||
            value === 'pan' ||
            value === 'frame' ||
            value === 'text' ||
            value === 'section' ||
            value === 'artifact'
          ) {
            onToolChange?.(value);
          }
        }}
        data-testid="canvas-tool"
      >
        {/* `display: contents` spans carry the preview id: ToggleButton drops data attributes. */}
        <span data-preview="select" style={PREVIEW_SLOT}>
          <ToggleButton
            value="select"
            label={t('canvas.tool.select')}
            isIconOnly
            icon={<GlyphSelect size={GLYPH} color="inherit" />}
            style={{ height: CONTROL_HEIGHT }}
          />
        </span>
        <span data-preview="pan" style={PREVIEW_SLOT}>
          <ToggleButton
            value="pan"
            label={t('canvas.tool.pan')}
            isIconOnly
            icon={<GlyphPan size={GLYPH} color="inherit" />}
            style={{ height: CONTROL_HEIGHT }}
          />
        </span>
        {/* The tools past the rule ADD something to the canvas; select and pan
            only change how you look at it. The rule marks that break.

            ⚠️ A non-ToggleButton child inside the group: the group's contract
            says ToggleButton children, and it already tolerates the preview
            spans around each one. This is inert — no value, no focus — so
            the group's roving focus and single-select still see the buttons.
            If a core bump ever makes the group map children by index, this is
            the first thing to check. */}
        <Collapse isHidden={isPreview} shownMargin={-1}>
          <Stack
            aria-hidden="true"
            data-testid="canvas-tool-divider"
            style={{ ...DIVIDER, marginInlineStart: 0 }}
          />
          <span data-preview="frame" style={PREVIEW_SLOT}>
            <ToggleButton
              value="frame"
              label={t('canvas.tool.frame')}
              isIconOnly
              icon={<GlyphFrame size={GLYPH} color="inherit" />}
              style={{ height: CONTROL_HEIGHT }}
            />
          </span>
          {/* The object side of the rule: this adds a node too. Click-to-place where the
              Window tool drags out a box — two gestures, deliberately (ONL-2486). */}
          {hasSectionTool && <span data-preview="section" style={PREVIEW_SLOT}>
            <ToggleButton value="section" label={t('canvas.tool.section')} isIconOnly
              icon={<GlyphSection size={GLYPH} color="inherit" />} style={{ height: CONTROL_HEIGHT }} />
          </span>}
          <span data-preview="text" style={PREVIEW_SLOT}>
            <ToggleButton
              value="text"
              label={t('canvas.tool.text')}
              isIconOnly
              icon={<GlyphText size={GLYPH} color="inherit" />}
              style={{ height: CONTROL_HEIGHT }}
            />
          </span>
          {/* Drawn to a size, so an armed mode like the Window tool rather than the image's
              click-to-place; left of Start, as the Designs section shows (ONL-2568). */}
          <span data-preview="artifact" style={PREVIEW_SLOT}>
            <ToggleButton
              value="artifact"
              label={t('canvas.tool.artifact')}
              isIconOnly
              icon={<GlyphArtifact size={GLYPH} color="inherit" />}
              style={{ height: CONTROL_HEIGHT }}
            />
          </span>
        </Collapse>
      </ToggleButtonGroup>

      {/* The object side of the rule, and OUTSIDE the toggle group: placing an image arms
          nothing, so the group's single-select and roving focus must not claim it (ONL-2486). */}
      <Collapse isHidden={isPreview}>
        <Button
          variant="ghost"
          size="lg"
          label={t('canvas.tool.image')}
          isIconOnly
          icon={<GlyphImage size={GLYPH} color="inherit" />}
          onClick={onPlaceImage}
          data-testid="canvas-place-image"
          data-preview="image"
          style={{ height: CONTROL_HEIGHT }}
        />
      </Collapse>

      <Collapse isHidden={!hasRunControl}>
        <Button
          variant={isEngaged ? 'secondary' : 'primary'}
          size="lg"
          label={runLabel}
          /* The transitional states shimmer their label. `children` overrides only
             the VISIBLE text — `label` stays the accessible name, so a screen
             reader hears `Starting…` rather than a gradient-clipped span. */
          {...(isPending
            ? {
                children: (
                  <ShimmerText isActive weight="medium" hasGlow={false}>
                    {runLabel}
                  </ShimmerText>
                ),
              }
            : {})}
          /**
           * ⚠️ `isLoading` is deliberately not used (ONL-1914): it renders an overlay, paints the content wrapper `color: transparent` and forces the button disabled. The spinner goes in the icon slot, so the control keeps one shape across its states.
           * ⚠️ A spinner's box is `diameter + border * 2` (sm 14, md 20, lg 24): `lg` overflows the 20px slot and clips itself, with no error.
           */
          icon={
            isPending ? (
              /* The ICON FAMILY's loading ring, not Astryx's `Spinner` — beside
                 the play/stop glyphs a second family's mark read as foreign. It
                 does not spin itself, so the rotation is ours. */
              <Stack style={RUN_SPINNER}>
                <GlyphLoadingCircle size={GLYPH} />
              </Stack>
            ) : isRunning ? (
              <GlyphStopCircle size={GLYPH} />
            ) : (
              <GlyphPlayCircle size={GLYPH} />
            )
          }
          /*
           * Starting is interruptible: the press falls through to `onRunToggle`, which takes the stop branch for anything that is not `idle`.
           * `stopping` stays inert: a second stop would only re-ask.
           */
          onClick={state === 'stopping' ? undefined : onRunToggle}
          aria-busy={isPending || undefined}
          isDisabled={!isRunEnabled}
          data-testid="canvas-run"
          data-preview="run"
          // The state as an ATTRIBUTE: every rendered string here is translatable,
          // so no label is a stable handle for an assertion.
          data-run-state={state}
          // The one accent-filled button in the chrome; the theme's
          // `primary` is the neutral CTA, so idle opts back in inline.
          //
          // ⚠️ The engaged `color` is not decoration — deleting it re-opens
          // ONL-1914. `variant:secondary` carries the app-wide ink model (grey at
          // rest, white on hover), and resting grey read as disabled on a control
          // that is the opposite of disabled.
          style={{
            width: RUN_WIDTH,
            height: CONTROL_HEIGHT,
            paddingInlineStart: RUN_PADDING_START,
            ...(isEngaged
              ? { color: 'var(--color-icon-primary)' }
              : {
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-on-accent)',
                }),
          }}
        />
      </Collapse>
    </HStack>
  );
}
