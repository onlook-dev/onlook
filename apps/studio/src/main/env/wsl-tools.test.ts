import { describe, expect, it } from 'bun:test';
import type { CliResult } from './cli.js';
import { checkWslTools } from './wsl-tools.js';

const success: CliResult = { ok: true, out: 'version', err: '', timedOut: false, missing: false, exitCode: 0 };

describe('WSL machine checks', () => {
  it('checks commands in the selected distribution and explains where to install missing tools', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(process, 'platform')!;
    const calls: string[][] = [];
    const flags = process.env['STUDIO_FLAGS'];
    try {
      process.env['STUDIO_FLAGS'] = 'wsl-projects';
      Object.defineProperty(process, 'platform', { ...descriptor, value: 'win32' });
      await expect(checkWslTools('\\\\wsl$\\Ubuntu\\project', ['git', 'node'], async (bin, cwd, args) => {
        calls.push([bin, cwd, ...args]);
        return bin === 'node' ? { ...success, ok: false, missing: true, exitCode: 127 } : success;
      })).rejects.toThrow('node in the WSL distribution ubuntu');
      expect(calls).toEqual([['git', '\\\\wsl$\\Ubuntu\\project', '--version'], ['node', '\\\\wsl$\\Ubuntu\\project', '--version']]);
    } finally {
      Object.defineProperty(process, 'platform', descriptor);
      if (flags === undefined) delete process.env['STUDIO_FLAGS'];
      else process.env['STUDIO_FLAGS'] = flags;
    }
  });

  it('leaves non-WSL machine checks alone', async () => {
    let checked = false;
    await checkWslTools('/project', ['git'], async () => { checked = true; return success; });
    expect(checked).toBe(false);
  });
});
