import { afterEach, describe, expect, it } from 'bun:test';
import electron from 'electron';
import { PERF_PROBE_GLOBAL, PERF_SPAN } from '@studio/events';
import {
  collectPerfProbe,
  installPerfProbe,
  measureSpan,
  startPerfProbe,
  stopPerfProbe,
  type PerfProbeOverrides,
} from './probe.js';

function metricsQueue(...kb: number[]): NonNullable<PerfProbeOverrides['metrics']> {
  let reads = 0;
  return () => {
    const value = kb[Math.min(reads, kb.length - 1)] ?? 0;
    reads += 1;
    return [{ memory: { peakWorkingSetSize: value } }];
  };
}

function overrides(extra: PerfProbeOverrides = {}): PerfProbeOverrides {
  return { metrics: metricsQueue(1_000), collectGarbage: () => undefined, ...extra };
}

function blockInATimerTurn(ms: number): Promise<number> {
  return new Promise<number>((resolve) => {
    setTimeout(() => {
      const until = Date.now() + ms;
      let spins = 0;
      while (Date.now() < until) spins += 1;
      setTimeout(() => resolve(spins), 40);
    }, 20);
  });
}

const enteringPort = process.env['AGENT_CDP_PORT'];

async function quiet(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 30));
}

afterEach(async () => {
  try {
    await stopPerfProbe();
  } catch {
    /* most cases stop their own probe */
  }
  Reflect.deleteProperty(globalThis, PERF_PROBE_GLOBAL);
  Reflect.deleteProperty(electron.app, 'isPackaged');
  if (enteringPort === undefined) delete process.env['AGENT_CDP_PORT'];
  else process.env['AGENT_CDP_PORT'] = enteringPort;
});

describe('the main performance probe', () => {
  it('reports a finite delay and no spans over an empty window', async () => {
    startPerfProbe(overrides());
    await quiet();
    const result = await stopPerfProbe();

    expect(Number.isFinite(result.eventLoop.maxMs)).toBe(true);
    expect(Number.isFinite(result.eventLoop.p99Ms)).toBe(true);
    expect(Number.isFinite(result.eventLoop.meanMs)).toBe(true);
    expect(result.spans).toEqual([]);
    expect(result.memory.samples).toBeGreaterThan(0);
    expect(result.windowMs).toBeGreaterThan(0);
  });

  it('sees a 200 ms block in main’s event-loop max', async () => {
    startPerfProbe(overrides());
    expect(await blockInATimerTurn(220)).toBeGreaterThan(0);
    const result = await stopPerfProbe();

    expect(result.eventLoop.maxMs).toBeGreaterThan(150);
  });

  it('aggregates two spans of the same name instead of overwriting the first', async () => {
    startPerfProbe(overrides());
    expect(measureSpan(PERF_SPAN.composite, () => 'first')).toBe('first');
    expect(measureSpan(PERF_SPAN.composite, () => 'second')).toBe('second');
    const result = await stopPerfProbe();

    const leg = result.spans.find(({ name }) => name === PERF_SPAN.composite);
    expect(leg?.count).toBe(2);
    expect(leg?.totalMs).toBeGreaterThanOrEqual(leg?.maxMs ?? Number.POSITIVE_INFINITY);
    expect(result.spans).toHaveLength(1);
  });

  it('names the guest capture and the composite apart, so a regression carries its cause', async () => {
    startPerfProbe(overrides());
    measureSpan(PERF_SPAN.guestCapture, () => undefined);
    measureSpan(PERF_SPAN.composite, () => undefined);
    const result = await stopPerfProbe();

    expect(result.spans.map(({ name }) => name).sort()).toEqual([PERF_SPAN.composite, PERF_SPAN.guestCapture].sort());
  });

  it('closes an async span when the work settles, and hands the value back', async () => {
    startPerfProbe(overrides());
    const value = await measureSpan(PERF_SPAN.guestCapture, async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
      return 'png';
    });
    const result = await stopPerfProbe();

    expect(value).toBe('png');
    const leg = result.spans.find(({ name }) => name === PERF_SPAN.guestCapture);
    expect(leg?.count).toBe(1);
    expect(leg?.maxMs).toBeGreaterThan(10);
  });

  it('passes the work through and records nothing while the probe is stopped', async () => {
    expect(measureSpan(PERF_SPAN.guestCapture, () => 7)).toBe(7);
    expect(measureSpan(PERF_SPAN.composite, () => 7)).toBe(7);

    startPerfProbe(overrides());
    const result = await stopPerfProbe();
    expect(result.spans).toEqual([]);
  });

  it('propagates the work’s own failure and still closes the span', async () => {
    startPerfProbe(overrides());
    expect(() =>
      measureSpan(PERF_SPAN.composite, () => {
        throw new Error('the composite failed');
      }),
    ).toThrow('the composite failed');
    const result = await stopPerfProbe();

    expect(result.spans.find(({ name }) => name === PERF_SPAN.composite)?.count).toBe(1);
  });

  it('reads the peak working set against a baseline taken after a forced collection', async () => {
    let collections = 0;
    startPerfProbe(overrides({ metrics: metricsQueue(1_000, 1_500, 1_200), collectGarbage: () => { collections += 1; } }));
    const result = await stopPerfProbe();

    expect(collections).toBe(1);
    expect(result.memory.baselineKb).toBe(1_000);
    expect(result.memory.peakKb).toBe(1_500);
    expect(result.memory.growthKb).toBe(500);
    expect(result.memory.samples).toBe(1);
  });

  it('collects the window without ending it', async () => {
    startPerfProbe(overrides());
    await quiet();
    const midway = collectPerfProbe();
    expect(Number.isFinite(midway.eventLoop.maxMs)).toBe(true);
    await stopPerfProbe();
  });

  it('refuses a second start and a stop with nothing running', async () => {
    startPerfProbe(overrides());
    expect(() => startPerfProbe(overrides())).toThrow(/already running/);
    await stopPerfProbe();
    await expect(stopPerfProbe()).rejects.toThrow(/not running/);
    expect(() => collectPerfProbe()).toThrow(/not running/);
  });
});

describe('the probe’s diagnostics surface', () => {
  it('registers nothing on a packaged build, whatever the environment', () => {
    (electron.app as { isPackaged: boolean }).isPackaged = true;
    process.env['AGENT_CDP_PORT'] = '9335';
    installPerfProbe();
    expect(PERF_PROBE_GLOBAL in globalThis).toBe(false);
  });

  it('registers nothing on an unpackaged build with the gate shut', () => {
    (electron.app as { isPackaged: boolean }).isPackaged = false;
    installPerfProbe();
    expect(PERF_PROBE_GLOBAL in globalThis).toBe(false);
  });

  it('registers start, stop and collect once the gate is open', () => {
    (electron.app as { isPackaged: boolean }).isPackaged = false;
    process.env['AGENT_CDP_PORT'] = '9335';
    installPerfProbe();
    const surface = (globalThis as Record<string, unknown>)[PERF_PROBE_GLOBAL];
    expect(Object.keys(surface as object).sort()).toEqual(['collect', 'start', 'stop']);
  });
});
