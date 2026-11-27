// Node only: under Bun `stdin.write()` after `end()` returns true and raises nothing, so these cases pass against the broken code.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { after, describe, it } from 'node:test';

const workDir = mkdtempSync(join(tmpdir(), 'appserver-transport-node-'));

const TRANSPORT_URL = new URL('./transport.ts', import.meta.url).href;

const FAKE = join(workDir, 'fake-app-server.mjs');
writeFileSync(
  FAKE,
  `#!/usr/bin/env node
process.stdout.write(JSON.stringify({ method: "ready" }) + "\\n");
process.stdin.on("data", () => {});
process.stdin.on("end", () => process.exit(0));
setInterval(() => {}, 1000);
`,
  'utf8',
);
chmodSync(FAKE, 0o755);

// No `uncaughtException` handler: the process dying is the measurement.
const SCENARIO = join(workDir, 'scenario.mjs');
writeFileSync(
  SCENARIO,
  `import { spawn } from 'node:child_process';
const [mode, bin] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (mode === 'control') {
  // No transport at all: end a child's stdin and write into it, which is what
  // the transport used to do. If THIS exits clean the harness is blind.
  const child = spawn(bin, [], { stdio: ['pipe', 'pipe', 'pipe'] });
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  await sleep(300);
  child.stdin.end();
  child.stdin.write('{"id":"a1","result":{}}\\n');
  await sleep(300);
  child.kill();
  process.exit(0);
}

const { AppServerTransport } = await import(${JSON.stringify(TRANSPORT_URL)});
let up = false;
// The fake ignores the app-server arguments the transport appends, exactly as
// it does in transport.test.ts.
const transport = new AppServerTransport({ bin }, { onNotification: () => { up = true; } });
for (let i = 0; i < 300 && !up; i++) await sleep(10);
if (!up) { console.error('fake never spoke'); process.exit(9); }

const closing = transport.close(500);
// SAME TICK as stdin.end(): the stream is ending, not yet destroyed.
if (mode === 'respond') transport.respond('a1', { decision: 'accept' });
if (mode === 'notify') transport.notify('turn/interrupt', {});
if (mode === 'respondError') transport.respondError('a1', 'not implemented');
await sleep(150);
// And again, now that the stream is destroyed rather than ending — the face
// that was swallowed instead of crashing.
if (mode === 'respond') transport.respond('a2', { decision: 'accept' });
if (mode === 'notify') transport.notify('turn/interrupt', {});
if (mode === 'respondError') transport.respondError('a2', 'not implemented');
await closing;
process.exit(0);
`,
  'utf8',
);

interface Ran {
  readonly code: number | null;
  readonly stderr: string;
}

// The fake holds an interval and exits only on its stdin's end, so a scenario that
// dies before `close()` reaches it orphans it onto pid 1 forever (ONL-2491).
const groups = new Set<number>();

function endGroup(pid: number): void {
  groups.delete(pid);
  try {
    process.kill(-pid, 'SIGKILL');
  } catch {
    // Already gone; the group id outliving its members is the ordinary case.
  }
}

after(() => {
  for (const pid of [...groups]) endGroup(pid);
  // `-ww` because the default truncates to the terminal, which would hide a survivor.
  const survivors = execFileSync('ps', ['-A', '-ww', '-o', 'command='], { encoding: 'utf8' })
    .split('\n')
    .filter((line) => line.includes(FAKE));
  rmSync(workDir, { recursive: true, force: true });
  assert.equal(survivors.length, 0, `a fake app-server outlived the suite:\n${survivors.join('\n')}`);
});

async function run(mode: string): Promise<Ran> {
  // Its own group: the fake is a grandchild, so only a group kill reaches it.
  const resolver = pathToFileURL(join(process.cwd(), 'tests/apparatus/node-ts-resolve.ts')).href;
  const child = spawn(process.execPath, ['--import', resolver, SCENARIO, mode, FAKE], {
    cwd: workDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  const group = child.pid;
  if (group !== undefined) groups.add(group);
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => (stderr += chunk));
  child.stdout.on('data', () => {});
  const killer = setTimeout(() => {
    if (group !== undefined) endGroup(group);
  }, 20_000);
  try {
    const code = await new Promise<number | null>((resolve) => {
      child.on('exit', (value) => resolve(value));
    });
    return { code, stderr };
  } finally {
    clearTimeout(killer);
    if (group !== undefined) endGroup(group);
  }
}

const CRASH = /ERR_STREAM_WRITE_AFTER_END|ERR_STREAM_DESTROYED/;

describe('a send after close() never reaches the process as a crash', () => {
  it('checks the harness can see a crash at all', async () => {
    const { code, stderr } = await run('control');
    assert.notEqual(code, 0, 'an unhandled stdin error must not exit clean');
    assert.match(stderr, CRASH);
  });

  for (const entry of ['respond', 'notify', 'respondError'] as const) {
    it(`survives ${entry}() called after close(), before the child exits`, async () => {
      const { code, stderr } = await run(entry);
      assert.doesNotMatch(stderr, CRASH);
      assert.equal(code, 0, `${entry}() after close() took the process down:\n${stderr}`);
    });
  }
});
