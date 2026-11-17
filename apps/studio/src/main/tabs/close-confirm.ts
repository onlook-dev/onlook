import type { TabStatus } from '@studio/events';

export interface ClosingWork {
  /** Text in a code tab that was never written. Closing discards it and nothing recovers it, which is why it leads the message. */
  hasUnsavedCode?: boolean;
  isWorking: boolean;
  /** `waiting` is an approval the agent is holding — closing drops it. */
  status: TabStatus | undefined;
  /** A worktree cut still running: closing it makes a project the user never made (ONL-2244). */
  isCreating: boolean;
}

/** A prompt waiting in main is not a loss: the close hands it to the composer draft (ONL-2294). */
export type CloseLoss = 'unsaved-code' | 'turn' | 'approval' | 'creation';

export interface CloseConfirmation {
  needsConfirm: boolean;
  losses: CloseLoss[];
}

/** An active session ALWAYS confirms; a quiet tab never does. */
export function closeConfirmation(work: ClosingWork): CloseConfirmation {
  const losses: CloseLoss[] = [];
  // First, so its sentence leads the joined message: it is the only loss here
  // that is the designer's own typing rather than the agent's work.
  if (work.hasUnsavedCode === true) losses.push('unsaved-code');
  if (work.isWorking) losses.push('turn');
  if (work.status === 'waiting') losses.push('approval');
  if (work.isCreating) losses.push('creation');
  return { needsConfirm: losses.length > 0, losses };
}
