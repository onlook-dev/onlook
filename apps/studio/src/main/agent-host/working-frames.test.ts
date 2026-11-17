import { describe, expect, it } from 'bun:test';
import { overlayMove, WorkingFrames } from './working-frames.js';

function fakeClock(): {
  setTimer: (fn: () => void, ms: number) => number;
  clearTimer: (handle: number) => void;
  fire: (handle: number) => void;
  armedMs: number[];
  cleared: number[];
} {
  let next = 0;
  const pending = new Map<number, () => void>();
  const armedMs: number[] = [];
  const cleared: number[] = [];
  return {
    setTimer: (fn, ms) => {
      const handle = next++;
      pending.set(handle, fn);
      armedMs.push(ms);
      return handle;
    },
    clearTimer: (handle) => {
      pending.delete(handle);
      cleared.push(handle);
    },
    fire: (handle) => {
      pending.get(handle)?.();
    },
    armedMs,
    cleared,
  };
}

describe('WorkingFrames', () => {
  it('sends what the agent waits on with the frames, and forgets it when the next turn starts', () => {
    const emitted: (string | undefined)[] = [];
    const clock = fakeClock();
    const frames = new WorkingFrames<number>({
      onChange: (_ids, _changes, waitingOn) => emitted.push(waitingOn),
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    frames.waitingOn('a font choice');
    frames.turnStarted();
    frames.waitingOn('a font choice');
    frames.turnStarted();
    frames.mark('frame-1');

    expect(emitted).toEqual(['a font choice', undefined]);
  });

  it('forgets what the agent waited on once its question is answered, inside the same turn', () => {
    const emitted: (string | undefined)[] = [];
    const clock = fakeClock();
    const frames = new WorkingFrames<number>({
      onChange: (_ids, _changes, waitingOn) => emitted.push(waitingOn),
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    frames.turnStarted();
    frames.mark('frame-1');
    frames.waitingOn('the layout');
    frames.hold();
    frames.resume();
    frames.mark('frame-2');

    expect(emitted).toEqual([undefined, 'the layout', undefined, undefined, undefined]);
  });

  it('keeps every change the agent names on a frame, once each, and drops them when the next turn starts', () => {
    const emitted: { ids: string[]; whats: string[] }[] = [];
    const clock = fakeClock();
    const frames = new WorkingFrames<number>({
      onChange: (ids, changes) => emitted.push({ ids, whats: changes.map((change) => (change.kind === 'created' ? 'created' : change.what)) }),
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });
    const words = (what: string) => ({ done: 'Rewrote', what });

    frames.turnStarted();
    frames.mark('frame-1', words('headline'));
    frames.mark('frame-1', words('headline'));
    frames.mark('frame-1', words('menu'));
    frames.mark('frame-1');

    expect(emitted).toEqual([
      { ids: ['frame-1'], whats: ['headline'] },
      { ids: ['frame-1'], whats: ['headline', 'menu'] },
    ]);

    frames.turnStarted();
    frames.mark('frame-2');
    expect(emitted.at(-1)).toEqual({ ids: ['frame-2'], whats: [] });
  });

  it('keeps a frame the agent added once, beside the changes it then makes to it', () => {
    const emitted: { ids: string[]; changes: string[] }[] = [];
    const clock = fakeClock();
    const frames = new WorkingFrames<number>({
      onChange: (ids, changes) => emitted.push({ ids, changes: changes.map((change) => (change.kind === 'created' ? `${change.frameId} ${change.done}` : `${change.frameId} ${change.what}`)) }),
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    frames.turnStarted();
    frames.mark('frame-2', { kind: 'created', done: 'Added' });
    frames.mark('frame-2', { kind: 'created', done: 'Sketched' });
    frames.mark('frame-2', { done: 'Warmed', what: 'palette' });

    expect(emitted).toEqual([
      { ids: ['frame-2'], changes: ['frame-2 Added'] },
      { ids: ['frame-2'], changes: ['frame-2 Added', 'frame-2 palette'] },
    ]);
  });

  it('marks are a no-op before any turn has started', () => {
    const changes: string[][] = [];
    const clock = fakeClock();
    const frames = new WorkingFrames<number>({
      onChange: (ids) => changes.push(ids),
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    frames.mark('frame-1');

    expect(changes).toEqual([]);
  });

  it('pushes the growing set as frames are marked, deduping repeats', () => {
    const changes: string[][] = [];
    const clock = fakeClock();
    const frames = new WorkingFrames<number>({
      onChange: (ids) => changes.push(ids),
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    frames.turnStarted();
    frames.mark('frame-1');
    frames.mark('frame-2');
    frames.mark('frame-1');

    expect(changes).toEqual([['frame-1'], ['frame-1', 'frame-2']]);
  });

  it('lights a frame marked for the next turn when that turn starts, and keeps it dark while a question waits (ONL-2960)', () => {
    const changes: string[][] = [];
    const clock = fakeClock();
    const frames = new WorkingFrames<number>({
      onChange: (ids) => changes.push(ids),
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    frames.markNextTurn('starting');
    expect(changes).toEqual([]);
    frames.turnStarted();
    frames.hold();
    frames.resume();
    frames.turnEnded();
    frames.turnStarted();

    expect(changes).toEqual([['starting'], [], ['starting'], []]);
  });

  it('clears and stands the fallback down on a natural turn end', () => {
    const changes: string[][] = [];
    const clock = fakeClock();
    const frames = new WorkingFrames<number>({
      onChange: (ids) => changes.push(ids),
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    frames.turnStarted();
    frames.mark('frame-1');
    frames.turnEnded();

    expect(changes.at(-1)).toEqual([]);
    expect(clock.cleared.length).toBe(1);

    frames.mark('frame-1');
    expect(changes.at(-1)).toEqual([]);
  });

  it('clears the set when the fallback fires', () => {
    const changes: string[][] = [];
    const clock = fakeClock();
    const frames = new WorkingFrames<number>({
      onChange: (ids) => changes.push(ids),
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    frames.turnStarted();
    frames.mark('frame-1');

    clock.fire(0);

    expect(changes.at(-1)).toEqual([]);
  });

  it('re-arms a fresh fallback on the next turn without leaking the old timer', () => {
    const clock = fakeClock();
    const frames = new WorkingFrames<number>({
      onChange: () => undefined,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    frames.turnStarted();
    frames.turnEnded();
    frames.turnStarted();

    expect(clock.armedMs.length).toBe(2);
    expect(clock.cleared.length).toBe(1);
  });

  it('goes dark while the agent waits on an answer, then resumes the same frames', () => {
    const changes: string[][] = [];
    const clock = fakeClock();
    const frames = new WorkingFrames<number>({
      onChange: (ids) => changes.push(ids),
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    frames.turnStarted();
    frames.mark('frame-1');
    frames.mark('frame-2');
    frames.hold();
    expect(changes.at(-1)).toEqual([]);

    frames.resume();
    expect(changes.at(-1)).toEqual(['frame-1', 'frame-2']);
  });

  it('keeps a frame the agent touched while held, and shows it on the answer', () => {
    const changes: string[][] = [];
    const clock = fakeClock();
    const frames = new WorkingFrames<number>({
      onChange: (ids) => changes.push(ids),
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    frames.turnStarted();
    frames.mark('frame-1');
    frames.hold();
    frames.mark('frame-2');
    expect(changes.at(-1)).toEqual([]);

    frames.resume();
    expect(changes.at(-1)).toEqual(['frame-1', 'frame-2']);
  });

  it('stands the leak guard down for the wait and re-arms it on the answer', () => {
    const clock = fakeClock();
    const frames = new WorkingFrames<number>({
      onChange: () => undefined,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    frames.turnStarted();
    frames.mark('frame-1');
    frames.hold();
    expect(clock.cleared.length).toBe(1);

    // The guard that was disarmed cannot fire a stale clear onto the resumed turn.
    clock.fire(0);
    frames.resume();
    expect(clock.armedMs.length).toBe(2);
  });

  it('a turn that ends while held leaves the next turn marking normally', () => {
    const changes: string[][] = [];
    const clock = fakeClock();
    const frames = new WorkingFrames<number>({
      onChange: (ids) => changes.push(ids),
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    frames.turnStarted();
    frames.mark('frame-1');
    frames.hold();
    frames.turnEnded();

    frames.turnStarted();
    frames.mark('frame-9');

    expect(changes.at(-1)).toEqual(['frame-9']);
  });

  it('holding twice, or resuming what was never held, changes nothing', () => {
    const changes: string[][] = [];
    const clock = fakeClock();
    const frames = new WorkingFrames<number>({
      onChange: (ids) => changes.push(ids),
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    frames.turnStarted();
    frames.resume();
    frames.mark('frame-1');
    frames.hold();
    frames.hold();

    expect(changes).toEqual([['frame-1'], []]);
  });

  it('dispose stands the fallback down without pushing a change', () => {
    const changes: string[][] = [];
    const clock = fakeClock();
    const frames = new WorkingFrames<number>({
      onChange: (ids) => changes.push(ids),
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });

    frames.turnStarted();
    frames.mark('frame-1');
    frames.dispose();

    expect(clock.cleared.length).toBe(1);
    expect(changes.at(-1)).toEqual(['frame-1']);
  });
});

describe('what a parked-question change does to the overlay (ONL-2295)', () => {
  it('holds while the question waits', () => {
    expect(overlayMove(true, undefined)).toBe('hold');
  });

  it('resumes when the answer clears it mid-turn', () => {
    expect(overlayMove(false, undefined)).toBe('resume');
    expect(overlayMove(false, false)).toBe('resume');
  });

  it('resumes nothing when the question was cleared by a teardown', () => {
    // Stop clears the question the same way an answer does; resuming would relight every
    // frame for the width of the interrupt, then clear them again.
    expect(overlayMove(false, true)).toBe('none');
  });

  it('still holds for a question that parks as the turn is ending', () => {
    expect(overlayMove(true, true)).toBe('hold');
  });
});
