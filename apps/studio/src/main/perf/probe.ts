import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { app } from 'electron';
import {
  PERF_PROBE_GLOBAL,
  type PerfMemoryLeg,
  type PerfProbeResult,
  type PerfSpanLeg,
  type StudioPerfProbe,
} from '@studio/events';
import { diagnosticsGateOpen } from '../diagnostics/gate.js';
import { log } from '../log/index.js';

const LOOP_RESOLUTION_MS = 10;
const MEMORY_SAMPLE_MS = 250;
const NS_PER_MS = 1e6;

interface LoopDelay {
  enable(): boolean;
  disable(): boolean;
  readonly max: number;
  readonly mean: number;
  readonly count: number;
  percentile(value: number): number;
}

interface MetricSample {
  memory?: { peakWorkingSetSize?: number };
}

export interface PerfProbeOverrides {
  loopDelay?: () => LoopDelay;
  metrics?: () => readonly MetricSample[];
  collectGarbage?: () => void;
  now?: () => number;
  sampleIntervalMs?: number;
}

interface Running {
  loop: LoopDelay;
  metrics: () => readonly MetricSample[];
  now: () => number;
  startedAtMs: number;
  baselineKb: number;
  peakKb: number;
  samples: number;
  names: Set<string>;
  timer: ReturnType<typeof setInterval>;
}

let running: Running | undefined;
let markSequence = 0;

function appMetrics(): readonly MetricSample[] {
  return app.getAppMetrics();
}

function forceCollection(): void {
  const gc = (globalThis as { gc?: () => void }).gc;
  if (typeof gc === 'function') {
    gc();
    return;
  }
  try {
    setFlagsFromString('--expose-gc');
    (runInNewContext('gc') as () => void)();
  } catch {
    return;
  }
}

function peakKbIn(samples: readonly MetricSample[]): number {
  return samples.reduce((total, sample) => total + (sample.memory?.peakWorkingSetSize ?? 0), 0);
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function sampleMemory(state: Running): void {
  const kb = peakKbIn([...state.metrics()]);
  state.samples += 1;
  if (kb > state.peakKb) state.peakKb = kb;
}

function memoryLeg(state: Running): PerfMemoryLeg {
  return {
    baselineKb: state.baselineKb,
    peakKb: state.peakKb,
    growthKb: Math.max(0, state.peakKb - state.baselineKb),
    samples: state.samples,
  };
}

function spanLegs(state: Running): PerfSpanLeg[] {
  const legs: PerfSpanLeg[] = [];
  for (const name of state.names) {
    const entries = performance.getEntriesByName(name, 'measure');
    if (entries.length === 0) continue;
    legs.push({
      name,
      count: entries.length,
      totalMs: entries.reduce((total, entry) => total + entry.duration, 0),
      maxMs: entries.reduce((most, entry) => Math.max(most, entry.duration), 0),
    });
  }
  return legs;
}

function noteName(state: Running, name: string): void {
  if (state.names.has(name)) return;
  performance.clearMeasures(name);
  state.names.add(name);
}

function isThenable(value: unknown): value is Promise<unknown> {
  return typeof (value as { then?: unknown } | null | undefined)?.then === 'function';
}

/** A pass-through while the probe is stopped: the capture path calls this on every capture (ONL-2471). */
export function measureSpan<T>(name: string, work: () => T): T {
  const state = running;
  if (state === undefined) return work();
  noteName(state, name);
  markSequence += 1;
  const mark = `${name}-${String(markSequence)}`;
  performance.mark(mark);
  const close = (): void => {
    performance.measure(name, mark);
    performance.clearMarks(mark);
  };
  let value: T;
  try {
    value = work();
  } catch (error) {
    close();
    throw error;
  }
  if (!isThenable(value)) {
    close();
    return value;
  }
  return value.then(
    (settled) => {
      close();
      return settled;
    },
    (error: unknown) => {
      close();
      throw error;
    },
  ) as T;
}

export function startPerfProbe(overrides: PerfProbeOverrides = {}): void {
  if (running !== undefined) throw new Error('the perf probe is already running');
  const loop = (overrides.loopDelay ?? (() => monitorEventLoopDelay({ resolution: LOOP_RESOLUTION_MS })))();
  const metrics = overrides.metrics ?? appMetrics;
  const now = overrides.now ?? (() => Date.now());
  const collectGarbage = overrides.collectGarbage ?? forceCollection;
  collectGarbage();
  const baselineKb = peakKbIn([...metrics()]);
  loop.enable();
  const state: Running = {
    loop,
    metrics,
    now,
    startedAtMs: now(),
    baselineKb,
    peakKb: baselineKb,
    samples: 0,
    names: new Set<string>(),
    timer: setInterval(() => {
      if (running !== undefined) sampleMemory(running);
    }, overrides.sampleIntervalMs ?? MEMORY_SAMPLE_MS),
  };
  state.timer.unref();
  running = state;
}

function resultFor(state: Running): PerfProbeResult {
  return {
    windowMs: Math.max(0, state.now() - state.startedAtMs),
    eventLoop: {
      maxMs: finite(state.loop.max / NS_PER_MS),
      p99Ms: finite(state.loop.percentile(99) / NS_PER_MS),
      meanMs: finite(state.loop.mean / NS_PER_MS),
      samples: finite(state.loop.count),
    },
    spans: spanLegs(state),
    memory: memoryLeg(state),
  };
}

export function collectPerfProbe(): PerfProbeResult {
  if (running === undefined) throw new Error('the perf probe is not running');
  return resultFor(running);
}

export async function stopPerfProbe(): Promise<PerfProbeResult> {
  const state = running;
  if (state === undefined) throw new Error('the perf probe is not running');
  clearInterval(state.timer);
  sampleMemory(state);
  state.loop.disable();
  running = undefined;
  const result = resultFor(state);
  log('perf').info('probe window closed', {
    window_ms: Math.round(result.windowMs),
    loop_max_ms: Math.round(result.eventLoop.maxMs),
    memory_growth_kb: result.memory.growthKb,
    spans: result.spans.length,
  });
  return result;
}

type Scope = typeof globalThis & { [PERF_PROBE_GLOBAL]?: StudioPerfProbe };

export function installPerfProbe(): void {
  if (!diagnosticsGateOpen()) return;
  (globalThis as Scope)[PERF_PROBE_GLOBAL] = {
    start: () => startPerfProbe(),
    stop: stopPerfProbe,
    collect: collectPerfProbe,
  };
}
