import type { RefObject } from 'react';
import type { ArtifactAttachment } from '@studio/events';
import type { RecallHandle } from '@studio/chat-ui';

/** One walk step's restoration; everything it started asks this before it lands. */
export interface RecallRestorePass {
  readonly isCurrent: boolean;
}

export interface RecallRestore {
  /** Retires the pass in flight and takes the composer for a new one. */
  begin: () => RecallRestorePass;
  /** Hands the composer back; true when a pass was holding it. */
  cancel: () => boolean;
  /** True when this pass still holds the composer, which it then releases. */
  settle: (pass: RecallRestorePass) => boolean;
}

/**
 * The composer is held by at most one pass, and exactly one of `cancel` or
 * `settle` releases it (ONL-2509).
 */
export function createRecallRestore(): RecallRestore {
  let inFlight: { isCurrent: boolean } | undefined;
  const retire = (): boolean => {
    if (!inFlight) return false;
    inFlight.isCurrent = false;
    inFlight = undefined;
    return true;
  };
  return {
    begin: () => {
      retire();
      inFlight = { isCurrent: true };
      return inFlight;
    },
    cancel: retire,
    settle: (pass) => pass.isCurrent && retire(),
  };
}

/** Why a walk ended, as the panel reports it. */
export type RecallEnd = 'edit' | 'abandon';

/**
 * One ending for the walk and the pass it has in flight, so a composer the user
 * took back is never written by a read still in the air (ONL-2509).
 */
export function createEndRecall(
  restore: RecallRestore,
  walk: RefObject<RecallHandle | null>,
  composer: { setRestoring: (isRestoring: boolean) => void; setRecalling: (isRecalling: boolean) => void },
): (nextAction: RecallEnd) => void {
  return (nextAction) => {
    walk.current?.end(nextAction);
    // Both flags here, not only through the panel: a panel that remounted has no walk left to report.
    composer.setRecalling(false);
    if (restore.cancel()) composer.setRestoring(false);
  };
}

/**
 * The composer's payload controls, each ending the walk before it acts
 * (ONL-2509). Built in one call so a new control cannot quietly skip it.
 */
export function endingRecall<H extends Record<string, (...args: never[]) => void>>(
  end: (nextAction: RecallEnd) => void,
  controls: H,
): H {
  return Object.fromEntries(
    Object.entries(controls).map(([name, act]) => [name, (...args: never[]) => {
      end('edit');
      (act as (...rest: never[]) => void)(...args);
    }]),
  ) as H;
}

interface RecallRestoreWork {
  /** Resolves the names it could not read back; it swaps the composer's images only while current. */
  images: (isCurrent: () => boolean) => Promise<string[]>;
  artifacts: () => Promise<ArtifactAttachment[]>;
}

interface RecallRestoreSink {
  setArtifacts: (artifacts: ArtifactAttachment[]) => void;
  setMissing: (names: string[]) => void;
  setRestoring: (isRestoring: boolean) => void;
}

export interface RecallRestoreStep {
  work: RecallRestoreWork;
  /** The artifacts the walk asked for; any the read does not return is named missing. */
  requested: readonly ArtifactAttachment[];
  /** What the synchronous half already knew it could not bring back. */
  missing: readonly string[];
  sink: RecallRestoreSink;
  /** Stands in for a read that refused outright, with no name of its own. */
  unreadableLabel: string;
}

/** A recall's deferred half: a retired pass applies nothing it read (ONL-2509). */
export async function settleRecallRestore(
  restore: RecallRestore,
  pass: RecallRestorePass,
  { work, requested, missing, sink, unreadableLabel }: RecallRestoreStep,
): Promise<void> {
  let read;
  try {
    read = await Promise.all([work.images(() => pass.isCurrent), work.artifacts()]);
  } catch {
    if (!restore.settle(pass)) return;
    sink.setMissing([...missing, unreadableLabel]);
    sink.setRestoring(false);
    return;
  }
  if (!restore.settle(pass)) return;
  const [unreadableImages, artifacts] = read;
  const lost = requested.flatMap((reference) =>
    artifacts.some((artifact) => artifact.artifactId === reference.artifactId && artifact.pagePath === reference.pagePath) ? [] : [reference.title]);
  sink.setArtifacts(artifacts);
  sink.setMissing([...missing, ...unreadableImages, ...lost]);
  sink.setRestoring(false);
}
