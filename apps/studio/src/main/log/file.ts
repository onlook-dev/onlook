// Appended synchronously so the moments before a kill are on disk; mode 0600
// because the ids and error detail are not another local account's (ONL-2347).

import { appendFileSync, chmodSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const LOG_FILE_NAME = 'studio.log';
const LOG_MAX_BYTES = 2 * 1024 * 1024;
const LOG_HISTORY = 2;

export interface LogFile {
  append(line: string): void;
  readonly path: string;
}

export function createLogFile(dir: string, options: { maxBytes?: number; history?: number } = {}): LogFile {
  const maxBytes = options.maxBytes ?? LOG_MAX_BYTES;
  const history = options.history ?? LOG_HISTORY;
  const path = join(dir, LOG_FILE_NAME);
  let size: number | undefined;
  let dirReady = false;

  const currentSize = (): number => {
    if (size !== undefined) return size;
    try {
      size = statSync(path).size;
    } catch {
      size = 0;
    }
    return size;
  };

  const rotate = (): void => {
    try {
      rmSync(`${path}.${String(history)}`, { force: true });
      for (let n = history - 1; n >= 1; n -= 1) {
        const from = `${path}.${String(n)}`;
        if (existsSync(from)) renameSync(from, `${path}.${String(n + 1)}`);
      }
      if (existsSync(path)) renameSync(path, `${path}.1`);
    } catch {
      // Swallowed: a failed rotation leaves the current file growing.
    }
    size = 0;
  };

  return {
    path,
    append(line: string): void {
      try {
        if (!dirReady) {
          mkdirSync(dir, { recursive: true });
          dirReady = true;
        }
        const bytes = Buffer.byteLength(line, 'utf8');
        if (currentSize() > 0 && currentSize() + bytes > maxBytes) rotate();
        const fresh = currentSize() === 0 && !existsSync(path);
        appendFileSync(path, line, { encoding: 'utf8', mode: 0o600 });
        // `appendFileSync`'s mode applies only when it creates the file.
        if (fresh) chmodSync(path, 0o600);
        size = currentSize() + bytes;
      } catch {
        // Swallowed: unwritable or the directory went away; the next append re-makes it.
        dirReady = false;
      }
    },
  };
}
