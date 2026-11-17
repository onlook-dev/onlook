import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { displayUrl, localPort } from '@studio/events';
import { t, type StringKey } from '@studio/i18n';
import { SendArrowIcon, WindowGlyph } from '../../icons/glyphs.js';
import { BreathingGround } from './BreathingGround.js';
import type { CoverAction, CoverState } from './coverState.js';
import { loadFailureCopy, type FrameLoadFailure } from './loadFailure.js';

/** Read from the frame's size on screen; below `full` these are the container thresholds in `styles.css`. */
export type CoverBand = 'full' | 'plain' | 'short' | 'title' | 'art';

function coverBand(width: number, height: number): CoverBand {
  if (width <= 110 || height <= 84) return 'art';
  if (width <= 180 || height <= 140) return 'title';
  if (width <= 260 || height <= 220) return 'short';
  if (width < 440 || height < 260) return 'plain';
  return 'full';
}

const GROW_FROM = { width: 718, height: 466 };
const GROW_MAX = 2.4;

function coverGrowth(width: number, height: number): number {
  return Math.min(GROW_MAX, Math.max(1, Math.min(width / GROW_FROM.width, height / GROW_FROM.height)));
}

const HEADING = { full: 1, plain: 2, short: 3 } as const;
const COLUMN = 380;

/** A Frame's type icon, as the Designs list draws it, for every state (ONL-2960). */
function SmallMark({ band }: { band: 'title' | 'art' }): React.JSX.Element {
  return (
    <div data-testid="frame-cover-mark" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
      <Icon icon={WindowGlyph} size={band === 'title' ? 'md' : 'sm'} color="secondary" />
    </div>
  );
}

const TITLE: Record<CoverState, StringKey> = {
  'agent-starting': 'frame.covers.agentStarting.title',
  'studio-starting': 'frame.health.loading.label',
  'not-started': 'frame.covers.notStarted.title',
  stopped: 'frame.covers.stopped.title',
  nothing: 'frame.covers.nothing.title',
  'page-failed': 'frame.covers.pageFailed.title',
  'own-server': 'frame.covers.ownServer.title',
  'port-taken': 'frame.covers.portTaken.title',
  container: 'frame.covers.container.title',
};

const BODY: Partial<Record<CoverState, StringKey>> = {
  stopped: 'frame.covers.stopped.body',
  nothing: 'frame.covers.nothing.body',
  'own-server': 'frame.covers.ownServer.body',
  'port-taken': 'frame.covers.portTaken.body',
  container: 'frame.covers.container.body',
};

const ACTION: Record<Exclude<CoverAction, 'back'>, StringKey> = {
  start: 'frame.covers.start',
  restart: 'frame.covers.restart',
  'try-again': 'frame.covers.tryAgain',
  'ask-agent': 'frame.covers.ask',
};

function isStarting(cover: CoverState): boolean {
  return cover === 'agent-starting' || cover === 'studio-starting';
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return displayUrl(url);
  }
}

function bodyText(cover: CoverState, url: string, homeUrl: string, failure: FrameLoadFailure | undefined): string | undefined {
  if (cover === 'page-failed') {
    if (failure === undefined) return undefined;
    const copy = loadFailureCopy(failure, homeUrl);
    if (copy.key !== 'frame.health.failed.page') return t(copy.key, copy.params);
    return t('frame.covers.pageFailed.body', { url: copy.params.url ?? '', reason: copy.params.reason ?? '' });
  }
  const key = BODY[cover];
  return key === undefined ? undefined : t(key, { url: hostOf(url) });
}

function actionLabel(action: CoverAction, homeUrl: string): string {
  return action === 'back' ? t('frame.health.failed.back', { home: hostOf(homeUrl) }) : t(ACTION[action]);
}

export interface FrameCoverProps {
  cover: CoverState;
  actions: readonly CoverAction[];
  /** On screen: the frame's size times the canvas zoom. */
  width: number;
  height: number;
  url: string;
  homeUrl: string;
  failure?: FrameLoadFailure | undefined;
  isAsking?: boolean;
  askFailed?: boolean;
  onAction: (action: CoverAction) => void;
}

/** Fills its parent in screen px; the parent counter-scales it out of the canvas zoom. */
export function FrameCover({ cover, actions, width, height, url, homeUrl, failure, isAsking = false, askFailed = false, onAction }: FrameCoverProps): React.JSX.Element {
  const band = coverBand(width, height);
  const grow = coverGrowth(width, height);
  const isFull = band === 'full';
  const title = t(TITLE[cover], { port: String(localPort(url) ?? '') });
  const showsBody = isFull || band === 'plain';
  const body = showsBody && !askFailed ? bodyText(cover, url, homeUrl, failure) : undefined;
  const shown = actions.slice(0, band === 'short' ? 1 : undefined);
  const isSmall = band === 'title' || band === 'art';
  const grown = grow === 1 ? {} : { zoom: grow };
  const heading = <Heading level={HEADING[isSmall ? 'short' : band]} color="inherit" style={{ textWrap: 'balance' }}>{title}</Heading>;
  return (
    <div
      data-testid="frame-cover"
      data-cover={cover}
      data-band={band}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', background: 'var(--color-background-card)' }}
    >
      {isSmall ? (
        <SmallMark band={band} />
      ) : isStarting(cover) ? (
        <BreathingGround
          width={width}
          pixel={1}
          isActive
          words={<output style={{ ...grown, display: 'block', maxWidth: COLUMN, padding: isFull ? 32 : 20, boxSizing: 'border-box' }}>{heading}</output>}
        />
      ) : (
        <div style={{ position: 'absolute', inset: 0, ...grown }}>
          <VStack
            align="center"
            justify="center"
            gap={isFull ? 6 : 4}
            padding={isFull ? 8 : 5}
            style={{ position: 'relative', height: '100%', width: '100%', boxSizing: 'border-box', textAlign: 'center' }}
          >
            <VStack align="center" gap={isFull ? 3 : 2} style={{ maxWidth: COLUMN }}>
              <Heading level={HEADING[band]} style={{ textWrap: 'balance' }}>{title}</Heading>
              {showsBody && askFailed ? (
                <Text color="secondary" maxLines={3} role="alert" style={{ lineHeight: 1.6, textWrap: 'pretty' }}>{t('frame.recovery.sendFailed')}</Text>
              ) : body === undefined ? null : (
                <Text color="secondary" maxLines={3} style={{ lineHeight: 1.6, textWrap: 'pretty', overflowWrap: 'anywhere' }}>{body}</Text>
              )}
            </VStack>
            {shown.length === 0 ? null : (
              <HStack
                gap={2}
                align="center"
                vAlign="center"
                className="nodrag nopan"
                style={{ maxWidth: COLUMN, pointerEvents: 'auto' }}
                onClick={(event) => event.stopPropagation()}
              >
                {shown.map((action) =>
                  action === 'ask-agent' ? (
                    <Button key={action} variant="ghost" size="md" label={actionLabel(action, homeUrl)} endContent={<SendArrowIcon />} isDisabled={isAsking} onClick={() => onAction(action)} data-action={action} />
                  ) : (
                    <Button key={action} variant="outline" size="md" label={actionLabel(action, homeUrl)} onClick={() => onAction(action)} data-action={action} />
                  ),
                )}
              </HStack>
            )}
          </VStack>
        </div>
      )}
    </div>
  );
}
