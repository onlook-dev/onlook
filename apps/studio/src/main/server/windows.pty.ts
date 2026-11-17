import { strict as assert } from 'node:assert';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { canonicalPath } from '../lib/canonical-path.js';
import { runCli } from '../env/cli.js';
import { terminateWindowsTree } from '../env/windows.js';
import { checkHealth, resolveCodex } from '../agent-host/appserver/resolve.js';
import { inspectWindowsProcess, windowsProcesses } from './windows.js';
import { identifyListener, isAlive, verifiesFor } from './owner.js';

async function fixtureDirectory(prefix: string): Promise<string> {
  const scratch = join(process.cwd(), '.scratch', 'tmp');
  await mkdir(scratch, { recursive: true });
  return mkdtemp(join(scratch, prefix));
}

function firstLine(child: ChildProcessWithoutNullStreams): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = '';
    const onData = (chunk: Buffer): void => {
      output += String(chunk);
      const end = output.indexOf('\n');
      if (end === -1) return;
      cleanup();
      resolve(output.slice(0, end).trim());
    };
    const onExit = (): void => { cleanup(); reject(new Error('fixture exited before reporting readiness')); };
    const onError = (error: Error): void => { cleanup(); reject(error); };
    const cleanup = (): void => {
      clearTimeout(timer);
      child.stdout.off('data', onData);
      child.off('error', onError);
      child.off('exit', onExit);
    };
    const timer = setTimeout(() => { cleanup(); reject(new Error('fixture readiness timed out')); }, 15_000);
    child.stdout.on('data', onData);
    child.once('error', onError);
    child.once('exit', onExit);
  });
}

async function stopFixture(pid: number | undefined): Promise<void> {
  if (pid === undefined || !isAlive(pid)) return;
  try { await terminateWindowsTree(pid); } catch { process.kill(pid); }
}

async function reportedPid(path: string): Promise<number> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const pid = Number(await readFile(path, 'utf8'));
      if (Number.isSafeInteger(pid) && pid > 1) return pid;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    await delay(25);
  }
  throw new Error('fixture did not report its descendant pid');
}

test('Windows reads real listener working directories and terminates the owned process tree', { skip: process.platform !== 'win32', timeout: 240_000 }, async () => {
  const inspection = { timeoutMs: 30_000, throwOnInspectionError: true };
  const self = await inspectWindowsProcess(process.pid, inspection);
  assert.equal(self?.pid, process.pid);
  assert.equal(canonicalPath(self!.cwd), canonicalPath(process.cwd()));
  assert.match(self?.creationTime ?? '', /^[1-9]\d+$/);
  const root = await fixtureDirectory('studio windows & unicode-ø-');
  const server = 'require("node:http").createServer((request,response)=>response.end("ok")).listen(0,"127.0.0.1",function(){process.send({pid:process.pid,port:this.address().port})})';
  const parent = `const child=require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(server)}],{stdio:['ignore','ignore','ignore','ipc']});child.once('message',message=>process.stdout.write(JSON.stringify(message)+'\\n'));child.once('error',()=>process.exit(1));`;
  const child = spawn(process.execPath, ['-e', parent], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] });
  let descendant: number | undefined;
  try {
    const ready = JSON.parse(await firstLine(child)) as { pid: number; port: number };
    descendant = ready.pid;
    const port = ready.port;
    assert.notEqual(descendant, child.pid);
    const identity = await identifyListener(port, inspection);
    assert.equal(identity?.pid, descendant);
    assert.equal(canonicalPath(identity!.cwd!), canonicalPath(root));
    assert.equal(verifiesFor(identity, root), 'ours');
    assert.equal(verifiesFor(identity, join(root, 'different-project')), 'foreign');
    assert.ok((await windowsProcesses(undefined, inspection)).some((candidate) => candidate.pid === child.pid));
    const snapshot = await inspectWindowsProcess(descendant, inspection);
    assert.match(snapshot?.creationTime ?? '', /^[1-9]\d+$/);
    assert.equal(canonicalPath(snapshot!.cwd), canonicalPath(root));
    assert.equal((await inspectWindowsProcess(descendant, inspection))?.creationTime, snapshot?.creationTime);
    const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
    await terminateWindowsTree(child.pid!);
    await exited;
    assert.equal(isAlive(descendant), false);
    assert.equal(await identifyListener(port, inspection), undefined);
  } finally {
    await stopFixture(child.pid);
    await stopFixture(descendant);
    await rm(root, { recursive: true, force: true });
  }
});

test('Windows batch execution and Codex .exe health use Windows semantics', { skip: process.platform !== 'win32' }, async () => {
  const root = await fixtureDirectory('studio windows commands & unicode-ø-');
  try {
    const command = join(root, 'manager & tools.cmd');
    await writeFile(command, `@echo off\r\nif not "%~1"=="install & echo injected" exit /b 2\r\nif not "%~2"=="bang!caret^" exit /b 3\r\nif not "%~3"=="pipe|redirect>file" exit /b 4\r\necho installed\r\n"${process.execPath}" -e "process.stdout.write(process.cwd())"\r\n`);
    const result = await runCli(command, root, ['install & echo injected', 'bang!caret^', 'pipe|redirect>file'], { timeoutMs: 15_000 });
    assert.equal(result.ok, true, result.err);
    assert.deepEqual(result.out.split(/\r?\n/), ['installed', root]);
    const missing = await runCli(join(root, 'unavailable-command.exe'), root, [], { timeoutMs: 15_000 });
    assert.equal(missing.ok, false);
    assert.equal(missing.missing, true, missing.err);
    await writeFile(join(root, 'codex.exe'), 'fixture');
    assert.equal(checkHealth(resolveCodex(root), root).ok, false);
    await writeFile(join(root, 'codex-code-mode-host.exe'), 'fixture');
    assert.equal(checkHealth(resolveCodex(root), root).ok, true);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('Windows CLI job kills a descendant retaining stdout after its parent exits', { skip: process.platform !== 'win32', timeout: 30_000 }, async () => {
  const root = await fixtureDirectory('studio windows orphan-');
  let descendant: number | undefined;
  try {
    const leaf = 'process.stdout.write(String(process.pid)+"\\n",()=>process.send("ready"));setInterval(()=>{},1000)';
    const parent = `const child=require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(leaf)}],{stdio:['ignore','inherit','inherit','ipc']});child.once('message',()=>process.exit(0));`;
    const result = await runCli(process.execPath, root, ['-e', parent], { timeoutMs: 20_000 });
    descendant = Number(result.out);
    assert.ok(Number.isSafeInteger(descendant) && descendant > 1, result.out || result.err);
    assert.equal(isAlive(descendant), false);
    assert.equal(result.ok, true, result.err);
  } finally {
    await stopFixture(descendant);
    await rm(root, { recursive: true, force: true });
  }
});

for (const ending of ['timeout', 'cancel'] as const) {
  test(`Windows CLI job kills its running descendant on ${ending}`, { skip: process.platform !== 'win32', timeout: 30_000 }, async () => {
    const root = await fixtureDirectory(`studio windows ${ending}-`);
    const pidFile = join(root, 'descendant.pid');
    const abort = new AbortController();
    let descendant: number | undefined;
    let running: ReturnType<typeof runCli> | undefined;
    try {
      const leaf = `require('node:fs').writeFileSync(${JSON.stringify(pidFile)},String(process.pid));setInterval(()=>{},1000)`;
      const parent = `require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(leaf)}],{stdio:['ignore','inherit','inherit']});setInterval(()=>{},1000)`;
      running = runCli(process.execPath, root, ['-e', parent], {
        timeoutMs: ending === 'timeout' ? 10_000 : 20_000,
        signal: abort.signal,
      });
      descendant = await reportedPid(pidFile);
      assert.equal(isAlive(descendant), true);
      if (ending === 'cancel') abort.abort();
      const result = await running;
      assert.equal(result.ok, false);
      assert.equal(result.timedOut, ending === 'timeout');
      assert.equal(isAlive(descendant), false);
    } finally {
      abort.abort();
      await running;
      await stopFixture(descendant);
      await rm(root, { recursive: true, force: true });
    }
  });
}
