import { afterAll, describe, expect, it, spyOn } from 'bun:test';
import { cleanupTempFixtures, makeDirWithFiles } from '@studio/fixtures';
import type { VersionedProjectSetup } from '@studio/events';
import { t } from '@studio/i18n';
import { createProjectSetupService, redactSetupOutput, type ProjectSetupDeps } from './runner.js';
import { createSetupState, emptyRecord, INVALID_RECORD_REVISION } from './state.js';

afterAll(cleanupTempFixtures);
const definition = { prepare: '', install: { script: '', inputs: [], outputs: [] }, servers: [{ id: 'web', cwd: '.', start: 'sleep 10', port: 48001 }] };

describe('setup runner failures and state', () => {
  it('diagnoses a verified alternate listening port without treating a printed URL as proof', async () => {
    for (const owned of [true, false]) {
      const project = makeDirWithFiles({});
      const root = makeDirWithFiles({});
      const elsewhere = makeDirWithFiles({});
      const diagnostics: Parameters<NonNullable<ProjectSetupDeps['diagnostics']>>[1][] = [];
      const service = createProjectSetupService({
        state: createSetupState(() => root), env: async () => process.env,
        report: async () => undefined, stopGraceMs: 25, readyTimeoutMs: 150,
        probe: async port => port === 48002,
        identify: async () => ({ pid: process.pid, cwd: owned ? project : elsewhere }),
        diagnostics: (_cwd, measurement) => { diagnostics.push(measurement); },
      });
      try {
        service.save(project, { ...definition, servers: [{ ...definition.servers[0]!, start: 'printf "Local: http://localhost:48002/\\n"; sleep 10' }] }, null);
        expect((await service.run(project, { action: 'start' })).ok).toBe(false);
        expect(diagnostics.find(row => row.reported_port === 48002)).toMatchObject({ expected_port: 48001, cause: 'readiness_timeout', process_exited: false });
        expect(diagnostics.some(row => row.actual_port === 48002)).toBe(owned);
        if (owned) expect(diagnostics.at(-1)).toMatchObject({ actual_port: 48002, cause: 'reported_port_mismatch' });
      } finally { await service.dispose(); }
    }
  });

  it('keeps a superseded environment read from replacing the next run failure', async () => {
    const project = makeDirWithFiles({});
    const root = makeDirWithFiles({});
    let release: (env: NodeJS.ProcessEnv) => void = () => undefined;
    const held = new Promise<NodeJS.ProcessEnv>((resolve) => { release = resolve; });
    let reads = 0;
    const service = createProjectSetupService({ state: createSetupState(() => root), env: () => ++reads === 1 ? held : Promise.resolve(process.env), report: async () => undefined, stopGraceMs: 25 });
    try {
      service.save(project, definition, null);
      const first = service.run(project, { action: 'start' });
      await Promise.resolve();
      expect(service.read(project).state).toBe('preparing');
      expect((await service.run(project, { action: 'stop' })).ok).toBe(true);
      expect((await first).ok).toBe(false);
      service.save(project, { ...definition, install: { ...definition.install, script: 'exit 23' } }, service.read(project).saved!.revision);
      const failed = await service.run(project, { action: 'start' });
      expect(failed.ok).toBe(false);
      expect(failed.snapshot.state).toBe('failed');
      expect(failed.snapshot.failure?.stage).toBe('install');
      expect(failed.snapshot.failure?.exitCode).toBe(23);
      release(process.env);
      await Promise.resolve();
      expect(service.read(project)).toEqual(failed.snapshot);
    } finally { release(process.env); await service.dispose(); }
  });

  it('reconnects again after a framework replaces its listener PID in the same project', async () => {
    const project = makeDirWithFiles({});
    const root = makeDirWithFiles({});
    let pid = process.pid;
    const service = createProjectSetupService({
      state: createSetupState(() => root), env: async () => process.env,
      probe: async () => true, identify: async () => ({ pid, cwd: project }), report: async () => undefined,
    });
    try {
      service.save(project, definition, null);
      expect((await service.run(project, { action: 'start' })).ok).toBe(true);
      pid += 1;
      expect((await service.run(project, { action: 'start' })).ok).toBe(true);
      expect(service.serverIdsForPorts(project, [48001])).toEqual(['web']);
    } finally { await service.dispose(); }
  });

  it('rechecks every reconnected endpoint after later servers report ready', async () => {
    for (const change of ['closed', 'foreign', 'unknown', 'pid', 'folder'] as const) {
      const project = makeDirWithFiles({ files: { 'api/marker': 'ready' } });
      const root = makeDirWithFiles({});
      const next = { ...definition, servers: [...definition.servers, { id: 'api', cwd: 'api', start: 'sleep 10', port: 48002 }] };
      let laterReady = false;
      let finalIdentifications = 0;
      const service = createProjectSetupService({
        state: createSetupState(() => root), env: async () => process.env, identifyRetryMs: 1,
        probe: async (port) => !(port === 48001 && laterReady && change === 'closed'),
        identify: async (port) => {
          if (port === 48002) return { pid: process.pid, cwd: `${project}/api` };
          if (!laterReady) return { pid: process.pid, cwd: project };
          finalIdentifications += 1;
          if (change === 'unknown') return undefined;
          return { pid: change === 'pid' ? process.pid + 1 : process.pid, cwd: change === 'foreign' ? root : change === 'folder' ? `${project}/api` : project };
        },
        report: async (_cwd, _folder, port) => { if (port === 48002) laterReady = true; },
      });
      try {
        service.save(project, next, null);
        const failed = await service.run(project, { action: 'start' });
        expect(failed.ok).toBe(false);
        expect(failed.snapshot.verified).toBeNull();
        expect(failed.snapshot.failure?.stage).toBe('ready');
        expect(failed.snapshot.failure?.serverId).toBe('web');
        expect(finalIdentifications).toBe(change === 'unknown' ? 3 : change === 'closed' ? 0 : 1);
      } finally { await service.dispose(); }
    }
  });

  it('retries unseen reconnect identities without launching a replacement or calling them foreign', async () => {
    for (const unseen of [1, Infinity]) {
      const project = makeDirWithFiles({});
      const root = makeDirWithFiles({});
      let identifications = 0;
      let reports = 0;
      const measurements: Parameters<NonNullable<ProjectSetupDeps['runCompleted']>>[1][] = [];
      const service = createProjectSetupService({
        state: createSetupState(() => root), env: async () => process.env, probe: async () => true, identifyRetryMs: 1,
        identify: async () => { identifications += 1; return identifications <= unseen ? undefined : { pid: process.pid, cwd: project }; },
        report: async () => { reports += 1; }, runCompleted: (_cwd, measurement) => { measurements.push(measurement); },
      });
      try {
        service.save(project, definition, null);
        const outcome = await service.run(project, { action: 'start' });
        expect(outcome.ok).toBe(unseen === 1);
        expect(identifications).toBe(3);
        expect(reports).toBe(unseen === 1 ? 1 : 0);
        expect(measurements[0]?.failure_reason).toBe(unseen === 1 ? undefined : 'listener_unseen');
        if (unseen === Infinity) expect(outcome.snapshot.verified).toBeNull();
      } finally { await service.dispose(); }
    }
  });

  it('retains reconnect routing and rejects Stop and Restart when exact listener identity cannot be proved', async () => {
    for (const change of ['unknown', 'foreign', 'pid', 'folder', 'self'] as const) {
      const project = makeDirWithFiles({ files: { 'nested/marker': 'ready' } });
      const root = makeDirWithFiles({});
      const pid = change === 'self' ? process.pid : process.pid + 100000;
      let changed = false;
      let stopIdentifications = 0;
      const service = createProjectSetupService({
        state: createSetupState(() => root), env: async () => process.env, probe: async () => true, identifyRetryMs: 1,
        identify: async () => {
          if (!changed) return { pid, cwd: project };
          stopIdentifications += 1;
          if (change === 'unknown') return { pid };
          return { pid: change === 'pid' ? pid + 1 : pid, cwd: change === 'foreign' ? root : change === 'folder' ? `${project}/nested` : project };
        }, report: async () => undefined,
      });
      let restore: () => void = () => undefined;
      try {
        service.save(project, definition, null);
        expect((await service.run(project, { action: 'start' })).ok).toBe(true);
        changed = true;
        const signal = spyOn(process, 'kill').mockImplementation(() => true);
        restore = () => signal.mockRestore();
        const ids = service.serverIdsForPorts(project, [48001]);
        expect(ids).toEqual(['web']);
        const stopped = await service.run(project, { action: 'stop', serverIds: ids });
        expect(stopped.ok).toBe(false);
        expect(stopped.snapshot.failure?.stage).toBe('stop');
        expect(service.ownsPort(project, 48001)).toBe(true);
        expect((await service.run(project, { action: 'restart', serverIds: ids })).ok).toBe(false);
        expect(stopIdentifications).toBe(0);
        expect(signal).not.toHaveBeenCalled();
      } finally { restore(); await service.dispose(); }
    }
  });

  it('never signals a reconnected listener that Onlook did not start', async () => {
    const project = makeDirWithFiles({});
    const root = makeDirWithFiles({});
    const pid = process.pid + 100000;
    let replaced = false;
    const service = createProjectSetupService({
      state: createSetupState(() => root), env: async () => process.env, probe: async () => true, stopGraceMs: 0,
      identify: async () => ({ pid: replaced ? pid + 1 : pid, cwd: project }), report: async () => undefined,
    });
    let restore: () => void = () => undefined;
    try {
      service.save(project, definition, null);
      expect((await service.run(project, { action: 'start' })).ok).toBe(true);
      const signal = spyOn(process, 'kill').mockImplementation(() => { replaced = true; return true; });
      restore = () => signal.mockRestore();
      expect((await service.run(project, { action: 'stop' })).ok).toBe(false);
      expect(signal).not.toHaveBeenCalled();
      expect(service.read(project).failure?.reason).toContain(t('projectSetup.failure.notStartedHere', { port: 48001 }));
      expect(service.ownsPort(project, 48001)).toBe(true);
    } finally { restore(); await service.dispose(); }
  });

  it('retires a reconnect that disappears between probes before retaining its replacement child', async () => {
    const project = makeDirWithFiles({});
    const root = makeDirWithFiles({});
    let replacing = false;
    let probes = 0;
    let stopping = false;
    const service = createProjectSetupService({
      state: createSetupState(() => root), env: async () => process.env, stopGraceMs: 25,
      probe: async () => { if (stopping) return false; if (replacing) probes += 1; return !replacing || probes !== 2; },
      identify: async () => ({ pid: process.pid, cwd: project }), report: async () => undefined,
    });
    try {
      service.save(project, definition, null);
      expect((await service.run(project, { action: 'start' })).ok).toBe(true);
      replacing = true;
      expect((await service.run(project, { action: 'start' })).ok).toBe(true);
      expect((await service.run(project, { action: 'start' })).ok).toBe(true);
      expect(service.serverIdsForPorts(project, [48001])).toEqual(['web']);
    } finally { stopping = true; await service.dispose(); }
  });

  it('does not verify a reconnect after reporting rejects or is canceled, but retains it for explicit Stop', async () => {
    for (const canceled of [false, true]) {
      const project = makeDirWithFiles({});
      const root = makeDirWithFiles({});
      let listening = true;
      let entered: () => void = () => undefined;
      const reporting = new Promise<void>((done) => { entered = done; });
      let release: () => void = () => undefined;
      const held = new Promise<void>((done) => { release = done; });
      const service = createProjectSetupService({
        state: createSetupState(() => root), env: async () => process.env, probe: async () => listening,
        identify: async () => ({ pid: process.pid, cwd: project }),
        report: async () => { entered(); if (canceled) await held; else throw new Error('report rejected'); },
      });
      try {
        service.save(project, definition, null);
        const starting = service.run(project, { action: 'start' });
        await reporting;
        expect(service.ownsPort(project, 48001)).toBe(true);
        if (canceled) {
          listening = false;
          expect((await service.run(project, { action: 'stop' })).ok).toBe(true);
        }
        const failed = await starting;
        expect(failed.ok).toBe(false);
        expect(failed.snapshot.verified).toBeNull();
        expect(failed.ok ? undefined : failed.reason).toBe(canceled ? t('projectSetup.failure.canceled') : 'report rejected');
        listening = false;
        expect((await service.run(project, { action: 'stop' })).ok).toBe(true);
        expect(service.serverIdsForPorts(project, [48001])).toEqual([]);
      } finally { release(); await service.dispose(); }
    }
  });

  it('keeps a superseded reconnect report from replacing the next run failure after explicit Stop', async () => {
    const project = makeDirWithFiles({});
    const root = makeDirWithFiles({});
    const pid = process.pid + 100000;
    let listening = true;
    let entered: () => void = () => undefined;
    const reporting = new Promise<void>((resolve) => { entered = resolve; });
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const service = createProjectSetupService({
      state: createSetupState(() => root), env: async () => process.env, stopGraceMs: 0,
      probe: async () => listening, identify: async () => ({ pid, cwd: project }),
      report: async () => { entered(); await held; },
    });
    let restore: () => void = () => undefined;
    try {
      service.save(project, definition, null);
      const starting = service.run(project, { action: 'start' });
      await reporting;
      expect(service.ownsPort(project, 48001)).toBe(true);
      const signal = spyOn(process, 'kill').mockImplementation(() => { listening = false; return true; });
      restore = () => signal.mockRestore();
      listening = false;
      const stopped = await service.run(project, { action: 'stop', serverIds: ['web'] });
      expect(stopped.ok).toBe(true);
      expect(stopped.snapshot.state).toBe('idle');
      expect(signal).not.toHaveBeenCalled();
      expect((await starting).ok).toBe(false);
      expect(service.ownsPort(project, 48001)).toBe(false);
      expect(service.serverIdsForPorts(project, [48001])).toEqual([]);
      restore();
      service.save(project, { ...definition, install: { ...definition.install, script: 'exit 23' } }, service.read(project).saved!.revision);
      const failed = await service.run(project, { action: 'start' });
      expect(failed.ok).toBe(false);
      expect(failed.snapshot.state).toBe('failed');
      expect(failed.snapshot.failure?.stage).toBe('install');
      expect(failed.snapshot.failure?.exitCode).toBe(23);
      release();
      await Promise.resolve();
      expect(service.read(project)).toEqual(failed.snapshot);
      expect(service.ownsPort(project, 48001)).toBe(false);
    } finally { release(); restore(); await service.dispose(); }
  });

  it('reports failed setup runs with scalar measurements, not commands or output', async () => {
    const project = makeDirWithFiles({});
    const root = makeDirWithFiles({});
    const measurements: Parameters<NonNullable<ProjectSetupDeps['runCompleted']>>[1][] = [];
    const reuse: boolean[] = [];
    const diagnostics: Parameters<NonNullable<ProjectSetupDeps['diagnostics']>>[1][] = [];
    const service = createProjectSetupService({
      state: createSetupState(() => root),
      env: async () => process.env,
      report: async () => undefined,
      runCompleted: (_cwd, measurement) => { measurements.push(measurement); },
      installationChecked: (_cwd, reused) => { reuse.push(reused); },
      diagnostics: (_cwd, measurement) => { diagnostics.push(measurement); },
      stopGraceMs: 25,
    });
    try {
      service.save(project, { ...definition, install: { ...definition.install, script: 'printf private-install-output; exit 17' } }, null);
      expect((await service.run(project, { action: 'start' })).ok).toBe(false);
      expect(measurements).toEqual([{ action: 'start', ok: false, duration_ms: expect.any(Number), failure_stage: 'install' }]);
      expect(measurements[0]!.duration_ms).toBeGreaterThanOrEqual(0);
      expect(reuse).toEqual([false]);
      expect(JSON.stringify(measurements)).not.toContain(project);
      expect(JSON.stringify(measurements)).not.toContain('private-install-output');
      expect(JSON.stringify(measurements)).not.toContain('exit 17');
      expect(diagnostics.at(-1)).toMatchObject({ cause: 'install_failed', process_exited: true, exit_code: 17, install_succeeded: false, spawn_to_failure_ms: expect.any(Number) });
      expect(JSON.stringify(diagnostics)).not.toContain(project);
      expect(JSON.stringify(diagnostics)).not.toContain('private-install-output');
    } finally { await service.dispose(); }
  });

  it('rejects stale saves without replacing a definition', async () => {
    const project = makeDirWithFiles({});
    const root = makeDirWithFiles({});
    const service = createProjectSetupService({ state: createSetupState(() => root), report: async () => undefined });
    expect(service.save(project, definition, null).ok).toBe(true);
    const saved = service.read(project).saved;
    expect(service.save(project, { ...definition, prepare: 'true' }, null).ok).toBe(false);
    expect(service.read(project).saved).toEqual(saved);
    expect(service.save(project, { ...definition, prepare: 'true' }, saved!.revision).ok).toBe(true);
    await service.dispose();
  });

  it('looks up owned port IDs independently of saved renames, removals and port changes', async () => {
    const project = makeDirWithFiles({ files: { 'api/marker': 'ready' } });
    const root = makeDirWithFiles({});
    let probes = 0;
    let stopping = false;
    const service = createProjectSetupService({
      state: createSetupState(() => root), env: async () => process.env,
      probe: async () => { probes += 1; return !stopping && probes > 1; },
      identify: async () => ({ pid: process.pid, cwd: project }), report: async () => undefined, stopGraceMs: 25,
    });
    try {
      service.save(project, definition, null);
      const started = await service.run(project, { action: 'start' });
      expect(started.ok).toBe(true);
      const next = { ...definition, servers: [{ ...definition.servers[0]!, id: 'frontend', port: 48002 }, { id: 'api', cwd: 'api', start: 'sleep 10', port: 48003 }] };
      expect(service.save(project, next, started.snapshot.saved!.revision).ok).toBe(true);
      expect(service.serverIdsForPorts(project, [48001, 48001, 48002])).toEqual(['web']);
      expect(service.serverIdsForPorts(root, [48001])).toEqual([]);
      expect(service.ownsPort(project, 48001)).toBe(true);
      expect(service.ownsPort(project, 48002)).toBe(false);
      expect(service.save(project, { ...next, servers: [next.servers[1]!] }, service.read(project).saved!.revision).ok).toBe(true);
      const ids = service.serverIdsForPorts(project, [48001]);
      expect(ids).toEqual(['web']);
      stopping = true;
      expect((await service.run(project, { action: 'stop', serverIds: ids })).ok).toBe(true);
      expect(service.serverIdsForPorts(project, [48001])).toEqual([]);
    } finally { stopping = true; await service.dispose(); }
  });

  it('retains the exact install exit and bounded redacted output without verification', async () => {
    const project = makeDirWithFiles({});
    const root = makeDirWithFiles({});
    const service = createProjectSetupService({ state: createSetupState(() => root), env: async () => ({ ...process.env, API_TOKEN: 'private-value' }), report: async () => { throw new Error('not reached'); }, stopGraceMs: 50 });
    service.save(project, { ...definition, install: { script: 'printf "failed API_TOKEN=$API_TOKEN\\n"; exit 17', inputs: [], outputs: ['dependency.ready'] } }, null);
    const result = await service.run(project, { action: 'start' });
    expect(result.ok).toBe(false);
    expect(result.snapshot.state).toBe('failed');
    expect(result.snapshot.failure?.stage).toBe('install');
    expect(result.snapshot.failure?.exitCode).toBe(17);
    expect(result.snapshot.failure?.outputTail).toContain('failed API_TOKEN=[redacted]');
    expect(result.snapshot.verified).toBeNull();
    await service.dispose();
  });

  it('retains the final stderr marker after a short failed command emits more than the output bound', async () => {
    const project = makeDirWithFiles({});
    const root = makeDirWithFiles({});
    const service = createProjectSetupService({ state: createSetupState(() => root), env: async () => process.env, report: async () => undefined, stopGraceMs: 25 });
    try {
      const marker = 'FINAL_STDERR_AFTER_LARGE_OUTPUT';
      service.save(project, { ...definition, install: { ...definition.install, script: `printf '%020000d' 0 >&2\nprintf '\\n${marker}\\n' >&2\nexit 17` } }, null);
      const failed = await service.run(project, { action: 'start' });
      expect(failed.ok).toBe(false);
      expect(failed.snapshot.failure?.stage).toBe('install');
      expect(failed.snapshot.failure?.exitCode).toBe(17);
      expect(failed.snapshot.failure?.outputTail.length).toBe(16384);
      expect(failed.snapshot.failure?.outputTail.endsWith(`${marker}\n`)).toBe(true);
      expect(failed.snapshot.verified).toBeNull();
    } finally { await service.dispose(); }
  });

  it('reconnects a reopened project to its own listener without launching another process', async () => {
    const project = makeDirWithFiles({});
    const root = makeDirWithFiles({});
    const reports: number[] = [];
    const service = createProjectSetupService({
      state: createSetupState(() => root), env: async () => process.env,
      probe: async () => true, identify: async () => ({ pid: 12345, cwd: project }),
      report: async (_cwd, _folder, port) => { reports.push(port); },
    });
    try {
      service.save(project, { ...definition, servers: [{ ...definition.servers[0]!, start: 'exit 37' }] }, null);
      const result = await service.run(project, { action: 'start' });
      expect(result.ok).toBe(true);
      expect(result.snapshot.state).toBe('running');
      expect(result.snapshot.verified).toEqual(result.snapshot.saved);
      expect(reports).toEqual([48001]);
      expect(service.ownsPort(project, 48001)).toBe(true);
      expect(service.serverIdsForPorts(project, [48001])).toEqual(['web']);
      expect((await service.run(project, { action: 'start' })).ok).toBe(true);
      expect(reports).toEqual([48001, 48001]);
    } finally { await service.dispose(); }
  });

  it('distinguishes occupied listener from launch failure', async () => {
    const project = makeDirWithFiles({});
    const root = makeDirWithFiles({});
    const elsewhere = makeDirWithFiles({});
    const service = createProjectSetupService({ state: createSetupState(() => root), env: async () => process.env, probe: async () => true, identify: async () => ({ pid: 12345, cwd: elsewhere }), report: async () => { throw new Error('must not report a foreign listener'); } });
    service.save(project, definition, null);
    const result = await service.run(project, { action: 'start' });
    expect(result.ok).toBe(false);
    expect(result.snapshot.failure?.stage).toBe('ready');
    expect(result.snapshot.failure?.reason).toBe(t('projectSetup.failure.occupiedPort', { port: 48001 }));
    await service.dispose();
  });

  it('redacts known environment secrets and credential-like assignments', () => {
    expect(redactSetupOutput('secret-value PASSWORD=abc something', { API_TOKEN: 'secret-value' })).toBe('[redacted] PASSWORD=[redacted] something');
    expect(redactSetupOutput('a.$&[x] then a.$&[x]', { API_TOKEN: 'a.$&[x]' })).toBe('[redacted] then [redacted]');
    expect(redactSetupOutput('tiny abc', { API_TOKEN: 'abc' })).toBe('tiny abc');
    expect(redactSetupOutput('PASSWORD="two secret words" next API_KEY=\'another secret\' done', {})).toBe('PASSWORD=[redacted] next API_KEY=[redacted] done');
    expect(redactSetupOutput('TOKEN="escaped\\" secret text" done', {})).toBe('TOKEN=[redacted] done');
  });

  it('preserves preparation exits and separate preparation/install timeout failures', async () => {
    for (const entry of [
      { prepare: 'printf prepare-failed; exit 19', install: '', stage: 'prepare', reason: 'Setup command failed', exitCode: 19 },
      { prepare: 'sleep 10', install: '', stage: 'prepare', reason: 'Setup command timed out', exitCode: undefined },
      { prepare: '', install: 'sleep 10', stage: 'install', reason: 'Setup command timed out', exitCode: undefined },
    ] as const) {
      const project = makeDirWithFiles({});
      const root = makeDirWithFiles({});
      let reports = 0;
      const service = createProjectSetupService({ state: createSetupState(() => root), env: async () => process.env, report: async () => { reports += 1; }, installTimeoutMs: 100, stopGraceMs: 25 });
      try {
        service.save(project, { ...definition, prepare: entry.prepare, install: { ...definition.install, script: entry.install } }, null);
        const failed = await service.run(project, { action: 'start' });
        expect(failed.ok).toBe(false);
        expect(failed.snapshot.state).toBe('failed');
        expect(failed.snapshot.failure?.stage).toBe(entry.stage);
        expect(failed.snapshot.failure?.reason).toBe(entry.reason);
        expect(failed.snapshot.failure?.exitCode).toBe(entry.exitCode);
        if (entry.exitCode !== undefined) expect(failed.snapshot.failure?.outputTail).toBe('prepare-failed');
        expect(failed.snapshot.verified).toBeNull();
        expect(reports).toBe(0);
      } finally { await service.dispose(); }
    }
  });

  it('records early exits, readiness deadlines and immediate Start/Stop cancellation distinctly', async () => {
    for (const entry of [{ start: 'exit 23', stage: 'start' }, { start: 'sleep 10', stage: 'ready' }] as const) {
      const project = makeDirWithFiles({});
      const root = makeDirWithFiles({});
      const service = createProjectSetupService({ state: createSetupState(() => root), env: async () => process.env, probe: async () => false, report: async () => undefined, readyTimeoutMs: entry.stage === 'start' ? 2000 : 150, stopGraceMs: 25 });
      service.save(project, { ...definition, servers: [{ ...definition.servers[0]!, start: entry.start }] }, null);
      const failed = await service.run(project, { action: 'start' });
      expect(failed.ok).toBe(false);
      expect(failed.snapshot.failure?.stage).toBe(entry.stage);
      if (entry.stage === 'start') expect(failed.snapshot.failure?.exitCode).toBe(23);
      await service.dispose();
    }
    const project = makeDirWithFiles({});
    const root = makeDirWithFiles({});
    let reports = 0;
    const service = createProjectSetupService({ state: createSetupState(() => root), env: async () => process.env, probe: async () => false, report: async () => { reports += 1; }, stopGraceMs: 25 });
    service.save(project, definition, null);
    const start = service.run(project, { action: 'start' });
    const stop = service.run(project, { action: 'stop' });
    expect((await stop).ok).toBe(true);
    expect((await start).ok).toBe(false);
    expect(reports).toBe(0);
    expect(service.read(project).state).toBe('idle');
    await service.dispose();
  });

  it('retries a listener it could not see, and never calls an unseen listener foreign', async () => {
    const port = definition.servers[0]!.port;
    for (const entry of [
      { unseen: 1, foreign: false, reason: undefined, copy: undefined },
      { unseen: Infinity, foreign: false, reason: 'listener_unseen', copy: t('projectSetup.failure.listenerUnseen', { port }) },
      { unseen: 0, foreign: true, reason: 'listener_foreign', copy: t('projectSetup.failure.listenerFolder') },
    ] as const) {
      const project = makeDirWithFiles({});
      const root = makeDirWithFiles({});
      const elsewhere = makeDirWithFiles({});
      const measurements: Parameters<NonNullable<ProjectSetupDeps['runCompleted']>>[1][] = [];
      let calls = 0;
      const service = createProjectSetupService({
        state: createSetupState(() => root), env: async () => process.env, report: async () => undefined, stopGraceMs: 25, identifyRetryMs: 1,
        runCompleted: (_cwd, measurement) => { measurements.push(measurement); },
        probe: (() => { let probes = 0; return async () => (probes += 1) > 1; })(),
        identify: async () => {
          calls += 1;
          await new Promise((settle) => setTimeout(settle, 5));
          return calls <= entry.unseen ? undefined : { pid: process.pid, cwd: entry.foreign ? elsewhere : project };
        },
      });
      try {
        service.save(project, definition, null);
        const result = await service.run(project, { action: 'start' });
        expect(result.ok).toBe(entry.copy === undefined);
        expect(result.snapshot.failure?.reason).toBe(entry.copy);
        expect(measurements[0]?.failure_reason).toBe(entry.reason);
      } finally { await service.dispose(); }
    }
  });

  it('sends no failure reason for a run that fails before it starts, after one that sent a reason', async () => {
    const project = makeDirWithFiles({});
    const root = makeDirWithFiles({});
    const measurements: Parameters<NonNullable<ProjectSetupDeps['runCompleted']>>[1][] = [];
    const service = createProjectSetupService({
      state: createSetupState(() => root), env: async () => process.env, report: async () => undefined, stopGraceMs: 25, identifyRetryMs: 1,
      runCompleted: (_cwd, measurement) => { measurements.push(measurement); },
      probe: (() => { let probes = 0; return async () => (probes += 1) > 1; })(),
      identify: async () => undefined,
    });
    try {
      service.save(project, definition, null);
      expect((await service.run(project, { action: 'start' })).ok).toBe(false);
      expect((await service.run(project, { action: 'start', serverIds: ['not-a-server'] })).ok).toBe(false);
      expect(measurements.map((measurement) => measurement.failure_reason)).toStrictEqual(['listener_unseen', undefined]);
      expect(Object.keys(measurements[1]!)).not.toContain('failure_reason');
    } finally { await service.dispose(); }
  });

  it('keeps a live failure out of the stored read, so it cannot sit over an invalid record', async () => {
    const project = makeDirWithFiles({});
    const root = makeDirWithFiles({});
    const state = createSetupState(() => root);
    const service = createProjectSetupService({ state, env: async () => process.env, report: async () => undefined, stopGraceMs: 25 });
    try {
      service.save(project, { ...definition, install: { ...definition.install, script: 'exit 17' } }, null);
      expect((await service.run(project, { action: 'start' })).ok).toBe(false);
      state.write(project, { ...emptyRecord(), saved: { revision: 'not-the-hash-of-this-definition', definition } as VersionedProjectSetup });
      expect(service.read(project).failure?.revision).not.toBe(INVALID_RECORD_REVISION);
      expect(service.readStored(project).failure?.revision).toBe(INVALID_RECORD_REVISION);
      expect(service.readStored(project).verified).toBeNull();
    } finally { await service.dispose(); }
  });
});
