import { appSweepDeps, sweepWorktree } from '../server/sweep.js';
import { workspaceRoot } from '../workspace/store.js';
import { noteTabClosed } from './closed.js';
import { logger } from './log.js';

/** The sweep is the backstop: a session kill takes the harness's own background tasks, never a server left running beside them (ONL-2556). Not awaited: the close is done and this cannot fail it. */
export function retireWorktree(worktree: string): void {
  noteTabClosed(worktree);
  void sweepWorktree(worktree, workspaceRoot(), appSweepDeps()).catch((error: unknown) =>
    logger.warn('sweeping a closed workspace failed', { error }),
  );
}
