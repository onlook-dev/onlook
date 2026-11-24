import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eraseStateFile, readStateFile, writeStateFile } from '../state/file.js';
import { stateRoot } from '../state/root.js';
import { readSwitch } from '../env/dev-switches.js';
import { ONBOARDING_SCREENS, isRecord } from '@studio/events';

const CONTEXT_EVENTS = ['onboarding_screen_shown', 'workspace_creation_flow', 'agent_setup_step', 'project_creation_failed', 'project_setup_failed', 'project_created', 'project_folder_refused', 'dead_end_shown'] as const;

interface RunningContext {
  last_event?: (typeof CONTEXT_EVENTS)[number];
  last_screen?: (typeof ONBOARDING_SCREENS)[number];
  during_workspace_creation?: boolean;
}

export interface RunningMarker {
  launchId: string;
  appVersion: string | null;
  context?: RunningContext;
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
    const context = 'context' in marker ? readContext(marker.context) : undefined;
    return { launchId: marker.launchId, appVersion: marker.appVersion, ...(context === undefined ? {} : { context }) };
  } catch {
    return;
  }
}

function readContext(value: unknown): RunningContext | undefined {
  if (!isRecord(value)) return;
  const context: RunningContext = {};
  if ('last_event' in value && CONTEXT_EVENTS.includes(value.last_event as (typeof CONTEXT_EVENTS)[number])) context.last_event = value.last_event as RunningContext['last_event'];
  if ('last_screen' in value && ONBOARDING_SCREENS.includes(value.last_screen as (typeof ONBOARDING_SCREENS)[number])) context.last_screen = value.last_screen as RunningContext['last_screen'];
  if ('during_workspace_creation' in value && typeof value.during_workspace_creation === 'boolean') context.during_workspace_creation = value.during_workspace_creation;
  return context;
}

export function updateRunningContext(event: string, properties: object): void {
  if (!ownsRunningMarker() || !CONTEXT_EVENTS.includes(event as (typeof CONTEXT_EVENTS)[number])) return;
  const marker = readMarker();
  if (marker === undefined) return;
  const context: RunningContext = { ...marker.context, last_event: event as (typeof CONTEXT_EVENTS)[number] };
  if (event === 'onboarding_screen_shown' && 'screen' in properties && ONBOARDING_SCREENS.includes(properties.screen as (typeof ONBOARDING_SCREENS)[number])) {
    context.last_screen = properties.screen as RunningContext['last_screen'];
    context.during_workspace_creation = false;
  }
  if (event === 'workspace_creation_flow' && 'outcome' in properties) context.during_workspace_creation = properties.outcome === 'started';
  if (event === 'project_created' || event === 'project_creation_failed' || event === 'project_setup_failed' || event === 'project_folder_refused') context.during_workspace_creation = false;
  if (context.last_event === marker.context?.last_event && context.last_screen === marker.context?.last_screen && context.during_workspace_creation === marker.context?.during_workspace_creation) return;
  try {
    writeStateFile(runningMarkerPath(), 1, { ...marker, context });
  } catch {
    return;
  }
}

export function readRunningContext(): RunningMarker['context'] {
  return ownsRunningMarker() ? readMarker()?.context : undefined;
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
