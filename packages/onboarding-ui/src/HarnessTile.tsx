import { useState, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { GlyphSlot, ShimmerText } from '@studio/chat-ui';
import type { HarnessId } from '@studio/events';
import { isBusy, markFor, type ComingSoonId, type HarnessTileState, type TileMark } from './state.js';
import { fill, pickCopy, type OnboardingUiStrings } from './strings.js';

/** The 24px brand marks, as rendered elements — the package cannot see the app's icon registry. */
export type TileGlyphs = Record<HarnessId | ComingSoonId, ReactNode> & {
  spinner?: ReactNode;
  star?: ReactNode;
  starFilled?: ReactNode;
};

export interface HarnessTileProps {
  tile: HarnessTileState;
  strings: OnboardingUiStrings;
  glyphs: TileGlyphs;
  onSelect?: () => void;
  testId?: string;
  layout?: 'tile' | 'row';
  hasDivider?: boolean;
  isPreferred?: boolean;
  onMakePreferred?: () => void;
}

/** The board's tile: 120px tall, brand mark top-left, the mark top-right, the label at the foot. Width is the row's business. */
const TILE_HEIGHT = 120;
const ROW_HEIGHT = 72;
const WELL_SIZE = 40;
const MARK_SIZE = 12;

/** Chromatic icon tokens, not the theme's status slots — those are neutralised on purpose and would paint no colour. */
const MARK_COLOR: Record<TileMark, string> = {
  attention: 'var(--color-icon-red)',
  connected: 'var(--color-icon-teal)',
};

function Mark({ mark, label, small = false }: { mark: TileMark; label: string; small?: boolean }): React.JSX.Element {
  return (
    <span
      role="img"
      aria-label={label}
      data-mark={mark}
      style={{
        width: small ? 8 : MARK_SIZE,
        height: small ? 8 : MARK_SIZE,
        borderRadius: '50%',
        // A true circle: the row's squircle corners would square it off.
        ...({ cornerShape: 'round' } as React.CSSProperties),
        background: MARK_COLOR[mark],
        flex: '0 0 auto',
      }}
    />
  );
}

function Well({ children, isMuted = false }: { children: ReactNode; isMuted?: boolean }): React.JSX.Element {
  return (
    <span data-tile-well="" style={{ width: WELL_SIZE, height: WELL_SIZE, flex: '0 0 auto', display: 'grid', placeItems: 'center', borderRadius: 10, background: 'color-mix(in srgb, var(--color-text-primary) 10%, transparent)' }}>
      <GlyphSlot size={20} {...(isMuted ? { color: 'var(--color-text-disabled)' } : {})}>{children}</GlyphSlot>
    </span>
  );
}

// The row's action dims on hover, like New project's; the star is a bare glyph button and keeps its own look.
const ROW_HOVER_RULES = '[data-tile="provider"] button:not([aria-pressed]):hover:not(:disabled){filter:brightness(0.9)}';

function HarnessRow({ tile, strings, glyphs, onSelect, testId, hasDivider = false, isPreferred, onMakePreferred }: Omit<HarnessTileProps, 'layout'>): React.JSX.Element {
  const [isRowActive, setRowActive] = useState(false);
  const rowStyle = { width: '100%', height: ROW_HEIGHT, paddingInline: 20, position: 'relative' } as const;
  const divider = hasDivider ? <span aria-hidden="true" style={{ position: 'absolute', top: 0, left: 20, right: 20, borderTop: '0.5px solid var(--color-border)' }} /> : null;
  if (tile.kind === 'coming-soon') {
    return (
      <HStack gap={3} align="center" style={rowStyle} data-testid={testId ?? 'provider-tile'} data-tile="coming-soon" data-tile-id={tile.id}>
        {divider}
        <Well isMuted>{glyphs[tile.id]}</Well>
        <Text type="large" weight="medium" color="disabled" style={{ flex: 1, minWidth: 0 }}>{strings.comingSoonName[tile.id]}</Text>
        <Button label={strings.comingSoon} variant="secondary" size="md" isDisabled />
      </HStack>
    );
  }
  const mark = markFor(tile);
  const isIdle = tile.state === 'idle';
  const line = isIdle ? '' : lineFor(tile, strings);
  // Waiting for a pasted code is the person's move, not ours: no spinner.
  const busy = tile.state !== 'idle' && tile.state !== 'paste-code' && isBusy(tile.state);
  const action = isIdle || !mark
    ? { label: strings.action['sign-in'], variant: 'primary' as const }
    : mark === 'connected'
      ? { label: strings.manage, variant: 'secondary' as const }
      : { label: strings.action['try-again'], variant: 'primary' as const };
  return (
    <HStack gap={3} align="center" style={rowStyle} onMouseEnter={() => setRowActive(true)} onMouseLeave={() => setRowActive(false)} onFocus={() => setRowActive(true)} onBlur={() => setRowActive(false)} data-testid={testId ?? 'provider-tile'} data-tile="provider" data-provider={tile.harness} data-state={tile.state} {...(mark ? { 'data-mark': mark } : {})}>
      {divider}
      <style href="harness-row-hover" precedence="medium">{ROW_HOVER_RULES}</style>
      <Well>{glyphs[tile.harness]}</Well>
      <VStack gap={0} align="start" style={{ flex: 1, minWidth: 0 }}>
        <Text type="large" weight="medium" color="primary">{strings.subscription[tile.harness]}</Text>
        {isIdle ? null : busy ? (
          <ShimmerText isActive type="supporting" hasGlow={false}>{line}</ShimmerText>
        ) : (
          <HStack gap={1.5} align="center">
            {mark ? <Mark mark={mark} label={strings.mark[mark]} small /> : null}
            <Text type="supporting" color="secondary">{line}</Text>
            {mark === 'connected' && isPreferred === true ? (
              <Text type="supporting" color="secondary">· {strings.preferred}</Text>
            ) : null}
          </HStack>
        )}
      </VStack>
      {mark === 'connected' && isPreferred !== undefined && glyphs.star !== undefined ? (
        // A bare button, not a ghost one: the ghost's hover wash sat over the outline and hid it.
        <Tooltip content={fill(isPreferred ? strings.defaultTooltip : strings.makeDefaultTooltip, { name: strings.harnessName[tile.harness] })} placement="above">
        <button
          type="button"
          aria-label={isPreferred ? strings.preferred : strings.makePreferred}
          aria-pressed={isPreferred}
          onClick={isPreferred ? undefined : onMakePreferred}
          {...(isPreferred ? { 'data-preferred-star': '' } : { 'data-make-preferred': '' })}
          style={{
            display: 'grid', placeItems: 'center', width: 28, height: 28, padding: 0, border: 0, background: 'none',
            marginRight: -8,
            color: isPreferred ? 'var(--color-icon-primary)' : 'var(--color-icon-secondary)',
            cursor: isPreferred ? 'default' : 'pointer',
            opacity: isPreferred || isRowActive ? 1 : 0,
          }}
        >
          {isPreferred ? (glyphs.starFilled ?? glyphs.star) : glyphs.star}
        </button>
        </Tooltip>
      ) : null}
      {busy && glyphs.spinner !== undefined ? (
        // The label stays, unseen, so the button keeps Sign in's width; the spinner sits centred over it.
        <Button
          label={action.label}
          variant="secondary"
          size="md"
          onClick={onSelect}
          aria-label={line}
          style={{ color: 'transparent', gap: 0 }}
          endContent={
            <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--color-icon-primary)' }}>
              {glyphs.spinner}
            </span>
          }
        />
      ) : (
        <Button label={action.label} variant={busy ? 'secondary' : action.variant} size="md" isLoading={busy} onClick={onSelect} />
      )}
    </HStack>
  );
}

export function HarnessTile({ tile, strings, glyphs, onSelect, testId, layout = 'tile', hasDivider, isPreferred, onMakePreferred }: HarnessTileProps): React.JSX.Element {
  if (layout === 'row') return <HarnessRow tile={tile} strings={strings} glyphs={glyphs} {...(onSelect ? { onSelect } : {})} {...(testId ? { testId } : {})} {...(hasDivider ? { hasDivider } : {})} {...(isPreferred === undefined ? {} : { isPreferred })} {...(onMakePreferred ? { onMakePreferred } : {})} />;
  const shell = {
    padding: 4,
    height: TILE_HEIGHT,
    style: { flex: '1 0 0', minWidth: 0 },
  } as const;

  if (tile.kind === 'coming-soon') {
    // A plain card, not a disabled clickable one: the disabled treatment double-mutes the label (measured in AgentCard). Border only: the board draws no fill.
    return (
      <Card variant="transparent" {...shell} style={{ ...shell.style, border: 'var(--border-width) solid var(--color-border)' }} data-testid={testId ?? 'provider-tile'} data-tile="coming-soon" data-tile-id={tile.id}>
        <VStack height="100%" justify="between" align="start">
          <HStack width="100%" justify="between" align="center">
            <GlyphSlot size={24} color="var(--color-text-disabled)">{glyphs[tile.id]}</GlyphSlot>
            <Text type="supporting" weight="medium" color="disabled">
              {strings.comingSoon}
            </Text>
          </HStack>
          <Text type="body" weight="medium" color="disabled">
            {strings.comingSoonName[tile.id]}
          </Text>
        </VStack>
      </Card>
    );
  }

  const mark = markFor(tile);
  const isIdle = tile.state === 'idle';
  const line = isIdle ? undefined : lineFor(tile, strings);
  const busy = tile.state !== 'idle' && isBusy(tile.state);
  const name = strings.harnessName[tile.harness];
  const label = isIdle ? strings.setUp[tile.harness] : [name, line].join(', ');

  return (
    <ClickableCard
      label={label}
      variant="gray"
      onClick={onSelect}
      {...shell}
      data-testid={testId ?? 'provider-tile'}
      data-tile="provider"
      data-provider={tile.harness}
      data-state={tile.state}
      {...(mark ? { 'data-mark': mark } : {})}
    >
      <VStack height="100%" justify="between" align="start">
        <HStack width="100%" justify="between" align="center">
          <GlyphSlot size={24}>{glyphs[tile.harness]}</GlyphSlot>
          {mark ? <Mark mark={mark} label={strings.mark[mark]} /> : null}
        </HStack>
        {isIdle ? (
          <Text type="body" weight="medium" color="primary">
            {strings.setUp[tile.harness]}
          </Text>
        ) : (
          <VStack gap={0.5} align="start" width="100%">
            <Text type="body" weight="medium" color="secondary">
              {name}
            </Text>
            {busy ? (
              <ShimmerText isActive type="body" weight="medium" hasGlow={false}>
                {line}
              </ShimmerText>
            ) : (
              <Text type="body" weight="medium" color="primary">
                {line}
              </Text>
            )}
          </VStack>
        )}
      </VStack>
    </ClickableCard>
  );
}

function lineFor(tile: Extract<HarnessTileState, { kind: 'harness' }>, strings: OnboardingUiStrings): string {
  if (tile.state === 'idle') return '';
  if (tile.harness === 'claude') return pickCopy(strings.tileLine, { harness: 'claude', state: tile.state });
  if (tile.state === 'downloading') return fill(strings.tileLine.codex.downloading, { percent: tile.percent });
  return pickCopy(strings.tileLine, { harness: 'codex', state: tile.state });
}
