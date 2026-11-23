import { chmodSync, existsSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { manualClock, until } from '@studio/fixtures';
import { peekLinesForTesting, recordLinesForTesting, resetLogForTesting } from '../log/index.js';
import { captureShellEnv, isShellEnvFallback, refreshUserEnv, resetUserEnvForTests, userEnv, userEnvSync } from './shell-env.js';
import { runCli } from './cli.js';
import { ghReader } from '../git-status/github/gh-reader.js';
import { isMac } from './platform.js';

const inherited = { ...process.env };
const made: string[] = [];

afterAll(() => {
  for (const directory of made) rmSync(directory, { recursive: true, force: true });
});

afterEach(() => {
  for (const key of ['SHELL', 'PATH', 'STUDIO_STATE_ROOT']) {
    if (inherited[key] === undefined) delete process.env[key];
    else process.env[key] = inherited[key];
  }
  resetUserEnvForTests();
  resetLogForTesting();
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
  it('retries a failed capture after a cooldown without restarting', async () => {
    fixture();
    process.env['SHELL'] = '/test/shell';
    let now = 0;
    let captures = 0;
    resetUserEnvForTests(async () => {
      captures += 1;
      return captures === 1 ? undefined : { RECOVERY_VALUE: 'recovered' };
    }, () => now);
    await userEnv();
    now = 29_999;
    await userEnv();
    expect(captures).toBe(1);
    now = 30_000;
    const [first, second] = await Promise.all([userEnv(), userEnv()]);
    expect(first['RECOVERY_VALUE']).toBe('recovered');
    expect(second).toBe(first);
    expect(captures).toBe(2);
    now = 90_000;
    expect(await userEnv()).toBe(first);
    expect(captures).toBe(2);
  });

  it('keeps Homebrew discoverable when login-shell capture fails', async () => {
    fixture();
    process.env['SHELL'] = '/test/shell';
    process.env['PATH'] = '/usr/bin:/bin';
    resetUserEnvForTests(async () => undefined);
    expect((await userEnv())['PATH']).toBe(isMac() ? '/usr/bin:/bin:/opt/homebrew/bin:/usr/local/bin' : '/usr/bin:/bin');
  });

  it('preserves inherited path order and does not change a captured path', async () => {
    fixture();
    process.env['SHELL'] = '/test/shell';
    process.env['PATH'] = '/usr/local/bin:/usr/bin:/opt/homebrew/bin';
    resetUserEnvForTests(async () => undefined);
    expect((await userEnv())['PATH']).toBe(process.env['PATH']);
    resetUserEnvForTests(async () => ({ PATH: '/custom/bin:/usr/bin' }));
    expect((await userEnv())['PATH']).toBe('/custom/bin:/usr/bin');
  });

  it('bounds repeated failed captures to one attempt per cooldown', async () => {
    fixture();
    process.env['SHELL'] = '/test/shell';
    let now = 0;
    let captures = 0;
    resetUserEnvForTests(async () => {
      captures += 1;
      return undefined;
    }, () => now);
    await userEnv();
    now = 30_000;
    await Promise.all([userEnv(), userEnv()]);
    now = 59_999;
    await userEnv();
    expect(captures).toBe(2);
    now = 60_000;
    await userEnv();
    expect(captures).toBe(3);
  });

  it('recovers GitHub CLI sign-in after a failed launch capture', async () => {
    const tools = fixture();
    const project = fixture();
    process.env['SHELL'] = '/test/shell';
    process.env['PATH'] = '/usr/bin:/bin';
    const executable = join(tools, 'studio-test-gh');
    writeFileSync(executable, '#!/bin/sh\ncase "$1" in --version) echo "gh version 2.81.0";; auth) echo \'{"hosts":{"github.com":[{"login":"example-designer","state":"success","active":true}]}}\';; esac\n');
    chmodSync(executable, 0o755);
    let now = 0;
    let captures = 0;
    resetUserEnvForTests(async () => {
      captures += 1;
      return captures === 1 ? undefined : { PATH: `${tools}:/usr/bin:/bin` };
    }, () => now);
    const reader = ghReader(project, (cwd, args) => runCli('studio-test-gh', cwd, args, { timeoutMs: 1_000 }));
    expect(await reader.present()).toEqual({ ok: false, partial: true });
    now = 30_000;
    expect(await reader.present()).toEqual({ ok: true, value: true });
    expect(await reader.identity()).toEqual({ ok: true, value: { account: 'example-designer' } });
    expect(captures).toBe(2);
  });

  it('does not report GitHub CLI missing while the shell environment is unknown', async () => {
    const directory = fixture();
    process.env['SHELL'] = '/test/shell';
    resetUserEnvForTests(async () => undefined);
    const reader = ghReader(directory, (cwd, args) => runCli('studio-test-absent-gh', cwd, args, { timeoutMs: 1_000 }));
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
      expect((await userEnv())['RECOVERY_VALUE']).toBe('current');
      expect(captures).toBe(oldFails ? 2 : 3);
    });
  }

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
    expect(result).toMatchObject({ ok: false, missing: false });
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
