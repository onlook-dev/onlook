import { closeSync, constants, fchmodSync, fsyncSync, mkdirSync, openSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { isWindows } from './env/platform.js';

function syncDirectory(path: string): void {
  if (isWindows()) return;
  const descriptor = openSync(path, 'r');
  try {
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

export function writeAtomicFile(
  path: string,
  data: string | Buffer,
  options?: { mode?: number },
): void {
  const directory = dirname(path);
  const created = mkdirSync(directory, { recursive: true });
  const temp = `${path}.${String(process.pid)}.tmp`;
  const descriptor = openSync(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW, options?.mode ?? 0o666);
  try {
    try {
      if (options?.mode !== undefined) fchmodSync(descriptor, options.mode);
      writeFileSync(descriptor, data);
      fsyncSync(descriptor);
    } finally {
      closeSync(descriptor);
    }
    renameSync(temp, path);
    syncDirectory(directory);
    if (created !== undefined) {
      const stop = dirname(created);
      let parent = dirname(directory);
      while (parent !== directory) {
        syncDirectory(parent);
        if (parent === stop || parent === dirname(parent)) break;
        parent = dirname(parent);
      }
    }
  } catch (error) {
    rmSync(temp, { force: true });
    throw error;
  }
}

export function removeAtomicFile(path: string): void {
  const directory = dirname(path);
  const prefix = `${basename(path)}.`;
  let names: string[];
  try {
    names = readdirSync(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
  rmSync(path, { force: true });
  for (const name of names) {
    if (name.startsWith(prefix) && name.endsWith('.tmp') && /^\d+$/.test(name.slice(prefix.length, -4))) {
      rmSync(join(directory, name), { force: true });
    }
  }
  syncDirectory(directory);
}
