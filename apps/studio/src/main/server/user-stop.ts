import { canonicalPath } from '../lib/canonical-path.js';

interface StopIntent {
  all: boolean;
  folders: Set<string>;
  ports: Set<number>;
}

const stoppedFolders = new Map<string, StopIntent>();
let onStop: ((worktree: string) => void) | undefined;

export function observeServerStop(listener: (worktree: string) => void): void {
  onStop = listener;
}

export function noteServerStop(worktree: string, folders?: readonly string[], ports: readonly number[] = []): void {
  const key = canonicalPath(worktree);
  const stopped = folders === undefined ? { all: true, folders: new Set<string>(), ports: new Set<number>() }
    : stoppedFolders.get(key) ?? { all: false, folders: new Set<string>(), ports: new Set<number>() };
  for (const folder of folders ?? []) {
    if (stopped.all) stopped.folders.delete(canonicalPath(folder));
    else stopped.folders.add(canonicalPath(folder));
  }
  for (const port of ports) {
    if (stopped.all) stopped.ports.delete(port);
    else stopped.ports.add(port);
  }
  if (!stopped.all && stopped.folders.size === 0 && stopped.ports.size === 0) return;
  stoppedFolders.set(key, stopped);
  onStop?.(worktree);
}

export function noteServerStart(worktree: string, folders?: readonly string[], ports: readonly number[] = []): void {
  const key = canonicalPath(worktree);
  if (folders === undefined) {
    stoppedFolders.delete(key);
    return;
  }
  const stopped = stoppedFolders.get(key);
  if (stopped === undefined) return;
  for (const folder of folders) {
    if (stopped.all) stopped.folders.add(canonicalPath(folder));
    else stopped.folders.delete(canonicalPath(folder));
  }
  for (const port of ports) {
    if (stopped.all) stopped.ports.add(port);
    else stopped.ports.delete(port);
  }
  if (!stopped.all && stopped.folders.size === 0 && stopped.ports.size === 0) stoppedFolders.delete(key);
}

export function serverWasStopped(worktree: string, endpoints?: readonly { folder: string; port: number }[]): boolean {
  const stopped = stoppedFolders.get(canonicalPath(worktree));
  if (stopped === undefined) return false;
  return endpoints === undefined || endpoints.some(({ folder, port }) => stopped.all
    ? !stopped.folders.has(canonicalPath(folder)) || !stopped.ports.has(port)
    : stopped.folders.has(canonicalPath(folder)) || stopped.ports.has(port));
}

export function serverStopContext(worktree: string, context?: string): string | undefined {
  const stopped = stoppedFolders.get(canonicalPath(worktree));
  if (stopped === undefined) return context;
  const scope = stopped.all
    ? `all project servers${stopped.folders.size === 0 ? '' : `. Only servers with both a restarted folder (${[...stopped.folders].join(', ')}) and a restarted port (${[...stopped.ports].join(', ')}) may run`}`
    : `these server folders: ${[...stopped.folders].join(', ')} and ports: ${[...stopped.ports].join(', ')}`;
  return [context, `The user pressed Stop for ${scope}. ` +
    'This was intentional, not a crash. Do not restart them or repair their stopped state. ' +
    'Leave them stopped until the user presses Start. Do not resume work because a background task exited.'].filter(Boolean).join('\n\n');
}
