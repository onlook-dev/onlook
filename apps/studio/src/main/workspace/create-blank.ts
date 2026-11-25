// Nothing is registered or broadcast before the starter measures running; a failed or canceled attempt answers only after `rollbackBlank` finishes (ONL-2152).

import { log } from '../log/index.js';
import { creationDiagnosis } from './machine.js';
import { randomUUID } from 'node:crypto';
import { t } from '@studio/i18n';
import { handle, on } from '../ipc/bridge.js';
import {
  IPC_EMIT,
  IPC_INVOKE,
  IPC_SEND,
  type BlankCreateResult,
  type BlankCreateStage,
  type CreateBlankRequest,
  type WorkspaceCreated,
} from '@studio/events';
import { planFor, runInstall, type InstallPlan, type RunResult } from '../install/index.js';
import { chooseAdapter, type AdapterChoice } from '../starter/adapter.js';
import { openCanvasForProject } from '../canvas/index.js';
import { serverHost, type AwaitRunningOutcome, type StarterControl } from '../server/index.js';
import { starterHost } from '../starter/index.js';
import type { BlankCreationStep, TelemetryEventName, TelemetryProperties, WorkspaceTelemetryProperties } from '../telemetry/events.js';
import { capture, workspaceTelemetryProperties } from '../telemetry/index.js';
import { claimBlankBucket, clearBlankMarker, constructBlankPlan, initBlankSource, rollbackBlank } from './blank.js';
import { createCancelToken, type CancelToken } from './cancel.js';
import { type BlankCreationFailure, gitFailure, systemErrorCode, thrownFailure } from './creation-failure.js';
import { createWorkspaceFromPlan } from './index.js';
import { broadcastWorkspacesChanged } from './workspaces-changed.js';
import { rememberProject, renameWorkspace } from './store.js';
import { beginCreation, creationRegistered, creationPreview, holdBlankPreview } from '../github-import/telemetry.js';
import { sendToRenderer, type Sink } from '../tabs/broadcast.js';

const logger = log('workspace');

// Above the monitor's own schedule; ends the modal when a starter answers its ready line and then dies.
export const RUNNING_BOUND_MS = 15_000;

export interface BlankCreateDeps {
  diagnoseFailure?: () => Promise<string | undefined>;
  starter: Pick<StarterControl, 'spawn' | 'stop'>;
  server: {
    retainStarter?(worktreePath: string): () => void;
    openProject(worktreePath: string): Promise<void>;
    report(
      worktreePath: string,
      folder: string,
      port: number,
      workspaceTelemetry?: WorkspaceTelemetryProperties,
    ): Promise<void>;
    awaitRunning(worktreePath: string, port: number, boundMs: number): Promise<AwaitRunningOutcome>;
  };
  canvas: {
    open(worktreePath: string): Promise<void>;
  };
  emitStage(stage: BlankCreateStage): void;
  adapter?: () => Promise<AdapterChoice>;
  install?: (plan: InstallPlan, cwd: string, signal: AbortSignal) => Promise<RunResult>;
  capture<N extends TelemetryEventName>(event: N, properties: TelemetryProperties<N>): void;
  announce(workspace: WorkspaceCreated): void;
  runningBoundMs?: number;
  now?: () => number;
}

export async function createBlankProject(
  request: CreateBlankRequest,
  deps: BlankCreateDeps,
  token: CancelToken = createCancelToken(),
): Promise<BlankCreateResult> {
  const entryPoint = request.entryPoint;
  const now = deps.now ?? (() => performance.now());
  const startedAt = now();
  const attempt = { creation_id: randomUUID(), source: 'blank' as const, entry_point: entryPoint };
  beginCreation(attempt.creation_id, 'scratch');
  const completedAttempt = () => ({ ...attempt, duration_ms: Math.round(now() - startedAt) });
  deps.capture('project_creation_started', attempt);
  let stage: BlankCreateStage = 'setting-up';
  let step: BlankCreationStep = 'claim';
  const recordFailure = (reason: 'canceled' | 'failed', failure?: BlankCreationFailure): void => {
    deps.capture('project_creation_failed', { ...completedAttempt(), stage, reason, ...failure });
    if (failure !== undefined) logger.warn('blank creation failed', { creation_id: attempt.creation_id, stage, ...failure });
  };
  deps.emitStage(stage);

  const diagnosed = async (): Promise<{ explanation?: string }> => {
    const explanation = await deps.diagnoseFailure?.();
    return explanation === undefined ? {} : { explanation };
  };

  let claimed: ReturnType<typeof claimBlankBucket>;
  try {
    claimed = claimBlankBucket();
  } catch (err) {
    recordFailure('failed', thrownFailure(step, err));
    return { ok: false, stage, canceled: false, detail: String(err), ...(await diagnosed()) };
  }
  if (!claimed.ok) {
    recordFailure('failed', { failure_step: step, failure_cause: 'name_taken' });
    return { ok: false, stage, canceled: false, detail: claimed.reason, ...(await diagnosed()) };
  }
  const claim = claimed.claim;
  const worktree = claim.bucket.worktree;
  const releaseStarter = deps.server.retainStarter?.(worktree);
  let releaseBlankPreview: (() => void) | undefined;
  let opened = false;

  // Memoised: a rollback that throws lands in the catch below and would otherwise roll back twice.
  let aborting: Promise<BlankCreateResult> | undefined;
  const abort = (detail?: string, failure?: BlankCreationFailure): Promise<BlankCreateResult> => {
    aborting ??= (async () => {
      const canceled = token.canceled;
      if (canceled) recordFailure('canceled');
      else recordFailure('failed', failure ?? { failure_step: step, failure_cause: 'unknown' });
      try {
        await rollbackBlank(claim, { opened, stopStarter: (path) => deps.starter.stop(path) });
      } catch (err) {
        logger.error('blank rollback incomplete', { system_error: systemErrorCode(err) });
        detail = detail === undefined ? `rollback: ${String(err)}` : `${detail}; rollback: ${String(err)}`;
      }
      if (!canceled && failure?.failure_cause === 'git_not_found') {
        return { ok: false, stage, canceled, cause: 'git_not_found' };
      }
      // The reading from before the rollback: a cancel landing during the diagnosis would otherwise answer a real failure as canceled, with its explanation dropped (ONL-3111).
      const explained = canceled ? {} : await diagnosed();
      return { ok: false, stage, canceled, ...(detail === undefined ? {} : { detail }), ...explained };
    })();
    return aborting;
  };

  try {
    step = 'scaffold';
    const { adapter, manager } = await (deps.adapter ?? chooseAdapter)();
    const inited = await initBlankSource(claim, adapter, manager);
    if (!inited.ok) return await abort(inited.detail, inited.failure);
    if (token.canceled) return await abort();

    step = 'worktree_cut';
    let cutFailure: BlankCreationFailure | undefined;
    const created = await createWorkspaceFromPlan(constructBlankPlan(claim), (result) => {
      cutFailure = gitFailure('worktree_cut', result);
    });
    if (!created.ok) return await abort(created.detail, cutFailure);
    if (token.canceled) return await abort();

    if (adapter.install) {
      step = 'install';
      const installFailure: BlankCreationFailure = { failure_step: step, failure_cause: 'install_failed' };
      if (manager === undefined) return await abort(`the ${adapter.id} starter needs a package manager and none was chosen`, installFailure);
      stage = 'installing';
      deps.emitStage(stage);
      const controller = new AbortController();
      void token.whenCanceled.then(() => controller.abort());
      // In the worktree, never the source.
      const installed = await (deps.install ?? runInstallWith)(planFor(manager.name), worktree, controller.signal);
      if (token.canceled || installed.aborted) return await abort();
      if (!installed.ok) {
        return await abort(
          installed.timedOut
            ? t('project.install.timedOut', { manager: manager.name })
            : installed.err || t('project.install.failed', { manager: manager.name }),
          installFailure,
        );
      }
    }

    stage = 'starting';
    step = 'starter_spawn';
    deps.emitStage(stage);
    // Raced: a cancel must not sit behind the starter's 20s ready bound; a spawn finishing after it is stopped on arrival.
    const spawning = deps.starter.spawn(worktree);
    const spawned = await Promise.race([
      spawning.then((port) => ({ port })),
      token.whenCanceled.then(() => 'canceled' as const),
    ]);
    if (spawned === 'canceled' || token.canceled) {
      void spawning.then(() => deps.starter.stop(worktree)).catch(() => undefined);
      return await abort();
    }
    const port = spawned.port;

    // Canvas before the report: the port-follow author writes through the canvas host on every monitor emit.
    opened = true;
    step = 'open_project';
    await deps.canvas.open(worktree);
    await deps.server.openProject(worktree);
    const workspaceProperties = workspaceTelemetryProperties(claim.repoIdentity);
    releaseBlankPreview = holdBlankPreview(worktree);
    await deps.server.report(worktree, worktree, port, workspaceProperties);
    step = 'await_running';
    const outcome = await Promise.race([
      deps.server.awaitRunning(worktree, port, deps.runningBoundMs ?? RUNNING_BOUND_MS),
      token.whenCanceled.then(() => 'canceled' as const),
    ]);
    if (token.canceled || outcome === 'canceled') return await abort();
    if (outcome !== 'running') {
      return await abort(undefined, { failure_step: step, failure_cause: 'never_running' });
    }

    const workspace: WorkspaceCreated = { ...created.workspace, origin: 'blank' };
    // Registered before announced: the announcement points a session at this path, and agent-host reads the registry.
    rememberProject(workspace);
    creationRegistered(attempt.creation_id, workspace.repoIdentity, workspace.workspacePath);
    creationPreview(workspaceProperties.project_id, 'success', workspace.workspacePath);
    // Or the projects view titles the group `source`.
    renameWorkspace(claim.repoIdentity, claim.title);
    clearBlankMarker(claim.bucket);
    deps.capture('project_created', { ...completedAttempt(), ...workspaceProperties });
    deps.announce(workspace);
    return { ok: true, workspace };
  } catch (err) {
    return await abort(String(err), thrownFailure(step, err));
  } finally {
    releaseBlankPreview?.();
    releaseStarter?.();
  }
}

function runInstallWith(plan: InstallPlan, cwd: string, signal: AbortSignal): Promise<RunResult> {
  return runInstall(plan, cwd, { signal });
}


let inFlight: { sender: Sink; openInNewTab: boolean; token: CancelToken; done: Promise<BlankCreateResult> } | undefined;

interface BlankDraftTabs {
  begin(): boolean;
  finish(): void;
  open(workspace: WorkspaceCreated): boolean;
}

function appDeps(sender: Sink, openInNewTab: boolean, tabs: BlankDraftTabs): BlankCreateDeps | undefined {
  const starter = starterHost();
  const server = serverHost();
  if (starter === undefined || server === undefined) return undefined;
  return {
    starter,
    ...creationDiagnosis(),
    server,
    canvas: { open: openCanvasForProject },
    emitStage: (stage) => {
      sendToRenderer(sender, IPC_EMIT.blankCreateStage, stage);
    },
    capture,
    announce: (workspace) => {
      if (openInNewTab) {
        tabs.finish();
        if (!tabs.open(workspace)) logger.error('ready blank draft could not open its tab');
      } else {
        sendToRenderer(sender, IPC_EMIT.workspaceCreated, workspace);
      }
      // Global on purpose: every tab's projects list grows the card.
      broadcastWorkspacesChanged();
    },
  };
}

// One creation at a time: a second invoke joins the in-flight one, since the modal's button can be pressed twice.
export function registerBlankCreateHandlers(tabs: BlankDraftTabs): void {
  handle(IPC_INVOKE.workspaceCreateBlank, (event, request: CreateBlankRequest) => {
    const openInNewTab = request.openInNewTab === true;
    if (inFlight !== undefined) {
      if (inFlight.sender === event.sender && inFlight.openInNewTab === openInNewTab) return inFlight.done;
      return Promise.resolve<BlankCreateResult>({ ok: false, stage: 'setting-up', canceled: false });
    }
    // The requesting view alone: a view that hears `workspace:created` adopts it as its identity (ONL-2226, ONL-2252).
    const deps = appDeps(event.sender, openInNewTab, tabs);
    if (deps === undefined) {
      const result: BlankCreateResult = { ok: false, stage: 'setting-up', canceled: false };
      return Promise.resolve(result);
    }
    if (openInNewTab && !tabs.begin()) {
      return Promise.resolve<BlankCreateResult>({ ok: false, stage: 'setting-up', canceled: false });
    }
    const token = createCancelToken();
    const done = createBlankProject(request, deps, token).finally(() => {
      inFlight = undefined;
      if (openInNewTab) tabs.finish();
    });
    inFlight = { sender: event.sender, openInNewTab, token, done };
    return done;
  });
  on(IPC_SEND.blankCreateCancel, () => {
    inFlight?.token.cancel();
  });

}
