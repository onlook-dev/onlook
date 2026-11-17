// On disk, not in memory: an in-memory set answers "first" once per launch and inflates the metric. Hashed project ids only.

import { join } from 'node:path';
import { stateRoot } from '../state/root.js';
import { readStateFile, writeStateFile } from '../state/file.js';

function markerPath(): string {
  return join(stateRoot(), 'prompted-projects.json');
}

let cache: Set<string> | undefined;

function load(): Set<string> {
  if (cache !== undefined) return cache;
  try {
    const file = readStateFile(markerPath(), 1);
    const parsed = file.kind === 'data' ? file.data : undefined;
    cache = new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []);
  } catch {
    // No marker file or an unreadable one: every project reads as never prompted.
    cache = new Set();
  }
  return cache;
}

export function takeFirstPrompt(workspaceTelemetryId: string): boolean {
  const seen = load();
  if (seen.has(workspaceTelemetryId)) return false;
  seen.add(workspaceTelemetryId);
  try {
    writeStateFile(markerPath(), 1, [...seen]);
  } catch {
    // An unwritable disk over-counts rather than throwing inside a prompt path.
    cache = undefined;
  }
  return true;
}

export function resetFirstPromptCacheForTesting(): void {
  cache = undefined;
}
