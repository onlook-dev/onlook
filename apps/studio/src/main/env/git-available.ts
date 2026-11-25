import { existsSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { runCli } from './cli.js';
import { hostExecutable, hostSearchPath } from './executable.js';
import { hostPlatform } from './platform.js';
import { userEnv, type Env } from './shell-env.js';

interface GitAvailabilityReaders {
  platform: NodeJS.Platform;
  resolve(cwd: string, env: Env): string | undefined;
  realpath(path: string): string;
  selectedTools(cwd: string, env: Env): Promise<string | undefined>;
  exists(path: string): boolean;
}

const readers: GitAvailabilityReaders = {
  platform: hostPlatform(),
  resolve: (cwd, env) => hostExecutable('git', cwd, { ...env, PATH: hostSearchPath(cwd, env) }),
  realpath: realpathSync,
  selectedTools: selectedDeveloperTools,
  exists: existsSync,
};

let selection: { key: string; pending: Promise<string | undefined> } | undefined;

function selectionPath(path: string): string {
  try { return realpathSync(path); } catch { return ''; }
}

async function selectedDeveloperTools(cwd: string, env: Env): Promise<string | undefined> {
  const key = JSON.stringify([env['DEVELOPER_DIR'], selectionPath('/var/db/xcode_select_link'), selectionPath('/Applications/Xcode.app/Contents/Developer')]);
  if (selection?.key === key) {
    const selected = await selection.pending;
    if (selected !== undefined && existsSync(join(selected, 'usr/bin/git'))) return selected;
  }
  const pending = runCli('/usr/bin/xcode-select', cwd, ['-p'], { timeoutMs: 3_000, env })
    .then((result) => result.ok ? result.out : undefined);
  selection = { key, pending };
  return pending;
}

export async function gitExecutable(cwd: string, env?: Env, deps: GitAvailabilityReaders = readers): Promise<string | undefined> {
  const environment = env ?? await userEnv();
  const executable = deps.resolve(cwd, environment);
  if (executable === undefined) return undefined;
  if (deps.platform !== 'darwin') return executable;
  try {
    const canonical = deps.realpath(executable);
    if (canonical !== '/usr/bin/git' && canonical !== '/bin/git') return executable;
    const selected = await deps.selectedTools(cwd, environment);
    if (selected === undefined || selected === '') return undefined;
    const selectedGit = join(selected, 'usr/bin/git');
    if (!deps.exists(selectedGit)) return undefined;
    const selectedExecutable = deps.realpath(selectedGit);
    if (selectedExecutable === '/usr/bin/git' || selectedExecutable === '/bin/git') return undefined;
    const lookupEnv = { ...environment, PATH: dirname(selectedGit) };
    const resolved = deps.resolve(cwd, lookupEnv);
    return resolved !== undefined && deps.realpath(resolved) === selectedExecutable ? selectedGit : undefined;
  } catch {
    return undefined;
  }
}

export async function gitAvailable(cwd: string, env?: Env, deps?: GitAvailabilityReaders): Promise<boolean> {
  return await gitExecutable(cwd, env, deps) !== undefined;
}
