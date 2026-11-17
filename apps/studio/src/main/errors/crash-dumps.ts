import { readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CRASH_DUMPS_KEEP = 10;

export function pruneCrashDumps(dir: string, keep: number = CRASH_DUMPS_KEEP): number {
  let files: Array<{ path: string; mtime: number }>;
  try {
    files = readdirSync(dir)
      .map((name) => join(dir, name))
      .flatMap((path) => {
        try {
          const stat = statSync(path);
          return stat.isFile() ? [{ path, mtime: stat.mtimeMs }] : [];
        } catch {
          return [];
        }
      });
  } catch {
    return 0;
  }
  files.sort((a, b) => b.mtime - a.mtime);
  let pruned = 0;
  for (const file of files.slice(keep)) {
    try {
      rmSync(file.path, { force: true });
      pruned += 1;
    } catch {
      // Left for next time.
    }
  }
  return pruned;
}
