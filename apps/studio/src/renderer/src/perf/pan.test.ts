import { describe, expect, it } from 'bun:test';
import { longFrame } from './loaf.js';
import { createPanWindow, framesVisible, panKindOf, type GestureStart } from './pan.js';

const CONTEXT = { replayRecording: false, windowMs: 5000, instrumentMs: 1, bestFrameMs: Number.POSITIVE_INFINITY };
const START: GestureStart = { kind: 'wheel', agentBusy: false, framesOnPage: 4, framesVisible: 2 };

function pan(frameTimes: readonly number[], lastMove: number) {
  const window = createPanWindow();
  window.begin(START, 0);
  for (const at of frameTimes) {
    window.frame(at);
    if (at <= lastMove) window.move(at);
  }
  window.move(lastMove);
  window.end();
  return window;
}

describe('the pan window', () => {
  it('keeps the whole pinch when React Flow starts it again on every tick', () => {
    const window = createPanWindow();
    window.begin({ ...START, kind: 'pinch' }, 0);
    for (const at of [16, 32, 48, 64]) {
      window.begin({ ...START, kind: 'pinch' }, at);
      window.move(at);
      window.frame(at);
    }
    window.end();
    expect(window.summarize(CONTEXT)).toMatchObject({ pinch_gestures: 1, gesture_ms: 64, frames: 4, lt_20: 3 });
  });
  it('reads no dropped frames when every frame arrives on the display interval', () => {
    const times = Array.from({ length: 31 }, (_, i) => i * 10);
    expect(pan(times, 300).summarize(CONTEXT)).toMatchObject({ frames: 31, dropped_pct: 0, refresh_hz: 100, lt_20: 30 });
  });

  it('counts the frames a stall swallowed as dropped', () => {
    const times = [...Array.from({ length: 16 }, (_, i) => i * 10), 250, 260, 270, 280, 290, 300];
    const summary = pan(times, 300).summarize(CONTEXT);
    expect(summary.dropped_pct).toBe(27);
    expect(summary).toMatchObject({ gte_100: 1, max_interval_ms: 100 });
  });

  it('measures a window janked throughout against the display, not against its own slow frames', () => {
    const times = Array.from({ length: 11 }, (_, i) => i * 45);
    expect(pan(times, 450).summarize(CONTEXT)).toMatchObject({ refresh_hz: 60, dropped_pct: 59 });
    expect(pan(times, 450).summarize({ ...CONTEXT, bestFrameMs: 1000 / 120 })).toMatchObject({ refresh_hz: 120, dropped_pct: 80 });
  });

  it('leaves out the frames after the last move, while a wheel gesture waits to end', () => {
    const times = Array.from({ length: 50 }, (_, i) => i * 10);
    expect(pan(times, 200).summarize(CONTEXT)).toMatchObject({ frames: 23, gesture_ms: 200 });
  });

  it('charges a long frame to the window only when it overlaps a gesture', () => {
    const window = pan([0, 10, 20], 20);
    window.noteLongFrame(longFrame({ startTime: 5, duration: 80, blockingDuration: 30 }));
    window.noteLongFrame(longFrame({ startTime: 500, duration: 80, blockingDuration: 30 }));
    expect(window.summarize(CONTEXT)).toMatchObject({ loaf_count: 1, loaf_blocking_ms: 30 });
  });

  it('tells a pinch from a scroll and a drag, and ignores a move nobody made', () => {
    expect(panKindOf({ type: 'wheel', ctrlKey: true })).toBe('pinch');
    expect(panKindOf({ type: 'wheel' })).toBe('wheel');
    expect(panKindOf({ type: 'mousedown' })).toBe('drag');
    expect(panKindOf(null)).toBeUndefined();
  });
});

describe('frames in view', () => {
  it('counts a frame that reaches into the view, and not one beside it', () => {
    const view = { x: 0, y: 0, width: 100, height: 100 };
    const frames = [
      { position: { x: 90, y: 90 }, measured: { width: 50, height: 50 } },
      { position: { x: 150, y: 0 }, width: 50, height: 50 },
    ];
    expect(framesVisible(frames, view)).toBe(1);
  });
});
