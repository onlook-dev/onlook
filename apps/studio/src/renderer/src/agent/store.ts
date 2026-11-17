/** Separate from `useAgentSession`: mounting that hook outside the chat panel duplicates the whole event log and the snapshot request. */

import { create } from 'zustand';
import type { AgentConnection, AgentProbeRequest, PenView } from '@studio/events';
import { ignoreRefusal } from '../refusal.js';
import { studio } from '../bridge.js';

export interface AgentUiState {
  /** From the host's broadcast only: the isolation guard can refuse a start. */
  hasSession: boolean;
  connection: AgentConnection;
  isStreaming: boolean;
  otherTabAgentBusy: boolean;
  /** Main counts the parked requests (ONL-2455). */
  needsAttention: boolean;
  /** A parked request asks the user a question, not an approval (ONL-2295). */
  needsAnswer: boolean;
  /** Main reads it from the transcript, so it survives a relaunch (ONL-2960). */
  hasUserMessage: boolean;
  /** The project `hasUserMessage` was read for; unset, it is the launch default and says nothing (ONL-2960). */
  heardCwd?: string;
  /** Main holds the prompt sent mid-turn; absent means nothing waits (ONL-2294). */
  pen?: PenView;
}

interface AgentStore extends AgentUiState {
  apply: (patch: Partial<AgentUiState>) => void;
}

export const useAgentStore = create<AgentStore>()((set) => ({
  hasSession: false,
  connection: { status: 'unknown' },
  isStreaming: false,
  otherTabAgentBusy: false,
  needsAttention: false,
  needsAnswer: false,
  hasUserMessage: false,
  apply: (patch) => {
    set(patch);
  },
}));

/** `unknown` is the launch state before the probe answers and counts as usable. */
export function canSubmitPrompt(state: Pick<AgentUiState, 'hasSession' | 'connection'>): boolean {
  return (
    state.hasSession && (state.connection.status === 'ok' || state.connection.status === 'unknown')
  );
}

/** The one owner of the connection fact. An event or a snapshot is main's word for this view, so each one retires a probe still in flight. */
const connectionOwner = { heard: 0 };

let priming: Promise<void> | undefined;

export function primeAgentConnection(req: AgentProbeRequest = {}): Promise<void> {
  if (priming !== undefined) return priming;
  const asked = connectionOwner.heard;
  priming = studio()
    .agentProbe(req)
    .then((connection) => {
      if (asked === connectionOwner.heard) useAgentStore.getState().apply({ connection });
    })
    /* A throwing probe leaves `unknown`; boot must not strand on it. */
    .catch(ignoreRefusal('agent', 'probe'));
  return priming;
}

/** Subscribes before the snapshot ask: an event between the two is lost. */
export function subscribeToAgent(): () => void {
  const { apply } = useAgentStore.getState();

  /** Per fact: the snapshot is stale by the time it resolves and must not overwrite a live message. */
  const heard = { session: false, streaming: false, connection: false };

  const offSession = studio().onAgentSession(({ sessionId, cwd }) => {
    heard.session = true;
    apply({ hasSession: sessionId != null });
    if (sessionId == null || cwd === undefined) return;
    studio().agentSnapshot({ sinceSeq: Number.MAX_SAFE_INTEGER }).then((snapshot) => {
      if (snapshot.cwd === cwd) apply({ hasUserMessage: snapshot.hasUserMessage ?? false, heardCwd: cwd });
    }, ignoreRefusal('agent', 'agentSnapshot'));
  });
  const offState = studio().onAgentState(({ isStreaming, otherTabAgentBusy, needsAttention, questionParkedSince, pen, hasUserMessage, cwd }) => {
    heard.streaming = true;
    apply({
      isStreaming,
      otherTabAgentBusy: otherTabAgentBusy ?? false,
      needsAttention: needsAttention ?? false,
      needsAnswer: questionParkedSince !== undefined,
      hasUserMessage: hasUserMessage ?? false,
      ...(cwd === undefined ? {} : { heardCwd: cwd }),
      pen,
    });
  });
  const offConnection = studio().onAgentConnection((connection) => {
    heard.connection = true;
    connectionOwner.heard += 1;
    apply({ connection });
  });

  studio().agentSnapshot({}).then((snapshot) => {
    if (!heard.connection) connectionOwner.heard += 1;
    apply({
      ...(heard.session ? {} : { hasSession: snapshot.sessionId != null }),
      ...(heard.streaming
        ? {}
        : {
            isStreaming: snapshot.isStreaming,
            otherTabAgentBusy: snapshot.otherTabAgentBusy ?? false,
            needsAttention: snapshot.needsAttention ?? false,
            needsAnswer: snapshot.questionParkedSince !== undefined,
            hasUserMessage: snapshot.hasUserMessage ?? false,
            ...(snapshot.cwd === undefined ? {} : { heardCwd: snapshot.cwd }),
            pen: snapshot.pen,
          }),
      ...(heard.connection ? {} : { connection: snapshot.connection }),
    });
  }, ignoreRefusal('agent', 'agentSnapshot'));

  return () => {
    offSession();
    offState();
    offConnection();
  };
}

export function resetAgentPrimeForTests(): void {
  priming = undefined;
  connectionOwner.heard = 0;
}
