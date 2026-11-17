import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runGit, untrustedCloneGitConfig, USER_GIT_CONFIG, worktreeGitConfig } from './git.js';
import { resetUserEnvForTests } from './shell-env.js';

const realPlatform = Object.getOwnPropertyDescriptor(process, 'platform')!;

afterEach(() => {
  Object.defineProperty(process, 'platform', realPlatform);
});

describe('the hardening settings', () => {
  it('a worktree gets exactly these, in this order', () => {
    Object.defineProperty(process, 'platform', { ...realPlatform, value: 'darwin' });
    expect(worktreeGitConfig()).toEqual([
      'core.hooksPath=/dev/null',
      'core.fsmonitor=false',
      'core.sshCommand="/usr/bin/ssh"',
      'credential.helper=',
      'core.gitProxy=',
      'protocol.ext.allow=never',
      'maintenance.auto=false',
      'gc.auto=0',
    ]);
  });

  it('Windows keeps its null device, its own ssh and long paths', () => {
    Object.defineProperty(process, 'platform', { ...realPlatform, value: 'win32' });
    const config = worktreeGitConfig();
    expect(config[0]).toBe('core.hooksPath=NUL');
    expect(config[2]).toMatch(/^core\.sshCommand=".*\/System32\/OpenSSH\/ssh\.exe"$/);
    expect(config[2]).not.toContain('\\');
    expect(config.at(-1)).toBe('core.longpaths=true');
    expect(config).toHaveLength(9);
  });

  it('an untrusted clone gets exactly these, in this order, and none of the worktree-only ones', () => {
    Object.defineProperty(process, 'platform', { ...realPlatform, value: 'darwin' });
    const config = untrustedCloneGitConfig("!'/node' '/helper.cjs'");
    expect(config).toEqual([
      'core.hooksPath=/dev/null',
      'core.fsmonitor=false',
      'credential.helper=',
      "credential.helper=!'/node' '/helper.cjs'",
      'credential.useHttpPath=true',
      'http.followRedirects=false',
      'protocol.allow=never',
      'protocol.https.allow=always',
      'init.templateDir=',
      'maintenance.auto=false',
      'gc.auto=0',
    ]);
    Object.defineProperty(process, 'platform', { ...realPlatform, value: 'win32' });
    expect(untrustedCloneGitConfig('!x')).toEqual(['core.hooksPath=NUL', ...config.slice(1, 3), 'credential.helper=!x', ...config.slice(4)]);
  });

  it('each call builds its own list, so one call adding to it reaches no other', () => {
    worktreeGitConfig().push('filter.lfs.clean=');
    expect(worktreeGitConfig()).not.toContain('filter.lfs.clean=');
    expect(USER_GIT_CONFIG).toEqual([]);
  });
});

describe.skipIf(process.platform === 'win32')('runGit', () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'studio-run-git-')));
  const record = join(root, 'argv');
  const bin = join(root, 'bin');
  const project = join(root, 'project');

  beforeAll(() => {
    mkdirSync(bin);
    mkdirSync(project);
    writeFileSync(join(bin, 'git'), `#!/bin/sh\nfor a in "$@"; do printf '%s\\n' "$a"; done > '${record}'\nprintf '%s' "$GIT_PAGER"\n`);
    chmodSync(join(bin, 'git'), 0o755);
    resetUserEnvForTests(async () => ({ PATH: `${bin}:/usr/bin:/bin` }));
  });
  afterAll(() => {
    resetUserEnvForTests();
    rmSync(root, { recursive: true, force: true });
  });

  it('puts each setting behind its own -c, ahead of the command, and passes the rest to the runner', async () => {
    const result = await runGit(project, ['status', '--porcelain'], { config: ['core.fsmonitor=false', 'gc.auto=0'], timeoutMs: 5_000, env: { GIT_PAGER: 'cat' } });
    expect(result).toMatchObject({ ok: true, out: 'cat' });
    expect(readFileSync(record, 'utf8').trim().split('\n')).toEqual(['-c', 'core.fsmonitor=false', '-c', 'gc.auto=0', 'status', '--porcelain']);
  });

  it('adds nothing when the call names the user configuration', async () => {
    await runGit(project, ['--version'], { config: USER_GIT_CONFIG, timeoutMs: 5_000 });
    expect(readFileSync(record, 'utf8').trim().split('\n')).toEqual(['--version']);
  });
});
