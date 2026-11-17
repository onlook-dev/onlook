import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, relative } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import { packageManagerPath, resolvePackageManager } from './resolve.js';

const made: string[] = [];

afterAll(() => {
  for (const directory of made) rmSync(directory, { recursive: true, force: true });
});

function fixture(): string {
  const directory = mkdtempSync(join(tmpdir(), 'studio-install-resolve-'));
  made.push(directory);
  return directory;
}

function executable(directory: string, name: string): string {
  mkdirSync(directory, { recursive: true });
  const path = join(directory, name);
  writeFileSync(path, '#!/bin/sh\nexit 0\n');
  chmodSync(path, 0o755);
  return path;
}

describe('selected package manager discovery', () => {
  it('security excludes project-local package managers even through absolute PATH entries', async () => {
    const home = fixture();
    const cwd = join(home, 'project');
    executable(join(cwd, 'bin'), 'bun');
    const selected = executable(join(home, '.bun/bin'), 'bun');
    expect(await resolvePackageManager('bun', { HOME: home, PATH: join(cwd, 'bin') }, { cwd, systemDirectories: [] })).toBe(selected);
  });
  it('prefers the captured PATH over standard Bun locations', async () => {
    const home = fixture();
    const selected = executable(join(home, 'shell-bin'), 'bun');
    executable(join(home, '.bun/bin'), 'bun');
    expect(await resolvePackageManager('bun', { HOME: home, PATH: join(home, 'shell-bin') })).toBe(selected);
  });

  it('uses BUN_INSTALL before the default home install for a Dock-like PATH', async () => {
    const home = fixture();
    const selected = executable(join(home, 'custom-bun/bin'), 'bun');
    executable(join(home, '.bun/bin'), 'bun');
    expect(await resolvePackageManager('bun', {
      HOME: home, PATH: '/usr/bin:/bin', BUN_INSTALL: join(home, 'custom-bun'),
    })).toBe(selected);
  });

  it('rediscovers an executable installed after an earlier failure', async () => {
    const home = fixture();
    const env = { HOME: home, PATH: join(home, 'empty') };
    expect(await resolvePackageManager('bun', env, { systemDirectories: [] })).toBeUndefined();
    const selected = executable(join(home, '.bun/bin'), 'bun');
    expect(await resolvePackageManager('bun', env, { systemDirectories: [] })).toBe(selected);
  });

  it('rejects non-executable files, directories, and dangling symlinks', async () => {
    const home = fixture();
    const file = executable(join(home, 'file'), 'bun');
    chmodSync(file, 0o644);
    mkdirSync(join(home, 'directory/bun'), { recursive: true });
    mkdirSync(join(home, 'broken'));
    symlinkSync(join(home, 'absent'), join(home, 'broken/bun'));
    const selected = executable(join(home, '.bun/bin'), 'bun');
    const PATH = ['file', 'directory', 'broken'].map((name) => join(home, name)).join(delimiter);
    expect(await resolvePackageManager('bun', { HOME: home, PATH })).toBe(selected);
  });

  it('accepts executable symlinks and ignores relative or empty PATH entries', async () => {
    const home = fixture();
    const target = executable(join(home, 'target'), 'bun');
    mkdirSync(join(home, 'bin'));
    const selected = join(home, 'bin/bun');
    symlinkSync(target, selected);
    expect(await resolvePackageManager('bun', {
      HOME: home, PATH: ['', '.', 'node_modules/.bin', join(home, 'bin')].join(delimiter),
    })).toBe(selected);
  });

  it('does not resolve a real executable from a relative PATH directory', async () => {
    const home = fixture();
    const untrusted = join(home, 'untrusted');
    executable(untrusted, 'bun');
    const selected = executable(join(home, '.bun/bin'), 'bun');
    expect(await resolvePackageManager('bun', {
      HOME: home, PATH: relative(process.cwd(), untrusted),
    })).toBe(selected);
  });

  it('retains captured PATH priority while making trusted interpreter locations available', () => {
    const home = fixture();
    const path = packageManagerPath('yarn', { HOME: home, PATH: '/chosen/node/bin:/usr/bin' }).split(delimiter);
    expect(path.slice(0, 2)).toEqual(['/chosen/node/bin', '/usr/bin']);
    expect(path).toContain(join(home, '.yarn/bin'));
    expect(path).toContain('/opt/homebrew/bin');
    expect(path).toContain('/usr/local/bin');
    expect(new Set(path).size).toBe(path.length);
  });

  it('searches Homebrew without substituting its available npm for missing Bun', async () => {
    const home = fixture();
    const brew = join(home, 'homebrew/bin');
    const selected = executable(brew, 'bun');
    expect(await resolvePackageManager('bun', { HOME: home, PATH: '' }, {
      systemDirectories: [brew],
    })).toBe(selected);
    executable(brew, 'npm');
    expect(await resolvePackageManager('pnpm', { HOME: home, PATH: brew }, {
      systemDirectories: [brew],
    })).toBeUndefined();
  });

  it.each([
    ['pnpm', 'PNPM_HOME', 'pnpm-home'],
    ['yarn', undefined, '.yarn/bin'],
    ['npm', 'NPM_CONFIG_PREFIX', 'npm-prefix/bin'],
    ['npm', 'VOLTA_HOME', 'volta/bin'],
  ] as const)('finds %s in its standard installation directory (%s)', async (manager, key, directory) => {
    const home = fixture();
    const selected = executable(join(home, directory), manager);
    const configured = key === 'PNPM_HOME' ? join(home, directory) : join(home, directory, '..');
    const env = { HOME: home, PATH: '', ...(key ? { [key]: configured } : {}) };
    expect(await resolvePackageManager(manager, env, { systemDirectories: [] })).toBe(selected);
  });
});
