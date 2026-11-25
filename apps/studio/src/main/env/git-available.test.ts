import { describe, expect, it } from 'bun:test';
import { gitAvailable, gitExecutable } from './git-available.js';

describe('Git availability without executing Git', () => {
  it.each(['win32', 'darwin', 'linux'] as const)('recognizes missing Git on %s without a tool prompt', async (platform) => {
    expect(await gitAvailable({}, {
      platform, resolve: () => undefined,
      realpath: () => { throw new Error('must not canonicalize missing Git'); },
      selectedTools: async () => { throw new Error('must not ask for tools'); },
      exists: () => false,
    })).toBe(false);
  });

  it.each(['win32', 'darwin'] as const)('keeps a custom Git on %s without probing Apple tools', async (platform) => {
    expect(await gitAvailable({}, {
      platform, resolve: () => '/custom/bin/git',
      realpath: () => '/custom/bin/git',
      selectedTools: async () => { throw new Error('must not ask for tools'); },
      exists: () => false,
    })).toBe(true);
  });

  it.each(['/usr/bin/git', '/bin/git'])('never executes the Apple stub %s when tools are absent', async (executable) => {
    expect(await gitAvailable({}, {
      platform: 'darwin', resolve: () => executable,
      realpath: (path) => path,
      selectedTools: async () => undefined, exists: () => true,
    })).toBe(false);
  });

  it('requires the selected developer directory to contain Git', async () => {
    const deps = { platform: 'darwin' as const, resolve: (env: { PATH?: string }) => env.PATH === '/tools/usr/bin' ? '/tools/usr/bin/git' : '/usr/bin/git', realpath: (path: string) => path, selectedTools: async () => '/tools', exists: (path: string) => path === '/tools/usr/bin/git' };
    expect(await gitAvailable({}, deps)).toBe(true);
    expect(await gitExecutable({}, deps)).toBe('/tools/usr/bin/git');
    expect(await gitAvailable({}, { ...deps, exists: () => false })).toBe(false);
    expect(await gitAvailable({}, { ...deps, selectedTools: async () => { throw new Error('unavailable'); } })).toBe(false);
  });

  it.each(['/usr/bin/git', '/bin/git'])('checks tools for an alias to %s without executing Git', async (target) => {
    const deps = {
      platform: 'darwin' as const,
      resolve: (env: { PATH?: string }) => env.PATH === '/tools/usr/bin' ? '/tools/usr/bin/git' : '/trusted/bin/git',
      realpath: (path: string) => path === '/trusted/bin/git' ? target : path,
      selectedTools: async (): Promise<string | undefined> => undefined,
      exists: (path: string) => path === '/tools/usr/bin/git',
    };
    expect(await gitExecutable({}, deps)).toBeUndefined();
    expect(await gitAvailable({}, deps)).toBe(false);
    expect(await gitExecutable({}, { ...deps, selectedTools: async () => '/tools' })).toBe('/tools/usr/bin/git');
  });

  it('preserves a custom Git alias without probing Apple tools', async () => {
    expect(await gitExecutable({}, {
      platform: 'darwin', resolve: () => '/trusted/bin/git',
      realpath: () => '/custom/bin/git',
      selectedTools: async () => { throw new Error('must not ask for tools'); },
      exists: () => false,
    })).toBe('/trusted/bin/git');
  });

  it('fails closed when a Mac executable cannot be canonicalized', async () => {
    expect(await gitExecutable({}, {
      platform: 'darwin', resolve: () => '/trusted/bin/git',
      realpath: () => { throw new Error('unreadable symlink'); },
      selectedTools: async () => { throw new Error('must not ask for tools'); },
      exists: () => true,
    })).toBeUndefined();
  });

  it('requires safe lookup to identify exactly the selected Git', async () => {
    for (const resolved of [undefined, '/other/bin/git']) {
      expect(await gitExecutable({}, {
        platform: 'darwin',
        resolve: (env) => env['PATH'] === '/tools/usr/bin' ? resolved : '/usr/bin/git',
        realpath: (path) => path,
        selectedTools: async () => '/tools', exists: () => true,
      })).toBeUndefined();
    }
  });

  it('rejects selected tools that point back to the Apple stub or cannot be canonicalized', async () => {
    for (const selectedTarget of ['/usr/bin/git', '/bin/git', undefined]) {
      expect(await gitExecutable({}, {
        platform: 'darwin', resolve: () => '/usr/bin/git',
        realpath: (path) => {
          if (path === '/usr/bin/git') return path;
          if (selectedTarget === undefined) throw new Error('unreadable symlink');
          return selectedTarget;
        },
        selectedTools: async () => '/tools', exists: () => true,
      })).toBeUndefined();
    }
  });
});
