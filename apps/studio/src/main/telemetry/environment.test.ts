import { expect, test } from 'bun:test';
import { checkEnvironment, environmentContext, readEnvironment, type EnvironmentReaders } from './environment.js';
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
  expect(calls).toBe(3);
  expect(diagnostics).toMatchObject({ windows_build: null, developer_mode: null, long_paths_enabled: null, shell: 'other', path_entry_count: 2 });
});

test('environment detection runs once per launch and shares its safe snapshot', async () => {
  let runs = 0;
  const readers: EnvironmentReaders = { platform: 'win32', release: '10.0.22631', arch: 'x64', env: async () => ({}), resolves: () => false, run: async () => { runs += 1; return result('', false); } };
  const first = checkEnvironment(readers);
  expect(checkEnvironment(readers)).toBe(first);
  const snapshot = await first;
  expect(runs).toBe(5);
  expect(environmentContext()).toEqual(snapshot);
});
