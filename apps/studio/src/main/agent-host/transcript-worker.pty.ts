import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import type { StudioEvent } from '@studio/events';
import { canonicalPath } from '../lib/canonical-path.js';
import { TranscriptClient } from './transcript-client.js';
import { transcriptFilePath } from './transcript-storage.js';

const bundle = process.env['STUDIO_TRANSCRIPT_WORKER_BUNDLE'];
const workerUrl = bundle === undefined ? new URL('./transcript-worker.ts', import.meta.url) : pathToFileURL(resolve(bundle));

function fixture(): { root: string; cwd: string } {
  const root = mkdtempSync(join(tmpdir(), 'studio-transcript-node-'));
  return { root, cwd: canonicalPath(join(root, 'project')) };
}

function rows(count: number, size = 32): StudioEvent[] {
  return Array.from({ length: count }, (_, index) => ({ type: 'message.user', seq: index + 1, text: 'x'.repeat(size) } as StudioEvent));
}

test('the worker reopens a forgotten Project while retaining its sibling and both drawers', async () => {
  const { root, cwd } = fixture();
  const client = new TranscriptClient(root, workerUrl, () => undefined);
  const sibling = `${cwd}-sibling`;
  try {
    client.write(cwd, 'claude', rows(2));
    client.write(sibling, 'claude', rows(4));
    client.forget(cwd);
    client.write(cwd, 'claude', rows(9));
    client.reopen(cwd);
    client.write(cwd, 'claude', rows(3));
    client.write(cwd, 'appserver', rows(5));
    await client.flush();
    assert.equal(client.read(cwd, 'claude').length, 3);
    assert.equal(client.read(cwd, 'appserver').length, 5);
    assert.equal(client.read(sibling, 'claude').length, 4);
    const saved = JSON.parse(readFileSync(transcriptFilePath(root, cwd), 'utf8')) as {
      data: { byHarness: { claude: StudioEvent[]; appserver: StudioEvent[] } };
    };
    assert.equal(saved.data.byHarness.claude.length, 3);
    assert.equal(saved.data.byHarness.appserver.length, 5);
  } finally {
    await client.close();
  }
});

test('a queued startup inventory cannot restore the removed incarnation after reopening', async () => {
  const { root, cwd } = fixture();
  mkdirSync(join(root, 'transcripts'));
  writeFileSync(transcriptFilePath(root, cwd), JSON.stringify({
    version: 1, data: { cwd, byHarness: { claude: rows(2) } },
  }));
  const client = new TranscriptClient(root, workerUrl, () => undefined);
  try {
    client.forget(cwd);
    client.reopen(cwd);
    await client.flush();
    assert.equal(client.all()[`${cwd}::claude`], undefined);
    assert.deepEqual(client.read(cwd, 'claude'), []);
  } finally {
    await client.close();
  }
});

async function quitChild(root: string, program: string): Promise<void> {
  const resolver = new URL('../../../../../tests/apparatus/node-ts-resolve.ts', import.meta.url);
  const entry = join(root, 'quit.mjs');
  writeFileSync(entry, program);
  const child = spawn(process.execPath, ['--import', resolver.href, entry], {
    env: { ...process.env, STUDIO_STATE_ROOT: root },
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5_000,
    killSignal: 'SIGKILL',
  });
  let output = '';
  child.stdout?.on('data', (bytes: Buffer) => { output += bytes.toString(); });
  child.stderr?.on('data', (bytes: Buffer) => { output += bytes.toString(); });
  const [code, signal] = await once(child, 'close');
  assert.equal(signal, null, `quit required the child watchdog: ${output}`);
  assert.equal(code, 0, output);
  assert.match(output, /quit reached/);
}

for (const heldTermination of [false, true]) {
  test(`Node quit releases a live nonreplying worker with ${heldTermination ? 'nonsettling' : 'normal'} termination`, async () => {
    const { root, cwd } = fixture();
    const silentWorker = join(root, 'silent-worker.mjs');
    const ready = join(root, 'ready');
    const flushing = join(root, 'flushing');
    writeFileSync(silentWorker, `
      import { writeFileSync } from 'node:fs';
      import { parentPort } from 'node:worker_threads';
      parentPort.on('message', ({ operation }) => {
        if (operation.kind === 'flush') writeFileSync(${JSON.stringify(flushing)}, 'received');
      });
      writeFileSync(${JSON.stringify(ready)}, 'alive');
    `);
    await quitChild(root, `
      import assert from 'node:assert/strict';
      import { existsSync } from 'node:fs';
      import { setTimeout as delay } from 'node:timers/promises';
      import { Worker } from 'node:worker_threads';
      import { TranscriptClient } from ${JSON.stringify(new URL('./transcript-client.ts', import.meta.url).href)};
      import { createQuitTeardown } from ${JSON.stringify(new URL('../quit-teardown.ts', import.meta.url).href)};
      let terminationRequested = false;
      const terminate = Worker.prototype.terminate;
      Worker.prototype.terminate = function () {
        terminationRequested = true;
        this.ref();
        return ${String(heldTermination)} ? new Promise(() => {}) : terminate.call(this);
      };
      const failures = [];
      const client = new TranscriptClient(${JSON.stringify(root)}, new URL(${JSON.stringify(pathToFileURL(silentWorker).href)}), (error) => failures.push(error));
      client.write(${JSON.stringify(cwd)}, 'claude', [{ type: 'message.user', seq: 1, text: 'undrained tail' }]);
      const started = performance.now();
      while (!existsSync(${JSON.stringify(ready)})) {
        assert.ok(performance.now() - started < 2_000, 'worker never became live');
        await delay(10);
      }
      const pending = client.flush();
      const rejected = assert.rejects(pending, /shutdown timed out/);
      let shutdownError;
      let quit;
      const quitReached = new Promise((resolve) => { quit = resolve; });
      const teardown = createQuitTeardown({
        synchronous: [],
        drainChain: [() => pending],
        capMs: 800,
        onDone: () => {
          void client.close().catch((error) => { shutdownError = error; }).finally(() => {
            assert.equal(teardown.hasRun, true);
            process.stdout.write('quit reached\\n');
            quit();
          });
        },
      });
      teardown.run();
      await quitReached;
      await rejected;
      assert.match(shutdownError.message, /shutdown timed out.*1 undrained Projects/);
      assert.ok(failures.some((error) => error.includes('undrained Projects')));
      assert.equal(client.status().pendingProjects, 1);
      assert.equal(client.rootsComplete(), false);
      assert.ok(existsSync(${JSON.stringify(flushing)}), 'worker did not receive the flush');
      assert.equal(terminationRequested, true);
      await assert.rejects(client.close(), /shutdown timed out/);
      client.write(${JSON.stringify(cwd)}, 'claude', []);
      assert.equal(client.status().pendingProjects, 1);
    `);
  });
}

test('Node quit persists the final tail before reaching quit', async () => {
  const { root, cwd } = fixture();
  const events = rows(5);
  await quitChild(root, `
    import assert from 'node:assert/strict';
    import { writeTranscript, flushTranscripts, shutdownTranscripts, transcriptPersistenceStatus } from ${JSON.stringify(new URL('./transcript.ts', import.meta.url).href)};
    import { createQuitTeardown } from ${JSON.stringify(new URL('../quit-teardown.ts', import.meta.url).href)};
    writeTranscript(${JSON.stringify(cwd)}, 'claude', ${JSON.stringify(events.slice(0, 4))});
    let quit;
    const quitReached = new Promise((resolve) => { quit = resolve; });
    const teardown = createQuitTeardown({
      synchronous: [],
      drainChain: [async () => { writeTranscript(${JSON.stringify(cwd)}, 'claude', ${JSON.stringify(events)}); }, flushTranscripts],
      capMs: 800,
      onDone: () => {
        void shutdownTranscripts().catch(() => { process.exitCode = 1; }).finally(() => {
          process.stdout.write('quit reached\\n');
          quit();
        });
      },
    });
    teardown.run();
    await quitReached;
    assert.equal(transcriptPersistenceStatus().error, undefined);
    assert.equal(transcriptPersistenceStatus().pendingProjects, 0);
    await shutdownTranscripts();
  `);
  const file = JSON.parse(readFileSync(transcriptFilePath(root, cwd), 'utf8')) as {
    data: { byHarness: { claude: StudioEvent[] } };
  };
  assert.deepEqual(file.data.byHarness.claude, events);
});

test('real Node worker persists long histories, changed suffixes, both Harnesses and quit tail', async () => {
  const { root, cwd } = fixture();
  const failures: string[] = [];
  const client = new TranscriptClient(root, workerUrl, (error) => failures.push(error));
  const events = rows(4_101);
  client.write(cwd, 'claude', events);
  client.write(cwd, 'appserver', rows(3));
  events.push(...rows(2));
  client.write(cwd, 'claude', events);
  events[4_101] = { ...events[4_101], text: 'changed suffix' } as StudioEvent;
  client.write(cwd, 'claude', events);
  await client.close();
  const restarted = new TranscriptClient(root, workerUrl, (error) => failures.push(error));
  try {
    assert.deepEqual(restarted.read(cwd, 'claude'), events);
    assert.equal(restarted.read(cwd, 'appserver').length, 3);
    assert.deepEqual(failures, []);
  } finally {
    await restarted.close();
  }
});

test('synchronous reset drains queued saves, while forget seals both drawers and clear permits new writes', async () => {
  const { root, cwd } = fixture();
  const client = new TranscriptClient(root, workerUrl, () => {});
  client.write(cwd, 'claude', rows(2));
  client.write(cwd, 'appserver', rows(3));
  client.reset();
  const restarted = new TranscriptClient(root, workerUrl, () => {});
  try {
    assert.equal(restarted.read(cwd, 'claude').length, 2);
    restarted.clear(cwd, 'claude');
    restarted.write(cwd, 'claude', rows(1));
    await restarted.flush();
    assert.equal(restarted.read(cwd, 'claude').length, 1);
    restarted.forget(cwd);
    restarted.write(cwd, 'claude', rows(4));
    restarted.write(cwd, 'appserver', rows(4));
    await restarted.flush();
    assert.equal(existsSync(transcriptFilePath(root, cwd)), false);
    assert.deepEqual(restarted.all(), {});
  } finally {
    await restarted.close();
  }
});

test('failed worker startup is visible and a real restarted worker retries the unsaved snapshot', async () => {
  const { root, cwd } = fixture();
  const retryUrl = pathToFileURL(join(root, 'missing-worker.mjs'));
  const failures: string[] = [];
  const client = new TranscriptClient(root, retryUrl, (error) => failures.push(error));
  client.write(cwd, 'claude', rows(5));
  await assert.rejects(client.flush());
  assert.ok(failures.length > 0);
  assert.equal(client.status().pendingProjects, 1);
  assert.equal(client.rootsComplete(), false);
  retryUrl.href = workerUrl.href;
  try {
    await client.flush();
    assert.equal(client.status().pendingProjects, 0);
    assert.equal(client.status().error, undefined);
    const file = JSON.parse(readFileSync(transcriptFilePath(root, cwd), 'utf8')) as {
      data: { byHarness: { claude: StudioEvent[] } };
    };
    assert.equal(file.data.byHarness.claude.length, 5);
  } finally {
    await client.close();
  }
});

test('real replacement failure remains pending and retries without acknowledging lost events', async () => {
  const { root, cwd } = fixture();
  const failures: string[] = [];
  const client = new TranscriptClient(root, workerUrl, (error) => failures.push(error));
  client.write(cwd, 'claude', rows(3));
  await client.flush();
  const path = transcriptFilePath(root, cwd);
  const before = readFileSync(path, 'utf8');
  const blocked = `${path}.${String(process.pid)}.tmp`;
  mkdirSync(blocked);
  client.write(cwd, 'claude', rows(4));
  await assert.rejects(client.flush());
  assert.equal(readFileSync(path, 'utf8'), before);
  assert.equal(client.status().pendingProjects, 1);
  assert.ok(failures.length > 0);
  rmSync(blocked, { recursive: true });
  try {
    await client.flush();
    assert.equal(client.status().pendingProjects, 0);
    const restarted = new TranscriptClient(root, workerUrl, () => {});
    assert.equal(restarted.read(cwd, 'claude').length, 4);
    await restarted.close();
  } finally {
    await client.close();
  }
});

test('GC snapshots and the Node event loop stay responsive during an 8 MB save paused at replacement', async () => {
  const { root, cwd } = fixture();
  const pausedWorker = join(root, 'paused-worker.mjs');
  writeFileSync(pausedWorker, `
    import fs from 'node:fs';
    import { syncBuiltinESMExports } from 'node:module';
    const rename = fs.renameSync;
    fs.renameSync = (...args) => {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
      return rename(...args);
    };
    syncBuiltinESMExports();
    await import(${JSON.stringify(workerUrl.href)});
  `);
  const client = new TranscriptClient(root, pathToFileURL(pausedWorker), () => {});
  client.all();
  assert.equal(client.rootsComplete(), true);
  const events = rows(8_192, 1_024);
  client.write(cwd, 'claude', events);
  await client.flush();
  const original = JSON.stringify;
  JSON.stringify = (() => { throw new Error('serialization reached main'); }) as typeof JSON.stringify;
  let ticks = 0;
  const timer = setInterval(() => { ticks += 1; }, 10);
  try {
    events.push(...rows(1));
    const started = performance.now();
    client.write(cwd, 'claude', events);
    const draining = client.flush();
    assert.equal(client.all()[`${cwd}::claude`]?.length, 8_193);
    assert.equal(client.rootsComplete(), true);
    assert.ok(performance.now() - started < 150, 'cached GC calls waited behind worker replacement');
    await draining;
    assert.ok(ticks >= 5, 'worker persistence blocked the Node event loop');
  } finally {
    JSON.stringify = original;
    clearInterval(timer);
    await client.close();
  }
});
