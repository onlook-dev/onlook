import { APP_ENV, startChild } from '../../env/child.js';
import { wslProject } from '../../env/wsl.js';
import { startWslAgent } from '../wsl.js';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomUUID } from 'node:crypto';

export interface Frame {
  readonly method?: string;
  readonly id?: string | number;
  readonly params?: unknown;
  readonly result?: unknown;
  readonly error?: { code?: number; message?: string; data?: unknown };
}

export type FrameKind = 'server-request' | 'notification' | 'response' | 'unknown';

/** Not JSON-RPC 2.0 (no frame carries `jsonrpc`), and structural: the protocol adds methods with no version negotiation. */
export function classifyFrame(frame: Frame): FrameKind {
  const hasMethod = typeof frame.method === 'string';
  const hasId = frame.id !== undefined && frame.id !== null;
  if (hasMethod && hasId) return 'server-request';
  if (hasMethod) return 'notification';
  if (hasId) return 'response';
  return 'unknown';
}

export interface TransportHandlers {
  /** Unanswered, the turn parks forever; `respondError` is the floor. */
  onServerRequest?: (method: string, id: string | number, params: unknown) => void;
  onNotification?: (method: string, params: unknown) => void;
  onFrame?: (raw: string, frame: Frame, kind: FrameKind) => void;
  /** A non-JSON line is the child writing diagnostics to stdout. */
  onMalformed?: (raw: string, error: Error) => void;
  onStderr?: (chunk: string) => void;
  onExit?: (code: number | null, signal: NodeJS.Signals | null) => void;
}

interface Pending {
  readonly method: string;
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}

export interface SpawnOptions {
  readonly bin: string;
  readonly config?: Record<string, string>;
  readonly codexHome?: string;
  readonly cwd?: string;
  /** Replaces `process.env`, not merged. Omitted, a Dock-launched app hands the child launchd's `PATH` (ONL-1871). */
  readonly env?: NodeJS.ProcessEnv;
}

export type TransportFailure = 'exited' | 'connection' | 'timeout';

export interface ProcessExit {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
}

export class AppServerTransportError extends Error {
  readonly reason: TransportFailure;
  readonly exit: ProcessExit | undefined;

  constructor(reason: TransportFailure, message: string, exit?: ProcessExit) {
    super(message);
    this.name = 'AppServerTransportError';
    this.reason = reason;
    this.exit = exit;
  }
}

/** An inherited credential outbids the ChatGPT subscription: all three go, whichever this codex version honours; `~/.codex/auth.json` is an account and stays. */
export function stripInheritedCredentials(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  delete env['OPENAI_API_KEY'];
  delete env['CODEX_API_KEY'];
  delete env['CODEX_ACCESS_TOKEN'];
  return env;
}

export class AppServerTransport {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly pending = new Map<string, Pending>();
  private buffer = '';
  private exited = false;
  /** Sends guard on this, not `exited`: `close()` sets it while the child is still alive. */
  private dead = false;
  private terminalError: AppServerTransportError | undefined;

  /** Not a parameter property: not erasable syntax, and `transport.pty.ts` loads this file under Node. */
  private readonly handlers: TransportHandlers;

  constructor(options: SpawnOptions, handlers: TransportHandlers = {}) {
    this.handlers = handlers;
    // Overrides precede the subcommand; after it they read as an argument error.
    const args: string[] = [];
    for (const [key, value] of Object.entries(options.config ?? {})) {
      args.push('--config', `${key}=${value}`);
    }
    args.push('app-server', '--listen', 'stdio://');

    const env = stripInheritedCredentials({ ...(options.env ?? process.env) });
    if (options.codexHome !== undefined) env['CODEX_HOME'] = options.codexHome;

    // No `shell: true` — `kill()` would signal the shell and orphan a 220MB child.
    this.child = (wslProject(options.cwd) !== undefined
      ? startWslAgent(options.bin, args, options.cwd!, { env: env ?? APP_ENV })
      : startChild(options.bin, args, {
      cwd: options.cwd,
      env: env ?? APP_ENV,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })) as ChildProcessWithoutNullStreams;

    this.child.stdout.setEncoding('utf8');
    this.child.stdout.on('data', (chunk: string) => {
      this.buffer += chunk;
      this.drain();
    });
    this.child.stderr.setEncoding('utf8');
    this.child.stderr.on('data', (chunk: string) => this.handlers.onStderr?.(chunk));
    this.child.on('exit', (code, signal) => {
      this.exited = true;
      this.dead = true;
      this.terminalError = new AppServerTransportError(
        'exited',
        `the ChatGPT agent exited (code=${String(code)}, signal=${String(signal)})`,
        { exitCode: code, signal },
      );
      this.failAllPending(this.terminalError);
      this.handlers.onExit?.(code, signal);
    });
    // A spawn failure (ENOENT) never fires `exit`.
    this.child.on('error', (error: Error) => {
      this.exited = true;
      this.dead = true;
      this.terminalError = new AppServerTransportError('connection', error.message);
      this.failAllPending(this.terminalError);
    });
    // Unlistened, a write into an ended stdin reaches Electron as a crash dialog.
    this.child.stdin.on('error', (error: Error) => {
      this.dead = true;
      this.terminalError ??= new AppServerTransportError('connection', error.message);
      this.failAllPending(this.terminalError);
    });
  }

  private drain(): void {
    let newline = this.buffer.indexOf('\n');
    while (newline !== -1) {
      const raw = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (raw.length > 0) this.handleLine(raw);
      newline = this.buffer.indexOf('\n');
    }
  }

  private handleLine(raw: string): void {
    let frame: Frame;
    try {
      frame = JSON.parse(raw) as Frame;
    } catch (error) {
      this.handlers.onMalformed?.(raw, error as Error);
      return;
    }
    const kind = classifyFrame(frame);
    this.handlers.onFrame?.(raw, frame, kind);

    if (kind === 'response') {
      const key = String(frame.id);
      const pending = this.pending.get(key);
      // Unmatched is drift, not a throw: a throw kills the reader and the session with it.
      if (pending === undefined) return;
      this.pending.delete(key);
      if (frame.error !== undefined) {
        pending.reject(
          new Error(
            `${pending.method} failed: ${frame.error.message ?? 'no message'} (code=${String(frame.error.code)})`,
          ),
        );
      } else {
        pending.resolve(frame.result);
      }
      return;
    }

    if (kind === 'server-request' && frame.method !== undefined && frame.id !== undefined) {
      this.handlers.onServerRequest?.(frame.method, frame.id, frame.params);
      return;
    }

    if (kind === 'notification' && frame.method !== undefined) {
      this.handlers.onNotification?.(frame.method, frame.params);
    }
  }

  private failAllPending(reason: Error): void {
    for (const [, pending] of this.pending) pending.reject(reason);
    this.pending.clear();
  }

  /** A stdin destroyed by something other than our teardown is dead before any event says so. */
  private unusable(): string | undefined {
    if (this.exited) return 'app-server has exited';
    if (this.dead) return 'app-server transport is closed';
    const { stdin } = this.child;
    if (stdin.writableEnded || stdin.destroyed) return 'app-server stdin is gone';
    return undefined;
  }

  private write(payload: unknown): void {
    this.child.stdin.write(`${JSON.stringify(payload)}\n`);
  }

  private send(payload: unknown): void {
    if (this.unusable() !== undefined) return;
    this.write(payload);
  }

  request(method: string, params?: unknown, timeoutMs?: number): Promise<unknown> {
    const problem = this.unusable();
    if (problem !== undefined) {
      return Promise.reject(new AppServerTransportError(
        this.terminalError?.reason ?? 'connection',
        `cannot send ${method}: ${problem}`,
        this.terminalError?.exit,
      ));
    }
    const id = randomUUID();
    return new Promise<unknown>((resolve, reject) => {
      const timer =
        timeoutMs === undefined
          ? undefined
          : setTimeout(() => {
              this.pending.delete(id);
              reject(new AppServerTransportError('timeout', `${method} got no answer in ${String(timeoutMs)}ms`));
            }, timeoutMs);
      timer?.unref?.();
      const settle = <T>(hand: (value: T) => void) => (value: T) => {
        if (timer !== undefined) clearTimeout(timer);
        hand(value);
      };
      this.pending.set(id, { method, resolve: settle(resolve), reject: settle(reject) });
      this.write({ id, method, params: params ?? {} });
    });
  }

  notify(method: string, params?: unknown): void {
    this.send({ method, params: params ?? {} });
  }

  respond(id: string | number, result: unknown): void {
    this.send({ id, result });
  }

  /** A `{}` reply to an unknown method reads to the server as a valid response of the wrong shape. */
  respondError(id: string | number, message: string, code = -32601): void {
    this.send({ id, error: { code, message } });
  }

  get pendingCount(): number {
    return this.pending.size;
  }

  /** Marked dead here, not at exit: `failAllPending` wakes callers in the same tick, while the child is still alive. */
  async close(graceMs = 2000): Promise<void> {
    const alreadyGone = this.exited;
    this.dead = true;
    this.failAllPending(new Error('app-server transport closed'));
    if (alreadyGone) return;
    const ended = new Promise<void>((resolve) => {
      // Attached before the signal: a listener added after a fast exit never fires.
      if (this.exited) {
        resolve();
        return;
      }
      this.child.once('exit', () => resolve());
    });
    this.child.stdin.end();
    this.child.kill('SIGTERM');
    const timer = setTimeout(() => this.child.kill('SIGKILL'), graceMs);
    try {
      await ended;
    } finally {
      clearTimeout(timer);
    }
  }
}
