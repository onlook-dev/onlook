import { afterEach, beforeEach, expect, it } from 'bun:test';
import type { CliResult } from './cli.js';
import { signalWslListener, wslProcesses } from './wsl-processes.js';

const folder = '\\\\wsl$\\Ubuntu\\projects\\example\\project';
const descriptor = Object.getOwnPropertyDescriptor(process, 'platform')!;
const flags = process.env['STUDIO_FLAGS'];
const success: CliResult = { ok: true, out: '', err: '', timedOut: false, missing: false, exitCode: 0 };
beforeEach(() => {
  Object.defineProperty(process, 'platform', { ...descriptor, value: 'win32' });
  process.env['STUDIO_FLAGS'] = 'wsl-projects';
});
afterEach(() => {
  Object.defineProperty(process, 'platform', descriptor);
  if (flags === undefined) delete process.env['STUDIO_FLAGS'];
  else process.env['STUDIO_FLAGS'] = flags;
});

it('maps only valid Linux process identities and treats malformed inspection output as unknown', async () => {
  const run: Parameters<typeof wslProcesses>[2] = async (bin, cwd, args) => {
    expect([bin, cwd, args.at(-1)]).toEqual(['node', folder, '4321']);
    return { ...success, out: JSON.stringify([{ pid: 22, cwd: '/projects/example/project', creationTime: '123' }, { pid: 1, cwd: '/', creationTime: '2' }, null]) };
  };
  expect(await wslProcesses(folder, 4321, run)).toEqual([{ pid: 22, cwd: '\\\\wsl.localhost\\ubuntu\\projects\\example\\project', creationTime: '123' }]);
  expect(await wslProcesses(folder, 4321, async () => ({ ...success, out: 'unavailable' }))).toEqual([]);
});

it('rechecks Linux start time and cwd in the distro before signalling a listener', async () => {
  let called = false;
  await signalWslListener(folder, 22, 'SIGTERM', '123', folder, async (bin, cwd, args) => {
    called = true;
    expect([bin, cwd, ...args.slice(-4)]).toEqual(['node', folder, '22', '123', 'SIGTERM', folder]);
    expect(args[1]).toContain("actual !== expected");
    expect(args[1]).toContain("fs.readlinkSync('/proc/' + pid + '/cwd') !== cwd");
    return success;
  });
  expect(called).toBe(true);
  await expect(signalWslListener(folder, 1, 'SIGTERM', '123')).rejects.toThrow('Invalid WSL listener');
  await expect(signalWslListener(folder, 22, 'SIGKILL', undefined)).rejects.toThrow('Invalid WSL listener');
});
