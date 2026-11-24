// Nothing is registered or broadcast until the cut is complete and un-cancelled: before that `rollback` undoes everything, after it a cancel removes nothing (ONL-2244, ONL-2179).

import { log } from '../log/index.js';
import { creationDiagnosis } from './machine.js';
import { creationRegistered } from '../github-import/telemetry.js';
import { projectSetupService } from '../project-setup/service.js';
import type { ProjectSetupResult } from '@studio/events';
import { canonicalPath } from '../lib/canonical-path.js';
import { observeCreationRunning } from './creation-probe.js';
import { basename } from 'node:path';
import { creationWorkspace } from '@studio/events';
import type { WebContents } from 'electron';
import {
  IPC_EMIT,
  isBrowserNode,
  localPort,
  originForPort,
  workspaceDisplayName,
  type BrowserNode,
  type CanvasDoc,
  type CanvasOp,
  type ComfortChoice,
  type CopyFailure,
  type CreationEntryPoint,
  type ProjectCreatePhase,
  type ProjectCreateState,
  type WorkspaceCreated,
  type WorkspaceCreateResult,
  type WorkspacePlan,
} from '@studio/events';
import { startPrompt } from '../../instructions/start.js';
import { selectedHarness } from '../agent-host/appserver/index.js';
import { sendStudioPrompt, startAgentSession } from '../agent-host/index.js';
import { resolveCreateFrameOps } from '../canvas/authors.js';
import { applyCanvasOps, type CanvasAuthorResult } from '../canvas/index.js';
import { autoInstall, type InstallOutcome } from '../install/index.js';
import { recordProjectPreviewDiagnostics } from './preview-diagnostics.js';
import { previewDiagnostics } from '../telemetry/preview-diagnostics.js';
import { refreshUserEnv } from '../env/shell-env.js';
import { serverHost, type AwaitRunningOutcome } from '../server/index.js';
import { sendToRenderer } from '../tabs/broadcast.js';
import { registerView } from '../tabs/views.js';
import type { SetupErrorClass, TelemetryEventName, TelemetryProperties } from '../telemetry/events.js';
import { capture, workspaceTelemetryProperties } from '../telemetry/index.js';
import { t } from '@studio/i18n';
import { createCancelToken, type CancelToken } from './cancel.js';
import { RUNNING_BOUND_MS } from './create-blank.js';
import { completeCopiedRegistration } from './copy.js';
import { completeDuplicateRegistration, fabricateDuplicate, planDuplicate, rollbackDuplicate } from './duplicate.js';
import { drainCopiedFrameRebinds } from '../canvas/duplicate.js';
import { detectionContextFor, type DetectionOutcome } from './detect.js';
import {
  fabricateFromPlan,
  planWorkspace,
  rollbackFromPlan,
  type ReadyWorkspacePlan,
} from './index.js';
import { flagOn } from '../flags/index.js';
import { broadcastWorkspacesChanged } from './workspaces-changed.js';
import { takeStartIntentForProof } from './setup-proof.js';
import {
  awaitProjectOpen,
  awaitSessionIdle,
  awaitStartOutcome,
  type FirstFrameAnswer,
  type FirstFramePlacer,
  type ProjectOpenOutcome,
  type StartOutcome,
} from './setup-signals.js';
import { rememberProject, workspaceOrigin } from './store.js';
import { devSwitches } from '../env/dev-switches.js';

const logger = log('workspace');

const PROJECT_OPEN_BOUND_MS = 15_000;

export interface ProjectCreateRequest {
  sourcePath: string;
  duplicateSourceName?: string;
  comfort?: ComfortChoice;
  entryPoint: CreationEntryPoint;
}


export interface ProjectCreateDeps {
  diagnoseFailure?: () => Promise<string | undefined>;
  hasSavedSetup?: (cwd: string) => boolean;
  runSavedSetup?: (cwd: string, signal: AbortSignal) => Promise<ProjectSetupResult | null>;
  plan(sourcePath: string, request?: ProjectCreateRequest): Promise<WorkspacePlan>;
  fabricate(plan: ReadyWorkspacePlan): Promise<WorkspaceCreateResult>;
  rollback(plan: ReadyWorkspacePlan): Promise<void>;
  register(workspace: WorkspaceCreated): void;
  capture<N extends TelemetryEventName>(event: N, properties: TelemetryProperties<N>): void;
  startSession(cwd: string): Promise<void>;
  install(workspacePath: string, signal: AbortSignal): Promise<InstallOutcome>;
  refreshEnvironment?(): Promise<unknown>;
  awaitIdle(cwd: string, token: CancelToken): Promise<'idle' | 'canceled'>;
  detect(workspace: WorkspaceCreated): Promise<DetectionOutcome>;
  awaitOpen(cwd: string, token: CancelToken): Promise<ProjectOpenOutcome>;
  awaitStart(cwd: string, token: CancelToken, place: FirstFramePlacer): Promise<StartOutcome>;
  sendStartIntent(cwd: string, context: string | undefined): Promise<boolean>;
  authorFrame(cwd: string, port: number, signal?: AbortSignal): Promise<FirstFrameAnswer>;
  awaitRunning(cwd: string, port: number, boundMs: number): Promise<AwaitRunningOutcome>;
  runningBoundMs?: number;
  emit(state: ProjectCreateState | null): void;
}

export interface ProjectCreateResume {
  phase: 'installing' | 'starting';
  workspace: WorkspaceCreated;
}

function classifySetupFailure(
  phase: ProjectCreatePhase,
  detail: string | undefined,
): SetupErrorClass {
  if (detail !== undefined && /cancel|abort/i.test(detail)) return 'canceled';
  if (detail !== undefined && /timed? ?out/i.test(detail)) return 'timeout';
  switch (phase) {
    case 'copying':
      return 'clone_failed';
    case 'installing':
      return 'dependency_install_failed';
    case 'starting':
      return 'dev_server_failed';
    default:
      return 'unknown';
  }
}

// `STUDIO_SETUP_FAIL_AT=<stage>` fails that stage once per process, so a drive can film the Retry.
const forcedFailures = new Set<ProjectCreatePhase>();

function forcedFailureAt(phase: ProjectCreatePhase): string | undefined {
  if (devSwitches.setupFailAt !== phase) return undefined;
  if (forcedFailures.has(phase)) return undefined;
  forcedFailures.add(phase);
  return `forced by STUDIO_SETUP_FAIL_AT=${phase}`;
}

export function resetForcedFailures(): void {
  forcedFailures.clear();
}

export async function createProject(
  request: ProjectCreateRequest,
  deps: ProjectCreateDeps,
  token: CancelToken = createCancelToken(),
  resume?: ProjectCreateResume,
): Promise<ProjectCreateState> {
  const settle = (state: ProjectCreateState): ProjectCreateState => {
    deps.emit(state);
    return state;
  };
  const startedAt = Date.now();
  const fail = async (
    phase: ProjectCreatePhase,
    detail: string | undefined,
    context: FailContext,
    errorClass: SetupErrorClass = classifySetupFailure(phase, detail),
  ): Promise<ProjectCreateState> => {
    // Recorded before the diagnosis: a cancel landing while the machine is checked must not erase a failure that happened.
    deps.capture('project_setup_failed', {
      ...(errorClass === 'dev_server_failed' ? previewDiagnostics(context.workspace?.workspacePath) : {}),
      ...(context.repoIdentity === undefined ? {} : workspaceTelemetryProperties(context.repoIdentity)),
      stage: phase,
      duration_ms: Date.now() - startedAt,
      error_class: context.copyFailure?.cause === 'git_timed_out' ? 'timeout' : errorClass,
      ...(context.copyFailure === undefined ? {} : { failure_step: context.copyFailure.step, failure_cause: context.copyFailure.cause }),
    });
    // A copy failure is explained by its own classification, never by the machine probe.
    if (context.copyFailure !== undefined) {
      logger.warn('project copy failed', { failure_step: context.copyFailure.step, failure_cause: context.copyFailure.cause });
    } else if (deps.diagnoseFailure !== undefined) {
      detail = await deps.diagnoseFailure() ?? detail;
      // The checks are the only await here, so with no diagnosis there is no window a cancel can land in.
      if (token.canceled) return settle({ kind: 'canceled' });
    }
    return settle({
      kind: 'failed',
      sourceRepoName: context.sourceRepoName,
      phase,
      ...(detail === undefined ? {} : { detail }),
      ...(context.copyFailure === undefined ? {} : { copyFailure: context.copyFailure }),
      ...(context.workspace === undefined ? {} : { workspace: context.workspace }),
    });
  };

  let workspace: WorkspaceCreated;
  if (resume === undefined) {
    const born = await bear(request, deps, token, settle, fail);
    if (born.kind !== 'ready') return born;
    workspace = born.workspace;
    if (request.comfort === 'design') return born;
  } else {
    workspace = resume.workspace;
  }
  if (token.canceled) return settle({ kind: 'canceled' });

  const cwd = workspace.workspacePath;
  recordProjectPreviewDiagnostics(cwd, { project_source: 'imported' }, true);
  const context: FailContext = {
    sourceRepoName: workspace.sourceRepoName,
    workspace,
    repoIdentity: workspace.repoIdentity,
  };

  if (deps.runSavedSetup && (deps.hasSavedSetup?.(cwd) ?? true)) {
    const controller = new AbortController();
    void token.whenCanceled.then(() => controller.abort());
    deps.emit({ kind: 'starting', workspace });
    const cached = await deps.runSavedSetup(cwd, controller.signal);
    if (token.canceled) return settle({ kind: 'canceled' });
    if (cached !== null) {
      if (!cached.ok) return fail('starting', cached.reason, context);
      return settle({ kind: 'live', workspace });
    }
  }

  if (!deps.runSavedSetup && resume?.phase !== 'starting') {
    const forced = forcedFailureAt('installing');
    if (forced !== undefined) return fail('installing', forced, context);
    deps.emit({ kind: 'installing', workspace });
    const controller = new AbortController();
    void token.whenCanceled.then(() => controller.abort());
    let installed: InstallOutcome;
    try {
      if (resume?.phase === 'installing') await deps.refreshEnvironment?.();
      if (token.canceled) return settle({ kind: 'canceled' });
      installed = await deps.install(cwd, controller.signal);
    } catch (err) {
      return fail('installing', String(err), context);
    }
    if (token.canceled || installed.outcome === 'canceled') return settle({ kind: 'canceled' });
    if (installed.outcome === 'failed') return fail('installing', installed.detail, context);
    recordProjectPreviewDiagnostics(cwd, { install_succeeded: installed.outcome === 'installed' ? true : null });
  }

  const forced = forcedFailureAt('starting');
  if (forced !== undefined) return fail('starting', forced, context);
  deps.emit({ kind: 'starting', workspace });
  if (resume?.phase === 'starting') {
    try {
      await deps.refreshEnvironment?.();
    } catch (err) {
      return fail('starting', String(err), context);
    }
    if (token.canceled) return settle({ kind: 'canceled' });
  }
  if ((await deps.awaitIdle(cwd, token)) === 'canceled') return settle({ kind: 'canceled' });
  let detected: DetectionOutcome;
  try {
    detected = await deps.detect(workspace);
  } catch (err) {
    logger.warn('detection skipped', { error: err });
    detected = { asks: [] };
  }
  if (token.canceled) return settle({ kind: 'canceled' });
  const unusual = detected.unusual ?? [];
  for (const kind of detected.asks) {
    const reasons = kind !== 'plan' ? {} : { monorepo: unusual.includes('monorepo'), electron: unusual.includes('electron'), no_dev_script: unusual.includes('no-dev-script') };
    deps.capture('setup_question', { ...workspaceTelemetryProperties(workspace.repoIdentity), kind, ...reasons });
  }
  const opened = await deps.awaitOpen(cwd, token);
  if (opened === 'canceled' || token.canceled) return settle({ kind: 'canceled' });
  if (opened === 'timed-out') return fail('starting', t('project.create.detail.neverOpened'), context, 'timeout');
  if ((await deps.awaitIdle(cwd, token)) === 'canceled') return settle({ kind: 'canceled' });
  const placeFor: FirstFramePlacer = (port, signal) => deps.authorFrame(cwd, port, signal);
  let outcome = deps.awaitStart(cwd, token, placeFor);
  let sent: boolean;
  try {
    sent = await deps.sendStartIntent(cwd, detected.context);
    if (!sent) {
      if ((await deps.awaitIdle(cwd, token)) === 'canceled') return settle({ kind: 'canceled' });
      outcome = deps.awaitStart(cwd, token, placeFor);
      sent = await deps.sendStartIntent(cwd, detected.context);
    }
  } catch (err) {
    recordProjectPreviewDiagnostics(cwd, { cause: 'start_request_failed' });
    return fail('starting', String(err), context);
  }
  if (token.canceled) return settle({ kind: 'canceled' });
  if (!sent) {
    recordProjectPreviewDiagnostics(cwd, { cause: 'start_request_failed' });
    return fail('starting', t('project.create.detail.noSession'), context);
  }

  const started = await outcome;
  if (started.kind === 'canceled') return settle({ kind: 'canceled' });
  if (started.kind === 'turn-failed') {
    return fail('starting', t('project.create.detail.agentFailed'), context, 'agent_turn_failed');
  }
  if (started.kind === 'turn-stopped') {
    return fail('starting', t('project.create.detail.agentStopped'), context, 'agent_turn_stopped');
  }
  if (started.kind === 'turn-ended') {
    recordProjectPreviewDiagnostics(cwd, { cause: 'start_turn_no_report' });
    return fail('starting', t('project.create.detail.noServer'), context);
  }

  recordProjectPreviewDiagnostics(cwd, { expected_port: started.port, reported_port: started.port });
  const running = await Promise.race([
    deps.awaitRunning(cwd, started.port, deps.runningBoundMs ?? RUNNING_BOUND_MS),
    token.whenCanceled.then(() => 'canceled' as const),
  ]);
  if (running === 'canceled' || token.canceled) return settle({ kind: 'canceled' });
  if (running !== 'running') {
    recordProjectPreviewDiagnostics(cwd, { cause: 'readiness_timeout' });
    return fail(
      'starting',
      `The agent reported port ${String(started.port)}, but nothing answered there.`,
      context,
    );
  }
  return settle({ kind: 'live', workspace });
}

interface FailContext {
  sourceRepoName: string;
  workspace?: WorkspaceCreated;
  repoIdentity?: string;
  copyFailure?: CopyFailure;
}

async function bear(
  request: ProjectCreateRequest,
  deps: ProjectCreateDeps,
  token: CancelToken,
  settle: (state: ProjectCreateState) => ProjectCreateState,
  fail: (phase: ProjectCreatePhase, detail: string | undefined, context: FailContext) => Promise<ProjectCreateState>,
): Promise<ProjectCreateState> {
  let sourceRepoName = basename(request.sourcePath);
  deps.emit({ kind: 'planning', sourceRepoName, ...(request.duplicateSourceName === undefined ? {} : { duplicateSourceName: request.duplicateSourceName }) });

  const forcedPlanning = forcedFailureAt('planning');
  if (forcedPlanning !== undefined) return fail('planning', forcedPlanning, { sourceRepoName });
  let plan: WorkspacePlan;
  try {
    plan = await deps.plan(request.sourcePath, request);
  } catch (err) {
    return fail('planning', String(err), { sourceRepoName });
  }
  if (token.canceled) {
    if (plan.kind === 'ready' && plan.origin === 'duplicate') await deps.rollback(plan);
    return settle({ kind: 'canceled' });
  }
  if (plan.kind === 'refused') {
    return settle({
      kind: 'refused',
      sourceRepoName,
      reason: plan.reason,
      ...(plan.detail === undefined ? {} : { detail: plan.detail }),
      ...(plan.projectName === undefined ? {} : { projectName: plan.projectName }),
    });
  }

  sourceRepoName = plan.sourceRepoName;
  const context: FailContext = { sourceRepoName, repoIdentity: plan.repoIdentity };
  const forcedCopying = forcedFailureAt('copying');
  if (forcedCopying !== undefined) {
    if (plan.origin === 'duplicate') await deps.rollback(plan);
    return fail('copying', forcedCopying, context);
  }
  deps.emit({ kind: 'copying', sourceRepoName, workspaceName: plan.workspaceName, ...(plan.duplicateSourceName === undefined ? {} : { duplicateSourceName: plan.duplicateSourceName }) });

  let created: WorkspaceCreateResult;
  try {
    created = await deps.fabricate(plan);
  } catch (err) {
    return fail('copying', String(err), context);
  }

  if (!created.ok) {
    // `fabricate` rolls its own unhealthy cut back, so there is nothing here to undo.
    if (token.canceled) return settle({ kind: 'canceled' });
    if (created.reason === 'create-failed') return fail('copying', created.detail, { ...context, ...(created.copyFailure === undefined ? {} : { copyFailure: created.copyFailure }) });
    const detail = created.detail === undefined ? {} : { detail: created.detail };
    return settle({ kind: 'refused', sourceRepoName, reason: created.reason, ...detail });
  }

  if (token.canceled) {
    let detail: string | undefined;
    try {
      await deps.rollback(plan);
    } catch (err) {
      // Still `canceled`: the residue is a fact to log, not a failure.
      detail = `rollback: ${String(err)}`;
    }
    return settle({ kind: 'canceled', ...(detail === undefined ? {} : { detail }) });
  }

  const workspace: WorkspaceCreated =
    request.comfort === undefined ? created.workspace : { ...created.workspace, comfort: request.comfort };
  deps.register(workspace);
  creationRegistered(request.sourcePath, workspace.repoIdentity, workspace.workspacePath);
  const origin = workspaceOrigin(workspace);
  deps.capture('project_created', {
    ...workspaceTelemetryProperties(workspace.repoIdentity),
    source: origin,
    entry_point: request.entryPoint,
  });
  if (request.comfort !== undefined) {
    deps.capture('project_mode_chosen', {
      ...workspaceTelemetryProperties(workspace.repoIdentity),
      mode: request.comfort,
      source: origin,
      entry_point: request.entryPoint,
    });
  }
  try {
    await deps.startSession(workspace.workspacePath);
  } catch (err) {
    logger.warn('session start at setup failed', { stderr: String(err) });
  }
  if (token.canceled) return settle({ kind: 'canceled' });
  return settle({ kind: 'ready', workspace });
}

export function createLabel(state: ProjectCreateState): string | undefined {
  switch (state.kind) {
    case 'planning':
      return state.sourceRepoName;
    case 'copying':
      return state.workspaceName;
    case 'ready':
    case 'installing':
    case 'starting':
    case 'live':
      return workspaceDisplayName(state.workspace);
    case 'refused':
      return state.sourceRepoName;
    case 'failed':
      return state.workspace === undefined ? state.sourceRepoName : workspaceDisplayName(state.workspace);
    case 'canceled':
      return undefined;
  }
}

interface Creation {
  token: CancelToken;
  done: Promise<ProjectCreateState>;
  /** The LANDING, not the settle: a project has identity from `ready` on, long before `live` (ONL-2212). */
  landed: Promise<WorkspaceCreated | null>;
  settleLanded: (workspace: WorkspaceCreated | null) => void;
  state: ProjectCreateState;
  isSettled: boolean;
  request: ProjectCreateRequest;
  plan?: ReadyWorkspacePlan;
}

export class ProjectCreations {
  private readonly byTab = new Map<string, Creation>();

  start(tabId: string, request: ProjectCreateRequest, deps: ProjectCreateDeps): Promise<ProjectCreateState> {
    const existing = this.byTab.get(tabId);
    if (existing && !existing.isSettled) return existing.done;
    return this.launch(tabId, request, deps);
  }

  retry(tabId: string, deps: ProjectCreateDeps): Promise<ProjectCreateState> | undefined {
    const existing = this.byTab.get(tabId);
    if (!existing || !existing.isSettled || existing.state.kind !== 'failed') return undefined;
    const failed = existing.state;
    if (failed.workspace !== undefined && (failed.phase === 'installing' || failed.phase === 'starting')) {
      return this.launch(tabId, existing.request, deps, { phase: failed.phase, workspace: failed.workspace });
    }
    const residue = failed.phase === 'copying' ? existing.plan : undefined;
    return this.launch(tabId, existing.request, deps, undefined, residue);
  }

  dismiss(tabId: string, deps: ProjectCreateDeps): boolean {
    const existing = this.byTab.get(tabId);
    if (!existing || !existing.isSettled || existing.state.kind !== 'failed') return false;
    if (existing.state.workspace === undefined) return false;
    this.forget(tabId);
    deps.emit(null);
    return true;
  }

  private launch(
    tabId: string,
    request: ProjectCreateRequest,
    deps: ProjectCreateDeps,
    resume?: ProjectCreateResume,
    residue?: ReadyWorkspacePlan,
  ): Promise<ProjectCreateState> {
    const token = createCancelToken();
    let settleLanded: (workspace: WorkspaceCreated | null) => void = () => undefined;
    const landed = new Promise<WorkspaceCreated | null>((resolve) => {
      let isSettled = false;
      settleLanded = (workspace) => {
        if (isSettled) return;
        isSettled = true;
        resolve(workspace);
      };
    });
    const creation: Creation = {
      token,
      landed,
      settleLanded,
      state:
        resume === undefined
          ? { kind: 'planning', sourceRepoName: basename(request.sourcePath) }
          : { kind: resume.phase, workspace: resume.workspace },
      isSettled: false,
      request,
      done: Promise.resolve({ kind: 'canceled' } as ProjectCreateState),
    };
    // Bound to this creation, never looked up by tab: a released creation settles after the tab's next one starts.
    // Recorded before it is passed on, so a synchronous read-back inside `emit` sees it.
    const emit = (state: ProjectCreateState): void => {
      creation.state = state;
      if ('workspace' in state && state.workspace !== undefined) creation.settleLanded(state.workspace);
      deps.emit(state);
    };
    // Only a cut that throws leaves residue: one that returns rolled back what it owned, and a lost claim owns another tab's bucket.
    const fabricate = (plan: ReadyWorkspacePlan): Promise<WorkspaceCreateResult> => {
      creation.plan = plan;
      return deps.fabricate(plan).then((result) => {
        creation.plan = undefined;
        return result;
      });
    };
    this.byTab.set(tabId, creation);
    const cleanup =
      residue === undefined
        ? Promise.resolve()
        : deps.rollback(residue).catch((err: unknown) => {
            logger.warn('retry rollback incomplete', { error: err });
          });
    creation.done = cleanup
      .then(() => createProject(request, { ...deps, emit, fabricate }, token, resume))
      .finally(() => {
        creation.isSettled = true;
        creation.settleLanded(null);
      });
    return creation.done;
  }

  stateFor(tabId: string): ProjectCreateState | undefined {
    return this.byTab.get(tabId)?.state;
  }

  inFlight(tabId: string): boolean {
    const creation = this.byTab.get(tabId);
    return creation !== undefined && !creation.isSettled;
  }

  // The plan as well as the state: `git worktree add` runs during `copying`, which carries no path (ONL-2522).
  isRunningFor(workspacePath: string): boolean {
    const wanted = canonicalPath(workspacePath);
    for (const creation of this.byTab.values()) {
      if (creation.isSettled) continue;
      const paths = [creation.plan?.workspacePath, creationWorkspace(creation.state)?.workspacePath];
      if (paths.some((path) => path !== undefined && canonicalPath(path) === wanted)) return true;
    }
    return false;
  }

  /** A cold tab warmed onto the spare keeps its cut: releasing here abandons a worktree (ONL-2318). */
  rekey(from: string, to: string): void {
    const creation = this.byTab.get(from);
    if (creation === undefined) return;
    this.byTab.delete(from);
    this.byTab.set(to, creation);
  }

  landing(tabId: string): Promise<WorkspaceCreated | null> | undefined {
    return this.byTab.get(tabId)?.landed;
  }

  async cancel(tabId: string): Promise<ProjectCreateState | undefined> {
    const creation = this.byTab.get(tabId);
    if (!creation) return undefined;
    creation.token.cancel();
    return creation.done;
  }

  forget(tabId: string): void {
    this.byTab.delete(tabId);
  }

  // The record goes before the rollback finishes: the band redraws from it and would name the project for as long as `git worktree remove` takes.
  release(tabId: string): boolean {
    const creation = this.byTab.get(tabId);
    if (!creation) return false;
    this.byTab.delete(tabId);
    creation.token.cancel();
    return true;
  }
}

export const projectCreations = new ProjectCreations();

observeCreationRunning((workspacePath) => projectCreations.isRunningFor(workspacePath));

export async function placeFirstFrame(
  apply: (resolve: (doc: CanvasDoc) => CanvasOp[] | { reason: string }) => Promise<CanvasAuthorResult>,
  port: number,
): Promise<FirstFrameAnswer> {
  let shown: BrowserNode | undefined;
  const result = await drainCopiedFrameRebinds(apply, port, (doc, rebound) => {
    if (rebound.length > 0) return rebound;
    shown = Object.values(doc.nodes)
      .filter(isBrowserNode)
      .find((node) => localPort(node.content.homeUrl) === port);
    return shown === undefined ? resolveCreateFrameOps(doc, { url: originForPort(port) }) : { reason: 'already framed' };
  });
  if (shown !== undefined) return { kind: 'already-shown', node: shown };
  if (!result.ok) return { kind: 'not-placed', reason: result.reason };
  const op = result.entries[0]?.op;
  const node = op?.type === 'create' ? result.doc.nodes[op.node.id] : op?.type === 'set-home-url' ? result.doc.nodes[op.id] : undefined;
  return node === undefined || !isBrowserNode(node)
    ? { kind: 'not-placed', reason: 'the frame did not land' }
    : { kind: 'placed', node };
}

// `workspace:created` goes to the owning view alone: a view that hears it adopts the project as its identity (ONL-2252).
export function appProjectCreateDeps(
  owner: WebContents,
  emit: (state: ProjectCreateState | null) => void,
): ProjectCreateDeps {
  return {
    ...creationDiagnosis(),
    plan: (sourcePath, request) => request?.duplicateSourceName === undefined ? planWorkspace(sourcePath) : planDuplicate(sourcePath),
    fabricate: (plan) => plan.origin === 'duplicate' ? fabricateDuplicate(plan) : fabricateFromPlan(plan),
    rollback: (plan) => plan.origin === 'duplicate' ? rollbackDuplicate(plan) : rollbackFromPlan(plan),
    register: (workspace) => {
      rememberProject(workspace);
      if (workspaceOrigin(workspace) === 'copied') completeCopiedRegistration(workspace);
      if (workspaceOrigin(workspace) === 'duplicate') completeDuplicateRegistration(workspace.workspacePath);
      sendToRenderer(owner, IPC_EMIT.workspaceCreated, workspace);
      broadcastWorkspacesChanged();
    },
    capture,
    hasSavedSetup: (cwd) => projectSetupService().read(cwd).saved !== null,
    runSavedSetup: async (cwd, signal) => {
      const setup = projectSetupService();
      if (!setup.read(cwd).saved) return null;
      const stop = () => { void setup.run(cwd, { action: 'stop' }); };
      signal.addEventListener('abort', stop, { once: true });
      try {
        if (signal.aborted) return { ok: false, snapshot: setup.read(cwd), reason: t('projectSetup.failure.canceled') };
        registerView(owner, cwd);
        return await setup.run(cwd, { action: 'start' });
      } finally { signal.removeEventListener('abort', stop); }
    },
    // `agent:session` and `session.welcome` route by cwd to registered views, and the tab's later join re-announces nothing.
    startSession: (cwd) => {
      registerView(owner, cwd);
      return startAgentSession(cwd);
    },
    install: (workspacePath, signal) => autoInstall(workspacePath, undefined, signal),
    refreshEnvironment: refreshUserEnv,
    awaitIdle: awaitSessionIdle,
    // The Harness is resolved as the host resolves it: the block names that Harness's own question tool.
    detect: (workspace) =>
      detectionContextFor({
        worktree: workspace.workspacePath,
        sourcePath: workspace.sourcePath,
        repoIdentity: workspace.repoIdentity,
        harness: selectedHarness(),
      }),
    awaitOpen: (cwd, token) => awaitProjectOpen(cwd, token, PROJECT_OPEN_BOUND_MS),
    awaitStart: awaitStartOutcome,
    sendStartIntent: (cwd, context) =>
      takeStartIntentForProof(cwd, context) ? Promise.resolve(true) : sendStudioPrompt(cwd, startPrompt([], { pendingFrame: flagOn('frame-covers') }), context),
    authorFrame: async (cwd, port, signal) => {
      const frame = await placeFirstFrame((resolve) => applyCanvasOps('system', (doc) => signal?.aborted ? { reason: t('projectSetup.failure.canceled') } : resolve(doc), cwd), port);
      if (frame.kind === 'not-placed') logger.warn('first frame declined', { reason: frame.reason });
      return frame;
    },
    awaitRunning: (cwd, port, boundMs) =>
      serverHost()?.awaitRunning(cwd, port, boundMs) ?? Promise.resolve('timed-out' as const),
    emit,
  };

}
