import { expect, test } from 'bun:test';
import { readEnvironment, type EnvironmentReaders } from './environment.js';
import type { CliResult } from '../env/cli.js';

function result(out: string, ok = true): CliResult {
  return { out, ok, err: '', timedOut: false, missing: !ok, exitCode: ok ? 0 : 1 };
}

test('Windows environment diagnostics keep versions and booleans, never PATH or registry text', async () => {
  const calls: string[][] = [];
  const readers: EnvironmentReaders = {
    platform: 'win32', release: '10.0.22631', arch: 'x64',
    env: async () => ({ Path: 'C:\\private\\tools;C:\\Windows\\System32', TOKEN: 'private-token' }),
    resolves: (bin) => bin === 'git',
    run: async (bin, args) => {
      calls.push([bin, ...args]);
      if (bin === 'git') return result('git version 2.47.1.windows.1\n');
      if (bin === 'node') return result('v22.12.0\n');
      if (bin === 'npm') return result('', false);
      return result(`private registry header\n ${args.at(-1)} REG_DWORD 0x1`);
    },
  };
  const diagnostics = await readEnvironment(readers);
  expect(diagnostics).toEqual({ git_present: true, git_version: '2.47.1.windows.1', git_source: 'system', node_present: true, node_version: '22.12.0', npm_present: false, path_entry_count: 2, git_on_path: true, node_on_path: false, shell: 'powershell', windows_build: 22631, arch: 'x64', developer_mode: true, long_paths_enabled: true });
  expect(calls).toHaveLength(5);
  expect(JSON.stringify(diagnostics)).not.toContain('private');
});

test('failed Windows probes stay inconclusive and cannot export arbitrary version output', async () => {
  const diagnostics = await readEnvironment({
    platform: 'win32', release: 'not-a-build', arch: 'arm64', env: async () => ({}), resolves: () => false,
    run: async (bin) => bin === 'node' ? result('v22.12.0\nprivate text') : result('', false),
  });
  expect(diagnostics).toMatchObject({ git_present: false, git_source: 'none', node_version: null, path_entry_count: 0, windows_build: null, developer_mode: null, long_paths_enabled: null });
});

test('non-Windows environment checks never query the registry', async () => {
  let calls = 0;
  const diagnostics = await readEnvironment({ platform: 'darwin', release: '25.1.0', arch: 'arm64', env: async () => ({ PATH: '/usr/bin:/opt/bin' }), resolves: () => true, run: async () => { calls += 1; return result('1.2.3'); } });
  expect(calls).toBe(4);
  expect(diagnostics).toMatchObject({ windows_build: null, developer_mode: null, long_paths_enabled: null, shell: 'other', path_entry_count: 2 });
});

test('macOS checks developer tools before running Git and parses the Apple version', async () => {
  const calls: string[][] = [];
  const diagnostics = await readEnvironment({
    platform: 'darwin', release: '25.1.0', arch: 'arm64', env: async () => ({}), resolves: () => true,
    run: async (bin, args) => {
      calls.push([bin, ...args]);
      if (bin === 'xcode-select') return result('/Library/Developer/CommandLineTools\n');
      expect(calls[0]).toEqual(['xcode-select', '-p']);
      return result(bin === 'git' ? 'git version 2.39.5 (Apple Git-154)\n' : 'v22.12.0\n');
    },
  });
  expect(calls).toEqual([['xcode-select', '-p'], ['node', '--version'], ['npm', '--version'], ['git', '--version']]);
  expect(diagnostics).toMatchObject({ git_present: true, git_version: '2.39.5', git_source: 'system' });
  expect(JSON.stringify(diagnostics)).not.toContain('/Library');
});

test.each(['absent', 'throws'])('macOS never invokes Git when developer tools are %s', async (failure) => {
  const calls: string[][] = [];
  const diagnostics = await readEnvironment({
    platform: 'darwin', release: '25.1.0', arch: 'arm64', env: async () => ({}), resolves: () => true,
    run: async (bin, args) => {
      calls.push([bin, ...args]);
      if (bin === 'xcode-select') {
        if (failure === 'throws') throw new Error('developer tools unavailable');
        return result('', false);
      }
      return result('v22.12.0\n');
    },
  });
  expect(calls).toEqual([['xcode-select', '-p'], ['node', '--version'], ['npm', '--version']]);
  expect(diagnostics).toMatchObject({ git_present: false, git_version: null, git_source: 'none', node_present: true, npm_present: true });
});

test.each([
  'private text git version 2.39.5 (Apple Git-154)',
  'git version 2.39.5 private text',
  'git version 2.39.5 (Apple Git-154) private text',
  'git version 2.39.5 (Apple Git-154)\nprivate text',
  'git version 2.39.5\n(Apple Git-154)',
  '\ngit version 2.39.5',
  'git version 2.39.5\n\n',
])('version diagnostics reject arbitrary or multiline output: %j', async (output) => {
  const diagnostics = await readEnvironment({
    platform: 'linux', release: '6.1.0', arch: 'x64', env: async () => ({}), resolves: () => true,
    run: async () => result(output),
  });
  expect(diagnostics.git_version).toBeNull();
  expect(diagnostics.node_version).toBeNull();
});
