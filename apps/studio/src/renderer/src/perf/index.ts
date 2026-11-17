import {
  INTERACTION_SURFACES,
  TYPING_SURFACES,
  type InteractionSurface,
  type PanKind,
  type TypingSurface,
} from '@studio/events';
import { useAgentStore } from '../agent/store.js';
import { isFrameFlowNode } from '../canvas/model.js';
import { useCanvasStore } from '../canvas/store.js';
import { isReplayRecording } from '../replay/index.js';
import { longFrame, overlapping, totals, type LoafEntry, type LongFrame } from './loaf.js';
import { createPanWindow, type PanWindow } from './pan.js';
import { createTypingWindow, phasesOf, type EventTimingEntry, type TypingCell, type TypingWindow } from './typing.js';
import { studio } from '../bridge.js';

const WINDOW_MS = 5 * 60_000;
const EVENT_TIMING_FLOOR_MS = 16;
const SLOW_INTERACTION_MS = 200;
const SLOW_INTERACTIONS_PER_WINDOW = 5;
/** Long-animation-frame entries for the frame an interaction painted in arrive after it. */
const SLOW_REPORT_DELAY_MS = 1_000;
const PENDING_KEYSTROKES = 64;
const LONG_FRAMES_KEPT = 300;

interface ObservedEntry extends Partial<EventTimingEntry>, Partial<LoafEntry> {
  name?: string;
  target?: unknown;
}

interface InputCell {
  surface: InteractionSurface;
  agentBusy: boolean;
  otherTabAgentBusy: boolean;
}

type PerfScope = Performance & { interactionCount?: number; memory?: { usedJSHeapSize: number } };

interface Recorder {
  panStarted(kind: PanKind, framesVisible: number): void;
  panMoved(): void;
  panEnded(): void;
}

let recorder: Recorder | undefined;
let installing = false;

export function notePanStart(kind: PanKind, framesVisible: number): void {
  recorder?.panStarted(kind, framesVisible);
}

export function notePanMove(): void {
  recorder?.panMoved();
}

export function notePanEnd(): void {
  recorder?.panEnded();
}

function surfaceOf(target: unknown): InteractionSurface {
  if (!(target instanceof Element)) return 'other';
  const surface = target.closest('[data-perf-surface]')?.getAttribute('data-perf-surface');
  return (INTERACTION_SURFACES as readonly (string | null | undefined)[]).includes(surface)
    ? (surface as InteractionSurface)
    : 'other';
}

function isTypingSurface(surface: InteractionSurface): surface is TypingSurface {
  return (TYPING_SURFACES as readonly string[]).includes(surface);
}

function framesOnPage(): number {
  return useCanvasStore.getState().nodes.filter(isFrameFlowNode).length;
}

function agentBusy(): boolean {
  return useAgentStore.getState().isStreaming;
}

function supports(type: string): boolean {
  return PerformanceObserver.supportedEntryTypes.includes(type);
}

/** Product surface only, and only while telemetry is on: off, nothing is observed. */
export async function initPerfTelemetry(): Promise<void> {
  if (installing) return;
  installing = true;
  let windowMs = WINDOW_MS;
  try {
    const config = await studio().telemetryConfig();
    if (!config.enabled) return;
    windowMs = config.perfWindowMs ?? WINDOW_MS;
  } catch {
    return;
  }
  if (!supports('event')) return;

  const scope = performance as PerfScope;
  const jsHeapMb = (): number => (scope.memory?.usedJSHeapSize ?? 0) / 1_048_576;
  let typing: TypingWindow = createTypingWindow();
  let pan: PanWindow = createPanWindow();
  let openedAt = performance.now();
  let panOpenedAt = openedAt;
  let bestFrameMs = Number.POSITIVE_INFINITY;
  let interactionsAtOpen = scope.interactionCount ?? 0;
  let windowLoafCount = 0;
  let windowLoafBlockingMs = 0;
  let typingCostMs = 0;
  let panCostMs = 0;
  let slowSent = 0;
  const longFrames: LongFrame[] = [];
  const keystrokeCells = new Map<number, TypingCell>();
  const inputCells = new Map<number, InputCell>();
  const interactionCells = new Map<number, InputCell>();
  const slowPending = new Map<number, { entry: EventTimingEntry; surface: InteractionSurface; input: 'key' | 'pointer'; busy: boolean; otherTabBusy: boolean }>();
  const slowReported = new Set<number>();
  let frameHandle: number | undefined;

  const timed =
    <A extends unknown[]>(charge: (ms: number) => void, work: (...args: A) => void) =>
    (...args: A): void => {
      const began = performance.now();
      try {
        work(...args);
      } finally {
        charge(performance.now() - began);
      }
    };
  const chargeTyping = (ms: number): void => {
    typingCostMs += ms;
  };
  const chargePan = (ms: number): void => {
    panCostMs += ms;
  };

  const captureInput = timed(chargeTyping, (event: Event) => {
    const surface = surfaceOf(event.target);
    const state = useAgentStore.getState();
    const cell = { surface, agentBusy: state.isStreaming, otherTabAgentBusy: state.otherTabAgentBusy };
    inputCells.set(event.timeStamp, cell);
    if (inputCells.size > PENDING_KEYSTROKES) inputCells.delete(inputCells.keys().next().value!);
    if (event.type !== 'keydown' || (event as KeyboardEvent).isComposing || !isTypingSurface(surface)) return;
    const typingCell = { ...cell, surface };
    typing.noteKeystroke(typingCell);
    keystrokeCells.set(event.timeStamp, typingCell);
    if (keystrokeCells.size > PENDING_KEYSTROKES) keystrokeCells.delete(keystrokeCells.keys().next().value!);
  });
  for (const name of ['keydown', 'keyup', 'pointerdown', 'pointerup', 'click']) {
    document.addEventListener(name, captureInput, { capture: true, passive: true });
  }

  const sendSlow = timed(chargeTyping, (interactionId: number) => {
    const pending = slowPending.get(interactionId);
    slowPending.delete(interactionId);
    if (pending === undefined) return;
    const phases = phasesOf(pending.entry);
    const loafs = totals(overlapping(longFrames, pending.entry.startTime, pending.entry.startTime + pending.entry.duration));
    studio().telemetryEvent({
      event: 'slow_interaction',
      properties: {
        surface: pending.surface,
        input: pending.input,
        agent_busy: pending.busy,
        other_tab_agent_busy: pending.otherTabBusy,
        replay_recording: isReplayRecording(),
        duration_ms: Math.round(phases.duration),
        input_delay_ms: Math.round(phases.inputDelay),
        processing_ms: Math.round(phases.processing),
        presentation_ms: Math.round(phases.presentation),
        loaf_count: loafs.count,
        loaf_blocking_ms: Math.round(loafs.blockingMs),
        style_layout_ms: Math.round(loafs.styleLayoutMs),
        forced_style_layout_ms: Math.round(loafs.forcedStyleLayoutMs),
        top_script: loafs.topScript,
        top_script_ms: Math.round(loafs.topScriptMs),
        frames_on_page: framesOnPage(),
        js_heap_mb: Math.round(jsHeapMb()),
      },
    });
  });

  const noteSlow = (raw: ObservedEntry, entry: EventTimingEntry): void => {
    if (entry.duration < SLOW_INTERACTION_MS) return;
    const held = slowPending.get(entry.interactionId);
    if (held !== undefined) {
      if (entry.duration > held.entry.duration) held.entry = entry;
      return;
    }
    if (slowReported.has(entry.interactionId) || slowSent >= SLOW_INTERACTIONS_PER_WINDOW) return;
    slowReported.add(entry.interactionId);
    slowSent += 1;
    const typingCell = keystrokeCells.get(entry.startTime) ?? typing.cellOf(entry.interactionId);
    const inputCell = interactionCells.get(entry.interactionId);
    slowPending.set(entry.interactionId, {
      entry,
      surface: typingCell?.surface ?? surfaceOf(raw.target),
      input: raw.name?.startsWith('key') === true ? 'key' : 'pointer',
      busy: typingCell?.agentBusy ?? agentBusy(),
      otherTabBusy: typingCell?.otherTabAgentBusy ?? inputCell?.otherTabAgentBusy ?? false,
    });
    setTimeout(() => {
      sendSlow(entry.interactionId);
    }, SLOW_REPORT_DELAY_MS);
  };

  new PerformanceObserver(
    timed(chargeTyping, (list: PerformanceObserverEntryList) => {
      for (const raw of list.getEntries() as ObservedEntry[]) {
        const { interactionId, startTime, duration, processingStart, processingEnd } = raw;
        if (!interactionId || startTime === undefined || duration === undefined) continue;
        if (processingStart === undefined || processingEnd === undefined) continue;
        const entry = { interactionId, startTime, duration, processingStart, processingEnd };
        const inputCell = interactionCells.get(interactionId) ?? inputCells.get(startTime);
        if (inputCell !== undefined) {
          interactionCells.set(interactionId, inputCell);
          if (interactionCells.size > PENDING_KEYSTROKES) interactionCells.delete(interactionCells.keys().next().value!);
        }
        noteSlow(raw, entry);
        const cell = keystrokeCells.get(startTime) ?? typing.cellOf(interactionId);
        if (cell !== undefined) {
          typing.noteInteraction(cell, entry);
          continue;
        }
        const surface = surfaceOf(raw.target);
        if (isTypingSurface(surface)) typing.noteInteraction({ surface, agentBusy: agentBusy(), otherTabAgentBusy: inputCell?.otherTabAgentBusy ?? false }, entry);
      }
    }),
  ).observe({ type: 'event', durationThreshold: EVENT_TIMING_FLOOR_MS, buffered: true } as PerformanceObserverInit);

  if (supports('long-animation-frame')) {
    new PerformanceObserver(
      timed(chargeTyping, (list: PerformanceObserverEntryList) => {
        for (const raw of list.getEntries() as ObservedEntry[]) {
          if (raw.startTime === undefined || raw.duration === undefined) continue;
          // The entry's fields are prototype getters: a spread copies none of them.
          const frame = longFrame(raw as LoafEntry);
          windowLoafCount += 1;
          windowLoafBlockingMs += frame.blockingMs;
          pan.noteLongFrame(frame);
          longFrames.push(frame);
          if (longFrames.length > LONG_FRAMES_KEPT) longFrames.shift();
        }
      }),
    ).observe({ type: 'long-animation-frame' });
  }

  const tick = timed(chargePan, (at: number) => {
    pan.frame(at);
    frameHandle = pan.isOpen() ? requestAnimationFrame(tick) : undefined;
  });

  recorder = {
    panStarted: timed(chargePan, (kind: PanKind, framesVisible: number) => {
      pan.begin({ kind, agentBusy: agentBusy(), framesOnPage: framesOnPage(), framesVisible }, performance.now());
      frameHandle ??= requestAnimationFrame(tick);
    }),
    panMoved: timed(chargePan, () => {
      pan.move(performance.now());
    }),
    panEnded: timed(chargePan, () => {
      pan.end();
    }),
  };

  const flush = (): void => {
    const began = performance.now();
    const elapsed = began - openedAt;
    const replayRecording = isReplayRecording();
    if (typing.hasKeystrokes()) {
      studio().telemetryEvent({
        event: 'chat_typing_measured',
        properties: typing.summarize({
          replayRecording,
          loafCount: windowLoafCount,
          loafBlockingMs: windowLoafBlockingMs,
          interactionCount: (scope.interactionCount ?? 0) - interactionsAtOpen,
          framesOnPage: framesOnPage(),
          jsHeapMb: jsHeapMb(),
          windowMs: elapsed,
          instrumentMs: typingCostMs + (performance.now() - began),
        }),
      });
    }
    // A gesture in flight keeps its window open until the next flush.
    if (!pan.isOpen()) {
      bestFrameMs = Math.min(bestFrameMs, pan.fastestInterval());
      if (pan.hasGestures()) {
        studio().telemetryEvent({
          event: 'canvas_pan_measured',
          properties: pan.summarize({
            replayRecording,
            windowMs: performance.now() - panOpenedAt,
            instrumentMs: panCostMs,
            bestFrameMs,
          }),
        });
      }
      pan = createPanWindow();
      panOpenedAt = performance.now();
      panCostMs = 0;
    }
    typing = createTypingWindow();
    openedAt = performance.now();
    interactionsAtOpen = scope.interactionCount ?? 0;
    windowLoafCount = 0;
    windowLoafBlockingMs = 0;
    typingCostMs = 0;
    slowSent = 0;
    slowReported.clear();
    keystrokeCells.clear();
  };

  setInterval(flush, windowMs);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
}
