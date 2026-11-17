import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import electron from 'electron';
import type { execFile } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { makeStateRoot } from '@studio/fixtures';
import { peekLinesForTesting, recordLinesForTesting, resetLogForTesting } from '../log/index.js';
import { initTelemetry, peekQueueForTesting, resetTelemetryForTesting, setAppForTesting } from '../telemetry/index.js';
import { readPs, readResourceProcesses, reportResourceSampleFailure, startResourceSampling } from './sampler.js';

function psCommand(error: Error | null, stdout = '', stderr = ''): typeof execFile {
  return ((_file: string, _args: string[], _options: unknown, callback: (error: Error | null, stdout: string, stderr: string) => void) => {
    queueMicrotask(() => callback(error, stdout, stderr));
    return { pid: 900000 };
  }) as unknown as typeof execFile;
}

describe('resource sample failures', () => {
  beforeEach(() => recordLinesForTesting());
  afterEach(() => resetLogForTesting());

  it('uses an absolute ps path and gives the boot read a longer timeout', async () => {
    const calls: { file: string; timeout: number }[] = [];
    const execute = ((file: string, _args: string[], options: { timeout: number }, callback: (error: null, stdout: string) => void) => {
      calls.push({ file, timeout: options.timeout });
      queueMicrotask(() => callback(null, ''));
      return { pid: 900000 };
    }) as unknown as typeof execFile;
    await readPs(execute, 'darwin');
    await readPs(execute, 'darwin', 15_000);
    expect(calls).toEqual([{ file: '/bin/ps', timeout: 5_000 }, { file: '/bin/ps', timeout: 15_000 }]);
  });

  it('logs subprocess code, signal, killed and scrubbed stderr', async () => {
    const failure = Object.assign(new Error('ps failed'), {
      code: 1, signal: 'SIGTERM', killed: true,
    });
    const stderr = 'cannot read /Users/designer/private/project (permission denied)';
    await readResourceProcesses({
      readPs: () => readPs(psCommand(failure, '', stderr), 'darwin'), viewProcesses: () => [], electronProcesses: () => [],
    }).catch(reportResourceSampleFailure);
    expect(failure).toMatchObject({ stderr });
    const line = peekLinesForTesting().find((entry) => entry.msg === 'resource sample failed');
    expect(line).toMatchObject({ stage: 'process-list', code: 1, signal: 'SIGTERM', killed: true });
    expect(line?.['stderr']).toBe('cannot read <path> (permission denied)');
    expect(String(line?.['stderr'])).not.toContain('/Users/designer/private/project');
  });

  for (const message of ['ps exited with code 1', 'ps exceeded the five-second timeout']) {
    it(`rejects ${message} instead of reporting zero descendants`, async () => {
      const failure = new Error(message);
      await expect(readPs(psCommand(failure), 'darwin')).rejects.toBe(failure);
      await readResourceProcesses({
        readPs: () => readPs(psCommand(failure), 'darwin'),
        viewProcesses: () => [],
        electronProcesses: () => [],
      }).catch(reportResourceSampleFailure);
      expect(peekLinesForTesting().find((line) => line.msg === 'resource sample failed')).toMatchObject({
        stage: 'process-list', reason: message, error_class: 'Error',
      });
    });
  }

  it('does not execute ps on Windows and removes its own ps process from successful reads', async () => {
    expect(await readPs(psCommand(new Error('must not execute')), 'win32')).toEqual([]);
    expect(await readPs(psCommand(null, '900000 1 10 0:01.00 /bin/ps\n900001 1 20 0:02.00 /bin/node'), 'darwin')).toEqual([
      { pid: 900001, ppid: 1, residentKb: 20, cpuSeconds: 2, exe: 'node' },
    ]);
  });

  for (const stage of ['process-list', 'views', 'electron-metrics'] as const) {
    it(`names the ${stage} stage and the reason instead of only Error`, async () => {
      const fail = (): never => { throw new Error('resource probe unavailable'); };
      try {
        await readResourceProcesses({
          readPs: stage === 'process-list' ? async () => fail() : async () => [],
          viewProcesses: stage === 'views' ? fail : () => [],
          electronProcesses: stage === 'electron-metrics' ? fail : () => [],
        });
        throw new Error('expected the reader to fail');
      } catch (error) {
        reportResourceSampleFailure(error);
      }
      expect(peekLinesForTesting().find((line) => line.msg === 'resource sample failed')).toMatchObject({
        stage,
        error_class: 'Error',
        reason: 'resource probe unavailable',
      });
    });
  }

  it('preserves the process classes needed to distinguish Studio from dev servers', async () => {
    const sample = await readResourceProcesses({
      readPs: async () => [
        { pid: 900001, ppid: process.pid, residentKb: 12, cpuSeconds: 2, exe: 'node' },
      ],
      viewProcesses: () => [{ pid: 900002, kind: 'frame', hostPid: 900003 }],
      electronProcesses: () => [
        { pid: 900002, type: 'Tab', residentKb: 20, cpuSeconds: 3 },
      ],
    });
    expect(sample.processes.map((entry) => entry.processClass)).toEqual(['frame', 'other']);
    expect(sample.views).toHaveLength(1);
    expect(sample.syncMs).toBeGreaterThanOrEqual(0);
  });

  it('samples without a low-power API and recovers without publishing lifetime CPU as one sampling window', async () => {
    const stateRoot = makeStateRoot({ name: 'sampling-recovery' });
    const originalRoot = process.env['STUDIO_STATE_ROOT'];
    const originalKey = process.env['STUDIO_POSTHOG_KEY'];
    process.env['STUDIO_STATE_ROOT'] = stateRoot;
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    setAppForTesting({ getPath: () => stateRoot, getVersion: () => '0.0.0-test', getLocale: () => 'en-US', isPackaged: false });
    initTelemetry();
    const starts: (() => void)[] = [];
    const repeats: (() => void)[] = [];
    const timeout = spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void) => {
      starts.push(callback);
      return { unref: () => undefined };
    }) as unknown as typeof setTimeout);
    const interval = spyOn(globalThis, 'setInterval').mockImplementation(((callback: () => void) => {
      repeats.push(callback);
      return { unref: () => undefined };
    }) as unknown as typeof setInterval);
    const display = spyOn(electron.screen, 'getPrimaryDisplay').mockReturnValue({ displayFrequency: 60 } as Electron.Display);
    Object.assign(electron.app, { on: () => electron.app });
    let clockMs = 0;
    const clock = spyOn(performance, 'now').mockImplementation(() => clockMs);
    let reads = 0;
    const settle = async (): Promise<void> => { for (let turn = 0; turn < 12; turn += 1) await Promise.resolve(); };
    try {
      startResourceSampling({
        readPs: async () => {
          reads += 1;
          if (reads === 1) throw new Error('startup probe failed');
          if (reads === 4) throw new Error('later probe failed');
          return [];
        },
        viewProcesses: () => [],
        electronProcesses: () => [{ pid: process.pid, type: 'Browser', residentKb: 10, cpuSeconds: reads >= 5 ? 102 : 100 }],
      });
      await settle();
      expect(peekLinesForTesting().some((line) => line['reason'] === 'startup probe failed')).toBe(true);
      expect(starts).toHaveLength(1);
      clockMs = 1000;
      starts[0]!();
      await settle();
      expect(peekQueueForTesting().filter((event) => event.event === 'app_resources_sampled')).toHaveLength(0);
      expect(repeats).toHaveLength(1);
      clockMs = 2000;
      repeats[0]!();
      await settle();
      const samples = peekQueueForTesting().filter((event) => event.event === 'app_resources_sampled');
      expect(samples).toHaveLength(1);
      expect(samples[0]?.properties['total_cpu_pct']).toBe(0);
      expect(samples[0]?.properties).not.toHaveProperty('low_power_mode');
      expect(samples[0]?.properties['under_rosetta']).toBe(false);
      expect(typeof samples[0]?.properties['cpu_family']).toBe('string');
      clockMs = 3000;
      repeats[0]!();
      await settle();
      expect(peekQueueForTesting().filter((event) => event.event === 'app_resources_sampled')).toHaveLength(1);
      expect(peekLinesForTesting().some((line) => line['reason'] === 'later probe failed')).toBe(true);
      clockMs = 4000;
      repeats[0]!();
      await settle();
      const recovered = peekQueueForTesting().filter((event) => event.event === 'app_resources_sampled');
      expect(recovered).toHaveLength(2);
      expect(recovered[1]?.properties).toMatchObject({ window_ms: 2000, total_cpu_pct: 100 });
    } finally {
      timeout.mockRestore();
      interval.mockRestore();
      display.mockRestore();
      clock.mockRestore();
      Reflect.deleteProperty(electron.app, 'on');
      resetTelemetryForTesting();
      setAppForTesting(undefined);
      if (originalRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
      else process.env['STUDIO_STATE_ROOT'] = originalRoot;
      if (originalKey === undefined) delete process.env['STUDIO_POSTHOG_KEY'];
      else process.env['STUDIO_POSTHOG_KEY'] = originalKey;
    }
  });
});
