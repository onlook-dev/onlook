import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it, setDefaultTimeout } from 'bun:test';
import { captureShellEnv, refreshUserEnv, resetUserEnvForTests } from '../env/shell-env.js';
import { resetLogForTesting } from '../log/index.js';
import { planFor, runInstall } from './index.js';

const inherited = { ...process.env };
const made: string[] = [];

setDefaultTimeout(45_000);

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
  const directory = mkdtempSync(join(tmpdir(), 'studio-install-recovery-'));
  made.push(directory);
  resetLogForTesting();
  process.env['STUDIO_STATE_ROOT'] = directory;
  resetUserEnvForTests((options) => captureShellEnv({ ...options, timeoutMs: 15_000 }));
  return directory;
}

function executable(path: string, body: string): void {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o755);
}

describe('install recovery through the real process runner', () => {
  it('runs selected Bun from a trusted location with a Dock-like captured PATH', async () => {
    const directory = fixture();
    const home = join(directory, 'home');
    const bin = join(home, '.bun/bin/bun');
    const ran = join(directory, 'ran');
    executable(bin, `printf '%s\\n' "$1" "$(command -v bun)" "$GIT_TERMINAL_PROMPT" > '${ran}'`);
    const shell = join(directory, 'login-shell');
    executable(shell, `export HOME='${home}' PATH=/usr/bin:/bin BUN_INSTALL='${home}/absent'\nshift $(($# - 1)); eval "$1"`);
    process.env['SHELL'] = shell;
    const project = join(directory, 'project');
    mkdirSync(project);
    expect(await runInstall(planFor('bun'), project)).toEqual({ ok: true, err: '', timedOut: false });
    expect(readFileSync(ran, 'utf8').trim().split('\n')).toEqual(['install', bin, '0']);
  });

  it('rediscovers the selected manager from the refreshed shell PATH', async () => {
    const directory = fixture();
    const ran = join(directory, 'ran');
    const oldBin = join(directory, 'old bin');
    const newBin = join(directory, 'new bin');
    executable(join(oldBin, 'bun'), `echo old > '${ran}'`);
    executable(join(newBin, 'bun'), `echo new > '${ran}'`);
    const value = join(directory, 'path');
    writeFileSync(value, oldBin);
    const shell = join(directory, 'login-shell');
    executable(shell, `export PATH="$(/bin/cat '${value}'):/usr/bin:/bin"\nshift $(($# - 1)); eval "$1"`);
    process.env['SHELL'] = shell;
    const project = join(directory, 'project');
    mkdirSync(project);
    expect((await runInstall(planFor('bun'), project)).ok).toBe(true);
    expect(readFileSync(ran, 'utf8').trim()).toBe('old');
    writeFileSync(value, newBin);
    await refreshUserEnv();
    expect((await runInstall(planFor('bun'), project)).ok).toBe(true);
    expect(readFileSync(ran, 'utf8').trim()).toBe('new');
  });

  it('does not spawn after cancellation during an in-flight shell capture', async () => {
    const directory = fixture();
    const ran = join(directory, 'ran');
    process.env['SHELL'] = '/test/shell';
    const capture = Promise.withResolvers<Record<string, string>>();
    let captures = 0;
    resetUserEnvForTests(() => {
      captures += 1;
      return capture.promise;
    });
    const controller = new AbortController();
    const running = runInstall({ manager: 'bun', command: '/usr/bin/touch', args: [ran] }, directory, {
      signal: controller.signal,
    });
    expect(captures).toBe(1);
    controller.abort();
    capture.resolve({ PATH: '/usr/bin:/bin' });
    expect(await running).toMatchObject({ ok: false, aborted: true, timedOut: false });
    expect(existsSync(ran)).toBe(false);
  });
});
