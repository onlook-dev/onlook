import type { ProjectCreateState, WorkspaceCreated } from '@studio/events';

export type Screen =
  | { kind: 'pending' }
  | { kind: 'parked' }
  | { kind: 'onboarding' }
  | {
      kind: 'editor';
      restored?: WorkspaceCreated;
      creating?: ProjectCreateState;
    }
  | { kind: 'projects'; selectedWorkspaceId?: string };

export function landedWorkspace(state: ProjectCreateState): WorkspaceCreated | undefined {
  switch (state.kind) {
    case 'ready':
    case 'installing':
    case 'starting':
    case 'live':
      return state.workspace;
    case 'failed':
      return state.workspace;
    default:
      return undefined;
  }
}

// Both routes the state arrives by, read at mount and pushed, land through this one function (ONL-2244).
export function screenForCreate(state: ProjectCreateState): Screen | null {
  if (state.kind === 'canceled') return null;
  const landed = landedWorkspace(state);
  if (landed !== undefined) return { kind: 'editor', restored: landed };
  return { kind: 'editor', creating: state };
}

export function commitFirstScreen(current: Screen, next: Screen): Screen {
  if (current.kind === 'pending') return next;
  if (current.kind !== 'parked') return current;
  /* A spare's renderer runs this while still held, and only `parked` can be moved by an assignment or create push, so a gate or the launch list committed here poisons it (ONL-2318). */
  return next.kind === 'editor' ? next : current;
}

export function applyCreateScreen(current: Screen, next: Screen): Screen {
  // `parked` takes the push too: a promoted spare's cut is what tells it what it is, and dropping it strands the tab on its scaffold (ONL-2318).
  if (current.kind !== 'projects' && current.kind !== 'editor' && current.kind !== 'parked') return current;
  if (
    current.kind === 'editor' &&
    next.kind === 'editor' &&
    next.restored !== undefined &&
    current.restored?.workspacePath === next.restored.workspacePath
  ) {
    return current;
  }
  return next;
}
