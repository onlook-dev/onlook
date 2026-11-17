import type { CanvasOpEntry } from '@studio/events';
import { readStateFile, writeStateFile } from '../state/file.js';
import { log } from '../log/index.js';

const logger = log('canvas');

export const CANVAS_HISTORY_VERSION = 1;
export const CANVAS_UNDO_MAX_ENTRIES = 1_000;
export const CANVAS_HISTORY_MAX_ENTRIES = 5_000;

export function trimCanvasHistory(entries: CanvasOpEntry[], limit: number): void {
  let start = 0;
  while (entries.length - start > limit) {
    const batchId = entries[start]?.batchId;
    start += 1;
    if (batchId !== undefined) {
      while (start < entries.length && entries[start]?.batchId === batchId) start += 1;
    }
  }
  if (start > 0) entries.splice(0, start);
}

function isEntry(value: unknown): value is CanvasOpEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Partial<CanvasOpEntry>;
  return (
    typeof entry.revision === 'number' &&
    typeof entry.at === 'string' &&
    (entry.author === 'user' || entry.author === 'agent' || entry.author === 'system') &&
    typeof entry.op === 'object' &&
    entry.op !== null &&
    typeof (entry.op as { type?: unknown }).type === 'string' &&
    typeof entry.prior === 'object' &&
    entry.prior !== null
  );
}

/** Any failure answers `[]`, all or nothing: a partially salvaged log replays undo across a silent gap (ONL-1993). */
export function readCanvasLog(path: string): CanvasOpEntry[] {
  let parsed: unknown;
  try {
    const saved = readStateFile(path, CANVAS_HISTORY_VERSION);
    if (saved.kind !== 'data') return [];
    parsed = saved.data;
  } catch (err) {
    logger.error('op log could not be read; history starts empty', { path, error: err });
    return [];
  }

  if (!Array.isArray(parsed) || !parsed.every(isEntry)) {
    logger.error('op log is not an array of op entries; history starts empty', { path });
    return [];
  }
  const originalLength = parsed.length;
  trimCanvasHistory(parsed, CANVAS_HISTORY_MAX_ENTRIES);
  if (parsed.length !== originalLength) {
    try {
      writeStateFile(path, CANVAS_HISTORY_VERSION, parsed);
    } catch (error) {
      logger.error('op log could not be bounded', { path, error });
    }
  }
  return parsed;
}

/** Rewrites the whole file per call (ONL-2026). */
export function appendCanvasLog(path: string, entries: CanvasOpEntry[]): void {
  if (entries.length === 0) return;
  const history = readCanvasLog(path);
  history.push(...entries);
  trimCanvasHistory(history, CANVAS_HISTORY_MAX_ENTRIES);
  try {
    writeStateFile(path, CANVAS_HISTORY_VERSION, history);
  } catch (err) {
    logger.error('op log could not be appended', { path, error: err });
  }
}
