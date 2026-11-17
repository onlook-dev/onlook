import type { AuthSignInStep, OnlookSignInMethod } from '@studio/events';
import type { ProviderIdentity, ProviderMe } from '../identity/provider-shape.js';
import { statePublisher, type CloudIdentity, type LaunchSessionResult, type OnlookClient, type OnlookClientOptions, type ProviderCapabilities, type SessionChange } from './client.js';

type FakeCall = 'prepareSession' | 'hasSession' | 'signIn' | 'supersedeSignIn' | 'clearSession' | 'refreshSession' | 'checkLaunchSession'
  | 'dispose' | 'createOnlookClient' | 'start' | 'client.signIn' | 'signOut' | 'deleteAccount' | 'close';

interface FakeProviderOptions {
  session?: boolean;
  /** Present only when given, as the contract's optional check is. */
  checkLaunchSession?(signal: AbortSignal): Promise<LaunchSessionResult>;
}

/** A provider for suites: the contract in `client.ts` over memory, with every answer settable and every call recorded. */
export function createFakeProvider(initial: FakeProviderOptions = {}) {
  const calls: FakeCall[] = [];
  const sessionListeners = new Set<(change?: SessionChange) => void>();
  const progressListeners = new Set<() => void>();
  const publisher = statePublisher({ revision: 0, session: 'signed-out', connection: 'idle', me: null, profile: null });
  let session = initial.session ?? false;
  let step: AuthSignInStep | null = null;

  const fake = {
    calls,
    publisher,
    /** What `prepareSession` answers; `null` is a launch the provider will not open a session for. */
    prepared: { url: 'http://127.0.0.1:1' } as { url?: string } | null,
    /** What a sign-in hands back; an `Error` rejects it, and `null` resolves it with nobody signed in. */
    signInResult: null as ProviderIdentity | Error | null,
    failures: {} as Partial<Record<'signOut' | 'deleteAccount' | 'refreshSession', Error>>,
    options: undefined as OnlookClientOptions | undefined,
    setSession(present: boolean, change?: SessionChange): void {
      session = present;
      for (const listener of sessionListeners) listener(change);
    },
    setSignInStep(next: AuthSignInStep | null): void {
      step = next;
      for (const listener of progressListeners) listener();
    },
    /** The server's answer naming the session's account; `null` is a connection that names nobody. */
    nameAccount(subject: string | null, email = `${subject}@example.com`): void {
      const me: ProviderMe | null = subject === null ? null : { user: { id: `row_${subject}`, subject, email, createdAt: 0 }, orgId: null, role: null };
      publisher.publish({ me, connection: me === null ? 'offline' : 'connected' });
    },
  };

  const identity: CloudIdentity = {
    enabled: () => true,
    configured: () => true,
    prepareSession() { calls.push('prepareSession'); return fake.prepared; },
    hasSession() { calls.push('hasSession'); return session; },
    async signIn() {
      calls.push('signIn');
      if (fake.signInResult instanceof Error) throw fake.signInResult;
      if (fake.signInResult === null) throw new Error('not_configured');
      fake.setSession(true);
      return fake.signInResult;
    },
    supersedeSignIn() { calls.push('supersedeSignIn'); },
    clearSession() { calls.push('clearSession'); fake.setSession(false); },
    async refreshSession() {
      calls.push('refreshSession');
      if (fake.failures.refreshSession !== undefined) throw fake.failures.refreshSession;
      fake.setSession(session);
    },
    dispose() { calls.push('dispose'); sessionListeners.clear(); progressListeners.clear(); },
    signInStep: () => step,
    onSignInProgress(listener) { progressListeners.add(listener); return () => { progressListeners.delete(listener); }; },
    onSessionChanged(listener) { sessionListeners.add(listener); return () => { sessionListeners.delete(listener); }; },
  };
  const check = initial.checkLaunchSession;
  if (check !== undefined) identity.checkLaunchSession = (signal) => { calls.push('checkLaunchSession'); return check(signal); };

  async function endSession(action: 'signOut' | 'deleteAccount'): Promise<void> {
    calls.push(action);
    const failure = fake.failures[action];
    if (failure !== undefined) throw failure;
  }

  function createOnlookClient(options: OnlookClientOptions): OnlookClient {
    calls.push('createOnlookClient');
    fake.options = options;
    return {
      start() { calls.push('start'); },
      setSession(signedIn) { publisher.publish({ session: signedIn ? 'signed-in' : 'signed-out' }); },
      setProfile(profile) { publisher.publish({ profile }); },
      snapshot: publisher.snapshot,
      subscribe: publisher.subscribe,
      async signIn(method: OnlookSignInMethod) {
        calls.push('client.signIn');
        // An absorbed failure resolves the press, as the contract lets a provider do.
        if (fake.signInResult === null) return;
        options.onIdentity?.(await identity.signIn(method));
      },
      signOut: () => endSession('signOut'),
      deleteAccount: () => endSession('deleteAccount'),
      teamCommand: async () => ({ ok: false, error: 'unavailable' }),
      async close() { calls.push('close'); },
    };
  }

  const capabilities: ProviderCapabilities = { account: true };
  return Object.assign(fake, { module: { identity, createOnlookClient, capabilities, flag: undefined } });
}

// The file is also a provider entry: a build handed its path fills the slot with one standing fake.
export const { identity, createOnlookClient, capabilities, flag } = createFakeProvider().module;
