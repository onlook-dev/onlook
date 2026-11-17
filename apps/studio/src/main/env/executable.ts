import { accessSync, constants, realpathSync, statSync } from 'node:fs';
import { delimiter, isAbsolute, join, relative, sep } from 'node:path';
import type { Env } from './shell-env.js';
import { hostPlatform, isWindows } from './platform.js';

function within(root: string, path: string): boolean {
  const part = relative(root, path);
  return part === '' || (!isAbsolute(part) && part !== '..' && !part.startsWith(`..${sep}`));
}

export function hostSearchPath(cwd: string, env: Env): string {
  let project: string;
  try {
    project = realpathSync(cwd);
  } catch {
    return '';
  }
  return (env['PATH'] ?? env['Path'] ?? '').split(delimiter).filter((directory) => {
    if (!isAbsolute(directory)) return false;
    try {
      return !within(project, realpathSync(directory));
    } catch {
      return false;
    }
  }).join(delimiter);
}

export function hostExecutable(bin: string, cwd: string, env: Env, platform: NodeJS.Platform = hostPlatform()): string | undefined {
  if (isAbsolute(bin)) return bin;
  if (!bin || /[/\\]/.test(bin)) return undefined;
  let project: string;
  try {
    project = realpathSync(cwd);
  } catch {
    return undefined;
  }
  const names = isWindows(platform) && !/\.(exe|cmd|bat)$/i.test(bin)
    ? [`${bin}.exe`, `${bin}.cmd`, `${bin}.bat`]
    : [bin];
  for (const directory of (env['PATH'] ?? env['Path'] ?? '').split(delimiter)) {
    if (!isAbsolute(directory)) continue;
    for (const name of names) {
      const candidate = join(directory, name);
      try {
        if (within(project, realpathSync(candidate))) continue;
        if (!statSync(candidate).isFile()) continue;
        accessSync(candidate, constants.X_OK);
        return candidate;
      } catch {
        continue;
      }
    }
  }
  return undefined;
}
