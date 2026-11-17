import { isStartableCover, type FrameServerCover, type FrameShown } from '@studio/events';
import type { StartDriver } from '../../server/startUnderWay.js';

export type CoverState = 'agent-starting' | 'studio-starting' | 'not-started' | 'stopped' | 'nothing' | 'page-failed' | 'own-server' | 'port-taken' | 'container';

export type CoverAction = 'start' | 'restart' | 'try-again' | 'back' | 'ask-agent';

export type FrameShows =
  | { kind: 'page' }
  | { kind: 'quote'; quote: string }
  | { kind: 'cover'; cover: CoverState; actions: readonly CoverAction[]; waits: boolean };

export interface FrameCoverView {
  /** A load of this Frame has ended since it mounted. */
  hasLoaded: boolean;
  canAsk: boolean;
  startedBy: StartDriver;
}

const SERVER_COVER: Record<FrameServerCover, CoverState> = {
  'non-started': 'not-started',
  dead: 'stopped',
  'users-own': 'own-server',
  occupied: 'port-taken',
  container: 'container',
};

const FIX: Partial<Record<CoverState, CoverAction>> = {
  'not-started': 'start',
  stopped: 'restart',
  nothing: 'try-again',
  'page-failed': 'back',
};

export type AskableCover = 'not-started' | 'stopped' | 'nothing';

const ASKABLE: ReadonlySet<CoverState> = new Set<AskableCover>(['not-started', 'stopped', 'nothing']);

/** A failure cover sits over the guest's own error page, so it never waits. */
const SHOWS_AT_ONCE: ReadonlySet<CoverState> = new Set<CoverState>(['nothing', 'page-failed']);

export function isAskableCover(cover: CoverState): cover is AskableCover {
  return ASKABLE.has(cover);
}

function coverFor(shown: Exclude<FrameShown, { kind: 'page' | 'quote' }>, startedBy: StartDriver): CoverState | undefined {
  switch (shown.kind) {
    case 'starting':
      return startedBy === 'agent' ? 'agent-starting' : 'studio-starting';
    case 'loading':
      return undefined;
    case 'cover':
      return SERVER_COVER[shown.cover];
    case 'load-failed':
      return 'page-failed';
    case 'unreachable':
      return 'nothing';
  }
}

/** `shownOverFrame` decides what a frame shows; this names its cover and the buttons on it, Studio's own fix first. A loading frame keeps the plain ground (ONL-2960). */
export function frameCover(shown: FrameShown, view: FrameCoverView): FrameShows {
  if (shown.kind === 'page' || shown.kind === 'quote') return shown;
  const cover = coverFor(shown, view.startedBy);
  if (cover === undefined) return { kind: 'page' };
  const fix = FIX[cover];
  const actions: CoverAction[] = fix === undefined ? [] : [fix];
  if (view.canAsk && isAskableCover(cover)) actions.push('ask-agent');
  return { kind: 'cover', cover, actions, waits: !view.hasLoaded && !SHOWS_AT_ONCE.has(cover) };
}

export interface OlderCover<F> {
  /** Main's `starting` server cover: a server Studio can start is starting. */
  isStarting: boolean;
  isDead: boolean;
  namedFailure: F | undefined;
  recoverable: boolean;
}

/** With `frame-covers` off, main's own reading of a Frame that can't show its page: no start under way, no quote (ONL-2960). */
export function olderCover<F>(facts: { serverCover: FrameServerCover | undefined; serverStarting: boolean; health: string; serverLive: boolean; loadFailure: F | undefined }): OlderCover<F> {
  const isStarting = facts.serverStarting && isStartableCover(facts.serverCover);
  const isDead = facts.serverCover === undefined && facts.health === 'unreachable';
  const namedFailure = isDead && facts.serverLive ? facts.loadFailure : undefined;
  const recoverable = !isStarting && (isStartableCover(facts.serverCover) || (isDead && namedFailure === undefined));
  return { isStarting, isDead, namedFailure, recoverable };
}
