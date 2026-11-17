import type { OnlookMe, OnlookState } from '@studio/events';

/** Identity as a provider hands it over: a provider built before the neutral names still sends the vendor's, read only here and in `store.ts`. */
export interface ProviderIdentity {
  email: string;
  name?: string;
  source: 'provider' | 'manual' | 'workos';
  subject?: string;
  previousSubject?: string;
  workosUserId?: string;
  workosExternalId?: string;
  pictureUrl?: string;
}

export interface ProviderMe {
  user: { id: string; email: string; createdAt: number; subject?: string; workosUserId?: string } | null;
  orgId: string | null;
  role: string | null;
}

export type ProviderState = Omit<OnlookState, 'me'> & { me: ProviderMe | null };

const neutralStates = new WeakMap<ProviderState, OnlookState>();
const neutralMes = new WeakMap<ProviderMe, OnlookMe>();

function neutralMe(me: ProviderMe): OnlookMe {
  const user = me.user;
  if (user === null || user.subject !== undefined || user.workosUserId === undefined) return me as OnlookMe;
  let neutral = neutralMes.get(me);
  if (neutral === undefined) {
    const { workosUserId, ...rest } = user;
    neutral = { ...me, user: { ...rest, subject: workosUserId } };
    neutralMes.set(me, neutral);
  }
  return neutral;
}

/** The same answer for the same provider state: main tells a change by reference, as the provider's own publisher does. */
export function neutralState(state: ProviderState): OnlookState {
  if (state.me === null) return state as OnlookState;
  const me = neutralMe(state.me);
  if (me === state.me) return state as OnlookState;
  let neutral = neutralStates.get(state);
  if (neutral === undefined) {
    neutral = { ...state, me };
    neutralStates.set(state, neutral);
  }
  return neutral;
}
