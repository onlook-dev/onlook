import type { ProjectSetupService } from '../project-setup/runner.js';

export interface SetupReopenDeps {
  registered(cwd: string): boolean;
  stillOpen(cwd: string): boolean;
  isStarterProject(cwd: string): boolean;
  setup(): Pick<ProjectSetupService, 'read' | 'run'>;
  restartStarter(cwd: string): Promise<void>;
}

export async function restartProjectOnOpen(cwd: string, deps: SetupReopenDeps): Promise<'starter' | 'saved' | 'unknown'> {
  if (!deps.registered(cwd) || !deps.stillOpen(cwd)) return 'unknown';
  const setup = deps.setup();
  if (setup.read(cwd).saved) {
    await setup.run(cwd, { action: 'start' });
    return 'saved';
  }
  if (deps.isStarterProject(cwd)) {
    await deps.restartStarter(cwd);
    return 'starter';
  }
  return 'unknown';
}
