import { describe, expect, it } from 'bun:test';
import { turnElapsed } from './turn-elapsed.js';

const ANCHOR = 1_000_000;

describe('the turn readout', () => {
  it('counts from the anchor while the agent is working', () => {
    const shown = turnElapsed({ turnStartedAt: ANCHOR }, ANCHOR + 30_000);
    expect(shown).toEqual({ baseAt: ANCHOR, elapsedMs: 30_000, paused: false });
  });

  it('freezes at the moment the question parked', () => {
    const state = { turnStartedAt: ANCHOR, questionParkedSince: ANCHOR + 30_000 };
    const atPark = turnElapsed(state, ANCHOR + 30_000);
    const muchLater = turnElapsed(state, ANCHOR + 120_000);
    expect(atPark?.elapsedMs).toBe(30_000);
    expect(muchLater?.elapsedMs).toBe(30_000);
    expect(muchLater?.paused).toBe(true);
  });

  it('resumes from where it froze rather than from the wall clock', () => {
    const answered = turnElapsed(
      { turnStartedAt: ANCHOR, turnWaitedMs: 90_000 },
      ANCHOR + 125_000,
    );
    expect(answered).toEqual({ baseAt: ANCHOR + 90_000, elapsedMs: 35_000, paused: false });
  });

  it('takes both waits of a turn that paused twice out of the total', () => {
    const shown = turnElapsed({ turnStartedAt: ANCHOR, turnWaitedMs: 50_000 }, ANCHOR + 80_000);
    expect(shown?.elapsedMs).toBe(30_000);
  });

  it('reports the frozen value net of a wait banked earlier in the same turn', () => {
    const shown = turnElapsed(
      { turnStartedAt: ANCHOR, turnWaitedMs: 20_000, questionParkedSince: ANCHOR + 50_000 },
      ANCHOR + 200_000,
    );
    expect(shown).toEqual({ baseAt: ANCHOR + 20_000, elapsedMs: 30_000, paused: true });
  });

  it('has nothing to show without an anchor, even while a question is parked', () => {
    expect(turnElapsed({ questionParkedSince: ANCHOR }, ANCHOR + 10_000)).toBeUndefined();
    expect(turnElapsed({}, ANCHOR)).toBeUndefined();
  });

  it('never goes negative when the banked wait outruns the clock', () => {
    const shown = turnElapsed({ turnStartedAt: ANCHOR, turnWaitedMs: 90_000 }, ANCHOR + 1_000);
    expect(shown?.elapsedMs).toBe(0);
  });
});
