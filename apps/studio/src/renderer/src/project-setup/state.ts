import { projectSetupAskKind, type ProjectSetupFailure, type ProjectSetupSnapshot, type TabStatus } from '@studio/events';
import type { StringKey } from '@studio/i18n';

/** `null` renders no dot: the register's status vocabulary has three inks and this surface adds none (ONL-2499). */
type SetupTone = TabStatus | null;

/** What the panel root publishes, so a walk reads the state instead of a translated sentence (ONL-2499). */
type SetupStateName = ProjectSetupSnapshot['state'] | 'loading' | 'unavailable' | 'empty';

export interface SetupHeader {
  state: SetupStateName;
  tone: SetupTone;
  headline: StringKey;
  detail: StringKey | null;
}

export interface SetupRunAction {
  label: StringKey;
  press: 'start' | 'stop';
  isDisabled: boolean;
}

export interface SetupStep {
  id: string;
  kind: 'prepare' | 'install' | 'server';
  script: string;
  tone: SetupTone;
  server?: { cwd: string; port: number };
}

const TONE: Record<ProjectSetupSnapshot['state'], SetupTone> = {
  idle: null, preparing: 'working', installing: 'working', starting: 'working',
  running: 'done', stopping: 'working', failed: 'waiting',
};

const HEADLINE: Record<ProjectSetupSnapshot['state'], StringKey> = {
  idle: 'projectSetup.state.idle', preparing: 'projectSetup.state.preparing',
  installing: 'projectSetup.state.installing', starting: 'projectSetup.state.starting',
  running: 'projectSetup.state.running', stopping: 'projectSetup.state.stopping',
  failed: 'projectSetup.state.failed',
};

export function setupHeader(snapshot: ProjectSetupSnapshot | null, readFailed: boolean): SetupHeader {
  if (snapshot === null) {
    return readFailed
      ? { state: 'unavailable', tone: null, headline: 'projectSetup.unavailable', detail: null }
      : { state: 'loading', tone: null, headline: 'projectSetup.loading', detail: null };
  }
  const saved = snapshot.saved;
  if (saved === null) return { state: 'empty', tone: null, headline: 'projectSetup.noScript', detail: 'projectSetup.empty' };
  const isVerified = saved.revision === snapshot.verified?.revision;
  const detail = isVerified ? null
    : snapshot.verified === null ? 'projectSetup.unverified' : 'projectSetup.previousVerified';
  const headline = snapshot.state === 'idle' && !isVerified ? 'projectSetup.state.unverified' : HEADLINE[snapshot.state];
  return { state: snapshot.state, tone: TONE[snapshot.state], headline, detail };
}

/**
 * A script that does not exist cannot be run, so the footer offers nothing to press. `isServerLive`
 * is the canvas control's own fact: without it the dialog offers Start beside a toolbar offering
 * Stop, because a server the agent started leaves the saved setup idle (ONL-2499).
 */
export function setupRunAction(snapshot: ProjectSetupSnapshot | null, isServerLive: boolean): SetupRunAction | null {
  if (snapshot === null || snapshot.saved === null) return null;
  const isStopping = snapshot.state === 'stopping';
  if (snapshot.state === 'running' || isStopping) {
    return { label: 'projectSetup.stop', press: 'stop', isDisabled: isStopping };
  }
  const isSettled = snapshot.state === 'idle' || snapshot.state === 'failed';
  if (isSettled && isServerLive) return { label: 'projectSetup.stop', press: 'stop', isDisabled: false };
  return { label: 'projectSetup.run', press: 'start', isDisabled: !isSettled };
}

/** The failure the saved script left, which is also the one the agent can be asked to fix. */
export function setupFailure(snapshot: ProjectSetupSnapshot | null): ProjectSetupFailure | null {
  if (snapshot === null || projectSetupAskKind(snapshot) !== 'repair') return null;
  return snapshot.failure;
}

/** A step's tone comes from its position against the one running or failed stage; main sends no per-step status (ONL-2499). */
export function setupSteps(snapshot: ProjectSetupSnapshot): SetupStep[] {
  const saved = snapshot.saved;
  if (saved === null) return [];
  const servers = saved.definition.servers;
  const steps: Omit<SetupStep, 'tone'>[] = [
    { id: 'prepare', kind: 'prepare', script: saved.definition.prepare },
    { id: 'install', kind: 'install', script: saved.definition.install.script },
    ...servers.map((server) => ({
      id: server.id, kind: 'server' as const, script: server.start,
      server: { cwd: server.cwd, port: server.port },
    })),
  ];
  const failed = failedPhase(setupFailure(snapshot), servers);
  return steps.map((step, index) => ({ ...step, tone: toneFor(index, snapshot, servers, failed) }));
}

function toneFor(
  index: number,
  snapshot: ProjectSetupSnapshot,
  servers: readonly { id: string }[],
  failed: Phase | null,
): SetupTone {
  // A partial start publishes `running` with a peer server's failure retained, so the one that failed stays orange.
  if (snapshot.state === 'running') return failed !== null && failed.steps.includes(index) ? failed.tone : 'done';
  if (snapshot.state === 'idle') return null;
  const reached = snapshot.state === 'failed' ? failed : activePhase(snapshot.state, servers.length);
  if (reached === null) return null;
  if (index < reached.start) return 'done';
  return reached.steps.includes(index) ? reached.tone : null;
}

/** Every server step, which start and stop reach together. */
function serverSteps(count: number): number[] {
  return Array.from({ length: count }, (_, offset) => offset + 2);
}

interface Phase { start: number; steps: number[]; tone: TabStatus }

function activePhase(state: 'preparing' | 'installing' | 'starting' | 'stopping', serverCount: number): Phase {
  if (state === 'preparing') return { start: 0, steps: [0], tone: 'working' };
  if (state === 'installing') return { start: 1, steps: [1], tone: 'working' };
  return { start: 2, steps: serverSteps(serverCount), tone: 'working' };
}

function failedPhase(failure: ProjectSetupFailure | null, servers: readonly { id: string }[]): Phase | null {
  if (failure === null) return null;
  if (failure.stage === 'prepare') return { start: 0, steps: [0], tone: 'waiting' };
  if (failure.stage === 'install') return { start: 1, steps: [1], tone: 'waiting' };
  const found = servers.findIndex((server) => server.id === failure.serverId);
  // A peer server is not "before" the one that failed, so it stays unreached rather than done.
  return { start: 2, steps: found === -1 ? serverSteps(servers.length) : [found + 2], tone: 'waiting' };
}
