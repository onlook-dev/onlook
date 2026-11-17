import type { ArtifactId, ArtifactSummary } from '@studio/events';
import { ignoreRefusal } from '../../refusal.js';
import { studio } from '../../bridge.js';

/** `undefined` is "no answer yet"; a refusal never settles, so it cannot read as a deletion. */
export type ArtifactRead = ArtifactSummary | null | undefined;
export type ArtifactInvalidation = 'content' | 'retry';

export interface ArtifactCache {
  resolve: (artifactId: ArtifactId) => Promise<ArtifactRead>;
  /** The settled answer, or `undefined` while there is none, so a remount does not flash missing. */
  peek: (artifactId: ArtifactId) => ArtifactRead;
  forget: (artifactId: ArtifactId, reason?: ArtifactInvalidation) => void;
  subscribe: (artifactId: ArtifactId, onForget: (reason: ArtifactInvalidation) => void, events?: 'content' | 'all') => () => void;
}

export function createArtifactCache(
  read: (artifactId: ArtifactId) => Promise<ArtifactSummary | null>,
  onRefusal: (error: unknown) => void = ignoreRefusal('canvas', 'artifactRead'),
): ArtifactCache {
  const inflight = new Map<ArtifactId, Promise<ArtifactRead>>();
  const settled = new Map<ArtifactId, ArtifactSummary | null>();
  const readers = new Map<ArtifactId, Set<(reason: ArtifactInvalidation) => void>>();

  return {
    resolve(artifactId): Promise<ArtifactRead> {
      const held = inflight.get(artifactId);
      if (held) return held;
      const readEntry = async (): Promise<ArtifactRead> => {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            const summary = await read(artifactId);
            if (inflight.get(artifactId) !== entry) return undefined;
            settled.set(artifactId, summary);
            return summary;
          } catch (error: unknown) {
            if (attempt === 2) {
              onRefusal(error);
              if (inflight.get(artifactId) === entry) inflight.delete(artifactId);
              return undefined;
            }
            await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
            if (inflight.get(artifactId) !== entry) return undefined;
          }
        }
        return undefined;
      };
      const entry = readEntry();
      inflight.set(artifactId, entry);
      return entry;
    },
    peek(artifactId): ArtifactRead {
      return settled.get(artifactId);
    },
    forget(artifactId, reason = 'content'): void {
      inflight.delete(artifactId);
      settled.delete(artifactId);
      // A copy: a listener that unsubscribes while being called must not shorten this walk.
      for (const onForget of [...(readers.get(artifactId) ?? [])]) onForget(reason);
    },
    subscribe(artifactId, onForget, events = 'content'): () => void {
      const held = readers.get(artifactId) ?? new Set<(reason: ArtifactInvalidation) => void>();
      const listener = (reason: ArtifactInvalidation) => { if (reason === 'content' || events === 'all') onForget(reason); };
      held.add(listener);
      readers.set(artifactId, held);
      return () => {
        held.delete(listener);
        if (held.size === 0) readers.delete(artifactId);
      };
    },
  };
}

let appCache: ArtifactCache | undefined;

function cache(): ArtifactCache {
  if (appCache === undefined) {
    appCache = createArtifactCache((artifactId) => studio().artifactRead({ artifactId }));
  }
  return appCache;
}

export const resolveArtifact = (artifactId: ArtifactId): Promise<ArtifactRead> => {
  return cache().resolve(artifactId);
};

export const peekArtifact = (artifactId: ArtifactId): ArtifactRead => cache().peek(artifactId);

/** A node naming a page the record no longer carries reads missing, so nothing about that page may be counted or shown (ONL-2568). */
export const servesPage = (artifact: ArtifactSummary, pagePath?: string): boolean =>
  pagePath === undefined || (artifact.pages?.some((page) => page.path === pagePath) ?? false);

export const forgetArtifact = (artifactId: ArtifactId, reason: ArtifactInvalidation = 'content'): void => {
  cache().forget(artifactId, reason);
};

export const subscribeArtifact = (artifactId: ArtifactId, onForget: (reason: ArtifactInvalidation) => void, events: 'content' | 'all' = 'content'): (() => void) => {
  return cache().subscribe(artifactId, onForget, events);
};
