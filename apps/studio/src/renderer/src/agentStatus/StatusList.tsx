import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LazyMotion, MotionConfig, animate, domMin, useMotionValue, usePresence, useReducedMotion, type Transition } from 'motion/react';
import * as m from 'motion/react-m';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { observeResize, unobserveResize } from '@astryxdesign/core/utils';

import { t } from '@studio/i18n';
import { QuestionWaitingGlyph, WindowGlyph } from '../icons/glyphs.js';
import { LIST_PADDING_INLINE, ROW_GAP, ROW_ICON_BOX, ROW_PADDING_INLINE, SECTION_PADDING_INLINE } from '../panels/rowGeometry.js';
import { isCountSeated, linesKeyOf, type CollapseActions, type CollapseIntent, type CollapseState } from './collapse.js';
import { collapsedCount, type StatusLine } from './lines.js';
import { RowRuns } from './runs.js';
import { LAYER } from '../overlay/layers.js';
import './agentStatus.css';


const SUBJECT = {
  color: 'var(--color-text-primary)',
  textDecoration: 'underline',
  textDecorationColor: 'var(--color-text-secondary)',
  textUnderlineOffset: 3,
} as const;

const STATUS_ROW_PX = 30;
/** Rows launch from behind the seat; a spring from rest would show nothing for four frames. Travel per second. */
const LAUNCH = 8;
const ROLL_TRAVEL = STATUS_ROW_PX * 0.6;
const FADE: Transition = { duration: 0.12, ease: 'easeOut' };
const ROLL_IN_FADE: Transition = { duration: 0.16, delay: 0.05, ease: 'easeOut' };
const ROLL_OUT_FADE: Transition = { duration: 0.1, ease: 'easeIn' };
const LIST_ID = 'agent-status-rest';
const settled = (): void => undefined;

/** Motion's visual-duration mapping written out, because a time-defined spring drops the launch velocity. */
function physical(visualDuration: number, bounce: number): Transition {
  const root = (2 * Math.PI) / (visualDuration * 1.2);
  const stiffness = root * root;
  return { type: 'spring', stiffness, damping: 2 * (1 - bounce) * Math.sqrt(stiffness), mass: 1 };
}

const OPEN = physical(0.34, 0.12);
const FOLD: Transition = { type: 'spring', visualDuration: 0.26, bounce: 0 };
const ROLL: Transition = { type: 'spring', visualDuration: 0.3, bounce: 0 };
const SEAT: Transition = { type: 'spring', visualDuration: 0.24, bounce: 0, opacity: { duration: 0.16, ease: 'easeOut' } };
const SEAT_TRAVEL = 16;
const SEAT_FADE_PX = 32;

interface Counter {
  begin: () => void;
  end: () => void;
}

interface Live extends Counter {
  intent: CollapseIntent;
  reduce: boolean;
}

const LiveContext = createContext<Live | null>(null);

function Slot({ away, z, rowKey, children, ref: popRef }: { away: number; z: number; rowKey: string; children: React.ReactNode; ref?: React.Ref<HTMLDivElement> }): React.JSX.Element {
  const live = useContext(LiveContext)!;
  const ref = useRef<HTMLDivElement | null>(null);
  const y = useMotionValue(0);
  const opacity = useMotionValue(1);
  const laidAt = useRef<number | null>(null);
  const leaving = useRef(false);
  const [runs] = useState(() => new RowRuns(() => live));
  const [isPresent, safeToRemove] = usePresence();

  const run = (value: typeof y, to: number, transition: Transition): Promise<void> =>
    runs.run(() => animate(value, to, transition)).finished.then(settled, settled);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el?.parentElement || !isPresent) return;
    const top = el.offsetTop + el.parentElement.getBoundingClientRect().top;
    const { intent, reduce } = live;
    if (laidAt.current === null) {
      laidAt.current = top;
      if (intent === 'open' || intent === 'reopen') {
        if (reduce) {
          opacity.jump(0);
          void run(opacity, 1, FADE);
        } else {
          y.jump(away);
          void run(y, 0, { ...OPEN, velocity: intent === 'open' ? -away * LAUNCH : 0 });
        }
      } else if (intent === 'roll') {
        opacity.jump(0);
        if (reduce) {
          void run(opacity, 1, FADE);
        } else {
          y.jump(ROLL_TRAVEL);
          void run(y, 0, ROLL);
          void run(opacity, 1, ROLL_IN_FADE);
        }
      }
      return;
    }
    const moved = top - laidAt.current;
    laidAt.current = top;
    if (moved === 0) return;
    const velocity = y.getVelocity();
    const from = y.get() - moved;
    runs.stopAll();
    if (reduce || intent === 'none') {
      y.jump(0);
      return;
    }
    y.jump(from);
    const transition = intent === 'fold' ? FOLD : intent === 'roll' ? ROLL : OPEN;
    void run(y, 0, { ...transition, velocity: intent === 'open' ? -from * LAUNCH : velocity });
  });

  useEffect(() => {
    runs.mount();
    return () => {
      runs.dispose();
    };
  }, [runs]);

  useEffect(() => {
    const { intent, reduce } = live;
    if (isPresent) {
      if (!leaving.current) return;
      leaving.current = false;
      runs.stopAll();
      void run(opacity, 1, FADE);
      if (!reduce) void run(y, 0, { ...OPEN, velocity: y.getVelocity() });
      return;
    }
    leaving.current = true;
    runs.stopAll();
    const gone = (): void => {
      safeToRemove?.();
    };
    if (intent === 'none') {
      gone();
    } else if (reduce) {
      void run(opacity, 0, FADE).then(gone);
    } else if (intent === 'fold') {
      void run(y, away, { ...FOLD, velocity: y.getVelocity() }).then(gone);
    } else {
      void run(y, -ROLL_TRAVEL, ROLL);
      void run(opacity, 0, ROLL_OUT_FADE).then(gone);
    }
  }, [isPresent]);

  return (
    <m.div
      ref={(el: HTMLDivElement | null) => {
        ref.current = el;
        if (typeof popRef === 'function') popRef(el);
        else if (popRef) (popRef as React.RefObject<HTMLDivElement | null>).current = el;
      }}
      data-row={rowKey}
      className="agent-status-ground"
      style={{ y, opacity, position: 'relative', zIndex: z, paddingInline: LIST_PADDING_INLINE }}
    >
      {children}
    </m.div>
  );
}

function StatusRow({
  line,
  isTipQuiet,
  reserve,
  onOpen,
}: {
  line: StatusLine;
  isTipQuiet: boolean;
  /** Room left after the words for the count seated over this row. */
  reserve?: number;
  onOpen: (line: StatusLine) => void;
}): React.JSX.Element {
  const linkRef = useRef<HTMLElement | null>(null);
  const wordsRef = useRef<HTMLDivElement | null>(null);
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const link = linkRef.current;
    if (!link) return;
    observeResize(link, () => {
      const words = wordsRef.current;
      if (words) setOverflows(words.scrollWidth > words.clientWidth + 0.5);
    });
    return () => {
      unobserveResize(link);
    };
  }, [line.before, line.subject, line.after]);

  const words = (
    <>
      {line.before}
      <span style={SUBJECT}>{line.subject}</span>
      {line.after}
    </>
  );
  return (
    <HStack
      gap={ROW_GAP}
      vAlign="center"
      width="100%"
      data-testid="agent-status-line"
      data-state={line.state}
      data-target={line.target.kind}
      style={{ paddingInline: ROW_PADDING_INLINE }}
    >
      <Tooltip content={`${line.before}${line.subject}${line.after}`} placement="above" alignment="start" isEnabled={overflows && !isTipQuiet}>
        <HStack
          as="button"
          ref={linkRef}
          gap={ROW_GAP}
          vAlign="center"
          className="agent-status-row"
          data-link=""
          data-overflows={overflows ? 'true' : undefined}
          onClick={() => {
            onOpen(line);
          }}
          style={{ flex: '1 1 auto', minWidth: 0, paddingBlock: 5 }}
        >
          <Icon
            icon={line.target.kind === 'frame' ? WindowGlyph : QuestionWaitingGlyph}
            color="inherit"
            style={{ width: ROW_ICON_BOX, height: ROW_ICON_BOX, flexShrink: 0, color: 'var(--color-icon-secondary)' }}
          />
          <div ref={wordsRef} className="agent-status-words">
            <Text type="supporting" color="secondary" style={{ whiteSpace: 'nowrap' }}>
              {words}
            </Text>
          </div>
        </HStack>
      </Tooltip>
      {reserve !== undefined && <div aria-hidden style={{ width: reserve, flexShrink: 0 }} />}
    </HStack>
  );
}

export function StatusList({
  lines,
  collapse,
  actions,
  onOpen,
  onExpand,
}: {
  lines: readonly StatusLine[];
  collapse: CollapseState;
  actions: CollapseActions;
  onOpen: (line: StatusLine) => void;
  onExpand?: () => void;
}): React.JSX.Element | null {
  const [moving, setMoving] = useState(0);
  const footRef = useRef<HTMLDivElement | null>(null);
  const focusOnOpen = useRef(false);
  const reduce = useReducedMotion() === true;
  const linesKey = linesKeyOf(lines.map((line) => line.key));
  const intent: CollapseIntent = collapse.linesKey !== null && collapse.linesKey !== linesKey ? 'roll' : collapse.intent;
  const [counter] = useState<Counter>(() => ({
    begin: () => {
      setMoving((n) => n + 1);
    },
    end: () => {
      setMoving((n) => Math.max(0, n - 1));
    },
  }));
  const live = useMemo<Live>(() => ({ ...counter, intent, reduce }), [counter, intent, reduce]);
  const isSeated = isCountSeated(collapse);
  const countRef = useRef<HTMLButtonElement | null>(null);
  const [countWidth, setCountWidth] = useState(0);

  useLayoutEffect(() => {
    actions.linesChanged(lines.map((line) => line.key));
  }, [linesKey]);
  useEffect(() => {
    actions.committed();
  });
  useLayoutEffect(() => {
    if (!collapse.open || !focusOnOpen.current) return;
    focusOnOpen.current = false;
    footRef.current?.querySelector<HTMLElement>('[data-link]')?.focus({ focusVisible: true } as FocusOptions);
  }, [collapse.open]);

  const count = collapsedCount(lines);
  const hasSeat = isSeated && count > 0;
  useLayoutEffect(() => {
    const el = countRef.current;
    if (!hasSeat || !el) return;
    setCountWidth(el.offsetWidth);
    observeResize(el, () => {
      setCountWidth(el.offsetWidth);
    });
    return () => {
      unobserveResize(el);
    };
  }, [hasSeat]);

  const anchor = lines[0];
  if (!anchor) return null;
  const shown = collapse.open ? lines : [anchor];
  const seat = lines.length - 1;

  return (
    <LazyMotion features={domMin} strict>
    <MotionConfig reducedMotion="user">
      <LiveContext.Provider value={live}>
        <div
          ref={footRef}
          data-testid="agent-status"
          className="agent-status-list"
          data-open={collapse.open ? 'true' : 'false'}
          data-moving={moving > 0 ? 'true' : 'false'}
          onPointerEnter={actions.pointerEnter}
          onPointerMove={actions.pointerMove}
          onPointerLeave={actions.pointerLeave}
          onFocus={(event) => {
            actions.focusIn(event.target.matches(':focus-visible'));
          }}
          onBlur={(event) => {
            actions.focusOut(!event.currentTarget.contains(event.relatedTarget as Node | null));
          }}
          style={{ position: 'relative', display: 'flex', flexDirection: 'column', flexShrink: 0, paddingBlock: 'var(--spacing-2)' }}
        >
          <section aria-label={t('agentStatus.label')} id={LIST_ID} style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <AnimatePresence initial={false} mode="popLayout" anchorY="bottom" onExitComplete={actions.exitsDone}>
              {shown.map((line, slot) => {
                const listSlot = collapse.open ? slot : 0;
                const isAnchor = line.key === anchor.key;
                return (
                  <Slot key={line.key} rowKey={line.key} away={(seat - listSlot) * STATUS_ROW_PX} z={20 - listSlot}>
                    <StatusRow
                      line={line}
                      isTipQuiet={collapse.quietTip}
                      onOpen={onOpen}
                      {...(isAnchor && hasSeat ? { reserve: countWidth } : {})}
                    />
                  </Slot>
                );
              })}
            </AnimatePresence>
          </section>
          {hasSeat && (
            <m.div
              data-count-seat=""
              initial={collapse.intent === 'fold' && !reduce ? { x: SEAT_TRAVEL, opacity: 0 } : false}
              animate={{ x: 0, opacity: 1 }}
              transition={SEAT}
              style={{ position: 'absolute', insetBlock: 0, right: 0, zIndex: LAYER.seat, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}
            >
              <div aria-hidden className="agent-status-ground" style={{ alignSelf: 'stretch', width: SEAT_FADE_PX, maskImage: 'linear-gradient(to right, transparent, black)' }} />
              <div className="agent-status-ground" style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center', paddingRight: SECTION_PADDING_INLINE }}>
                <button
                  ref={countRef}
                  type="button"
                  className="agent-status-row agent-status-count"
                  data-more=""
                  aria-expanded={false}
                  aria-controls={LIST_ID}
                  onClick={(event) => {
                    focusOnOpen.current = event.detail === 0;
                    actions.tapCount();
                    onExpand?.();
                  }}
                  style={{ flexShrink: 0, paddingBlock: 5, pointerEvents: 'auto' }}
                >
                  <Text type="supporting" color="inherit" style={{ whiteSpace: 'pre' }}>
                    {t('agentStatus.more', { count })}
                  </Text>
                </button>
              </div>
            </m.div>
          )}
        </div>
      </LiveContext.Provider>
    </MotionConfig>
    </LazyMotion>
  );
}
