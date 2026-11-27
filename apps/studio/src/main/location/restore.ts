import { isRecord } from '@studio/events';

export interface LocationRestoreDeps {
  knownProject(path: string): boolean;
  register(path: string): void;
  openCanvas(path: string): Promise<void>;
}

export async function prepareRestoredLocation(
  location: unknown,
  deps: LocationRestoreDeps,
): Promise<void> {
  if (!isRecord(location) ||
    !('kind' in location) || location.kind !== 'project' ||
    !('repoIdentity' in location) || typeof location.repoIdentity !== 'string' ||
    !('workspacePath' in location) || typeof location.workspacePath !== 'string' ||
    location.workspacePath.trim().length === 0) return;

  const workspacePath = location.workspacePath;
  if (!deps.knownProject(workspacePath)) return;

  deps.register(workspacePath);
  await deps.openCanvas(workspacePath);
}
