import { canonicalPath } from '../lib/canonical-path.js';
import { log } from '../log/index.js';
import { isAlive, isContainedIn } from './owner.js';
import { inspectWindowsProcess, windowsProcesses } from './windows.js';
import { isWindows, lsofPath } from '../env/platform.js';
import { APP_ENV, runChild, signalTree } from '../env/child.js';

const logger = log('server');

/** Absolute: a packaged app's PATH need not hold it (`owner.ts`). */
const LSOF = lsofPath();

const LSOF_TIMEOUT_MS = 3_000;

/** One listing, filtered by the caller: `+D` walks the tree and costs seconds on a node_modules. */
function runningWithCwd(): Promise<readonly SweepProcess[]> {
  if (isWindows()) return windowsProcesses().catch((error: unknown) => {
    logger.warn('could not inspect Windows processes for orphan cleanup', { error });
    return [];
  });
  return new Promise((done) => {
    runChild(
      LSOF,
      ['-d', 'cwd', '-Fpn'],
      { env: APP_ENV, timeout: LSOF_TIMEOUT_MS, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
      // Non-zero with output is a PARTIAL listing, which is still worth sweeping.
      (_error, stdout) => done(parseCwdListing(stdout)),
    );
  });
}

export function parseCwdListing(out: string): readonly SweepProcess[] {
  const found: SweepProcess[] = [];
  let pid: number | undefined;
  for (const line of out.split('\n')) {
    if (line.startsWith('p')) {
      const parsed = Number.parseInt(line.slice(1), 10);
      pid = Number.isInteger(parsed) ? parsed : undefined;
      continue;
    }
    if (line.startsWith('n') && pid !== undefined) found.push({ pid, cwd: line.slice(1) });
  }
  return found;
}

export interface SweepProcess {
  pid: number;
  cwd: string;
  creationTime?: string;
}

export interface SweepDeps {
  running: () => readonly SweepProcess[] | Promise<readonly SweepProcess[]>;
  kill: (pid: number) => void | Promise<void>;
  inspect?: (pid: number) => SweepProcess | undefined | Promise<SweepProcess | undefined>;
  self?: number;
}

export function appSweepDeps(): SweepDeps {
  return {
    running: runningWithCwd,
    ...(isWindows() ? { inspect: inspectWindowsProcess } : {}),
    // SIGTERM: a dev server that traps it still gets to close its sockets.
    kill: (pid) => signalTree(pid, 'SIGTERM'),
  };
}

/** Contained by working directory, not ancestry: a server left running outlives the harness and reparents away from it (ONL-2556). */
export async function sweepWorktree(
  worktree: string,
  workspaceRoot: string,
  deps: SweepDeps,
): Promise<number> {
  const target = canonicalPath(worktree);
  // The user's own dev server runs from their checkout, outside `workspaceRoot`.
  if (!isContainedIn(target, canonicalPath(workspaceRoot))) {
    logger.warn('refusing to sweep a directory outside the workspace root');
    return 0;
  }
  const self = deps.self ?? process.pid;
  let ended = 0;
  for (const candidate of await deps.running()) {
    if (candidate.pid === self || candidate.pid <= 1) continue;
    if (!isContainedIn(canonicalPath(candidate.cwd), target)) continue;
    if (!isAlive(candidate.pid)) continue;
    try {
      if (deps.inspect !== undefined) {
        if (!candidate.creationTime) continue;
        const fresh = await deps.inspect(candidate.pid);
        if (fresh === undefined || fresh.pid !== candidate.pid || fresh.creationTime !== candidate.creationTime) continue;
        const freshCwd = canonicalPath(fresh.cwd);
        if (freshCwd !== canonicalPath(candidate.cwd) || !isContainedIn(freshCwd, target)) continue;
      }
      await deps.kill(candidate.pid);
      ended += 1;
    } catch {
      // A process that exited between the listing and the signal is the outcome we wanted.
    }
  }
  if (ended > 0) logger.info("ended processes left behind by a closed tab's workspace", { count: ended });
  return ended;
}
