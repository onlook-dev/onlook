import { statSync } from 'node:fs';
import { win32 } from 'node:path';
import { hostExecutable } from '../env/executable.js';
import type { Env } from '../env/shell-env.js';
import { hostPlatform, isWindows } from '../env/platform.js';
import { wslProject } from '../env/wsl.js';

const GIT_ROOT_DEPTH = 3;

function isFile(path: string): boolean {
  return statSync(path, { throwIfNoEntry: false })?.isFile() === true;
}

/** Git for Windows keeps `git.exe` in `cmd\`, `bin\` or `mingw64\bin\`, and its `sh.exe` in `bin\` or `usr\bin\` of the same root. */
export function gitBashShell(git: string, exists: (path: string) => boolean = isFile): string | undefined {
  let directory = win32.dirname(git);
  for (let depth = 0; depth < GIT_ROOT_DEPTH; depth += 1) {
    for (const candidate of [win32.join(directory, 'bin', 'sh.exe'), win32.join(directory, 'usr', 'bin', 'sh.exe')]) {
      if (exists(candidate)) return candidate;
    }
    const parent = win32.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  return undefined;
}

export function setupShell(cwd: string, env: NodeJS.ProcessEnv, platform: NodeJS.Platform = hostPlatform()): string | undefined {
  if (wslProject(cwd, platform) !== undefined) return '/bin/sh';
  if (!isWindows(platform)) return '/bin/sh';
  const defined = Object.fromEntries(Object.entries(env).filter((entry): entry is [string, string] => entry[1] !== undefined)) as Env;
  const git = hostExecutable('git', cwd, defined, platform);
  return git === undefined ? undefined : gitBashShell(git);
}
