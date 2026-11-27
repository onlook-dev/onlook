import { app, dialog, shell } from 'electron';
import { handle } from '../ipc/bridge.js';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { IPC_INVOKE, verifiedSubject, type GithubImportCommand } from '@studio/events';
import { githubBackend } from '../cloud/index.js';
import { readIdentity } from '../identity/store.js';
import { flagOn } from '../flags/index.js';
import { stateRoot } from '../state/root.js';
import { listWorkspaces } from '../workspace/store.js';
import { repoIdentityFromRemoteUrl } from '../workspace/naming.js';
import { captureGithub as capture, type GithubObservation } from './capture.js';
import { createGithubImport, type GithubImportDeps } from './service.js';
import { beginCreation, creationAbandoned, creationStarted } from './telemetry.js';
import { cleanupPendingClones } from './pending.js';
import { proofSwitchOn } from '../diagnostics/gate.js';
import { cloneRepository } from './clone.js';
import { gitStatusHost } from '../git-status/index.js';
import { log } from '../log/index.js';
import type { GithubBackend } from './backend.js';
import { createGithubConnectionWatch } from './connection-watch.js';

let fixture: Partial<GithubImportDeps> | undefined;

export function githubImportBackend(): GithubBackend | undefined {
  return fixture?.backend === undefined ? githubBackend() : fixture.backend();
}

function validGithubCommand(value: unknown): value is GithubImportCommand {
  if (value === null || typeof value !== 'object' || !('kind' in value)) return false;
  const command = value as Record<string, unknown>;
  const entry = (): boolean => ['onboarding', 'projects', 'settings', 'topbar'].includes(command['entryPoint'] as string);
  switch (command['kind']) {
    case 'status': case 'repositories': case 'cancel': case 'access': case 'list': return true;
    case 'start': case 'begin': return entry();
    case 'select': case 'open': case 'branches': return Number.isSafeInteger(command['repositoryId']);
    case 'destination': return ['onlook', 'documents', 'choose'].includes(command['destination'] as string);
    case 'clone': return entry() && Number.isSafeInteger(command['repositoryId']) && typeof command['branch'] === 'string' && command['branch'].length < 1024;
    case 'leave': return ['folder', 'retry', 'dismiss', 'waiting'].includes(command['next'] as string);
    default: return false;
  }
}

export function registerGithubImportHandlers(): void {
  const cleaned = flagOn('github-import') ? cleanupPendingClones() : Promise.resolve();
  const services = new Map<number, ReturnType<typeof createGithubImport>>();
  const connectionChanged = createGithubConnectionWatch();
  if (proofSwitchOn('STUDIO_GITHUB_PROOF')) {
    const observations: GithubObservation[] = [];
    const hook = {
      install(deps: Partial<GithubImportDeps>): void {
        for (const service of services.values()) service.dispose();
        services.clear();
        fixture = deps;
      },
      clone: cloneRepository,
      refreshStatus: () => gitStatusHost()?.connectionChanged() ?? Promise.resolve(),
      observe(event: GithubObservation): void { observations.push(event); },
      events: () => [...observations],
    };
    (globalThis as { __studioGithubProof?: typeof hook }).__studioGithubProof = hook;
  }
  handle(IPC_INVOKE.githubImport, async (event, command: unknown) => {
    if (!validGithubCommand(command)) throw new Error('Invalid GitHub import request');
    await cleaned;
    let service = services.get(event.sender.id);
    if (service === undefined) {
      service = createGithubImport({
        enabled: () => flagOn('github-import'),
        backend: githubImportBackend,
        subject: () => verifiedSubject(readIdentity()),
        open: (url) => shell.openExternal(url),
        parent: async (choice) => {
          if (choice === 'onlook') return join(stateRoot(), 'github-sources');
          /* @parked ONL-3182 — only `onlook` is reachable while the Save-to chooser is out of the picker. */
          if (choice === 'documents') return app.getPath('documents');
          const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
          return result.canceled ? undefined : result.filePaths[0];
        },
        existing: (repo) => listWorkspaces().find((workspace) => workspace.repoIdentity === repoIdentityFromRemoteUrl(`https://github.com/${repo.fullName}.git`))
          ?.projects.find((project) => !project.missing && existsSync(project.workspacePath))?.workspacePath,
        connectEvent: (outcome, next_action, entry_point) => capture('github_connect_finished', { outcome, next_action, entry_point }),
        cloneEvent: (outcome, entry_point) => capture('github_clone', { outcome, entry_point }),
        creationEvent: (step) => { if (step === 'started') creationStarted('github'); else creationAbandoned('github'); },
        cloned: (path) => beginCreation(path, 'github', false),
        ...fixture,
      });
      services.set(event.sender.id, service);
      event.sender.once('destroyed', () => { service?.dispose(); services.delete(event.sender.id); });
    }
    const state = await service.command(command);
    const backend = githubImportBackend();
    if ((command.kind === 'status' || command.kind === 'start') && backend?.identity !== undefined) {
      const subject = verifiedSubject(readIdentity());
      const identity = state.connection.status === 'connected' ? await backend.identity().catch(() => undefined) : undefined;
      if (subject === verifiedSubject(readIdentity()) && connectionChanged(subject, state.connection, identity)) {
        void gitStatusHost()?.connectionChanged().catch((error: unknown) => log('git-status').error('connection refresh failed', { error }));
      }
    }
    return state;
  });
}
