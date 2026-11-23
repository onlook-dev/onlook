import { spawn, type ChildProcess } from 'node:child_process';

/**
 * ACP is newline-delimited JSON-RPC 2.0: every frame carries `jsonrpc`, unlike codex's app-server,
 * whose frames are classified by shape alone (ONL-2xxx). One peer, one child, one buffer.
 */

type RequestId = number | string;

interface RpcError {
  code: number;
  message: string;
  data?: unknown;
}

interface Frame {
  jsonrpc?: string;
  id?: RequestId;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: RpcError;
}

export interface RpcHandlers {
  /** A notification from the agent: no id, no reply. */
  onNotification?: (method: string, params: unknown) => void;
  /** A request from the agent that expects a reply — `session/request_permission` is the one that matters. */
  onRequest?: (id: RequestId, method: string, params: unknown) => void;
  onExit?: (code: number | null, signal: NodeJS.Signals | null) => void;
  onStderr?: (text: string) => void;
}

interface Pending {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class RpcClosedError extends Error {
  constructor(message = 'the agent closed the connection') {
    super(message);
    this.name = 'RpcClosedError';
  }
}

export class StdioRpc {
  private readonly child: ChildProcess;
  private readonly pending = new Map<RequestId, Pending>();
  private buffer = '';
  private nextId = 1;
  private closed = false;
  private readonly deadlineMs: number;

  constructor(
    command: string,
    args: readonly string[],
    options: { cwd?: string; env?: NodeJS.ProcessEnv; deadlineMs?: number },
    private readonly handlers: RpcHandlers = {},
  ) {
    this.deadlineMs = options.deadlineMs ?? 30_000;
    this.child = spawn(command, [...args], {
      ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
      env: options.env ?? process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.child.stdout?.setEncoding('utf8');
    this.child.stdout?.on('data', (chunk: string) => this.read(chunk));
    this.child.stderr?.setEncoding('utf8');
    this.child.stderr?.on('data', (chunk: string) => this.handlers.onStderr?.(chunk));

    this.child.on('error', (error: Error) => this.fail(new Error(`could not start ${command}: ${error.message}`)));
    this.child.on('exit', (code, signal) => {
      this.fail(new RpcClosedError(`the agent exited (${signal ?? String(code)})`));
      this.handlers.onExit?.(code, signal);
    });
  }

  get isClosed(): boolean {
    return this.closed;
  }

  request(method: string, params: unknown, deadlineMs = this.deadlineMs): Promise<unknown> {
    if (this.closed) return Promise.reject(new RpcClosedError());
    const id = this.nextId++;
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} did not answer within ${String(deadlineMs)}ms`));
      }, deadlineMs);
      this.pending.set(id, { resolve, reject, timer });
      this.write({ jsonrpc: '2.0', id, method, params });
    });
  }

  notify(method: string, params: unknown): void {
    if (this.closed) return;
    this.write({ jsonrpc: '2.0', method, params });
  }

  respond(id: RequestId, result: unknown): void {
    if (this.closed) return;
    this.write({ jsonrpc: '2.0', id, result });
  }

  respondError(id: RequestId, code: number, message: string): void {
    if (this.closed) return;
    this.write({ jsonrpc: '2.0', id, error: { code, message } });
  }

  /** Ends the child the polite way first: ACP's own `session/cancel` runs before this at the session. */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new RpcClosedError('the session closed'));
    }
    this.pending.clear();
    this.child.stdin?.end();
    this.child.kill('SIGTERM');
    // A child that ignores SIGTERM would outlive the session and hold the worktree.
    const kill = setTimeout(() => this.child.kill('SIGKILL'), 2_000);
    kill.unref();
  }

  private write(frame: Frame): void {
    try {
      this.child.stdin?.write(`${JSON.stringify(frame)}\n`);
    } catch (error) {
      this.fail(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private read(chunk: string): void {
    this.buffer += chunk;
    let newline = this.buffer.indexOf('\n');
    while (newline >= 0) {
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (line !== '') this.dispatch(line);
      newline = this.buffer.indexOf('\n');
    }
  }

  private dispatch(line: string): void {
    let frame: Frame;
    try {
      frame = JSON.parse(line) as Frame;
    } catch {
      // The agent's own stdout chatter is not a protocol frame; `--print-logs` sends logs to stderr.
      this.handlers.onStderr?.(line);
      return;
    }

    if (frame.method !== undefined) {
      if (frame.id === undefined) {
        this.handlers.onNotification?.(frame.method, frame.params);
        return;
      }
      this.handlers.onRequest?.(frame.id, frame.method, frame.params);
      return;
    }

    if (frame.id === undefined) return;
    const pending = this.pending.get(frame.id);
    if (pending === undefined) return;
    this.pending.delete(frame.id);
    clearTimeout(pending.timer);
    if (frame.error !== undefined) {
      pending.reject(new Error(`${frame.error.message} (${String(frame.error.code)})`));
      return;
    }
    pending.resolve(frame.result);
  }

  private fail(error: Error): void {
    if (this.closed) return;
    this.closed = true;
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }
}
