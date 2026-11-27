import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'bun:test';
import { forkWslStarter } from './wsl.js';
import type { ChildOptions, startChild } from '../env/child.js';

describe('a starter and its watcher inside WSL', () => {
  it('runs the module with Linux node and transfers heartbeats over stdin instead of Electron IPC', () => {
    const stdin = new PassThrough();
    let messages = '';
    stdin.on('data', (chunk: Buffer) => { messages += chunk.toString(); });
    const child = Object.assign(new EventEmitter(), { pid: 1234, stdin, stdout: new PassThrough(), stderr: new PassThrough(), kill: () => true }) as unknown as ChildProcess;
    const calls: { bin: string; args: readonly string[]; options: ChildOptions }[] = [];
    const launch = ((bin: string, args: readonly string[], options: ChildOptions) => {
      calls.push({ bin, args, options });
      return child;
    }) as typeof startChild;
    const folder = '\\\\wsl.localhost\\ubuntu\\home\\developer\\project';
    const starter = forkWslStarter(`${folder}\\server.mjs`, { cwd: folder, env: { PORT: '3000' }, serviceName: 'starter' }, launch);
    starter.postMessage({ type: 'heartbeat', windowMs: 5000 });
    expect(calls[0]!.bin).toBe('node');
    expect(calls[0]!.options.cwd).toBe(folder);
    expect(calls[0]!.args.at(-1)).toBe(`${folder}\\server.mjs`);
    expect(calls[0]!.args[2]).toContain('process.stdin');
    expect(calls[0]!.args[2]).toContain('process.env.STARTER_PARENT_PID = String(process.ppid)');
    expect(calls[0]!.args[2]).toContain('process.exit(3)');
    expect(messages).toBe('{"type":"heartbeat","windowMs":5000}\n');
    expect(starter.runtime).toBe('wsl');
    const exits: number[] = [];
    starter.on('exit', (code) => exits.push(code));
    child.emit('error', new Error('synthetic failure'));
    child.emit('exit', 1);
    expect(exits).toEqual([1]);
  });
});
