import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { Transform } from 'node:stream';
import { StringDecoder } from 'node:string_decoder';
import { type ChildOptions, startChild } from '../env/child.js';
import { type WslProject, wslArgument, wslHostPath, wslProject } from '../env/wsl.js';
import { runCli } from '../env/cli.js';

const PATH_FIELDS = new Set(['cwd', 'cwds', 'path', 'paths', 'file_path', 'filePath', 'absolutePath', 'transcript_path', 'writableRoots', 'writable_roots', 'additionalDirectories']);

const CLAUDE_SESSION = `const fs = require('node:fs');
const path = require('node:path');
const home = process.env.CLAUDE_CONFIG_DIR || path.join(require('node:os').homedir(), '.claude');
const projects = path.join(home, 'projects');
try {
  process.stdout.write(fs.readdirSync(projects).some((entry) => fs.existsSync(path.join(projects, entry, process.argv[1] + '.jsonl'))) ? '1' : '0');
} catch { process.stdout.write('0'); }`;

export async function wslClaudeSessionExists(cwd: string, sessionId: string): Promise<boolean> {
  if (wslProject(cwd) === undefined || !/^[a-z0-9-]+$/i.test(sessionId)) return false;
  const result = await runCli('node', cwd, ['-e', CLAUDE_SESSION, sessionId], { timeoutMs: 5_000, maxBuffer: 1_024 });
  return result.ok && result.out === '1';
}

export function wslProtocolPaths(value: unknown, project: WslProject, direction: 'linux' | 'host', field = ''): unknown {
  if (typeof value === 'string') {
    if (!PATH_FIELDS.has(field)) return value;
    return direction === 'linux' ? wslArgument(project, value) : wslHostPath(project, value);
  }
  if (Array.isArray(value)) return value.map((entry) => wslProtocolPaths(entry, project, direction, field));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, wslProtocolPaths(entry, project, direction, key)]));
  }
  return value;
}

export function wslProtocolStream(project: WslProject, direction: 'linux' | 'host'): Transform {
  let pending = '';
  const decoder = new StringDecoder('utf8');
  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      pending += decoder.write(chunk);
      let newline: number;
      while ((newline = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, newline);
        pending = pending.slice(newline + 1);
        let value: unknown;
        try { value = JSON.parse(line); }
        catch { this.push(`${line}\n`); continue; }
        try { this.push(`${JSON.stringify(wslProtocolPaths(value, project, direction))}\n`); }
        catch (error) { callback(error instanceof Error ? error : new Error(String(error))); return; }
      }
      callback();
    },
    flush(callback) { this.push(pending + decoder.end()); callback(); },
  });
}

export function startWslAgent(bin: string, args: readonly string[], cwd: string, options: Omit<ChildOptions, 'cwd'>): ChildProcessWithoutNullStreams {
  const project = wslProject(cwd);
  if (project === undefined) throw new Error('Expected a WSL project');
  const child = startChild(bin, args, { ...options, cwd, stdio: ['pipe', 'pipe', 'pipe'] }) as ChildProcessWithoutNullStreams;
  const input = wslProtocolStream(project, 'linux');
  input.pipe(child.stdin);
  child.stdin.on('error', () => input.destroy());
  child.stdin = input;
  child.stdout = child.stdout.pipe(wslProtocolStream(project, 'host'));
  return child;
}
