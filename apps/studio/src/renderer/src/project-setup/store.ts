import { create } from 'zustand';
import { projectSetupAskKind, type ProjectSetupSnapshot, type StudioBridge } from '@studio/events';
import { useServerStore } from '../server/store.js';
import { runFeedback } from '../server/runFeedbackStore.js';
import { sessionCovered, useWorkspaceStore } from '../workspace/store.js';
import { studio } from '../bridge.js';

export type AskState = 'idle' | 'sending' | 'sent' | 'busy' | 'unavailable';

export type SnapshotRead =
  | { kind: 'unloaded' }
  | { kind: 'reading' }
  | { kind: 'ready'; snapshot: ProjectSetupSnapshot }
  | { kind: 'failed' };

interface ProjectSetupStore {
  read: SnapshotRead;
  ask: AskState;
}

export const useProjectSetupStore = create<ProjectSetupStore>()(() => ({
  read: { kind: 'unloaded' },
  ask: 'idle',
}));

export function selectProjectSetupSnapshot(state: ProjectSetupStore): ProjectSetupSnapshot | null {
  return state.read.kind === 'ready' ? state.read.snapshot : null;
}

export function selectProjectSetupReadFailed(state: ProjectSetupStore): boolean {
  return state.read.kind === 'failed';
}

let generation = 0;

/** What the status line is about: a saved script and the failure it left. Either moving retires it. */
function askKey(snapshot: ProjectSetupSnapshot | null): string {
  return JSON.stringify([snapshot?.saved?.revision, snapshot?.failure]);
}

export function resetProjectSetup(): void {
  generation += 1;
  runFeedback.reset();
  useProjectSetupStore.setState({ read: { kind: 'unloaded' }, ask: 'idle' });
}

export async function askProjectSetup(
  bridge: Pick<StudioBridge, 'projectSetupAsk'> = studio(),
): Promise<void> {
  const state = useProjectSetupStore.getState();
  const snapshot = selectProjectSetupSnapshot(state);
  if (snapshot === null || projectSetupAskKind(snapshot) === null || state.ask === 'sending') return;
  const token = generation;
  const asked = askKey(snapshot);
  useProjectSetupStore.setState({ ask: 'sending' });
  try {
    const result = await bridge.projectSetupAsk();
    if (token !== generation || askKey(selectProjectSetupSnapshot(useProjectSetupStore.getState())) !== asked) return;
    // `not-applicable` means main's own snapshot moved on, which the next update shows: saying the agent is unavailable would be false.
    useProjectSetupStore.setState({ ask: result.ok ? 'sent' : result.reason === 'busy' ? 'busy' : result.reason === 'not-applicable' ? 'idle' : 'unavailable' });
  } catch {
    if (token === generation && askKey(selectProjectSetupSnapshot(useProjectSetupStore.getState())) === asked) {
      useProjectSetupStore.setState({ ask: 'unavailable' });
    }
  }
}

export function connectProjectSetup(
  bridge: Pick<StudioBridge, 'projectSetupRead' | 'onProjectSetupChanged'> = studio(),
  portMoved?: (move: NonNullable<ProjectSetupSnapshot['portMoves']>[number]) => void,
): () => void {
  let closed = false;
  let unsubscribe = (): void => undefined;
  const connect = (): void => {
    unsubscribe();
    resetProjectSetup();
    const token = generation;
    if (sessionCovered(useWorkspaceStore.getState())) return;
    useProjectSetupStore.setState({ read: { kind: 'reading' } });
    unsubscribe = bridge.onProjectSetupChanged((snapshot) => {
      if (closed || token !== generation) return;
      runFeedback.observeSetup(snapshot.state);
      const previous = selectProjectSetupSnapshot(useProjectSetupStore.getState());
      const sameAsk = askKey(previous) === askKey(snapshot);
      useProjectSetupStore.setState({ read: { kind: 'ready', snapshot }, ...(sameAsk ? {} : { ask: 'idle' }) });
      if (snapshot.state === 'running' && JSON.stringify(snapshot.portMoves) !== JSON.stringify(previous?.portMoves)) {
        for (const move of snapshot.portMoves ?? []) portMoved?.(move);
      }
      if (snapshot.saved != null && (snapshot.state === 'idle' || snapshot.state === 'failed' || snapshot.state === 'running')) {
        useServerStore.getState().clearStopPressed();
      }
    });
    const settleRead = (read: SnapshotRead): void => {
      if (!closed && token === generation && useProjectSetupStore.getState().read.kind === 'reading') {
        useProjectSetupStore.setState({ read });
      }
    };
    void bridge.projectSetupRead().then(
      (snapshot) => { settleRead({ kind: 'ready', snapshot }); },
      () => { settleRead({ kind: 'failed' }); },
    );
  };
  connect();
  const stopWorkspace = useWorkspaceStore.subscribe((state, previous) => {
    if (state.workspace?.workspacePath !== previous.workspace?.workspacePath
      || state.run !== previous.run || sessionCovered(state) !== sessionCovered(previous)) connect();
  });
  return () => {
    closed = true;
    unsubscribe();
    stopWorkspace();
    resetProjectSetup();
  };
}
