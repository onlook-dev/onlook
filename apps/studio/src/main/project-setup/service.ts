import { createProjectSetupService, type ProjectSetupDeps, type ProjectSetupService } from './runner.js';
import { setupState } from './state.js';
import { t } from '@studio/i18n';

let service: ProjectSetupService | undefined;

export function initializeProjectSetup(deps: ProjectSetupDeps): void {
  if (service) throw new Error(t('projectSetup.failure.alreadyInitialized'));
  service = createProjectSetupService(deps);
}

export function projectSetupService(): ProjectSetupService {
  if (!service) throw new Error(t('projectSetup.failure.notInitialized'));
  return service;
}

/** Tests only: the singleton has no way back, so a second file initializing it in one process throws (ONL-2499). */
export function resetProjectSetupForTesting(): void { service = undefined; }

export async function disposeProjectSetup(): Promise<void> { await service?.dispose(); }
export function beginProjectSetupQuit(): void { service?.disposeNow(); }
export async function forgetProjectSetup(cwd: string): Promise<void> {
  if (service) await service.forget(cwd);
  else setupState.forget(cwd);
}
