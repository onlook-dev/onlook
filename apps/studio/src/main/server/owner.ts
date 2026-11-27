import { isAbsolute, relative, resolve } from 'node:path';
import type { ServerAttribution, ServerOwnership } from '@studio/events';
import { canonicalPath } from '../lib/canonical-path.js';
import { log } from '../log/index.js';
import { windowsProcesses, type WindowsInspectionOptions } from './windows.js';
import { isWindows, lsofPath } from '../env/platform.js';
import { APP_ENV, runChild } from '../env/child.js';
import { wslProject } from '../env/wsl.js';
import { wslListener } from '../env/wsl-processes.js';

const logger = log('server');

// Ownership is decided by cwd: never pid equality (a framework restart mints a new pid) and never ancestry (a backgrounded server is reparented to pid 1, ONL-1930).

/** Absolute: a packaged app's PATH need not hold it. */
const LSOF = lsofPath();

const LSOF_TIMEOUT_MS = 2_000;

export interface ListenerIdentity {
  pid: number;
  cwd?: string;
  command?: string;
  creationTime?: string;
}

export type IdentifyListener = (port: number, options?: { workspacePath?: string }) => Promise<ListenerIdentity | undefined>;

function run(args: readonly string[]): Promise<string | undefined> {
  return new Promise((done) => {
    // -O drops lsof's fork-per-kernel-call guard (~0.8 s per call on macOS); a call it no longer guards can hang, so the deadline settles without the child (ONL-2917).
    const deadline = setTimeout(() => done(undefined), LSOF_TIMEOUT_MS + 250);
    runChild(
      LSOF,
      ['-O', ...args],
      { env: APP_ENV, timeout: LSOF_TIMEOUT_MS, killSignal: 'SIGKILL', encoding: 'utf8' },
      // lsof exits non-zero for finding nothing, so every failure is the same undefined.
      (error, stdout) => {
        clearTimeout(deadline);
        done(error ? undefined : stdout);
      },
    );
  });
}

export const identifyListener = async (port: number, options?: WindowsInspectionOptions & { throwOnInspectionError?: boolean; workspacePath?: string }): Promise<ListenerIdentity | undefined> => {
  if (wslProject(options?.workspacePath) !== undefined) return wslListener(options!.workspacePath!, port);
  if (isWindows()) {
    try {
      const listeners = await windowsProcesses(port, options);
      return listeners.length === 1 ? listeners[0] : undefined;
    } catch (error) {
      if (options?.throwOnInspectionError) throw error;
      logger.warn('could not inspect Windows listener ownership', { error });
      return undefined;
    }
  }
  const listeners = await run(['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t']);
  if (listeners === undefined) return undefined;

  const pids = new Set(listeners.trim().split('\n').map((line) => Number(line.trim())));
  if (pids.size !== 1) return undefined;
  const pid = [...pids][0];
  if (pid === undefined || !Number.isInteger(pid) || pid <= 0) return undefined;

  const cwdOutput = await run(['-a', '-p', String(pid), '-d', 'cwd', '-Fcn']);
  // Without a cwd the pid still returns: `verifiesFor` answers unknown, not foreign.
  if (cwdOutput === undefined) return { pid };

  const cwd = /^n(.+)$/m.exec(cwdOutput)?.[1];
  const command = /^c(.+)$/m.exec(cwdOutput)?.[1];
  return {
    pid,
    ...(cwd === undefined ? {} : { cwd }),
    ...(command === undefined ? {} : { command }),
  };
};

export const CONTAINER_RUNTIME_COMMANDS: readonly string[] = [
  'orbstack',
  'com.docker',
  'vpnkit',
  'colima',
  'limactl',
  'gvproxy',
  'podman',
];

/** Prefix, not equality: the kernel truncates command names at 16 chars (`com.docker.backe`). */
export function isContainerRuntime(command: string | undefined): boolean {
  if (command === undefined) return false;
  const name = command.toLowerCase();
  return CONTAINER_RUNTIME_COMMANDS.some((runtime) => name.startsWith(runtime));
}

export function resolveReportedFolder(cwd: string, reported: string | undefined): string {
  if (reported === undefined || reported.trim() === '') return cwd;
  const candidate = isAbsolute(reported) ? reported : resolve(cwd, reported);
  // Canonical paths: a symlink inside the project can point outside it.
  if (isContainedIn(canonicalPath(candidate), canonicalPath(cwd))) return candidate;
  logger.warn("ignoring a reported server directory outside this session's workspace; recording the claim against the workspace root instead");
  return cwd;
}

export function isContainedIn(child: string, parent: string): boolean {
  const step = relative(resolve(parent), resolve(child));
  return step === '' || (!step.startsWith('..') && !isAbsolute(step));
}

export function verifiesFor(
  identity: ListenerIdentity | undefined,
  entryFolder: string,
): ServerOwnership {
  if (identity?.cwd === undefined) return 'unknown';
  return isContainedIn(canonicalPath(identity.cwd), canonicalPath(entryFolder)) ? 'ours' : 'foreign';
}

export interface AttributionRoots {
  workspaceRoot?: string | undefined;
  sourceRepoRoot?: string | undefined;
}

export function attributeCwd(cwd: string | undefined, roots: AttributionRoots): ServerAttribution {
  if (cwd === undefined) return 'unknown';
  const where = canonicalPath(cwd);
  if (roots.workspaceRoot !== undefined && isContainedIn(where, canonicalPath(roots.workspaceRoot))) {
    return 'agent-started';
  }
  if (roots.sourceRepoRoot !== undefined && isContainedIn(where, canonicalPath(roots.sourceRepoRoot))) {
    return 'users-own';
  }
  return 'unknown';
}

/** EPERM is a live pid we may not signal; only ESRCH means gone. */
export function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}
