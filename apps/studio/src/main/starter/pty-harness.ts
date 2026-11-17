import type { Serializable } from 'node:child_process';
import { request } from 'node:http';
import { createServer } from 'node:net';
import type { StarterChildLike, StarterFork } from './runner.js';
import { startChild } from '../env/child.js';

export function nodeFork(children: StarterChildLike[], command: string[] = []): StarterFork & { kills: number } {
  const fork = ((modulePath, options) => {
    const argv = command.length > 0 ? command : [modulePath];
    const child = startChild(process.execPath, argv, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    const like: StarterChildLike = {
      get pid() {
        return child.exitCode === null && child.signalCode === null ? child.pid : undefined;
      },
      stdout: child.stdout,
      stderr: child.stderr,
      on(event, listener) {
        if (event === 'exit') {
          child.on('exit', (code, signal) => (listener as (c: number) => void)(code ?? (signal ? 128 : 0)));
        } else {
          child.on('spawn', listener as () => void);
        }
        return like;
      },
      kill() {
        fork.kills += 1;
        return child.kill('SIGTERM');
      },
      postMessage(message) {
        if (child.connected) child.send(message as Serializable, () => undefined);
      },
    };
    children.push(like);
    return like;
  }) as StarterFork & { kills: number };
  fork.kills = 0;
  return fork;
}

export function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });
}

export async function get(port: number, path: string): Promise<{ status: number; body: string }> {
  const response = await fetch(`http://127.0.0.1:${port}${path}`);
  return { status: response.status, body: await response.text() };
}

// `fetch` refuses to set `Host`; `node:http` does not.
export function getWithHost(port: number, path: string, host: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path, headers: { host } }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on('error', reject);
    req.end();
  });
}
