import type { SessionState } from './events.js';

export interface TurnElapsed {
  /** The anchor a ticking readout counts from, with this turn's banked wait already taken out. */
  baseAt: number;
  /** What the row shows now: frozen at the park while paused. */
  elapsedMs: number;
  /** The agent is holding a question, so the row reads the waiting phrase instead of the number. */
  paused: boolean;
}

/** Absent without an anchor: the current time is never a stand-in for one, or a restore restarts the timer (ONL-2295). */
export function turnElapsed(
  state: Pick<SessionState, 'turnStartedAt' | 'turnWaitedMs' | 'questionParkedSince'>,
  now: number,
): TurnElapsed | undefined {
  const { turnStartedAt } = state;
  if (turnStartedAt === undefined) return undefined;
  const baseAt = turnStartedAt + (state.turnWaitedMs ?? 0);
  const parkedSince = state.questionParkedSince;
  const until = parkedSince ?? now;
  return { baseAt, elapsedMs: Math.max(0, until - baseAt), paused: parkedSince !== undefined };
}
