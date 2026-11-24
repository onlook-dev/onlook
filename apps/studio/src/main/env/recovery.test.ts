import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { manualClock, until } from '@studio/fixtures';
import { peekLinesForTesting, recordLinesForTesting, resetLogForTesting } from '../log/index.js';
import { captureShellEnv, githubCliEnv, isShellEnvFallback, refreshUserEnv, resetUserEnvForTests, userEnv, userEnvSync } from './shell-env.js';
import { runCli } from './cli.js';
import { ghReader } from '../git-status/github/gh-reader.js';
import { gh } from '../git-status/gh.js';
import { autoInstall } from '../install/index.js';
import { activeLocale, setLocale, t } from '@studio/i18n';
import { isMac } from './platform.js';

const inherited = { ...process.env };
const made: string[] = [];
const inheritedLocale = activeLocale();

afterAll(() => {
  for (const directory of made) rmSync(directory, { recursive: true, force: true });
});

afterEach(() => {
  for (const key of ['SHELL', 'PATH', 'STUDIO_STATE_ROOT', 'STUDIO_GH_BIN']) {
    if (inherited[key] === undefined) delete process.env[key];
    else process.env[key] = inherited[key];
  }
  resetUserEnvForTests();
  resetLogForTesting();
  setLocale(inheritedLocale);
});

function fixture(): string {
  const directory = mkdtempSync(join(tmpdir(), 'studio-env-recovery-'));
  made.push(directory);
  resetLogForTesting();
  process.env['STUDIO_STATE_ROOT'] = directory;
  recordLinesForTesting();
  return directory;
}

function shell(directory: string, name: string, preamble: string): string {
  const path = join(directory, name);
  writeFileSync(path, `#!/bin/sh\n${preamble}\nshift $(($# - 1)); eval "$1"\n`);
  chmodSync(path, 0o755);
  return path;
}

describe('shell environment recovery', () => {
  it('keeps the shared environment and other tools unchanged after capture failure', async () => {
    const directory = fixture();
    process.env['SHELL'] = '/test/shell';
    process.env['PATH'] = '/usr/bin:/bin';
    resetUserEnvForTests(async () => undefined);
    const env = await userEnv();
    expect(env['PATH']).toBe('/usr/bin:/bin');
    expect(userEnvSync()).toBe(env);
    const result = await runCli('studio-test-unavailable', directory, [], { timeoutMs: 1_000 });
    expect(result).toMatchObject({ ok: false, missing: true });
    writeFileSync(join(directory, 'package.json'), '{"packageManager":"bun@1.4.2"}');
    for (const locale of ['en', 'ja', 'zh-CN'] as const) {
      setLocale(locale);
      expect(await autoInstall(directory, async () => result)).toEqual({
        outcome: 'failed', manager: 'bun', detail: t('project.install.managerMissing', { manager: 'bun' }),
      });
    }
  });

  it('never waits on a nonresponding shell after the initial capture', async () => {
    const directory = fixture();
    const ready = join(directory, 'ready');
    const clock = manualClock();
    let now = 0;
    process.env['SHELL'] = shell(directory, 'wedged-shell', `echo ready >> '${ready}'; exec /bin/sleep 120`);
    process.env['STUDIO_GH_BIN'] = 'studio-test-absent-gh';
    resetUserEnvForTests(options => captureShellEnv({ ...options, clock }), () => now);
    const expireCapture = async (previousRungs: number) => {
      for (const rung of [1, 2]) {
        await until(async () => existsSync(ready) ? readFileSync(ready, 'utf8').trim().split('\n').length : 0,
          count => count === previousRungs + rung, { what: 'the wedged shell rung', limitMs: 30_000, everyMs: 10 });
        clock.advanceBy(5_000);
      }
    };
    const initial = userEnv();
    await expireCapture(0);
    const shared = await initial;
    const fallback = await githubCliEnv();
    now = 30_000;
    let completed = false;
    const requests = Promise.all([
      githubCliEnv(), githubCliEnv(), userEnv(), gh(directory, ['--version']),
      runCli('studio-test-unavailable', directory, [], { timeoutMs: 1_000 }),
    ]).then(results => { completed = true; return results; });
    try {
      await until(async () => existsSync(ready) && readFileSync(ready, 'utf8').trim().split('\n').length === 3,
        Boolean, { what: 'the background shell retry', limitMs: 30_000, everyMs: 10 });
      expect(completed).toBe(true);
      expect(clock.pending).toBe(1);
      expect(userEnvSync()).toBe(shared);
      const [first, second, current, github, other] = await requests;
      expect(first).toBe(fallback);
      expect(second).toBe(fallback);
      expect(current).toBe(shared);
      expect(github).toMatchObject({ ok: false, missing: false });
      expect(other).toMatchObject({ ok: false, missing: true });
      now = 90_000;
      expect(await githubCliEnv()).toBe(fallback);
      expect(readFileSync(ready, 'utf8').trim().split('\n')).toHaveLength(3);
    } finally {
      await expireCapture(2);
      await requests;
    }
  }, 45_000);

  it('retries a failed capture after a cooldown without restarting', async () => {
    fixture();
    process.env['SHELL'] = '/test/shell';
    let now = 0;
    let captures = 0;
    resetUserEnvForTests(async () => {
      captures += 1;
      return captures === 1 ? undefined : { RECOVERY_VALUE: 'recovered' };
    }, () => now);
    const shared = await userEnv();
    const fallback = await githubCliEnv();
    now = 29_999;
    await githubCliEnv();
    expect(captures).toBe(1);
    now = 30_000;
    await githubCliEnv();
    const [first, second] = await Promise.all([githubCliEnv(), githubCliEnv()]);
    expect(first['RECOVERY_VALUE']).toBe('recovered');
    expect(second).toBe(first);
    expect(captures).toBe(2);
    now = 90_000;
    expect(await githubCliEnv()).toBe(first);
    expect(await userEnv()).toBe(shared);
    expect(userEnvSync()).toBe(shared);
    expect(isShellEnvFallback(fallback)).toBe(true);
    expect(captures).toBe(2);
  });

  it('keeps Homebrew discoverable when login-shell capture fails', async () => {
    fixture();
    process.env['SHELL'] = '/test/shell';
    process.env['PATH'] = '/usr/bin:/bin';
    resetUserEnvForTests(async () => undefined);
    expect((await githubCliEnv())['PATH']).toBe(isMac() ? '/usr/bin:/bin:/opt/homebrew/bin:/usr/local/bin' : '/usr/bin:/bin');
    expect((await userEnv())['PATH']).toBe('/usr/bin:/bin');
  });

  it('preserves inherited path order and does not change a captured path', async () => {
    fixture();
    process.env['SHELL'] = '/test/shell';
    process.env['PATH'] = '/usr/local/bin:/usr/bin:/opt/homebrew/bin';
    resetUserEnvForTests(async () => undefined);
    expect((await githubCliEnv())['PATH']).toBe(process.env['PATH']);
    resetUserEnvForTests(async () => ({ PATH: '/custom/bin:/usr/bin' }));
    expect(await githubCliEnv()).toBe(await userEnv());
    expect((await githubCliEnv())['PATH']).toBe('/custom/bin:/usr/bin');
  });

  it('backs off failed captures and stops after five background retries', async () => {
    fixture();
    process.env['SHELL'] = '/test/shell';
    let now = 0;
    let captures = 0;
    resetUserEnvForTests(async () => {
      captures += 1;
      return undefined;
    }, () => now);
    const fallback = await githubCliEnv();
    for (const [index, interval] of [30_000, 60_000, 120_000, 240_000, 300_000].entries()) {
      now += interval - 1;
      expect(await githubCliEnv()).toBe(fallback);
      expect(captures).toBe(index + 1);
      now += 1;
      expect(await githubCliEnv()).toBe(fallback);
      expect(captures).toBe(index + 2);
      await new Promise<void>(resolve => setImmediate(resolve));
    }
    now += 86_400_000;
    expect(await githubCliEnv()).toBe(fallback);
    expect(captures).toBe(6);
  });

  it('recovers GitHub CLI sign-in after a failed launch capture', async () => {
    const tools = fixture();
    const project = fixture();
    process.env['SHELL'] = '/test/shell';
    process.env['PATH'] = '/usr/bin:/bin';
    const executable = join(tools, 'studio-test-gh');
    writeFileSync(executable, '#!/bin/sh\ncase "$1" in --version) echo "gh version 2.81.0";; auth) echo \'{"hosts":{"github.com":[{"login":"example-designer","state":"success","active":true}]}}\';; esac\n');
    chmodSync(executable, 0o755);
    process.env['STUDIO_GH_BIN'] = 'studio-test-gh';
    let now = 0;
    let captures = 0;
    resetUserEnvForTests(async () => {
      captures += 1;
      return captures === 1 ? undefined : { PATH: `${tools}:/usr/bin:/bin` };
    }, () => now);
    const reader = ghReader(project);
    expect(await reader.present()).toEqual({ ok: false, partial: true });
    now = 30_000;
    await reader.present();
    expect(await reader.present()).toEqual({ ok: true, value: true });
    expect(await reader.identity()).toEqual({ ok: true, value: { account: 'example-designer' } });
    expect(captures).toBe(2);
  });

  it('does not report GitHub CLI missing while the shell environment is unknown', async () => {
    const directory = fixture();
    process.env['SHELL'] = '/test/shell';
    process.env['STUDIO_GH_BIN'] = 'studio-test-absent-gh';
    resetUserEnvForTests(async () => undefined);
    const reader = ghReader(directory);
    expect(await reader.present()).toEqual({ ok: false, partial: true });
    resetUserEnvForTests(async () => ({ PATH: '/usr/bin:/bin' }));
    expect(await reader.present()).toEqual({ ok: false, partial: false });
  });

  for (const oldFails of [true, false]) {
    it(`keeps fallback identity and retry state when an obsolete capture ${oldFails ? 'fails' : 'succeeds'}`, async () => {
      fixture();
      process.env['SHELL'] = '/test/shell';
      const capture = Promise.withResolvers<Record<string, string> | undefined>();
      let now = 0;
      let captures = 0;
      resetUserEnvForTests(() => {
        captures += 1;
        if (captures === 1) return capture.promise;
        return Promise.resolve(captures === 2 && !oldFails ? undefined : { RECOVERY_VALUE: 'current' });
      }, () => now);
      const old = userEnv();
      const current = await refreshUserEnv();
      capture.resolve(oldFails ? undefined : { RECOVERY_VALUE: 'obsolete' });
      const obsolete = await old;
      expect(isShellEnvFallback(obsolete)).toBe(oldFails);
      expect(isShellEnvFallback(current)).toBe(!oldFails);
      expect(userEnvSync()).toBe(current);
      now = 30_000;
      await githubCliEnv();
      expect((await githubCliEnv())['RECOVERY_VALUE']).toBe('current');
      expect(captures).toBe(oldFails ? 2 : 3);
    });
  }

  it('does not let a background GitHub retry overwrite a healthy refresh', async () => {
    fixture();
    process.env['SHELL'] = '/test/shell';
    const oldRetry = Promise.withResolvers<Record<string, string> | undefined>();
    let now = 0;
    let captures = 0;
    resetUserEnvForTests(async () => {
      captures += 1;
      if (captures === 1) return undefined;
      if (captures === 2) return oldRetry.promise;
      return { RECOVERY_VALUE: 'current' };
    }, () => now);
    const fallback = await githubCliEnv();
    now = 30_000;
    expect(await githubCliEnv()).toBe(fallback);
    expect(captures).toBe(2);
    const current = await refreshUserEnv();
    oldRetry.resolve({ RECOVERY_VALUE: 'obsolete' });
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(await githubCliEnv()).toBe(current);
    expect(await userEnv()).toBe(current);
    expect(userEnvSync()).toBe(current);
    expect(current['RECOVERY_VALUE']).toBe('current');
    expect(captures).toBe(3);
  });

  it('isolates background GitHub retries across a failed refresh', async () => {
    fixture();
    process.env['SHELL'] = '/test/shell';
    const oldRetry = Promise.withResolvers<Record<string, string> | undefined>();
    const newRetry = Promise.withResolvers<Record<string, string> | undefined>();
    let now = 0;
    let captures = 0;
    resetUserEnvForTests(async () => {
      captures += 1;
      if (captures === 1 || captures === 3) return undefined;
      return captures === 2 ? oldRetry.promise : newRetry.promise;
    }, () => now);
    await githubCliEnv();
    now = 30_000;
    await githubCliEnv();
    expect(captures).toBe(2);
    const current = await refreshUserEnv();
    const fallback = await githubCliEnv();
    now = 60_000;
    expect(await githubCliEnv()).toBe(fallback);
    expect(captures).toBe(4);
    oldRetry.resolve({ RECOVERY_VALUE: 'obsolete' });
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(await githubCliEnv()).toBe(fallback);
    expect(isShellEnvFallback(fallback)).toBe(true);
    newRetry.resolve({ RECOVERY_VALUE: 'current' });
    await new Promise<void>(resolve => setImmediate(resolve));
    expect((await githubCliEnv())['RECOVERY_VALUE']).toBe('current');
    expect(await userEnv()).toBe(current);
    expect(userEnvSync()).toBe(current);
    expect(captures).toBe(4);
  });

  it('backs off rejected background captures and stops after five retries', async () => {
    fixture();
    process.env['SHELL'] = '/test/shell';
    let now = 0;
    let captures = 0;
    resetUserEnvForTests(async () => {
      captures += 1;
      if (captures === 1) return undefined;
      throw new Error('capture failed');
    }, () => now);
    const fallback = await githubCliEnv();
    for (const [index, interval] of [30_000, 60_000, 120_000, 240_000, 300_000].entries()) {
      now += interval - 1;
      expect(await githubCliEnv()).toBe(fallback);
      expect(captures).toBe(index + 1);
      now += 1;
      expect(await githubCliEnv()).toBe(fallback);
      await new Promise<void>(resolve => setImmediate(resolve));
      expect(captures).toBe(index + 2);
    }
    now += 86_400_000;
    expect(await githubCliEnv()).toBe(fallback);
    expect(captures).toBe(6);
  });

  it('rejects project executables even when the shell environment is incomplete', async () => {
    const project = fixture();
    const tools = fixture();
    process.env['SHELL'] = '/test/shell';
    resetUserEnvForTests(async () => undefined);
    const executable = join(project, 'studio-test-untrusted');
    writeFileSync(executable, '#!/bin/sh\nprintf untrusted\n');
    chmodSync(executable, 0o755);
    symlinkSync(executable, join(tools, 'studio-test-untrusted'));
    let spawned = false;
    const result = await runCli('studio-test-untrusted', project, [], {
      timeoutMs: 1_000, env: { PATH: `.:${project}:${tools}` },
    }, {
      spawn: () => { spawned = true; throw new Error('Untrusted program must not spawn'); },
      signalGroup: () => {},
    });
    expect(result).toMatchObject({ ok: false, missing: true });
    expect(spawned).toBe(false);
  });

  it('reports degraded login-only capture after a slow interactive shell', async () => {
    const directory = fixture();
    const ready = join(directory, 'ready');
    const clock = manualClock();
    const executable = shell(directory, 'slow-shell', `case "$1" in -i) echo ready > '${ready}'; exec /bin/sleep 120;; esac\nexport CAPTURE_MODE=login`);
    const capture = captureShellEnv({ shell: executable, timeoutMs: 1_000, clock });
    await until(async () => existsSync(ready), Boolean, { what: 'the interactive shell to be ready', limitMs: 30_000, everyMs: 10 });
    clock.advanceBy(1_000);
    expect((await capture)?.['CAPTURE_MODE']).toBe('login');
    expect(clock.pending).toBe(0);
    expect(peekLinesForTesting()).toContainEqual(expect.objectContaining({
      subsystem: 'env', level: 'warn', captureMode: 'login-only',
    }));
    const line = peekLinesForTesting().find((entry) => entry['captureMode'] === 'login-only');
    expect(line?.['PATH']).toBeUndefined();
  }, 45_000);

  it('refreshes the memoized environment after shell setup changes', async () => {
    process.env['SHELL'] = '/test/shell';
    let value = 'before';
    let captures = 0;
    resetUserEnvForTests(async () => {
      captures += 1;
      return { RECOVERY_VALUE: value };
    });
    expect((await userEnv())['RECOVERY_VALUE']).toBe('before');
    value = 'after';
    expect((await userEnv())['RECOVERY_VALUE']).toBe('before');
    expect((await refreshUserEnv())['RECOVERY_VALUE']).toBe('after');
    expect(userEnvSync()?.['RECOVERY_VALUE']).toBe('after');
    expect(captures).toBe(2);
  });

  it('does not publish an older capture that finishes after refresh', async () => {
    process.env['SHELL'] = '/test/shell';
    const capture = Promise.withResolvers<Record<string, string>>();
    let captures = 0;
    resetUserEnvForTests(() => {
      captures += 1;
      return captures === 1 ? capture.promise : Promise.resolve({ RECOVERY_VALUE: 'new' });
    });
    const old = userEnv();
    expect(captures).toBe(1);
    expect((await refreshUserEnv())['RECOVERY_VALUE']).toBe('new');
    capture.resolve({ RECOVERY_VALUE: 'old' });
    expect((await old)['RECOVERY_VALUE']).toBe('old');
    expect(userEnvSync()?.['RECOVERY_VALUE']).toBe('new');
    expect((await userEnv())['RECOVERY_VALUE']).toBe('new');
    expect(captures).toBe(2);
  });

  it('keeps the last settled environment available while refresh is pending', async () => {
    process.env['SHELL'] = '/test/shell';
    const capture = Promise.withResolvers<Record<string, string>>();
    let captures = 0;
    resetUserEnvForTests(() => {
      captures += 1;
      return captures === 1 ? Promise.resolve({ RECOVERY_VALUE: 'initial' }) : capture.promise;
    });
    expect((await userEnv())['RECOVERY_VALUE']).toBe('initial');
    const refreshing = refreshUserEnv();
    expect(captures).toBe(2);
    expect(userEnvSync()?.['RECOVERY_VALUE']).toBe('initial');
    capture.resolve({ RECOVERY_VALUE: 'refreshed' });
    expect((await refreshing)['RECOVERY_VALUE']).toBe('refreshed');
    expect(userEnvSync()?.['RECOVERY_VALUE']).toBe('refreshed');
  });
});
