import { useEffect, useState } from 'react';
import type { OnlookState } from '@studio/events';
import { ignoreRefusal } from '../refusal.js';
import { studio } from '../bridge.js';

export function useOnlookState(): OnlookState | null {
  const [state, setState] = useState<OnlookState | null>(null);
  useEffect(() => {
    let active = true;
    const accept = (next: OnlookState): void => {
      if (active) setState((previous) => previous === null || next.revision > previous.revision ? next : previous);
    };
    const stop = studio().onOnlookState(accept);
    void studio().onlookState().then(accept).catch(ignoreRefusal('cloud', 'read account'));
    return () => { active = false; stop(); };
  }, []);
  return state;
}
