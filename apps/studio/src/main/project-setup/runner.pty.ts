import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { describe, it, mock } from 'node:test';
import { setTimeout as pause } from 'node:timers/promises';
import { isSameSetupFailure, projectSetupAskKind, type ProjectSetupDefinition, type ProjectSetupSnapshot } from '@studio/events';
import { t } from '@studio/i18n';
import { canonicalPath } from '../lib/canonical-path.js';
import { probePort } from '../server/probe.js';
import { createProjectSetupService, type ProjectSetupDeps } from './runner.js';
import { installationReusable } from './fingerprint.js';
import { createSetupState } from './state.js';

async function freePort(): Promise<number> {
  const socket = createServer();
  await new Promise<void>((done) => socket.listen(0, '127.0.0.1', done));
  const address = socket.address();
  assert(address && typeof address !== 'string');
  const port = address.port;
  await new Promise<void>((done) => socket.close(() => done()));
  return port;
}
async function waitFor(check: () => boolean | Promise<boolean>): Promise<void> {
  const deadline = Date.now() + 5000;
  while (!await check() && Date.now() < deadline) await pause(25);
  assert.equal(await check(), true);
}
function launchCount(project: string, folder = '.'): number {
  const path = join(project, folder, 'server.launches');
  return existsSync(path) ? readFileSync(path, 'utf8').trim().split('\n').length : 0;
}
function killCompanion(pid: number): void {
  try { process.kill(pid, 'SIGKILL'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error; }
}
async function fixture(extra: Partial<ProjectSetupDeps> = {}) {
  mkdirSync('.scratch/tmp', { recursive: true });
  const root = canonicalPath(mkdtempSync('.scratch/tmp/setup-runner-'));
  const project = join(root, 'project');
  mkdirSync(join(project, 'api'), { recursive: true });
  mkdirSync(join(project, 'toolchain'));
  writeFileSync(join(project, 'root-marker'), 'ready');
  writeFileSync(join(project, '.setup-input'), 'before-install');
  const runtime = join(project, 'toolchain', 'runtime');
  writeFileSync(runtime, `#!/bin/sh\nexec '${process.execPath.replaceAll("'", "'\\''")}' "$@"\n`);
  chmodSync(runtime, 0o755);
  const server = `import {createServer} from 'node:http';
import {appendFileSync,writeFileSync} from 'node:fs';
if(process.env.PREPARED !== 'yes') process.exit(31);
appendFileSync('server.launches',String(process.pid)+'\\n');
writeFileSync('server.pid',String(process.pid));
process.on('SIGTERM',()=>{});
createServer((_request,response)=>response.end('ready')).listen(Number(process.env.PORT),'127.0.0.1');
`;
  writeFileSync(join(project, 'server.mjs'), server);
  writeFileSync(join(project, 'api', 'server.mjs'), server);
  const firstPort = await freePort();
  let secondPort = await freePort();
  while (secondPort === firstPort) secondPort = await freePort();
  const definition: ProjectSetupDefinition = {
    prepare: 'test -f root-marker\nexport PATH="$PWD/toolchain:$PATH"\nexport PREPARED=yes',
    install: { script: "if grep -q fail .setup-input; then printf install-failed; exit 17; fi\nruntime --version > runtime.txt\nprintf 'installed\\n' >> install.log\nprintf after-install > .setup-input\ntouch dependency.ready", inputs: ['.setup-input'], outputs: ['dependency.ready'] },
    servers: [{ id: 'web', cwd: '.', start: 'runtime server.mjs', port: firstPort }, { id: 'api', cwd: 'api', start: 'runtime server.mjs', port: secondPort }],
  };
  const state = createSetupState(() => root);
  const reports: number[] = [];
  const deps: ProjectSetupDeps = { state, env: async () => ({ PATH: '/usr/bin:/bin' }), report: async (_cwd, _folder, port) => { reports.push(port); }, readyTimeoutMs: 3000, stopGraceMs: 100, ...extra };
  const service = createProjectSetupService(deps);
  assert.equal(service.save(project, definition, null).ok, true);
  return { root, project, state, definition, service, reports, deps };
}

async function externalServer(project: string, port: number) {
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: project, env: { ...process.env, PREPARED: 'yes', PORT: String(port) }, detached: true, stdio: 'ignore',
  });
  let error: Error | undefined;
  child.once('error', (failure) => { error = failure; });
  const closed = new Promise<void>((done) => { child.once('close', () => done()); });
  try {
    await waitFor(() => { if (error) throw error; return probePort(port); });
    return { child, closed };
  } catch (failure) {
    child.kill('SIGKILL');
    await closed;
    throw failure;
  }
}

describe('saved setup shell lifetime', () => {
  it('refuses to stop a reconnected listener and leaves its companion and launched sibling alone', async () => {
    const item = await fixture();
    const serverPath = join(item.project, 'server.mjs');
    writeFileSync(serverPath, `import {spawn} from 'node:child_process';\nwriteFileSync('companion.pid',String(spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'}).pid));\n${readFileSync(serverPath, 'utf8')}`);
    const external = await externalServer(item.project, item.definition.servers[0]!.port);
    const companion = Number(readFileSync(join(item.project, 'companion.pid'), 'utf8'));
    try {
      const started = await item.service.run(item.project, { action: 'start' });
      assert.equal(started.ok, true, JSON.stringify(started));
      assert.equal(launchCount(item.project), 1);
      assert.equal(item.service.ownsPort(item.project, item.definition.servers[0]!.port), true);
      const ids = item.service.serverIdsForPorts(item.project, [item.definition.servers[0]!.port]);
      assert.deepEqual(ids, ['web']);
      const stopped = await item.service.run(item.project, { action: 'stop', serverIds: ids });
      assert.equal(stopped.ok, false, JSON.stringify(stopped));
      assert.equal(await probePort(item.definition.servers[0]!.port), true);
      assert.equal(external.child.signalCode, null);
      assert.equal(item.service.ownsPort(item.project, item.definition.servers[0]!.port), true);
      external.child.kill('SIGKILL');
      await external.closed;
      assert.equal(external.child.signalCode, 'SIGKILL');
      assert.equal(process.kill(companion, 0), true);
      assert.equal(await probePort(item.definition.servers[1]!.port), true);
      const relaunched = await item.service.run(item.project, { action: 'start', serverIds: ['web'] });
      assert.equal(relaunched.ok, true, JSON.stringify(relaunched));
      assert.equal(launchCount(item.project), 2);
      assert.notEqual(Number(readFileSync(join(item.project, 'server.pid'), 'utf8')), external.child.pid);
      assert.equal((await item.service.run(item.project, { action: 'stop', serverIds: ['web'] })).ok, true);
      assert.equal(await probePort(item.definition.servers[0]!.port), false);
      assert.equal(process.kill(companion, 0), true);
      assert.equal(await probePort(item.definition.servers[1]!.port), true);
    } finally {
      external.child.kill('SIGKILL');
      await external.closed;
      killCompanion(companion);
      await item.service.dispose();
    }
  });

  it('waits for an external listener to close before restarting its edited command through the retained ID', async () => {
    const item = await fixture();
    const external = await externalServer(item.project, item.definition.servers[0]!.port);
    try {
      const started = await item.service.run(item.project, { action: 'start' });
      assert.equal(started.ok, true, JSON.stringify(started));
      const apiPid = readFileSync(join(item.project, 'api', 'server.pid'), 'utf8');
      const edited = { ...item.definition, servers: item.definition.servers.map((server) => server.id === 'web' ? { ...server, id: 'frontend', start: "printf restarted > restarted.marker\nruntime server.mjs" } : server) };
      assert.equal(item.service.save(item.project, edited, started.snapshot.saved!.revision).ok, true);
      const stale = await item.service.run(item.project, { action: 'start', serverIds: ['frontend'] });
      assert.equal(stale.ok, false);
      assert.equal(stale.snapshot.failure?.reason, t('projectSetup.failure.changedSetup'));
      assert.equal(launchCount(item.project), 1);
      assert.deepEqual(item.service.serverIdsForPorts(item.project, [item.definition.servers[0]!.port]), ['web']);
      const refused = await item.service.run(item.project, { action: 'restart', serverIds: ['web'] });
      assert.equal(refused.ok, false, JSON.stringify(refused));
      assert.equal(external.child.signalCode, null);
      assert.equal(await probePort(item.definition.servers[0]!.port), true);
      external.child.kill('SIGKILL');
      await external.closed;
      const restarted = await item.service.run(item.project, { action: 'restart', serverIds: ['web'] });
      assert.equal(restarted.ok, true, JSON.stringify(restarted));
      await external.closed;
      assert.equal(readFileSync(join(item.project, 'restarted.marker'), 'utf8'), 'restarted');
      assert.notEqual(Number(readFileSync(join(item.project, 'server.pid'), 'utf8')), external.child.pid);
      assert.equal(launchCount(item.project), 2);
      assert.equal(launchCount(item.project, 'api'), 1);
      assert.equal(readFileSync(join(item.project, 'api', 'server.pid'), 'utf8'), apiPid);
      assert.deepEqual(item.service.serverIdsForPorts(item.project, [item.definition.servers[0]!.port]), ['frontend']);
      assert.equal((await item.service.run(item.project, { action: 'stop', serverIds: ['frontend'] })).ok, true);
      assert.equal(await probePort(item.definition.servers[0]!.port), false);
      assert.equal(await probePort(item.definition.servers[1]!.port), true);
    } finally {
      external.child.kill('SIGKILL');
      await external.closed;
      await item.service.dispose();
    }
  });

  it('fails verification and rolls back new groups if an early reconnect dies while a later server readies', async () => {
    let external: Awaited<ReturnType<typeof externalServer>> | undefined;
    const item = await fixture({ report: async (_cwd, _folder, port) => {
      if (port === item.definition.servers[1]!.port) {
        assert(external);
        external.child.kill('SIGKILL');
        await external.closed;
      }
    } });
    try {
      external = await externalServer(item.project, item.definition.servers[0]!.port);
      const failed = await item.service.run(item.project, { action: 'start' });
      assert.equal(failed.ok, false);
      assert.equal(failed.snapshot.verified, null);
      assert.equal(failed.snapshot.failure?.stage, 'ready');
      assert.equal(failed.snapshot.failure?.serverId, 'web');
      assert.equal(await probePort(item.definition.servers[0]!.port), false);
      assert.equal(await probePort(item.definition.servers[1]!.port), false);
      assert.equal(launchCount(item.project), 1);
      assert.equal(launchCount(item.project, 'api'), 1);
    } finally {
      external?.child.kill('SIGKILL');
      await external?.closed;
      await item.service.dispose();
    }
  });

  it('does not acquire reconnect process ownership during disposal', async () => {
    const item = await fixture();
    const external = await externalServer(item.project, item.definition.servers[0]!.port);
    try {
      assert.equal((await item.service.run(item.project, { action: 'start' })).ok, true);
      item.service.disposeNow();
      await item.service.dispose();
      assert.equal(await probePort(item.definition.servers[0]!.port), true);
      assert.equal(await probePort(item.definition.servers[1]!.port), false);
      assert.equal(process.kill(external.child.pid!, 0), true);
      assert.equal(item.service.ownsPort(item.project, item.definition.servers[0]!.port), false);
    } finally {
      external.child.kill('SIGKILL');
      await external.closed;
      await item.service.dispose();
    }
  });

  it('keeps real installation, readiness and Stop successful when analytics sinks throw', async () => {
    let installations = 0;
    let completions = 0;
    const item = await fixture({
      installationChecked: () => { installations += 1; throw new Error('analytics unavailable'); },
      runCompleted: () => { completions += 1; throw new Error('analytics unavailable'); },
    });
    try {
      const started = await item.service.run(item.project, { action: 'start' });
      assert.equal(started.ok, true, JSON.stringify(started));
      assert.equal(started.snapshot.verified?.revision, started.snapshot.saved?.revision);
      assert.equal(started.snapshot.failure, null);
      assert.equal(installations, 1);
      assert.equal(completions, 1);
      assert.equal(readFileSync(join(item.project, 'install.log'), 'utf8'), 'installed\n');
      assert.equal(item.reports.length, 2);
      for (const server of item.definition.servers) assert.equal(await probePort(server.port), true);
      assert.equal((await item.service.run(item.project, { action: 'stop' })).ok, true);
      assert.equal(completions, 2);
      for (const server of item.definition.servers) assert.equal(await probePort(server.port), false);
    } finally { await item.service.dispose(); }
  });

  it('activates at the root for both folders, reuses post-install inputs across reload, stops only selected groups', async () => {
    const measurements: Parameters<NonNullable<ProjectSetupDeps['runCompleted']>>[1][] = [];
    const reuse: boolean[] = [];
    const item = await fixture({
      runCompleted: (_cwd, measurement) => { measurements.push(measurement); },
      installationChecked: (_cwd, reused) => { reuse.push(reused); },
    });
    const unrelated = createServer();
    await new Promise<void>((done) => unrelated.listen(0, '127.0.0.1', done));
    const unrelatedAddress = unrelated.address();
    assert(unrelatedAddress && typeof unrelatedAddress !== 'string');
    try {
      const start = await item.service.run(item.project, { action: 'start' });
      assert.equal(start.ok, true, JSON.stringify(start));
      assert.equal(start.snapshot.verified?.revision, start.snapshot.saved?.revision);
      assert.equal(item.reports.length, 2);
      await pause(100);
      assert.equal(await probePort(item.definition.servers[0]!.port), true);
      assert.equal(await probePort(item.definition.servers[1]!.port), true);
      const selected = await item.service.run(item.project, { action: 'stop', serverIds: ['web'] });
      assert.equal(selected.ok, true);
      assert.equal(await probePort(item.definition.servers[0]!.port), false);
      assert.equal(await probePort(item.definition.servers[1]!.port), true);
      assert.equal(await probePort(unrelatedAddress.port), true);
      await item.service.dispose();
      const installLog = readFileSync(join(item.project, 'install.log'), 'utf8');
      item.state.reset();
      const reopened = createProjectSetupService(item.deps);
      try {
        const again = await reopened.run(item.project, { action: 'start' });
        assert.equal(again.ok, true, JSON.stringify(again));
        assert.equal(readFileSync(join(item.project, 'install.log'), 'utf8'), installLog);
        assert.equal(again.snapshot.saved?.revision, start.snapshot.saved?.revision);
        assert.deepEqual(reuse, [false, true]);
        assert.deepEqual(measurements.map(({ action, ok }) => ({ action, ok })), [
          { action: 'start', ok: true },
          { action: 'stop', ok: true },
          { action: 'start', ok: true },
        ]);
        for (const measurement of measurements) {
          assert.deepEqual(Object.keys(measurement).sort(), ['action', 'duration_ms', 'ok']);
          assert(measurement.duration_ms >= 0);
        }
      } finally { await reopened.dispose(); }
    } finally {
      await item.service.dispose();
      await new Promise<void>((done) => unrelated.close(() => done()));
    }
  });

  it('coalesces Start, cancels report waits immediately and cannot report late success', async () => {
    const outcomes: string[] = [];
    let began: () => void = () => undefined;
    const reporting = new Promise<void>((done) => { began = done; });
    let finish: () => void = () => undefined;
    const held = new Promise<void>((done) => { finish = done; });
    const item = await fixture({ report: async () => { began(); await held; }, runCompleted: (_cwd, measurement) => { outcomes.push(`${measurement.action}:${measurement.ok}`); } });
    const first = item.service.run(item.project, { action: 'start' });
    const duplicate = item.service.run(item.project, { action: 'start' });
    try {
      await reporting;
      const started = Date.now();
      const stopped = await item.service.run(item.project, { action: 'stop' });
      assert.equal(stopped.ok, true);
      assert(Date.now() - started < 2000);
      const firstResult = await first;
      const duplicateResult = await duplicate;
      assert(!firstResult.ok);
      assert.equal(firstResult.reason, t('projectSetup.failure.canceled'));
      assert.deepEqual(duplicateResult, firstResult);
      assert.deepEqual([...outcomes].sort(), ['start:false', 'start:false', 'stop:true']);
      finish();
      await pause(100);
      assert.equal(item.service.read(item.project).state, 'idle');
      assert.equal(item.service.read(item.project).verified, null);
      assert.equal(await probePort(item.definition.servers[0]!.port), false);
    } finally { finish(); await item.service.dispose(); }
  });

  it('cancels installation before a late server launch', async () => {
    const item = await fixture();
    item.service.save(item.project, { ...item.definition, install: { ...item.definition.install, script: 'sleep 20' } }, item.service.read(item.project).saved!.revision);
    const start = item.service.run(item.project, { action: 'start' });
    try {
      for (let attempt = 0; attempt < 100 && item.service.read(item.project).state !== 'installing'; attempt += 1) await pause(10);
      assert.equal(item.service.read(item.project).state, 'installing');
      await item.service.run(item.project, { action: 'stop' });
      assert.equal((await start).ok, false);
      assert.equal(item.reports.length, 0);
      assert.equal(await probePort(item.definition.servers[0]!.port), false);
    } finally { await item.service.dispose(); }
  });

  it('supersedes a held readiness report with Restart without reviving the old run or reinstalling', async () => {
    let entered: () => void = () => undefined;
    const reporting = new Promise<void>((resolve) => { entered = resolve; });
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => { release = resolve; });
    let reports = 0;
    const reuse: boolean[] = [];
    const snapshots: ProjectSetupSnapshot[] = [];
    const item = await fixture({
      report: async () => { reports += 1; if (reports === 1) { entered(); await held; } },
      installationChecked: (_cwd, reused) => { reuse.push(reused); },
      changed: (_cwd, snapshot) => { snapshots.push(snapshot); },
    });
    const first = item.service.run(item.project, { action: 'start' });
    try {
      await reporting;
      const originalPid = Number(readFileSync(join(item.project, 'server.pid'), 'utf8'));
      assert.equal(item.service.read(item.project).state, 'starting');
      const restart = await item.service.run(item.project, { action: 'restart' });
      assert.equal(restart.ok, true, JSON.stringify(restart));
      assert.equal((await first).ok, false);
      assert.deepEqual(reuse, [false, true]);
      assert.equal(launchCount(item.project), 2);
      assert.notEqual(Number(readFileSync(join(item.project, 'server.pid'), 'utf8')), originalPid);
      assert.throws(() => process.kill(originalPid, 0), { code: 'ESRCH' });
      assert(snapshots.some((snapshot) => snapshot.state === 'stopping'));
      const settled = item.service.read(item.project);
      assert.equal(settled.state, 'running');
      assert.equal(settled.failure, null);
      assert.equal(settled.verified?.revision, settled.saved?.revision);
      release();
      await pause(100);
      assert.deepEqual(item.service.read(item.project), settled);
      for (const server of item.definition.servers) assert.equal(await probePort(server.port), true);
    } finally { release(); await item.service.dispose(); }
  });

  it('shows a peer crash at once while a selected restart keeps the run', async () => {
    let entered: () => void = () => undefined;
    const reporting = new Promise<void>((resolve) => { entered = resolve; });
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => { release = resolve; });
    let hold = false;
    const item = await fixture({ report: async () => { if (hold) { entered(); await held; } } });
    try {
      const started = await item.service.run(item.project, { action: 'start' });
      assert.equal(started.ok, true, JSON.stringify(started));
      hold = true;
      const restarting = item.service.run(item.project, { action: 'restart', serverIds: ['web'] });
      await reporting;
      process.kill(Number(readFileSync(join(item.project, 'api', 'server.pid'), 'utf8')), 'SIGKILL');
      await waitFor(() => !item.service.ownsPort(item.project, item.definition.servers[1]!.port));
      await waitFor(() => item.service.read(item.project).state === 'failed');
      const crashed = item.service.read(item.project);
      assert.equal(crashed.failure?.serverId, 'api');
      assert.equal(crashed.failure?.reason, t('projectSetup.failure.unexpectedExit'));
      assert.equal(projectSetupAskKind(crashed), 'repair');
      const peerStart = await item.service.run(item.project, { action: 'start', serverIds: ['api'] });
      assert.equal(peerStart.ok, false);
      assert.equal(peerStart.reason, t('projectSetup.failure.concurrentStart'));
      release();
      const restarted = await restarting;
      assert.equal(restarted.ok, true, JSON.stringify(restarted));
      assert.equal(restarted.snapshot.state, 'failed');
      assert.equal(restarted.snapshot.failure?.serverId, 'api');
      assert.equal(restarted.snapshot.failure?.reason, t('projectSetup.failure.unexpectedExit'));
      assert.deepEqual(item.state.read(item.project).failure, restarted.snapshot.failure);
      assert.equal(await probePort(item.definition.servers[0]!.port), true);
    } finally { release(); await item.service.dispose(); }
  });

  it('retires a pending readiness probe without late launch, readiness or failure', async () => {
    let entered: () => void = () => undefined;
    const probing = new Promise<void>((resolve) => { entered = resolve; });
    let release: (ready: boolean) => void = () => undefined;
    const held = new Promise<boolean>((resolve) => { release = resolve; });
    let probes = 0;
    const item = await fixture({ probe: async (port) => { probes += 1; if (probes === 2) { entered(); return held; } return probePort(port); } });
    const first = item.service.run(item.project, { action: 'start' });
    try {
      await probing;
      const stopping = item.service.run(item.project, { action: 'stop' });
      assert.equal(item.service.read(item.project).state, 'stopping');
      release(true);
      assert.equal((await stopping).ok, true);
      assert.equal((await first).ok, false);
      assert.equal(item.reports.length, 0);
      assert.equal(launchCount(item.project, 'api'), 0);
      const stopped = item.service.read(item.project);
      assert.equal(stopped.state, 'idle');
      assert.equal(stopped.failure, null);
      assert.equal(stopped.verified, null);
      for (const server of item.definition.servers) assert.equal(await probePort(server.port), false);
      const next = await item.service.run(item.project, { action: 'start' });
      assert.equal(next.ok, true, JSON.stringify(next));
      assert.equal(next.snapshot.state, 'running');
      assert.equal(next.snapshot.failure, null);
      assert.equal(item.reports.length, 2);
      assert.equal(readFileSync(join(item.project, 'install.log'), 'utf8'), 'installed\n');
    } finally { release(false); await item.service.dispose(); }
  });

  it('settles a rejected Stop probe and allows cleanup and Start to recover', async () => {
    let rejectProbe = false;
    const item = await fixture({ probe: async (port) => { if (rejectProbe) { rejectProbe = false; throw new Error('probe unavailable'); } return probePort(port); } });
    try {
      const started = await item.service.run(item.project, { action: 'start' });
      assert.equal(started.ok, true, JSON.stringify(started));
      rejectProbe = true;
      const stopped = await item.service.run(item.project, { action: 'stop' });
      assert.equal(stopped.ok, false);
      assert.equal(stopped.snapshot.state, 'failed');
      assert.equal(stopped.snapshot.failure?.stage, 'stop');
      assert(stopped.snapshot.failure?.reason.includes('probe unavailable'));
      assert.equal((await item.service.run(item.project, { action: 'stop' })).ok, true);
      const recovered = await item.service.run(item.project, { action: 'start' });
      assert.equal(recovered.ok, true, JSON.stringify(recovered));
      assert.equal(recovered.snapshot.state, 'running');
    } finally { await item.service.dispose(); }
  });

  it('saves during readiness without certifying the replacement revision', async () => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((done) => { release = done; });
    let entered: () => void = () => undefined;
    const ready = new Promise<void>((done) => { entered = done; });
    const item = await fixture({ report: async () => { entered(); await held; } });
    const original = item.service.read(item.project).saved!;
    const running = item.service.run(item.project, { action: 'start' });
    try {
      await ready;
      const next = item.service.save(item.project, { ...item.definition, prepare: `${item.definition.prepare}\ntrue` }, original.revision);
      assert.equal(next.ok, true);
      release();
      assert.equal((await running).ok, true);
      const snapshot = item.service.read(item.project);
      assert.equal(snapshot.verified?.revision, original.revision);
      assert.notEqual(snapshot.saved?.revision, original.revision);
    } finally { release(); await item.service.dispose(); }
  });

  it('retains install exit 17 after input changes and verifies a repaired replacement', async () => {
    const item = await fixture();
    try {
      const initial = await item.service.run(item.project, { action: 'start' });
      assert.equal(initial.ok, true, JSON.stringify(initial));
      const verified = initial.snapshot.verified;
      await item.service.run(item.project, { action: 'stop' });
      writeFileSync(join(item.project, '.setup-input'), 'fail');
      const failed = await item.service.run(item.project, { action: 'start' });
      assert.equal(failed.ok, false);
      assert.equal(failed.snapshot.failure?.exitCode, 17);
      assert.equal(failed.snapshot.failure?.stage, 'install');
      assert.equal(failed.snapshot.failure?.outputTail, 'install-failed');
      assert.deepEqual(failed.snapshot.verified, verified);
      const repairedDefinition = { ...item.definition, install: { ...item.definition.install, script: item.definition.install.script.split('\n').slice(1).join('\n') } };
      item.service.save(item.project, repairedDefinition, failed.snapshot.saved!.revision);
      const repaired = await item.service.run(item.project, { action: 'start' });
      assert.equal(repaired.ok, true, JSON.stringify(repaired));
      assert.equal(repaired.snapshot.failure, null);
      assert.equal(repaired.snapshot.verified?.revision, repaired.snapshot.saved?.revision);
    } finally { await item.service.dispose(); }
  });

  it('honors overlapping disjoint and selected/global Stop selections', async () => {
    for (const serverIds of [['api'], undefined]) {
      const item = await fixture();
      try {
        assert.equal((await item.service.run(item.project, { action: 'start' })).ok, true);
        const selected = item.service.run(item.project, { action: 'stop', serverIds: ['web'] });
        const overlapping = item.service.run(item.project, { action: 'stop', ...(serverIds ? { serverIds } : {}) });
        assert.equal((await selected).ok, true);
        assert.equal((await overlapping).ok, true);
        for (const server of item.definition.servers) {
          assert.equal(await probePort(server.port), false);
          assert.equal(item.service.ownsPort(item.project, server.port), false);
        }
        assert.equal(item.service.read(item.project).state, 'idle');
      } finally { await item.service.dispose(); }
    }
  });

  it('a later Stop cancels queued Restart and Start without any late launch', async () => {
    const item = await fixture();
    try {
      assert.equal((await item.service.run(item.project, { action: 'start' })).ok, true);
      const installLog = readFileSync(join(item.project, 'install.log'), 'utf8');
      const restarting = item.service.run(item.project, { action: 'restart', serverIds: ['web'] });
      const queuedStart = item.service.run(item.project, { action: 'start', serverIds: ['web'] });
      const stopped = await item.service.run(item.project, { action: 'stop' });
      assert.equal(stopped.ok, true);
      const restarted = await restarting;
      const started = await queuedStart;
      assert(!restarted.ok);
      assert.equal(restarted.reason, t('projectSetup.failure.canceled'));
      assert.deepEqual(started, restarted);
      await pause(150);
      assert.equal(launchCount(item.project), 1);
      assert.equal(launchCount(item.project, 'api'), 1);
      assert.equal(readFileSync(join(item.project, 'install.log'), 'utf8'), installLog);
      assert.equal(item.reports.length, 2);
      for (const server of item.definition.servers) assert.equal(await probePort(server.port), false);
    } finally { await item.service.dispose(); }
  });

  it('duplicate successful Starts join one held report, install and launch', async () => {
    let entered: () => void = () => undefined;
    const reporting = new Promise<void>((done) => { entered = done; });
    let release: () => void = () => undefined;
    const held = new Promise<void>((done) => { release = done; });
    let reports = 0;
    const item = await fixture({ report: async () => { reports += 1; entered(); await held; } });
    try {
      const first = item.service.run(item.project, { action: 'start' });
      await reporting;
      const duplicate = item.service.run(item.project, { action: 'start' });
      release();
      const firstResult = await first;
      assert.equal(firstResult.ok, true, JSON.stringify(firstResult));
      assert.deepEqual(await duplicate, firstResult);
      assert.equal(reports, 2);
      assert.equal(launchCount(item.project), 1);
      assert.equal(launchCount(item.project, 'api'), 1);
      assert.equal(readFileSync(join(item.project, 'install.log'), 'utf8').trim().split('\n').length, 1);
      assert.equal(firstResult.snapshot.verified?.revision, firstResult.snapshot.saved?.revision);
    } finally { release(); await item.service.dispose(); }
  });

  it('re-reports existing listeners without another install or process launch', async () => {
    const item = await fixture();
    try {
      assert.equal((await item.service.run(item.project, { action: 'start' })).ok, true);
      const installLog = readFileSync(join(item.project, 'install.log'), 'utf8');
      const reused = await item.service.run(item.project, { action: 'start' });
      assert.equal(reused.ok, true, JSON.stringify(reused));
      assert.deepEqual(item.reports, [...item.definition.servers, ...item.definition.servers].map((server) => server.port));
      assert.equal(readFileSync(join(item.project, 'install.log'), 'utf8'), installLog);
      assert.equal(launchCount(item.project), 1);
      assert.equal(launchCount(item.project, 'api'), 1);
    } finally { await item.service.dispose(); }
  });

  it('selected success preserves an unrelated server failure and its repair evidence', async () => {
    const item = await fixture();
    try {
      const saved = item.service.read(item.project).saved!;
      assert.equal(item.service.save(item.project, { ...item.definition, servers: item.definition.servers.map((server) => server.id === 'api' ? { ...server, start: 'printf api-failed; exit 29' } : server) }, saved.revision).ok, true);
      assert.equal((await item.service.run(item.project, { action: 'start', serverIds: ['web'] })).ok, true);
      const failed = await item.service.run(item.project, { action: 'start', serverIds: ['api'] });
      assert.equal(failed.ok, false);
      assert.equal(failed.snapshot.failure?.serverId, 'api');
      assert.equal(failed.snapshot.failure?.exitCode, 29);
      const reused = await item.service.run(item.project, { action: 'start', serverIds: ['web'] });
      assert.equal(reused.ok, true);
      assert.deepEqual(reused.snapshot.failure, failed.snapshot.failure);
      assert.equal(reused.snapshot.state, 'failed');
      assert.equal(reused.snapshot.verified, null);
      assert.equal(await probePort(item.definition.servers[0]!.port), true);
      assert.equal(launchCount(item.project), 1);
    } finally { await item.service.dispose(); }
  });

  it('selected reuse cannot clear unrelated failure evidence merely because every process is alive', async () => {
    const item = await fixture();
    try {
      const initial = await item.service.run(item.project, { action: 'start' });
      assert.equal(initial.ok, true);
      const failure = { revision: initial.snapshot.saved!.revision, stage: 'ready' as const, serverId: 'api', command: item.definition.servers[1]!.start, reason: t('projectSetup.failure.unverifiedListener'), outputTail: 'retained api evidence', elapsedMs: 10 };
      item.state.write(item.project, { ...item.state.read(item.project), failure });
      const reused = await item.service.run(item.project, { action: 'start', serverIds: ['web'] });
      assert.equal(reused.ok, true);
      assert.deepEqual(reused.snapshot.failure, failure);
      assert.equal(reused.snapshot.state, 'failed');
      assert.deepEqual(reused.snapshot.verified, initial.snapshot.verified);
      assert.equal(launchCount(item.project), 1);
      assert.equal(launchCount(item.project, 'api'), 1);
    } finally { await item.service.dispose(); }
  });

  it('selected success preserves an unselected occupied-port failure without a launched handle', async () => {
    const item = await fixture();
    const unrelated = createServer();
    await new Promise<void>((done) => unrelated.listen(item.definition.servers[1]!.port, '127.0.0.1', done));
    try {
      assert.equal((await item.service.run(item.project, { action: 'start', serverIds: ['web'] })).ok, true);
      const failed = await item.service.run(item.project, { action: 'start', serverIds: ['api'] });
      assert.equal(failed.ok, false);
      assert.equal(failed.snapshot.failure?.serverId, 'api');
      assert.equal(failed.snapshot.failure?.stage, 'ready');
      const reused = await item.service.run(item.project, { action: 'start', serverIds: ['web'] });
      assert.equal(reused.ok, true);
      assert.deepEqual(reused.snapshot.failure, failed.snapshot.failure);
      assert.equal(reused.snapshot.state, 'failed');
      assert.equal(launchCount(item.project, 'api'), 0);
    } finally {
      await item.service.dispose();
      await new Promise<void>((done) => unrelated.close(() => done()));
    }
  });

  it('selected success preserves an unselected reused-listener reporting failure', async () => {
    let rejectedPort: number | undefined;
    const item = await fixture({ report: async (_cwd, _folder, port) => { if (port === rejectedPort) throw new Error('api report rejected'); } });
    try {
      assert.equal((await item.service.run(item.project, { action: 'start' })).ok, true);
      rejectedPort = item.definition.servers[1]!.port;
      const failed = await item.service.run(item.project, { action: 'start', serverIds: ['api'] });
      assert.equal(failed.ok, false);
      assert.equal(failed.snapshot.failure?.serverId, 'api');
      assert.equal(failed.snapshot.failure?.reason, 'api report rejected');
      const reused = await item.service.run(item.project, { action: 'start', serverIds: ['web'] });
      assert.equal(reused.ok, true);
      assert.deepEqual(reused.snapshot.failure, failed.snapshot.failure);
      assert.equal(reused.snapshot.state, 'failed');
      assert.equal(launchCount(item.project, 'api'), 1);
    } finally { await item.service.dispose(); }
  });

  it('complete replacement verifies a renamed server after its previous process failed', async () => {
    const outcomes: string[] = [];
    const item = await fixture({ runCompleted: (_cwd, measurement) => { outcomes.push(`${measurement.action}:${measurement.ok}`); } });
    try {
      const initial = await item.service.run(item.project, { action: 'start' });
      assert.equal(initial.ok, true);
      process.kill(Number(readFileSync(join(item.project, 'api', 'server.pid'), 'utf8')), 'SIGKILL');
      await waitFor(() => item.service.read(item.project).failure?.serverId === 'api');
      const replacement = { ...item.definition, servers: item.definition.servers.map((server) => server.id === 'api' ? { ...server, id: 'backend' } : server) };
      assert.equal(item.service.save(item.project, replacement, initial.snapshot.saved!.revision).ok, true);
      const restarted = await item.service.run(item.project, { action: 'restart' });
      assert.equal(restarted.ok, true, JSON.stringify(restarted));
      assert.equal(restarted.snapshot.failure, null);
      assert.equal(restarted.snapshot.state, 'running');
      assert.equal(restarted.snapshot.verified?.revision, restarted.snapshot.saved?.revision);
      assert.notEqual(restarted.snapshot.verified?.revision, initial.snapshot.verified?.revision);
      assert.deepEqual(outcomes, ['start:true', 'restart:true']);
    } finally { await item.service.dispose(); }
  });

  it('renamed IDs restart the owned handle through old or new IDs without restarting siblings', async () => {
    for (const serverId of ['web', 'frontend']) {
      const item = await fixture();
      try {
        const initial = await item.service.run(item.project, { action: 'start' });
        assert.equal(initial.ok, true, JSON.stringify(initial));
        const installLog = readFileSync(join(item.project, 'install.log'), 'utf8');
        const renamed = { ...item.definition, servers: item.definition.servers.map((server) => server.id === 'web' ? { ...server, id: 'frontend' } : server) };
        assert.equal(item.service.save(item.project, renamed, initial.snapshot.saved!.revision).ok, true);
        assert.equal(item.service.ownsPort(item.project, item.definition.servers[0]!.port), true);
        assert.deepEqual(item.service.serverIdsForPorts(item.project, [item.definition.servers[0]!.port]), ['web']);
        const restarted = await item.service.run(item.project, { action: 'restart', serverIds: [serverId] });
        assert.equal(restarted.ok, true, JSON.stringify(restarted));
        assert.equal(launchCount(item.project), 2);
        assert.equal(launchCount(item.project, 'api'), 1);
        assert.equal(readFileSync(join(item.project, 'install.log'), 'utf8'), installLog);
        assert.deepEqual(restarted.snapshot.verified, initial.snapshot.verified);
        assert.notEqual(restarted.snapshot.verified?.revision, restarted.snapshot.saved?.revision);
        assert.equal(item.service.save(item.project, { ...renamed, servers: renamed.servers.filter((server) => server.id === 'api') }, restarted.snapshot.saved!.revision).ok, true);
        assert.deepEqual(item.service.serverIdsForPorts(item.project, [item.definition.servers[0]!.port]), ['frontend']);
        assert.equal((await item.service.run(item.project, { action: 'stop', serverIds: ['frontend'] })).ok, true);
        assert.equal(await probePort(item.definition.servers[0]!.port), false);
        assert.equal(await probePort(item.definition.servers[1]!.port), true);
      } finally { await item.service.dispose(); }
    }
  });

  it('restart of a removed server stops its owned handle but cannot launch a removed recipe', async () => {
    const item = await fixture();
    try {
      const initial = await item.service.run(item.project, { action: 'start' });
      assert.equal(initial.ok, true);
      assert.equal(item.service.save(item.project, { ...item.definition, servers: item.definition.servers.filter((server) => server.id === 'api') }, initial.snapshot.saved!.revision).ok, true);
      const restarted = await item.service.run(item.project, { action: 'restart', serverIds: ['web'] });
      assert(!restarted.ok);
      assert.equal(restarted.reason, t('projectSetup.failure.unknownServer'));
      assert.equal(await probePort(item.definition.servers[0]!.port), false);
      assert.equal(await probePort(item.definition.servers[1]!.port), true);
      assert.equal(launchCount(item.project), 1);
      assert.equal(launchCount(item.project, 'api'), 1);
      assert.equal(item.service.ownsPort(item.project, item.definition.servers[0]!.port), false);
      assert.equal(item.service.ownsPort(item.project, item.definition.servers[1]!.port), true);
    } finally { await item.service.dispose(); }
  });

  it('stable live IDs scope selective Stop and Restart when saved ports are swapped', async () => {
    for (const action of ['stop', 'restart'] as const) {
      const item = await fixture();
      try {
        const initial = await item.service.run(item.project, { action: 'start' });
        assert.equal(initial.ok, true);
        const web = item.definition.servers[0]!;
        const api = item.definition.servers[1]!;
        const apiPid = readFileSync(join(item.project, 'api', 'server.pid'), 'utf8');
        const installLog = readFileSync(join(item.project, 'install.log'), 'utf8');
        const swapped = { ...item.definition, servers: [{ ...web, port: api.port }, { ...api, port: web.port }] };
        assert.equal(item.service.save(item.project, swapped, initial.snapshot.saved!.revision).ok, true);
        const ids = item.service.serverIdsForPorts(item.project, [web.port]);
        assert.deepEqual(ids, ['web']);
        const controlled = await item.service.run(item.project, { action, serverIds: ids });
        assert.equal(controlled.ok, action === 'stop');
        assert.equal(await probePort(web.port), false);
        assert.equal(await probePort(api.port), true);
        assert.equal(item.service.ownsPort(item.project, web.port), false);
        assert.equal(item.service.ownsPort(item.project, api.port), true);
        assert.equal(readFileSync(join(item.project, 'api', 'server.pid'), 'utf8'), apiPid);
        assert.equal(launchCount(item.project), 1);
        assert.equal(launchCount(item.project, 'api'), 1);
        assert.equal(readFileSync(join(item.project, 'install.log'), 'utf8'), installLog);
        assert.deepEqual(controlled.snapshot.verified, initial.snapshot.verified);
      } finally { await item.service.dispose(); }
    }
  });

  it('rejects ambiguous renamed endpoint mappings before stopping either owned sibling', async () => {
    const item = await fixture();
    try {
      const initial = await item.service.run(item.project, { action: 'start' });
      assert.equal(initial.ok, true, JSON.stringify(initial));
      const web = item.definition.servers[0]!;
      const api = item.definition.servers[1]!;
      const ambiguous = { ...item.definition, servers: [{ ...web, id: 'frontend', port: api.port }, { ...api, port: web.port }] };
      assert.equal(item.service.save(item.project, ambiguous, initial.snapshot.saved!.revision).ok, true);
      for (const control of [{ action: 'stop', serverIds: ['frontend'] }, { action: 'restart', serverIds: ['frontend'] }, { action: 'restart', serverIds: ['web'] }] as const) {
        const rejected = await item.service.run(item.project, { action: control.action, serverIds: [...control.serverIds] });
        assert(!rejected.ok);
        assert.equal(rejected.reason, t('projectSetup.failure.ambiguousServer'));
        assert.equal(await probePort(web.port), true);
        assert.equal(await probePort(api.port), true);
        assert.equal(launchCount(item.project), 1);
        assert.equal(launchCount(item.project, 'api'), 1);
      }
      assert.equal((await item.service.run(item.project, { action: 'stop', serverIds: ['web'] })).ok, true);
      assert.equal(await probePort(web.port), false);
      assert.equal(await probePort(api.port), true);
    } finally { await item.service.dispose(); }
  });

  it('invalidates old installation proof before failed or canceled partial reinstall', async () => {
    for (const outcome of ['failed', 'canceled']) {
      const item = await fixture();
      try {
        const definition = { ...item.definition, install: { ...item.definition.install, script: `if test -f partial-install; then touch dependency.ready; printf partial-output; ${outcome === 'failed' ? 'exit 17' : 'sleep 20'}; fi\n${item.definition.install.script}` } };
        assert.equal(item.service.save(item.project, definition, item.service.read(item.project).saved!.revision).ok, true);
        const initial = await item.service.run(item.project, { action: 'start' });
        assert.equal(initial.ok, true, JSON.stringify(initial));
        await item.service.run(item.project, { action: 'stop' });
        const initialFingerprint = item.state.read(item.project).installFingerprint;
        assert(initialFingerprint);
        rmSync(join(item.project, 'dependency.ready'));
        writeFileSync(join(item.project, 'partial-install'), 'yes');
        const reinstall = item.service.run(item.project, { action: 'start' });
        await waitFor(() => existsSync(join(item.project, 'dependency.ready')));
        assert.equal(item.state.read(item.project).installFingerprint, null);
        if (outcome === 'canceled') assert.equal((await item.service.run(item.project, { action: 'stop' })).ok, true);
        const failed = await reinstall;
        assert.equal(failed.ok, false);
        if (outcome === 'failed') assert.equal(failed.snapshot.failure?.exitCode, 17);
        assert.equal(installationReusable(item.project, definition, item.state.read(item.project).installFingerprint), false);
        assert.deepEqual(failed.snapshot.verified, initial.snapshot.verified);
        rmSync(join(item.project, 'partial-install'));
        const repaired = await item.service.run(item.project, { action: 'start' });
        assert.equal(repaired.ok, true, JSON.stringify(repaired));
        assert.equal(readFileSync(join(item.project, 'install.log'), 'utf8').trim().split('\n').length, 2);
        assert.equal(item.state.read(item.project).installFingerprint, initialFingerprint);
      } finally { await item.service.dispose(); }
    }
  });

  it('rolls back only new failed handles, preserving reused web, another Project and an unrelated listener', async () => {
    const outcomes: { cwd: string; action: string; ok: boolean }[] = [];
    const item = await fixture({ runCompleted: (cwd, { action, ok }) => { outcomes.push({ cwd, action, ok }); } });
    const otherProject = join(item.root, 'other-project');
    mkdirSync(otherProject);
    writeFileSync(join(otherProject, 'server.mjs'), readFileSync(join(item.project, 'server.mjs')));
    const otherPort = await freePort();
    const otherDefinition = { prepare: `export PATH="${join(item.project, 'toolchain')}:$PATH"\nexport PREPARED=yes`, install: { script: '', inputs: [], outputs: [] }, servers: [{ id: 'other', cwd: '.', start: 'runtime server.mjs', port: otherPort }] };
    const unrelated = createServer();
    await new Promise<void>((done) => unrelated.listen(0, '127.0.0.1', done));
    const address = unrelated.address();
    assert(address && typeof address !== 'string');
    try {
      assert.equal(item.service.save(otherProject, otherDefinition, null).ok, true);
      const starts = await Promise.all([
        item.service.run(item.project, { action: 'start', serverIds: ['web'] }),
        item.service.run(otherProject, { action: 'start' }),
      ]);
      assert(starts.every((result) => result.ok));
      const otherSnapshot = item.service.read(otherProject);
      const webPid = readFileSync(join(item.project, 'server.pid'), 'utf8');
      writeFileSync(join(item.project, 'api', 'server.mjs'), "process.stdout.write('api-failed'); process.exit(29);\n");
      const failed = await item.service.run(item.project, { action: 'start' });
      assert.equal(failed.ok, false);
      assert.equal(failed.snapshot.failure?.serverId, 'api');
      assert.equal(failed.snapshot.failure?.exitCode, 29);
      assert.equal(failed.snapshot.failure?.outputTail, 'api-failed');
      assert.equal(launchCount(item.project), 1);
      assert.equal(readFileSync(join(item.project, 'server.pid'), 'utf8'), webPid);
      assert.equal(await probePort(item.definition.servers[0]!.port), true);
      assert.equal(await probePort(item.definition.servers[1]!.port), false);
      assert.equal(item.service.ownsPort(item.project, item.definition.servers[0]!.port), true);
      assert.equal(item.service.ownsPort(item.project, item.definition.servers[1]!.port), false);
      assert.equal(await probePort(otherPort), true);
      assert.deepEqual(item.service.read(otherProject), otherSnapshot);
      assert.equal(await probePort(address.port), true);
      assert.equal(item.service.ownsPort(item.project, address.port), false);
      assert.deepEqual(outcomes.filter((measurement) => measurement.cwd === otherProject), [{ cwd: otherProject, action: 'start', ok: true }]);
      assert.deepEqual(outcomes.filter((measurement) => measurement.cwd === item.project), [
        { cwd: item.project, action: 'start', ok: true },
        { cwd: item.project, action: 'start', ok: false },
      ]);
    } finally {
      await item.service.dispose();
      await new Promise<void>((done) => unrelated.close(() => done()));
    }
  });

  it('publishes unexpected exit failures despite persistence errors and cleans the remaining process group', async () => {
    const snapshots: ProjectSetupSnapshot[] = [];
    const item = await fixture({ changed: (_cwd, snapshot) => { snapshots.push(snapshot); } });
    const originalWrite = item.state.write;
    const rejections: unknown[] = [];
    const rejected = (error: unknown) => { rejections.push(error); };
    process.on('unhandledRejection', rejected);
    try {
      const serverPath = join(item.project, 'server.mjs');
      writeFileSync(serverPath, `import {spawn} from 'node:child_process';\nwriteFileSync('descendant.pid',String(spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'}).pid));\n${readFileSync(serverPath, 'utf8')}`);
      assert.equal((await item.service.run(item.project, { action: 'start', serverIds: ['web'] })).ok, true);
      const descendant = Number(readFileSync(join(item.project, 'descendant.pid'), 'utf8'));
      const server = Number(readFileSync(join(item.project, 'server.pid'), 'utf8'));
      item.state.write = (cwd, record) => {
        if (record.failure?.reason === t('projectSetup.failure.unexpectedExit')) throw new Error('storage unavailable');
        originalWrite(cwd, record);
      };
      process.kill(server, 'SIGKILL');
      await waitFor(() => snapshots.some((snapshot) => snapshot.state === 'failed' && snapshot.failure?.reason === t('projectSetup.failure.unexpectedExit')));
      await waitFor(() => !item.service.ownsPort(item.project, item.definition.servers[0]!.port));
      await waitFor(() => {
        try { process.kill(descendant, 0); return false; }
        catch (error) { return (error as NodeJS.ErrnoException).code === 'ESRCH'; }
      });
      const snapshot = item.service.read(item.project);
      assert.equal(snapshot.state, 'failed');
      assert.equal(snapshot.failure?.serverId, 'web');
      assert.equal(snapshot.failure?.reason, t('projectSetup.failure.unexpectedExit'));
      assert(snapshot.failure?.signal === 'SIGKILL' || snapshot.failure?.exitCode === 137);
      assert.equal(await probePort(item.definition.servers[0]!.port), false);
      await pause(50);
      assert.deepEqual(rejections, []);
    } finally {
      item.state.write = originalWrite;
      process.off('unhandledRejection', rejected);
      await item.service.dispose();
    }
  });

  it('retains ownership after failed termination and blocks Restart until a successful stop', async () => {
    const item = await fixture();
    const originalKill = process.kill.bind(process);
    let restore: () => void = () => undefined;
    try {
      assert.equal((await item.service.run(item.project, { action: 'start' })).ok, true);
      const deniedKill = mock.method(process, 'kill', (pid: number, signal?: number | NodeJS.Signals) => {
        if (pid < 0 && signal === 'SIGTERM') throw Object.assign(new Error('operation not permitted'), { code: 'EPERM' });
        return originalKill(pid, signal);
      });
      restore = () => deniedKill.mock.restore();
      const stopped = await item.service.run(item.project, { action: 'stop', serverIds: ['web'] });
      assert.equal(stopped.ok, false);
      assert.equal(stopped.snapshot.failure?.stage, 'stop');
      assert.equal(stopped.snapshot.failure?.serverId, 'web');
      assert.equal(item.service.ownsPort(item.project, item.definition.servers[0]!.port), true);
      assert.equal(await probePort(item.definition.servers[0]!.port), true);
      const restarted = await item.service.run(item.project, { action: 'restart', serverIds: ['web'] });
      assert.equal(restarted.ok, false);
      assert.equal(launchCount(item.project), 1);
      await assert.rejects(item.service.forget(item.project));
      assert(item.service.read(item.project).saved);
      restore();
      assert.equal((await item.service.run(item.project, { action: 'stop', serverIds: ['web'] })).ok, true);
      assert.equal(item.service.ownsPort(item.project, item.definition.servers[0]!.port), false);
      assert.equal(await probePort(item.definition.servers[0]!.port), false);
      assert.equal(await probePort(item.definition.servers[1]!.port), true);
    } finally { restore(); await item.service.dispose(); }
  });

  it('tells a Stop during a pending run about that run, not about the failure already asked about', async () => {
    let entered: () => void = () => undefined;
    const reporting = new Promise<void>((resolve) => { entered = resolve; });
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => { release = resolve; });
    let hold = false;
    const originalKill = process.kill.bind(process);
    const item = await fixture({ report: async () => { if (hold) { entered(); await held; } } });
    try {
      assert.equal((await item.service.run(item.project, { action: 'start' })).ok, true);
      const deniedKill = mock.method(process, 'kill', (pid: number, signal?: number | NodeJS.Signals) => {
        if (pid < 0 && signal === 'SIGTERM') throw Object.assign(new Error('operation not permitted'), { code: 'EPERM' });
        return originalKill(pid, signal);
      });
      const denied = await item.service.run(item.project, { action: 'stop', serverIds: ['web'] });
      deniedKill.mock.restore();
      assert.equal(denied.ok, false);
      assert.equal(denied.snapshot.failure?.serverId, 'web');
      assert.equal(item.service.ownsPort(item.project, item.definition.servers[0]!.port), true);
      hold = true;
      const starting = item.service.run(item.project, { action: 'start', serverIds: ['api'] });
      await reporting;
      assert.equal(item.service.read(item.project).state, 'starting');
      const stopped = await item.service.run(item.project, { action: 'stop', serverIds: ['api'] });
      assert.equal((await starting).ok, false);
      assert.equal(stopped.ok, false);
      assert.equal(stopped.snapshot.state, 'failed');
      assert.equal(stopped.snapshot.failure?.stage, 'stop');
      assert.equal(stopped.snapshot.failure?.serverId, undefined);
      assert.equal(stopped.snapshot.failure?.reason, t('projectSetup.failure.processGroupAlive'));
      assert.equal(stopped.snapshot.failure?.revision, item.service.read(item.project).saved?.revision);
      assert.equal(isSameSetupFailure(stopped.snapshot.failure, denied.snapshot.failure), false);
      assert.deepEqual(item.state.read(item.project).failure, stopped.snapshot.failure);
      assert.equal(await probePort(item.definition.servers[1]!.port), false);
    } finally { release(); mock.restoreAll(); await item.service.dispose(); }
  });

  it('keeps a superseded Stop from leaving its failure on the successor', async () => {
    const item = await fixture();
    const originalKill = process.kill.bind(process);
    let restore: () => void = () => undefined;
    try {
      assert.equal((await item.service.run(item.project, { action: 'start' })).ok, true);
      let denials = 0;
      const deniedKill = mock.method(process, 'kill', (pid: number, signal?: number | NodeJS.Signals) => {
        if (pid < 0 && signal === 'SIGTERM' && denials < item.definition.servers.length) {
          denials += 1;
          throw Object.assign(new Error('operation not permitted'), { code: 'EPERM' });
        }
        return originalKill(pid, signal);
      });
      restore = () => deniedKill.mock.restore();
      const superseded = item.service.run(item.project, { action: 'stop' });
      const successor = item.service.run(item.project, { action: 'stop' });
      assert.equal((await superseded).ok, false);
      assert.equal((await successor).ok, true);
      const settled = item.service.read(item.project);
      assert.equal(settled.state, 'idle');
      assert.equal(settled.failure, null);
      assert.equal(item.state.read(item.project).failure, null);
      for (const server of item.definition.servers) assert.equal(await probePort(server.port), false);
    } finally { restore(); await item.service.dispose(); }
  });

  it('forgets a missing saved symlink path after service and state recreation', async () => {
    const item = await fixture();
    const alias = join(item.root, 'linked-project');
    symlinkSync(item.project, alias);
    const canonical = canonicalPath(alias);
    assert.equal(item.service.save(alias, item.definition, item.service.read(alias).saved!.revision).ok, true);
    rmSync(item.project, { recursive: true });
    rmSync(alias);
    const reopenedState = createSetupState(() => item.root);
    const reopened = createProjectSetupService({ ...item.deps, state: reopenedState });
    try {
      assert(reopened.read(alias).saved);
      await reopened.forget(alias);
      assert.equal(createSetupState(() => item.root).read(canonical).saved, null);
      assert.equal(JSON.parse(readFileSync(join(item.root, 'project-setup.json'), 'utf8')).data[canonical], undefined);
    } finally { await reopened.dispose(); await item.service.dispose(); }
  });

  it('quit escalates an already-pending graceful Stop before the application quit cap', async () => {
    const item = await fixture({ stopGraceMs: 4000 });
    try {
      assert.equal((await item.service.run(item.project, { action: 'start' })).ok, true);
      const stopped = item.service.run(item.project, { action: 'stop' });
      item.service.disposeNow();
      const completed = await Promise.race([stopped, pause(750).then(() => null)]);
      assert(completed, 'quit must not wait for the four-second graceful Stop');
      assert.equal(completed.ok, true, JSON.stringify(completed));
      await item.service.dispose();
      assert.equal(item.service.read(item.project).failure, null);
      for (const server of item.definition.servers) assert.equal(await probePort(server.port), false);
    } finally { await item.service.dispose(); }
  });

  it('marks quit termination intentional even when the successful run is no longer active', async () => {
    const snapshots: ProjectSetupSnapshot[] = [];
    const item = await fixture({ changed: (_cwd, snapshot) => { snapshots.push(snapshot); } });
    try {
      const started = await item.service.run(item.project, { action: 'start' });
      assert.equal(started.ok, true);
      item.service.disposeNow();
      await item.service.dispose();
      await pause(100);
      assert.equal(item.service.read(item.project).failure, null);
      assert.deepEqual(item.service.read(item.project).verified, started.snapshot.verified);
      assert.equal(snapshots.some((snapshot) => snapshot.failure?.reason === t('projectSetup.failure.unexpectedExit')), false);
      for (const server of item.definition.servers) {
        assert.equal(await probePort(server.port), false);
        assert.equal(item.service.ownsPort(item.project, server.port), false);
      }
    } finally { await item.service.dispose(); }
  });
});
