import type { Owned, Tab } from './tab.js';

/**
 * Where a Tab's view stands with its first frame; absent on the record when there is nothing to wait for.
 *
 * - `held`: held off screen, not watched yet.
 * - `waiting`: held off screen, watched.
 * - `loading`: placed in the window before its frame, still watched.
 *
 * `ready` is whether the renderer has reported `ui:ready` since its last main-frame navigation.
 */
export type FirstPaintPhase =
  | { readonly kind: 'held' }
  | { readonly kind: 'waiting' | 'loading'; readonly run: number; readonly ready: boolean };

/**
 * The background warm of a restored Tab: `loading` is a renderer being built, `ready` has
 * reported `ui:ready`, `primed` has given a frame, so the press that selects it has nothing
 * left to wait for. `turn` is the prewarm queue's, handed on once (ONL-3153).
 */
export interface WarmPhase {
  readonly phase: 'loading' | 'ready' | 'primed';
  readonly run: number;
  readonly turn: 'held' | 'passed';
}

/** `covering`: the outgoing view is over the incoming Tab. `settling`: the incoming Tab is what the user sees, and its frame is still watched. */
export type CoverPhase =
  | { readonly kind: 'none' }
  | { readonly kind: 'covering' | 'settling'; readonly tabId: string; readonly run: number };

/** One deadline at a time, for the Tab the user picked to reach the screen (ONL-3121). */
export type DeadlinePhase =
  | { readonly kind: 'idle' }
  | { readonly kind: 'armed'; readonly tabId: string; readonly run: number };

export type FirstPaintEvent =
  | { type: 'held-back' | 'handed-over' | 'view-discarded'; tab: Tab }
  | { type: 'watch-started' | 'ui-ready' | 'navigated' | 'overdue' | 'placed' | 'given-up' | 'first-painted' | 'view-gone'; tab: Tab; run: number };

export type CoverEvent =
  | { type: 'cover-raised'; tabId: string; run: number }
  | { type: 'cover-lifted' | 'cover-frame-due' | 'cover-painted'; run: number }
  | { type: 'cover-handed-over' | 'cover-dropped' };

export type DeadlineEvent =
  | { type: 'deadline-armed'; tabId: string; run: number }
  | { type: 'deadline-elapsed'; run: number }
  | { type: 'deadline-cleared' };

export type ShownEvent = { type: 'shown' | 'forgotten'; tabId: string };

export type WarmEvent =
  | { type: 'warm-started' | 'warm-ready' | 'warm-primed' | 'warm-overdue' | 'warm-view-gone'; tab: Tab; run: number }
  | { type: 'warm-ended'; tab: Tab };

export type FailureEvent = { type: 'paint-failed' | 'paint-recovered'; tab: Tab };

export type PresentationEvent = FirstPaintEvent | CoverEvent | DeadlineEvent | ShownEvent | WarmEvent | FailureEvent;

/**
 * - `moved`: taken, and a phase changed.
 * - `stayed`: taken, and nothing changed.
 * - `stale`: an answer for a run that is no longer the one in force; dropped.
 * - `refused`: not a step this phase can take; reported, and nothing changed.
 */
export type Verdict = 'moved' | 'stayed' | 'stale' | 'refused';

export interface PresentationRefusal {
  event: PresentationEvent['type'];
  phase: string;
  tabId?: string;
}

const STALE = 'stale';
const REFUSED = 'refused';
type Dropped = typeof STALE | typeof REFUSED;

const NO_COVER: CoverPhase = { kind: 'none' };
const IDLE: DeadlinePhase = { kind: 'idle' };

/** Held off screen until its first frame (ONL-2318). */
export function awaitsFirstPaint(tab: { readonly firstPaint?: FirstPaintPhase | undefined }): boolean {
  return tab.firstPaint?.kind === 'held' || tab.firstPaint?.kind === 'waiting';
}

/** A first-paint watch is live and the Tab can still be asked for its frame. */
export function isWatched(tab: { readonly firstPaint?: FirstPaintPhase | undefined }): boolean {
  const kind = tab.firstPaint?.kind;
  return kind === 'waiting' || kind === 'loading';
}

export function firstPaintStep(phase: FirstPaintPhase | undefined, event: FirstPaintEvent): FirstPaintPhase | undefined | Dropped {
  switch (event.type) {
    case 'held-back':
      return phase === undefined ? { kind: 'held' } : REFUSED;
    case 'watch-started':
      return phase?.kind === 'held' ? { kind: 'waiting', run: event.run, ready: false } : REFUSED;
    case 'handed-over':
      if (phase === undefined || phase.kind === 'loading') return phase;
      return phase.kind === 'held' ? undefined : { kind: 'loading', run: phase.run, ready: phase.ready };
    case 'view-discarded':
      // The view takes its watch with it: whatever that view answers later belongs to a run that is over.
      return undefined;
    case 'ui-ready':
    case 'navigated':
    case 'overdue':
    case 'placed':
    case 'given-up':
    case 'first-painted':
    case 'view-gone':
      if (phase === undefined || phase.kind === 'held' || phase.run !== event.run) return STALE;
      return watchedStep(phase, event.type);
    default: {
      const unreached: never = event;
      throw new Error(`unhandled first-paint event ${(unreached as { type: string }).type}`);
    }
  }
}

type Watched = Exclude<FirstPaintPhase, { kind: 'held' }>;

function watchedStep(phase: Watched, type: 'ui-ready' | 'navigated' | 'overdue' | 'placed' | 'given-up' | 'first-painted' | 'view-gone'): FirstPaintPhase | undefined | Dropped {
  switch (type) {
    case 'ui-ready':
      return phase.ready ? phase : { ...phase, ready: true };
    case 'navigated':
      return phase.ready ? { ...phase, ready: false } : phase;
    case 'overdue':
      return phase;
    case 'placed':
      return phase.kind === 'loading' ? REFUSED : { kind: 'loading', run: phase.run, ready: phase.ready };
    case 'given-up':
    case 'first-painted':
    case 'view-gone':
      return undefined;
    default: {
      const unreached: never = type;
      throw new Error(`unhandled first-paint event ${String(unreached)}`);
    }
  }
}

export function coverStep(phase: CoverPhase, event: CoverEvent): CoverPhase | Dropped {
  switch (event.type) {
    case 'cover-raised':
      return phase.kind === 'none' ? { kind: 'covering', tabId: event.tabId, run: event.run } : REFUSED;
    case 'cover-handed-over':
      if (phase.kind === 'none') return REFUSED;
      return phase.kind === 'covering' ? { kind: 'settling', tabId: phase.tabId, run: phase.run } : phase;
    case 'cover-dropped':
      return phase.kind === 'none' ? phase : NO_COVER;
    case 'cover-lifted':
      if (phase.kind === 'none' || phase.run !== event.run) return STALE;
      return phase.kind === 'covering' ? { kind: 'settling', tabId: phase.tabId, run: phase.run } : phase;
    case 'cover-frame-due':
      return phase.kind === 'none' || phase.run !== event.run ? STALE : phase;
    case 'cover-painted':
      return phase.kind === 'none' || phase.run !== event.run ? STALE : NO_COVER;
    default: {
      const unreached: never = event;
      throw new Error(`unhandled cover event ${(unreached as { type: string }).type}`);
    }
  }
}

export function deadlineStep(phase: DeadlinePhase, event: DeadlineEvent): DeadlinePhase | Dropped {
  switch (event.type) {
    case 'deadline-armed':
      return phase.kind === 'idle' ? { kind: 'armed', tabId: event.tabId, run: event.run } : REFUSED;
    case 'deadline-cleared':
      return phase.kind === 'idle' ? phase : IDLE;
    case 'deadline-elapsed':
      return phase.kind === 'idle' || phase.run !== event.run ? STALE : IDLE;
    default: {
      const unreached: never = event;
      throw new Error(`unhandled deadline event ${(unreached as { type: string }).type}`);
    }
  }
}

export function warmStep(phase: WarmPhase | undefined, event: WarmEvent): WarmPhase | undefined | Dropped {
  if (event.type === 'warm-ended') return undefined;
  if (event.type === 'warm-started') return phase === undefined ? { phase: 'loading', run: event.run, turn: 'held' } : REFUSED;
  if (phase === undefined || phase.run !== event.run) return STALE;
  const type = event.type;
  switch (type) {
    case 'warm-ready':
      return phase.phase === 'loading' ? { ...phase, phase: 'ready' } : REFUSED;
    case 'warm-primed':
      return phase.phase === 'ready' ? { ...phase, phase: 'primed', turn: 'passed' } : REFUSED;
    case 'warm-overdue':
      return phase.phase === 'primed' || phase.turn === 'passed' ? REFUSED : { ...phase, turn: 'passed' };
    case 'warm-view-gone':
      return undefined;
    default: {
      const unreached: never = type;
      throw new Error(`unhandled warm event ${String(unreached)}`);
    }
  }
}

type Phases = Owned<'firstPaint' | 'warming' | 'paintFailed'>;

const phasesOf = (tab: Tab): Phases => tab as Phases;

/**
 * Every phase of a Tab's way to the screen, and the one door they change through.
 *
 * Per Tab, on its record: the first-paint watch, the background warm, the paint-failure mark.
 * Per window, here: which Tab is shown, the cover, the present deadline. Each region has its
 * own small table (the `*Step` functions above); an event belongs to exactly one.
 *
 * Whatever answers later (a timer, a renderer's report, a capture, a view's `destroyed`) takes
 * a run number when its operation starts and hands it back with its answer. An answer for a
 * run that is no longer in force is `stale` and changes nothing. A view that is discarded,
 * found dead or closed with its Tab takes its watch with it, so nothing it answers afterwards
 * can place it again or reach the Tab's next view. A step the phase cannot take
 * is `refused`: reported to the owner, which logs it, and thrown by the test seat.
 *
 * No effect happens here: `presentation.ts` attaches, shows, times and listens.
 */
export class PresentationMachine {
  private shownId: string | undefined;
  private coverPhase: CoverPhase = NO_COVER;
  private deadlinePhase: DeadlinePhase = IDLE;
  private runs = 0;
  private readonly refused: (refusal: PresentationRefusal) => void;

  constructor(refused: (refusal: PresentationRefusal) => void) {
    this.refused = refused;
  }

  /** ⚠️ The Tab whose view is ON SCREEN, which is not the selected one while that is held back. */
  get shown(): string | undefined {
    return this.shownId;
  }

  get cover(): CoverPhase {
    return this.coverPhase;
  }

  get deadline(): DeadlinePhase {
    return this.deadlinePhase;
  }

  /** The number an operation's later answers must hand back. */
  nextRun(): number {
    this.runs += 1;
    return this.runs;
  }

  dispatch(event: PresentationEvent): Verdict {
    switch (event.type) {
      case 'held-back':
      case 'watch-started':
      case 'ui-ready':
      case 'navigated':
      case 'handed-over':
      case 'overdue':
      case 'placed':
      case 'given-up':
      case 'first-painted':
      case 'view-gone':
      case 'view-discarded': {
        const phase = event.tab.firstPaint;
        const next = firstPaintStep(phase, event);
        if (next === STALE || next === REFUSED) return this.dropped(next, event.type, phase?.kind ?? 'none', event.tab.id);
        if (next === phase) return 'stayed';
        if (next === undefined) delete phasesOf(event.tab).firstPaint;
        else phasesOf(event.tab).firstPaint = next;
        return 'moved';
      }
      case 'cover-raised':
      case 'cover-handed-over':
      case 'cover-lifted':
      case 'cover-frame-due':
      case 'cover-painted':
      case 'cover-dropped': {
        const next = coverStep(this.coverPhase, event);
        if (next === STALE || next === REFUSED) return this.dropped(next, event.type, this.coverPhase.kind);
        if (next === this.coverPhase) return 'stayed';
        this.coverPhase = next;
        return 'moved';
      }
      case 'deadline-armed':
      case 'deadline-cleared':
      case 'deadline-elapsed': {
        const next = deadlineStep(this.deadlinePhase, event);
        if (next === STALE || next === REFUSED) return this.dropped(next, event.type, this.deadlinePhase.kind);
        if (next === this.deadlinePhase) return 'stayed';
        this.deadlinePhase = next;
        return 'moved';
      }
      case 'shown':
        if (this.shownId === event.tabId) return 'stayed';
        this.shownId = event.tabId;
        return 'moved';
      case 'forgotten':
        if (this.shownId !== event.tabId) return 'stayed';
        this.shownId = undefined;
        return 'moved';
      case 'warm-started':
      case 'warm-ready':
      case 'warm-primed':
      case 'warm-overdue':
      case 'warm-view-gone':
      case 'warm-ended': {
        const phase = event.tab.warming;
        const next = warmStep(phase, event);
        if (next === STALE || next === REFUSED) return this.dropped(next, event.type, phase === undefined ? 'none' : `${phase.phase}, turn ${phase.turn}`, event.tab.id);
        if (next === phase) return 'stayed';
        if (next === undefined) delete phasesOf(event.tab).warming;
        else phasesOf(event.tab).warming = next;
        return 'moved';
      }
      case 'paint-failed':
        if (event.tab.paintFailed === true) return 'stayed';
        phasesOf(event.tab).paintFailed = true;
        return 'moved';
      case 'paint-recovered':
        if (event.tab.paintFailed !== true) return 'stayed';
        delete phasesOf(event.tab).paintFailed;
        return 'moved';
      default: {
        const unreached: never = event;
        throw new Error(`unhandled presentation event ${(unreached as { type: string }).type}`);
      }
    }
  }

  private dropped(verdict: Dropped, event: PresentationEvent['type'], phase: string, tabId?: string): Verdict {
    if (verdict === REFUSED) this.refused({ event, phase, ...(tabId === undefined ? {} : { tabId }) });
    return verdict;
  }
}
