import type { ProviderNotice, RendererTelemetryEventMap, SessionState } from '@studio/events';

export interface SilenceReport {
  /** The turn this report latches; the caller carries it back as `reportedTurn`. */
  turn: number;
  properties: Omit<RendererTelemetryEventMap['agent_silence_shown'], 'worktreePath'>;
}

/** The turn's first crossing only: the notice re-resolves on a tick, and an unlatched send fires on every one (ONL-2491). */
export function silenceReport(
  notice: ProviderNotice | undefined,
  state: Pick<SessionState, 'sessionId' | 'harnessId' | 'turnStartedAt' | 'silentSince'>,
  now: number,
  reportedTurn: number | undefined,
): SilenceReport | undefined {
  if (notice?.state !== 'silent') return undefined;
  const { sessionId, harnessId, turnStartedAt, silentSince } = state;
  if (sessionId === undefined || harnessId === undefined) return undefined;
  if (turnStartedAt === undefined || silentSince === undefined) return undefined;
  if (turnStartedAt === reportedTurn) return undefined;
  return {
    turn: turnStartedAt,
    properties: {
      agent_session_id: sessionId,
      harness: harnessId,
      silent_ms: Math.round(now - silentSince),
    },
  };
}
