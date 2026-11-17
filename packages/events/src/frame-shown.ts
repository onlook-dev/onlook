import type { ArtifactReadState } from './artifacts.js';
import { localPort } from './canvas-url.js';
import type { FrameHealth } from './frame-facts.js';
import type { ServerAttribution, ServerPortState, ServerStatus } from './server.js';

/** Every value mounts no guest: a guest's pixels there are a stale render, an error page, or another process. */
export type FrameServerCover = 'non-started' | 'dead' | 'users-own' | 'occupied' | 'container';

export interface ServerClaims {
  ownership: ServerAttribution;
  /** Main's book holds no run status; only the broadcast entries carry it. */
  status?: ServerStatus;
  ports: readonly Pick<ServerPortState, 'port' | 'measured' | 'everLive' | 'listener'>[];
}

export interface PortMatch<E extends ServerClaims> {
  entry: E;
  port: E['ports'][number];
}

export function matchServerPort<E extends ServerClaims>(entries: readonly E[], url: string): PortMatch<E> | undefined {
  const port = localPort(url);
  if (port === null) return undefined;
  let first: PortMatch<E> | undefined;
  for (const entry of entries) {
    const claimed = entry.ports.find((p) => p.port === port);
    if (claimed === undefined) continue;
    if (claimed.measured === 'live') return { entry, port: claimed };
    first ??= { entry, port: claimed };
  }
  return first;
}

export function frameServerCover(entries: readonly ServerClaims[], url: string): FrameServerCover | undefined {
  const match = matchServerPort(entries, url);
  if (match === undefined || match.port.measured === 'live') return undefined;
  if (match.port.measured === 'stranger') {
    return match.port.listener === 'container' ? 'container' : 'occupied';
  }
  if (match.entry.ownership === 'users-own') return 'users-own';
  return match.port.everLive ? 'dead' : 'non-started';
}

/** A stranger's port and the user's own server are not Studio's to press (ONL-2897). */
export function isStartableCover(cover: FrameServerCover | undefined): boolean {
  return cover === 'dead' || cover === 'non-started';
}

export function frameServerFacts(
  entries: readonly ServerClaims[],
  frame: { pointedUrl: string; pendingHome: boolean },
): { cover: FrameServerCover | undefined; serverLive: boolean; serverStarting: boolean } {
  const match = matchServerPort(entries, frame.pointedUrl);
  return {
    cover: frame.pendingHome ? 'non-started' : frameServerCover(entries, frame.pointedUrl),
    serverLive: match?.port.measured === 'live',
    serverStarting: match?.entry.status === 'starting',
  };
}

export type FrameShown =
  | { kind: 'page' }
  | { kind: 'loading' }
  /** A server Studio can start is starting, a restart on reopen included (ONL-2960). */
  | { kind: 'starting' }
  | { kind: 'quote'; quote: string }
  | { kind: 'cover'; cover: FrameServerCover }
  | { kind: 'load-failed' }
  | { kind: 'unreachable' };

export type FrameShownUnderQuote = Exclude<FrameShown, { kind: 'quote' }>;

export interface FrameShownFacts {
  health: FrameHealth;
  cover: FrameServerCover | undefined;
  serverLive: boolean;
  /** A Start is pending or the frame's server reads `starting`. */
  serverStarting: boolean;
  loadFailed: boolean;
  quote: string | undefined;
  turnRunning: boolean;
}

/** A named load failure needs the server answering: with it down, "the page failed" would hide the real cause (ONL-2336). */
export function frameUnderQuote(facts: Omit<FrameShownFacts, 'quote' | 'turnRunning'>): FrameShownUnderQuote {
  if (facts.cover !== undefined) {
    return isStartableCover(facts.cover) && facts.serverStarting ? { kind: 'starting' } : { kind: 'cover', cover: facts.cover };
  }
  if (facts.health === 'unreachable') return facts.serverLive && facts.loadFailed ? { kind: 'load-failed' } : { kind: 'unreachable' };
  return facts.health === 'loading' ? { kind: 'loading' } : { kind: 'page' };
}

/** While its turn runs the quote outranks every cover; after it, a broken frame shows its cover, and one starting or loading is not broken yet (ONL-2960). */
export function shownOverFrame(facts: FrameShownFacts): FrameShown {
  const under = frameUnderQuote(facts);
  if (facts.quote === undefined) return under;
  const isBroken = under.kind !== 'page' && under.kind !== 'loading' && under.kind !== 'starting';
  return facts.turnRunning || !isBroken ? { kind: 'quote', quote: facts.quote } : under;
}

export type ArtifactShown = { kind: 'artifact' } | { kind: 'quote'; quote: string };

export interface ArtifactShownFacts {
  quote: string | undefined;
  turnRunning: boolean;
  state: ArtifactReadState;
}

/** An artifact has no server, so only a missing one outranks the quote, and only once the turn ends (ONL-2960). */
export function shownOverArtifact(facts: ArtifactShownFacts): ArtifactShown {
  if (facts.quote !== undefined && (facts.turnRunning || facts.state !== 'missing')) {
    return { kind: 'quote', quote: facts.quote };
  }
  return { kind: 'artifact' };
}
