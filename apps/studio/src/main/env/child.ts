import { type ChildProcess, type ExecFileException, type ExecFileOptions, type SpawnOptions, execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { isWindows } from './platform.js';
import { terminateWindowsTree } from './windows.js';

/** The app's own environment, by name. For a fixed system tool that is handed no project input; anything else gets a built one. */
export const APP_ENV = 'app-env' as const;

type ChildEnv = NodeJS.ProcessEnv | typeof APP_ENV;

export interface ChildOptions extends Omit<SpawnOptions, 'env'> {
  env: ChildEnv;
}

export interface RunChildOptions extends Omit<ExecFileOptions, 'env' | 'encoding'> {
  env: ChildEnv;
  encoding?: 'utf8';
}

function nodeOptions<Options extends { env: ChildEnv }>(options: Options): Omit<Options, 'env'> & { env?: NodeJS.ProcessEnv } {
  const { env, ...rest } = options;
  return env === APP_ENV ? rest : { ...rest, env };
}

export function startChild(bin: string, args: readonly string[], options: ChildOptions): ChildProcess {
  return spawn(bin, args, nodeOptions(options));
}

/** `execFile`'s own bounds apply: `timeout` kills with `killSignal`, `maxBuffer` ends the child. */
export function runChild(
  bin: string,
  args: readonly string[],
  options: RunChildOptions,
  done: (error: ExecFileException | null, stdout: string, stderr: string) => void,
): ChildProcess {
  return execFile(bin, args, nodeOptions(options), done);
}

const execFileOutput = promisify(execFile);

export function runChildOutput(bin: string, args: readonly string[], options: RunChildOptions): Promise<{ stdout: string; stderr: string }> {
  return execFileOutput(bin, args, nodeOptions(options));
}

/** `detached` for a child whose group is signalled as one; Windows has no process groups and ends the tree instead. */
export function leadsOwnGroup(): boolean {
  return !isWindows();
}

export function envWithout<Environment extends Record<string, string | undefined>>(env: Environment, names: readonly string[]): Environment {
  const kept = { ...env };
  for (const name of names) delete kept[name];
  return kept;
}

export interface KillableChild {
  readonly pid?: number | undefined;
  kill(signal?: NodeJS.Signals): boolean;
}

/** What to do when the group cannot be signalled: signal the child alone, or throw unless the group is already gone. */
export type UnreachableGroup = 'signal-child' | 'throw-unless-gone';

export function signalGroup(child: KillableChild, signal: NodeJS.Signals, unreachable: UnreachableGroup): void {
  const pid = child.pid;
  if (pid === undefined) return;
  if (isWindows()) {
    void terminateWindowsTree(pid).catch(() => child.kill(signal));
    return;
  }
  try {
    process.kill(-pid, signal);
  } catch (error) {
    if (unreachable === 'signal-child') child.kill(signal);
    else if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
  }
}

/** One process by pid, not a group: on Windows the whole tree ends whatever the signal. */
export function signalTree(pid: number, signal: NodeJS.Signals): void | Promise<void> {
  if (isWindows()) return terminateWindowsTree(pid);
  process.kill(pid, signal);
}
