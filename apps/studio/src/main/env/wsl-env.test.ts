import { expect, it } from 'bun:test';
import { ensureWslEnvironment } from './wsl-env.js';
import { rememberWslEnvironment, wslEnvironment, wslProject } from './wsl.js';

it('captures the distro login environment once without sending host credentials', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(process, 'platform')!;
  const flags = process.env['STUDIO_FLAGS'];
  const folder = '\\\\wsl$\\Environment-Test\\projects\\example\\project';
  let calls = 0;
  try {
    Object.defineProperty(process, 'platform', { ...descriptor, value: 'win32' });
    process.env['STUDIO_FLAGS'] = 'wsl-projects';
    const capture: Parameters<typeof ensureWslEnvironment>[1] = async (bin, args, options) => {
      calls++;
      expect(bin).toBe('/bin/sh');
      expect(args![1]).toBe('cd "$HOME" && exec /bin/bash "$@"');
      expect(options!.cwd).toBe('\\\\wsl.localhost\\environment-test\\');
      expect(Object.keys(options!.env!)).toEqual(['SystemRoot']);
      const marker = /ONLOOK_ENV_[a-f0-9-]+/.exec(args!.at(-1)!)![0];
      return { stdout: `login banner\n${marker}:BEGINHOME=/projects/example\0PATH=/projects/example/.nvm/bin:/usr/bin\0${marker}:END`, stderr: '' };
    };
    await Promise.all([ensureWslEnvironment(folder, capture), ensureWslEnvironment(folder, capture)]);
    expect(calls).toBe(1);
    expect(wslEnvironment(wslProject(folder)!, { PATH: 'C:\\Windows' })['PATH']).toBe('/projects/example/.nvm/bin:/usr/bin');
  } finally {
    rememberWslEnvironment('environment-test', undefined);
    Object.defineProperty(process, 'platform', descriptor);
    if (flags === undefined) delete process.env['STUDIO_FLAGS'];
    else process.env['STUDIO_FLAGS'] = flags;
  }
});

it('does not capture an environment while the WSL flag is off', async () => {
  let called = false;
  await ensureWslEnvironment('\\\\wsl$\\Ubuntu\\project', async () => { called = true; return { stdout: '', stderr: '' }; });
  expect(called).toBe(false);
});
