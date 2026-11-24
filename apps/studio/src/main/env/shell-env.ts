import type { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { log } from '../log/index.js';
import { envWithout, leadsOwnGroup, startChild } from './child.js';
import { type DeadlineClock, systemClock } from './deadline.js';
import { isMac, isWindows } from './platform.js';

const logger = log('env');

/** Per `CAPTURE_ARGV` rung; a wedged shell would otherwise be an app that never opens a window. */
const CAPTURE_TIMEOUT_MS = 5_000;
const CAPTURE_RETRY_MS = 30_000;
const MAX_CAPTURE_RETRY_MS = 300_000;
const MAX_CAPTURE_RETRIES = 5;

const MAX_BUFFER = 8 * 1024 * 1024;

export type Env = Record<string, string>;

/** Split on the first `=` only: a value may contain any number (`LS_COLORS`). */
export function parseEnvBlock(raw: string): Env {
  const env: Env = {};
  for (const entry of raw.split('\0')) {
    if (!entry) continue;
    const eq = entry.indexOf('=');
    if (eq <= 0) continue;
    env[entry.slice(0, eq)] = entry.slice(eq + 1);
  }
  return env;
}

/** Last writer wins: a spawn site's own keys go last so a user's `GIT_PAGER=less` cannot wedge a pager in a child with no terminal. */
export function mergeEnv(...layers: Array<Env | NodeJS.ProcessEnv | undefined>): Env {
  const merged: Env = {};
  for (const layer of layers) {
    if (!layer) continue;
    for (const [key, value] of Object.entries(layer)) {
      if (value !== undefined) {
        const canonical = isWindows() ? key.toUpperCase() : key;
        merged[canonical] = value;
      }
    }
  }
  return merged;
}

/** `-i` first: `-l` alone skips `~/.zshrc`, where the toolchain lives, and that capture succeeds wrong (ONL-1902). The second rung is for a broken `~/.zshrc`. */
const CAPTURE_ARGV: ReadonlyArray<readonly string[]> = [
  ['-i', '-l', '-c'],
  ['-l', '-c'],
];

/** An rc's own output (an OSC 7 escape, say) fuses onto the first entry unfenced, and a fixed marker is one a user's value can spoof (ONL-1902). */
function fence(nonce: string): { command: string; begin: string; end: string } {
  const begin = `${nonce}:BEGIN`;
  const end = `${nonce}:END`;
  return { command: `printf '%s' '${begin}'; env -0; printf '%s' '${end}'`, begin, end };
}

/** The last pair: a shell under `set -x` echoes both markers before the payload. */
function betweenFence(raw: string, begin: string, end: string): string | undefined {
  const start = raw.lastIndexOf(begin);
  if (start < 0) return undefined;
  const from = start + begin.length;
  const stop = raw.lastIndexOf(end);
  return stop < from ? undefined : raw.slice(from, stop);
}

function killGroup(child: ChildProcess): void {
  if (child.pid === undefined || isWindows()) return;
  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch {
    // The group already exited.
  }
}

/** `spawn`, for `stdio: ignore`: an rc that reads stdin gets EOF instead of a pipe nobody closes. */
function probe(
  shell: string,
  argv: readonly string[],
  env: Env,
  timeoutMs: number,
  clock: DeadlineClock,
): Promise<string | undefined> {
  return new Promise((resolve) => {
    let child;
    try {
      // A group of its own, so abandoning a wedged shell also ends what its rc started.
      child = startChild(shell, [...argv], { env, stdio: ['ignore', 'pipe', 'pipe'], detached: leadsOwnGroup() });
    } catch {
      resolve(undefined);
      return;
    }

    let out = '';
    let settled = false;
    const finish = (value: string | undefined): void => {
      if (settled) return;
      settled = true;
      cancelDeadline();
      child.kill('SIGKILL');
      resolve(value);
    };
    const abandon = (): void => {
      if (!settled) killGroup(child);
      finish(undefined);
    };
    const cancelDeadline = clock.after(timeoutMs, abandon);

    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      out += chunk;
      if (out.length > MAX_BUFFER) abandon();
    });
    // Drained: an rc that fills the stderr pipe never reaches `env`.
    child.stderr?.resume();
    child.on('error', () => {
      finish(undefined);
    });
    child.on('close', () => {
      finish(out);
    });
  });
}

/** The closing marker is the gate, not the exit code: an interactive shell exits with whatever the rc left behind. */
export async function captureShellEnv(options: {
  shell: string;
  timeoutMs?: number;
  inherited?: NodeJS.ProcessEnv;
  clock?: DeadlineClock;
}): Promise<Env | undefined> {
  // Otherwise the shell reports it back and every later child that runs an `electron` binary gets a bare Node.
  const inherited = envWithout(mergeEnv(options.inherited ?? process.env), ['ELECTRON_RUN_AS_NODE']);
  const timeoutMs = options.timeoutMs ?? CAPTURE_TIMEOUT_MS;

  for (const argv of CAPTURE_ARGV) {
    const nonce = randomUUID();
    const { command, begin, end } = fence(nonce);
    const raw = await probe(options.shell, [...argv, command], inherited, timeoutMs, options.clock ?? systemClock);
    if (raw === undefined) continue;

    const payload = betweenFence(raw, begin, end);
    if (payload === undefined) continue;

    // An empty fence is a failure; read as an answer it replaces a working PATH with none.
    const parsed = parseEnvBlock(payload);
    if (Object.keys(parsed).length > 0) {
      if (argv[0] === '-l') {
        logger.warn('interactive login-shell capture failed; using login-only environment', { captureMode: 'login-only' });
      }
      return parsed;
    }
  }

  return undefined;
}

function loginShell(): string | undefined {
  if (isWindows()) return undefined;
  return process.env['SHELL'] ?? '/bin/zsh';
}

let pending: Promise<Env> | undefined;
let settled: Env | undefined;
let generation = 0;
let captureUserEnv = captureShellEnv;
let envNow = () => performance.now();
const fallbackEnvs = new WeakMap<Env, number>();
let githubRecovery: {
  base: Env;
  env: Env;
  retryAt: number;
  attempts: number;
  pending?: Promise<void>;
} | undefined;

export function isShellEnvFallback(env: Env): boolean {
  return fallbackEnvs.has(env);
}

/** Memoised as the promise: a value would let early spawns race ahead of the capture. */
export function userEnv(): Promise<Env> {
  const capturingGeneration = generation;
  pending ??= (async () => {
    const shell = loginShell();
    const inherited = mergeEnv(process.env);

    const captured = shell ? await captureUserEnv({ shell }) : undefined;
    if (shell && !captured) {
      logger.warn('could not resolve the login-shell environment; using the inherited environment', { shell });
    }
    // Inherited first: Electron's runtime vars and `STUDIO_*` survive under what the shell does not mention.
    const env = captured ? mergeEnv(inherited, captured) : inherited;
    if (shell && !captured) {
      fallbackEnvs.set(env, envNow());
    }
    if (generation === capturingGeneration) {
      settled = env;
    }
    return env;
  })();
  return pending;
}

export async function githubCliEnv(): Promise<Env> {
  const base = await userEnv();
  const failedAt = fallbackEnvs.get(base);
  if (!isMac() || failedAt === undefined || base !== settled) return base;
  if (githubRecovery?.base !== base) {
    const env = mergeEnv(base);
    env['PATH'] = [...new Set([
      ...(env['PATH'] ?? '').split(':').filter(Boolean), '/opt/homebrew/bin', '/usr/local/bin',
    ])].join(':');
    fallbackEnvs.set(env, failedAt);
    githubRecovery = { base, env, retryAt: failedAt + CAPTURE_RETRY_MS, attempts: 0 };
  }
  const recovery = githubRecovery;
  const shell = loginShell();
  if (shell && isShellEnvFallback(recovery.env) && !recovery.pending
    && recovery.attempts < MAX_CAPTURE_RETRIES && envNow() >= recovery.retryAt) {
    recovery.attempts += 1;
    recovery.pending = (async () => {
      const captured = await captureUserEnv({ shell }).catch(() => undefined);
      if (captured) recovery.env = mergeEnv(base, captured);
      recovery.retryAt = envNow() + Math.min(CAPTURE_RETRY_MS * 2 ** recovery.attempts, MAX_CAPTURE_RETRY_MS);
      recovery.pending = undefined;
    })();
  }
  return recovery.env;
}

export function refreshUserEnv(): Promise<Env> {
  generation += 1;
  pending = undefined;
  return userEnv();
}

/** For the agent host, which builds `query()` options synchronously; registering a project already awaited `userEnv()`. */
export function userEnvSync(): Env | undefined {
  return settled;
}

/** Not awaited: `userEnv()` orders the spawns, and a shell probe blocking startup is the worse bug. */
export function primeUserEnv(): void {
  void userEnv();
}

export function resetUserEnvForTests(
  capture: typeof captureShellEnv = captureShellEnv,
  now: () => number = () => performance.now(),
): void {
  generation += 1;
  pending = undefined;
  settled = undefined;
  captureUserEnv = capture;
  envNow = now;
  githubRecovery = undefined;
}
