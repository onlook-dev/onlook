import { proofSwitchOn } from '../diagnostics/gate.js';
import { writeIdentity } from '../identity/store.js';
import { statePublisher, type CloudIdentity, type OnlookClient } from './client.js';
import { createOnlookClient } from './local-client.js';
import { devSwitches } from '../env/dev-switches.js';

export function launchSessionProofProvider() {
  if (!proofSwitchOn('STUDIO_LAUNCH_SESSION_PROOF')) return undefined;
  const outcome = devSwitches.launchSessionProofOutcome;
  if (outcome !== 'ended' && outcome !== 'unavailable') throw new Error('Unknown launch session proof outcome');
  let session = true;
  const listeners = new Set<() => void>();
  const publisher = statePublisher({ revision: 0, session: 'signed-out', connection: 'offline', me: null, profile: null });
  const identity: CloudIdentity = {
    enabled: () => true, configured: () => true,
    prepareSession() { writeIdentity({ email: 'designer@onlook.test', source: 'manual' }); return {}; },
    hasSession: () => session,
    signIn: async () => { throw new Error('not_configured'); },
    supersedeSignIn() {},
    clearSession() { session = false; for (const listener of listeners) listener(); },
    refreshSession: async () => {}, dispose() { listeners.clear(); },
    signInStep: () => null, onSignInProgress: () => () => {},
    onSessionChanged(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async checkLaunchSession(signal) {
      while (!signal.aborted && devSwitches.launchSessionProofReady !== '1') {
        await new Promise<void>((resolve) => { setTimeout(resolve, 50); });
      }
      if (signal.aborted || outcome === 'unavailable') return { status: 'unavailable' };
      return { status: 'ended', reason: 'expired' };
    },
  };
  const client: OnlookClient = {
    ...createOnlookClient(),
    snapshot: publisher.snapshot, subscribe: publisher.subscribe,
    setSession(present) { publisher.publish({ session: present ? 'signed-in' : 'signed-out' }); },
    setProfile(profile) { publisher.publish({ profile }); },
  };
  return { identity, createOnlookClient: () => client };
}
