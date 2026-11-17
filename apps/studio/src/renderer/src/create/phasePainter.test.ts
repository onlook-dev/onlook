import { describe, expect, it } from 'bun:test';
import { PhasePainter, type PainterTimers } from './phasePainter.js';

function fakeTimers(): PainterTimers & { fire(): void; pending(): number } {
  const scheduled = new Map<number, () => void>();
  let seq = 0;
  return {
    set: (fn) => {
      seq += 1;
      scheduled.set(seq, fn);
      return seq;
    },
    clear: (handle) => {
      scheduled.delete(handle as number);
    },
    fire: () => {
      for (const [handle, fn] of [...scheduled]) {
        scheduled.delete(handle);
        fn();
      }
    },
    pending: () => scheduled.size,
  };
}

describe('PhasePainter', () => {
  it('paints a phase only after the delay has passed', () => {
    const painted: (string | null)[] = [];
    const timers = fakeTimers();
    const painter = new PhasePainter<string>(300, (v) => painted.push(v), timers);

    painter.observe('installing');
    expect(painted).toEqual([]);
    timers.fire();
    expect(painted).toEqual(['installing']);
  });

  it('never paints a phase that ended within the delay — no flash on a fast setup', () => {
    const painted: (string | null)[] = [];
    const timers = fakeTimers();
    const painter = new PhasePainter<string>(300, (v) => painted.push(v), timers);

    painter.observe('installing');
    painter.observe('starting');
    expect(timers.pending()).toBe(1);
    timers.fire();
    expect(painted).toEqual(['starting']);
  });

  it('clears at once on null, dropping a pending paint with it', () => {
    const painted: (string | null)[] = [];
    const timers = fakeTimers();
    const painter = new PhasePainter<string>(300, (v) => painted.push(v), timers);

    painter.observe('starting');
    painter.observe(null);
    expect(painted).toEqual([null]);
    timers.fire();
    expect(painted).toEqual([null]);
  });

  it('dispose drops the pending paint and paints nothing', () => {
    const painted: (string | null)[] = [];
    const timers = fakeTimers();
    const painter = new PhasePainter<string>(300, (v) => painted.push(v), timers);

    painter.observe('starting');
    painter.dispose();
    timers.fire();
    expect(painted).toEqual([]);
    expect(timers.pending()).toBe(0);
  });
});
