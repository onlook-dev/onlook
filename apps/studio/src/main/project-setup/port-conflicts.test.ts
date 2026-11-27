import { afterAll, describe, expect, it, spyOn } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeDirWithFiles } from '@studio/fixtures';
import { projectSetupAskKind, type ProjectSetupSnapshot } from '@studio/events';
import { t } from '@studio/i18n';
import { createProjectSetupService } from './runner.js';
import { createSetupState } from './state.js';

afterAll(cleanupTempFixtures);

const definition = {
  prepare: '', install: { script: '', inputs: [], outputs: [] },
  servers: [{ id: 'web', cwd: '.', start: 'sleep 10', port: 48001 }],
};

describe('saved setup port conflicts', () => {
  it('keeps an opted-in saved port and Frames unchanged when it is free or already belongs to this project', async () => {
    for (const occupied of [false, true]) {
      const project = makeDirWithFiles({});
      const root = makeDirWithFiles({});
      const moves: number[] = [];
      const service = createProjectSetupService({
        state: createSetupState(() => root), env: async () => process.env,
        probe: async () => occupied || existsSync(join(project, 'selected-port')),
        identify: async () => ({ pid: process.pid, cwd: project }),
        report: async () => undefined, movePort: async (_cwd, from) => { moves.push(from); return async () => undefined; }, stopGraceMs: 25,
      });
      try {
        const saved = service.save(project, { ...definition, servers: [{ ...definition.servers[0]!, start: "printf '%s' '{{port}}' > selected-port; sleep 10" }] }, null).snapshot.saved;
        const result = await service.run(project, { action: 'start' });
        expect(result.snapshot).toEqual({ saved, verified: saved, failure: null, state: 'running' });
        expect(moves).toEqual([]);
        if (!occupied) expect(readFileSync(join(project, 'selected-port'), 'utf8')).toBe('48001');
      } finally { await service.dispose(); }
    }
  });

  it('leaves a free fixed port, saved setup and published states unchanged', async () => {
    const project = makeDirWithFiles({});
    const root = makeDirWithFiles({});
    const changed: ProjectSetupSnapshot[] = [];
    const reports: number[] = [];
    let probes = 0;
    const service = createProjectSetupService({
      state: createSetupState(() => root), env: async () => process.env,
      probe: async () => ++probes > 1, identify: async () => ({ pid: process.pid, cwd: project }),
      changed: (_cwd, snapshot) => { changed.push(snapshot); },
      report: async (_cwd, _folder, port) => { reports.push(port); }, stopGraceMs: 25,
    });
    try {
      const saved = service.save(project, definition, null).snapshot.saved;
      changed.length = 0;
      const result = await service.run(project, { action: 'start' });
      expect(result.ok).toBe(true);
      expect(result.snapshot).toEqual({ saved, verified: saved, failure: null, state: 'running' });
      expect(changed.map(snapshot => snapshot.state)).toEqual(['preparing', 'preparing', 'installing', 'starting', 'running']);
      expect(reports).toEqual([48001]);
    } finally { await service.dispose(); }
  });

  it('reconnects to this project without changing its saved setup or signaling it', async () => {
    const project = makeDirWithFiles({});
    const root = makeDirWithFiles({});
    const signals = spyOn(process, 'kill');
    const reports: number[] = [];
    const service = createProjectSetupService({
      state: createSetupState(() => root), env: async () => process.env,
      probe: async () => true, identify: async () => ({ pid: 12345, cwd: project }),
      report: async (_cwd, _folder, port) => { reports.push(port); },
    });
    try {
      const saved = service.save(project, definition, null).snapshot.saved;
      const result = await service.run(project, { action: 'start' });
      expect(result.snapshot).toEqual({ saved, verified: saved, failure: null, state: 'running' });
      expect(reports).toEqual([48001]);
      expect(signals).not.toHaveBeenCalled();
    } finally { await service.dispose(); signals.mockRestore(); }
  });

  it('moves an explicitly substituted command away from a foreign listener and updates its Frames', async () => {
    const project = makeDirWithFiles({});
    const root = makeDirWithFiles({});
    const elsewhere = makeDirWithFiles({});
    const output = join(project, 'selected-port');
    const reports: number[] = [];
    const moves: number[][] = [];
    let stopped = false;
    const service = createProjectSetupService({
      state: createSetupState(() => root), env: async () => process.env,
      probe: async port => port === 48001 || (!stopped && existsSync(output)),
      identify: async port => ({ pid: process.pid, cwd: port === 48001 ? elsewhere : project }),
      report: async (_cwd, _folder, port) => { reports.push(port); },
      movePort: async (_cwd, from, to) => { moves.push([from, to]); return async () => undefined; }, stopGraceMs: 25,
    });
    try {
      service.save(project, { ...definition, servers: [{ ...definition.servers[0]!, start: "printf '%s' '{{port}}' > selected-port; sleep 10" }] }, null);
      const result = await service.run(project, { action: 'start' });
      expect(result.ok).toBe(true);
      const port = result.snapshot.saved!.definition.servers[0]!.port;
      expect(port).not.toBe(48001);
      expect(readFileSync(output, 'utf8')).toBe(String(port));
      expect(moves).toEqual([[48001, port]]);
      expect(reports).toEqual([port]);
      expect(result.snapshot.verified).toEqual(result.snapshot.saved);
      expect(result.snapshot.portMoves).toEqual([{ from: 48001, to: port }]);
      expect(projectSetupAskKind(result.snapshot)).toBe(null);
      stopped = true;
      const stopping = await service.run(project, { action: 'stop' });
      expect(stopping.ok).toBe(true);
      expect(stopping.snapshot.state).toBe('idle');
      expect(stopping.snapshot.portMoves).toBeUndefined();
      expect(stopping.snapshot.saved).toEqual(result.snapshot.saved);
    } finally { await service.dispose(); }
  });

  it('keeps the fixed-port repair path and names the occupied port without moving Frames', async () => {
    const project = makeDirWithFiles({});
    const root = makeDirWithFiles({});
    const elsewhere = makeDirWithFiles({});
    const signals = spyOn(process, 'kill');
    const service = createProjectSetupService({
      state: createSetupState(() => root), env: async () => process.env,
      probe: async () => true, identify: async () => ({ pid: 12345, cwd: elsewhere }),
      report: async () => { throw new Error('must not report a foreign listener'); },
    });
    try {
      const saved = service.save(project, definition, null).snapshot.saved;
      const result = await service.run(project, { action: 'start' });
      expect(result.ok).toBe(false);
      expect(result.snapshot.saved).toEqual(saved);
      expect(result.snapshot.failure?.reason).toBe(t('projectSetup.failure.occupiedPort', { port: 48001 }));
      expect(projectSetupAskKind(result.snapshot)).toBe('repair');
      expect(signals).not.toHaveBeenCalled();
    } finally { await service.dispose(); signals.mockRestore(); }
  });
});
