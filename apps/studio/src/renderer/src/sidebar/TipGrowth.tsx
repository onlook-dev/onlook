import { useLayoutEffect, useRef, useState } from 'react';
import { animate, domAnimation, LazyMotion, mix, useMotionValue, useMotionValueEvent, useReducedMotion, type MotionStyle, type Transition } from 'motion/react';
import * as m from 'motion/react-m';
import { observeResize, unobserveResize } from '@astryxdesign/core/utils';

import { TipsButton } from '../tips/TipsButton.js';
import type { FootGrowth, FootTip } from './footSeat.js';
import { TIP_PADDING } from '../panels/rowGeometry.js';

/** A spring of 0.45 s and bounce 0.1, written as physics so a reversal mid-flight keeps its velocity. */
const GROW: Transition = { type: 'spring', stiffness: 355, damping: 33.9 };
const CROSSFADE: Transition = { duration: 0.2, ease: 'linear' };
const TIP_IN: Transition = { duration: 0.12 };
const PILL_IN: Transition = { duration: 0.2, delay: 0.1 };

const WIDTH_LEADS = 0.5;
const PILL_CORNER = 1.5;
const PILL_GLYPH_LEFT = 11;
const EYEBROW_LINE = 20;
const EYEBROW_GAP = 4;

type GrowthFace = FootTip | 'pill';

interface Geometry {
  inset: number;
  seatW: number;
  pillW: number;
  pillH: number;
  tipH: number;
  cardRadius: number;
  ink: (k: number) => string;
  shadow: (k: number) => string;
  pillInk: string;
  pillShadow: string;
  pillWash: string;
  cardInk: string;
}

const band = (v: number, from: number, to: number): number => Math.min(1, Math.max(0, (v - from) / (to - from)));

/** The Tips pill and the tip grown out of it as one surface: it widens, then rises, the pill's label rides its top edge into the tip's eyebrow, and the tip's text shows once the surface is full width (ONL-3170). */
export function TipGrowth({ growth, tip, isTipFolding }: { growth: Exclude<FootGrowth, null>; tip: React.ReactNode; isTipFolding: boolean }): React.JSX.Element {
  const face: GrowthFace = growth.kind === 'tip' ? growth.tip : 'pill';
  const isTip = face !== 'pill';
  const isReduced = useReducedMotion() === true;

  const held = useRef<{ node: React.ReactNode; isFolding: boolean }>({ node: null, isFolding: false });
  useLayoutEffect(() => {
    if (isTip) held.current = { node: tip, isFolding: isTipFolding };
  });

  const seat = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLDivElement>(null);
  const tipLayer = useRef<HTMLDivElement>(null);
  const geo = useRef<Geometry | null>(null);
  const [box, setBox] = useState({ inset: 0, pillH: 0, tipH: 0 });
  const [isMoving, setIsMoving] = useState(false);
  const [isSettledTip, setIsSettledTip] = useState(isTip);
  const isOpening = useRef(isTip);
  const isTipNow = useRef(isTip);
  useLayoutEffect(() => {
    isTipNow.current = isTip;
  }, [isTip]);
  const isPainting = useRef(false);

  const progress = useMotionValue(isTip ? 1 : 0);
  const shape = useMotionValue(isTip ? 1 : 0);
  const entry = useMotionValue(1);

  const surface = {
    width: useMotionValue(0),
    height: useMotionValue(0),
    borderRadius: useMotionValue(0),
    cornerShape: useMotionValue(`superellipse(${String(PILL_CORNER)})`),
    backgroundColor: useMotionValue('transparent'),
    boxShadow: useMotionValue('none'),
  };
  const pillLayer = {
    x: useMotionValue(0),
    y: useMotionValue(0),
    opacity: useMotionValue(isTip ? 0 : 1),
    '--color-background-gray': useMotionValue(''),
    '--shadow-med': useMotionValue(''),
    '--color-overlay-hover': useMotionValue(''),
  };
  const tipLook = { opacity: useMotionValue(isTip ? 1 : 0), maskImage: useMotionValue('none'), '--color-background-muted': useMotionValue('') };

  const paint = (): void => {
    const g = geo.current;
    if (g === null) return;
    const s = shape.get();
    const k = progress.get();
    const settled = Math.min(1, Math.max(0, s));
    const cardW = g.seatW - 2 * g.inset;
    const cardH = g.tipH - g.inset;
    const height = g.pillH + (cardH - g.pillH) * s;
    surface.width.set(g.pillW + (cardW - g.pillW) * band(s, 0, WIDTH_LEADS));
    surface.height.set(height);
    surface.borderRadius.set(g.pillH / 2 + (g.cardRadius - g.pillH / 2) * settled);
    surface.cornerShape.set(`superellipse(${(PILL_CORNER + (1 - PILL_CORNER) * settled).toFixed(3)})`);
    const painting = isPainting.current;
    surface.backgroundColor.set(painting ? g.ink(settled) : 'transparent');
    surface.boxShadow.set(painting ? g.shadow(settled) : 'none');
    pillLayer['--color-background-gray'].set(painting ? 'transparent' : g.pillInk);
    pillLayer['--shadow-med'].set(painting ? 'none' : g.pillShadow);
    pillLayer['--color-overlay-hover'].set(painting ? 'transparent' : g.pillWash);
    tipLook['--color-background-muted'].set(painting ? 'transparent' : g.cardInk);

    pillLayer.x.set((g.inset - PILL_GLYPH_LEFT) * k);
    pillLayer.y.set(g.pillH - height + (g.inset + EYEBROW_LINE / 2 - g.pillH / 2) * k);
    pillLayer.opacity.set((1 - band(k, 0, 0.3)) * entry.get());

    const eyebrow = band(k, 0.08, 0.4);
    const body = isOpening.current ? band(k, 0.45, 0.85) : band(k, 0.72, 1);
    const edge = 2 * g.inset + EYEBROW_LINE + EYEBROW_GAP / 2;
    tipLook.opacity.set(isTipNow.current ? entry.get() : 1);
    tipLook.maskImage.set(!painting && k >= 1 ? 'none' : `linear-gradient(to bottom, rgb(0 0 0 / ${eyebrow.toFixed(3)}) ${String(edge)}px, rgb(0 0 0 / ${body.toFixed(3)}) ${String(edge)}px)`);
  };

  const measure = (): void => {
    const seatEl = seat.current;
    if (seatEl === null) return;
    const before = geo.current;
    const button = pill.current?.querySelector('[data-testid="canvas-tips"]')?.getBoundingClientRect();
    const inset = before?.inset ?? resolvedLength(seatEl, 'var(--spacing-3)');
    const seatW = seatEl.getBoundingClientRect().width;
    if (tipLayer.current !== null) tipLayer.current.style.width = `${String(seatW)}px`;
    geo.current = {
      ...(before ?? tokensOf(seatEl)),
      inset,
      seatW,
      pillW: button?.width ?? before?.pillW ?? 0,
      pillH: button?.height ?? before?.pillH ?? 0,
      tipH: tipLayer.current?.offsetHeight ?? before?.tipH ?? 0,
    };
    const next = { inset, pillH: geo.current.pillH, tipH: geo.current.tipH };
    setBox((current) => (current.inset === next.inset && current.pillH === next.pillH && current.tipH === next.tipH ? current : next));
    paint();
  };

  useMotionValueEvent(progress, 'change', paint);
  useMotionValueEvent(shape, 'change', paint);
  useMotionValueEvent(entry, 'change', paint);

  const showsTip = isTip || isSettledTip || isMoving;
  const showsPill = !isTip || !isSettledTip || isMoving;
  useResize(seat, measure, true);
  useResize(pill, measure, showsPill);
  useResize(tipLayer, measure, showsTip);

  const isMounted = useRef(false);
  const begin = (): (() => void) => {
    measure();
    if (!isMounted.current) {
      isMounted.current = true;
      if (!isTip) return () => undefined;
      entry.jump(0);
      const fadeIn = animate(entry, 1, TIP_IN);
      return () => fadeIn.stop();
    }
    isOpening.current = isTip;
    if (!isTip && held.current.isFolding) {
      isPainting.current = false;
      shape.jump(0);
      progress.jump(0);
      entry.jump(0);
      setIsMoving(false);
      setIsSettledTip(false);
      const fadeIn = animate(entry, 1, PILL_IN);
      return () => fadeIn.stop();
    }
    const target = isTip ? 1 : 0;
    entry.jump(1);
    isPainting.current = !isReduced;
    setIsMoving(true);
    if (isReduced) shape.jump(target);
    const grow = isReduced ? null : animate(shape, target, GROW);
    const reveal = animate(progress, target, isReduced ? CROSSFADE : GROW);
    void reveal.then(() => {
      isPainting.current = false;
      setIsMoving(false);
      setIsSettledTip(isTip);
      paint();
    });
    return () => {
      grow?.stop();
      reveal.stop();
    };
  };
  useLayoutEffect(begin, [isTip]);

  return (
    <LazyMotion features={domAnimation} strict>
      <div ref={seat} data-testid="foot-growth" data-growth={face} style={{ position: 'relative', height: isTip ? box.tipH : box.pillH + box.inset }}>
        <m.div style={{ position: 'absolute', insetInlineStart: box.inset, bottom: 0, overflow: 'hidden', ...surface } as MotionStyle}>
          {showsTip ? (
            <m.div ref={tipLayer} inert={!isTip} style={{ position: 'absolute', insetInlineStart: -box.inset, top: -box.inset, ...tipLook }}>
              {isTip ? tip : held.current.node}
            </m.div>
          ) : null}
        </m.div>
        {showsPill ? (
          <m.div ref={pill} inert={isTip} style={{ position: 'absolute', insetInlineStart: 0, bottom: 0, ...pillLayer }}>
            <FootPill />
          </m.div>
        ) : null}
      </div>
    </LazyMotion>
  );
}

function useResize(ref: React.RefObject<HTMLDivElement | null>, onResize: () => void, isMounted: boolean): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return;
    observeResize(el, onResize);
    return () => unobserveResize(el);
  }, [ref, isMounted]);
}

function tokensOf(scope: HTMLElement): Pick<Geometry, 'cardRadius' | 'ink' | 'shadow' | 'pillInk' | 'pillShadow' | 'pillWash' | 'cardInk'> {
  const pillInk = resolved(scope, 'backgroundColor', 'var(--color-background-gray)');
  const cardInk = resolved(scope, 'backgroundColor', 'var(--color-background-muted)');
  const lift = resolved(scope, 'boxShadow', 'var(--shadow-med)');
  return {
    cardRadius: resolvedLength(scope, 'var(--radius-container)'),
    ink: mix(pillInk, cardInk),
    shadow: mix(lift, lift.replace(/rgba?\([^)]*\)/, 'rgba(0, 0, 0, 0)')),
    pillInk,
    pillShadow: lift,
    pillWash: resolved(scope, 'backgroundColor', 'var(--color-overlay-hover)'),
    cardInk,
  };
}

function resolvedLength(scope: HTMLElement, value: string): number {
  return parseFloat(resolved(scope, 'width', value));
}

function resolved(scope: HTMLElement, property: 'width' | 'backgroundColor' | 'boxShadow', value: string): string {
  const probe = document.createElement('span');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style[property] = value;
  scope.appendChild(probe);
  const answer = getComputedStyle(probe)[property];
  probe.remove();
  return answer;
}

function FootPill(): React.JSX.Element {
  return (
    <div style={{ padding: TIP_PADDING, display: 'flex' }}>
      <TipsButton />
    </div>
  );
}
