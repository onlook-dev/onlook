import { isSameSetupFailure, projectSetupAskKind, type ProjectSetupFailure, type ProjectSetupSnapshot } from './project-setup.js';
import { appShowsOnCanvas, setupFailureDetail, type SetupCanvas, type SetupStepsView } from './setup-steps.js';
import type { ProjectCreateState } from './workspace.js';

/** 1 getting the project (copy or find), 2 installing packages, 3 starting the app, 4 opening it on the canvas. */
export type ImportSetupStep = 1 | 2 | 3 | 4;

export interface ImportSetupFailure {
  step: ImportSetupStep;
  /** Present when the setup machine named the stage; a failure Studio saw on its own carries none. */
  stage?: ProjectSetupFailure['stage'];
  detail?: string;
}

export type ImportSetupProgress =
  | { state: 'running'; at: ImportSetupStep }
  | { state: 'failed'; at: ImportSetupStep; failure: ImportSetupFailure }
  | { state: 'up'; at: 4 };

export interface ImportSetupFacts {
  create: ProjectCreateState | null;
  /** The checklist of the transcript's last setup turn, live only while that turn runs; none before the first setup prompt. */
  turn?: SetupStepsView;
  /** The setup machine as it stands now. */
  snapshot: ProjectSetupSnapshot | null;
  canvas?: SetupCanvas;
  /** Present once this import's app has been live on the tab's canvas, with the setup failure standing at that moment. */
  landing?: { failure: ProjectSetupFailure | null };
}

function stageStep(stage: ProjectSetupFailure['stage']): ImportSetupStep {
  return stage === 'prepare' || stage === 'install' ? 2 : 3;
}

function machineStep(snapshot: ProjectSetupSnapshot | null): ImportSetupStep | undefined {
  switch (snapshot?.state) {
    case 'preparing':
    case 'installing':
      return 2;
    case 'starting':
      return 3;
    case 'running':
      return 4;
    default:
      return undefined;
  }
}

function turnStep(turn: SetupStepsView | undefined): ImportSetupStep | undefined {
  if (turn === undefined) return undefined;
  const next = turn.steps.findIndex((step) => step.status !== 'done');
  return next === -1 ? 4 : ((next + 1) as ImportSetupStep);
}

function failedTurn(turn: SetupStepsView | undefined): ImportSetupFailure | undefined {
  if (turn?.outcome !== 'failed' || turn.failedStep === undefined) return undefined;
  const detail = turn.steps[turn.failedStep - 1]?.detail;
  return { step: turn.failedStep, ...(detail === undefined ? {} : { detail }) };
}

function machineFailure(snapshot: ProjectSetupSnapshot | null): ImportSetupFailure | undefined {
  if (snapshot?.state !== 'failed' || snapshot.failure === null) return undefined;
  return { step: stageStep(snapshot.failure.stage), stage: snapshot.failure.stage, detail: setupFailureDetail(snapshot.failure) };
}

function failed(failure: ImportSetupFailure): ImportSetupProgress {
  return { state: 'failed', at: failure.step, failure };
}

/** A failure of the setup as it is saved now; an older revision's, a failed stop, or the one standing when the import landed is no later run's. */
function laterFailure(snapshot: ProjectSetupSnapshot | null, standing: ProjectSetupFailure | null): ImportSetupFailure | undefined {
  if (snapshot === null || snapshot.failure?.stage === 'stop' || projectSetupAskKind(snapshot) !== 'repair') return undefined;
  if (standing !== null && isSameSetupFailure(snapshot.failure, standing)) return undefined;
  return machineFailure(snapshot);
}

/** After the import: a setup turn the chat draws live, else the saved setup the machine is running or last failed, as on a reopen or a restart. */
function laterRun(turn: SetupStepsView | undefined, snapshot: ProjectSetupSnapshot | null, standing: ProjectSetupFailure | null = null): ImportSetupProgress | null {
  if (turn?.outcome === 'running') return { state: 'running', at: turnStep(turn) ?? 1 };
  const at = machineStep(snapshot);
  if (at === 2 || at === 3) return { state: 'running', at };
  const failure = laterFailure(snapshot, standing);
  return failure === undefined ? null : failed(failure);
}

function up(snapshot: ProjectSetupSnapshot | null, canvas: SetupCanvas | undefined): ImportSetupProgress {
  const ports = snapshot?.saved?.definition.servers.map((server) => server.port) ?? [];
  return appShowsOnCanvas(ports, canvas) ? { state: 'up', at: 4 } : { state: 'running', at: 4 };
}

/** A setup machine run after a failure, such as a repair, reads as that step under way again. */
export function importSetupSteps({ create, turn, snapshot, canvas, landing }: ImportSetupFacts): ImportSetupProgress | null {
  if (create === null) return laterRun(turn, snapshot);
  if (landing !== undefined && (create.kind === 'live' || create.kind === 'failed')) return laterRun(turn, snapshot, landing.failure);
  switch (create.kind) {
    case 'refused':
    case 'canceled':
      return null;
    case 'ready':
      return laterRun(turn, snapshot);
    case 'planning':
    case 'copying':
      return { state: 'running', at: 1 };
    case 'installing':
      return { state: 'running', at: 2 };
    case 'live':
      return up(snapshot, canvas);
    case 'starting': {
      const running = machineStep(snapshot);
      if (running !== undefined) {
        const turnAt = turn?.outcome === 'running' ? (turnStep(turn) ?? 1) : 1;
        return { state: 'running', at: Math.max(1, running, turnAt) as ImportSetupStep };
      }
      const failure = failedTurn(turn);
      if (failure !== undefined) return failed(failure);
      return { state: 'running', at: turnStep(turn) ?? 1 };
    }
    case 'failed': {
      if (create.phase === 'planning' || create.phase === 'copying') {
        return failed({ step: 1, ...(create.detail === undefined ? {} : { detail: create.detail }) });
      }
      const again = machineStep(snapshot);
      if (again === 4) return up(snapshot, canvas);
      if (again !== undefined) return { state: 'running', at: again };
      if (create.phase === 'installing') return failed({ step: 2, ...(create.detail === undefined ? {} : { detail: create.detail }) });
      return failed(machineFailure(snapshot) ?? failedTurn(turn) ?? { step: 3, ...(create.detail === undefined ? {} : { detail: create.detail }) });
    }
  }
}
