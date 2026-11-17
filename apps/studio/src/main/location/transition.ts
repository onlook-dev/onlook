import type { StudioLocation } from '@studio/events';

export interface LocationTransitionDeps {
  setLocation(location: StudioLocation): void;
  stopStarterExcept(): void;
  openCanvas(worktreePath: string): Promise<void>;
  deactivateCanvas(): void;
  deactivateServerBook(): void;
  reverifyServerBook(worktreePath: string): void;
  projectOpened(worktreePath: string): void;
  restartStarter(worktreePath: string): void;
}

export const projectPath = (location: StudioLocation): string | undefined =>
  location.kind === 'project' && typeof location.workspacePath === 'string'
    ? location.workspacePath
    : undefined;

// No canvas close on this seam: the projects list deactivates, and a teardown here strands the project's live agent (ONL-2222).
export async function applyLocationTransition(
  location: StudioLocation,
  deps: LocationTransitionDeps,
): Promise<void> {
  deps.setLocation(location);
  const workspacePath = projectPath(location);
  deps.stopStarterExcept();

  if (workspacePath !== undefined) {
    await deps.openCanvas(workspacePath);
    deps.reverifyServerBook(workspacePath);
    deps.projectOpened(workspacePath);
    // After the re-verify: a changed port must pair with a claim already measured dead (ONL-2152).
    deps.restartStarter(workspacePath);
    return;
  }
  if (location.kind === 'projects') {
    deps.deactivateCanvas();
    deps.deactivateServerBook();
  }
  // A project record with no workspacePath touches no host: guessing could unload what is on screen.
}
