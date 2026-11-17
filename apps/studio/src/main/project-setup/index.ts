import { handle } from '../ipc/bridge.js';
import { IPC_EMIT, IPC_INVOKE, type ProjectSetupSnapshot, type ProjectSetupAskResult } from '@studio/events';
import { applyCanvasOps } from '../canvas/index.js';
import { serverHost } from '../server/index.js';
import { views, workspaceOf } from '../tabs/views.js';
import { registeredProject } from '../workspace/store.js';
import { isSessionStreaming, noteSetupReport } from '../workspace/setup-signals.js';
import { placeFirstFrame } from '../workspace/create-project.js';
import { initializeProjectSetup, projectSetupService } from './service.js';
import { createProjectSetupAsk } from './ask.js';
import { createProjectSetupReport } from './report.js';
import { t } from '@studio/i18n';
import { capture, resolveWorkspaceTelemetryProperties } from '../telemetry/index.js';
import { log } from '../log/index.js';

const logger = log('project-setup');

function initialize(): void {
  initializeProjectSetup({
    allowed: (cwd) => registeredProject(cwd) !== undefined,
    changed: (cwd, snapshot) => views.routeTo(cwd, IPC_EMIT.projectSetupChanged, snapshot),
    runCompleted: (cwd, measurement) => capture('project_setup_run_completed', { ...resolveWorkspaceTelemetryProperties(cwd), ...measurement }),
    installationChecked: (cwd, reused) => capture('project_setup_installation_checked', { ...resolveWorkspaceTelemetryProperties(cwd), reused }),
    report: createProjectSetupReport({
      host: serverHost,
      telemetryProperties: resolveWorkspaceTelemetryProperties,
      noteReport: noteSetupReport,
      placeFrame: (cwd, port, signal) => placeFirstFrame((resolve) => applyCanvasOps('system', (doc) => signal.aborted ? { reason: t('projectSetup.failure.canceled') } : resolve(doc), cwd), port),
      failure: (kind, reason) => {
        switch (kind) {
          case 'hostUnavailable': return t('projectSetup.failure.hostUnavailable');
          case 'bookNotReady': return t('projectSetup.failure.bookNotReady');
          case 'frameNotPlaced': return t('projectSetup.failure.frameNotPlaced', { reason: reason ?? '' });
        }
      },
    }),
  });
}

const askProjectSetup = createProjectSetupAsk({
  read: (cwd) => projectSetupService().read(cwd),
  busy: isSessionStreaming,
  detect: async (cwd) => {
    const project = registeredProject(cwd);
    if (project === undefined) return undefined;
    const { detectionContextFor } = await import('../workspace/detect.js');
    const { projectHarness } = await import('../agent-host/project-harness.js');
    try {
      const outcome = await detectionContextFor({
        worktree: project.workspacePath, sourcePath: project.sourcePath,
        repoIdentity: project.repoIdentity, harness: projectHarness(cwd),
      });
      return outcome.context;
    } catch {
      logger.warn('setup request goes without a detection briefing');
      return undefined;
    }
  },
  completed: (cwd, result, kind) => capture('project_setup_agent_requested', { ...resolveWorkspaceTelemetryProperties(cwd), intent: kind ?? 'none', outcome: result.ok ? 'sent' : result.reason }),
  deliver: async (cwd, prompt, context) => {
    const { sendStudioPrompt } = await import('../agent-host/index.js');
    return sendStudioPrompt(cwd, prompt, context);
  },
});

export interface ProjectSetupHandlerDeps {
  workspaceOf(senderId: number): string | undefined;
  registered(cwd: string): boolean;
  read(cwd: string): ProjectSetupSnapshot;
  ask(cwd: string): Promise<ProjectSetupAskResult>;
  noProject(): string;
}

export function createProjectSetupHandlers(deps: ProjectSetupHandlerDeps) {
  const projectFor = (senderId: number): string | undefined => {
    const cwd = deps.workspaceOf(senderId);
    return cwd && deps.registered(cwd) ? cwd : undefined;
  };
  return {
    read(senderId: number): ProjectSetupSnapshot {
      const cwd = projectFor(senderId);
      if (!cwd) throw new Error(deps.noProject());
      return deps.read(cwd);
    },
    ask(senderId: number): Promise<ProjectSetupAskResult> {
      const cwd = projectFor(senderId);
      return cwd ? deps.ask(cwd) : Promise.resolve({ ok: false, reason: 'no-project' });
    },
  };
}

export function registerProjectSetup(): void {
  initialize();
  const noProject = (): string => t('projectSetup.failure.noProject');
  const handlers = createProjectSetupHandlers({
    workspaceOf,
    registered: (cwd) => registeredProject(cwd) !== undefined,
    read: (cwd) => projectSetupService().read(cwd),
    ask: askProjectSetup,
    noProject,
  });
  // The handlers look the sender up again: they also refuse a Project the registry no longer holds.
  handle(IPC_INVOKE.projectSetupRead, (_project, _request, event) => handlers.read(event.sender.id), () => { throw new Error(noProject()); });
  handle(IPC_INVOKE.projectSetupAsk, (_project, _request, event) => handlers.ask(event.sender.id), () => ({ ok: false, reason: 'no-project' }));
}
