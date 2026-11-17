import { create } from 'zustand';
import type { WorkspaceCreated } from '@studio/events';
import { studio } from '../bridge.js';

/** One value for where this tab's project is. `opening` covers the editor only when `covered`: a create narrates its setup in the chat, so it opens uncovered (ONL-2593). */
export type SessionPhase =
  | { kind: 'none' }
  | { kind: 'opening'; covered: boolean; workspacePath?: string }
  | { kind: 'open'; workspacePath: string }
  | { kind: 'closing' };

interface WorkspaceState {
  /** Not restored from a previous run; that is a product decision, not a store's. */
  workspace: WorkspaceCreated | null;
  setWorkspace: (workspace: WorkspaceCreated) => void;
  /** Written by `session.ts` alone. */
  session: SessionPhase;
  /** The run an async result must still belong to; `session.ts` moves it. */
  run: number;
}

/** Started blank, or held as blank while a switch lands (ONL-2744). */
export function isBlankWorkspace(workspace: WorkspaceCreated | null): boolean {
  return workspace !== null && (workspace.origin === 'blank' || workspace.heldOrigin === 'blank');
}

export const useWorkspaceStore = create<WorkspaceState>()((set) => ({
  workspace: null,
  setWorkspace: (workspace) => {
    set({ workspace });
  },
  session: { kind: 'none' },
  run: 0,
}));

/** Read at the event, not closed over, or a tab switch stamps the outgoing project; main hashes the path or drops it. */
export function telemetryProjectFields(): { worktreePath?: string } {
  const worktreePath = useWorkspaceStore.getState().workspace?.workspacePath;
  return worktreePath === undefined ? {} : { worktreePath };
}

export function canvasImageProjectRoot(): string | undefined {
  return useWorkspaceStore.getState().workspace?.workspacePath;
}

/** The one answer to whether the editor is covered while a project lands: presentation only, and every outcome of a landing lowers it (ONL-2139). */
export function sessionCovered(state: Pick<WorkspaceState, 'session'>): boolean {
  return state.session.kind === 'opening' && state.session.covered;
}

/** Applied unconditionally: main routes `workspace:created` to the asking view (ONL-2252), and a fresh tab has nothing to filter against. */
export function subscribeToWorkspaceCreated(): () => void {
  return studio().onWorkspaceCreated((workspace) => {
    useWorkspaceStore.getState().setWorkspace(workspace);
  });
}
