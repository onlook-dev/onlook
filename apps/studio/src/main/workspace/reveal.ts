import { existsSync } from 'node:fs';
import { shell } from 'electron';
import type { RevealProjectResult } from '@studio/events';
import { log } from '../log/index.js';
import { capture } from '../telemetry/index.js';
import { knownProject } from './store.js';
import { type Capture, recordProjectRevealed } from './telemetry.js';

const logger = log('workspace');

export interface RevealDeps {
  /** Shows the folder in its parent and reports nothing, so the caller checks the path itself. */
  reveal: (path: string) => void;
  exists: (path: string) => boolean;
  capture: Capture;
}

// Resolved at call time: the e2e recorder swaps `shell.showItemInFolder` after import.
const defaultDeps: RevealDeps = {
  reveal: (path) => {
    shell.showItemInFolder(path);
  },
  exists: existsSync,
  capture,
};

/** The folder Studio owns, read from the registry, never the path the renderer sent: an engineer handed the user's own checkout is the wrong copy (ONL-2315). */
export function revealProject(
  workspacePath: string,
  deps: RevealDeps = defaultDeps,
): RevealProjectResult {
  const record = knownProject(workspacePath);
  if (record === undefined) return { ok: false, reason: 'unknown-project' };
  if (!deps.exists(record.workspacePath)) {
    logger.warn('reveal_project found no folder to show');
    return { ok: false, reason: 'open-failed' };
  }
  deps.reveal(record.workspacePath);
  recordProjectRevealed(record, deps.capture);
  return { ok: true };
}
