import { afterAll, describe, expect, it } from 'bun:test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { cleanupTempFixtures, makeDirWithFiles } from '@studio/fixtures';
import { projectSetupAskKind } from '@studio/events';
import { createProjectSetupService } from './runner.js';
import { createSetupState } from './state.js';

afterAll(cleanupTempFixtures);
const definition = { prepare: '', install: { script: '', inputs: [], outputs: [] }, servers: [
  { id: 'web', cwd: '.', start: "printf '%s' '{{port}}' > selected-port; exec sleep 10", port: 48001 },
] };

describe('port relocation recovery', () => {
  it('preserves saves, reconnect validation and server diagnostics across deferred reports', async () => {
    for (const scenario of ['save', 'disconnect', 'reject'] as const) {
      const project = makeDirWithFiles({ files: { 'api/marker': 'ready' } });
      const root = makeDirWithFiles({});
      const foreign = makeDirWithFiles({});
      let connected = true;
      let newerRevision: string | undefined;
      const selectedPort = () => {
        try { return Number(readFileSync(join(project, 'api', 'selected-port'), 'utf8')); } catch { return undefined; }
      };
      const service = createProjectSetupService({
        state: createSetupState(() => root), env: async () => process.env, stopGraceMs: 25,
        probe: async port => port === 48001 ? connected : port === 48002 || port === selectedPort(),
        identify: async port => ({ pid: process.pid, cwd: port === 48002 ? foreign : port === 48001 ? project : join(project, 'api') }),
        movePort: async () => async () => undefined,
        report: async (_cwd, _folder, port) => {
          if (port === 48001 && scenario === 'reject') throw new Error('Web report refused');
          if (port === 48001) return;
          if (scenario === 'disconnect') connected = false;
          if (scenario === 'save') {
            const saved = service.read(project).saved!;
            newerRevision = service.save(project, { ...saved.definition, prepare: 'echo updated' }, saved.revision).snapshot.saved!.revision;
          }
        },
      });
      try {
        const web = { id: 'web', cwd: '.', start: 'exec sleep 20', port: 48001 };
        service.save(project, { ...definition, servers: [web, { ...definition.servers[0]!, id: 'api', cwd: 'api', port: 48002 }] }, null);
        const result = await service.run(project, { action: 'start' });
        if (scenario === 'save') {
          expect(result.snapshot.saved!.revision).toBe(newerRevision!);
          expect(result.snapshot.saved!.definition.prepare).toBe('echo updated');
        } else {
          expect(result.ok).toBe(false);
          expect(result.snapshot.failure?.serverId).toBe('web');
          expect(result.snapshot.failure?.command).toBe(web.start);
          expect(result.snapshot.failure?.outputTail).toBe('');
          expect(result.snapshot.verified).toBeNull();
        }
      } finally { await service.dispose(); }
    }
  });

  it('keeps committed Frames and the saved port together if server reporting fails', async () => {
    const project = makeDirWithFiles({});
    const root = makeDirWithFiles({});
    const foreign = makeDirWithFiles({});
    const selectedPort = () => {
      try { return Number(readFileSync(join(project, 'selected-port'), 'utf8')); } catch { return undefined; }
    };
    let framePort = 48001;
    let undos = 0;
    const service = createProjectSetupService({
      state: createSetupState(() => root), env: async () => process.env, stopGraceMs: 25,
      probe: async port => port === 48001 || port === selectedPort(),
      identify: async port => ({ pid: process.pid, cwd: port === 48001 ? foreign : project }),
      movePort: async (_cwd, from, to) => {
        framePort = to;
        return async () => { undos++; framePort = from; };
      },
      report: async (_cwd, _folder, port) => {
        expect(framePort).toBe(port);
        expect(service.read(project).saved!.definition.servers[0]!.port).toBe(port);
        throw new Error('Server registration refused');
      },
    });
    try {
      service.save(project, definition, null);
      const result = await service.run(project, { action: 'start' });
      expect(result.ok).toBe(false);
      expect(framePort).not.toBe(48001);
      expect(result.snapshot.saved!.definition.servers[0]!.port).toBe(framePort);
      expect(result.snapshot.failure?.revision).toBe(result.snapshot.saved!.revision);
      expect(projectSetupAskKind(result.snapshot)).toBe('repair');
      expect(undos).toBe(0);
      expect(result.snapshot.portMoves).toBeUndefined();
    } finally { await service.dispose(); }
  });

  it('rebases a retained sibling failure when another server moves', async () => {
    const project = makeDirWithFiles({ files: { 'api/marker': 'ready' } });
    const root = makeDirWithFiles({});
    const foreign = makeDirWithFiles({});
    const selectedPort = () => {
      try { return Number(readFileSync(join(project, 'api', 'selected-port'), 'utf8')); } catch { return undefined; }
    };
    const service = createProjectSetupService({
      state: createSetupState(() => root), env: async () => process.env, stopGraceMs: 25,
      probe: async port => port === 48002 || port === selectedPort(),
      identify: async port => ({ pid: process.pid, cwd: port === 48002 ? foreign : join(project, 'api') }),
      report: async () => undefined, movePort: async () => async () => undefined,
    });
    try {
      service.save(project, { ...definition, servers: [
        { id: 'web', cwd: '.', start: 'exit 17', port: 48001 },
        { ...definition.servers[0]!, id: 'api', cwd: 'api', port: 48002 },
      ] }, null);
      expect((await service.run(project, { action: 'start', serverIds: ['web'] })).ok).toBe(false);
      const result = await service.run(project, { action: 'start', serverIds: ['api'] });
      expect(result.snapshot.saved!.definition.servers[1]!.port).not.toBe(48002);
      expect(result.snapshot.failure?.serverId).toBe('web');
      expect(result.snapshot.failure?.revision).toBe(result.snapshot.saved!.revision);
      expect(projectSetupAskKind(result.snapshot)).toBe('repair');
    } finally { await service.dispose(); }
  });

  it('keeps a sibling server exit associated with the current saved revision after relocation', async () => {
    const project = makeDirWithFiles({ files: { 'web/marker': 'ready', 'api/marker': 'ready' } });
    const root = makeDirWithFiles({});
    const foreign = makeDirWithFiles({});
    const selectedPort = () => {
      try { return Number(readFileSync(join(project, 'api', 'selected-port'), 'utf8')); } catch { return undefined; }
    };
    const service = createProjectSetupService({
      state: createSetupState(() => root), env: async () => process.env, stopGraceMs: 25,
      probe: async port => port === 48002 || (port === 48001 ? existsSync(join(project, 'web', 'ready')) : port === selectedPort()),
      identify: async port => ({ pid: process.pid, cwd: port === 48002 ? foreign : join(project, port === 48001 ? 'web' : 'api') }),
      report: async () => undefined, movePort: async () => async () => undefined,
    });
    try {
      service.save(project, { ...definition, servers: [
        { id: 'web', cwd: 'web', start: 'touch ready; while [ ! -f leave ]; do sleep 0.02; done; exit 19', port: 48001 },
        { ...definition.servers[0]!, id: 'api', cwd: 'api', port: 48002 },
      ] }, null);
      expect((await service.run(project, { action: 'start', serverIds: ['web'] })).ok).toBe(true);
      const moved = await service.run(project, { action: 'start', serverIds: ['api'] });
      expect(moved.ok).toBe(true);
      writeFileSync(join(project, 'web', 'leave'), 'ready');
      const deadline = Date.now() + 2000;
      while (service.read(project).state !== 'failed' && Date.now() < deadline) await delay(10);
      const snapshot = service.read(project);
      expect(snapshot.failure?.revision).toBe(snapshot.saved!.revision);
      expect(snapshot.failure?.serverId).toBe('web');
      expect(projectSetupAskKind(snapshot)).toBe('repair');
    } finally { await service.dispose(); }
  });

  it('does not let another pending reservation change a free port or a same-project reconnect', async () => {
    for (const occupied of [false, true]) {
      const first = makeDirWithFiles({});
      const second = makeDirWithFiles({});
      const root = makeDirWithFiles({});
      let entered: () => void = () => undefined;
      const entering = new Promise<void>(resolve => { entered = resolve; });
      let release: (env: NodeJS.ProcessEnv) => void = () => undefined;
      const held = new Promise<NodeJS.ProcessEnv>(resolve => { release = resolve; });
      let calls = 0;
      const moves: number[] = [];
      const service = createProjectSetupService({
        state: createSetupState(() => root), env: () => { if (++calls === 1) { entered(); return held; } return Promise.resolve(process.env); },
        probe: async () => occupied || existsSync(join(second, 'selected-port')),
        identify: async () => ({ pid: process.pid, cwd: second }), report: async () => undefined,
        movePort: async (_cwd, from) => { moves.push(from); return async () => undefined; }, stopGraceMs: 25,
      });
      try {
        service.save(first, definition, null);
        const saved = service.save(second, definition, null).snapshot.saved;
        const pending = service.run(first, { action: 'start' });
        await entering;
        const result = await service.run(second, { action: 'start' });
        expect(result.snapshot).toEqual({ saved, verified: saved, failure: null, state: 'running' });
        expect(moves).toEqual([]);
        await service.run(first, { action: 'stop' });
        expect((await pending).ok).toBe(false);
      } finally { release(process.env); await service.dispose(); }
    }
  });

  it('keeps repair available when the replacement server fails before its new port is saved', async () => {
    const project = makeDirWithFiles({});
    const root = makeDirWithFiles({});
    const foreign = makeDirWithFiles({});
    const service = createProjectSetupService({
      state: createSetupState(() => root), env: async () => process.env,
      probe: async port => port === 48001, identify: async () => ({ pid: process.pid, cwd: foreign }),
      report: async () => undefined, stopGraceMs: 25, readyTimeoutMs: 500,
    });
    try {
      const saved = service.save(project, { ...definition, servers: [{ ...definition.servers[0]!, start: 'exit 17 # {{port}}' }] }, null).snapshot.saved;
      const result = await service.run(project, { action: 'start' });
      expect(result.ok).toBe(false);
      expect(result.snapshot.saved).toEqual(saved);
      expect(result.snapshot.failure?.revision).toBe(saved!.revision);
      expect(projectSetupAskKind(result.snapshot)).toBe('repair');
      expect(result.snapshot.portMoves).toBeUndefined();
    } finally { await service.dispose(); }
  });

  it('retires a remembered reconnect when a foreign process takes over its port', async () => {
    const project = makeDirWithFiles({});
    const root = makeDirWithFiles({});
    const foreign = makeDirWithFiles({});
    let replaced = false;
    const service = createProjectSetupService({
      state: createSetupState(() => root), env: async () => process.env,
      probe: async port => port === 48001 || existsSync(join(project, 'selected-port')),
      identify: async port => ({ pid: process.pid, cwd: replaced && port === 48001 ? foreign : project }),
      report: async () => undefined, movePort: async () => async () => undefined, stopGraceMs: 25,
    });
    try {
      service.save(project, definition, null);
      expect((await service.run(project, { action: 'start' })).ok).toBe(true);
      replaced = true;
      const moved = await service.run(project, { action: 'start' });
      expect(moved.ok).toBe(true);
      expect(moved.snapshot.saved!.definition.servers[0]!.port).not.toBe(48001);
    } finally { await service.dispose(); }
  });

  it('restores earlier Frame moves if a later move fails or is canceled', async () => {
    for (const cancel of [false, true]) {
      const project = makeDirWithFiles({ files: { 'api/marker': 'ready' } });
      const root = makeDirWithFiles({});
      const foreign = makeDirWithFiles({});
      const framePorts = [48001, 48002];
      const reportedPorts: number[] = [];
      const readyPorts = () => ['', 'api'].flatMap(folder => {
        try { return [Number(readFileSync(join(project, folder, 'selected-port'), 'utf8'))]; } catch { return []; }
      });
      let entered: () => void = () => undefined;
      const moving = new Promise<void>(resolve => { entered = resolve; });
      const service = createProjectSetupService({
        state: createSetupState(() => root), env: async () => process.env,
        probe: async port => port === 48001 || port === 48002 || readyPorts().includes(port),
        identify: async port => ({ pid: process.pid, cwd: port >= 48001 ? foreign : join(project, readyPorts()[1] === port ? 'api' : '') }),
        report: async (_cwd, _folder, port) => { reportedPorts.push(port); }, stopGraceMs: 25,
        movePort: async (_cwd, from, to, signal) => {
          const before = [...framePorts];
          const undo = async () => { framePorts.splice(0, framePorts.length, ...before); };
          if (from === 48002 && !cancel) { entered(); throw new Error('Frame update refused'); }
          for (const [index, port] of framePorts.entries()) if (port === from) framePorts[index] = to;
          if (from !== 48002) return undo;
          entered();
          if (cancel) await new Promise<void>(resolve => signal.addEventListener('abort', () => resolve(), { once: true }));
          return undo;
        },
      });
      try {
        const saved = service.save(project, { ...definition, servers: [...definition.servers, { ...definition.servers[0]!, id: 'api', cwd: 'api', port: 48002 }] }, null).snapshot.saved;
        const pending = service.run(project, { action: 'start' });
        await moving;
        if (cancel) await service.run(project, { action: 'stop' });
        const result = await pending;
        expect(result.ok).toBe(false);
        expect(result.snapshot.saved).toEqual(saved);
        expect(framePorts).toEqual([48001, 48002]);
        expect(reportedPorts).toEqual([]);
        expect(result.snapshot.portMoves).toBeUndefined();
        if (!cancel) expect(projectSetupAskKind(result.snapshot)).toBe('repair');
      } finally { await service.dispose(); }
    }
  });
});
