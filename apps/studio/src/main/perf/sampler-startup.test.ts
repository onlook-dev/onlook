import { expect, it, mock, spyOn } from 'bun:test';
import electron from 'electron';
import * as childProcess from 'node:child_process';
import { makeStateRoot } from '@studio/fixtures';
import { initTelemetry, peekQueueForTesting, resetTelemetryForTesting, setAppForTesting } from '../telemetry/index.js';
import { startResourceSampling } from './sampler.js';

it('uses a 15-second boot ps timeout and 5-second periodic timeouts with the default readers', async () => {
  const stateRoot = makeStateRoot({ name: 'sampling-startup' });
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
  const calls: { file: string; args: string[]; timeout: number }[] = [];
  const execute = spyOn(childProcess, 'execFile').mockImplementation(((file: string, args: string[], options: { timeout: number }, callback: (error: null, stdout: string, stderr: string) => void) => {
    calls.push({ file, args, timeout: options.timeout });
    queueMicrotask(() => callback(null, '', ''));
    return { pid: 900000 };
  }) as unknown as typeof childProcess.execFile);
  const display = spyOn(electron.screen, 'getPrimaryDisplay').mockReturnValue({ displayFrequency: 60 } as Electron.Display);
  const originals = [
    { target: electron.app, key: 'on' },
    { target: electron.app, key: 'getAppMetrics' },
    { target: electron.webContents, key: 'getAllWebContents' },
  ].map(({ target, key }) => ({ target, key, descriptor: Object.getOwnPropertyDescriptor(target, key) }));
  const metrics = mock(() => []);
  const contents = mock(() => []);
  Object.assign(electron.app, { on: () => electron.app, getAppMetrics: metrics });
  Object.assign(electron.webContents, { getAllWebContents: contents });
  const settle = async (): Promise<void> => { for (let turn = 0; turn < 12; turn += 1) await Promise.resolve(); };
  const expectedCall = (timeout: number) => ({ file: '/bin/ps', args: ['-Ao', 'pid=,ppid=,rss=,time=,comm='], timeout });
  try {
    startResourceSampling();
    await settle();
    expect(calls).toEqual([expectedCall(15_000)]);
    expect(starts).toHaveLength(1);
    starts[0]!();
    await settle();
    expect(calls).toEqual([expectedCall(15_000), expectedCall(5_000)]);
    expect(repeats).toHaveLength(1);
    repeats[0]!();
    await settle();
    expect(calls).toEqual([expectedCall(15_000), expectedCall(5_000), expectedCall(5_000)]);
    expect(metrics).toHaveBeenCalledTimes(3);
    expect(contents).toHaveBeenCalledTimes(3);
    expect(peekQueueForTesting().filter((event) => event.event === 'app_resources_sampled')).toHaveLength(2);
  } finally {
    timeout.mockRestore();
    interval.mockRestore();
    execute.mockRestore();
    display.mockRestore();
    for (const { target, key, descriptor } of originals) {
      if (descriptor === undefined) Reflect.deleteProperty(target, key);
      else Object.defineProperty(target, key, descriptor);
    }
    resetTelemetryForTesting();
    setAppForTesting(undefined);
    if (originalRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
    else process.env['STUDIO_STATE_ROOT'] = originalRoot;
    if (originalKey === undefined) delete process.env['STUDIO_POSTHOG_KEY'];
    else process.env['STUDIO_POSTHOG_KEY'] = originalKey;
  }
});
