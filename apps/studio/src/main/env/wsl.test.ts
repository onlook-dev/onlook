import type { ChildProcess, SpawnOptions, spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { signalGroup, signalTree, startChild } from './child.js';
import { WSL_EXEC_SCRIPT, rememberWslEnvironment, wslArgument, wslEnvironment, wslHostPath, wslLaunch, wslProject, wslStop, wslWorktreePath } from './wsl.js';

const folder = '\\\\wsl$\\Ubuntu-24.04\\projects\\example\\my project';
const project = wslProject(folder, 'win32', true)!;
const flags = process.env['STUDIO_FLAGS'];
beforeEach(() => { process.env['STUDIO_FLAGS'] = 'wsl-projects'; });
afterEach(() => {
  rememberWslEnvironment(project.distro, undefined);
  if (flags === undefined) delete process.env['STUDIO_FLAGS'];
  else process.env['STUDIO_FLAGS'] = flags;
});

describe('WSL project paths', () => {
  it('keeps the existing Windows behavior when the flag is off', () => {
    process.env['STUDIO_FLAGS'] = '-wsl-projects';
    expect(wslProject(folder, 'win32')).toBeUndefined();
    expect(wslProject('\\\\wsl.localhost\\Ubuntu\\project', 'win32')).toBeUndefined();
  });
  it('maps both prefixes without consulting the filesystem or losing Linux case', () => {
    expect(project).toEqual({ distro: 'ubuntu-24.04', linuxPath: '/projects/example/my project', hostPath: '\\\\wsl.localhost\\ubuntu-24.04\\projects\\example\\my project' });
    expect(wslProject('\\\\WSL.LOCALHOST\\Ubuntu-24.04\\projects\\example\\my project', 'win32')).toEqual(project);
    expect(wslProject('\\\\?\\UNC\\wsl$\\Ubuntu-24.04\\projects\\example\\my project', 'win32')).toEqual(project);
    expect(wslHostPath(project, '/projects/example/My Project')).toEndWith('\\projects\\example\\My Project');
    expect(wslHostPath(project, 'relative/file')).toBe('relative/file');
    expect(wslProject('\\\\wsl$\\Ubuntu', 'win32')?.linuxPath).toBe('/');
  });

  it('does not change local Windows folders, other shares or non-Windows projects', () => {
    for (const path of ['C:\\projects\\app', '\\\\server\\share\\app', '/projects/example/app', '\\\\wsl.localhost.evil\\Ubuntu\\app']) {
      expect(wslProject(path, 'win32')).toBeUndefined();
    }
    expect(wslProject(folder, 'darwin')).toBeUndefined();
    expect(wslProject(folder, 'linux')).toBeUndefined();
    expect(() => wslProject('\\\\wsl$\\..\\app', 'win32')).toThrow();
  });

  it('maps arguments and Git path settings without changing source code or shell text', () => {
    expect(wslArgument(project, folder)).toBe(project.linuxPath);
    expect(wslArgument(project, `GIT_INDEX_FILE=${folder}\\index`)).toBe('GIT_INDEX_FILE=/projects/example/my project/index');
    expect(wslArgument(project, 'console.log("/projects/example")')).toBe('console.log("/projects/example")');
    expect(() => wslArgument(project, '\\\\wsl$\\Debian\\project')).toThrow('another distribution');
  });

  it('keeps new worktrees beside the source in the same distro and reuses that root for copies', () => {
    const path = wslWorktreePath(project, 'repo-123', 'first');
    expect(path).toBe('\\\\wsl.localhost\\ubuntu-24.04\\projects\\example\\.onlook-worktrees\\repo-123\\first');
    expect(wslWorktreePath(wslProject(path, 'win32')!, 'repo-123', 'second')).toBe(path.replace('first', 'second'));
  });
});

describe('WSL launches', () => {
  it('leaves the launch and Windows cwd unchanged while the flag is off', () => {
    const descriptor = Object.getOwnPropertyDescriptor(process, 'platform')!;
    try {
      Object.defineProperty(process, 'platform', { ...descriptor, value: 'win32' });
      process.env['STUDIO_FLAGS'] = '-wsl-projects';
      const options = { cwd: folder, env: { PATH: 'C:\\tools' } };
      const launch = ((bin, args, passed) => {
        expect(bin).toBe('git.exe');
        expect(args).toEqual(['status']);
        expect(passed).toEqual({ ...options, shell: false });
        return new EventEmitter() as ChildProcess;
      }) as typeof spawn;
      startChild('git.exe', ['status'], options, launch);
    } finally {
      Object.defineProperty(process, 'platform', descriptor);
    }
  });

  it('executes an argument vector in the distro under setsid without cmd.exe or interpolation', () => {
    const args = ['run', 'dev', '--', '--host', '127.0.0.1', 'spaces & $() "quotes"'];
    const command = wslLaunch(project, 'npm', args, 'marker:');
    expect(command.bin).toEndWith('wsl.exe');
    expect(command.args).toEqual(['-d', 'ubuntu-24.04', '--cd', project.linuxPath, '--exec', '/usr/bin/setsid', '--wait', '--', '/bin/sh', '-c', WSL_EXEC_SCRIPT, 'onlook-wsl', 'marker:', 'npm', ...args]);
    expect(WSL_EXEC_SCRIPT).not.toContain('npm');
    expect(() => wslLaunch(project, 'C:\\node\\npm.cmd', [], 'marker:')).toThrow('inside the WSL');
  });

  it('transfers values only in the environment and keeps the Linux home, PATH and temp directory', () => {
    const built = { PATH: 'C:\\tools', HOME: 'C:\\home', TEMP: 'C:\\temp', NODE_OPTIONS: '--require=C:\\app', API_TOKEN: 'synthetic value with spaces & $()', PORT: '3000', PROJECT_ROOT: folder, WSLENV: 'PATH/p:HOME/p:OLD/u' };
    const env = wslEnvironment(project, built);
    expect(env['WSLENV']).toBe('API_TOKEN/u:PORT/u:PROJECT_ROOT/u');
    expect(env['API_TOKEN']).toBe(built.API_TOKEN);
    expect(env['PROJECT_ROOT']).toBe(project.linuxPath);
    expect(wslLaunch(project, 'node', ['server.mjs'], 'marker:').args.join(' ')).not.toContain(built.API_TOKEN);
    expect(built.WSLENV).toBe('PATH/p:HOME/p:OLD/u');
  });

  it('keeps the distro toolchain and applies explicit overrides and removals after its login environment', () => {
    rememberWslEnvironment(project.distro, { HOME: '/projects/example', PATH: '/projects/example/.nvm/bin:/usr/bin', TOKEN: 'linux', GIT_SSH: '/unsafe/helper' });
    const env = wslEnvironment(project, { HOME: 'C:\\home', PATH: 'C:\\tools', TOKEN: 'override' }, ['GIT_SSH']);
    expect(env['HOME']).toBe('/projects/example');
    expect(env['PATH']).toBe('/projects/example/.nvm/bin:/usr/bin');
    expect(env['TOKEN']).toBe('override');
    expect(env['GIT_SSH']).toBeUndefined();
    expect(env['WSLENV']).toBe('HOME/u:PATH/u:TOKEN/u');
  });

  it('stops a Linux process group in the same distro, never by its Windows wrapper pid', () => {
    expect(wslStop(project, 4321, 'SIGTERM').args).toEqual(['-d', 'ubuntu-24.04', '--cd', '/', '--exec', '/bin/kill', '-s', 'TERM', '--', '-4321']);
    expect(wslStop(project, 4321, 'SIGKILL').args).toContain('KILL');
    for (const group of [-1, 0, 1, 2.5, NaN]) expect(() => wslStop(project, group, 'SIGTERM')).toThrow();
    expect(() => wslStop(project, 4321, 'SIGUSR1')).toThrow();
  });

  it('routes the real child seam and queues cancellation until the Linux group is known', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(process, 'platform')!;
    const launches: { bin: string; args: readonly string[]; options: SpawnOptions }[] = [];
    const stderr = new PassThrough();
    const directSignals: unknown[] = [];
    const child = Object.assign(new EventEmitter(), { pid: 8765, stdout: new PassThrough(), stderr, kill: (...args: unknown[]) => { directSignals.push(args); return true; } }) as unknown as ChildProcess;
    const launch = ((bin: string, args: readonly string[], options: SpawnOptions) => {
      launches.push({ bin, args, options });
      return launches.length === 1 ? child : new EventEmitter() as ChildProcess;
    }) as typeof spawn;
    try {
      Object.defineProperty(process, 'platform', { ...descriptor, value: 'win32' });
      const started = startChild('npm', ['run', 'dev'], { cwd: folder, env: { API_TOKEN: 'synthetic' }, stdio: ['pipe', 'pipe', 'pipe'] }, launch);
      let output = '';
      started.stderr!.on('data', (chunk: Buffer) => { output += chunk.toString(); });
      signalGroup(started, 'SIGTERM', 'signal-child');
      signalTree(8765, 'SIGKILL');
      expect(launches).toHaveLength(1);
      const marker = launches[0]!.args[launches[0]!.args.indexOf(WSL_EXEC_SCRIPT) + 2]!;
      stderr.write(`WSL startup warning\n${marker.slice(0, 8)}`);
      stderr.write(`${marker.slice(8)}4321\nready\n`);
      await Promise.resolve();
      expect(output).toBe('WSL startup warning\nready\n');
      expect(launches).toHaveLength(2);
      expect(launches[1]!.args).toContain('-4321');
      expect(launches[1]!.args).toContain('KILL');
      expect(launches[0]!.options.cwd).toBeUndefined();
      expect(launches[0]!.options.env!['WSLENV']).toBe('API_TOKEN/u');
      expect(directSignals).toEqual([]);
      child.emit('close', 0);
      child.kill('SIGTERM');
      expect(launches).toHaveLength(2);
    } finally {
      Object.defineProperty(process, 'platform', descriptor);
    }
  });

  it('bounds cancellation when WSL never reaches its startup handshake', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(process, 'platform')!;
    const signals: unknown[] = [];
    const child = Object.assign(new EventEmitter(), { pid: 8766, stdout: new PassThrough(), stderr: new PassThrough(), kill: (signal: unknown) => { signals.push(signal); return true; } }) as unknown as ChildProcess;
    try {
      Object.defineProperty(process, 'platform', { ...descriptor, value: 'win32' });
      startChild('node', [], { cwd: folder, env: {}, stdio: 'pipe' }, (() => child) as typeof spawn);
      signalGroup(child, 'SIGKILL', 'signal-child');
      expect(signals).toEqual([]);
      await new Promise((resolve) => setTimeout(resolve, 2_100));
      expect(signals).toEqual(['SIGKILL']);
      expect(WSL_EXEC_SCRIPT).toContain('>&2 || exit 125');
    } finally {
      child.emit('close', 0);
      Object.defineProperty(process, 'platform', descriptor);
    }
  });
});
