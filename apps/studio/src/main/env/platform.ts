import { join } from 'node:path';

export function hostPlatform(): NodeJS.Platform {
  return process.platform;
}

export function isMac(platform: NodeJS.Platform = process.platform): boolean {
  return platform === 'darwin';
}

export function isWindows(platform: NodeJS.Platform = process.platform): boolean {
  return platform === 'win32';
}

export function isLinux(platform: NodeJS.Platform = process.platform): boolean {
  return platform === 'linux';
}

export function systemExecutable(name: string): string {
  return join(process.env['SystemRoot'] ?? 'C:\\Windows', 'System32', name);
}

/** Windows' per-user data folder; `undefined` where the variable is unset. */
export function windowsLocalAppData(): string | undefined {
  return process.env['LOCALAPPDATA'];
}

export function nullDevice(): string {
  return isWindows() ? 'NUL' : '/dev/null';
}

export function hostSshPath(): string {
  return isWindows() ? systemExecutable('OpenSSH/ssh.exe').replaceAll('\\', '/') : '/usr/bin/ssh';
}

export function hostCurlPath(): string {
  return isWindows() ? systemExecutable('curl.exe').replaceAll('\\', '/') : '/usr/bin/curl';
}

export function lsofPath(): string {
  return isLinux() ? '/usr/bin/lsof' : '/usr/sbin/lsof';
}

export function executableName(name: string, platform: NodeJS.Platform = process.platform): string {
  return isWindows(platform) ? `${name}.exe` : name;
}

export function pathSeparator(): string {
  return isWindows() ? '\\' : '/';
}
