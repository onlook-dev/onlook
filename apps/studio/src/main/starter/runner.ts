import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { canonicalPath } from '../lib/canonical-path.js';
import { StarterFailure } from './failure.js';
import { pickStarterPort } from './port.js';
import { READY_LINE_PATTERN, STARTER_SERVER_FILE } from './scaffold.js';
import { log } from '../log/index.js';
import { terminateWindowsTree } from '../env/windows.js';
import { repeatWork, workActivity, type WorkActivity } from '../background-work/activity.js';
import { isWindows } from '../env/platform.js';
import { previewStderrTail, type PreviewDiagnostics } from '../telemetry/preview-diagnostics.js';

const logger = log('starter');

export interface StarterChildLike {
  readonly runtime?: 'wsl';
  readonly pid: number | undefined;
  readonly stdout: NodeJS.ReadableStream | null;
  readonly stderr: NodeJS.ReadableStream | null;
  on(event: 'exit', listener: (code: number) => void): unknown;
  on(event: 'spawn', listener: () => void): unknown;
  kill(): boolean;
  postMessage(message: unknown): void;
}

interface StarterForkOptions {
  readonly cwd: string;
  /** Replaces the child's environment; the runner passes a complete one. */
  readonly env: Record<string, string>;
  readonly serviceName: string;
}

export type StarterFork = (modulePath: string, options: StarterForkOptions) => StarterChildLike;

export interface StarterTiming {
  readyMs: number;
  heartbeatMs: number;
  heartbeatWindowMs: number;
  killGraceMs: number;
}

export const DEFAULT_STARTER_TIMING: StarterTiming = {
  // 20s: the react starter's first `listen` runs Vite's optimizer cold; a dead child rejects at once regardless.
  readyMs: 20_000,
  heartbeatMs: 1_000,
  heartbeatWindowMs: 5_000,
  killGraceMs: 2_000,
};

export interface StarterRunnerDeps {
  fork: StarterFork;
  env: (cwd: string) => Promise<Record<string, string>>;
  pickPort?: (preferred?: number) => Promise<number>;
  /** The script the child runs, always with the worktree as its cwd; the worktree's own `server.mjs` unless given. */
  modulePath?: (worktree: string) => string;
  timing?: Partial<StarterTiming>;
  log?: (line: string) => void;
  activity?: WorkActivity;
  diagnostics?: (cwd: string, measurement: Partial<PreviewDiagnostics>, reset?: boolean) => void;
  serverExited?: (cwd: string) => void;
}

export interface StarterRunner {
  spawn(worktree: string, preferred?: number): Promise<number>;
  stop(worktree: string): Promise<void>;
  portFor(worktree: string): number | undefined;
  pidFor(worktree: string): number | undefined;
  running(): readonly string[];
  isPresent(worktree: string): boolean;
  dispose(): void;
}

export const STARTER_SERVICE_PREFIX = 'studio-starter:';

interface Entry {
  child: StarterChildLike;
  port: number;
  exit: Promise<void>;
  stopping: boolean;
}

function tail(text: string, lines = 5): string {
  return text.trim().split('\n').slice(-lines).join('\n');
}

export function createStarterRunner(deps: StarterRunnerDeps): StarterRunner {
  const activity = deps.activity ?? workActivity;
  const timing: StarterTiming = { ...DEFAULT_STARTER_TIMING, ...deps.timing };
  const pickPort = deps.pickPort ?? ((preferred?: number) => pickStarterPort(preferred));
  const log = deps.log ?? ((line: string) => logger.info(line));
  const modulePathFor = deps.modulePath ?? ((worktree: string) => join(worktree, STARTER_SERVER_FILE));
  const entries = new Map<string, Entry>();
  let disposed = false;

  const keyFor = canonicalPath;

  const kill = (entry: Entry): void => {
    if (entry.stopping) return;
    entry.stopping = true;
    if (entry.child.runtime === 'wsl') { entry.child.kill(); return; }
    const pid = entry.child.pid;
    if (isWindows() && pid !== undefined) {
      void terminateWindowsTree(pid).catch(() => entry.child.kill());
      return;
    }
    entry.child.kill();
    const escalate = setTimeout(() => {
      if (pid === undefined) return;
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        // Already gone.
      }
    }, timing.killGraceMs);
    escalate.unref();
    void entry.exit.finally(() => clearTimeout(escalate));
  };

  return {
    async spawn(worktree, preferred) {
      if (disposed) throw new Error('starter runner is disposed');
      const key = keyFor(worktree);
      const running = entries.get(key);
      if (running) return running.port;
      if (!existsSync(join(key, STARTER_SERVER_FILE))) throw new Error(`no ${STARTER_SERVER_FILE} in ${worktree}`);

      const port = await pickPort(preferred);
      const measure = (patch: Partial<PreviewDiagnostics>, reset = false): void => {
        try { deps.diagnostics?.(key, patch, reset); }
        catch { logger.warn('starter analytics callback failed'); }
      };
      measure({ project_source: 'template', expected_port: port, port_occupied: null }, true);
      const env = { ...(await deps.env(key)), PORT: String(port), STARTER_PARENT_PID: String(process.pid) };
      const spawnedAt = Date.now();
      const child = deps.fork(modulePathFor(key), {
        cwd: key,
        env,
        serviceName: `${STARTER_SERVICE_PREFIX}${basename(key)}`,
      });

      let stderr = '';
      let stdout = '';
      let exited = false;
      let exitCode: number | undefined;
      let readyPort: number | undefined;
      const exit = new Promise<void>((resolveExit) => {
        child.on('exit', (code) => {
          exited = true;
          exitCode = code;
          if (!entry.stopping) {
            measure({ cause: 'process_exited', process_exited: true, exit_code: code, stderr_tail: previewStderrTail(stderr), spawn_to_failure_ms: Date.now() - spawnedAt, actual_port: readyPort ?? null });
            if (readyPort !== undefined) {
              try { deps.serverExited?.(key); }
              catch { logger.warn('starter exit analytics callback failed'); }
            }
          }
          stopHeartbeat();
          if (entries.get(key)?.child === child) entries.delete(key);
          log(`exited (code ${String(code)})`);
          resolveExit();
        });
      });
      const entry: Entry = { child, port, exit, stopping: false };
      entries.set(key, entry);

      const beat = (): void => {
        try {
          child.postMessage({ type: 'heartbeat', windowMs: Math.max(timing.heartbeatWindowMs, timing.heartbeatMs * 5) * activity.multiplier() });
        } catch {
          // The channel closes with the child; `exit` clears the interval.
        }
      };
      const stopHeartbeat = repeatWork(() => { if (!exited) beat(); }, timing.heartbeatMs, activity);
      child.on('spawn', beat);

      // Drained for the life of the child: a full pipe blocks its next write.
      child.stderr?.setEncoding('utf8');
      child.stderr?.on('data', (chunk: string) => {
        stderr = tail(stderr + chunk, 20);
      });

      const ready = new Promise<number>((resolveReady, reject) => {
        const timer = setTimeout(() => {
          fail(new StarterFailure('starter_never_ready', `starter gave no ready line within ${timing.readyMs}ms`));
        }, timing.readyMs);
        let settled = false;
        const fail = (error: Error): void => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          measure({ cause: 'readiness_timeout', process_exited: exited, exit_code: exitCode ?? null, stderr_tail: previewStderrTail(stderr), spawn_to_failure_ms: Date.now() - spawnedAt });
          kill(entry);
          void exit.then(() => reject(error));
        };
        child.stdout?.setEncoding('utf8');
        child.stdout?.on('data', (chunk: string) => {
          if (settled) return;
          stdout += chunk;
          const match = READY_LINE_PATTERN.exec(stdout);
          if (!match) return;
          settled = true;
          clearTimeout(timer);
          const bound = Number(match[1]);
          readyPort = bound;
          measure({ actual_port: bound, reported_port: bound, process_exited: false, install_succeeded: true });
          entry.port = bound;
          log(`ready on ${String(bound)}`);
          resolveReady(bound);
        });
        void exit.then(() => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(
            new StarterFailure(
              'starter_exited',
              `starter exited (code ${String(exitCode)}) before it was ready` +
                (stderr ? `: ${stderr}` : ''),
              exitCode,
            ),
          );
        });
      });
      return ready;
    },

    stop(worktree) {
      const entry = entries.get(keyFor(worktree));
      if (!entry) return Promise.resolve();
      kill(entry);
      return entry.exit;
    },

    portFor(worktree) {
      return entries.get(keyFor(worktree))?.port;
    },

    pidFor(worktree) {
      return entries.get(keyFor(worktree))?.child.pid;
    },

    running() {
      return [...entries.keys()];
    },

    isPresent(worktree) {
      return existsSync(join(keyFor(worktree), STARTER_SERVER_FILE));
    },

    dispose() {
      disposed = true;
      for (const entry of entries.values()) kill(entry);
      entries.clear();
    },
  };
}
