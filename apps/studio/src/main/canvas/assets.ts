import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CanvasOpEntry } from '@studio/events';
import { log } from '../log/index.js';
import { canvasDir } from './dir.js';
import { decodeStateFile } from '../state/file.js';
import { CANVAS_SCHEMA_VERSION } from './document.js';

const logger = log('canvas');

function imageIdOf(node: unknown): string | undefined {
  if (typeof node !== 'object' || node === null) return undefined;
  const candidate = node as { kind?: unknown; content?: { imageId?: unknown } };
  if (candidate.kind !== 'image') return undefined;
  const imageId = candidate.content?.imageId;
  return typeof imageId === 'string' && imageId !== '' ? imageId : undefined;
}

/** Takes the envelope or the bare record: a sweep reads files this build's loader has not migrated yet (ONL-2486). */
function canvasDocumentRecord(parsed: unknown, key: 'nodes' | 'pages'): Record<string, unknown> {
  const envelope = parsed as { data?: unknown } | null;
  const doc = (
    typeof envelope === 'object' && envelope !== null && 'data' in envelope ? envelope.data : parsed
  ) as Record<string, unknown> | null;
  if (typeof doc !== 'object' || doc === null) return {};
  const held = doc[key];
  if (typeof held !== 'object' || held === null || Array.isArray(held)) return {};
  return held as Record<string, unknown>;
}

export function canvasDocumentNodes(parsed: unknown): Record<string, unknown> {
  return canvasDocumentRecord(parsed, 'nodes');
}

/** A document written before pages holds none, which is zero pages rather than an unreadable file (ONL-2488). */
export function canvasDocumentPages(parsed: unknown): Record<string, unknown> {
  return canvasDocumentRecord(parsed, 'pages');
}

export function imageIdsInCanvasDocument(parsed: unknown): Set<string> {
  const ids = new Set<string>();
  for (const node of Object.values(canvasDocumentNodes(parsed))) {
    const imageId = imageIdOf(node);
    if (imageId !== undefined) ids.add(imageId);
  }
  return ids;
}

/** `fields` priors carry no image id: no op retargets one. */
export function imageIdsInCanvasEntries(entries: Iterable<CanvasOpEntry>): Set<string> {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (entry.op.type === 'create' || entry.op.type === 'duplicate') {
      const created = imageIdOf(entry.op.node);
      if (created !== undefined) ids.add(created);
    }
    if (entry.prior.kind === 'node') {
      const removed = imageIdOf(entry.prior.node);
      if (removed !== undefined) ids.add(removed);
    }
  }
  return ids;
}

export interface CanvasImageRoots {
  ids: Set<string>;
  /** False means some document's images are missing from `ids`, so nothing may be collected against it (ONL-2486). */
  complete: boolean;
}

/** Every document in the one canvas directory, not the open ones: a sweep runs on any project's chat event (ONL-2486). */
export function storedCanvasImageIds(): CanvasImageRoots {
  const dir = canvasDir();
  const ids = new Set<string>();
  let files: string[];
  try {
    files = readdirSync(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { ids, complete: true };
    logger.error('the canvas directory could not be listed; no document roots its images this sweep', { error });
    return { ids, complete: false };
  }
  let complete = true;
  for (const file of files) {
    // A quarantined document still names its pictures, and recovering from it needs them (ONL-2486).
    if (!(file.endsWith('.json') || /\.json\.corrupt-/.test(file)) || file.endsWith('.log.json')) {
      continue;
    }
    let raw: string;
    try {
      raw = readFileSync(join(dir, file), 'utf8');
    } catch (error) {
      // May be transient, and `load` leaves an unreadable file in place, so its images may still be live (ONL-2486).
      complete = false;
      logger.error('a canvas document could not be read; nothing is collected this sweep', { file, error });
      continue;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      const saved = decodeStateFile(parsed, CANVAS_SCHEMA_VERSION);
      if (
        saved.kind === 'future' ||
        decodeStateFile(saved.data, CANVAS_SCHEMA_VERSION, {
          inline: true,
          versionKey: 'schemaVersion',
        }).kind === 'future'
      ) {
        complete = false;
        continue;
      }
      for (const id of imageIdsInCanvasDocument(parsed)) ids.add(id);
    } catch (error) {
      // Malformed bytes read the same on every later sweep, so holding the whole store hostage to them never ends (ONL-2486).
      logger.error('a canvas document could not be parsed; it roots no images', { file, error });
    }
  }
  return { ids, complete };
}
