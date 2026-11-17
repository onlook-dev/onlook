import type { CanvasPanSummary, PanKind } from '@studio/events';
import { overlapping, totals, type LongFrame } from './loaf.js';

export interface GestureStart {
  kind: PanKind;
  agentBusy: boolean;
  framesOnPage: number;
  framesVisible: number;
}

export function panKindOf(event: { type: string; ctrlKey?: boolean } | null | undefined): PanKind | undefined {
  if (event === null || event === undefined) return undefined;
  if (event.type === 'wheel') return event.ctrlKey === true ? 'pinch' : 'wheel';
  return 'drag';
}

interface PanContext {
  replayRecording: boolean;
  windowMs: number;
  instrumentMs: number;
  /** The shortest frame interval this tab has seen in earlier windows; a window janked throughout cannot measure its own display. */
  bestFrameMs: number;
}

export interface PanWindow {
  begin(start: GestureStart, at: number): void;
  move(at: number): void;
  frame(at: number): void;
  end(): void;
  noteLongFrame(frame: LongFrame): void;
  isOpen(): boolean;
  fastestInterval(): number;
  hasGestures(): boolean;
  summarize(context: PanContext): CanvasPanSummary;
}

interface Gesture extends GestureStart {
  start: number;
  end: number;
  frameTimes: number[];
}

/** A wheel gesture ends some time after its last move (React Flow waits for the wheel to go quiet); frames after the last move are not the pan's. */
const TAIL_ALLOWANCE_MS = 20;

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)] ?? 0;
}

const MIN_INTERVALS_FOR_REFRESH = 10;
/** No display Studio runs on refreshes slower than 60 Hz. */
const SLOWEST_FRAME_MS = 1000 / 60;

export function createPanWindow(): PanWindow {
  const gestures: Gesture[] = [];
  const intervals: number[] = [];
  const longFrames = new Set<LongFrame>();
  let open: Gesture | undefined;

  return {
    begin(start, at) {
      if (open !== undefined) return;
      open = { ...start, start: at, end: at, frameTimes: [] };
    },
    move(at) {
      if (open !== undefined) open.end = at;
    },
    frame(at) {
      open?.frameTimes.push(at);
    },
    end() {
      const closing = open;
      open = undefined;
      if (closing === undefined || closing.end <= closing.start) return;
      closing.frameTimes = closing.frameTimes.filter((at) => at <= closing.end + TAIL_ALLOWANCE_MS);
      for (let i = 1; i < closing.frameTimes.length; i += 1) {
        intervals.push(closing.frameTimes[i]! - closing.frameTimes[i - 1]!);
      }
      gestures.push(closing);
    },
    noteLongFrame(frame) {
      const spans = open === undefined ? gestures : [...gestures, { ...open, end: Infinity }];
      if (spans.some((gesture) => overlapping([frame], gesture.start, gesture.end).length > 0)) longFrames.add(frame);
    },
    isOpen: () => open !== undefined,
    fastestInterval: () =>
      intervals.length >= MIN_INTERVALS_FOR_REFRESH ? percentile(intervals, 0.1) : Number.POSITIVE_INFINITY,
    hasGestures: () => gestures.length > 0,
    summarize(context) {
      const gestureMs = gestures.reduce((total, gesture) => total + (gesture.end - gesture.start), 0);
      const frames = gestures.reduce((total, gesture) => total + gesture.frameTimes.length, 0);
      const own = intervals.length >= MIN_INTERVALS_FOR_REFRESH ? percentile(intervals, 0.1) : Number.POSITIVE_INFINITY;
      const frameMs = Math.min(own, context.bestFrameMs, SLOWEST_FRAME_MS);
      const expected = gestureMs / frameMs;
      const loafs = totals([...longFrames]);
      const count = (pick: (gesture: Gesture) => boolean): number => gestures.filter(pick).length;
      const within = (low: number, high: number): number =>
        intervals.filter((interval) => interval >= low && interval < high).length;
      return {
        replay_recording: context.replayRecording,
        gestures: gestures.length,
        wheel_gestures: count((gesture) => gesture.kind === 'wheel'),
        pinch_gestures: count((gesture) => gesture.kind === 'pinch'),
        drag_gestures: count((gesture) => gesture.kind === 'drag'),
        busy_gestures: count((gesture) => gesture.agentBusy),
        gesture_ms: Math.round(gestureMs),
        frames,
        dropped_pct: expected > 0 ? Math.round(Math.min(100, Math.max(0, (1 - frames / expected) * 100))) : 0,
        refresh_hz: Math.round(1000 / frameMs),
        lt_20: within(0, 20),
        from_20_to_33: within(20, 33),
        from_33_to_50: within(33, 50),
        from_50_to_100: within(50, 100),
        gte_100: within(100, Infinity),
        p95_interval_ms: Math.round(percentile(intervals, 0.95)),
        max_interval_ms: Math.round(Math.max(0, ...intervals)),
        loaf_count: loafs.count,
        loaf_blocking_ms: Math.round(loafs.blockingMs),
        style_layout_ms: Math.round(loafs.styleLayoutMs),
        frames_on_page: Math.max(0, ...gestures.map((gesture) => gesture.framesOnPage)),
        frames_visible_max: Math.max(0, ...gestures.map((gesture) => gesture.framesVisible)),
        frames_visible_mean:
          gestures.length === 0
            ? 0
            : Math.round(gestures.reduce((total, gesture) => total + gesture.framesVisible, 0) / gestures.length),
        window_ms: Math.round(context.windowMs),
        instrument_ms: Math.round(context.instrumentMs),
      };
    },
  };
}

export interface FrameBox {
  position: { x: number; y: number };
  width?: number;
  height?: number;
  measured?: { width?: number; height?: number };
}

export function framesVisible(frames: readonly FrameBox[], view: { x: number; y: number; width: number; height: number }): number {
  return frames.filter((frame) => {
    const width = frame.measured?.width ?? frame.width ?? 0;
    const height = frame.measured?.height ?? frame.height ?? 0;
    return (
      frame.position.x < view.x + view.width &&
      frame.position.x + width > view.x &&
      frame.position.y < view.y + view.height &&
      frame.position.y + height > view.y
    );
  }).length;
}
