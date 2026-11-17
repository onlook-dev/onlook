import childProcess, { type ExecFileOptions } from 'node:child_process';
import { afterEach, beforeEach, expect, it, mock } from 'bun:test';

const platform = Object.getOwnPropertyDescriptor(process, 'platform')!;
let inspectionError: NodeJS.ErrnoException | null = null;
let response = '[]';
let receivedOptions: ExecFileOptions | undefined;
let receivedCommand = '';
const execution = mock((...args: unknown[]) => {
  receivedOptions = args[2] as ExecFileOptions;
  const command = args[1] as string[];
  receivedCommand = Buffer.from(command.at(-1)!, 'base64').toString('utf16le');
  const callback = args[3] as (error: NodeJS.ErrnoException | null, stdout: string) => void;
  callback(inspectionError, response);
  return {} as childProcess.ChildProcess;
});
mock.module('node:child_process', () => ({ ...childProcess, execFile: execution }));
const { identifyListener } = await import('./owner.js');
const { inspectWindowsProcess, windowsProcesses } = await import('./windows.js');

beforeEach(() => {
  Object.defineProperty(process, 'platform', { value: 'win32' });
});

afterEach(() => {
  execution.mockClear();
  Object.defineProperty(process, 'platform', platform);
  inspectionError = null;
  response = '[]';
  receivedOptions = undefined;
  receivedCommand = '';
});

it('Windows inspection retains the product 10s default and forwards an explicit timeout', async () => {
  await windowsProcesses(3000);
  expect(receivedOptions?.timeout).toBe(10_000);
  expect(receivedCommand).toContain('$StudioPort = 3000');
  await inspectWindowsProcess(42, { timeoutMs: 30_000 });
  expect(receivedOptions?.timeout).toBe(30_000);
  expect(receivedCommand).toContain('$StudioPid = 42');
});

it('strict listener identification rejects a PowerShell timeout instead of reporting an absent listener', async () => {
  inspectionError = Object.assign(new Error('Command failed'), { killed: true, signal: 'SIGTERM' });
  await expect(identifyListener(3000, { timeoutMs: 30_000, throwOnInspectionError: true }))
    .rejects.toThrow('PowerShell inspection timed out after 30000ms');
  expect(receivedOptions?.timeout).toBe(30_000);
  expect(await identifyListener(3000)).toBeUndefined();
  expect(receivedOptions?.timeout).toBe(10_000);
});

it('strict listener identification distinguishes successful absence from failed inspection', async () => {
  expect(await identifyListener(3000, { throwOnInspectionError: true })).toBeUndefined();
  inspectionError = Object.assign(new Error('PowerShell unavailable'), { code: 'ENOENT' });
  await expect(identifyListener(3000, { throwOnInspectionError: true })).rejects.toThrow('PowerShell unavailable');
  inspectionError = null;
  response = 'not json';
  await expect(identifyListener(3000, { throwOnInspectionError: true })).rejects.toThrow();
});

it('strict listener identification preserves real identity fields and ambiguous-listener handling', async () => {
  const identity = { pid: 42, cwd: 'C:\\workspaces\\ours', creationTime: '123456', command: 'node', ports: [3000] };
  response = JSON.stringify([identity]);
  expect(await identifyListener(3000, { throwOnInspectionError: true })).toEqual(identity);
  response = JSON.stringify([identity, { ...identity, pid: 43 }]);
  expect(await identifyListener(3000, { throwOnInspectionError: true })).toBeUndefined();
});

it('Windows inspection rejects invalid budgets before starting PowerShell', async () => {
  for (const timeoutMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
    await expect(windowsProcesses(3000, { timeoutMs })).rejects.toThrow('Invalid inspection timeout');
  }
  expect(execution).not.toHaveBeenCalled();
});
