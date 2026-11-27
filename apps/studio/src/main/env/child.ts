import { type ChildProcess, type ExecFileException, type ExecFileOptions, type SpawnOptions, execFile, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Transform } from 'node:stream';
import { StringDecoder } from 'node:string_decoder';
import { isWindows } from './platform.js';
import { terminateWindowsTree } from './windows.js';
import { type WslProject, wslEnvironment, wslLaunch, wslProject, wslStop } from './wsl.js';
import { log } from '../log/index.js';

/** The app's own environment, by name. For a fixed system tool that is handed no project input; anything else gets a built one. */
export const APP_ENV = 'app-env' as const;

type ChildEnv = NodeJS.ProcessEnv | typeof APP_ENV;

export interface ChildOptions extends Omit<SpawnOptions, 'env'> {
  env: ChildEnv;
  unset?: readonly string[];
}

export interface RunChildOptions extends Omit<ExecFileOptions, 'env' | 'encoding'> {
  env: ChildEnv;
  unset?: readonly string[];
  encoding?: 'utf8';
}

function nodeOptions<Options extends { env: ChildEnv; unset?: readonly string[] }>(options: Options): Omit<Options, 'env' | 'unset'> & { env?: NodeJS.ProcessEnv } {
  const { env, unset: _unset, ...rest } = options;
  return env === APP_ENV ? rest : { ...rest, env };
}

export function startChild(bin: string, args: readonly string[], options: ChildOptions, launchWsl: typeof spawn = spawn): ChildProcess {
  const project = wslProject(typeof options.cwd === 'string' ? options.cwd : undefined);
  if (project !== undefined) {
    const marker = `ONLOOK_WSL_${randomUUID()}:`;
    const command = wslLaunch(project, bin, args, marker);
    const child = launchWsl(command.bin, command.args, wslOptions(options, project));
    bindWslChild(child, project, marker, true, launchWsl);
    return child;
  }
  return spawn(bin, args, { ...nodeOptions(options), shell: false });
}

/** `execFile`'s own bounds apply: `timeout` kills with `killSignal`, `maxBuffer` ends the child. */
export function runChild(
  bin: string,
  args: readonly string[],
  options: RunChildOptions,
  done: (error: ExecFileException | null, stdout: string, stderr: string) => void,
): ChildProcess {
  const project = wslProject(typeof options.cwd === 'string' ? options.cwd : undefined);
  if (project !== undefined) {
    const marker = `ONLOOK_WSL_${randomUUID()}:`;
    const command = wslLaunch(project, bin, args, marker);
    const child = execFile(command.bin, command.args, wslOptions(options, project), (error, stdout, stderr) => {
      done(error, stdout, stderr.replace(new RegExp(`^${marker}\\d+\\r?\\n`, 'm'), ''));
    });
    bindWslChild(child, project, marker, false, spawn);
    return child;
  }
  return execFile(bin, args, { ...nodeOptions(options), shell: false }, done);
}

export function runChildOutput(bin: string, args: readonly string[], options: RunChildOptions): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    runChild(bin, args, options, (error, stdout, stderr) => {
      if (error !== null) reject(Object.assign(error, { stdout, stderr }));
      else resolve({ stdout, stderr });
    });
  });
}

function wslOptions<Options extends ChildOptions | RunChildOptions>(options: Options, project: WslProject) {
  const stdio = 'stdio' in options ? options.stdio : undefined;
  if (stdio !== undefined && stdio !== 'pipe' && (!Array.isArray(stdio) || (stdio[2] !== undefined && stdio[2] !== 'pipe'))) throw new Error('A WSL child requires piped stderr');
  const { unset, ...rest } = options;
  return { ...rest, cwd: undefined, env: wslEnvironment(project, options.env === APP_ENV ? process.env : options.env, unset), shell: false, windowsHide: true, windowsVerbatimArguments: false, detached: false };
}

interface WslChild {
  project: WslProject;
  launch: typeof spawn;
  group?: number;
  pending?: NodeJS.Signals;
  signalled?: boolean;
  closed: boolean;
  killWrapper: () => boolean;
  startupKill?: ReturnType<typeof setTimeout>;
}

const wslChildren = new WeakMap<KillableChild, WslChild>();
const wslPids = new Map<number, KillableChild>();

function stopWsl(state: WslChild, signal: NodeJS.Signals): void {
  if (state.closed) return;
  if (state.group === undefined) {
    if (state.pending !== 'SIGKILL') state.pending = signal;
    state.startupKill ??= setTimeout(() => { if (!state.closed && state.group === undefined) state.killWrapper(); }, 2_000).unref();
    return;
  }
  const command = wslStop(state.project, state.group, signal);
  const control = state.launch(command.bin, command.args, { env: { SystemRoot: process.env['SystemRoot'], WSLENV: '' }, windowsHide: true, stdio: 'ignore' });
  control.on('error', () => log('env').warn('could not signal a WSL process group'));
  control.on('exit', (code) => { if (code !== 0) log('env').warn('WSL process group signal failed', { exit_code: code }); });
}

function bindWslChild(child: ChildProcess, project: WslProject, marker: string, filter: boolean, launch: typeof spawn): void {
  const killWrapper = child.kill.bind(child, 'SIGKILL');
  const state: WslChild = { project, launch, closed: false, killWrapper };
  wslChildren.set(child, state);
  if (child.pid !== undefined) wslPids.set(child.pid, child);
  child.kill = (signal = 'SIGTERM') => {
    const named = typeof signal === 'number' ? signal === 9 ? 'SIGKILL' : signal === 15 ? 'SIGTERM' : undefined : signal;
    if (named === undefined) throw new Error('Unsupported WSL process signal');
    state.signalled = true;
    stopWsl(state, named);
    return !state.closed;
  };
  Object.defineProperty(child, 'killed', { get: () => state.signalled === true });
  child.once('close', () => {
    clearTimeout(state.startupKill);
    state.closed = true;
    if (child.pid !== undefined) wslPids.delete(child.pid);
  });
  const stderr = child.stderr;
  if (stderr === null) throw new Error('A WSL child requires piped stderr');
  let prefix = '';
  let read = false;
  const decoder = new StringDecoder('utf8');
  const consume = (chunk: Buffer | string): string => {
    const text = typeof chunk === 'string' ? chunk : decoder.write(chunk);
    if (read) return text;
    prefix += text;
    let output = '';
    let newline: number;
    while ((newline = prefix.indexOf('\n')) >= 0) {
      const first = prefix.slice(0, newline).replace(/\r$/, '');
      const line = prefix.slice(0, newline + 1);
      prefix = prefix.slice(newline + 1);
      if (first.startsWith(marker) && /^\d+$/.test(first.slice(marker.length))) {
        const group = Number(first.slice(marker.length));
        if (Number.isSafeInteger(group) && group > 1) {
          state.group = group;
          clearTimeout(state.startupKill);
          read = true;
          if (state.pending !== undefined) stopWsl(state, state.pending);
          return output + prefix;
        }
      }
      output += line;
    }
    if (prefix.length > 512) { output += prefix; prefix = ''; }
    return output;
  };
  if (filter) {
    const filtered = new Transform({
      transform(chunk: Buffer, _encoding, callback) { callback(null, consume(chunk)); },
      flush(callback) { this.push((read ? '' : prefix) + decoder.end()); callback(); },
    });
    child.stderr = stderr.pipe(filtered);
  } else {
    stderr.on('data', consume);
  }
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
  const wsl = wslChildren.get(child);
  if (wsl !== undefined) { stopWsl(wsl, signal); return; }
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
  const wsl = wslPids.get(pid);
  if (wsl !== undefined) { signalGroup(wsl, signal, 'signal-child'); return; }
  if (isWindows()) return terminateWindowsTree(pid);
  process.kill(pid, signal);
}
