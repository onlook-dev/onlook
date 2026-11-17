// `*.pty.ts`: the child is `process.execPath`, which under `bun test` would be Bun.

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { connect, createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { createStarterRunner, DEFAULT_STARTER_TIMING, type StarterChildLike, type StarterFork, type StarterRunner } from './runner.js';
import { RELOAD_CLIENT_HTML, RELOAD_PATH, STATIC_FILES, writeStaticServer } from './adapters/static.js';
import { freePort, get, getWithHost, nodeFork as forkWith } from './pty-harness.js';
import { STARTER_SERVER_FILE, writeScaffold } from './scaffold.js';
import { createWorkActivity } from '../background-work/activity.js';

// Canonical: `running()` returns keys, compared to the paths spawned here.
const workDir = realpathSync.native(mkdtempSync(join(tmpdir(), 'starter-runner-')));
const children: StarterChildLike[] = [];
const runners: StarterRunner[] = [];
after(() => {
  for (const runner of runners) runner.dispose();
  for (const child of children) child.kill();
  rmSync(workDir, { recursive: true, force: true });
});

const DEADLINE_MS = 10_000;
// macOS replays events that predate the watch and can deliver them seconds late under load; each wait
// below fails at its own bound, so the watcher tests' timeouts clear the sum of theirs (ONL-2943).
const WATCH_DEADLINE_MS = 20_000;
// Longer than the server's 50ms reload debounce, so every edit can still fire its own reload.
const WATCH_WRITE_MS = 250;
const WATCH_QUIET_MS = 2_000;
const nodeFork = (command?: string[]): StarterFork & { kills: number } => forkWith(children, command);

it('keeps the starter alive through background and battery heartbeat cadence transitions', async () => {
  const dir = scaffoldDir('background-heartbeats');
  const activity = createWorkActivity();
  const runner = createStarterRunner({
    fork: nodeFork(), env: async () => ({ ...process.env }) as Record<string, string>, pickPort: freePort, activity,
    timing: { heartbeatMs: 20, heartbeatWindowMs: 100, readyMs: 10_000 },
  });
  runners.push(runner);
  try {
    const port = await runner.spawn(dir);
    activity.update({ focused: false });
    await sleep(350);
    assert.equal((await get(port, '/')).status, 200);
    activity.update({ focused: true, onBattery: true });
    await sleep(350);
    assert.equal((await get(port, '/')).status, 200);
    activity.update({ onBattery: false });
    await sleep(150);
    assert.equal((await get(port, '/')).status, 200);
  } finally {
    await runner.stop(dir);
  }
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function until(what: string, check: () => boolean | Promise<boolean>, ms = DEADLINE_MS): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < ms) {
    if (await check()) return;
    await sleep(25);
  }
  assert.fail(`timed out waiting for ${what}`);
}

function alive(pid: number | undefined): boolean {
  if (pid === undefined) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function scaffoldDir(name: string): string {
  const dir = join(workDir, name);
  mkdirSync(dir, { recursive: true });
  writeScaffold(dir, STATIC_FILES);
  return dir;
}

type ReloadClient = { socket: WebSocket; messages: string[]; closed: Promise<CloseEvent> };

async function reloadClient(port: number): Promise<ReloadClient> {
  const socket = new WebSocket(`ws://127.0.0.1:${port}${RELOAD_PATH}`);
  const messages: string[] = [];
  socket.addEventListener('message', (event) => messages.push(String(event.data)));
  const closed = new Promise<CloseEvent>((resolve) => socket.addEventListener('close', resolve));
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener('open', () => resolve());
    socket.addEventListener('error', () => reject(new Error('the reload socket did not open')));
  });
  return { socket, messages, closed };
}

// An edit every WATCH_WRITE_MS until one lands: macOS drops watch events outright under load, and one
// edit per multi-second attempt bought too few chances to survive a loaded gate (ONL-2943).
async function pageReload(dir: string, client: ReloadClient, what: string): Promise<void> {
  const started = Date.now();
  client.messages.length = 0;
  while (Date.now() - started < WATCH_DEADLINE_MS) {
    writeFileSync(join(dir, 'main.js'), `// ${String(Date.now())}\n`);
    await sleep(WATCH_WRITE_MS);
    if (client.messages.includes('reload')) {
      client.messages.length = 0;
      return;
    }
  }
  assert.fail(`timed out waiting for ${what}`);
}

// macOS replay has no bound on how late it is, so two quiet windows are a heuristic drain, not a drained
// watcher: the discriminating absence claims are in adapters/static.test.ts (ONL-2943).
async function settleWatcher(client: ReloadClient): Promise<void> {
  const started = Date.now();
  let quiet = 0;
  while (quiet < 2) {
    if (Date.now() - started > WATCH_DEADLINE_MS) assert.fail('the watcher never went quiet');
    client.messages.length = 0;
    await sleep(WATCH_QUIET_MS);
    quiet = client.messages.length === 0 ? quiet + 1 : 0;
  }
}

function runnerWith(fork: StarterFork, port: () => Promise<number>, timing = {}, modulePath?: (worktree: string) => string): StarterRunner {
  const runner = createStarterRunner({
    fork,
    ...(modulePath === undefined ? {} : { modulePath }),
    env: async () => ({ PATH: process.env['PATH'] ?? '' }),
    pickPort: port,
    timing: { heartbeatMs: 100, heartbeatWindowMs: 2_000, ...timing },
    log: () => undefined,
  });
  runners.push(runner);
  return runner;
}

describe('starter runner against a real child', () => {
  it('spawns, reports the bound port from the ready line, and serves the page', async () => {
    const dir = scaffoldDir('serves');
    const runner = runnerWith(nodeFork(), freePort);
    const port = await runner.spawn(dir);
    assert.equal(runner.portFor(dir), port);
    assert.equal(runner.isPresent(dir), true);
    assert.deepEqual(runner.running(), [dir]);

    const index = await get(port, '/');
    assert.equal(index.status, 200);
    assert.equal(index.body, readFileSync(join(dir, 'index.html'), 'utf8').replace('</body>', `${RELOAD_CLIENT_HTML}</body>`));
    writeFileSync(join(dir, 'bare.html'), '<p>bare</p>');
    assert.equal((await get(port, '/bare.html')).body, `<p>bare</p>${RELOAD_CLIENT_HTML}`);
    assert.equal((await get(port, '/style.css')).status, 200);
    assert.equal((await get(port, '/main.js')).status, 200);
    assert.equal((await get(port, '/nope.html')).status, 404);

    assert.equal(await runner.spawn(dir), port);
    await runner.stop(dir);
    assert.equal(runner.portFor(dir), undefined);
    assert.deepEqual(runner.running(), []);
  });

  it('keys a worktree by its real path, so a symlinked spelling finds the same child', async () => {
    const dir = scaffoldDir('symlinked');
    const link = join(workDir, 'symlinked-link');
    symlinkSync(dir, link);
    const runner = runnerWith(nodeFork(), freePort);
    const port = await runner.spawn(dir);
    assert.equal(runner.portFor(link), port);
    assert.equal(await runner.spawn(link), port);
    assert.deepEqual(runner.running(), [dir]);
    await runner.stop(link);
    assert.equal(runner.portFor(dir), undefined);
  });

  it('never serves a path outside the root or a dotfile', async () => {
    const dir = scaffoldDir('contained');
    const secret = 'STARTER-SECRET-VALUE';
    writeFileSync(join(workDir, 'outside.txt'), secret);
    writeFileSync(join(dir, '.env'), `TOKEN=${secret}\n`);
    writeFileSync(join(dir, '.env.local'), `TOKEN=${secret}\n`);
    mkdirSync(join(dir, '.git'), { recursive: true });
    writeFileSync(join(dir, '.git', 'HEAD'), secret);
    mkdirSync(join(dir, 'node_modules', 'pkg'), { recursive: true });
    writeFileSync(join(dir, 'node_modules', 'pkg', 'index.js'), secret);
    symlinkSync(join(dir, '.env'), join(dir, 'env-alias.txt'));
    const runner = runnerWith(nodeFork(), freePort);
    const port = await runner.spawn(dir);

    for (const path of [
      '/../outside.txt',
      '/%2e%2e/outside.txt',
      '/..%2foutside.txt',
      '/.env',
      '/.env.local',
      '/.git/HEAD',
      '/sub/../.env',
      '/node_modules/pkg/index.js',
      '/env-alias.txt',
    ]) {
      const { status, body } = await get(port, path);
      assert.equal(status, 404, `${path} answered ${status}`);
      assert.doesNotMatch(body, new RegExp(secret), `${path} leaked the file`);
    }
    writeFileSync(join(dir, 'public.txt'), 'visible');
    assert.equal((await get(port, '/public.txt')).body, 'visible');
    await runner.stop(dir);
  });

  it('never follows a symlink inside the root to a file outside it', async () => {
    const dir = scaffoldDir('symlink-escape');
    const secret = 'STARTER-SYMLINK-SECRET';
    writeFileSync(join(workDir, 'escape-target.txt'), secret);
    symlinkSync(join(workDir, 'escape-target.txt'), join(dir, 'escape.txt'));
    const runner = runnerWith(nodeFork(), freePort);
    const port = await runner.spawn(dir);

    const { status, body } = await get(port, '/escape.txt');
    assert.equal(status, 404, `the escaping symlink answered ${status}`);
    assert.doesNotMatch(body, new RegExp(secret), 'the symlink target leaked');
    writeFileSync(join(dir, 'inside.txt'), 'inside');
    symlinkSync(join(dir, 'inside.txt'), join(dir, 'inside-link.txt'));
    assert.equal((await get(port, '/inside-link.txt')).body, 'inside');
    await runner.stop(dir);
  });

  it('answers 403 to a foreign Host header and 200 to a local one', async () => {
    const dir = scaffoldDir('host');
    const runner = runnerWith(nodeFork(), freePort);
    const port = await runner.spawn(dir);

    const foreign = await getWithHost(port, '/', 'evil.example');
    assert.equal(foreign.status, 403);
    assert.equal(foreign.body.includes(readFileSync(join(dir, 'index.html'), 'utf8')), false);
    assert.equal((await getWithHost(port, '/', 'evil.example:' + port)).status, 403);
    assert.equal((await getWithHost(port, '/', `127.0.0.1:${port}`)).status, 200);
    assert.equal((await getWithHost(port, '/', `LocalHost:${port}`)).status, 200);
    assert.equal((await getWithHost(port, '/', `[::1]:${port}`)).status, 200);
    await runner.stop(dir);
  });

  it('answers the retired SSE path with 204, holding no connection open', async () => {
    const dir = scaffoldDir('retired-sse');
    const runner = runnerWith(nodeFork(), freePort);
    const port = await runner.spawn(dir);

    const response = await fetch(`http://127.0.0.1:${port}${RELOAD_PATH}`);
    assert.equal(response.status, 204);
    assert.equal(await response.text(), '');
    await runner.stop(dir);
  });

  it('survives a reload client that vanishes without a clean close', async () => {
    const dir = scaffoldDir('socket-gone');
    const runner = runnerWith(nodeFork(), freePort);
    const port = await runner.spawn(dir);
    const pid = children.at(-1)?.pid;

    const socket = connect(port, '127.0.0.1');
    let received = '';
    socket.on('data', (chunk) => (received += chunk.toString()));
    socket.write(
      `GET ${RELOAD_PATH} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n` +
        `Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n`,
    );
    await until('the WebSocket handshake', () => received.includes('101 Switching Protocols'));
    socket.destroy();

    await sleep(200);
    writeFileSync(join(dir, 'main.js'), '// edited after the client vanished\n');
    // Past the 50ms broadcast debounce, with room for a crash to land.
    await sleep(500);
    assert.equal(alive(pid), true, 'the child died broadcasting to a vanished client');
    assert.equal((await get(port, '/')).status, 200);
    await runner.stop(dir);
  });

  // 4x: spawn's ready bound, settleWatcher and pageReload each cost up to WATCH_DEADLINE_MS of their own.
  it('delivers a reload over a WebSocket when a page file changes, and answers the close', { timeout: 4 * WATCH_DEADLINE_MS }, async () => {
    const dir = scaffoldDir('reload');
    const runner = runnerWith(nodeFork(), freePort);
    const port = await runner.spawn(dir);

    const client = await reloadClient(port);
    // Drained first, so the reload below is this edit's and not the replayed scaffold writes' (ONL-2943).
    await settleWatcher(client);
    await pageReload(dir, client, 'a reload message');
    client.socket.close();
    assert.equal((await client.closed).wasClean, true);
    await runner.stop(dir);
  });

  it('sends no reload for a change under .git or node_modules, or for one it cannot attribute to a file', { timeout: 5 * WATCH_DEADLINE_MS }, async () => {
    const dir = scaffoldDir('reload-ignored');
    mkdirSync(join(dir, '.git'), { recursive: true });
    mkdirSync(join(dir, 'node_modules', 'pkg'), { recursive: true });
    const runner = runnerWith(nodeFork(), freePort);
    const port = await runner.spawn(dir);

    const client = await reloadClient(port);
    await pageReload(dir, client, 'the watcher to deliver a page edit');
    await settleWatcher(client);

    // Each change repeats because macOS drops watch events: the claim needs one of them delivered,
    // and no page file is touched, so any reload at all breaks it.
    const deadline = Date.now() + WATCH_QUIET_MS;
    while (Date.now() < deadline) {
      writeFileSync(join(dir, '.git', 'index'), `index ${String(Date.now())}\n`);
      writeFileSync(join(dir, 'node_modules', 'pkg', 'index.js'), `// installed ${String(Date.now())}\n`);
      // Names the worktree itself, the one event shape an ignored-segment check cannot read.
      utimesSync(dir, new Date(), new Date());
      await sleep(50);
    }
    await sleep(WATCH_QUIET_MS);
    assert.deepEqual(client.messages, [], 'a change under .git or node_modules, or one naming the worktree itself, reloaded the page, or the OS replayed a page edit into this window');

    await pageReload(dir, client, 'a reload message for a page file');
    client.socket.close();
    await client.closed;
    await runner.stop(dir);
  });

  it("runs the server it is given against the worktree, so a project an older build scaffolded gets today's reload", async () => {
    const dir = scaffoldDir('older-build');
    writeFileSync(join(dir, STARTER_SERVER_FILE), readFileSync(join(import.meta.dirname, 'fixtures', 'static-server-2026-08-28.mjs.txt'), 'utf8'));
    const current = writeStaticServer(join(workDir, 'studio-copy'));
    const runner = runnerWith(nodeFork(), freePort, {}, () => current);
    const port = await runner.spawn(dir);

    assert.equal((await get(port, '/')).body.includes(RELOAD_CLIENT_HTML), true);
    assert.equal((await fetch(`http://127.0.0.1:${port}${RELOAD_PATH}`)).status, 204);
    await runner.stop(dir);
  });

  it('reports failure and leaks no process when the port is already bound', { timeout: 2 * DEADLINE_MS }, async (t) => {
    const dir = scaffoldDir('bound');
    const port = await freePort();
    const blocker = createServer();
    await new Promise<void>((resolve) => blocker.listen(port, '127.0.0.1', resolve));
    t.after(() => new Promise<void>((resolve) => blocker.close(() => resolve())));
    const fork = nodeFork();
    const runner = runnerWith(fork, async () => port);
    const started = Date.now();
    await assert.rejects(runner.spawn(dir));
    assert.ok(Date.now() - started < DEFAULT_STARTER_TIMING.readyMs, 'a child that died waited out the ready bound');
    assert.equal(runner.portFor(dir), undefined);
    assert.equal(alive(children.at(-1)?.pid), false);
  });

  it('kills a child that never prints the ready line, within the bound', { timeout: 2 * DEADLINE_MS }, async () => {
    const dir = scaffoldDir('silent');
    const fork = nodeFork(['-e', 'setInterval(() => {}, 1000)']);
    const runner = runnerWith(fork, freePort, { readyMs: 300 });
    await assert.rejects(runner.spawn(dir));
    assert.equal(fork.kills, 1);
    await until('the silent child to be gone', () => !alive(children.at(-1)?.pid));
  });

  it('stop called twice concurrently kills once and hands both callers the same exit', async () => {
    const dir = scaffoldDir('twice');
    const fork = nodeFork();
    const runner = runnerWith(fork, freePort);
    await runner.spawn(dir);
    const pid = children.at(-1)?.pid;
    const first = runner.stop(dir);
    const second = runner.stop(dir);
    assert.equal(first, second, 'the two callers did not share one exit promise');
    await Promise.all([first, second]);
    assert.equal(fork.kills, 1);
    assert.equal(alive(pid), false);
    await runner.stop(dir);
  });

  it('keeps heartbeating after ready', async () => {
    const dir = scaffoldDir('beats');
    let beats = 0;
    const base = nodeFork();
    const fork: StarterFork = (modulePath, options) => {
      const child = base(modulePath, options);
      const inner = child.postMessage.bind(child);
      child.postMessage = (message) => {
        beats += 1;
        inner(message);
      };
      return child;
    };
    const runner = runnerWith(fork, freePort, { heartbeatMs: 50 });
    await runner.spawn(dir);
    await until('three heartbeats', () => beats >= 3, 2_000);
    await runner.stop(dir);
  });
});

describe('server.mjs heartbeat backstop', () => {
  async function bareChild(name: string): Promise<{ child: StarterChildLike; port: number }> {
    const dir = scaffoldDir(name);
    const port = await freePort();
    const child = nodeFork()(join(dir, STARTER_SERVER_FILE), {
      cwd: dir,
      env: { PATH: process.env['PATH'] ?? '', PORT: String(port) },
      serviceName: 'spec',
    });
    await until('the bare child to listen', async () => {
      try {
        return (await get(port, '/')).status === 200;
      } catch {
        return false;
      }
    });
    return { child, port };
  }

  it('exits once heartbeats stop for the window', async () => {
    const { child } = await bareChild('backstop');
    child.postMessage({ type: 'heartbeat', windowMs: 300 });
    const pid = child.pid;
    assert.equal(alive(pid), true);
    await until('the child to exit after the window', () => !alive(pid), 3_000);
  });

  it('stays up while heartbeats continue past the window', async () => {
    const { child, port } = await bareChild('control');
    const pid = child.pid;
    const beat = setInterval(() => child.postMessage({ type: 'heartbeat', windowMs: 300 }), 100);
    await sleep(900);
    clearInterval(beat);
    assert.equal(alive(pid), true, 'the child died under continuous heartbeats');
    assert.equal((await get(port, '/')).status, 200);
    child.kill();
    await until('the control child to exit', () => !alive(pid));
  });
});
