import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import type { CanvasOpEntry } from '@studio/events';
import { appendCanvasLog, CANVAS_HISTORY_MAX_ENTRIES, readCanvasLog, trimCanvasHistory } from './log.js';

const root = mkdtempSync(join(tmpdir(), 'canvas-history-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

function entries(count: number, batchId?: string): CanvasOpEntry[] {
  return Array.from({ length: count }, (_entry, index): CanvasOpEntry => ({
    revision: index + 1,
    at: '2026-10-15T00:00:00.000Z',
    author: 'user',
    op: { type: 'move', id: `node-${index}`, x: index, y: 0 },
    prior: { kind: 'fields', id: `node-${index}`, fields: { x: 0, y: 0 } },
    ...(batchId === undefined ? {} : { batchId }),
  }));
}

describe('bounded Canvas history', () => {
  it('drops entire oldest batches and an individual batch exceeding the cap', () => {
    const history = [...entries(3, 'old'), ...entries(2, 'new')];
    trimCanvasHistory(history, 4);
    expect(history).toEqual(entries(2, 'new'));
    const oversized = entries(5, 'oversized');
    trimCanvasHistory(oversized, 4);
    expect(oversized).toEqual([]);
  });

  it('caps legacy history on read and writes a versioned bounded tail across reopen', () => {
    const path = join(root, 'bounded.json');
    writeFileSync(path, JSON.stringify([...entries(3, 'old'), ...entries(CANVAS_HISTORY_MAX_ENTRIES - 1, 'tail')]));
    expect(readCanvasLog(path)).toHaveLength(CANVAS_HISTORY_MAX_ENTRIES - 1);
    appendCanvasLog(path, entries(2, 'latest'));
    expect(readCanvasLog(path)).toEqual(entries(2, 'latest'));
    expect(JSON.parse(readFileSync(path, 'utf8')).version).toBe(1);
  });

  it('never truncates or overwrites a future history', () => {
    const path = join(root, 'future.json');
    const original = JSON.stringify({ version: 99, data: entries(CANVAS_HISTORY_MAX_ENTRIES + 1) });
    writeFileSync(path, original);
    expect(readCanvasLog(path)).toEqual([]);
    appendCanvasLog(path, entries(1));
    expect(readFileSync(path, 'utf8')).toBe(original);
  });
});
