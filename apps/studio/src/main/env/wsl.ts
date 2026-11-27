import { posix } from 'node:path';
import { hostPlatform, systemExecutable } from './platform.js';
import { flagOn } from '../flags/index.js';

export interface WslProject {
  distro: string;
  linuxPath: string;
  hostPath: string;
}

export function wslProject(path: string | undefined, platform: NodeJS.Platform = hostPlatform(), enabled?: boolean): WslProject | undefined {
  if (platform !== 'win32' || path === undefined || !/^(?:\\\\\?\\UNC\\|\\\\|\/\/)(?:wsl\$|wsl\.localhost)[\\/]/i.test(path)) return undefined;
  return (enabled ?? flagOn('wsl-projects')) ? parseWslPath(path) : undefined;
}

function parseWslPath(path: string): WslProject | undefined {
  const match = /^(?:\\\\\?\\UNC\\|\\\\|\/\/)(?:wsl\$|wsl\.localhost)[\\/]([^\\/]+)([\\/].*)?$/i.exec(path);
  if (match === null) return undefined;
  const distro = match[1]!.toLowerCase();
  if (distro === '.' || distro === '..' || /[<>:"|?*\0\r\n]/.test(distro) || /[\0\r\n]/.test(path)) throw new Error('Invalid WSL project path');
  const linuxPath = posix.normalize((match[2] ?? '/').replaceAll('\\', '/'));
  return { distro, linuxPath, hostPath: `\\\\wsl.localhost\\${distro}${linuxPath === '/' ? '\\' : linuxPath.replaceAll('/', '\\')}` };
}

export function wslHostPath(project: WslProject, path: string): string {
  if (!path.startsWith('/')) return path;
  return `\\\\wsl.localhost\\${project.distro}${posix.normalize(path).replaceAll('/', '\\')}`;
}

export function wslWorktreeRoot(project: WslProject): string {
  const segments = project.linuxPath.split('/');
  const existing = segments.lastIndexOf('.onlook-worktrees');
  const root = existing < 0 ? posix.join(posix.dirname(project.linuxPath), '.onlook-worktrees') : segments.slice(0, existing + 1).join('/');
  return wslHostPath(project, root);
}

export function wslWorktreePath(project: WslProject, bucket: string, name: string): string {
  return `${wslWorktreeRoot(project)}\\${bucket}\\${name}`;
}

export function wslArgument(project: WslProject, value: string): string {
  const mapped = parseWslPath(value);
  if (mapped !== undefined) {
    if (mapped.distro !== project.distro) throw new Error('A WSL process cannot use a path from another distribution');
    return mapped.linuxPath;
  }
  const equals = value.indexOf('=');
  if (equals >= 0 && parseWslPath(value.slice(equals + 1)) !== undefined) {
    return value.slice(0, equals + 1) + wslArgument(project, value.slice(equals + 1));
  }
  return value;
}

const HOST_VARIABLES = new Set([
  'PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL', 'PWD', 'OLDPWD', 'TMP', 'TEMP', 'TMPDIR',
  'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'APPDATA', 'LOCALAPPDATA', 'PROGRAMDATA',
  'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATHEXT', 'WSLENV', 'WSL_DISTRO_NAME', 'WSL_INTEROP',
  'NODE_OPTIONS', 'NODE_PATH', 'NODE_CHANNEL_FD', 'ELECTRON_RUN_AS_NODE', 'ELECTRON_NO_ASAR',
]);

const linuxEnvironments = new Map<string, NodeJS.ProcessEnv>();

export function rememberWslEnvironment(distro: string, environment: NodeJS.ProcessEnv | undefined): void {
  if (environment === undefined) linuxEnvironments.delete(distro);
  else linuxEnvironments.set(distro, { ...environment });
}

export function wslEnvironment(project: WslProject, built: NodeJS.ProcessEnv, unset: readonly string[] = []): NodeJS.ProcessEnv {
  const env = { ...built };
  const names: string[] = [];
  const portable: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(built)) {
    if (value === undefined || HOST_VARIABLES.has(name.toUpperCase()) || !/^[a-z_][a-z0-9_]*$/i.test(name)) continue;
    if (/^[a-z]:[\\/]/i.test(value)) continue;
    portable[name] = wslArgument(project, value);
  }
  const linux = linuxEnvironments.get(project.distro);
  for (const [name, value] of Object.entries({ ...linux, ...portable })) {
    if (value === undefined || unset.includes(name) || !/^[a-z_][a-z0-9_]*$/i.test(name) || ['WSLENV', 'WSL_INTEROP', 'WSL_DISTRO_NAME', 'NODE_CHANNEL_FD'].includes(name.toUpperCase())) continue;
    env[name] = value;
    names.push(`${name}/u`);
  }
  for (const name of unset) delete env[name];
  env['WSLENV'] = names.join(':');
  return env;
}

export interface WslCommand {
  bin: string;
  args: string[];
}

export const WSL_EXEC_SCRIPT = `printf '%s%s\\n' "$1" "$$" >&2 || exit 125
shift
project=$(pwd -P)
trusted=
saved_ifs=$IFS
IFS=:
set -f
for directory in $PATH; do
  case "$directory" in /*) ;; *) continue ;; esac
  physical=$(CDPATH= cd -- "$directory" 2>/dev/null && pwd -P) || continue
  case "$physical" in "$project"|"$project"/*) continue ;; esac
  trusted="$trusted:$physical"
done
IFS=$saved_ifs
PATH=\${trusted#:}
export PATH
candidate=$(command -v "$1") || exit 127
physical=$(/usr/bin/readlink -f -- "$candidate") || exit 126
case "$physical" in "$project"|"$project"/*) exit 126 ;; esac
exec "$@"`;

export function wslLaunch(project: WslProject, bin: string, args: readonly string[], marker: string): WslCommand {
  if (/^[a-z]:[\\/]/i.test(bin)) throw new Error('Install the command inside the WSL distribution');
  return {
    bin: systemExecutable('wsl.exe'),
    args: ['-d', project.distro, '--cd', project.linuxPath, '--exec', '/usr/bin/setsid', '--wait', '--', '/bin/sh', '-c', WSL_EXEC_SCRIPT, 'onlook-wsl', marker, wslArgument(project, bin), ...args.map((arg) => wslArgument(project, arg))],
  };
}

export function wslStop(project: WslProject, group: number, signal: NodeJS.Signals): WslCommand {
  if (!Number.isSafeInteger(group) || group <= 1) throw new Error('Refusing to signal an invalid WSL process group');
  if (!['SIGTERM', 'SIGKILL', 'SIGINT', 'SIGHUP'].includes(signal)) throw new Error('Unsupported WSL process signal');
  return { bin: systemExecutable('wsl.exe'), args: ['-d', project.distro, '--cd', '/', '--exec', '/bin/kill', '-s', signal.slice(3), '--', `-${group}`] };
}
