import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { CanvasDocId } from '@studio/events';
import { removeAtomicFile, writeAtomicFile } from '../../fs-atomic.js';
import { log } from '../../log/index.js';
import { canvasDir } from '../dir.js';
import { THUMBNAIL_MAX_BYTES } from './compose.js';

const logger = log('canvas');

const SUFFIX = '.thumb.png';

// Served from memory: `listWorkspaces` recomputes every summary on every broadcast (ONL-2471).
const mtimes = new Map<CanvasDocId, number>();

export function thumbnailPath(docId: CanvasDocId): string {
  return join(canvasDir(), `${docId}${SUFFIX}`);
}

/** Called at service init, not lazily: a write-only map answers absent for every project a returning user has. */
export function primeThumbnailIndex(): void {
  mtimes.clear();
  let entries: string[];
  try {
    entries = readdirSync(canvasDir());
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.endsWith(SUFFIX)) continue;
    const docId = entry.slice(0, -SUFFIX.length);
    try {
      mtimes.set(docId, statSync(join(canvasDir(), entry)).mtimeMs);
    } catch {
      // Gone between readdir and stat; the next capture reinstates it.
    }
  }
}

export function thumbnailMtime(docId: CanvasDocId): number | null {
  return mtimes.get(docId) ?? null;
}

export function writeThumbnail(
  docId: CanvasDocId,
  png: Buffer,
): { ok: true; mtimeMs: number } | { ok: false; reason: 'too-large' } {
  if (png.byteLength > THUMBNAIL_MAX_BYTES) {
    logger.error('thumbnail over its ceiling; refusing to write it', { bytes: png.byteLength });
    return { ok: false, reason: 'too-large' };
  }
  const path = thumbnailPath(docId);
  writeAtomicFile(path, png, { mode: 0o600 });
  const mtimeMs = statSync(path).mtimeMs;
  mtimes.set(docId, mtimeMs);
  return { ok: true, mtimeMs };
}

/** Called by `deleteCanvasDocFiles` and by anything that removes a project: no thumbnail outlives its project. */
export function removeThumbnail(docId: CanvasDocId): void {
  removeAtomicFile(thumbnailPath(docId));
  mtimes.delete(docId);
}
