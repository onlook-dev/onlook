import type { NextTasksCardData } from '@studio/chat-ui';

/** How long past the turn's end a card waits on a clip before it shows that task as text (ONL-2977). */
export const PICTURE_WAIT_MS = 1_000;

export interface ClipToTrack {
  id: string;
  /** The card's turn has ended, so the card is ready to show. */
  ended: boolean;
}

export function clipsToTrack(cards: ReadonlyMap<string, NextTasksCardData>): ClipToTrack[] {
  const clips: ClipToTrack[] = [];
  for (const card of cards.values()) {
    for (const task of card.tasks) {
      if (task.picture !== undefined && 'clip' in task.picture) clips.push({ id: task.picture.clip, ended: card.state.kind !== 'waiting' });
    }
  }
  return clips;
}

export interface PictureLoads {
  track: (clips: readonly ClipToTrack[]) => void;
  /** The clip's object URL, `null` where the card shows text, `undefined` while it is still loading. */
  read: (id: string) => string | null | undefined;
  subscribe: (listener: () => void) => () => void;
  version: () => number;
}

interface PictureLoadsDeps {
  resolve: (ref: { id: string }) => Promise<string | null>;
  peek: (ref: { id: string }) => string | null | undefined;
  schedule?: (ms: number, run: () => void) => void;
}

/** A clip given up on stays text even if its bytes arrive later, so a shown card never changes height (ONL-2977). */
export function createPictureLoads({ resolve, peek, schedule = (ms, run) => void setTimeout(run, ms) }: PictureLoadsDeps): PictureLoads {
  const loads = new Map<string, string | null | undefined>();
  const waiting = new Set<string>();
  const listeners = new Set<() => void>();
  let version = 0;
  const settle = (id: string, url: string | null): void => {
    if (loads.get(id) !== undefined || !loads.has(id)) return;
    loads.set(id, url);
    version += 1;
    for (const listener of listeners) listener();
  };

  return {
    track(clips) {
      for (const { id, ended } of clips) {
        if (!loads.has(id)) {
          const known = peek({ id });
          loads.set(id, known);
          if (known === undefined) void resolve({ id }).then((url) => settle(id, url));
        }
        if (ended && loads.get(id) === undefined && !waiting.has(id)) {
          waiting.add(id);
          schedule(PICTURE_WAIT_MS, () => settle(id, null));
        }
      }
    },
    read(id) {
      return loads.has(id) ? loads.get(id) : peek({ id });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    version: () => version,
  };
}
