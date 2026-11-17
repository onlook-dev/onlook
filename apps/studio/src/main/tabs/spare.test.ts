import { describe, expect, it } from 'bun:test';
import { SpareKeeper, type SpareSeams } from './spare.js';

interface Held {
  id: string;
}

function harness(overrides: Partial<SpareSeams<Held>> = {}): {
  keeper: SpareKeeper<Held>;
  fire: () => void;
  minted: string[];
  destroyed: string[];
  cleared: number;
  armedFor: number[];
} {
  let seq = 0;
  let timer: (() => void) | undefined;
  const minted: string[] = [];
  const destroyed: string[] = [];
  const armedFor: number[] = [];
  const counters = { cleared: 0 };

  const seams: SpareSeams<Held> = {
    mint: () => {
      seq += 1;
      const id = `tab-${String(seq)}`;
      minted.push(id);
      return { id };
    },
    destroy: (held) => destroyed.push(held.id),
    setTimer: (fn, ms) => {
      armedFor.push(ms);
      timer = fn;
      return 1;
    },
    clearTimer: () => {
      counters.cleared += 1;
      timer = undefined;
    },
    isQuitting: () => false,
    ...overrides,
  };

  return {
    keeper: new SpareKeeper(seams),
    fire: () => {
      const run = timer;
      timer = undefined;
      run?.();
    },
    minted,
    destroyed,
    armedFor,
    get cleared() {
      return counters.cleared;
    },
  };
}

describe('the spare view is exactly one (ONL-2318)', () => {
  it('mints one when the armed timer fires', () => {
    const h = harness();
    h.keeper.arm();
    expect(h.minted).toEqual([]);

    h.fire();

    expect(h.minted).toEqual(['tab-1']);
    expect(h.keeper.isHeld).toBe(true);
  });

  it('reports what a press would find, and a pending mint is not a spare', () => {
    const h = harness();
    expect(h.keeper.state).toBe('none');

    h.keeper.arm();
    expect(h.keeper.state).toBe('pending');

    h.fire();
    expect(h.keeper.state).toBe('held');

    h.keeper.take();
    expect(h.keeper.state).toBe('none');
  });

  it('does not arm a second mint while one is already armed', () => {
    const h = harness();
    h.keeper.arm();
    h.keeper.arm();
    h.fire();

    expect(h.minted).toEqual(['tab-1']);
  });

  it('does not mint a second while one is held', () => {
    const h = harness();
    h.keeper.arm();
    h.fire();
    h.keeper.arm();
    h.fire();

    expect(h.minted).toEqual(['tab-1']);
  });
});

describe('promotion', () => {
  it('hands over what was held and arms nothing by itself', () => {
    const h = harness();
    h.keeper.arm();
    h.fire();

    expect(h.keeper.take()).toEqual({ id: 'tab-1' });
    expect(h.keeper.isHeld).toBe(false);

    h.fire();

    expect(h.minted).toEqual(['tab-1']);
  });

  it('mints the next one when the host asks, after the promotion', () => {
    const h = harness();
    h.keeper.arm();
    h.fire();
    h.keeper.take();
    h.keeper.schedule();
    h.fire();

    expect(h.minted).toEqual(['tab-1', 'tab-2']);
  });

  it('answers nothing on the second take — the spare-miss case falls back to construction (ONL-2318)', () => {
    const h = harness();
    h.keeper.arm();
    h.fire();
    h.keeper.take();

    expect(h.keeper.take()).toBeUndefined();
  });
});

describe('quit (ONL-2254)', () => {
  it('never mints when quit begins after the timer was armed', () => {
    let quitting = false;
    const h = harness({ isQuitting: () => quitting });
    h.keeper.arm();
    quitting = true;
    h.fire();

    expect(h.minted).toEqual([]);
  });

  it('clears a pending mint and never destroys a view it already handed over', () => {
    const h = harness();
    h.keeper.arm();
    h.fire();
    h.keeper.take();
    h.keeper.schedule();
    h.keeper.dispose();

    expect(h.destroyed).toEqual([]);
    expect(h.cleared).toBe(1);
  });

  it('destroys a held spare exactly once', () => {
    const h = harness();
    h.keeper.arm();
    h.fire();
    h.keeper.dispose();
    h.keeper.dispose();

    expect(h.destroyed).toEqual(['tab-1']);
  });
});

describe('a mint that cannot happen', () => {
  it('leaves nothing held when the window is gone', () => {
    const h = harness({ mint: () => undefined });
    h.keeper.arm();
    h.fire();

    expect(h.keeper.isHeld).toBe(false);
    expect(h.keeper.take()).toBeUndefined();
  });
});

describe('boot owns the first mint (ONL-2318)', () => {
  it('schedules nothing before it is armed, so no mint competes with the first paint', () => {
    const h = harness();
    h.keeper.schedule();
    h.fire();

    expect(h.minted).toEqual([]);
    expect(h.armedFor).toEqual([]);
  });

  it('stops scheduling again once disposed', () => {
    const h = harness();
    h.keeper.arm();
    h.keeper.dispose();
    h.keeper.take();
    h.keeper.schedule();
    h.fire();

    expect(h.minted).toEqual([]);
  });
});
