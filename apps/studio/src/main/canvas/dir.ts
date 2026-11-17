/** Separate from `fs-backend.ts` so the thumbnail store can compose a path without closing a cycle back through it (ONL-2471). */

import { join } from 'node:path';
import type { CanvasDocId } from '@studio/events';
import { workspaceRoot } from '../workspace/store.js';

/** Resolved per call: `STUDIO_WORKSPACE_ROOT` is read at use time. */
export function canvasDir(): string {
  return join(workspaceRoot(), 'canvas');
}

export function canvasDocPath(docId: CanvasDocId): string {
  return join(canvasDir(), `${docId}.json`);
}

export function canvasLogPath(docId: CanvasDocId): string {
  return join(canvasDir(), `${docId}.log.json`);
}
