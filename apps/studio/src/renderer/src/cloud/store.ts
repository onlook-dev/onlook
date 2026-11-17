import { useSyncExternalStore } from 'react';
import type { OnlookState } from '@studio/events';
import { ignoreRefusal } from '../refusal.js';
import { studio } from '../bridge.js';

interface CloudSnapshot {
  state: OnlookState | null;
  failed: boolean;
  sessionRevision: number;
}

export function createOnlookStore() {
  let snapshot: CloudSnapshot = { state: null, failed: false, sessionRevision: 0 };
  let disconnect: (() => void) | undefined;
  let generation = 0;
  const listeners = new Set<() => void>();
  const notify = (): void => { for (const listener of listeners) listener(); };
  const connect = (): void => {
    const current = ++generation;
    const accept = (state: OnlookState): void => {
      if (current !== generation || (snapshot.state !== null && state.revision <= snapshot.state.revision)) return;
      const changedSession = snapshot.state?.session !== state.session || snapshot.state?.sessionEpoch !== state.sessionEpoch;
      snapshot = { state, failed: false, sessionRevision: snapshot.sessionRevision + Number(changedSession) };
      notify();
    };
    disconnect = studio().onOnlookState(accept);
    void studio().onlookState().then(accept, (error: unknown) => {
      // The gate no longer surfaces a refused read in every build, so the log is the only trace left (ONL-2780).
      ignoreRefusal('cloud', 'read account')(error);
      if (current !== generation || snapshot.state !== null) return;
      snapshot = { ...snapshot, state: null, failed: true };
      notify();
    });
  };
  return {
    getSnapshot: (): CloudSnapshot => snapshot,
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      if (disconnect === undefined) connect();
      return () => {
        listeners.delete(listener);
        if (listeners.size !== 0) return;
        generation += 1;
        disconnect?.();
        disconnect = undefined;
        snapshot = { state: null, failed: false, sessionRevision: 0 };
      };
    },
    retry: (): void => {
      generation += 1;
      disconnect?.();
      snapshot = { ...snapshot, state: null, failed: false };
      notify();
      connect();
    },
  };
}

const store = createOnlookStore();
export const retryOnlookState = store.retry;
export const onlookSessionRevision = (): number => store.getSnapshot().sessionRevision;
export function useOnlookState(): CloudSnapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
