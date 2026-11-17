import { describe, expect, it } from 'bun:test';
import { emptyState, STALL_NOTICE_MS, type SessionState } from '@studio/events';
import { providerNotice } from './providerNotice.js';
import { silenceReport, type SilenceReport } from './silenceReport.js';

const NOW = 1_800_000_000_000;

function streaming(over: Partial<SessionState> = {}): SessionState {
  return {
    ...emptyState,
    isStreaming: true,
    sessionId: 'sess-1',
    harnessId: 'claude',
    turnStartedAt: NOW,
    silentSince: NOW,
    ...over,
  };
}

/** The component's loop: resolve the notice, ask the latch, carry the answer forward. */
function drive(samples: readonly { state: SessionState; now: number }[]): SilenceReport[] {
  let reported: number | undefined;
  const fired: SilenceReport[] = [];
  for (const sample of samples) {
    const report = silenceReport(
      providerNotice(sample.state, sample.now),
      sample.state,
      sample.now,
      reported,
    );
    if (report === undefined) continue;
    reported = report.turn;
    fired.push(report);
  }
  return fired;
}

/** A second of ticks, as the region's interval produces them. */
function ticks(state: SessionState, seconds: number): { state: SessionState; now: number }[] {
  return Array.from({ length: seconds }, (_unused, index) => ({
    state,
    now: NOW + (index + 1) * 1_000,
  }));
}

describe('silenceReport — the turn that hangs reports itself (ONL-2491)', () => {
  it('reports the elapsed silence, the session and the harness at the crossing', () => {
    const state = streaming();
    const now = NOW + STALL_NOTICE_MS;

    expect(silenceReport(providerNotice(state, now), state, now, undefined)).toEqual({
      turn: NOW,
      properties: { agent_session_id: 'sess-1', harness: 'claude', silent_ms: STALL_NOTICE_MS },
    });
  });

  it('a turn silent for two minutes reports once, not once per tick', () => {
    const fired = drive(ticks(streaming(), 120));

    expect(fired).toHaveLength(1);
    expect(fired[0]?.properties.silent_ms).toBe(STALL_NOTICE_MS);
  });

  it('a second stalled turn in the same session reports again', () => {
    const first = streaming();
    const secondTurnAt = NOW + 200_000;
    const second = streaming({ turnStartedAt: secondTurnAt, silentSince: secondTurnAt });
    const fired = drive([
      ...ticks(first, 60),
      ...Array.from({ length: 60 }, (_unused, index) => ({
        state: second,
        now: secondTurnAt + (index + 1) * 1_000,
      })),
    ]);

    expect(fired.map((report) => report.turn)).toEqual([NOW, secondTurnAt]);
  });

  it('a turn that recovers before the threshold reports nothing', () => {
    const heard = streaming({ silentSince: undefined });
    const fired = drive([...ticks(streaming(), 20), ...ticks(heard, 300)]);

    expect(fired).toEqual([]);
  });

  it('a retry, which names its cause, is not a silence', () => {
    const state = streaming({ retrying: { attempt: 2, status: 529 } });
    const fired = drive(ticks(state, 120));

    expect(fired).toEqual([]);
  });

  it('a settled turn reports nothing, whatever the silence stamp holds', () => {
    const fired = drive(ticks(streaming({ isStreaming: false }), 120));

    expect(fired).toEqual([]);
  });

  it('an unannounced session or harness reports nothing rather than guessing one', () => {
    const now = NOW + STALL_NOTICE_MS;
    for (const state of [
      streaming({ sessionId: undefined }),
      streaming({ harnessId: undefined }),
      streaming({ turnStartedAt: undefined }),
    ]) {
      expect(silenceReport(providerNotice(state, now), state, now, undefined)).toBeUndefined();
    }
  });

  it('carries nothing a telemetry payload may not: three scalars, no path and no text', () => {
    const now = NOW + STALL_NOTICE_MS;
    const report = silenceReport(providerNotice(streaming(), now), streaming(), now, undefined);

    expect(Object.keys(report?.properties ?? {}).sort()).toEqual([
      'agent_session_id',
      'harness',
      'silent_ms',
    ]);
  });
});
