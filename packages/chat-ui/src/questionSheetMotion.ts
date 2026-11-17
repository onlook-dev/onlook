import { createContext, useContext } from 'react';

const SHEET_EASE = 'cubic-bezier(0.24, 1, 0.4, 1)';

export const SHEET_TIMING = {
  rowIn: 360,
  rowInFrom: -8,
  cardIn: 220,
  cardRise: 12,
  contentsInDelay: 120,
  contentsIn: 200,
  contentsRise: 4,
  contentsOut: 100,
  cardOutDelay: 60,
  cardOut: 180,
  rowOut: 300,
  recordInDelay: 160,
  recordIn: 240,
  recordRise: 6,
  dismissedInDelay: 120,
  dismissedIn: 200,
} as const;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function growHeight(element: HTMLElement, from: number, to: number, duration: number, options: { fill?: FillMode; marginTop?: [number, number] } = {}): Animation | undefined {
  if (prefersReducedMotion() || typeof element.animate !== 'function' || from === to) return undefined;
  const [marginFrom, marginTo] = options.marginTop ?? [0, 0];
  return element.animate(
    // react-doctor-disable-next-line react-doctor/no-layout-property-animation
    [{ height: `${from}px`, marginTop: `${marginFrom}px` }, { height: `${to}px`, marginTop: `${marginTo}px` }],
    { duration, easing: SHEET_EASE, fill: options.fill ?? 'none' },
  );
}

export function fade(element: HTMLElement, direction: 'in' | 'out', duration: number, options: { delay?: number; rise?: number } = {}): Animation | undefined {
  if (prefersReducedMotion() || typeof element.animate !== 'function') return undefined;
  const hidden = { opacity: 0, transform: `translateY(${options.rise ?? 0}px)` };
  const shown = { opacity: 1, transform: 'translateY(0px)' };
  return element.animate(direction === 'in' ? [hidden, shown] : [shown, hidden], {
    duration,
    delay: options.delay ?? 0,
    easing: SHEET_EASE,
    fill: direction === 'in' ? 'backwards' : 'forwards',
  });
}

export interface QuestionSheetScope {
  /** Tool calls whose answers the sheet just sent, so their record rises in rather than appears. */
  justAnswered: ReadonlySet<string>;
  /** Tool calls the sheet just closed on a dismissal, so their line fades in rather than appears. */
  justDismissed: ReadonlySet<string>;
}

const NOTHING_JUST_SETTLED: QuestionSheetScope = { justAnswered: new Set(), justDismissed: new Set() };

export const QuestionSheetContext = createContext<QuestionSheetScope>(NOTHING_JUST_SETTLED);

export function useQuestionSheetScope(): QuestionSheetScope {
  return useContext(QuestionSheetContext);
}
