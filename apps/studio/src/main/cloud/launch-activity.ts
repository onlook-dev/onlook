import { join } from 'node:path';
import { stateRoot } from '../state/root.js';
import { readStateFile, writeStateFile } from '../state/file.js';
import { log } from '../log/index.js';

export function trackLaunchActivity(now: () => number = Date.now) {
  const path = join(stateRoot(), 'launch-activity.json');
  const openedAt = now();
  let unopenedMs: number | null = null;
  try {
    const stored = readStateFile(path, 1);
    if (stored.kind === 'data' && typeof stored.data === 'number' && Number.isFinite(stored.data) && stored.data > 0 && stored.data <= openedAt) {
      unopenedMs = openedAt - stored.data;
    }
  } catch {
    log('cloud').warn('launch activity unavailable', { code: 'read' });
  }
  function touch(): void {
    try {
      writeStateFile(path, 1, now());
    } catch {
      log('cloud').warn('launch activity unavailable', { code: 'write' });
    }
  }
  touch();
  const timer = setInterval(touch, 60_000);
  timer.unref();
  return { unopenedMs, dispose() { clearInterval(timer); touch(); } };
}
