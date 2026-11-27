import { runCli } from './cli.js';
import { wslHostPath, wslProject } from './wsl.js';

const LISTENER = `const fs = require('node:fs');
const port = Number(process.argv[1]);
const inodes = new Set();
for (const table of port > 0 ? ['/proc/net/tcp', '/proc/net/tcp6'] : []) {
  try {
    for (const line of fs.readFileSync(table, 'utf8').trim().split('\\n').slice(1)) {
      const fields = line.trim().split(/\\s+/);
      if (fields[3] === '0A' && parseInt(fields[1].split(':').at(-1), 16) === port) inodes.add('socket:[' + fields[9] + ']');
    }
  } catch {}
}
const matches = [];
for (const pid of fs.readdirSync('/proc').filter((name) => /^\\d+$/.test(name))) {
  try {
    if (port > 0 && !fs.readdirSync('/proc/' + pid + '/fd').some((fd) => {
      try { return inodes.has(fs.readlinkSync('/proc/' + pid + '/fd/' + fd)); } catch { return false; }
    })) continue;
    const stat = fs.readFileSync('/proc/' + pid + '/stat', 'utf8');
    matches.push({ pid: Number(pid), cwd: fs.readlinkSync('/proc/' + pid + '/cwd'), creationTime: stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19] });
  } catch {}
}
process.stdout.write(JSON.stringify(matches));`;

export interface WslProcessIdentity {
  pid: number;
  cwd: string;
  creationTime: string;
}

export async function wslProcesses(cwd: string, port?: number, run = runCli): Promise<WslProcessIdentity[]> {
  const project = wslProject(cwd);
  if (project === undefined || (port !== undefined && (!Number.isInteger(port) || port <= 0 || port > 65535))) return [];
  const result = await run('node', cwd, ['-e', LISTENER, String(port ?? 0)], { timeoutMs: 5_000, maxBuffer: 1024 * 1024 });
  if (!result.ok) return [];
  let matches: unknown;
  try { matches = JSON.parse(result.out); } catch { return []; }
  if (!Array.isArray(matches)) return [];
  return matches.flatMap((identity: Record<string, unknown>) => {
    if (identity === null || typeof identity !== 'object' || typeof identity['pid'] !== 'number' || !Number.isSafeInteger(identity['pid']) || identity['pid'] <= 1 || typeof identity['cwd'] !== 'string' || !identity['cwd'].startsWith('/') || typeof identity['creationTime'] !== 'string' || !/^\d+$/.test(identity['creationTime'])) return [];
    return [{ pid: identity['pid'], cwd: wslHostPath(project, identity['cwd']), creationTime: identity['creationTime'] }];
  });
}

export async function wslListener(cwd: string, port: number): Promise<WslProcessIdentity | undefined> {
  const matches = await wslProcesses(cwd, port);
  return matches.length === 1 ? matches[0] : undefined;
}

const SIGNAL_LISTENER = `const fs = require('node:fs');
const pid = Number(process.argv[1]);
const expected = process.argv[2];
const signal = process.argv[3];
const cwd = process.argv[4];
try {
  const stat = fs.readFileSync('/proc/' + pid + '/stat', 'utf8');
  const actual = stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19];
  if (actual !== expected || fs.readlinkSync('/proc/' + pid + '/cwd') !== cwd) process.exit(1);
  process.kill(pid, signal);
} catch (error) {
  if (error.code !== 'ENOENT' && error.code !== 'ESRCH') process.exit(1);
}`;

export async function signalWslListener(cwd: string, pid: number, signal: NodeJS.Signals, creationTime: string | undefined, listenerCwd = cwd, run = runCli): Promise<void> {
  if (wslProject(cwd) === undefined || !Number.isSafeInteger(pid) || pid <= 1 || !['SIGTERM', 'SIGKILL'].includes(signal) || creationTime === undefined || !/^\d+$/.test(creationTime)) throw new Error('Invalid WSL listener signal');
  const result = await run('node', cwd, ['-e', SIGNAL_LISTENER, String(pid), creationTime, signal, listenerCwd], { timeoutMs: 5_000 });
  if (!result.ok) throw new Error('Could not stop the WSL listener');
}
