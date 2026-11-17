import type { Readable, Writable } from 'node:stream';
import { sanitizeCode } from '@studio/events';
import { leadsOwnGroup, signalGroup, startChild } from '../env/child.js';
import { KILL_GRACE_MS } from '../env/cli.js';
import type { Env } from '../env/shell-env.js';
import type { OpenExternal } from './env.js';

/** The CLI's own output as a non-TTY child; an SDK bump can change it. */
const VISIT_MARKER = 'visit: ';
const HYPERLINK_TARGET = /\x1b\]8;[^;\x07\x1b]*;([^\x07\x1b]+)(?:\x07|\x1b\\)/;
const TERMINAL_SEQUENCE = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b\[[0-?]*[ -/]*[@-~]/g;
const INVALID_CODE_MARKER = 'Invalid code';
const LOGIN_FAILED_MARKER = 'Login failed';

/** Matched as exact hostnames, not substrings; the harness shim prints `platform.claude.com`. */
const KNOWN_LOGIN_HOSTS: readonly string[] = ['claude.com', 'claude.ai', 'platform.claude.com', 'platform.claude.ai'];

/** A tab closed and forgotten is otherwise a child parked on stdin forever. */
const LOGIN_ABANDON_MS = 600_000;
const LOGIN_URL_TIMEOUT_MS = 30_000;
const STDOUT_CAP = 64 * 1024;

export type ClaudeLoginOutcome = 'exited' | 'cancelled' | 'abandoned';

export interface ClaudeLoginHandle {
  /** Carries single-use PKCE state: it reaches `openPage()` and no log line or emit. */
  readonly authUrl: string;
  readonly completed: Promise<ClaudeLoginOutcome>;
  exitCode(): number | null;
  loginFailed(): boolean;
  submitCode(code: string): boolean;
  cancel(): void;
  onRejected(cb: () => void): void;
  openPage(): Promise<void>;
}

export interface LoginChild {
  readonly pid?: number | undefined;
  readonly stdin: Writable;
  readonly stdout: Readable;
  readonly stderr: Readable;
  on(event: 'error', listener: (error: Error) => void): unknown;
  on(event: 'exit', listener: (code: number | null, signal: NodeJS.Signals | null) => void): unknown;
  kill(signal?: NodeJS.Signals): boolean;
}

export type LoginSpawn = (
  bin: string,
  args: string[],
  options: { env: Env; detached: boolean; windowsHide: boolean; stdio: ['pipe', 'pipe', 'pipe'] },
) => LoginChild;

export interface StartClaudeLoginOptions {
  bin: string;
  env: Env;
  openExternal?: OpenExternal;
  spawn?: LoginSpawn;
  signal?: (child: LoginChild, signal: NodeJS.Signals) => void;
  abandonMs?: number;
  urlTimeoutMs?: number;
  killGraceMs?: number;
}

export function validateLoginUrl(candidate: string): string | undefined {
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'https:') return undefined;
  if (!KNOWN_LOGIN_HOSTS.includes(url.hostname)) return undefined;
  // Verbatim, not normalised: the browser must receive exactly what the child signed its PKCE state into.
  return candidate;
}

/** A hyperlink-capable `TERM_PROGRAM` makes the CLI wrap the URL in OSC 8 even on a pipe; the target is the URL it signed. */
function loginUrlFromVisitLine(rest: string): string {
  return HYPERLINK_TARGET.exec(rest)?.[1] ?? rest.replace(TERMINAL_SEQUENCE, '').trim();
}

export const spawnLoginChild: LoginSpawn = (bin, args, options) => startChild(bin, args, options) as unknown as LoginChild;

export function startClaudeLogin(options: StartClaudeLoginOptions): Promise<ClaudeLoginHandle> {
  const doSpawn = options.spawn ?? spawnLoginChild;
  const signal = options.signal ?? ((child: LoginChild, name: NodeJS.Signals) => signalGroup(child, name, 'signal-child'));
  const graceMs = options.killGraceMs ?? KILL_GRACE_MS;

  return new Promise<ClaudeLoginHandle>((resolveStart, rejectStart) => {
    let child: LoginChild;
    try {
      child = doSpawn(options.bin, ['auth', 'login', '--claudeai'], {
        env: options.env,
        detached: leadsOwnGroup(),
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (error) {
      rejectStart(error);
      return;
    }

    let started = false;
    let settled = false;
    let exited = false;
    let exitCode: number | null = null;
    let loginFailed = false;
    let stdoutBuffer = '';
    let stderrBuffer = '';
    let authUrl: string | undefined;
    const rejectedListeners: Array<() => void> = [];
    let settleCompleted: (outcome: ClaudeLoginOutcome) => void = () => undefined;
    const completed = new Promise<ClaudeLoginOutcome>((resolve) => {
      settleCompleted = resolve;
    });
    let escalate: ReturnType<typeof setTimeout> | undefined;
    let abandon: ReturnType<typeof setTimeout> | undefined;

    const kill = (): void => {
      if (exited) return;
      signal(child, 'SIGTERM');
      escalate = setTimeout(() => {
        if (!exited) signal(child, 'SIGKILL');
      }, graceMs);
      escalate.unref?.();
    };

    const settle = (outcome: ClaudeLoginOutcome): void => {
      if (settled) return;
      settled = true;
      clearTimeout(abandon);
      settleCompleted(outcome);
    };

    const fail = (error: Error): void => {
      if (started) return;
      started = true;
      clearTimeout(urlTimer);
      kill();
      rejectStart(error);
    };

    const urlTimer = setTimeout(() => {
      fail(new Error('the sign-in child printed no login page'));
    }, options.urlTimeoutMs ?? LOGIN_URL_TIMEOUT_MS);
    urlTimer.unref?.();

    const handle: ClaudeLoginHandle = {
      get authUrl() {
        return authUrl ?? '';
      },
      completed,
      exitCode: () => exitCode,
      loginFailed: () => loginFailed,
      submitCode: (code) => {
        const clean = sanitizeCode(code);
        if (clean === undefined) return false;
        if (exited || settled) return false;
        const { stdin } = child;
        if (stdin.writableEnded || stdin.destroyed) return false;
        stdin.write(`${clean}\n`);
        return true;
      },
      cancel: () => {
        if (settled) return;
        settle('cancelled');
        kill();
      },
      onRejected: (cb) => {
        rejectedListeners.push(cb);
      },
      openPage: async () => {
        if (authUrl === undefined) return;
        await options.openExternal?.(authUrl);
      },
    };

    const start = (url: string): void => {
      if (started) return;
      started = true;
      clearTimeout(urlTimer);
      authUrl = url;
      abandon = setTimeout(() => {
        settle('abandoned');
        kill();
      }, options.abandonMs ?? LOGIN_ABANDON_MS);
      abandon.unref?.();
      resolveStart(handle);
    };

    const readStdoutLines = (): void => {
      let newline = stdoutBuffer.indexOf('\n');
      while (newline !== -1) {
        const line = stdoutBuffer.slice(0, newline);
        stdoutBuffer = stdoutBuffer.slice(newline + 1);
        const at = line.indexOf(VISIT_MARKER);
        if (at !== -1 && authUrl === undefined) {
          const valid = validateLoginUrl(loginUrlFromVisitLine(line.slice(at + VISIT_MARKER.length)));
          if (valid === undefined) {
            fail(new Error('the sign-in child printed a login page Studio does not recognise'));
            return;
          }
          start(valid);
        }
        newline = stdoutBuffer.indexOf('\n');
      }
    };

    const readStderrLines = (): void => {
      let newline = stderrBuffer.indexOf('\n');
      while (newline !== -1) {
        const line = stderrBuffer.slice(0, newline);
        stderrBuffer = stderrBuffer.slice(newline + 1);
        if (line.includes(INVALID_CODE_MARKER)) {
          for (const listener of rejectedListeners) listener();
        }
        if (line.includes(LOGIN_FAILED_MARKER)) loginFailed = true;
        newline = stderrBuffer.indexOf('\n');
      }
    };

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      if (stdoutBuffer.length < STDOUT_CAP) stdoutBuffer += chunk;
      readStdoutLines();
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      if (stderrBuffer.length < STDOUT_CAP) stderrBuffer += chunk;
      readStderrLines();
    });
    // A write into a stream that is ending or destroyed emits here. Unlistened, it reaches Electron as a crash dialog.
    child.stdin.on('error', () => undefined);
    // Spawn failure (ENOENT) never fires `exit`.
    child.on('error', (error) => {
      exited = true;
      fail(error);
      settle('exited');
    });
    child.on('exit', (code) => {
      exited = true;
      exitCode = code;
      clearTimeout(escalate);
      // A trailing partial stderr line still carries the verdict.
      if (stderrBuffer.length > 0) {
        stderrBuffer += '\n';
        readStderrLines();
      }
      fail(new Error('the sign-in child exited before printing a login page'));
      settle('exited');
    });
  });
}
