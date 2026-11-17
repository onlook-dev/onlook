import { constants } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { delimiter, isAbsolute, join } from 'node:path';
import type { Env } from '../env/shell-env.js';
import type { PackageManager } from './detect.js';
import { hostExecutable } from '../env/executable.js';
import { isWindows } from '../env/platform.js';

const SYSTEM_DIRECTORIES = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin'];

function configured(env: Env, key: string, suffix?: string): string[] {
  const directory = env[key];
  return directory && isAbsolute(directory) ? [suffix ? join(directory, suffix) : directory] : [];
}

function managerDirectories(manager: PackageManager, env: Env): string[] {
  const home = env['HOME'] && isAbsolute(env['HOME']) ? env['HOME'] : homedir();
  if (manager === 'bun') {
    return [...configured(env, 'BUN_INSTALL', 'bin'), join(home, '.bun/bin')];
  }
  const node = [
    ...configured(env, 'NPM_CONFIG_PREFIX', 'bin'),
    ...configured(env, 'npm_config_prefix', 'bin'),
    ...configured(env, 'NVM_BIN'),
    ...configured(env, 'VOLTA_HOME', 'bin'),
    ...configured(env, 'ASDF_DATA_DIR', 'shims'),
    ...configured(env, 'MISE_DATA_DIR', 'shims'),
    join(home, '.volta/bin'),
    join(home, '.asdf/shims'),
    join(home, '.local/share/mise/shims'),
    join(home, '.npm-global/bin'),
  ];
  if (manager === 'pnpm') {
    return [
      ...configured(env, 'PNPM_HOME'),
      join(home, 'Library/pnpm'),
      join(home, '.local/share/pnpm'),
      ...node,
    ];
  }
  if (manager === 'yarn') {
    return [join(home, '.yarn/bin'), join(home, '.config/yarn/global/node_modules/.bin'), ...node];
  }
  return node;
}

function searchDirectories(
  manager: PackageManager,
  env: Env,
  systemDirectories: readonly string[],
): string[] {
  return [...new Set([
    ...(env['PATH'] ?? env['Path'] ?? '').split(delimiter),
    ...managerDirectories(manager, env),
    ...systemDirectories,
  ])].filter(isAbsolute);
}

export function packageManagerPath(manager: PackageManager, env: Env): string {
  return searchDirectories(manager, env, SYSTEM_DIRECTORIES).join(delimiter);
}

export async function resolvePackageManager(
  manager: PackageManager,
  env: Env,
  options: { systemDirectories?: readonly string[]; cwd?: string } = {},
): Promise<string | undefined> {
  if (options.cwd !== undefined) {
    return hostExecutable(manager, options.cwd, {
      ...env,
      PATH: searchDirectories(manager, env, options.systemDirectories ?? SYSTEM_DIRECTORIES).join(delimiter),
    });
  }
  for (const directory of searchDirectories(manager, env, options.systemDirectories ?? SYSTEM_DIRECTORIES)) {
    const names = isWindows() ? [`${manager}.exe`, `${manager}.cmd`, `${manager}.bat`] : [manager];
    for (const name of names) {
    const executable = join(directory, name);
    try {
      if (!(await stat(executable)).isFile()) continue;
      await access(executable, constants.X_OK);
      return executable;
    } catch {
      continue;
    }
    }
  }
  return undefined;
}
