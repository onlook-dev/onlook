// The book verbatim as main broadcast it; an aggregate loses which server a fact is about.

import { create } from 'zustand';
import { runFeedback } from './runFeedbackStore.js';
import {
  localPort,
  type ServerBookState,
  type ServerEntryState,
} from '@studio/events';
import { studio } from '../bridge.js';

export type RunState = 'idle' | 'starting' | 'running' | 'stopping';

interface DevServerStore {
  entries: ServerEntryState[];
  pending: boolean;
  starterSpawning: boolean;
  /** The one run-state fact the renderer owns: main cannot report `stopping` for a server that has not started. */
  stopPressed: boolean;
  apply: (book: ServerBookState) => void;
  markStopPressed: (ttlMs?: number) => void;
  clearStopPressed: () => void;
}

// Required: `apply` runs only on a broadcast and main dedupes an unchanged book, so without a deadline a press can read `Stopping…` for the session.
const STOP_PRESSED_TTL_MS = 10_000;

let stopPressedTimer: ReturnType<typeof setTimeout> | undefined;

export const useServerStore = create<DevServerStore>()((set) => ({
  entries: [],
  pending: false,
  starterSpawning: false,
  stopPressed: false,
  apply: (book) => {
    runFeedback.observe(book);
    const isSettling = book.pending || book.entries.some((entry) => entry.status === 'starting');
    set((state) => {
      const keep = state.stopPressed && isSettling;
      if (!keep && stopPressedTimer !== undefined) {
        clearTimeout(stopPressedTimer);
        stopPressedTimer = undefined;
      }
      return { entries: book.entries, pending: book.pending, starterSpawning: book.starterSpawning === true, stopPressed: keep };
    });
  },
  markStopPressed: (ttlMs = STOP_PRESSED_TTL_MS) => {
    if (stopPressedTimer !== undefined) clearTimeout(stopPressedTimer);
    stopPressedTimer = setTimeout(() => {
      stopPressedTimer = undefined;
      set({ stopPressed: false });
    }, ttlMs);
    set({ stopPressed: true });
  },
  clearStopPressed: () => {
    if (stopPressedTimer !== undefined) {
      clearTimeout(stopPressedTimer);
      stopPressedTimer = undefined;
    }
    set({ stopPressed: false });
  },
}));


/** The port half: at re-verify the open measures a persisted claim live before the monitor probes past `starting`. */
function entryMeasuresLive(entry: ServerEntryState): boolean {
  return (
    entry.status === 'running' ||
    // `stop-failed` is still up.
    entry.status === 'stop-failed' ||
    entry.ports.some((p) => p.measured === 'live')
  );
}

export function hasLiveEntry(entries: readonly ServerEntryState[]): boolean {
  return entries.some((entry) => entry.ownership !== 'users-own' && entryMeasuresLive(entry));
}

function claimsFrameUrl(entry: ServerEntryState, frameUrls: readonly string[]): boolean {
  return frameUrls.some((url) => {
    const port = localPort(url);
    return port !== null && entry.ports.some((p) => p.port === port);
  });
}

/** A users-own entry never enters, live or dead: the agent cannot start a server in the user's checkout. */
export function promptedEntries(
  entries: readonly ServerEntryState[],
  frameUrls: readonly string[],
): ServerEntryState[] {
  return entries.filter(
    (entry) => entry.ownership !== 'users-own' && claimsFrameUrl(entry, frameUrls),
  );
}

function runStateOf(
  prompted: readonly ServerEntryState[],
  pending: boolean,
  stopPressed: boolean,
): RunState {
  if (prompted.some((entry) => entry.status === 'stopping')) return 'stopping';
  // Below main's own `stopping` so a measured truth wins; above `starting` so the label turns over on the press.
  if (stopPressed) return 'stopping';
  if (
    pending ||
    prompted.some((entry) => entry.status === 'starting' && !entryMeasuresLive(entry))
  ) {
    return 'starting';
  }
  if (prompted.length > 0 && prompted.every(entryMeasuresLive)) return 'running';
  return 'idle';
}

export function startPromptEntryIds(
  entries: readonly ServerEntryState[],
  frameUrls: readonly string[],
): string[] {
  return promptedEntries(entries, frameUrls)
    // Studio's own starter is main's to re-spawn, never the agent's (ONL-2152).
    .filter((entry) => !entryMeasuresLive(entry) && entry.ownership !== 'studio-started')
    .map((entry) => entry.entryId);
}

function starterAmong(prompted: readonly ServerEntryState[]): boolean {
  return prompted.some((entry) => entry.ownership === 'studio-started');
}

export function deriveRunControl(
  entries: readonly ServerEntryState[],
  pending: boolean,
  frameUrls: readonly string[],
  stopPressed = false,
): { runState: RunState; hasStarter: boolean } {
  const prompted = promptedEntries(entries, frameUrls);
  return { runState: runStateOf(prompted, pending, stopPressed), hasStarter: starterAmong(prompted) };
}

/** The one `server:state` seat: a second listener is a second copy that can disagree. */
export function subscribeToServerState(): () => void {
  const unsubscribe = studio().onServerState((state) => {
    useServerStore.getState().apply(state);
  });
  return () => { unsubscribe(); runFeedback.reset(); };
}
