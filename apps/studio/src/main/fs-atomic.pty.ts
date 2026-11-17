import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { once } from 'node:events';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { writeAtomicFile } from './fs-atomic.js';

test('a process killed after its temporary file is synced cannot corrupt the committed file', async () => {
  const root = mkdtempSync(join(tmpdir(), 'studio-atomic-kill-'));
  const path = join(root, 'state.json');
  const before = '{"version":1,"data":"previous complete state"}\n';
  writeAtomicFile(path, before, { mode: 0o600 });
  const moduleUrl = pathToFileURL(resolve('apps/studio/src/main/fs-atomic.ts')).href;
  const program = `
    import fs from 'node:fs';
    import { syncBuiltinESMExports } from 'node:module';
    fs.renameSync = () => {
      process.send('before-rename');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
    };
    syncBuiltinESMExports();
    const { writeAtomicFile } = await import(${JSON.stringify(moduleUrl)});
    writeAtomicFile(${JSON.stringify(path)}, JSON.stringify({version:1,data:'next'.repeat(1000000)}), {mode:0o600});
  `;
  const child = spawn(process.execPath, ['--import', './tests/apparatus/node-ts-resolve.ts', '--input-type=module', '--eval', program], { stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  let errors = '';
  child.stderr?.on('data', (bytes: Buffer) => { errors += bytes.toString(); });
  const ready = once(child, 'message', { signal: AbortSignal.timeout(5_000) });
  const earlyExit = once(child, 'exit').then(() => { throw new Error(`writer exited before rename: ${errors}`); });
  try {
    const [message] = await Promise.race([ready, earlyExit]);
    assert.equal(message, 'before-rename');
    const exited = once(child, 'exit');
    child.kill('SIGKILL');
    const [, signal] = await exited;
    assert.equal(signal, 'SIGKILL');
    assert.equal(readFileSync(path, 'utf8'), before);
    assert.equal(statSync(path).mode & 0o777, 0o600);
    assert.ok(existsSync(`${path}.${String(child.pid)}.tmp`));
    writeAtomicFile(path, '{"version":1,"data":"recovered"}\n', { mode: 0o600 });
    assert.equal(JSON.parse(readFileSync(path, 'utf8')).data, 'recovered');
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    void earlyExit.catch(() => undefined);
  }
});
