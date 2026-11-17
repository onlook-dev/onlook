import { describe, expect, it } from 'bun:test';
import { COOL_SWEEP_MS, IDLE_COOL_MS, IDLE_TEARDOWN_MS, createCooling, type Cooling, type CoolingCandidate } from './cooling.js';

describe('two-stage project cooling (ONL-2894)', () => {
  it('keeps the original idle deadline for teardown after freezing once', async () => {
    let now = 0;
    const calls: string[] = [];
    const cooling = createCooling({
      now: () => now,
      candidates: () => [hot('project')],
      canCool: async () => { calls.push('probe'); return true; },
      cool: () => { calls.push('freeze'); },
      teardown: () => { calls.push('teardown'); },
    });
    cooling.touch('project');
    now = IDLE_COOL_MS;
    await cooling.sweep();
    now += COOL_SWEEP_MS;
    await cooling.sweep();
    expect(calls).toEqual(['probe', 'freeze']);
    now = IDLE_TEARDOWN_MS;
    await cooling.sweep();
    expect(calls).toEqual(['probe', 'freeze', 'probe', 'teardown']);
  });

  it('restarts both stages when a frozen tab is touched', async () => {
    let now = 0;
    const calls: string[] = [];
    const cooling = createCooling({ now: () => now, candidates: () => [hot('project')],
      cool: () => { calls.push('freeze'); }, teardown: () => { calls.push('teardown'); } });
    cooling.touch('project');
    now = IDLE_COOL_MS;
    await cooling.sweep();
    cooling.touch('project');
    now = IDLE_TEARDOWN_MS;
    await cooling.sweep();
    expect(calls).toEqual(['freeze', 'freeze']);
  });

  it('rechecks resumability before full teardown and retains a busy shell', async () => {
    let now = 0;
    let busy = false;
    let resumable = true;
    const calls: string[] = [];
    const cooling = createCooling({ now: () => now,
      candidates: () => [hot('project', { isBusy: busy })], canCool: async () => resumable,
      cool: () => { calls.push('freeze'); }, teardown: () => { calls.push('teardown'); } });
    cooling.touch('project');
    now = IDLE_COOL_MS;
    await cooling.sweep();
    now = IDLE_TEARDOWN_MS;
    resumable = false;
    await cooling.sweep();
    expect(calls).toEqual(['freeze']);
    busy = true;
    resumable = true;
    now += IDLE_TEARDOWN_MS;
    await cooling.sweep();
    expect(calls).toEqual(['freeze']);
  });
});

it('cools after ten idle minutes with a one-minute sweep', () => {
  expect(IDLE_COOL_MS).toBe(10 * 60_000);
  expect(COOL_SWEEP_MS).toBe(60_000);
});

const hot = (id: string, over: Partial<CoolingCandidate> = {}): CoolingCandidate => ({
  id,
  isCoolable: true,
  isActive: false,
  isBusy: false,
  ...over,
});

interface Rig {
  cooling: Cooling;
  cooled: string[];
  advance: (ms: number) => void;
  fireSweep: () => void;
  cleared: () => number;
  unreffed: () => number;
}

function rig(candidates: () => readonly CoolingCandidate[], startAt = 0): Rig {
  let clock = startAt;
  let pending: (() => void) | undefined;
  const cooled: string[] = [];
  const counters = { cleared: 0, unreffed: 0 };

  const cooling = createCooling({
    candidates,
    cool: (id) => { cooled.push(id); },
    now: () => clock,
    setTimer: (fn) => {
      pending = fn;
      return {
        unref: () => {
          counters.unreffed += 1;
        },
      };
    },
    clearTimer: () => {
      counters.cleared += 1;
      pending = undefined;
    },
  });

  return {
    cooling,
    cooled,
    advance: (ms) => {
      clock += ms;
    },
    fireSweep: () => {
      const run = pending;
      pending = undefined;
      run?.();
    },
    cleared: () => counters.cleared,
    unreffed: () => counters.unreffed,
  };
}

describe('a background tab cools after ten minutes (ONL-2836)', () => {
  it('cools one left untouched past the idle threshold', () => {
    const h = rig(() => [hot('t1')]);
    h.cooling.touch('t1');
    h.advance(IDLE_COOL_MS + 1);
    h.cooling.sweep();

    expect(h.cooled).toEqual(['t1']);
  });

  it('leaves one touched inside the idle threshold alone', () => {
    const h = rig(() => [hot('t1')]);
    h.cooling.touch('t1');
    h.advance(IDLE_COOL_MS - 1);
    h.cooling.sweep();

    expect(h.cooled).toEqual([]);
  });

  it('never cools twice — the record is dropped when it cools', () => {
    const h = rig(() => [hot('t1')]);
    h.cooling.touch('t1');
    h.advance(IDLE_COOL_MS + 1);
    h.cooling.sweep();
    h.cooling.sweep();

    expect(h.cooled).toEqual(['t1']);
  });

  it('starts the clock for a tab it has never seen rather than cooling it on sight', () => {
    const h = rig(() => [hot('t1')], 10 * IDLE_COOL_MS);
    h.cooling.sweep();

    expect(h.cooled).toEqual([]);
  });
});

describe('what never cools', () => {
  it('the active tab, however far the clock runs', () => {
    const h = rig(() => [hot('t1', { isActive: true })]);
    h.cooling.touch('t1');
    h.advance(IDLE_COOL_MS * 5);
    h.cooling.sweep();

    expect(h.cooled).toEqual([]);
  });

  it('a tab whose agent is mid-turn at the idle threshold', () => {
    let busy = true;
    const h = rig(() => [hot('t1', { isBusy: busy })]);
    h.cooling.touch('t1');
    h.advance(IDLE_COOL_MS + 1);
    h.cooling.sweep();

    expect(h.cooled).toEqual([]);

    // Its idle time restarts when the work ends, so it does not cool the instant the turn lands.
    busy = false;
    h.cooling.sweep();
    expect(h.cooled).toEqual([]);

    h.advance(IDLE_COOL_MS + 1);
    h.cooling.sweep();
    expect(h.cooled).toEqual(['t1']);
  });

  it('a tab that is already cold, or home — neither is coolable', () => {
    const h = rig(() => [hot('t1', { isCoolable: false })]);
    h.cooling.touch('t1');
    h.advance(IDLE_COOL_MS * 3);
    h.cooling.sweep();

    expect(h.cooled).toEqual([]);
  });

  it('anything, when every tab is touched inside the idle threshold', () => {
    const h = rig(() => [hot('t1'), hot('t2'), hot('t3')]);
    for (let round = 0; round < 10; round += 1) {
      for (const id of ['t1', 't2', 't3']) h.cooling.touch(id);
      h.advance(IDLE_COOL_MS - 1);
      h.cooling.sweep();
    }

    expect(h.cooled).toEqual([]);
  });
});

describe('the clock itself', () => {
  it('cools nothing on a backward jump', () => {
    let clock = IDLE_COOL_MS * 4;
    const cooled: string[] = [];
    const cooling = createCooling({
      candidates: () => [hot('t1')],
      cool: (id) => { cooled.push(id); },
      now: () => clock,
      setTimer: () => 1,
      clearTimer: () => undefined,
    });
    cooling.touch('t1');
    clock = 0;
    cooling.sweep();

    expect(cooled).toEqual([]);
  });

  it('unrefs its sweep and clears it on dispose', () => {
    const h = rig(() => [hot('t1')]);
    h.cooling.start();

    expect(h.unreffed()).toBe(1);

    h.cooling.dispose();

    expect(h.cleared()).toBe(1);
  });

  it('re-arms itself after each sweep', () => {
    const h = rig(() => [hot('t1')]);
    h.cooling.start();
    h.cooling.touch('t1');
    h.advance(IDLE_COOL_MS + 1);
    h.fireSweep();

    expect(h.cooled).toEqual(['t1']);
    expect(h.unreffed()).toBe(2);
  });

  it('starts once, however many times it is asked', () => {
    const h = rig(() => [hot('t1')]);
    h.cooling.start();
    h.cooling.start();

    expect(h.unreffed()).toBe(1);
  });
});

describe('forget', () => {
  it('drops a closed tab, so a reused id does not inherit its clock', () => {
    const h = rig(() => [hot('t1')]);
    h.cooling.touch('t1');
    h.advance(IDLE_COOL_MS + 1);
    h.cooling.forget('t1');
    h.cooling.sweep();

    expect(h.cooled).toEqual([]);
  });
});

describe('cooling never spends a transcript (ONL-2210, ONL-1913)', () => {
  function gated(answers: Record<string, boolean>): {
    cooling: Cooling;
    cooled: string[];
    asked: string[];
    advance: (ms: number) => void;
  } {
    let clock = 0;
    const cooled: string[] = [];
    const asked: string[] = [];
    const cooling = createCooling({
      candidates: () => [hot('t1')],
      cool: (id) => { cooled.push(id); },
      canCool: async (id) => {
        asked.push(id);
        return answers[id] ?? false;
      },
      now: () => clock,
      setTimer: () => ({ unref: () => undefined }),
      clearTimer: () => undefined,
    });
    return {
      cooling,
      cooled,
      asked,
      advance: (ms) => {
        clock += ms;
      },
    };
  }

  it('frees a tab whose session would resume', async () => {
    const h = gated({ t1: true });
    await h.cooling.sweep();
    h.advance(IDLE_COOL_MS + 1);
    await h.cooling.sweep();

    expect(h.cooled).toEqual(['t1']);
  });

  it('KEEPS a tab whose wake would start fresh — a fresh start clears the stored transcript', async () => {
    const h = gated({ t1: false });
    await h.cooling.sweep();
    h.advance(IDLE_COOL_MS + 1);
    await h.cooling.sweep();

    expect(h.cooled).toEqual([]);
  });

  it('restarts the refused tab idle time rather than asking on every sweep', async () => {
    const h = gated({ t1: false });
    await h.cooling.sweep();
    h.advance(IDLE_COOL_MS + 1);
    await h.cooling.sweep();
    await h.cooling.sweep();

    expect(h.asked).toEqual(['t1']);
  });

  it('asks only at the idle threshold, never of a tab still inside it', async () => {
    const h = gated({ t1: true });
    await h.cooling.sweep();
    h.advance(IDLE_COOL_MS - 1);
    await h.cooling.sweep();

    expect(h.asked).toEqual([]);
  });
});

describe('nothing decided before the probe survives a change during it (ONL-2210)', () => {
  interface Deferred {
    cooling: Cooling;
    cooled: string[];
    retained: unknown[];
    settle: (answer: boolean) => void;
    fail: (error: unknown) => void;
    set: (next: CoolingCandidate) => void;
    drop: () => void;
    advance: (ms: number) => void;
  }

  function deferred(): Deferred {
    let clock = 0;
    let candidate: CoolingCandidate | undefined = hot('t1');
    let resolveProbe: ((answer: boolean) => void) | undefined;
    let rejectProbe: ((error: unknown) => void) | undefined;
    const cooled: string[] = [];
    const retained: unknown[] = [];

    const cooling = createCooling({
      candidates: () => (candidate === undefined ? [] : [candidate]),
      cool: (id) => { cooled.push(id); },
      canCool: () =>
        new Promise<boolean>((resolve, reject) => {
          resolveProbe = resolve;
          rejectProbe = reject;
        }),
      onProbeFailed: (_id, error) => retained.push(error),
      now: () => clock,
      setTimer: () => ({ unref: () => undefined }),
      clearTimer: () => undefined,
    });

    return {
      cooling,
      cooled,
      retained,
      settle: (answer) => resolveProbe?.(answer),
      fail: (error) => rejectProbe?.(error),
      set: (next) => {
        candidate = next;
      },
      drop: () => {
        candidate = undefined;
      },
      advance: (ms) => {
        clock += ms;
      },
    };
  }

  async function holdAtProbe(h: Deferred): Promise<{ running: Promise<void> }> {
    await h.cooling.sweep();
    h.advance(IDLE_COOL_MS + 1);
    const running = h.cooling.sweep();
    // One turn, so the sweep reaches its await before the caller mutates anything.
    await Promise.resolve();
    return { running };
  }

  it('still cools when nothing changed', async () => {
    const h = deferred();
    const { running } = await holdAtProbe(h);
    h.settle(true);
    await running;

    expect(h.cooled).toEqual(['t1']);
  });

  it('does NOT cool a tab that went busy while the probe ran', async () => {
    const h = deferred();
    const { running } = await holdAtProbe(h);
    h.set(hot('t1', { isBusy: true }));
    h.settle(true);
    await running;

    expect(h.cooled).toEqual([]);
  });

  it('does NOT cool a tab touched while the probe ran', async () => {
    const h = deferred();
    const { running } = await holdAtProbe(h);
    h.cooling.touch('t1');
    h.settle(true);
    await running;

    expect(h.cooled).toEqual([]);
  });

  it('does NOT cool a tab that became forward while the probe ran', async () => {
    const h = deferred();
    const { running } = await holdAtProbe(h);
    h.set(hot('t1', { isActive: true }));
    h.settle(true);
    await running;

    expect(h.cooled).toEqual([]);
  });

  it('does NOT cool a tab closed while the probe ran', async () => {
    const h = deferred();
    const { running } = await holdAtProbe(h);
    h.drop();
    h.cooling.forget('t1');
    h.settle(true);
    await running;

    expect(h.cooled).toEqual([]);
  });

  it('does NOT cool after dispose, however the probe answers', async () => {
    const h = deferred();
    const { running } = await holdAtProbe(h);
    h.cooling.dispose();
    h.settle(true);
    await running;

    expect(h.cooled).toEqual([]);
  });

  it('keeps the tab warm when the probe REJECTS, and never escapes as an unhandled rejection', async () => {
    const h = deferred();
    const { running } = await holdAtProbe(h);
    h.fail(new Error('session store unreadable'));

    expect(await running).toBeUndefined();
    expect(h.cooled).toEqual([]);
    expect(h.retained).toHaveLength(1);
  });

  it('restarts idle time after a rejected probe rather than re-asking every sweep', async () => {
    const h = deferred();
    const { running } = await holdAtProbe(h);
    h.fail(new Error('nope'));
    await running;
    await h.cooling.sweep();

    expect(h.cooled).toEqual([]);
  });
});
