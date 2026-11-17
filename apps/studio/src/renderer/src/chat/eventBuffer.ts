import type { StudioEvent } from '@studio/events';

export interface EventBuffer {
  sessionId?: string;
  /** Highest `seq` applied for `sessionId`; `seq` restarts at 1 per session. */
  lastSeq: number;
  events: StudioEvent[];
  /** Set for one return value; the next append clears it (ONL-2353). */
  gap?: { from: number; to: number };
}

export const emptyBuffer: EventBuffer = { lastSeq: 0, events: [] };

/** The session reset is driven by the events themselves, not the `agent:session` broadcast: ordering across IPC is not guaranteed and the failure is silent truncation. */
export function appendEvents(
  buffer: EventBuffer,
  incoming: readonly StudioEvent[],
): EventBuffer {
  let sessionId = buffer.sessionId;
  let lastSeq = buffer.lastSeq;
  let gap: EventBuffer['gap'];
  let events: StudioEvent[] | null = null;

  for (const event of incoming) {
    if (event.sessionId !== sessionId) {
      sessionId = event.sessionId;
      lastSeq = 0;
      events = [];
    }
    if (event.seq <= lastSeq) continue;
    // `lastSeq` 0 is a fresh session, whose first seq may be anything a snapshot starts at.
    if (lastSeq > 0 && event.seq > lastSeq + 1 && gap === undefined) gap = { from: lastSeq, to: event.seq };
    if (events === null) events = [...buffer.events];
    events.push(event);
    lastSeq = event.seq;
  }

  if (events === null) return buffer.gap === undefined ? buffer : { sessionId, lastSeq, events: buffer.events };
  return { sessionId, lastSeq, events, ...(gap === undefined ? {} : { gap }) };
}

/** Clears the gap even when the snapshot lacks the missing events: main never had them, and asking again would not change that. */
export function fillGap(buffer: EventBuffer, incoming: readonly StudioEvent[]): EventBuffer {
  const held = new Set(buffer.events.map((event) => event.seq));
  const admitted = incoming.filter(
    (event) => event.sessionId === buffer.sessionId && !held.has(event.seq),
  );
  if (admitted.length === 0) {
    const { gap: _cleared, ...rest } = buffer;
    return rest;
  }
  const events = [...buffer.events, ...admitted].sort((a, b) => a.seq - b.seq);
  return { ...(buffer.sessionId === undefined ? {} : { sessionId: buffer.sessionId }), lastSeq: events[events.length - 1]?.seq ?? buffer.lastSeq, events };
}

/** Gated on the session only: `buffer.gap` is one-shot and a live event in flight clears it, which made the hole permanent (ONL-2353). */
export function applyGapFill(
  buffer: EventBuffer,
  agentSessionId: string,
  incoming: readonly StudioEvent[],
): EventBuffer {
  if (buffer.sessionId !== agentSessionId) return buffer;
  return fillGap(buffer, incoming);
}

/** A session ending has no event, so `appendEvents` cannot reset on its own. */
export function resetBuffer(
  buffer: EventBuffer,
  sessionId: string | undefined,
): EventBuffer {
  if (buffer.sessionId === sessionId) return buffer;
  return { sessionId, lastSeq: 0, events: [] };
}
