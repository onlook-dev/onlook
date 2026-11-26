import { afterAll, describe, expect, it } from 'bun:test';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeWorkspaceRoot } from '@studio/fixtures';
import { machineHasFailure, type MachineCheckId } from '@studio/events';
import { runCli, type CliResult } from '../env/cli.js';
import { StarterFailure } from '../starter/failure.js';
import { pickStarterPort } from '../starter/port.js';
import { git } from './git.js';
import { checkGit, checkProjectsFolder, runMachineChecks, type MachineCheckDeps } from './machine-checks.js';

afterAll(cleanupTempFixtures);
const success: CliResult = { ok: true, out: 'git version 2.51.0', err: '', exitCode: 0, timedOut: false, missing: false };
function result(overrides: Partial<CliResult>): CliResult { return { ...success, ok: false, exitCode: 1, ...overrides }; }
function deps(overrides: Partial<MachineCheckDeps> = {}): MachineCheckDeps {
  return { git: async () => success, workspace: async () => {}, port: async () => 4700, helper: async () => {}, failed: () => {}, ...overrides };
}

describe('machine checks', () => {
  it('runs init, commit and the production worktree flags without a version gate', async () => {
    const calls: string[][] = [];
    const folders: string[] = [];
    const checked = await checkGit(async (cwd, args) => {
      folders.push(cwd);
      calls.push(args);
      if (args[0] === '--version') return { ...success, out: 'custom git build, older but working' };
      return git(cwd, args);
    });
    expect(checked).toBeUndefined();
    // The branch is named the way every current Git names it; `git.test.ts` holds the way out for one that has no -b.
    expect(calls).toContainEqual(['init', '--quiet', '-b', 'main']);
    expect(calls.some((args) => args.includes('commit'))).toBe(true);
    expect(calls.find((args) => args[0] === 'worktree')?.slice(0, 5)).toEqual(['worktree', 'add', '--no-track', '-b', 'onlook-check']);
    expect(folders.every((folder) => !existsSync(folder))).toBe(true);
  });

  it('does not trust an executable Git stub that fails at once', async () => {
    const root = makeWorkspaceRoot({ name: 'machine-executable-stub' });
    const executable = join(root, 'git-stub');
    writeFileSync(executable, '#!/bin/sh\necho "xcode-select: note: No developer tools were found" >&2\nexit 1\n', { mode: 0o755 });
    expect(await checkGit((cwd, args) => runCli(executable, cwd, args, { timeoutMs: 1_000 }))).toBe('developer_tools_missing');
  });

  it.each([
    ['missing executable', result({ missing: true, exitCode: null }), 'git_not_found'],
    ['unaccepted license', result({ err: 'You have not agreed to the Xcode license agreements.' }), 'git_license_unaccepted'],
    ['invalid configuration', result({ err: 'fatal: bad config line 1 in file /private/settings' }), 'git_config_invalid'],
    ['invalid boolean setting', result({ err: "fatal: bad boolean config value 'maybe' for 'core.autocrlf'" }), 'git_config_invalid'],
    ['unresponsive check', result({ timedOut: true, exitCode: null }), 'inconclusive'],
    ['terminated check', result({ exitCode: null }), 'inconclusive'],
  ] as const)('%s has a fixed, private result', async (_name, answer, expected) => {
    expect(await checkGit(async () => answer)).toBe(expected);
  });

  it('finds malformed global config even when --version succeeds', async () => {
    const root = makeWorkspaceRoot({ name: 'machine-bad-config' });
    const config = join(root, 'gitconfig');
    writeFileSync(config, '[broken\n');
    expect(await checkGit((cwd, args) => args[0] === '--version' ? Promise.resolve(success) : git(cwd, args, { env: { GIT_CONFIG_GLOBAL: config } }))).toBe('git_config_invalid');
  });

  it('classifies a failed worktree command after a successful init and commit', async () => {
    expect(await checkGit(async (_cwd, args) => args[0] === 'worktree' ? result({ err: 'worktree failed' }) : success)).toBe('git_failed');
  });

  it('writes a scratch file in an unusual Projects folder and leaves it empty', async () => {
    const root = makeWorkspaceRoot({ name: 'machine-folder' });
    const folder = join(root, 'projects with spaces and 日本語');
    await checkProjectsFolder(folder);
    expect(readdirSync(folder)).toEqual([]);
  });

  it('finds the last available port in the real starter range', async () => {
    const visited: number[] = [];
    const checks = await runMachineChecks(deps({ port: () => pickStarterPort(undefined, async (port) => { visited.push(port); return port === 4799; }) }));
    expect(checks.find((check) => check.id === 'port')).toEqual({ id: 'port', status: 'passed' });
    expect(visited).toEqual(Array.from({ length: 100 }, (_value, index) => 4700 + index));
  });

  it('passes a helper regardless of PID, executable path or startup preference', async () => {
    const checks = await runMachineChecks(deps({ helper: async () => { await Promise.resolve(); } }));
    expect(checks.find((check) => check.id === 'helper')).toEqual({ id: 'helper', status: 'passed' });
  });

  it('reports every definite failure with only its check id', async () => {
    const ids: MachineCheckId[] = [];
    const checks = await runMachineChecks(deps({
      git: async () => result({ missing: true }),
      workspace: async () => { throw Object.assign(new Error('/private/project'), { code: 'EACCES' }); },
      port: () => pickStarterPort(undefined, async () => false),
      helper: async () => { throw new StarterFailure('starter_exited', '/private/helper'); },
      failed: (id) => { ids.push(id); },
    }));
    expect(ids.sort()).toEqual(['git', 'helper', 'port', 'workspace']);
    expect(checks.map((check) => check.status)).toEqual(['failed', 'failed', 'failed', 'failed']);
    expect(JSON.stringify(checks)).not.toContain('/private');
    expect(machineHasFailure(checks)).toBe(true);
  });

  it('does not block or emit failure telemetry when a check itself errors or times out', async () => {
    const ids: MachineCheckId[] = [];
    const checks = await runMachineChecks(deps({
      git: async () => result({ timedOut: true, exitCode: null }),
      workspace: async () => { throw Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }); },
      port: async () => { throw new Error('probe error'); },
      helper: async () => { throw new Error('probe timeout'); },
      failed: (id) => { ids.push(id); },
    }));
    expect(checks.every((check) => check.status === 'inconclusive')).toBe(true);
    expect(machineHasFailure(checks)).toBe(false);
    expect(ids).toEqual([]);
  });

  it.each([undefined, null, new Error('probe unavailable'), Object.assign(new Error('busy cleanup'), { code: 'EBUSY' })])('does not block on an unrecognized Projects folder probe error: %s', async (error) => {
    const ids: MachineCheckId[] = [];
    const checks = await runMachineChecks(deps({ workspace: async () => { throw error; }, failed: (id) => { ids.push(id); } }));
    expect(checks.find((check) => check.id === 'workspace')).toEqual({ id: 'workspace', status: 'inconclusive' });
    expect(machineHasFailure(checks)).toBe(false);
    expect(ids).toEqual([]);
  });

  it.each(['ENOTDIR', 'EEXIST', 'ENOENT', 'EIO'])('blocks a definite Projects folder failure: %s', async (code) => {
    const checks = await runMachineChecks(deps({ workspace: async () => { throw Object.assign(new Error('cannot write'), { code }); } }));
    expect(checks.find((check) => check.id === 'workspace')).toEqual({ id: 'workspace', status: 'failed', cause: 'workspace_not_writable' });
    expect(machineHasFailure(checks)).toBe(true);
  });
});
