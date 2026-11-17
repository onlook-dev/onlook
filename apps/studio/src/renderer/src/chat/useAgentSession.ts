import { useCallback, useEffect, useInsertionEffect, useMemo, useRef, useState } from 'react';
import {
  emptyState,
  foldSessionState,
  type AgentConnection,
  type AgentCommandAcceptance,
  type ResumeMethod,
  type AgentSwitchEntry,
  type AgentSnapshot,
  type AgentSnapshotRequest,
  type ClientCommand,
  type HarnessId,
  type InterruptCause,
  type PromptAttachment,
  type QuestionAnswers,
  type QuestionAnswerInput,
  type SessionState,
  type EffortLevel,
  type MidTurnPolicy,
  type PenView,
  type PermissionMode,
  type StudioEvent,
  type SuggestionSend,
  type TranscriptItem,
} from '@studio/events';
import { appendEvents, applyGapFill, emptyBuffer, resetBuffer, type EventBuffer } from './eventBuffer.js';
import { NO_LIVE_ERRORS, recordLiveError, type LiveErrors } from './limitCopy.js';
import { log } from '../log.js';
import { studio } from '../bridge.js';

const chatLog = log('chat');

/** Comparing a still-streaming row per fold is O(response²) over a stream; the comparison starts once it settles. */
function isStillStreamingRow(item: TranscriptItem): boolean {
  return (
    (item.kind === 'assistant-text' || item.kind === 'assistant-thinking') && item.isStreaming
  );
}

function sameValue(previous: unknown, next: unknown): boolean {
  if (Object.is(previous, next)) return true;
  if (previous === null || next === null || typeof previous !== 'object' || typeof next !== 'object') {
    return false;
  }
  if (Array.isArray(previous) || Array.isArray(next)) {
    if (!Array.isArray(previous) || !Array.isArray(next) || previous.length !== next.length) return false;
    for (let index = 0; index < previous.length; index++) {
      if (!sameValue(previous[index], next[index])) return false;
    }
    return true;
  }
  const before = previous as Record<string, unknown>;
  const after = next as Record<string, unknown>;
  // An undefined value reads as an absent key, as the serialisation this replaced did: the fold clears a resolved permission by assigning `undefined` (ONL-2650).
  // `JSON.parse` makes `__proto__` an own key, and reading it through the chain answers `Object.prototype`, equal to any empty object (ONL-2650).
  let keys = 0;
  for (const key in before) {
    if (!Object.hasOwn(before, key)) continue;
    const value = before[key];
    if (value === undefined) continue;
    if (!Object.hasOwn(after, key) || !sameValue(value, after[key])) return false;
    keys++;
  }
  for (const key in after) {
    if (!Object.hasOwn(after, key)) continue;
    if (after[key] !== undefined) keys--;
  }
  return keys === 0;
}

function sameRow(previous: TranscriptItem, next: TranscriptItem): boolean {
  switch (next.kind) {
    // The arms carry no shape: a variant added to `TranscriptItem` fails to compile here (ONL-2650).
    case 'welcome':
    case 'user':
    case 'assistant-text':
    case 'assistant-thinking':
    case 'tools':
    case 'boundary':
    case 'error':
      return sameValue(previous, next);
    default: {
      const unhandled: never = next;
      return unhandled;
    }
  }
}

export function keepTouchedFileIdentities(next: SessionState['touchedFiles'], previous: SessionState['touchedFiles']): SessionState['touchedFiles'] {
  return sameValue(previous, next) ? previous : next;
}

export function keepRowIdentities(
  items: readonly TranscriptItem[],
  previous: ReadonlyMap<string, TranscriptItem>,
): [TranscriptItem[], Map<string, TranscriptItem>] {
  const next = new Map<string, TranscriptItem>();
  const kept = items.map((item) => {
    if (isStillStreamingRow(item)) return item;
    const hit = previous.get(item.id);
    const stable = hit !== undefined && sameRow(hit, item) ? hit : item;
    next.set(item.id, stable);
    return stable;
  });
  return [kept, next];
}

export interface AgentSessionHandle {
  state: SessionState;
  connection: AgentConnection;
  liveErrors: LiveErrors;
  /** Host-announced and live from connect; `state.cwd` fills only at `session.started`, which the SDK withholds until the first prompt (ONL-1881). */
  sessionCwd?: string;
  /** The host's announced session, which changes at the replacement; `state.sessionId` only fills at the first turn. */
  announcedSessionId?: string;
  send: (
    text: string,
    attachments?: PromptAttachment[],
    context?: string,
    options?: { answersQuestion?: boolean; suggestion?: SuggestionSend; resends?: 'suggestion' },
  ) => Promise<AgentCommandAcceptance>;
  interrupt: (cause?: InterruptCause) => void;
  dismissQuestion: () => Promise<AgentCommandAcceptance>;
  resume: (method: ResumeMethod) => Promise<AgentCommandAcceptance>;
  newChat: () => Promise<AgentCommandAcceptance>;
  /** This Project only, through a new chat (ONL-2903). */
  switchAgent: (harness: HarnessId, entry: AgentSwitchEntry) => Promise<AgentCommandAcceptance>;
  respond: (
    requestId: string,
    optionId: string,
    answers?: QuestionAnswers,
    input?: QuestionAnswerInput,
    wentBack?: boolean,
  ) => Promise<AgentCommandAcceptance>;
  startSession: (cwd: string) => void;
  setModel: (model: string) => Promise<AgentCommandAcceptance>;
  setEffort: (effort: EffortLevel | null) => void;
  /** The acceptance is the caller's business: main refuses a mode the backend does not enforce, and an optimistic label has to come back off (ONL-2190). */
  setPermissionMode: (mode: PermissionMode) => Promise<AgentCommandAcceptance>;
}

export interface AgentPause {
  questionParkedSince?: number;
  turnWaitedMs: number;
}

/** Same reference when nothing moved: a plain approval parks and main emits, and a new object there re-renders the panel for nothing (ONL-2295). */
export function samePause(
  previous: AgentPause,
  next: { questionParkedSince?: number; turnWaitedMs?: number },
): AgentPause {
  const turnWaitedMs = next.turnWaitedMs ?? 0;
  if (previous.questionParkedSince === next.questionParkedSince && previous.turnWaitedMs === turnWaitedMs) {
    return previous;
  }
  return { questionParkedSince: next.questionParkedSince, turnWaitedMs };
}

/** Answered from the announced cwd, not from the events: the fold cannot tell a stale conversation from a live one. */
export function isForeignSession(view: {
  expectedCwd?: string;
  sessionCwd?: string;
}): boolean {
  if (view.expectedCwd === undefined || view.sessionCwd === undefined) return false;
  return view.sessionCwd !== view.expectedCwd;
}

/** The facts the state channel owns, laid over a fold that cannot see them. */
export function withLiveFacts(
  folded: SessionState,
  live: {
    isStreaming: boolean;
    midTurn: MidTurnPolicy;
    pen?: PenView;
    pause?: AgentPause;
    isForeign: boolean;
  },
  events: readonly StudioEvent[] = [],
): SessionState {
  let turnStartedAt = folded.turnStartedAt;
  if (!live.isForeign && live.isStreaming && turnStartedAt === undefined) {
    for (let index = events.length - 1; index >= 0; index--) {
      const event = events[index];
      if (event?.type === 'turn.started' || event?.type === 'message.user') {
        turnStartedAt = event.ts;
        break;
      }
    }
  }
  return {
    ...folded,
    isStreaming: live.isForeign ? false : live.isStreaming,
    turnStartedAt,
    midTurn: live.midTurn,
    ...(live.isForeign || live.pen === undefined ? {} : { pen: live.pen }),
    ...(live.isForeign || live.pause === undefined ? {} : live.pause),
  };
}

export async function readAnnouncedSession(
  read: (req: AgentSnapshotRequest) => Promise<AgentSnapshot>,
  held: EventBuffer,
  sessionId: string,
): Promise<(buffer: EventBuffer) => EventBuffer> {
  const snapshot = await read({ sinceSeq: held.sessionId === sessionId ? held.lastSeq : 0 });
  return (buffer) => applyGapFill(buffer, sessionId, snapshot.events);
}

export function useAgentSession(expectedCwd?: string): AgentSessionHandle {
  const liveErrors = useRef<LiveErrors>(NO_LIVE_ERRORS);
  const openedAt = useRef(Date.now());
  const [buffer, setBuffer] = useState<EventBuffer>(emptyBuffer);
  const [connection, setConnection] = useState<AgentConnection>({ status: 'unknown' });
  // Host-owned, not derived from the fold: only the host knows it asked to stop and suppresses the straggler `stream_event`s after an interrupt.
  const [isStreaming, setIsStreaming] = useState(false);
  const [midTurn, setMidTurn] = useState<MidTurnPolicy>('steer');
  // Host-owned for the same reason: only main knows a question is parked, and the fold cannot see it (ONL-2295).
  const [pause, setPause] = useState<AgentPause>({ turnWaitedMs: 0 });
  // Host-owned too: no event names the waiting prompt, so the fold cannot produce it (ONL-2294).
  const [pen, setPen] = useState<PenView | undefined>(undefined);
  const [sessionCwd, setSessionCwd] = useState<string | undefined>(undefined);

  // Read by the mount effect: a `useState` capture there is the mount-time value forever, and reading it inside the setState updater is impure under StrictMode.
  const bufferRef = useRef(buffer);
  useEffect(() => {
    bufferRef.current = buffer;
  }, [buffer]);

  // `resyncingFrom`, not `buffer.gap`, holds the one-ask-per-gap rule; the snapshot goes through `applyGapFill` because the missing events sit below the mark `appendEvents` drops at (ONL-2353).
  const resyncingFrom = useRef<number | undefined>(undefined);
  useEffect(() => {
    const gap = buffer.gap;
    if (gap === undefined || buffer.sessionId === undefined || resyncingFrom.current === gap.from) return;
    resyncingFrom.current = gap.from;
    const agentSessionId = buffer.sessionId;
    chatLog.warn('transcript skipped events; resyncing', { agent_session_id: agentSessionId, from_seq: gap.from, to_seq: gap.to });
    studio().telemetryEvent({ event: 'transcript_gap', properties: { agent_session_id: agentSessionId, from_seq: gap.from, to_seq: gap.to } });
    void studio()
      .agentSnapshot({ sinceSeq: gap.from })
      .then((snapshot) => {
        setBuffer((previous) => applyGapFill(previous, agentSessionId, snapshot.events));
      })
      .catch(() => {
        setBuffer((previous) => applyGapFill(previous, agentSessionId, []));
      })
      .finally(() => {
        resyncingFrom.current = undefined;
      });
  }, [buffer]);

  useEffect(() => {
    // The timer beside the rAF is load-bearing: a never-shown window may never service rAF.
    const pending: StudioEvent[] = [];
    let rafHandle: number | null = null;
    let timerHandle: ReturnType<typeof setTimeout> | null = null;
    const cancelScheduled = (): void => {
      if (rafHandle !== null) cancelAnimationFrame(rafHandle);
      if (timerHandle !== null) clearTimeout(timerHandle);
      rafHandle = null;
      timerHandle = null;
    };
    const flush = (): void => {
      cancelScheduled();
      const batch = pending.splice(0, pending.length);
      setBuffer((previous) => appendEvents(previous, batch));
    };

    // Subscribed before the snapshot: overlap is deduped by `appendEvents`, a hole is not recoverable.
    const offEvent = studio().onAgentEvent((event) => {
      liveErrors.current = recordLiveError(liveErrors.current, event, openedAt.current);
      pending.push(event);
      if (rafHandle === null && timerHandle === null) {
        rafHandle = requestAnimationFrame(flush);
        timerHandle = setTimeout(flush, 50);
      }
    });
    // `disposed`: StrictMode reruns this effect on the same instance, so a dead pass's late snapshot would write through still-live setters.
    const heard = { streaming: false, connection: false, session: false };
    let disposed = false;
    let announcementRevision = 0;
    let connectionRevision = 0;
    /** Holds the mount snapshot and probe off only while an announced read can still answer; a read that cannot hands them back (ONL-2958). */
    let announcedConnectionPending = false;

    const offState = studio().onAgentState(
      ({ isStreaming: streaming, midTurn: policy, questionParkedSince, turnWaitedMs, pen: waiting }) => {
        heard.streaming = true;
        setIsStreaming(streaming);
        setMidTurn(policy);
        setPause((previous) => samePause(previous, { questionParkedSince, turnWaitedMs }));
        setPen(waiting);
      },
    );
    const offConnection = studio().onAgentConnection((next) => {
      heard.connection = true;
      connectionRevision += 1;
      setConnection(next);
    });
    const offSession = studio().onAgentSession(({ sessionId, cwd }) => {
      heard.session = true;
      const announcement = ++announcementRevision;
      const connectionAtRead = connectionRevision;
      const held = bufferRef.current;
      // Drained before the reset: a queued old-session event applied after it re-adopts the dead session.
      flush();
      setBuffer((previous) => resetBuffer(previous, sessionId));
      setSessionCwd(cwd);
      announcedConnectionPending = sessionId !== undefined;
      if (sessionId === undefined) return;
      // A live session re-announced after the mount read sends no rows of its own (ONL-2456).
      void readAnnouncedSession(async (req) => {
        const snapshot = await studio().agentSnapshot(req);
        if (!disposed && announcement === announcementRevision && connectionAtRead === connectionRevision && snapshot.sessionId === sessionId) {
          heard.connection = true;
          setConnection(snapshot.connection);
        }
        if (announcement === announcementRevision) announcedConnectionPending = false;
        return snapshot;
      }, held, sessionId).then((fill) => {
        if (!disposed) setBuffer(fill);
      });
    });

    void studio()
      .agentSnapshot({ sinceSeq: bufferRef.current.lastSeq })
      .then((snapshot) => {
        if (disposed) return;
        setBuffer((previous) => appendEvents(previous, snapshot.events));
        if (!heard.streaming) {
          setIsStreaming(snapshot.isStreaming);
          setMidTurn(snapshot.midTurn);
          setPause((previous) =>
            samePause(previous, {
              questionParkedSince: snapshot.questionParkedSince,
              turnWaitedMs: snapshot.turnWaitedMs,
            }),
          );
          setPen(snapshot.pen);
        }
        if (!heard.connection && !announcedConnectionPending) setConnection(snapshot.connection);
        if (!heard.session) setSessionCwd(snapshot.cwd);
      });

    void studio().agentProbe().then((next) => {
      if (disposed || heard.connection || announcedConnectionPending) return;
      setConnection(next);
    });

    return () => {
      disposed = true;
      offEvent();
      offState();
      offConnection();
      offSession();
      cancelScheduled();
      pending.length = 0;
    };
  }, []);

  const command = useCallback(
    (payload: ClientCommand): Promise<AgentCommandAcceptance> =>
      studio().agentCommand(payload),
    [],
  );

  const itemCacheRef = useRef(new Map<string, TranscriptItem>());
  const fileCacheRef = useRef(emptyState.touchedFiles);

  const isForeign = isForeignSession({ expectedCwd, sessionCwd });

  const [foldedState, itemCache] = useMemo<
    [SessionState, Map<string, TranscriptItem>]
  >(() => {
    if (isForeign || buffer.events.length === 0) {
      return [emptyState, new Map()];
    }
    const folded = foldSessionState(buffer.events);
    const [items, next] = keepRowIdentities(folded.items, itemCacheRef.current);
    const touchedFiles = keepTouchedFileIdentities(folded.touchedFiles, fileCacheRef.current);
    return [{ ...folded, items, touchedFiles }, next];
  }, [buffer, isForeign]);

  const reportedUnknown = useRef<{ sessionId: string | undefined; types: Set<string> }>({ sessionId: undefined, types: new Set() });
  useEffect(() => {
    const types = foldedState.unknownEventTypes;
    if (types === undefined || foldedState.sessionId === undefined) return;
    const seen = reportedUnknown.current;
    if (seen.sessionId !== foldedState.sessionId) {
      seen.sessionId = foldedState.sessionId;
      seen.types = new Set();
    }
    for (const type of types) {
      if (seen.types.has(type)) continue;
      seen.types.add(type);
      chatLog.warn('transcript received an unknown event type', { agent_session_id: foldedState.sessionId, event_type: type });
      studio().telemetryEvent({ event: 'transcript_unknown_event', properties: { agent_session_id: foldedState.sessionId, event_type: type } });
    }
  }, [foldedState.unknownEventTypes, foldedState.sessionId]);

  const state = useMemo<SessionState>(
    () => withLiveFacts(foldedState, { isStreaming, midTurn, pen, pause, isForeign }, buffer.events),
    [foldedState, isStreaming, midTurn, pen, pause, isForeign, buffer.events],
  );

  // `useInsertionEffect` runs in commit before anything reads the ref; `useEffect` flushes after paint and a render in between reads the previous fold's map.
  useInsertionEffect(() => {
    itemCacheRef.current = itemCache;
    fileCacheRef.current = foldedState.touchedFiles;
  }, [itemCache, foldedState.touchedFiles]);

  const send = useCallback(
    (text: string, attachments?: PromptAttachment[], context?: string, options?: { answersQuestion?: boolean; suggestion?: SuggestionSend; resends?: 'suggestion' }) =>
      command({
        type: 'prompt',
        text,
        ...(attachments?.length ? { attachments } : {}),
        ...(context !== undefined && context !== '' ? { context } : {}),
        ...(options?.answersQuestion === true ? { answersQuestion: true } : {}),
        ...(options?.suggestion === undefined ? {} : { suggestion: options.suggestion }),
        ...(options?.resends === undefined ? {} : { resends: options.resends }),
      }),
    [command],
  );
  const interrupt = useCallback(
    (cause?: InterruptCause) => void command({ type: 'interrupt', ...(cause === undefined ? {} : { cause }) }),
    [command],
  );
  const resume = useCallback((method: ResumeMethod) => command({ type: 'turn.resume', method }), [command]);
  const dismissQuestion = useCallback(() => command({ type: 'question.dismiss' }), [command]);
  const newChat = useCallback(() => command({ type: 'session.newChat' }), [command]);
  const switchAgent = useCallback((harness: HarnessId, entry: AgentSwitchEntry) => command({ type: 'session.switchHarness', harness, entry }), [command]);
  // The acceptance is returned, not swallowed: a refusal the renderer drops looks like a click that did nothing (ONL-2190).
  const respond = useCallback(
    (requestId: string, optionId: string, answers?: QuestionAnswers, input?: QuestionAnswerInput, wentBack?: boolean) =>
      command({
        type: 'permission.respond',
        requestId,
        optionId,
        answers,
        ...(input === undefined ? {} : { input }),
        ...(wentBack === true ? { wentBack } : {}),
        ...(sessionCwd === undefined ? {} : { cwd: sessionCwd }),
      }),
    [command, sessionCwd],
  );
  const startSession = useCallback(
    (cwd: string) => void command({ type: 'session.start', cwd }),
    [command],
  );
  const setModel = useCallback(
    (model: string) => command({ type: 'session.setModel', model }),
    [command],
  );
  const setEffort = useCallback(
    (effort: EffortLevel | null) => void command({ type: 'session.setEffort', effort }),
    [command],
  );
  const setPermissionMode = useCallback(
    (mode: PermissionMode) => command({ type: 'session.setPermissionMode', mode }),
    [command],
  );

  return useMemo(
    () => ({
      state,
      connection,
      liveErrors: liveErrors.current,
      sessionCwd,
      ...(buffer.sessionId === undefined ? {} : { announcedSessionId: buffer.sessionId }),
      send,
      interrupt,
      dismissQuestion,
      resume,
      newChat,
      switchAgent,
      respond,
      startSession,
      setModel,
      setEffort,
      setPermissionMode,
    }),
    [state, connection, sessionCwd, buffer.sessionId, send, interrupt, resume, newChat, switchAgent, respond, startSession, setModel, setEffort, setPermissionMode],
  );
}
