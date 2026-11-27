import { existsSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { runCli } from './cli.js';
import { hostExecutable, pathExecutable } from './executable.js';
import { executableName, hostPlatform } from './platform.js';
import { userEnv, type Env } from './shell-env.js';

interface GitAvailabilityReaders {
  platform: NodeJS.Platform;
  resolve(env: Env, cwd?: string): string | undefined;
  realpath(path: string): string;
  selectedTools(env: Env): Promise<string | undefined | null>;
  exists(path: string): boolean;
}

const readers: GitAvailabilityReaders = {
  platform: hostPlatform(),
  resolve: (env, cwd) => cwd === undefined
    ? pathExecutable(executableName('git'), env)
    : hostExecutable(executableName('git'), cwd, env),
  realpath: realpathSync,
  selectedTools: selectedDeveloperTools,
  exists: existsSync,
};

const selections = new Map<string, Promise<string | undefined | null>>();

export function resetSelectedDeveloperTools(): void {
  selections.clear();
}

function selectionPath(path: string): string {
  try { return realpathSync(path); } catch { return ''; }
}

export async function selectedDeveloperTools(env: Env, run: typeof runCli = runCli): Promise<string | undefined | null> {
  const key = JSON.stringify([env['DEVELOPER_DIR'], selectionPath('/var/db/xcode_select_link'), selectionPath('/Applications/Xcode.app/Contents/Developer')]);
  const cached = selections.get(key);
  if (cached !== undefined) {
    const selected = await cached;
    if (typeof selected !== 'string' || existsSync(join(selected, 'usr/bin/git'))) return selected;
  }
  const pending = run('/usr/bin/xcode-select', homedir(), ['-p'], { timeoutMs: 3_000, env })
    .then((result) => result.timedOut ? null : result.ok ? result.out : undefined);
  selections.set(key, pending);
  return pending;
}

export async function gitExecutable(env?: Env, deps: GitAvailabilityReaders = readers, cwd?: string): Promise<string | undefined> {
  const environment = env ?? await userEnv();
  const executable = deps.resolve(environment, cwd);
  if (executable === undefined) return undefined;
  if (deps.platform !== 'darwin') return executable;
  try {
    const canonical = deps.realpath(executable);
    if (canonical !== '/usr/bin/git' && canonical !== '/bin/git') return executable;
    const selected = await deps.selectedTools(environment);
    if (selected === null) return executable;
    if (selected === undefined || selected === '') return undefined;
    const selectedGit = join(selected, 'usr/bin/git');
    if (!deps.exists(selectedGit)) return undefined;
    const selectedExecutable = deps.realpath(selectedGit);
    if (selectedExecutable === '/usr/bin/git' || selectedExecutable === '/bin/git') return undefined;
    const lookupEnv = { ...environment, PATH: dirname(selectedGit) };
    const resolved = deps.resolve(lookupEnv, cwd);
    return resolved !== undefined && deps.realpath(resolved) === selectedExecutable ? selectedGit : undefined;
  } catch {
    return undefined;
  }
}

export async function gitAvailable(env?: Env, deps?: GitAvailabilityReaders): Promise<boolean> {
  return await gitExecutable(env, deps) !== undefined;
}
