import { useEffect, useRef, useState } from 'react';
import { Stack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { IDLE_UPDATE_STATE, type UpdateState } from '@studio/events';
import { ShimmerText } from '@studio/chat-ui';
import { GlyphLoadingCircle } from '../icons/glyphs.js';
import { intlLocale, t } from '@studio/i18n';
import { pillKey } from '@studio/i18n/update';
import { CHROME_EASE, EasedWidth, Presence } from './Presence.js';
import './chrome.css';

/** The git-status pill's height, stated rather than imported: `TopBar` imports this module. */
const PILL_HEIGHT = 26;

const PERCENT = new Intl.NumberFormat(intlLocale(), { style: 'percent', maximumFractionDigits: 0 });

function useUpdateState(): UpdateState {
  const [state, setState] = useState<UpdateState>(IDLE_UPDATE_STATE);
  // Subscribed before the snapshot is asked for; a snapshot that lands after a push is stale.
  const pushed = useRef(false);

  useEffect(() => {
    const unsubscribe = window.studioChrome.onUpdateState((next) => {
      pushed.current = true;
      setState(next);
    });
    void window.studioChrome.updateStatus().then((snapshot) => {
      if (!pushed.current) setState(snapshot);
    });
    return unsubscribe;
  }, []);

  return state;
}

function label(state: UpdateState): string | undefined {
  const key = pillKey(state);
  if (key === null) return undefined;
  return t(key, { percent: state.percent ?? 0 });
}

function Morph({ value, children }: { value: string; children: React.ReactNode }): React.JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    ref.current?.animate(
      [
        { opacity: 0, filter: 'blur(4px)', transform: 'translateY(6px)' },
        { opacity: 1, filter: 'blur(0)', transform: 'translateY(0)' },
      ],
      { duration: 220, easing: CHROME_EASE },
    );
  }, [value]);

  return (
    <span ref={ref} style={{ display: 'inline-flex' }}>
      {children}
    </span>
  );
}

/** Holds 100%'s width; the number is end-anchored and shifted half the spare room, so a new digit slides it rather than jumps it. */
function CenteredPercent({ children }: { children: React.ReactNode }): React.JSX.Element {
  const reserveRef = useRef<HTMLSpanElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0);

  useEffect(() => {
    const reserve = reserveRef.current;
    const number = numberRef.current;
    if (!reserve || !number) return undefined;
    const measure = (): void => setShift((reserve.offsetWidth - number.offsetWidth) / 2);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(number);
    observer.observe(reserve);
    return () => observer.disconnect();
  }, []);

  return (
    <span style={{ display: 'inline-grid', justifyItems: 'end' }}>
      <span ref={reserveRef} aria-hidden="true" style={{ gridArea: '1 / 1', visibility: 'hidden' }}>
        {PERCENT.format(1)}
      </span>
      <span
        ref={numberRef}
        style={{
          gridArea: '1 / 1',
          display: 'inline-flex',
          transform: `translateX(${String(-shift)}px)`,
          transition: `transform 220ms ${CHROME_EASE}`,
        }}
      >
        {children}
      </span>
    </span>
  );
}

function PillLabel({ state, text }: { state: UpdateState; text: string }): React.JSX.Element {
  if (state.status === 'downloading') {
    const percent = PERCENT.format((state.percent ?? 0) / 100);
    return (
      <Text
        type="body"
        aria-label={text}
        style={{ color: 'var(--studio-update-ink)', fontVariantNumeric: 'tabular-nums' }}
      >
        <CenteredPercent>
          {[...percent]
            .reverse()
            .map((char, fromEnd) => (
              // Keyed from the end so the `%` and ones digit keep their slot as the number grows.
              <Morph key={fromEnd} value={char}>
                {char}
              </Morph>
            ))
            .reverse()}
        </CenteredPercent>
      </Text>
    );
  }
  return (
    <Morph value={state.status}>
      {state.status === 'checking' ? (
        <ShimmerText
          isActive
          type="body"
          weight="normal"
          hasGlow={false}
          base="var(--update-shimmer-base)"
          crest="var(--update-shimmer-crest)"
        >
          {text}
        </ShimmerText>
      ) : (
        <Text type="body" style={{ color: 'var(--studio-update-ink)' }}>
          {text}
        </Text>
      )}
    </Morph>
  );
}

export interface UpdatePillViewProps {
  state: UpdateState;
  onRestart: () => void;
  onRetry: () => void;
  isRestarting?: boolean;
}

export function UpdatePillView({
  state,
  onRestart,
  onRetry,
  isRestarting = false,
}: UpdatePillViewProps): React.JSX.Element | null {
  const text = label(state);
  if (text === undefined) return null;

  const ready = state.status === 'downloaded' && !isRestarting;
  const retry = state.status === 'error' && state.message === 'UPDATE_AUTHORIZATION_DENIED';

  return (
    <Stack
      as={ready || retry ? 'button' : undefined}
      aria-live="polite"
      aria-busy={isRestarting}
      data-testid="topbar-update"
      data-update-status={state.status}
      onClick={retry ? onRetry : ready ? onRestart : undefined}
      // Inside the drag surface: without this it is unclickable.
      className={state.status === 'checking' ? 'region-no-drag update-pill update-pill-quiet' : 'region-no-drag update-pill'}
      direction="horizontal"
      align="center"
      paddingInline={2}
      style={{
        height: PILL_HEIGHT,
        background: 'var(--studio-update-fill)',
        borderRadius: 'var(--radius-element)',
        border: 'none',
        font: 'inherit',
        flex: '0 0 auto',
        cursor: ready || retry ? 'pointer' : 'default',
      }}
    >
      <EasedWidth>
        {isRestarting ? (
          <Stack direction="horizontal" align="center" gap={1.5}>
            <span data-testid="update-restart-spinner" style={{ display: 'flex', color: 'var(--studio-update-ink)', animation: 'frame-reload-turn 900ms linear infinite' }}>
              <GlyphLoadingCircle size={16} />
            </span>
            <PillLabel state={state} text={text} />
          </Stack>
        ) : (
          <PillLabel state={state} text={text} />
        )}
      </EasedWidth>
    </Stack>
  );
}

export function UpdatePill({ gap }: { gap: number }): React.JSX.Element {
  const state = useUpdateState();
  return (
    <Presence isShown={label(state) !== undefined} gap={gap}>
      <UpdatePillView
        state={state}
        onRetry={() => window.studioChrome.runAppCommand({ command: 'check-for-updates' })}
        isRestarting={state.restarting === true}
        onRestart={() => {
          window.studioChrome.updateRestart();
        }}
      />
    </Presence>
  );
}
