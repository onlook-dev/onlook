import { strict as assert } from 'node:assert';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { canonicalPath } from '../lib/canonical-path.js';
import { runCli } from '../env/cli.js';
import { terminateWindowsTree } from '../env/windows.js';
import { checkHealth, resolveCodex } from '../agent-host/appserver/resolve.js';
import { inspectWindowsProcess, windowsProcesses } from './windows.js';
import { identifyListener, isAlive, verifiesFor } from './owner.js';
import { windowsJobCommand } from '../env/windows-job.js';
import { APP_ENV, runChildOutput } from '../env/child.js';
import { systemExecutable } from '../env/platform.js';

test('Windows Open Terminal opens a console that accepts a pasted command', { skip: process.platform !== 'win32', timeout: 60_000 }, async () => {
  const root = await fixtureDirectory('terminal-');
  const resultPath = join(root, 'input.txt');
  const powershell = systemExecutable('WindowsPowerShell/v1.0/powershell.exe');
  const prompts = async (): Promise<number[]> => {
    const { stdout } = await runChildOutput(powershell, ['-NoProfile', '-NonInteractive', '-Command', "@(Get-CimInstance Win32_Process -Filter \"Name = 'cmd.exe'\" | Where-Object { $_.CommandLine -match '/d /k$' } | ForEach-Object { $_.ProcessId }) -join ','"], { env: APP_ENV, timeout: 15_000, windowsHide: true });
    return stdout.trim().split(',').filter(Boolean).map(Number);
  };
  let launcher: ChildProcessWithoutNullStreams | undefined;
  let promptPid: number | undefined;
  try {
    const before = new Set(await prompts());
    const entry = join(root, 'open-terminal.mjs');
    const terminalModule = pathToFileURL(join(process.cwd(), 'apps/studio/src/main/terminal.ts')).href;
    await writeFile(entry, `import { openWindowsTerminal } from ${JSON.stringify(terminalModule)}; await openWindowsTerminal(); process.stdout.write('ready\\n'); process.stdin.resume();`);
    const command = windowsJobCommand(process.execPath, ['--import', join(process.cwd(), 'tests/apparatus/node-ts-resolve.ts'), entry]);
    launcher = spawn(command.bin, command.args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    assert.equal(await firstLine(launcher), 'ready');
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline && promptPid === undefined) {
      promptPid = (await prompts()).find((pid) => !before.has(pid));
      if (promptPid === undefined) await delay(50);
    }
    assert.ok(promptPid, 'Open Terminal must leave a new Command Prompt running');
    const input = Buffer.from(`echo terminal-ready>"${resultPath}"\r`, 'utf16le').toString('base64');
    const script = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class ConsoleInput {
  [StructLayout(LayoutKind.Explicit, CharSet = CharSet.Unicode, Size = 20)]
  public struct Record {
    [FieldOffset(0)] public short Type;
    [FieldOffset(4)] public int Down;
    [FieldOffset(8)] public short Repeat;
    [FieldOffset(10)] public short Key;
    [FieldOffset(14)] public char Character;
  }
  [DllImport("kernel32.dll")] public static extern bool FreeConsole();
  [DllImport("kernel32.dll", SetLastError = true)] public static extern bool AttachConsole(uint pid);
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] public static extern IntPtr CreateFile(string name, uint access, uint share, IntPtr security, uint creation, uint flags, IntPtr template);
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] public static extern bool WriteConsoleInputW(IntPtr handle, Record[] records, uint count, out uint written);
  [DllImport("kernel32.dll")] public static extern IntPtr GetConsoleWindow();
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr window);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr handle);
}
'@
[ConsoleInput]::FreeConsole() | Out-Null
if (![ConsoleInput]::AttachConsole(${promptPid})) { throw 'Command Prompt has no console' }
if (![ConsoleInput]::IsWindowVisible([ConsoleInput]::GetConsoleWindow())) { throw 'Command Prompt console is hidden' }
$handle = [ConsoleInput]::CreateFile('CONIN$', 0x40000000, 3, [IntPtr]::Zero, 3, 0, [IntPtr]::Zero)
try {
  $text = [Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('${input}'))
  foreach ($character in $text.ToCharArray()) {
    $record = New-Object ConsoleInput+Record
    $record.Type = 1; $record.Down = 1; $record.Repeat = 1; $record.Character = $character
    if ($character -eq [char]13) { $record.Key = 13 }
    [uint32]$written = 0
    if (![ConsoleInput]::WriteConsoleInputW($handle, @($record), 1, [ref]$written) -or $written -ne 1) { throw 'Console rejected input' }
  }
} finally { [ConsoleInput]::CloseHandle($handle) | Out-Null; [ConsoleInput]::FreeConsole() | Out-Null }
`;
    await runChildOutput(powershell, ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { env: APP_ENV, timeout: 15_000, windowsHide: true });
    let result = '';
    const inputDeadline = Date.now() + 10_000;
    while (Date.now() < inputDeadline && result === '') {
      try { result = await readFile(resultPath, 'utf8'); } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      if (result === '') await delay(50);
    }
    assert.equal(result.trim(), 'terminal-ready');
  } finally {
    try { await stopFixture(launcher?.pid); } finally { await rm(root, { recursive: true, force: true }); }
  }
});

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
