import { strict as assert } from 'node:assert';
import { type ChildProcess, type spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { afterEach, test } from 'node:test';
import { canonicalPath, setCanonicalPathMapper, workspaceHash } from '../lib/canonical-path.js';
import { startChild } from './child.js';
import { runGit, USER_GIT_CONFIG } from './git.js';
import { checkWslTools } from './wsl-tools.js';
import { rememberWslEnvironment, WSL_EXEC_SCRIPT, wslEnvironment, wslLaunch, wslProject, wslStop, wslWorktreePath } from './wsl.js';

const folder = '\\\\wsl$\\Ubuntu-24.04\\projects\\example\\my project';
const project = wslProject(folder, 'win32', true)!;
const flags = process.env['STUDIO_FLAGS'];

afterEach(() => {
  setCanonicalPathMapper(() => undefined);
  rememberWslEnvironment(project.distro, undefined);
  if (flags === undefined) delete process.env['STUDIO_FLAGS'];
  else process.env['STUDIO_FLAGS'] = flags;
});

test('WSL routing is opt-in and leaves ordinary Windows projects on the host', () => {
  delete process.env['STUDIO_FLAGS'];
  assert.equal(wslProject(folder, 'win32'), undefined);
  process.env['STUDIO_FLAGS'] = '-wsl-projects';
  assert.equal(wslProject(folder, 'win32'), undefined);
  process.env['STUDIO_FLAGS'] = 'wsl-projects';
  assert.deepEqual(wslProject(folder, 'win32'), project);
  for (const path of ['C:\\projects\\example', '\\\\server\\share\\example']) {
    assert.equal(wslProject(path, 'win32'), undefined);
  }
  assert.equal(wslProject(folder, 'darwin'), undefined);
  assert.equal(wslProject(folder, 'linux'), undefined);
});

test('both WSL prefixes share a project identity and a distro-local worktree', () => {
  process.env['STUDIO_FLAGS'] = 'wsl-projects';
  setCanonicalPathMapper((path) => wslProject(path, 'win32')?.hostPath);
  const alias = folder.replace('wsl$', 'wsl.localhost');
  assert.equal(canonicalPath(folder), canonicalPath(alias));
  assert.equal(workspaceHash(folder), workspaceHash(alias));
  assert.equal(wslWorktreePath(project, 'example-bucket', 'worktree'), '\\\\wsl.localhost\\ubuntu-24.04\\projects\\example\\.onlook-worktrees\\example-bucket\\worktree');
});

test('WSL launch keeps shell-sensitive arguments literal and transfers environment outside argv', () => {
  const args = ['run', 'dev', '--', 'spaces & $() "quotes"'];
  const command = wslLaunch(project, 'npm', args, 'ready:');
  assert.deepEqual(command.args, ['-d', project.distro, '--cd', project.linuxPath, '--exec', '/usr/bin/setsid', '--wait', '--', '/bin/sh', '-c', WSL_EXEC_SCRIPT, 'onlook-wsl', 'ready:', 'npm', ...args]);
  rememberWslEnvironment(project.distro, { PATH: '/usr/bin', HOME: '/projects/example', TMPDIR: '/tmp' });
  const secret = 'example-token & $()';
  const env = wslEnvironment(project, { PATH: 'C:\\tools', HOME: 'C:\\profiles\\example', EXAMPLE_TOKEN: secret, PROJECT_PATH: folder, OMITTED: 'value' }, ['OMITTED']);
  assert.equal(env['PATH'], '/usr/bin');
  assert.equal(env['HOME'], '/projects/example');
  assert.equal(env['TMPDIR'], '/tmp');
  assert.equal(env['EXAMPLE_TOKEN'], secret);
  assert.equal(env['PROJECT_PATH'], project.linuxPath);
  assert.equal(env['OMITTED'], undefined);
  assert.ok(env['WSLENV']?.split(':').includes('EXAMPLE_TOKEN/u'));
  assert.ok(!command.args.some((arg) => arg.includes(secret)));
});

test('WSL stop signals only a validated Linux process group', () => {
  assert.deepEqual(wslStop(project, 2345, 'SIGTERM').args, ['-d', project.distro, '--cd', '/', '--exec', '/bin/kill', '-s', 'TERM', '--', '-2345']);
  for (const group of [0, 1, -123, NaN, 2.5]) assert.throws(() => wslStop(project, group, 'SIGKILL'));
});

test('WSL Git bypasses host tool selection and maps the returned repository root', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(process, 'platform')!;
  try {
    Object.defineProperty(process, 'platform', { ...descriptor, value: 'win32' });
    process.env['STUDIO_FLAGS'] = 'wsl-projects';
    const result = await runGit(folder, ['rev-parse', '--show-toplevel'], { config: USER_GIT_CONFIG, timeoutMs: 3_000 }, {
      userEnv: async () => { throw new Error('Host environment must not select WSL Git'); },
      gitExecutable: async () => { throw new Error('Host Git must not be probed'); },
      runCli: async (bin, cwd, args) => {
        assert.equal(bin, 'git');
        assert.equal(cwd, folder);
        assert.deepEqual(args, ['rev-parse', '--show-toplevel']);
        return { ok: true, out: project.linuxPath, err: '', timedOut: false, missing: false, exitCode: 0 };
      },
    });
    assert.equal(result.out, project.hostPath);
  } finally {
    Object.defineProperty(process, 'platform', descriptor);
  }
});

test('missing distro tools identify the tools and distribution instead of falling back to host tools', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(process, 'platform')!;
  try {
    Object.defineProperty(process, 'platform', { ...descriptor, value: 'win32' });
    process.env['STUDIO_FLAGS'] = 'wsl-projects';
    await assert.rejects(checkWslTools(folder, ['git', 'node'], async (bin, cwd, args) => {
      assert.equal(cwd, folder);
      assert.deepEqual(args, ['--version']);
      return { ok: bin === 'node', out: '', err: '', timedOut: false, missing: bin !== 'node', exitCode: bin === 'node' ? 0 : 127 };
    }), (error: Error) => error.message.includes('git') && error.message.includes(project.distro) && !error.message.includes('git, node'));
  } finally {
    Object.defineProperty(process, 'platform', descriptor);
  }
});

test('flag-off child launches preserve the original executable, UNC cwd and environment', () => {
  const descriptor = Object.getOwnPropertyDescriptor(process, 'platform')!;
  try {
    Object.defineProperty(process, 'platform', { ...descriptor, value: 'win32' });
    process.env['STUDIO_FLAGS'] = '-wsl-projects';
    const options = { cwd: folder, env: { PATH: 'C:\\tools' } };
    let launches = 0;
    const launch = ((bin, args, passed) => {
      launches++;
      assert.equal(bin, 'git.exe');
      assert.deepEqual(args, ['status']);
      assert.deepEqual(passed, { ...options, shell: false });
      return new EventEmitter() as ChildProcess;
    }) as typeof spawn;
    startChild('git.exe', ['status'], options, launch);
    assert.equal(launches, 1);
  } finally {
    Object.defineProperty(process, 'platform', descriptor);
  }
});

test('native children retain literal arguments even if shell execution is requested', () => {
  const options = { cwd: 'C:\\projects\\example', env: {}, shell: true };
  const args = ['literal & echo unexpected', '$(unexpected)'];
  let launches = 0;
  const launch = ((bin, passedArgs, passed) => {
    launches++;
    assert.equal(bin, 'node.exe');
    assert.deepEqual(passedArgs, args);
    assert.equal(passed?.shell, false);
    return new EventEmitter() as ChildProcess;
  }) as typeof spawn;
  startChild('node.exe', args, options, launch);
  assert.equal(launches, 1);
});
