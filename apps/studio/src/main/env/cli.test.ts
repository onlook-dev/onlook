import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test';
import { alive, manualClock, until } from '@studio/fixtures';
import { runCli } from './cli.js';
import type { DeadlineClock } from './deadline.js';
import { mergeEnv, resetUserEnvForTests } from './shell-env.js';

setDefaultTimeout(45_000);

const SH = '/bin/sh';
const BOUND_MS = 500;
const GRACE_MS = 200;

let cwd: string;

beforeAll(async () => {
  cwd = realpathSync.native(mkdtempSync(join(tmpdir(), 'studio-cli-')));
  resetUserEnvForTests(async () => mergeEnv(process.env));
});

afterAll(() => {
  resetUserEnvForTests();
  rmSync(cwd, { recursive: true, force: true });
});

function sh(script: string, options: { timeoutMs?: number; killGraceMs?: number; maxBuffer?: number; clock?: DeadlineClock } = {}) {
  return runCli(SH, cwd, ['-c', script], { timeoutMs: options.timeoutMs ?? BOUND_MS, killGraceMs: GRACE_MS, ...options });
}

describe.skipIf(process.platform === 'win32')('lookup-only searchPath', () => {
  it.each(['selected', 'missing', 'empty', 'project'])('%s never falls back to the child PATH', async (scenario) => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'studio-cli-lookup-')));
    try {
      const host = join(root, 'host');
      const selected = join(root, 'selected');
      mkdirSync(host);
      mkdirSync(selected);
      const command = 'studio-lookup-test';
      for (const directory of [host, ...(scenario === 'selected' ? [selected] : [])]) {
        writeFileSync(join(directory, command), '#!/bin/sh\nexit 0\n');
        chmodSync(join(directory, command), 0o755);
      }
      const env = { PATH: host, Path: host, LOOKUP_TEST: 'unchanged' };
      const searchPath = scenario === 'empty' ? '' : scenario === 'project' ? cwd : selected;
      const launches: { bin: string; env: unknown }[] = [];
      const result = await runCli(command, cwd, [], { timeoutMs: BOUND_MS, env, searchPath }, {
        spawn: (bin, _args, options) => {
          launches.push({ bin, env: options.env });
          throw new Error('spawn intercepted');
        },
        signalGroup: () => {},
      });
      if (scenario === 'selected') {
        expect(launches).toHaveLength(1);
        expect(launches[0]?.bin).toBe(join(selected, command));
        expect(launches[0]?.env).toMatchObject(env);
      } else {
        expect(result.missing).toBe(true);
        expect(launches).toEqual([]);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

function exists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** A killed orphan is reaped a moment after the signal; an instant check reads a zombie as alive. */
async function gone(pid: number): Promise<void> {
  await until(async () => exists(pid), (present) => !present, { what: `process ${pid} to be reaped`, limitMs: 30_000, everyMs: 10 });
}

function heldBy(background: string, ready: string, missing: string): string {
  return [
    `${background} &`,
    'i=0',
    `until [ -e ${ready} ] || [ $i -ge 3000 ]; do sleep 0.01; i=$((i+1)); done`,
    `[ -e ${ready} ] || { echo "${missing}" >&2; exit 9; }`,
  ].join('\n');
}

function pidsOf(out: string): number[] {
  return out.split(/\s+/).filter(Boolean).map(Number);
}

function pidsIn(name: string): number[] {
  return pidsOf(readFileSync(join(cwd, name), 'utf8'));
}

function controlledProcess() {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const child = Object.assign(new EventEmitter(), { stdout, stderr }) as unknown as ChildProcess;
  const spawned = Promise.withResolvers<void>();
  const signals: NodeJS.Signals[] = [];
  return {
    child, stdout, stderr, spawned, signals,
    dependencies: {
      spawn: () => {
        spawned.resolve();
        return child;
      },
      signalGroup: (_child: unknown, signal: NodeJS.Signals) => { signals.push(signal); },
    },
  };
}

describe('runCli', () => {
  it('a child that exits 0 answers ok with both streams, trimmed', async () => {
    const result = await sh('echo " out "; echo err >&2', { timeoutMs: 5_000 });
    expect(result).toEqual({ ok: true, out: 'out', err: 'err', timedOut: false, missing: false, exitCode: 0 });
  });

  it('a non-zero exit is not ok and not a timeout, and keeps what was written', async () => {
    const result = await sh('echo partial; echo why >&2; exit 3', { timeoutMs: 5_000 });
    expect(result).toEqual({ ok: false, out: 'partial', err: 'why', timedOut: false, missing: false, exitCode: 3 });
  });

  it('a missing binary is missing, distinct from a failing call', async () => {
    const result = await runCli('/nonexistent/studio-cli-probe', cwd, ['--version'], { timeoutMs: 5_000 });
    expect(result).toMatchObject({ ok: false, out: '', timedOut: false, missing: true, exitCode: null });
  });

  it('unsets a name the login shell exports, which layering env alone cannot do', async () => {
    const result = await runCli(SH, cwd, ['-c', 'echo "${HOME-absent}"'], {
      timeoutMs: 5_000,
      unset: ['HOME'],
    });
    expect(result.out).toBe('absent');
  });

  it('runs in the directory it was given, with the env layered last', async () => {
    const result = await runCli(SH, cwd, ['-c', 'pwd; echo "$HOME"'], {
      timeoutMs: 5_000,
      env: { HOME: 'layered' },
    });
    expect(result.ok).toBe(true);
    expect(result.out.split('\n')).toEqual([cwd, 'layered']);
  });

  it('output past the cap fails the call without reporting a timeout', async () => {
    const result = await sh('i=0; while [ $i -lt 500 ]; do echo aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa; i=$((i+1)); done', {
      timeoutMs: 5_000,
      maxBuffer: 1_024,
    });
    expect(result).toMatchObject({ ok: false, timedOut: false, missing: false });
    expect(result.out.length).toBeGreaterThan(0);
  });

  it('a child and its grandchild that both ignore SIGTERM are SIGKILLed as a group after the grace', async () => {
    const clock = manualClock();
    const call = sh('trap "" TERM; sleep 120 & echo $$ $! > group.tmp; mv group.tmp group.pids; echo $$ $!; wait', { clock });
    await until(async () => existsSync(join(cwd, 'group.pids')), Boolean, { what: 'the process group to be ready', limitMs: 30_000, everyMs: 10 });

    clock.advanceBy(BOUND_MS + GRACE_MS - 1);
    const [shell, sleeper] = pidsIn('group.pids');
    expect(alive(shell!)).toBe(true);
    expect(alive(sleeper!)).toBe(true);

    clock.advanceBy(1);
    const result = await call;
    expect(result).toMatchObject({ ok: false, timedOut: true, missing: false, exitCode: null });
    expect(pidsOf(result.out)).toEqual([shell!, sleeper!]);
    await gone(shell!);
    await gone(sleeper!);
  });

  it('an orphan holding stdout past the shell it came from dies with the group; the call settles within bound plus grace', async () => {
    const clock = manualClock();
    const call = sh(
      `${heldBy('(trap "" TERM; : > orphan.ready; exec sleep 120)', 'orphan.ready', 'the orphan never took the trap')}\necho $! > orphan.tmp\nmv orphan.tmp orphan.pid\nwait`,
      { clock },
    );
    await until(async () => existsSync(join(cwd, 'orphan.pid')), Boolean, { what: 'the orphan to be ready', limitMs: 30_000, everyMs: 10 });

    clock.advanceBy(BOUND_MS + GRACE_MS - 1);
    const [orphan] = pidsIn('orphan.pid');
    expect(alive(orphan!)).toBe(true);

    clock.advanceBy(1);
    const result = await call;
    expect(result).toMatchObject({ ok: false, timedOut: true, missing: false });
    await gone(orphan!);
  });

  it('a grandchild that left the group and holds stdout cannot hold the call open', async () => {
    const escape =
      'perl -e \'use POSIX; POSIX::setsid(); open(my $f, ">", "escapee.tmp"); print $f $$; close $f; rename("escapee.tmp", "escapee.ready"); sleep 120\'';
    const call = sh(`${heldBy(escape, 'escapee.ready', 'the grandchild never left the group')}\ncat escapee.ready`, {
      timeoutMs: 30_000,
    });
    const result = await call;
    expect(result).toMatchObject({ ok: true, timedOut: false, missing: false });
    const pids = pidsOf(result.out);
    expect(pids).toHaveLength(1);
    const [escapee] = pids;
    expect(escapee).toBeGreaterThan(0);
    expect(alive(escapee!)).toBe(true);
    process.kill(escapee!, 'SIGKILL');
    await gone(escapee!);
  });

  it('a child that exits cleanly while a helper it left behind holds stdout is not a timeout, and the helper is swept', async () => {
    const call = sh('sleep 120 & echo $!', { timeoutMs: 30_000 });
    const result = await call;
    expect(result).toMatchObject({ ok: true, timedOut: false, missing: false });
    const [helper] = pidsOf(result.out);
    expect(helper).toBeGreaterThan(0);
    await gone(helper!);
  });

  it('starts the drain at the exit event and sweeps only after the entire grace', async () => {
    const { child, stdout, stderr, spawned, signals, dependencies } = controlledProcess();
    const clock = manualClock();
    const call = runCli(SH, cwd, [], { timeoutMs: BOUND_MS, killGraceMs: GRACE_MS, clock }, dependencies);
    await spawned.promise;
    let answered = false;
    void call.then(() => { answered = true; });
    clock.advanceBy(BOUND_MS - 1);
    stdout.emit('data', ' helper output ');
    child.emit('exit', 0);
    clock.advanceBy(GRACE_MS - 1);
    await Promise.resolve();
    expect(answered).toBe(false);
    expect(signals).toEqual([]);
    clock.advanceBy(1);
    expect(await call).toMatchObject({ ok: true, out: 'helper output', timedOut: false, exitCode: 0 });
    expect(signals).toEqual(['SIGKILL']);
    expect(stdout.destroyed).toBe(true);
    expect(stderr.destroyed).toBe(true);
    expect(clock.pending).toBe(0);
  });

  for (const first of ['timeout', 'abort'] as const) {
    it(`leaves no escalation after completion when ${first} precedes the other stop request`, async () => {
      const { child, spawned, signals, dependencies } = controlledProcess();
      const clock = manualClock();
      const controller = new AbortController();
      const call = runCli(SH, cwd, [], {
        timeoutMs: BOUND_MS, killGraceMs: GRACE_MS, clock, signal: controller.signal,
      }, dependencies);
      await spawned.promise;
      if (first === 'abort') {
        clock.advanceBy(BOUND_MS - 1);
        controller.abort();
        clock.advanceBy(1);
      } else {
        clock.advanceBy(BOUND_MS);
        clock.advanceBy(1);
        controller.abort();
      }
      child.emit('exit', null);
      child.emit('close');
      expect(await call).toMatchObject({ ok: false, timedOut: true, missing: false });
      expect(clock.pending).toBe(0);
      expect(signals).toEqual(['SIGTERM', 'SIGTERM']);
      clock.advanceBy(GRACE_MS);
      expect(signals).toEqual(['SIGTERM', 'SIGTERM']);
    });
  }
});
