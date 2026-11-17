import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eraseStateFile, readStateFile, writeStateFile } from '../state/file.js';
import { stateRoot } from '../state/root.js';
import { readSwitch } from '../env/dev-switches.js';

export interface RunningMarker {
  launchId: string;
  appVersion: string | null;
}

const LAUNCH_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const APP_VERSION = /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/;

function readMarker(): RunningMarker | undefined {
  try {
    const text = readFileSync(runningMarkerPath(), 'utf8').trim();
    if (LAUNCH_ID.test(text)) return { launchId: text, appVersion: null };
    const file = readStateFile(runningMarkerPath(), 1);
    if (file.kind !== 'data') return;
    const marker = file.data;
    if (marker === null || typeof marker !== 'object' || !('launchId' in marker) || !('appVersion' in marker)) return;
    if (typeof marker.launchId !== 'string' || !LAUNCH_ID.test(marker.launchId)) return;
    if (typeof marker.appVersion !== 'string' || marker.appVersion.length > 80 || !APP_VERSION.test(marker.appVersion)) return;
    return { launchId: marker.launchId, appVersion: marker.appVersion };
  } catch {
    return;
  }
}

export function runningMarkerPath(): string {
  return join(stateRoot(), 'running');
}

// The single-instance lock is bypassed under `AGENT_HEADLESS`; a drive without its own `STUDIO_STATE_ROOT` would claim the real user's marker (ONL-2343).
export function ownsRunningMarker(env?: NodeJS.ProcessEnv): boolean {
  return readSwitch('stateRoot', env) !== undefined || readSwitch('agentHeadless', env) === undefined;
}

export function claimRunningMarker(launchId: string, appVersion: string): RunningMarker | undefined {
  const existing = readMarker();
  try {
    writeStateFile(runningMarkerPath(), 1, { launchId, appVersion });
  } catch {
    // An unwritable state root: nothing else writes either.
  }
  return existing?.launchId === launchId ? undefined : existing;
}

export function clearRunningMarker(launchId: string): void {
  try {
    if (readMarker()?.launchId !== launchId) return;
    eraseStateFile(runningMarkerPath(), 1);
  } catch {
    // Already gone.
  }
}
