import { strict as assert } from 'node:assert';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { startChild } from '../env/child.js';
import { forkWslStarter } from './wsl.js';

test('the starter bridge forwards heartbeats, watches edits and exits when its input closes', { timeout: 15_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'onlook-starter-bridge-'));
  let child: ChildProcess | undefined;
  try {
    const modulePath = join(directory, 'server.mjs');
    await writeFile(join(directory, 'page.txt'), 'before');
    await writeFile(modulePath, `import { readFileSync, watch } from 'node:fs';
process.parentPort.on('message', ({data}) => console.log('heartbeat:' + data.windowMs));
watch(process.cwd(), { recursive: true }, (event, file) => { if (file === 'page.txt') console.log('edit:' + readFileSync('page.txt', 'utf8')); });
console.log('parent:' + process.env.STARTER_PARENT_PID + ':' + process.ppid);
console.log('ready');`);
    const launch = ((_bin, args, options) => {
      child = spawn(process.execPath, args, { ...options, env: { ...process.env, STARTER_PARENT_PID: '99999999' } });
      return child;
    }) as typeof startChild;
    const starter = forkWslStarter(modulePath, { cwd: directory, env: {}, serviceName: 'starter-test' }, launch);
    let output = '';
    let errors = '';
    let notify = () => {};
    child!.stdout!.on('data', (chunk) => { output += chunk; notify(); });
    child!.stderr!.on('data', (chunk) => { errors += chunk; });
    const waitFor = (text: string) => new Promise<void>((resolve, reject) => {
      const bound = setTimeout(() => reject(new Error(`Missing ${text}: ${output}\n${errors}`)), 5_000);
      notify = () => { if (output.includes(text)) { clearTimeout(bound); resolve(); } };
      notify();
    });
    await waitFor('ready\n');
    const parent = /parent:(\d+):(\d+)/.exec(output);
    assert.ok(parent);
    assert.equal(parent[1], parent[2]);
    assert.notEqual(parent[1], '99999999');
    starter.postMessage({ type: 'heartbeat', windowMs: 10_000 });
    await waitFor('heartbeat:10000\n');
    await writeFile(join(directory, 'page.txt'), 'after');
    await waitFor('edit:after\n');
    const exited = new Promise<number>((resolve) => starter.on('exit', resolve));
    child!.stdin!.end();
    assert.equal(await exited, 3);
  } finally {
    child?.kill('SIGKILL');
    await rm(directory, { recursive: true, force: true });
  }
});
