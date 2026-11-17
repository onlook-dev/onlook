import { expect, test } from 'bun:test';
import type { TaskManagerSnapshot, TaskRow } from '@studio/events';
import { taskLines } from './lines.js';

function row(id: string, group: TaskRow['group'], cpuPct: number, memoryKb: number, pids: number[] = [1]): TaskRow {
  return {
    id,
    group,
    subject: { kind: 'studio', part: 'other' },
    cpuPct,
    memoryKb,
    processes: pids.map((pid) => ({ pid, name: 'p', cpuPct: 0, memoryKb: 0 })),
  };
}

const snapshot: TaskManagerSnapshot = {
  totals: { cpuPct: 0, memoryKb: 0, studioKb: 0, childKb: 0 },
  rows: [row('s', 'studio', 90, 10), row('t1', 'tabs', 5, 300), row('t2', 'tabs', 40, 100, [7, 8])],
};

const ids = (lines: ReturnType<typeof taskLines>): string[] => lines.map((line) => line.id);

test('groups keep their order and sort within themselves, so a busy group never jumps another', () => {
  expect(ids(taskLines(snapshot, { key: 'cpu', direction: 'descending' }, false))).toEqual(['heading:tabs', 't2', 't1', 'heading:studio', 's']);
  expect(ids(taskLines(snapshot, { key: 'memory', direction: 'descending' }, false))).toEqual(['heading:tabs', 't1', 't2', 'heading:studio', 's']);
});

test('a row’s processes follow it only while Processes is on', () => {
  expect(ids(taskLines(snapshot, { key: 'cpu', direction: 'descending' }, true))).toEqual(['heading:tabs', 't2', 't2:7', 't2:8', 't1', 't1:1', 'heading:studio', 's', 's:1']);
});

test('a Frames row lists its Frames always and its processes after them, and only the final one closes the connector', () => {
  const frames: TaskRow = { ...row('f', 'frames', 1, 1, [9]), subject: { kind: 'frames', addresses: [], frameCount: 2, artifactCount: 0, frames: [{ pid: 9, isArtifact: false, page: 'a' }, { pid: 9, isArtifact: true }] } };
  const lines = taskLines({ ...snapshot, rows: [frames] }, { key: 'cpu', direction: 'descending' }, true);
  expect(ids(lines)).toEqual(['heading:frames', 'f', 'f:frame:0', 'f:frame:1', 'f:9']);
  expect(lines.map((line) => line.kind === 'frame' || line.kind === 'process' ? line.isLast : null)).toEqual([null, null, false, false, true]);
  expect(ids(taskLines({ ...snapshot, rows: [frames] }, { key: 'cpu', direction: 'descending' }, false))).toEqual(['heading:frames', 'f', 'f:frame:0', 'f:frame:1']);
});
