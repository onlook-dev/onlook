import type { ChildProcess } from 'node:child_process';
import { type ChildOptions, envWithout, leadsOwnGroup, signalGroup, startChild } from './child.js';
import { type Env, mergeEnv, userEnv } from './shell-env.js';
import { executableCommand } from './windows.js';
import { windowsJobCommand } from './windows-job.js';
import { hostExecutable, hostSearchPath } from './executable.js';
import { type DeadlineClock, systemClock } from './deadline.js';
import { isWindows } from './platform.js';

export const KILL_GRACE_MS = 2_000;

const MAX_BUFFER = 16 * 1024 * 1024;

export interface CliResult {
  ok: boolean;
  out: string;
  err: string;
  timedOut: boolean;
  missing: boolean;
  exitCode: number | null;
}

export interface RunCliOptions {
  stdin?: string;
  onStderr?: (chunk: string) => void;
  timeoutMs: number;
  clock?: DeadlineClock;
  signal?: AbortSignal;
  env?: Env;
  searchPath?: string;
  /** Names removed from the child's environment after every layer is applied — `env` alone cannot unset a key the login shell exports. */
  unset?: readonly string[];
  killGraceMs?: number;
  maxBuffer?: number;
}

/** The child leads its own process group and the bound signals the group: git and gh fork helpers that a signal to the direct child strands holding our pipes. Settles on exit plus a bounded drain; a grandchild can hold stream close open forever (ONL-1871). */
export async function runCli(
  bin: string,
  cwd: string,
  args: string[],
  options: RunCliOptions,
  dependencies: {
    spawn: (bin: string, args: string[], options: ChildOptions) => ChildProcess;
    signalGroup: typeof signalGroup;
  } = { spawn: startChild, signalGroup },
): Promise<CliResult> {
  const env = envWithout(mergeEnv(await userEnv(), options.env), options.unset ?? []);
  env['PATH'] = hostSearchPath(cwd, env);
  const lookupEnv = options.searchPath === undefined ? env : { ...env, PATH: hostSearchPath(cwd, { PATH: options.searchPath }) };
  const executable = hostExecutable(bin, cwd, lookupEnv);
  if (executable === undefined) {
    return { ok: false, out: '', err: 'Host executable not found in trusted PATH', timedOut: false, missing: true, exitCode: null };
  }
  const graceMs = options.killGraceMs ?? KILL_GRACE_MS;
  const maxBuffer = options.maxBuffer ?? MAX_BUFFER;
  const clock = options.clock ?? systemClock;

  return new Promise((resolve) => {
    let child: ChildProcess;
    try {
      const command = isWindows() ? windowsJobCommand(executable, args) : executableCommand(executable, args);
      child = dependencies.spawn(command.bin, command.args, {
        cwd,
        env,
        detached: leadsOwnGroup(),
        stdio: [options.stdin === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
        windowsHide: true,
        windowsVerbatimArguments: command.windowsVerbatimArguments,
      });
    } catch (error) {
      resolve({
        ok: false,
        out: '',
        err: failureOf(error).err,
        timedOut: false,
        missing: failureOf(error).missing,
        exitCode: null,
      });
      return;
    }

    let out = '';
    if (options.stdin !== undefined) {
      child.stdin?.on('error', () => {});
      child.stdin?.end(options.stdin);
    }
    let err = '';
    let exitCode: number | null | undefined;
    let timedOut = false;
    let aborted = false;
    let overflowed = false;
    let exited = false;
    let closed = false;
    let killed = false;
    let settled = false;
    let cancelEscalation: (() => void) | undefined;
    let cancelDrain: (() => void) | undefined;

    const finish = (failure?: { err: string; missing: boolean }): void => {
      if (settled) return;
      settled = true;
      cancelBound();
      cancelEscalation?.();
      cancelDrain?.();
      options.signal?.removeEventListener('abort', onAbort);
      child.stdout?.destroy();
      child.stderr?.destroy();
      resolve({
        ok: failure === undefined && !timedOut && !overflowed && !aborted && exitCode === 0,
        out: out.trim(),
        err: (err || failure?.err || '').trim(),
        timedOut,
        missing: failure?.missing ?? (isWindows() && exitCode === 127 && err.includes('ONLOOK_CLI_EXECUTABLE_MISSING')),
        exitCode: failure === undefined ? (exitCode ?? null) : null,
      });
    };

    const sweep = (): void => {
      killed = true;
      dependencies.signalGroup(child, 'SIGKILL', 'signal-child');
      if (exited) finish();
    };

    const overflow = (): void => {
      if (overflowed) return;
      overflowed = true;
      sweep();
    };

    const onAbort = (): void => {
      aborted = true;
      dependencies.signalGroup(child, 'SIGTERM', 'signal-child');
      cancelEscalation ??= clock.after(graceMs, sweep);
    };

    const cancelBound = clock.after(options.timeoutMs, () => {
      if (exited) return;
      timedOut = true;
      dependencies.signalGroup(child, 'SIGTERM', 'signal-child');
      cancelEscalation ??= clock.after(graceMs, sweep);
    });

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      out += chunk;
      if (out.length + err.length > maxBuffer) overflow();
    });
    child.stderr?.on('data', (chunk: string) => {
      options.onStderr?.(chunk);
      err += chunk;
      if (out.length + err.length > maxBuffer) overflow();
    });

    child.on('error', (error) => {
      finish(failureOf(error));
    });
    child.on('exit', (code) => {
      exited = true;
      exitCode = code;
      if (closed || killed) {
        finish();
        return;
      }
      if (!timedOut) cancelDrain = clock.after(graceMs, sweep);
    });
    child.on('close', () => {
      closed = true;
      if (exited) finish();
    });
    if (options.signal?.aborted) onAbort();
    else options.signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function failureOf(error: unknown): { err: string; missing: boolean } {
  const e = error as { message?: string; code?: unknown };
  return { err: e.message ?? '', missing: e.code === 'ENOENT' };
}
