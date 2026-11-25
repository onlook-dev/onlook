import { create } from 'zustand';
import type { BlankCreateStage, BlankEntryPoint, WorkspaceCreated } from '@studio/events';
import { studio } from '../bridge.js';

export type { BlankCreateStage, BlankEntryPoint };

export type BlankCreateStatus =
  | { kind: 'idle' }
  | { kind: 'creating'; stage: BlankCreateStage }
  | { kind: 'canceling'; stage: BlankCreateStage }
  | { kind: 'failed'; stage: BlankCreateStage; detail?: string; explanation?: string; cause?: 'git_not_found' };

interface BlankCreateStore {
  status: BlankCreateStatus;
  set: (status: BlankCreateStatus) => void;
}

export const useBlankCreateStore = create<BlankCreateStore>()((set) => ({
  status: { kind: 'idle' },
  set: (status) => {
    set({ status });
  },
}));

export type BlankLanding = (workspace: WorkspaceCreated) => void;

let inFlight: { entryPoint: BlankEntryPoint; land: BlankLanding; openInNewTab: boolean } | null = null;

export function startBlankCreate(entryPoint: BlankEntryPoint, land: BlankLanding, openInNewTab = false): void {
  const store = useBlankCreateStore.getState();
  if (store.status.kind === 'creating' || store.status.kind === 'canceling') return;
  inFlight = { entryPoint, land, openInNewTab };
  const { set } = store;
  set({ kind: 'creating', stage: 'setting-up' });

  // Subscribed for the invoke's lifetime: a push, not a read at mount.
  const unsubscribe = studio().onBlankCreateStage((stage) => {
    const current = useBlankCreateStore.getState().status;
    // A stage arriving after the cancel went out must not un-cancel the modal.
    if (current.kind !== 'creating') return;
    set({ kind: 'creating', stage });
  });

  void studio()
    .workspaceCreateBlank({ entryPoint, ...(openInNewTab ? { openInNewTab: true } : {}) })
    .then((result) => {
      if (result.ok) {
        set({ kind: 'idle' });
        if (!openInNewTab) land(result.workspace);
        return;
      }
      // The invoke resolving is the teardown confirmation: main resolves `canceled` only after its rollback, and emits no terminal stage.
      if (result.canceled) {
        set({ kind: 'idle' });
        return;
      }
      set({
        kind: 'failed',
        stage: result.stage,
        ...(result.detail === undefined ? {} : { detail: result.detail }),
        ...(result.explanation === undefined ? {} : { explanation: result.explanation }),
        ...(result.cause === undefined ? {} : { cause: result.cause }),
      });
    })
    .catch((error: unknown) => {
      const current = useBlankCreateStore.getState().status;
      const stage = current.kind === 'idle' ? 'setting-up' : current.stage;
      set({
        kind: 'failed',
        stage,
        detail: error instanceof Error ? error.message : String(error),
      });
    })
    .finally(unsubscribe);
}

/** @parked ONL-2152 — the cancel affordance left with the progress dialog (2026-08-26); main still honours the send. */
export function cancelBlankCreate(): void {
  const store = useBlankCreateStore.getState();
  if (store.status.kind !== 'creating') return;
  store.set({ kind: 'canceling', stage: store.status.stage });
  studio().blankCreateCancel();
}

export function retryBlankCreate(): void {
  const store = useBlankCreateStore.getState();
  if (store.status.kind !== 'failed' || store.status.cause === 'git_not_found' || inFlight === null) return;
  store.set({ kind: 'idle' });
  startBlankCreate(inFlight.entryPoint, inFlight.land, inFlight.openInNewTab);
}

export function dismissBlankCreate(): void {
  const store = useBlankCreateStore.getState();
  if (store.status.kind !== 'failed') return;
  store.set({ kind: 'idle' });
}
