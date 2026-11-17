import { isRegisteredBlankProject, studioStarterEntry, type StarterControl } from '../server/index.js';

export interface StarterRestartDeps {
  starter: Pick<StarterControl, 'portFor' | 'isPresent'> | undefined;
  start(worktreePath: string, port: number): Promise<void>;
  isBlankProject?: (worktreePath: string) => boolean;
}

export type StarterRestartOutcome = 'spawned' | 'already-running' | 'absent';

function previousStarterPort(worktreePath: string): number | undefined {
  return studioStarterEntry(worktreePath)?.ports.at(-1)?.port;
}

export async function restartStarterOnOpen(
  worktreePath: string,
  deps: StarterRestartDeps,
): Promise<StarterRestartOutcome> {
  const { starter, isBlankProject = isRegisteredBlankProject } = deps;
  if (starter === undefined || !isBlankProject(worktreePath)) return 'absent';
  if (starter.portFor(worktreePath) !== undefined) return 'already-running';
  const previous = previousStarterPort(worktreePath);
  if (previous === undefined || !starter.isPresent(worktreePath)) return 'absent';
  await deps.start(worktreePath, previous);
  return 'spawned';
}
