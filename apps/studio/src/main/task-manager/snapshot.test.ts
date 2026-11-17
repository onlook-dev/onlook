import { expect, test } from 'bun:test';
import type { TaskRow } from '@studio/events';
import type { ElectronProcess, PsRow } from '../perf/resources.js';
import { buildSnapshot, type SnapshotInputs } from './snapshot.js';

const MAIN = 100;

function ps(pid: number, ppid: number, exe: string, residentKb = 1024, cpuSeconds = 0): PsRow {
  return { pid, ppid, exe, residentKb, cpuSeconds };
}

function electron(pid: number, type: string, cpuSeconds = 0): ElectronProcess {
  return { pid, type, residentKb: 2048, cpuSeconds };
}

function inputs(over: Partial<SnapshotInputs> = {}): SnapshotInputs {
  return {
    now: 10_000,
    mainPid: MAIN,
    ps: [],
    hasProcessList: true,
    electron: [electron(MAIN, 'Browser')],
    views: [],
    tabs: [{ tabId: 'a', name: 'Checkout', purpose: 'project', workspacePath: '/w/checkout' }],
    servers: [],
    ...over,
  };
}

const row = (rows: TaskRow[], id: string): TaskRow | undefined => rows.find((candidate) => candidate.id === id);

test('a dev server the agent started counts under its Project, not under the agent', () => {
  const { snapshot } = buildSnapshot(inputs({
    ps: [ps(200, MAIN, 'claude'), ps(201, 200, 'zsh'), ps(202, 201, 'node'), ps(203, 202, 'node')],
    servers: [{ pid: 202, workspacePath: '/w/checkout', port: 3000 }],
  }), undefined);

  expect(row(snapshot.rows, 'harness:claude')?.processes.map((process) => process.pid).sort()).toEqual([200, 201]);
  const server = row(snapshot.rows, 'dev:/w/checkout:3000');
  expect(server?.subject).toEqual({ kind: 'dev_server', tabId: 'a', projectName: 'Checkout', port: 3000 });
  expect(server?.processes.map((process) => process.pid).sort()).toEqual([202, 203]);
});

test('a server Studio did not start counts, and the rest of the machine, other Claude and Codex runs included, does not', () => {
  const { snapshot } = buildSnapshot(inputs({
    ps: [ps(1, 0, 'launchd'), ps(300, 1, 'node'), ps(301, 300, 'esbuild'), ps(400, 1, 'Safari'), ps(500, 1, 'claude'), ps(501, 500, 'zsh'), ps(600, 1, 'codex')],
    servers: [{ pid: 300, workspacePath: '/w/checkout', port: 5173 }],
  }), undefined);

  expect(snapshot.rows.flatMap((candidate) => candidate.processes.map((process) => process.pid)).sort()).toEqual([MAIN, 300, 301]);
});

test('a process holding Frames from two Tabs is counted once, under no one Project', () => {
  const { snapshot } = buildSnapshot(inputs({
    electron: [electron(MAIN, 'Browser'), electron(501, 'Tab')],
    tabs: [
      { tabId: 'a', name: 'Checkout', purpose: 'project', workspacePath: '/w/checkout' },
      { tabId: 'b', name: 'Pricing', purpose: 'project', workspacePath: '/w/pricing' },
    ],
    views: [
      { pid: 501, role: 'frame', tabId: 'a', address: 'localhost:3000', page: 'localhost:3000' },
      { pid: 501, role: 'frame', tabId: 'b', address: 'localhost:5173', page: 'localhost:5173' },
    ],
  }), undefined);

  expect(snapshot.rows.filter((candidate) => candidate.group === 'frames').map((candidate) => candidate.id)).toEqual(['frames:']);
  expect(row(snapshot.rows, 'frames:')?.subject).toMatchObject({ kind: 'frames', frameCount: 2 });
  expect(row(snapshot.rows, 'frames:')?.subject).not.toHaveProperty('tabId');
});

test('Frames sharing one process are counted once, under the Tab they sit in', () => {
  const { snapshot } = buildSnapshot(inputs({
    electron: [electron(MAIN, 'Browser'), electron(500, 'Tab'), electron(501, 'Tab')],
    views: [
      { pid: 500, role: 'tab', tabId: 'a' },
      { pid: 501, role: 'frame', tabId: 'a', address: 'localhost:3000', page: 'localhost:3000/checkout' },
      { pid: 501, role: 'frame', tabId: 'a', address: 'localhost:3000', page: 'localhost:3000' },
    ],
  }), undefined);

  const frames = row(snapshot.rows, 'frames:a');
  expect(frames?.processes).toHaveLength(1);
  expect(frames?.subject).toMatchObject({ kind: 'frames', tabId: 'a', projectName: 'Checkout', addresses: ['localhost:3000'], frameCount: 2 });
  expect(frames?.subject.kind === 'frames' && frames.subject.frames.map((frame) => frame.page)).toEqual(['localhost:3000', 'localhost:3000/checkout']);
  expect(row(snapshot.rows, 'tab:a')?.processes.map((process) => process.pid)).toEqual([500]);
});

test('CPU is what each process used since the last reading, and the first reading says it has none yet', () => {
  const first = buildSnapshot(inputs({ now: 0, ps: [ps(200, MAIN, 'claude', 1024, 10)] }), undefined);
  expect(first.snapshot.isCpuPending).toBe(true);
  expect(first.snapshot.totals.cpuPct).toBe(0);

  const second = buildSnapshot(inputs({ now: 5_000, ps: [ps(200, MAIN, 'claude', 1024, 12.5)] }), first.baseline);
  expect(second.snapshot.isCpuPending).toBeUndefined();
  expect(row(second.snapshot.rows, 'harness:claude')?.cpuPct).toBeCloseTo(50);
});

test('without a process list only Electron’s own processes are counted, and the snapshot says so', () => {
  const { snapshot } = buildSnapshot(inputs({ hasProcessList: false, ps: [ps(200, MAIN, 'claude')] }), undefined);
  expect(snapshot.isElectronOnly).toBe(true);
  expect(row(snapshot.rows, 'harness:claude')).toBeUndefined();
});
