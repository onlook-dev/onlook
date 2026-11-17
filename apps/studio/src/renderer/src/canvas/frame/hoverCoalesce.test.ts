import { describe, expect, it } from 'bun:test';
import { createHoverCoalescer } from './hoverCoalesce.js';
import { isPickerLive, isPickSuppressed } from './geometry.js';

type Point = { x: number; y: number } | null;

function frames(): { schedule: (flush: () => void) => void; tick: () => void; pending: () => number } {
  let queue: (() => void)[] = [];
  return {
    schedule: (flush) => {
      queue.push(flush);
    },
    tick: () => {
      const due = queue;
      queue = [];
      for (const flush of due) flush();
    },
    pending: () => queue.length,
  };
}

function harness(isSuspended?: () => boolean) {
  const sent: Point[] = [];
  const converted: Point[] = [];
  const clock = frames();
  const coalescer = createHoverCoalescer<Point, Point>({
    convert: (point) => {
      converted.push(point);
      return point;
    },
    send: (point) => sent.push(point),
    schedule: clock.schedule,
    isClear: (point) => point === null,
    ...(isSuspended === undefined ? {} : { isSuspended }),
  });
  return { sent, converted, clock, coalescer };
}

describe('the hover relay’s frame budget (ONL-2455)', () => {
  it('keeps 10000 pointer samples to one conversion and send per frame', () => {
    const { sent, converted, clock, coalescer } = harness();
    for (let sample = 0; sample < 10000; sample += 1) coalescer.post({ x: sample, y: sample });
    expect(clock.pending()).toBe(1);
    clock.tick();
    expect(converted).toEqual([{ x: 9999, y: 9999 }]);
    expect(sent).toEqual(converted);
  });

  it('sends one point per frame, the last one posted winning', () => {
    const { sent, clock, coalescer } = harness();
    coalescer.post({ x: 1, y: 1 });
    coalescer.post({ x: 2, y: 2 });
    coalescer.post({ x: 3, y: 3 });
    expect(sent).toEqual([]);
    clock.tick();
    expect(sent).toEqual([{ x: 3, y: 3 }]);
  });

  it('schedules one frame for a burst, not one per point', () => {
    const { clock, coalescer } = harness();
    coalescer.post({ x: 1, y: 1 });
    coalescer.post({ x: 2, y: 2 });
    coalescer.post({ x: 3, y: 3 });
    expect(clock.pending()).toBe(1);
  });

  it('sends twice across two frames', () => {
    const { sent, clock, coalescer } = harness();
    coalescer.post({ x: 1, y: 1 });
    clock.tick();
    coalescer.post({ x: 2, y: 2 });
    clock.tick();
    expect(sent).toEqual([{ x: 1, y: 1 }, { x: 2, y: 2 }]);
  });

  it('sends nothing once cleared', () => {
    const { sent, clock, coalescer } = harness();
    coalescer.post({ x: 1, y: 1 });
    coalescer.post({ x: 2, y: 2 });
    coalescer.clear();
    clock.tick();
    expect(sent).toEqual([]);
  });

  it('relays the cleared outline, which is a point of null', () => {
    const { sent, clock, coalescer } = harness();
    coalescer.post({ x: 1, y: 1 });
    coalescer.post(null);
    clock.tick();
    expect(sent).toEqual([null]);
  });

  it('sends nothing while a gesture is in flight, and resumes after it', () => {
    let inFlight = true;
    const { sent, clock, coalescer } = harness(() => inFlight);
    coalescer.post({ x: 1, y: 1 });
    clock.tick();
    expect(sent).toEqual([]);
    inFlight = false;
    coalescer.post({ x: 2, y: 2 });
    clock.tick();
    expect(sent).toEqual([{ x: 2, y: 2 }]);
  });

  it('drops a point the gesture started on top of, rather than sending it mid-gesture', () => {
    let inFlight = false;
    const { sent, clock, coalescer } = harness(() => inFlight);
    coalescer.post({ x: 1, y: 1 });
    inFlight = true;
    clock.tick();
    expect(sent).toEqual([]);
  });

  it('converts one sample per frame, not one per point posted', () => {
    const { sent, converted, clock, coalescer } = harness();
    coalescer.post({ x: 1, y: 1 });
    coalescer.post({ x: 2, y: 2 });
    coalescer.post({ x: 3, y: 3 });
    expect(converted).toEqual([]);
    clock.tick();
    expect(converted).toEqual([{ x: 3, y: 3 }]);
    expect(sent).toEqual([{ x: 3, y: 3 }]);
  });

  it('converts nothing for a sample the gesture swallowed', () => {
    const { converted, clock, coalescer } = harness(() => true);
    coalescer.post({ x: 1, y: 1 });
    clock.tick();
    expect(converted).toEqual([]);
  });

  it('clears the outline the pointer left, mid-gesture as well', () => {
    const { sent, clock, coalescer } = harness(() => true);
    coalescer.post(null);
    clock.tick();
    expect(sent).toEqual([null]);
  });

  it('keeps a clear a dropped sample landed on top of', () => {
    const { sent, clock, coalescer } = harness(() => true);
    coalescer.post({ x: 1, y: 1 });
    coalescer.post(null);
    coalescer.post({ x: 2, y: 2 });
    clock.tick();
    expect(sent).toEqual([null]);
  });

  it('suspends the relay through a space-pan without taking the activation with it', () => {
    const spacePan = {
      isResizing: false,
      tool: 'select' as const,
      isSpacePanning: true,
      isDrawingFrame: false,
      isDuplicateDragging: false,
    };
    const { sent, clock, coalescer } = harness(() => isPickSuppressed(spacePan));
    coalescer.post({ x: 1, y: 1 });
    clock.tick();
    expect(sent).toEqual([]);
    expect(isPickerLive({ mode: 'design', tool: spacePan.tool })).toBe(true);
  });
});
