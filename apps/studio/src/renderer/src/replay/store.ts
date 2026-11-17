import { REPLAY_PERSISTENCE_NAME, type PersistedReplayIdentity } from './derive.js';

/** The SDK's own store, reached directly because the boot has to settle what it holds before `init` reads it (ONL-2882). */
export interface ReplayStore {
  /** `undefined` when there is nothing there; `'unreadable'` when there is and this cannot read it. */
  read: () => PersistedReplayIdentity | 'unreadable' | undefined;
  /** Overwrites the entry whole, so nothing else an earlier boot stored survives either; `false` when this launch's own identity could not be put where the SDK will read it. */
  replace: (identity: PersistedReplayIdentity) => boolean;
}

const ENTRY = `ph_${REPLAY_PERSISTENCE_NAME}`;

export const replayStore: ReplayStore = {
  read: () => {
    let raw: string | null;
    try {
      raw = window.localStorage.getItem(ENTRY);
    } catch {
      // A store this cannot read is one the SDK may still be able to, through a fallback of its own.
      return 'unreadable';
    }
    if (raw === null) return undefined;
    try {
      const stored = JSON.parse(raw) as Record<string, unknown>;
      const distinctId = stored['distinct_id'];
      if (typeof distinctId === 'string') return { distinctId, identified: stored['$user_state'] === 'identified' };
    } catch {
      // Falls through to `'unreadable'`: replacing it is what recovers, and the SDK reads this entry next.
    }
    return 'unreadable';
  },
  replace: (identity) => {
    try {
      window.localStorage.setItem(ENTRY, JSON.stringify({
        distinct_id: identity.distinctId,
        $device_id: identity.distinctId,
        $user_state: identity.identified ? 'identified' : 'anonymous',
      }));
      return true;
    } catch {
      return false;
    }
  },
};
