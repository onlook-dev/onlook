import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { manualClock, until } from '@studio/fixtures';
import { peekLinesForTesting, recordLinesForTesting, resetLogForTesting } from '../log/index.js';
import { captureShellEnv, refreshUserEnv, resetUserEnvForTests, userEnv, userEnvSync } from './shell-env.js';

const inherited = { ...process.env };
const made: string[] = [];

afterAll(() => {
  for (const directory of made) rmSync(directory, { recursive: true, force: true });
});

afterEach(() => {
  for (const key of ['SHELL', 'STUDIO_STATE_ROOT']) {
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
