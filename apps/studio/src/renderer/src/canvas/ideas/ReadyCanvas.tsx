import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { SendArrowIcon } from '../../icons/glyphs.js';
import { t } from '@studio/i18n';
import { prefersReducedMotion } from '../spring.js';
import { useCanvasStore } from '../store.js';
import { CARD, STAGE, captionWidth, filmOf, leaveFilm, seatLeft, seatTransition, settledAt, type ReadyPhase } from './choreography.js';
import { IdeaCard } from './IdeaCard.jsx';
export type { ReadyPhase } from './choreography.js';
import { IDEA_CAPTION, IDEA_ORDER, type IdeaKind } from './ideas.js';
import { partStyles } from './parts.js';
import { finishOnInterruption, playFilm, type Film } from './run.js';

type Point = [number, number];
type Segment = [Point, Point, Point, Point];

const WORDS = { top: 100, width: 290 };
const ARROW = { width: 600, height: 360, lift: 40 };

const cubic = ([a, b, c, d]: Segment, k: number): Point => {
  const u = 1 - k;
  const at = (i: 0 | 1) => u * u * u * a[i] + 3 * u * u * k * b[i] + 3 * u * k * k * c[i] + k * k * k * d[i];
  return [at(0), at(1)];
};

function brush(ctx: CanvasRenderingContext2D, segments: Segment[], width: number, seed: number): void {
  let s = seed;
  const random = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const length = segments.reduce((sum, [a, , , d]) => sum + Math.hypot(d[0] - a[0], d[1] - a[1]), 0);
  const dabs = Math.max(16, Math.round(length * 1.4));
  for (let i = 0; i <= dabs; i++) {
    const g = i / dabs;
    const index = Math.min(segments.length - 1, Math.floor(g * segments.length));
    const [x, y] = cubic(segments[index]!, g * segments.length - index);
    const taper = Math.pow(Math.sin(Math.PI * (0.15 + 0.85 * g)), 0.5);
    const r = Math.max(0.35, (width / 2) * (0.25 + 0.75 * taper) * (0.85 + random() * 0.3));
    ctx.globalAlpha = 0.12 + random() * 0.1;
    ctx.beginPath();
    ctx.arc(x + (random() - 0.5) * 0.6, y + (random() - 0.5) * 0.6, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function BrushArrow(): React.JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = ARROW.width * dpr;
    canvas.height = ARROW.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = getComputedStyle(canvas).color;
    brush(ctx, [[[100, 286], [92, 318], [112, 340], [146, 334]], [[146, 334], [204, 324], [262, 266], [314, 214]]], 3.2, 7);
    brush(ctx, [[[298, 209], [304, 210], [310, 211], [316, 213]]], 2.6, 11);
    brush(ctx, [[[316, 213], [315, 219], [313.5, 225], [312, 231]]], 2.6, 13);
  }, []);
  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ position: 'absolute', left: 0, top: -ARROW.lift, width: ARROW.width, height: ARROW.height, pointerEvents: 'none', color: 'var(--color-icon-teal)' }}
    />
  );
}

/** Plays the canvas out from wherever it stands once "Add inspiration" sends a Frame, and back in if that Frame is gone before anything else lands. */
function useLeavesForInspiration(root: React.RefObject<HTMLDivElement | null>, phase: ReadyPhase, reduced: boolean): boolean {
  const [isLeaving, setLeaving] = useState(false);
  const phaseNow = useRef(phase);
  useLayoutEffect(() => {
    phaseNow.current = phase;
  }, [phase]);
  useEffect(() => {
    let leave: Film | null = null;
    let release: () => void = () => undefined;
    const stop = () => {
      release();
      leave?.cancel();
      leave = null;
    };
    const unsubscribe = useCanvasStore.subscribe((state, prev) => {
      const el = root.current;
      if (leave === null && el !== null && state.inspiration !== null && prev.inspiration === null) {
        const film = leaveFilm(settledAt(phaseNow.current, reduced), reduced);
        const playing = playFilm(el, film.at, film.end, Number(document.timeline.currentTime ?? performance.now()));
        leave = playing;
        release = finishOnInterruption(playing);
        playing.finished.then(() => release(), () => undefined);
        setLeaving(true);
      } else if (leave !== null && state.inspiration === null && Object.keys(state.doc?.nodes ?? {}).length === 0) {
        stop();
        setLeaving(false);
      }
    });
    return () => {
      unsubscribe();
      stop();
    };
  }, [root, reduced]);
  return isLeaving;
}

/** A blank project's canvas: the ready rest, "Give me some ideas", and the three idea cards (ONL-2960). `quiet` fades it all once the person has spoken. */
export function ReadyCanvas({
  quiet = false,
  initialPhase = { kind: 'rest' },
  onPick,
  onOpenChange,
  onLeavingChange,
}: {
  quiet?: boolean;
  initialPhase?: ReadyPhase;
  /** Resolving `false` means nothing was sent, and the cards come back. */
  onPick?: (kind: IdeaKind) => Promise<boolean> | void;
  /** True from the reveal on: the cards are out and no longer the resting screen. */
  onOpenChange?: (isOpen: boolean) => void;
  /** True while it plays out for an arriving inspiration Frame. */
  onLeavingChange?: (isLeaving: boolean) => void;
}): React.JSX.Element {
  const [phase, setPhase] = useState<ReadyPhase>(initialPhase);
  const [hovered, setHovered] = useState<IdeaKind | null>(null);
  const [reduced] = useState(prefersReducedMotion);
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const film = filmOf(phase, reduced);
    const el = root.current;
    if (film === null || el === null) return;
    const playing = playFilm(el, film.at, film.end);
    const release = finishOnInterruption(playing);
    let cancelled = false;
    playing.finished.then(
      () => {
        if (cancelled) return;
        release();
        setPhase((now) => (now.kind === 'reveal' ? { kind: 'revealed' } : now.kind === 'exit' ? { kind: 'gone', picked: now.picked } : now));
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
      release();
      playing.cancel();
    };
  }, [phase, reduced]);

  const isLeaving = useLeavesForInspiration(root, phase, reduced);
  useLayoutEffect(() => {
    onLeavingChange?.(isLeaving);
  }, [isLeaving, onLeavingChange]);
  const isInert = quiet || isLeaving;

  const isOut = phase.kind !== 'rest';
  useLayoutEffect(() => {
    onOpenChange?.(isOut);
  }, [isOut, onOpenChange]);

  const styles = partStyles(settledAt(phase, reduced));
  const isOpen = phase.kind === 'reveal' || phase.kind === 'revealed';
  const lit = phase.kind === 'exit' || phase.kind === 'gone' ? phase.picked : isOpen ? hovered : null;
  const pick = (kind: IdeaKind) => {
    if (!isOpen || isInert) return;
    setPhase({ kind: 'exit', picked: kind });
    const sending = onPick?.(kind);
    if (sending instanceof Promise) {
      void sending.then((sent) => {
        if (!sent) setPhase({ kind: 'revealed' });
      });
    }
  };
  const cards = phase.kind === 'rest' ? (['landing'] as const) : (['component', 'visualization', 'landing'] as const);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div
        ref={root}
        data-testid="ready-canvas"
        data-phase={phase.kind}
        data-quiet={quiet || undefined}
        data-leaving={isLeaving || undefined}
        style={{
          position: 'absolute',
          top: `calc(50% - ${String(STAGE.height / 2)}px)`,
          left: seatLeft(phase),
          ...STAGE,
          opacity: quiet ? 0 : 1,
          transition: ['opacity 360ms cubic-bezier(0.2, 0, 0, 1)', seatTransition(phase, reduced)].filter(Boolean).join(', '),
        }}
      >
        <div data-idea-part="stage" style={{ position: 'absolute', left: 0, top: 0, ...STAGE, transformOrigin: '0 0', ...styles.stage }}>
          <div data-idea-part="words" style={{ position: 'absolute', inset: 0, ...styles.words }}>
            <div style={{ position: 'absolute', top: WORDS.top, left: 0, width: WORDS.width, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              <Text type="large" weight="medium" color="primary">
                {t('canvas.empty.ready.title')}
              </Text>
              <Text type="body" color="secondary" style={{ textWrap: 'pretty', whiteSpace: 'pre-line' }}>
                {t('canvas.empty.ready.body')}
              </Text>
              <div style={{ marginTop: 'var(--spacing-2)', pointerEvents: isInert || phase.kind !== 'rest' ? 'none' : 'auto' }}>
                <Button
                  label={t('canvas.empty.ready.ideas')}
                  variant="primary"
                  size="md"
                  onClick={() => setPhase((now) => (now.kind === 'rest' ? { kind: 'reveal' } : now))}
                  isDisabled={quiet}
                  endContent={<Icon icon={SendArrowIcon} size="sm" color="inherit" />}
                />
              </div>
            </div>
            <BrushArrow />
          </div>
          {cards.map((kind) => (
            <button
              key={kind}
              type="button"
              data-idea-part={`card:${kind}`}
              aria-labelledby={`idea-caption-${kind}`}
              tabIndex={isOpen && !isInert ? 0 : -1}
              disabled={!isOpen || isInert}
              onClick={() => pick(kind)}
              onPointerEnter={() => setHovered(kind)}
              onPointerLeave={() => setHovered((now) => (now === kind ? null : now))}
              onFocus={() => setHovered(kind)}
              onBlur={() => setHovered((now) => (now === kind ? null : now))}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                ...CARD,
                padding: 0,
                border: 'none',
                background: 'none',
                borderRadius: 8,
                outline: 'none',
                cursor: isOpen ? 'pointer' : 'default',
                pointerEvents: isOpen && !isInert ? 'auto' : 'none',
                ...styles[`card:${kind}`],
              }}
            >
              <div className={kind === 'landing' && initialPhase.kind === 'rest' ? 'frame-scale-in' : undefined}>
                <IdeaCard kind={kind} styles={styles} isLit={lit === kind} />
              </div>
            </button>
          ))}
        </div>
        {phase.kind === 'rest'
          ? null
          : IDEA_ORDER.map((kind) => (
              <button
                key={kind}
                type="button"
                tabIndex={-1}
                aria-hidden
                id={`idea-caption-${kind}`}
                data-idea-part={`caption:${kind}`}
                onClick={() => pick(kind)}
                onPointerEnter={() => setHovered(kind)}
                onPointerLeave={() => setHovered((now) => (now === kind ? null : now))}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: captionWidth,
                  padding: 0,
                  border: 'none',
                  background: 'none',
                  textAlign: 'start',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  cursor: isOpen ? 'pointer' : 'default',
                  pointerEvents: isOpen && !isInert ? 'auto' : 'none',
                  ...styles[`caption:${kind}`],
                }}
              >
                <Text type="body" weight="medium" color="primary" maxLines={1}>
                  {t(IDEA_CAPTION[kind].title)}
                </Text>
                <Text type="supporting" color={lit === kind ? 'primary' : 'secondary'} maxLines={2} style={{ transition: 'color 120ms cubic-bezier(0.2, 0, 0, 1)' }}>
                  {t(IDEA_CAPTION[kind].body)}
                </Text>
              </button>
            ))}
      </div>
    </div>
  );
}
