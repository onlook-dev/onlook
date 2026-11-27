import type { StarterChildLike, StarterFork } from './runner.js';
import { EventEmitter } from 'node:events';
import { signalGroup, startChild } from '../env/child.js';

const BOOTSTRAP = `import { createInterface } from 'node:readline';
import { EventEmitter } from 'node:events';
import { pathToFileURL } from 'node:url';
const channel = new EventEmitter();
process.parentPort = channel;
process.env.STARTER_PARENT_PID = String(process.ppid);
createInterface({ input: process.stdin }).on('line', (line) => {
  try {
    const data = JSON.parse(line);
    channel.emit('message', { data });
  } catch {}
});
process.stdin.on('end', () => process.exit(3));
await import(pathToFileURL(process.argv[1]).href);`;

export function forkWslStarter(modulePath: string, options: Parameters<StarterFork>[1], launch = startChild): StarterChildLike {
  const child = launch('node', ['--input-type=module', '-e', BOOTSTRAP, modulePath], { cwd: options.cwd, env: options.env, stdio: ['pipe', 'pipe', 'pipe'] });
  const events = new EventEmitter();
  let ended = false;
  const exit = (code: number): void => {
    if (ended) return;
    ended = true;
    events.emit('exit', code);
  };
  child.once('error', () => exit(1));
  child.once('exit', (code) => exit(code ?? 1));
  child.once('spawn', () => events.emit('spawn'));
  child.stdin?.on('error', () => {});
  return {
    runtime: 'wsl',
    get pid() { return child.pid; },
    stdout: child.stdout,
    stderr: child.stderr,
    on(event, listener) {
      events.on(event, listener);
      return this;
    },
    kill() { signalGroup(child, 'SIGKILL', 'signal-child'); return true; },
    postMessage(message) { child.stdin?.write(`${JSON.stringify(message)}\n`); },
  };
}
