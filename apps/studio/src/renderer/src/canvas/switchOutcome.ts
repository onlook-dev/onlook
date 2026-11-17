import type { ProjectCreateState, WorkspaceCreated } from '@studio/events';
import { landedWorkspace } from '../activation/advance.js';

export type SwitchOutcome = 'restore' | 'drop' | 'wait' | 'none';

export function switchOutcome(
  outgoing: WorkspaceCreated | null,
  state: ProjectCreateState | null,
): SwitchOutcome {
  if (outgoing === null || state === null) return 'none';
  if (state.kind === 'planning' || state.kind === 'copying') return 'wait';
  if (state.kind === 'canceled') return 'drop';
  return landedWorkspace(state) === undefined ? 'restore' : 'drop';
}
