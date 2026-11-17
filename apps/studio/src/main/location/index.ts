import { handle } from '../ipc/bridge.js';
import { IPC_INVOKE, type LaunchLocation, type StudioLocation } from '@studio/events';
import { deactivateCanvas, openCanvasForProject } from '../canvas/index.js';
import {
  deactivateServerBook,
  openServerBookForProject,
  serverHost,
  isRegisteredBlankProject,
  studioStarterEntry,
  stopStarterExcept,
} from '../server/index.js';
import { starterHost } from '../starter/index.js';
import { registerView, unregisterView, openWorkspaces, hasOpenProjectView } from '../tabs/views.js';
import { noteTabWorkspace } from '../tabs/signals.js';
import { noteProjectOpen } from '../workspace/setup-signals.js';
import { knownProject, registeredProject } from '../workspace/store.js';
import { restartStarterOnOpen } from './starter-restart.js';
import { restartProjectOnOpen } from './setup-reopen.js';
import { projectSetupService } from '../project-setup/service.js';
import { createKeyedQueue } from '../lib/keyed-queue.js';
import { applyLocationTransition, projectPath } from './transition.js';
import { launchLocation, setLocation } from './state.js';
import { log } from '../log/index.js';

const logger = log('location');

function reverifyServerBookQuietly(workspacePath: string): void {
  openServerBookForProject(workspacePath).catch((err: unknown) => {
    logger.error('server re-verify failed on open', { error: err });
  });
}

function restartProjectQuietly(workspacePath: string): void {
  restartProjectOnOpen(workspacePath, {
    registered: (cwd) => registeredProject(cwd) !== undefined,
    stillOpen: hasOpenProjectView,
    isStarterProject: (cwd) => isRegisteredBlankProject(cwd) && studioStarterEntry(cwd) !== undefined,
    setup: projectSetupService,
    restartStarter: async (cwd) => {
      await restartStarterOnOpen(cwd, {
        starter: starterHost(),
        start: async (worktree, port) => {
          await serverHost()?.startStarter(worktree, port);
        },
      });
    },
  }).catch((err: unknown) => {
    logger.error('project reopen start failed', { error: err });
  });
}

export function registerLocationHandlers(): void {
  // Per sender (ONL-2265): a back-out's projects transition runs after the abandoned one's tail.
  const inOrder = createKeyedQueue<number>();
  handle(IPC_INVOKE.locationState, (): LaunchLocation => launchLocation());
  handle(IPC_INVOKE.locationSet, (event, location: StudioLocation) => {
    if (!location || (location.kind !== 'projects' && location.kind !== 'project')) return;
    if (location.kind === 'project' && (typeof location.repoIdentity !== 'string' ||
      (location.workspacePath !== undefined && (typeof location.workspacePath !== 'string' || !knownProject(location.workspacePath))))) return;
    // Registry updates stay outside the queue: stopStarterExcept reads them inside it.
    const workspacePath = projectPath(location);
    if (workspacePath === undefined) unregisterView(event.sender);
    else registerView(event.sender, workspacePath);
    noteTabWorkspace(event.sender.id, workspacePath);
    return inOrder.run(event.sender.id, () =>
      applyLocationTransition(location, {
        setLocation,
        stopStarterExcept: () => stopStarterExcept(openWorkspaces()),
        openCanvas: openCanvasForProject,
        deactivateCanvas,
        deactivateServerBook,
        reverifyServerBook: reverifyServerBookQuietly,
        projectOpened: noteProjectOpen,
        restartStarter: restartProjectQuietly,
      }),
    );
  });
}
