// Listeners are matched by cwd, not ancestry: a process orphaned to launchd keeps its cwd.

import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';

export interface ListenerFact {
  pid: number;
  ppid: number;
  pgid: number;
  sid: number | undefined;
  port: number;
  cwd: string;
  command: string;
}

function out(command: string, args: string[]): string {
  return spawnSync(command, args, { encoding: 'utf8' }).stdout ?? '';
}

function canonical(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return resolve(path);
  }
}

// macOS `ps -o sess` prints 0 for every process; `os.getsid` asks the kernel.
export function sessionsOf(pids: readonly number[]): Map<number, number> {
  const sids = new Map<number, number>();
  if (pids.length === 0) return sids;
  const script = 'import os,sys\nfor p in sys.argv[1:]:\n  try: print(p, os.getsid(int(p)))\n  except Exception: pass';
  for (const line of out('python3', ['-c', script, ...pids.map(String)]).split('\n')) {
    const [pid, sid] = line.trim().split(/\s+/).map(Number);
    if (pid !== undefined && sid !== undefined && Number.isFinite(pid) && Number.isFinite(sid)) sids.set(pid, sid);
  }
  return sids;
}

/** A killed process reads `Z` or is gone by the time `ps` answers; any other state, running included, is alive. */
export function alive(pid: number): boolean {
  const stat = out('ps', ['-o', 'stat=', '-p', String(pid)]).trim();
  return stat !== '' && !stat.startsWith('Z');
}

export function pidsInSession(sid: number): number[] {
  const all = out('ps', ['-A', '-o', 'pid='])
    .split('\n')
    .map((line) => Number(line.trim()))
    .filter((pid) => Number.isFinite(pid) && pid > 0);
  return [...sessionsOf(all)].filter(([, owner]) => owner === sid).map(([pid]) => pid);
}

export function isUnder(path: string, roots: string | readonly string[]): boolean {
  const target = canonical(path);
  return (typeof roots === 'string' ? [roots] : roots).some((root) => {
    const base = canonical(root);
    return target === base || target.startsWith(base.endsWith(sep) ? base : base + sep);
  });
}

export function listenersUnder(roots: string | readonly string[]): ListenerFact[] {
  const ports = new Map<number, number[]>();
  let pid = 0;
  for (const line of out('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN', '-Fpn']).split('\n')) {
    if (line.startsWith('p')) pid = Number(line.slice(1));
    else if (line.startsWith('n')) {
      const port = Number(/:(\d+)$/.exec(line)?.[1]);
      if (Number.isFinite(port)) ports.set(pid, [...(ports.get(pid) ?? []), port]);
    }
  }
  if (ports.size === 0) return [];
  const cwds = new Map<number, string>();
  for (const line of out('lsof', ['-a', '-d', 'cwd', '-Fn', '-p', [...ports.keys()].join(',')]).split('\n')) {
    if (line.startsWith('p')) pid = Number(line.slice(1));
    else if (line.startsWith('n')) cwds.set(pid, line.slice(1));
  }
  const owners = [...ports.keys()].filter((owner) => {
    const cwd = cwds.get(owner);
    return cwd !== undefined && isUnder(cwd, roots);
  });
  const sids = sessionsOf(owners);
  const found: ListenerFact[] = [];
  for (const owner of owners) {
    const [ppid, pgid, ...command] = out('ps', ['-o', 'ppid=,pgid=,command=', '-p', String(owner)])
      .trim()
      .split(/\s+/);
    for (const port of new Set(ports.get(owner))) {
      found.push({
        pid: owner,
        ppid: Number(ppid),
        pgid: Number(pgid),
        sid: sids.get(owner),
        port,
        cwd: cwds.get(owner) ?? '',
        command: command.join(' '),
      });
    }
  }
  return found;
}

// A cue points away from the agent's own copy; a bare "already up" or "the app's existing dev
// command" is the agent describing what it just started, and does not match.
export const MENTIONS_EXISTING =
  /your (own |other |original )?(dev )?(server|checkout|copy|process|instance)|user[’']s (own )?(checkout|server|copy)|(another|other|a different|the original|the other) (checkout|server|copy|process|instance)|existing (dev )?(server|process|instance)|not (from|in|started from) (this|the) (worktree|checkout|folder|directory)|from (another|a different|the other|your) (checkout|folder|directory|worktree)|untouched|left (it|that|yours|your\b)|leav(e|ing) (it|that|yours|your\b)|(port \d+|something( else)?|a (dev )?server|a process|another process|someone else) (is |was )?already (running|answering|answers|serving|up|in use|taken|occupied|owned|listening)/i;
