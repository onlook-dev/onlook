import {
  useEffect,
  useInsertionEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { HStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { Tooltip } from '@astryxdesign/core/Tooltip';

export type AttachmentPillState = 'submitted' | 'unsubmitted';

export type AttachmentPillTone = 'neutral' | 'accent';

export interface AttachmentPillProps {
  state: AttachmentPillState;
  tone?: AttachmentPillTone;
  label: string;
  leading: ReactNode;
  flushLeading?: boolean;
  labelTitle?: string;
  ariaLabel?: string;
  maxWidth?: CSSProperties['maxWidth'];
  testId?: string;
  isStale?: boolean;
  onActivate?: () => void;
  onHoverChange?: (isHovered: boolean) => void;
  style?: CSSProperties;
}

interface PillPalette {
  background: string;
  ink: string;
  leadingInk: string;
  /* A leading button ignores inherited `color`; these are the vars our theme's
     `.astryx-button.ghost` override in `studio.css` reads, not Astryx's own
     `--color-text-primary`, which re-pointed alone changes nothing. */
  leadingVars?: Record<string, string>;
}

function resolvePalette(
  state: AttachmentPillState,
  tone: AttachmentPillTone,
  isHovered: boolean,
): PillPalette {
  // A submitted accent pill rests neutral until hovered.
  if (tone === 'accent' && state === 'submitted' && !isHovered) {
    return resolvePalette(state, 'neutral', isHovered);
  }

  if (tone === 'accent') {
    // The sidebar's selected row, so a sent chip reads as the same object (ONL-2593).
    const ink = 'var(--studio-on-accent-muted)';
    return {
      background: 'var(--color-accent-muted)',
      ink,
      leadingInk: ink,
      // Hover too: the theme's hover glyph would otherwise change ink on a selected chip.
      leadingVars: { '--color-icon-secondary': ink, '--color-icon-primary': ink },
    };
  }

  if (state === 'submitted') {
    return {
      background: 'var(--color-background-body)',
      ink: 'var(--color-text-gray)',
      leadingInk: 'var(--color-text-disabled)',
    };
  }

  return {
    background: 'var(--color-background-gray)',
    ink: 'var(--color-text-secondary)',
    leadingInk: 'var(--color-text-gray)',
  };
}

export function AttachmentPill({
  state,
  tone = 'neutral',
  label,
  leading,
  flushLeading = false,
  labelTitle,
  ariaLabel,
  maxWidth,
  testId,
  isStale = false,
  onActivate,
  onHoverChange,
  style,
}: AttachmentPillProps): React.JSX.Element {
  const [isHovered, setIsHovered] = useState(false);

  /* `pointerleave` never fires for an element that unmounts while hovered, so
     the unmount reports the leave. Refs, not deps: a fresh closure re-running
     the cleanup would report a leave the pointer never made. */
  const hoverChangeRef = useRef(onHoverChange);
  const isHoveredRef = useRef(false);
  // Written in commit, not render: a discarded render must not reach the cleanup.
  useInsertionEffect(() => {
    hoverChangeRef.current = onHoverChange;
    isHoveredRef.current = isHovered;
  }, [onHoverChange, isHovered]);
  useEffect(
    () => () => {
      if (isHoveredRef.current) hoverChangeRef.current?.(false);
    },
    [],
  );
  const palette = resolvePalette(state, tone, isHovered);

  return (
    <HStack
      {...(onActivate
        ? {
            as: 'button' as const,
            /* React omits `type` for `undefined`, leaving the UA default `submit`;
               the cast is because `as="button"` does not widen the props. */
            ...({ type: 'button' } as { type: 'button' }),
            onClick: (event: React.MouseEvent) => {
              // The clamp around the bubble is itself a button that opens on click.
              event.stopPropagation();
              onActivate();
            },
          }
        : {})}
      onPointerEnter={() => {
        setIsHovered(true);
        onHoverChange?.(true);
      }}
      onPointerLeave={() => {
        setIsHovered(false);
        onHoverChange?.(false);
      }}
      gap={flushLeading ? 1.5 : 1}
      vAlign="center"
      data-testid={testId}
      data-stale={isStale ? 'true' : undefined}
      aria-label={ariaLabel}
      style={{
        flex: '0 0 auto',
        height: 'var(--studio-attachment-pill-height)',
        maxWidth,
        overflow: 'hidden',
        borderRadius: 'var(--radius-element)',
        paddingInlineStart: flushLeading ? 0 : 'var(--spacing-1)',
        paddingInlineEnd: 'var(--spacing-2)',
        background: palette.background,
        color: palette.ink,
        ...(onActivate
          ? { appearance: 'none', border: 0, margin: 0, font: 'inherit', cursor: 'pointer' }
          : {}),
        ...style,
      }}
    >
      {flushLeading ? (
        leading
      ) : (
        <HStack
          data-attachment-pill-leading="true"
          width="var(--studio-attachment-leading-size)"
          height="var(--studio-attachment-leading-size)"
          hAlign="center"
          vAlign="center"
          style={
            {
              flex: '0 0 auto',
              color: palette.leadingInk,
              ...palette.leadingVars,
            } as CSSProperties
          }
        >
          {leading}
        </HStack>
      )}
      <Tooltip
        content={labelTitle ?? label}
        isEnabled={labelTitle != null}
        hasHoverIndication={false}
      >
        <Text
          data-attachment-pill-label="true"
          type="supporting"
          weight="normal"
          color="inherit"
          maxLines={1}
          hasTruncateTooltip={false}
          style={{
            display: 'block',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 'normal',
          }}
        >
          {label}
        </Text>
      </Tooltip>
    </HStack>
  );
}
