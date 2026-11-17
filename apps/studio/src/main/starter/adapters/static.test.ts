import { afterAll, afterEach, describe, expect, test } from 'bun:test';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { freePort } from '../pty-harness.js';
import { READY_LINE_PATTERN, STARTER_SERVER_FILE, writeScaffold } from '../scaffold.js';
import { RELOAD_PATH, STATIC_FILES } from './static.js';

const READY_MS = 10_000;
const ACK_MS = 2_000;
const EXIT_MS = 2_000;
// A reload is debounced 50ms past the delivery the ack already confirmed, so this window covers it.
const QUIET_MS = 400;
const RELOAD_MS = 4_000;
const CASE_MS = READY_MS + ACK_MS + RELOAD_MS + QUIET_MS;

const FS_IMPORT = " from 'node:fs';";

// Re-exports real fs and stubs only watch, so the server's own changed() and denied() run as shipped.
// One line is one batch: every callback runs inside its parsed handler, and the ack follows them.
const FS_SHIM = `import { createReadStream, existsSync, readFileSync, realpathSync, statSync } from 'node:fs';

export { createReadStream, existsSync, readFileSync, realpathSync, statSync };

const modes = [];
let deliver;
// Counted by the server's own callback returning, so an ack can never outrun delivery.
let invoked = 0;

export function watch(root, options, listener) {
  const callback = typeof options === 'function' ? options : listener;
  const recursive = typeof options === 'object' && options !== null && options.recursive === true;
  modes.push(recursive);
  if (recursive && process.env.STUB_RECURSIVE_THROWS === '1') throw new Error('recursive watch unavailable');
  deliver = (event, name) => {
    callback(event, name);
    invoked += 1;
  };
  return { close() {} };
}

process.stdin.setEncoding('utf8');
// The spawn below has no ipc channel, so this eof is the only thing that reaps a child whose runner died.
process.stdin.on('end', () => process.exit(0));
let buffered = '';
process.stdin.on('data', (chunk) => {
  buffered += chunk;
  for (;;) {
    const end = buffered.indexOf('\\n');
    if (end < 0) break;
    const line = buffered.slice(0, end);
    buffered = buffered.slice(end + 1);
    if (line.length === 0) continue;
    const batch = JSON.parse(line);
    const before = invoked;
    for (const one of batch.deliver) {
      if (!deliver) break;
      deliver(one.event ?? 'change', 'name' in one ? one.name : undefined);
    }
    process.stdout.write('ack ' + batch.id + ' ' + JSON.stringify({ delivered: invoked - before, modes }) + '\\n');
  }
});
`;

const workRoot = mkdtempSync(join(tmpdir(), 'static-watch-'));

type Owned = { child: ChildProcess; socket?: WebSocket };
const live = new Set<Owned>();

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function within(done: Promise<void>, ms: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const lapsed = new Promise<boolean>((resolve) => (timer = setTimeout(() => resolve(false), ms)));
  try {
    return await Promise.race([done.then(() => true), lapsed]);
  } finally {
    clearTimeout(timer);
  }
}

async function release(owned: Owned): Promise<void> {
  try {
    owned.socket?.close();
  } catch {
    // a socket that never opened needs no close
  }
  const { child } = owned;
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
  child.kill('SIGTERM');
  if (await within(exited, EXIT_MS)) return;
  child.kill('SIGKILL');
  await within(exited, EXIT_MS);
}

// Released from the set, not from each test, so a failed assertion or readiness wait still frees its child.
afterEach(async () => {
  const owned = [...live];
  live.clear();
  await Promise.all(owned.map((one) => release(one)));
});

afterAll(() => rmSync(workRoot, { recursive: true, force: true }));

function stubbedServer(): string {
  const source = STATIC_FILES[STARTER_SERVER_FILE] ?? '';
  const parts = source.split(FS_IMPORT);
  if (parts.length !== 2) throw new Error('the server no longer has exactly one node:fs import to redirect');
  return parts.join(" from './fs-shim.mjs';");
}

type Name = string | null | undefined;

type Watched = {
  root: string;
  messages: string[];
  deliver: (...names: Name[]) => Promise<void>;
  modes: () => Promise<boolean[]>;
  quiet: () => Promise<string[]>;
  reloads: () => Promise<string[]>;
  alive: () => Promise<boolean>;
};

async function watchedServer(recursiveThrows = false): Promise<Watched> {
  const root = mkdtempSync(join(workRoot, 'project-'));
  writeScaffold(root, { ...STATIC_FILES, [STARTER_SERVER_FILE]: stubbedServer(), 'fs-shim.mjs': FS_SHIM });
  const port = await freePort();
  // No ipc channel, so the heartbeat backstop never arms: the shim's stdin eof is what reaps this child.
  const child = spawn('node', [join(root, STARTER_SERVER_FILE)], {
    cwd: root,
    env: { ...process.env, PORT: String(port), STUB_RECURSIVE_THROWS: recursiveThrows ? '1' : '0' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const owned: Owned = { child };
  live.add(owned);

  let out = '';
  let errors = '';
  let unspawned: string | undefined;
  child.on('error', (error) => (unspawned = `the stubbed server could not spawn: ${error.message}`));
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => (out += chunk));
  child.stderr?.on('data', (chunk: string) => (errors += chunk));

  // Without this every wait below would run to its deadline on a child that died, hiding why.
  function gone(): string | undefined {
    if (unspawned !== undefined) return unspawned;
    if (child.exitCode !== null) return `the stubbed server exited ${String(child.exitCode)}: ${errors}`;
    if (child.signalCode !== null) return `the stubbed server took ${child.signalCode}: ${errors}`;
    return undefined;
  }

  const readyBy = Date.now() + READY_MS;
  while (!READY_LINE_PATTERN.test(out) && gone() === undefined && Date.now() < readyBy) await sleep(10);
  if (!READY_LINE_PATTERN.test(out)) {
    throw new Error(gone() ?? `the stubbed server never reported ready: ${errors}`);
  }

  const socket = new WebSocket(`ws://127.0.0.1:${String(port)}${RELOAD_PATH}`);
  owned.socket = socket;
  const messages: string[] = [];
  socket.addEventListener('message', (event) => messages.push(String(event.data)));
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener('open', () => resolve());
    socket.addEventListener('error', () => reject(new Error('the reload socket did not open')));
  });

  let sent = 0;
  async function batch(names: Name[]): Promise<{ delivered: number; modes: boolean[] }> {
    sent += 1;
    const id = sent;
    const events = names.map((name) => (name === undefined ? {} : { name }));
    child.stdin?.write(`${JSON.stringify({ id, deliver: events })}\n`);
    const pattern = new RegExp(`ack ${String(id)} (\\{.*?\\})\n`);
    const answerBy = Date.now() + ACK_MS;
    while (!pattern.test(out) && gone() === undefined && Date.now() < answerBy) await sleep(5);
    const answer = pattern.exec(out)?.[1];
    if (!answer) throw new Error(gone() ?? `the stub never acknowledged batch ${String(id)}: ${errors}`);
    return JSON.parse(answer) as { delivered: number; modes: boolean[] };
  }

  return {
    root,
    messages,
    deliver: async (...names) => {
      const { delivered } = await batch(names);
      if (delivered !== names.length) {
        throw new Error(`the watch callback ran ${String(delivered)} of ${String(names.length)} times`);
      }
    },
    modes: async () => (await batch([])).modes,
    quiet: async () => {
      await sleep(QUIET_MS);
      return [...messages];
    },
    reloads: async () => {
      const by = Date.now() + RELOAD_MS;
      while (messages.length === 0 && Date.now() < by) await sleep(5);
      await sleep(QUIET_MS);
      return [...messages];
    },
    alive: async () => {
      const by = Date.now() + RELOAD_MS;
      while (!messages.includes('reload') && Date.now() < by) await sleep(5);
      return messages.includes('reload');
    },
  };
}

describe('the generated static server watcher, on delivery it controls', () => {
  test('the stub redirects exactly one import', () => {
    expect((STATIC_FILES[STARTER_SERVER_FILE] ?? '').split(FS_IMPORT).length).toBe(2);
    expect(stubbedServer()).toContain("from './fs-shim.mjs';");
  });

  test(
    'takes the recursive watch, which does not throw',
    async () => {
      const server = await watchedServer();
      expect(await server.modes()).toEqual([true]);
    },
    CASE_MS,
  );

  test(
    'sends no reload for an event with no filename',
    async () => {
      const server = await watchedServer();
      await server.deliver(undefined, null);
      expect(await server.quiet()).toEqual([]);
      // The control every absence window needs: an empty window must mean the guards returned, not a dead socket.
      await server.deliver('main.js');
      expect(await server.alive()).toBe(true);
    },
    CASE_MS,
  );

  test(
    'sends no reload for an event naming the worktree itself',
    async () => {
      const server = await watchedServer();
      await server.deliver(basename(server.root));
      expect(await server.quiet()).toEqual([]);
      await server.deliver('main.js');
      expect(await server.alive()).toBe(true);
    },
    CASE_MS,
  );

  test(
    'sends no reload for a change under .git or node_modules, or to a dotfile',
    async () => {
      const server = await watchedServer();
      await server.deliver('.git/index', join('node_modules', 'pkg', 'index.js'), '.env');
      expect(await server.quiet()).toEqual([]);
      await server.deliver('main.js');
      expect(await server.alive()).toBe(true);
    },
    CASE_MS,
  );

  test(
    'sends one reload for a named page edit',
    async () => {
      const server = await watchedServer();
      await server.deliver('main.js');
      expect(await server.reloads()).toEqual(['reload']);
    },
    CASE_MS,
  );

  test(
    'an ignored event does not cancel a reload already pending',
    async () => {
      const server = await watchedServer();
      await server.deliver(
        'main.js',
        '.git/index',
        join('node_modules', 'pkg', 'index.js'),
        basename(server.root),
        null,
      );
      expect(await server.reloads()).toEqual(['reload']);
    },
    CASE_MS,
  );

  test(
    'a recursive watch that throws falls back, and the fallback still reloads a page edit',
    async () => {
      const server = await watchedServer(true);
      expect(await server.modes()).toEqual([true, false]);
      await server.deliver('main.js');
      expect(await server.reloads()).toEqual(['reload']);
    },
    CASE_MS,
  );

  test(
    'the fallback watch sends no reload for an ignored or unattributable change',
    async () => {
      const server = await watchedServer(true);
      expect(await server.modes()).toEqual([true, false]);
      await server.deliver(
        '.git/index',
        join('node_modules', 'pkg', 'index.js'),
        basename(server.root),
        null,
        undefined,
      );
      expect(await server.quiet()).toEqual([]);
      await server.deliver('main.js');
      expect(await server.alive()).toBe(true);
    },
    CASE_MS,
  );

  test(
    'the fallback watch keeps a pending reload through an ignored event',
    async () => {
      const server = await watchedServer(true);
      expect(await server.modes()).toEqual([true, false]);
      await server.deliver(
        'main.js',
        join('node_modules', 'pkg', 'index.js'),
        '.git/index',
        basename(server.root),
        null,
      );
      expect(await server.reloads()).toEqual(['reload']);
    },
    CASE_MS,
  );
});
