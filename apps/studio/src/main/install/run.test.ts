import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test';
import {
  alive,
  cleanupTempFixtures,
  makeDirWithFiles,
  makeStateRoot,
  manualClock,
  until,
} from '@studio/fixtures';

import type { InstallPlan, RunResult } from './index.js';
import { mergeEnv, resetUserEnvForTests } from '../env/shell-env.js';

setDefaultTimeout(45_000);

beforeAll(() => {
  resetUserEnvForTests(async () => mergeEnv(process.env));
});

const { autoInstall, runInstall } = await import('./index.js');
const { installLogPath } = await import('./log.js');

const savedStateRoot = process.env['STUDIO_STATE_ROOT'];

afterAll(() => {
  resetUserEnvForTests();
  if (savedStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = savedStateRoot;
  cleanupTempFixtures();
});

function useOwnLogRoot(name: string): string {
  const root = makeStateRoot({ name });
  process.env['STUDIO_STATE_ROOT'] = root;
  expect(existsSync(installLogPath())).toBe(false);
  return root;
}

function readLog(): string {
  return readFileSync(installLogPath(), 'utf8');
}

function planRunning(command: string, args: string[]): InstallPlan {
  return { manager: 'npm', command, args };
}

describe('runInstall — every outcome resolves', () => {
  it('reports success when the command exits zero', async () => {
    const result = await runInstall(planRunning('/bin/sh', ['-c', 'exit 0']), makeDirWithFiles());
    expect(result).toEqual({ ok: true, err: '', timedOut: false });
  });

  it('reports failure, without throwing, when the command exits non-zero', async () => {
    const result = await runInstall(
      planRunning('/bin/sh', ['-c', 'echo "no lockfile" >&2; exit 1']),
      makeDirWithFiles(),
    );
    expect(result.ok).toBe(false);
    expect(result.timedOut).toBe(false);
    expect(result.err).toContain('no lockfile');
  });

  it('reports failure, without throwing, when the command is not on PATH', async () => {
    const result = await runInstall(
      planRunning('definitely-not-a-package-manager', ['install']),
      makeDirWithFiles(),
    );
    expect(result.ok).toBe(false);
  });

  it('an abort kills a child that ignores SIGTERM, and answers only once it is gone', async () => {
    const dir = makeDirWithFiles();
    const armed = join(dir, 'armed');
    const controller = new AbortController();
    const child = `process.on('SIGTERM', () => {}); require('node:fs').writeFileSync(${JSON.stringify(`${armed}.tmp`)}, String(process.pid)); require('node:fs').renameSync(${JSON.stringify(`${armed}.tmp`)}, ${JSON.stringify(armed)}); setInterval(() => {}, 120_000)`;
    const graceMs = 300;
    const clock = manualClock();

    // One process, no grandchildren: a shell's orphaned sleep would hold the stdio pipe open past the SIGKILL.
    const running = runInstall(planRunning('node', ['-e', child]), dir, { signal: controller.signal, abortGraceMs: graceMs, clock });
    let answered = false;
    void running.then(() => {
      answered = true;
    });
    await until(async () => existsSync(armed), Boolean, { what: 'the SIGTERM handler to be armed', limitMs: 30_000, everyMs: 10 });
    const pid = Number(readFileSync(armed, 'utf8'));

    controller.abort();
    clock.advanceBy(graceMs - 1);
    expect(alive(pid)).toBe(true);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(answered).toBe(false);
    clock.advanceBy(1);
    const result = await running;

    expect(result).toMatchObject({ ok: false, timedOut: false, aborted: true });
    expect(alive(pid)).toBe(false);
    expect(clock.pending).toBe(0);
  });

  it('stops git waiting on a credential prompt, so a private git dependency fails instead of sitting until the timeout', async () => {
    const result = await runInstall(planRunning('/bin/sh', ['-c', 'test "$GIT_TERMINAL_PROMPT" = 0']), makeDirWithFiles());
    expect(result.ok).toBe(true);
  });

  it('runs in the directory it was given', async () => {
    const dir = makeDirWithFiles({ name: 'run-cwd', files: { 'marker.txt': 'here' } });
    const result = await runInstall(planRunning('/bin/sh', ['-c', 'test -f marker.txt']), dir);
    expect(result.ok).toBe(true);
  });

  it('does not spawn an install when canceled before discovery', async () => {
    const controller = new AbortController();
    controller.abort();
    const directory = makeDirWithFiles();
    const result = await runInstall(planRunning('/bin/sh', ['-c', 'exit 0']), directory, {
      signal: controller.signal,
    });
    expect(result).toMatchObject({ ok: false, aborted: true, timedOut: false });
  });
});

describe('autoInstall — detection failure spawns nothing', () => {
  it('skips a directory with no package.json, and never calls the runner', async () => {
    const dir = makeDirWithFiles({ name: 'auto-none', files: { 'bun.lock': '' } });
    let called = false;

    const outcome = await autoInstall(dir, async () => {
      called = true;
      return { ok: true, err: '', timedOut: false };
    });

    expect(outcome).toEqual({ outcome: 'skipped' });
    expect(called).toBe(false);
  });
});

describe('autoInstall — a failed install is still a resolved promise', () => {
  it('reports actionable localized recovery for a missing selected manager', async () => {
    const dir = makeDirWithFiles({ files: { 'package.json': '{"packageManager":"bun@1.3.7"}' } });
    const outcome = await autoInstall(dir, async () => ({
      ok: false, err: 'spawn bun ENOENT', timedOut: false, missing: true,
    }));
    expect(outcome).toEqual({
      outcome: 'failed', manager: 'bun',
      detail: 'Onlook couldn’t find bun. Install it or make it available in your shell, then click Retry. You can keep working in chat.',
    });
  });
  it('returns rather than rejecting when the install fails', async () => {
    const dir = makeDirWithFiles({
      name: 'auto-failed',
      files: { 'package.json': '{}', 'pnpm-lock.yaml': '' },
    });

    const outcome = await autoInstall(dir, async () => ({
      ok: false,
      err: 'ENOENT',
      timedOut: false,
    }));

    expect(outcome).toEqual({ outcome: 'failed', manager: 'pnpm', detail: 'ENOENT' });
  });

  it('absorbs a runner that throws outright', async () => {
    const dir = makeDirWithFiles({
      name: 'auto-throws',
      files: { 'package.json': '{}', 'bun.lock': '' },
    });

    const outcome = await autoInstall(dir, () => {
      throw new Error('spawn blew up');
    });

    expect(outcome).toEqual({ outcome: 'skipped' });
  });

  it('reports the manager it chose when the install succeeds', async () => {
    const dir = makeDirWithFiles({
      name: 'auto-ok',
      files: { 'package.json': '{"packageManager":"yarn@4.1.0"}' },
    });

    let ranIn: string | undefined;
    let ranPlan: InstallPlan | undefined;
    const outcome = await autoInstall(dir, async (plan, cwd): Promise<RunResult> => {
      ranPlan = plan;
      ranIn = cwd;
      return { ok: true, err: '', timedOut: false };
    });

    expect(outcome).toEqual({ outcome: 'installed', manager: 'yarn' });
    expect(ranPlan).toEqual({ manager: 'yarn', command: 'yarn', args: ['install'] });
    expect(ranIn).toBe(dir);
  });
});

describe('autoInstall — every outcome reaches the log file', () => {
  it('records what ran, and where, when the install succeeds', async () => {
    useOwnLogRoot('install-log-ok');
    const dir = makeDirWithFiles({
      name: 'log-ok',
      files: { 'package.json': '{}', 'pnpm-lock.yaml': '' },
    });

    await autoInstall(dir, async () => ({ ok: true, err: '', timedOut: false }));

    const log = readLog();
    expect(log).toContain('installed');
    expect(log).toContain('pnpm install');
    expect(log).toContain(dir);
  });

  it('records the reason, and the manager output, when the install fails', async () => {
    useOwnLogRoot('install-log-failed');
    const dir = makeDirWithFiles({
      name: 'log-failed',
      files: { 'package.json': '{}', 'bun.lock': '' },
    });

    await autoInstall(dir, async () => ({
      ok: false,
      err: 'error: lockfile had changes, but lockfile is frozen',
      timedOut: false,
    }));

    const log = readLog();
    expect(log).toContain('failed');
    expect(log).toContain('lockfile is frozen');
  });

  it('distinguishes a timeout from an ordinary failure', async () => {
    useOwnLogRoot('install-log-timeout');
    const dir = makeDirWithFiles({
      name: 'log-timeout',
      files: { 'package.json': '{}', 'bun.lock': '' },
    });

    await autoInstall(dir, async () => ({ ok: false, err: '', timedOut: true }));

    expect(readLog()).toContain('timed out');
  });

  it('keeps the TAIL of a long stderr, which is where the reason is', async () => {
    useOwnLogRoot('install-log-tail');
    const dir = makeDirWithFiles({
      name: 'log-tail',
      files: { 'package.json': '{}', 'bun.lock': '' },
    });

    const noise = 'downloading a package... '.repeat(400);
    await autoInstall(dir, async () => ({
      ok: false,
      err: `${noise}ERR_PNPM_FETCH_404 GET https://registry/private-pkg`,
      timedOut: false,
    }));

    const log = readLog();
    expect(log).toContain('ERR_PNPM_FETCH_404');
    expect(log.length).toBeLessThan(4_000);
  });

  it('records a skip, which is the outcome with no other trace at all', async () => {
    useOwnLogRoot('install-log-skipped');
    const dir = makeDirWithFiles({ name: 'log-skipped', files: { 'bun.lock': '' } });

    await autoInstall(dir);

    expect(readLog()).toContain('skipped');
  });

  it('still returns the outcome when the log itself cannot be written', async () => {
    const root = join(makeStateRoot({ name: 'install-log-unwritable' }), 'not-a-directory');
    writeFileSync(root, 'occupied', 'utf8');
    process.env['STUDIO_STATE_ROOT'] = root;

    const dir = makeDirWithFiles({
      name: 'log-unwritable',
      files: { 'package.json': '{}', 'bun.lock': '' },
    });

    const outcome = await autoInstall(dir, async () => ({ ok: true, err: '', timedOut: false }));

    expect(outcome).toEqual({ outcome: 'installed', manager: 'bun' });
    expect(existsSync(installLogPath())).toBe(false);
  });
});
