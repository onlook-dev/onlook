import { execFile } from 'node:child_process';
import { hostPlatform, isWindows, systemExecutable } from './platform.js';

export function executableCommand(bin: string, args: string[], platform: NodeJS.Platform = hostPlatform()): {
  bin: string; args: string[]; windowsVerbatimArguments?: boolean;
} {
  if (!isWindows(platform) || !/\.(cmd|bat)$/i.test(bin)) return { bin, args };
  if ([bin, ...args].some((value) => /[%"\r\n]/.test(value))) throw new Error('Cannot safely launch a batch file with percent signs, quotes or newlines in its arguments.');
  const command = [bin, ...args].map((value) => `"${value}"`).join(' ');
  return { bin: systemExecutable('cmd.exe'), args: ['/d', '/s', '/v:off', '/c', `"${command}"`], windowsVerbatimArguments: true };
}

export async function terminateWindowsTree(pid: number): Promise<void> {
  if (!Number.isSafeInteger(pid) || pid <= 1 || pid === process.pid) throw new Error('Refusing to terminate an invalid process tree');
  await new Promise<void>((resolve, reject) => {
    execFile(systemExecutable('taskkill.exe'), ['/PID', String(pid), '/T', '/F'], {
      timeout: 5_000, encoding: 'utf8', windowsHide: true,
    }, (error) => {
      if (error && (error as { code?: string | number }).code !== 128) reject(error);
      else resolve();
    });
  });
}
