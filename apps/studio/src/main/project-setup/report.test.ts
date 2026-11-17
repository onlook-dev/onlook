import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { cleanupTempFixtures, makeDirWithFiles, makeWorkspaceRoot, restoreWorkspaceRoot } from '@studio/fixtures';
import { isBrowserNode, type CanvasOpEntry } from '@studio/events';
import { applyOp, emptyCanvasDoc } from '../canvas/document.js';
import { createServerHost } from '../server/index.js';
import type { FrameStateChange } from '../server/machine.js';
import { resetServerBookCache, serverBookEntries } from '../server/book.js';
import { createCancelToken } from '../workspace/cancel.js';
import { placeFirstFrame } from '../workspace/create-project.js';
import { awaitStartOutcome, noteSetupReport, resetSetupSignals } from '../workspace/setup-signals.js';
import { createProjectSetupReport } from './report.js';
import { createProjectSetupService } from './runner.js';
import { createSetupState } from './state.js';
import { canonicalPath } from '../lib/canonical-path.js';

afterEach(resetSetupSignals);
afterAll(() => { restoreWorkspaceRoot(); cleanupTempFixtures(); });

function fixture(name: string, measuredLive = true, frameFails = false) {
  const root = canonicalPath(makeWorkspaceRoot({ name: `setup-report-${name}` }));
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  resetServerBookCache();
  const cwd = join(root, 'shop', 'main');
  mkdirSync(cwd, { recursive: true });
  const calls: string[] = [];
  const frameStates: FrameStateChange[] = [];
  let doc = emptyCanvasDoc(name);
  doc.pages.page = { id: 'page', name: 'Page', order: 0 };
  const host = createServerHost({
    emit: () => undefined,
    createPortFollow: () => ({ observed: () => undefined }),
    authorPortMove: () => undefined,
    attributionRoots: () => ({ workspaceRoot: root }),
    probe: async () => measuredLive,
    identify: async () => ({ pid: 30001, cwd }),
    delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms === 60000 ? 100 : 0)),
    timing: { waitingAttempts: 1, runningFailures: 1 },
    onFrameState: (change) => frameStates.push(change),
  });
  const place = async (port: number) => {
    calls.push('frame');
    return placeFirstFrame(async (resolve) => {
      if (frameFails) return { ok: false, reason: 'canvas refused the write' };
      const ops = resolve(doc);
      if ('reason' in ops) return { ok: false, reason: ops.reason };
      const entries: CanvasOpEntry[] = [];
      for (const op of ops) {
        const applied = applyOp(doc, op, { author: 'system', at: '2026-10-15T10:00:00.000Z' });
        if (!applied.ok) return applied;
        doc = applied.doc;
        entries.push(applied.entry);
      }
      return { ok: true, doc, entries };
    }, port);
  };
  const report = createProjectSetupReport({
    host: () => host,
    telemetryProperties: (project) => project === cwd ? { project_id: 'workspace-hash', workspace_instance_id: 'workspace-instance-hash' } : undefined,
    noteReport: async (project, port, signal) => { calls.push('setup-report'); return noteSetupReport(project, port, signal); },
    placeFrame: (_project, port) => place(port),
    failure: (kind, reason) => `localized:${kind}${reason ? `:${reason}` : ''}`,
  });
  return { cwd, host, report, place, calls, frameStates, doc: () => doc };
}

describe('main setup reporting composition', () => {
  it('measures the server book before creating one idempotent Frame', async () => {
    const item = fixture('measured-frame');
    try {
      await item.host.openProject(item.cwd);
      await item.report(item.cwd, item.cwd, 49000, new AbortController().signal);
      expect(serverBookEntries(item.cwd)[0]?.ports[0]?.measured).toBe('live');
      expect(item.host.snapshotFor(item.cwd).entries[0]?.status).toBe('running');
      const frames = Object.values(item.doc().nodes).filter(isBrowserNode);
      expect(frames).toHaveLength(1);
      expect(frames[0]?.content.homeUrl).toBe('http://localhost:49000/');
      await item.report(item.cwd, item.cwd, 49000, new AbortController().signal);
      expect(Object.values(item.doc().nodes).filter(isBrowserNode)).toHaveLength(1);
      expect(item.calls).toEqual(['setup-report', 'frame', 'setup-report', 'frame']);
    } finally { item.host.dispose(); }
  });

  it('records the started server\'s frame states under the project\'s telemetry id', async () => {
    const item = fixture('frame-state');
    try {
      await item.host.openProject(item.cwd);
      await item.report(item.cwd, item.cwd, 49000, new AbortController().signal);
      expect(item.frameStates.map((change) => [change.workspaceTelemetry, change.state])).toContainEqual([{ project_id: 'workspace-hash', workspace_instance_id: 'workspace-instance-hash' }, 'live']);
    } finally { item.host.dispose(); }
  });

  it('uses the creation waiter Frame author without placing a second Frame', async () => {
    const item = fixture('creation-frame');
    const token = createCancelToken();
    const started = awaitStartOutcome(item.cwd, token, (port) => item.place(port));
    try {
      await item.host.openProject(item.cwd);
      await item.report(item.cwd, item.cwd, 49000, new AbortController().signal);
      const outcome = await started;
      expect(outcome.kind).toBe('reported');
      if (outcome.kind === 'reported') expect(outcome.frame.kind).toBe('placed');
      expect(item.calls).toEqual(['setup-report', 'frame']);
      expect(Object.values(item.doc().nodes).filter(isBrowserNode)).toHaveLength(1);
    } finally { token.cancel(); item.host.dispose(); }
  });

  it('rejects measured readiness failure before notifying setup or creating a Frame', async () => {
    const item = fixture('dead-book', false);
    try {
      await item.host.openProject(item.cwd);
      await expect(item.report(item.cwd, item.cwd, 49000, new AbortController().signal)).rejects.toThrow('localized:bookNotReady');
      expect(serverBookEntries(item.cwd)[0]?.ports[0]?.measured).toBe('dead');
      expect(item.calls).toEqual([]);
      expect(Object.values(item.doc().nodes)).toEqual([]);
    } finally { item.host.dispose(); }
  });

  it('cannot successfully verify saved setup after a failed book or missing Frame', async () => {
    for (const failure of ['book', 'frame'] as const) {
      const item = fixture(`runtime-${failure}`, failure !== 'book', failure === 'frame');
      let probes = 0;
      const stateRoot = makeDirWithFiles({});
      const service = createProjectSetupService({
        state: createSetupState(() => stateRoot),
        env: async () => process.env,
        probe: async () => { probes += 1; return probes > 1; },
        identify: async () => ({ pid: 30001, cwd: item.cwd }),
        report: item.report,
        stopGraceMs: 25,
      });
      try {
        await item.host.openProject(item.cwd);
        expect(service.save(item.cwd, { prepare: '', install: { script: '', inputs: [], outputs: [] }, servers: [{ id: 'web', cwd: '.', start: 'sleep 10', port: 49000 }] }, null).ok).toBe(true);
        const result = await service.run(item.cwd, { action: 'start' });
        expect(result.ok).toBe(false);
        expect(result.snapshot.verified).toBeNull();
        expect(result.snapshot.state).toBe('failed');
        expect(result.snapshot.failure?.reason).toContain(failure === 'book' ? 'localized:bookNotReady' : 'localized:frameNotPlaced');
        if (failure === 'frame') {
          expect(serverBookEntries(item.cwd)[0]?.ports[0]?.measured).toBe('live');
          expect(item.host.snapshotFor(item.cwd).entries[0]?.status).toBe('running');
          expect(item.calls).toEqual(['setup-report', 'frame']);
        } else {
          expect(serverBookEntries(item.cwd)[0]?.ports[0]?.measured).toBe('dead');
          expect(item.calls).toEqual([]);
        }
        expect(Object.values(item.doc().nodes)).toEqual([]);
      } finally { await service.dispose(); item.host.dispose(); }
    }
  });

  it('rejects absent server hosts and pre-canceled reports without any Frame work', async () => {
    const report = createProjectSetupReport({
      host: () => undefined,
      telemetryProperties: () => undefined,
      noteReport: async () => { throw new Error('not reached'); },
      placeFrame: async () => { throw new Error('not reached'); },
      failure: (kind) => `localized:${kind}`,
    });
    await expect(report('/project', '/project', 49000, new AbortController().signal)).rejects.toThrow('localized:hostUnavailable');
    const controller = new AbortController();
    controller.abort();
    await expect(report('/project', '/project', 49000, controller.signal)).rejects.toThrow();
  });
});
