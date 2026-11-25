import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { runCli, type RunCliOptions } from './cli.js';
import { pathExecutable } from './executable.js';
import { gitExecutable } from './git-available.js';
import { runGit, untrustedCloneGitConfig, USER_GIT_CONFIG, worktreeGitConfig } from './git.js';
import { resetUserEnvForTests, type Env } from './shell-env.js';
import { executableCommand } from './windows.js';

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

describe('runGit Apple tools gate', () => {
  it('does not let project launch options select the Git executable', async () => {
    const { dependencies, selections } = fixture('/custom/bin/git', undefined);
    await runGit('/project', ['status'], {
      config: USER_GIT_CONFIG, timeoutMs: 3_000,
      env: { PATH: '/project/bin', DEVELOPER_DIR: '/project/tools' },
      unset: ['PATH'],
    }, dependencies);
    expect(selections.map((selection) => selection.env)).toEqual([{ PATH: '/trusted/bin:/usr/bin', LANG: 'en_US.UTF-8' }]);
  });

  function fixture(executable: string, tools: string | undefined) {
    const launches: { executable: string; cwd: string; args: string[]; options: RunCliOptions }[] = [];
    const selections: { env: Env | undefined }[] = [];
    const result = { ok: true, out: 'selected Git', err: '', timedOut: false, missing: false, exitCode: 0 };
    const dependencies: NonNullable<Parameters<typeof runGit>[3]> = {
      userEnv: async () => ({ PATH: '/trusted/bin:/usr/bin', LANG: 'en_US.UTF-8' }),
      gitExecutable: async (env) => {
        selections.push({ env });
        return gitExecutable(env, {
          platform: 'darwin', resolve: (lookupEnv) => lookupEnv['PATH'] === '/tools/usr/bin' ? '/tools/usr/bin/git' : executable,
          realpath: (path) => path === '/trusted/bin/git' ? '/usr/bin/git' : path,
          selectedTools: async () => tools,
          exists: (path) => path === '/tools/usr/bin/git',
        });
      },
      runCli: async (selected, cwd, args, options) => {
        launches.push({ executable: selected, cwd, args, options });
        return result;
      },
    };
    return { dependencies, launches, selections, result };
  }

  it.each(['/usr/bin/git', '/bin/git', '/trusted/bin/git'])('never launches %s when developer tools are absent', async (executable) => {
    const { dependencies, launches } = fixture(executable, undefined);
    expect(await runGit('/project', ['status'], { config: USER_GIT_CONFIG, timeoutMs: 3_000 }, dependencies)).toEqual({
      ok: false, out: '', err: 'Git is unavailable without developer tools.', timedOut: false, missing: true, exitCode: null,
    });
    expect(launches).toEqual([]);
  });

  it.each(['/usr/bin/git', '/bin/git', '/trusted/bin/git'])('replaces %s with an absolute executable and preserves launch options', async (executable) => {
    const { dependencies, launches, selections, result } = fixture(executable, '/tools');
    const env = { PATH: '/override/bin:/usr/bin', GIT_PAGER: 'cat' };
    const signal = new AbortController().signal;
    const onStderr = () => {};
    const options = { timeoutMs: 5_000, env, stdin: 'input', signal, onStderr, unset: ['GIT_TRACE'], killGraceMs: 100, maxBuffer: 1_024 };
    expect(await runGit('/project', ['status', '--porcelain'], {
      ...options, config: ['core.fsmonitor=false', 'gc.auto=0'],
    }, dependencies)).toBe(result);
    expect(selections).toEqual([{ env: { PATH: '/trusted/bin:/usr/bin', LANG: 'en_US.UTF-8' } }]);
    expect(launches).toEqual([{
      executable: '/tools/usr/bin/git', cwd: '/project',
      args: ['-c', 'core.fsmonitor=false', '-c', 'gc.auto=0', 'status', '--porcelain'],
      options,
    }]);
  });

  it('keeps custom Git and the user configuration unchanged', async () => {
    const { dependencies, launches } = fixture('/custom/bin/git', undefined);
    await runGit('/project', ['--version'], { config: USER_GIT_CONFIG, timeoutMs: 3_000 }, dependencies);
    expect(launches).toEqual([{
      executable: '/custom/bin/git', cwd: '/project', args: ['--version'], options: { timeoutMs: 3_000 },
    }]);
  });

  it('does not apply project overrides or unset to executable discovery', async () => {
    const { dependencies, selections } = fixture('/usr/bin/git', undefined);
    dependencies.userEnv = async () => ({ PATH: '/usr/bin', DEVELOPER_DIR: '/inherited' });
    await runGit('/project', ['status'], {
      config: USER_GIT_CONFIG, timeoutMs: 3_000, env: { DEVELOPER_DIR: '/override' }, unset: ['DEVELOPER_DIR', 'PATH'],
    }, dependencies);
    expect(selections).toEqual([{ env: { PATH: '/usr/bin', DEVELOPER_DIR: '/inherited' } }]);
  });
});

describe('native Windows Git selection', () => {
  it.each(['cmd', 'bat'])('skips a git.%s shim and keeps native argv literal', async (extension) => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'studio-native-git-')));
    try {
      Object.defineProperty(process, 'platform', { ...realPlatform, value: 'win32' });
      const shim = join(root, 'shim');
      const native = join(root, 'native');
      mkdirSync(shim);
      mkdirSync(native);
      const batch = join(shim, `git.${extension}`);
      const executable = join(native, 'git.exe');
      for (const path of [batch, executable]) {
        writeFileSync(path, 'fixture');
        chmodSync(path, 0o755);
      }
      expect(await gitExecutable({ PATH: shim })).toBeUndefined();
      const selected = await gitExecutable({ PATH: [shim, native].join(delimiter) });
      expect(selected).toBe(executable);
      const args = ['status', '--', '100% draft.txt', 'literal & $(text)'];
      expect(executableCommand(selected!, args, 'win32')).toEqual({ bin: executable, args });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe.skipIf(process.platform === 'win32')('selected Git uses only the user toolchain without spawning a process', () => {
  it.each(['selected', 'renamed target', 'project PATH override', 'project developer tools override', 'nonexecutable', 'directory', 'missing', 'removed after selection', 'custom alias'])(
    '%s', async (scenario) => {
      const root = realpathSync(mkdtempSync(join(tmpdir(), 'studio-selected-git-')));
      const project = join(root, 'project');
      const tools = join(root, 'tools');
      const selected = join(tools, 'usr/bin/git');
      const host = join(root, 'host');
      const launches: { bin: string; args: string[]; env: unknown; shell: unknown }[] = [];
      try {
        mkdirSync(project);
        mkdirSync(dirname(selected), { recursive: true });
        mkdirSync(host);
        const executable = (path: string) => {
          writeFileSync(path, '#!/bin/sh\nexit 0\n');
          chmodSync(path, 0o755);
        };
        executable(join(host, 'git'));
        if (scenario === 'renamed target' || scenario === 'custom alias') {
          executable(join(root, 'renamed-git'));
          symlinkSync(join(root, 'renamed-git'), selected);
        } else if (scenario === 'directory') {
          mkdirSync(selected);
        } else if (scenario !== 'missing') {
          executable(selected);
          if (scenario === 'nonexecutable') chmodSync(selected, 0o644);
        }
        const env = { PATH: `${host}:/usr/bin:/bin`, GIT_PAGER: 'cat', DEVELOPER_DIR: tools };
        if (scenario === 'custom alias') env.PATH = `${dirname(selected)}:${env.PATH}`;
        resetUserEnvForTests(async () => env);
        const dependencies: NonNullable<Parameters<typeof runGit>[3]> = {
          userEnv: async () => env,
          gitExecutable: async (environment) => gitExecutable(environment, {
            platform: 'darwin',
            resolve: (lookup) => lookup['PATH'] === env.PATH && scenario !== 'custom alias' ? '/usr/bin/git' : pathExecutable('git', lookup),
            realpath: (path) => path === '/usr/bin/git' ? path : realpathSync(path),
            exists: existsSync,
            selectedTools: async () => {
              if (scenario === 'custom alias') throw new Error('custom Git must not probe tools');
              return tools;
            },
          }),
          runCli: async (bin, cwd, args, options) => {
            if (scenario === 'removed after selection') rmSync(selected);
            return runCli(bin, cwd, args, options, {
              spawn: (command, argv, childOptions) => {
                if (!existsSync(command)) throw Object.assign(new Error('missing'), { code: 'ENOENT' });
                launches.push({ bin: command, args: argv, env: childOptions.env, shell: childOptions.shell });
                throw new Error('spawn intercepted');
              },
              signalGroup: () => {},
            });
          },
        };
        const projectTools = join(project, 'tools/usr/bin');
        mkdirSync(projectTools, { recursive: true });
        executable(join(projectTools, 'git'));
        const override: Env = scenario === 'project PATH override' ? { PATH: projectTools }
          : scenario === 'project developer tools override' ? { DEVELOPER_DIR: join(project, 'tools') } : {};
        const args = ['status', '--', 'space ; $(not-a-command)', '"quoted"\n& literal'];
        const result = await runGit(project, args, {
          config: ['core.fsmonitor=false', 'gc.auto=0'], timeoutMs: 3_000, env: override,
        }, dependencies);
        if (['selected', 'renamed target', 'custom alias', 'project PATH override', 'project developer tools override'].includes(scenario)) {
          const childEnv = { ...env, ...override, ...(scenario === 'project PATH override' ? { PATH: '' } : {}) };
          expect(launches).toEqual([{
            bin: selected, args: ['-c', 'core.fsmonitor=false', '-c', 'gc.auto=0', ...args], env: expect.objectContaining(childEnv), shell: false,
          }]);
        } else {
          expect(result.missing).toBe(true);
          expect(launches).toEqual([]);
        }
      } finally {
        resetUserEnvForTests();
        rmSync(root, { recursive: true, force: true });
      }
    },
  );
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

  it('uses the same user Git from different projects despite project tool overrides', async () => {
    const other = join(root, 'other');
    const localBin = join(project, 'bin');
    const marker = join(root, 'unexpected');
    mkdirSync(other);
    mkdirSync(localBin);
    writeFileSync(join(localBin, 'git'), `#!/bin/sh\nprintf bad > '${marker}'\n`);
    chmodSync(join(localBin, 'git'), 0o755);
    const args = ['status', '--', `literal ; $(touch '${marker}')`];
    for (const cwd of [project, other]) {
      const result = await runGit(cwd, args, {
        config: USER_GIT_CONFIG, timeoutMs: 5_000,
        env: { PATH: localBin, DEVELOPER_DIR: localBin, GIT_PAGER: 'trusted' }, unset: ['PATH'],
      });
      expect(result).toMatchObject({ ok: true, out: 'trusted' });
      expect(readFileSync(record, 'utf8').trim().split('\n')).toEqual(args);
      expect(existsSync(marker)).toBe(false);
    }
  });
});
