import { AUTH_PROVIDER_ERROR_CODES, SIGN_IN_FAILURE_CODES, type OnlookActionResult, type OnlookSignInMethod, type SignInFailureCode } from '@studio/events';

interface AccountDeps {
  signIn(method: OnlookSignInMethod): Promise<void>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
  supersede(): void;
  clear(): void;
  /** Whether the session this build publishes is signed in: the fact that says a press signed somebody in (ONL-2950). */
  hasSession(): boolean;
  record?(action: 'sign-in' | 'sign-out' | 'delete-account', result: OnlookActionResult, method?: OnlookSignInMethod): void;
  recordFailure?(method: OnlookSignInMethod, code: SignInFailureCode): void;
  recordCompletion?(method: OnlookSignInMethod): void;
}

/** The narrow result the renderer reads; it collapses codes the bounded telemetry code keeps (ONL-2950). */
function resultFor(code: unknown): OnlookActionResult {
  const providerCode = AUTH_PROVIDER_ERROR_CODES.find((known) => known === code);
  if (providerCode !== undefined) return { ok: false, code: providerCode };
  switch (code) {
    case 'denied':
    case 'team_only':
    case 'last_admin':
    case 'not_configured':
    case 'superseded': return { ok: false, code };
    default: return { ok: false, code: 'failed' };
  }
}

function refusal(error: unknown): { result: OnlookActionResult; failure: SignInFailureCode } {
  const message = error instanceof Error ? error.message : undefined;
  const data = typeof error === 'object' && error !== null && 'data' in error ? error.data : null;
  const code = typeof data === 'object' && data !== null && 'code' in data ? data.code : message;
  return { result: resultFor(code), failure: SIGN_IN_FAILURE_CODES.find((known) => known === code) ?? 'failed' };
}

export function createAccountActions(deps: AccountDeps) {
  let active: 'sign-in' | 'account' | null = null;
  let generation = 0;
  /** Failures reported per method, so a press can see whether one was reported for its own method while it was open (ONL-2950). */
  const reports: Record<OnlookSignInMethod, number> = { google: 0, github: 0, email: 0 };
  let lastReport: string | undefined;

  function reportFailure(method: OnlookSignInMethod, code: SignInFailureCode): void {
    const report = `${method}:${code}`;
    // One failure raised twice with no press between is one failure: the provider's door may be called again for the same flow (ONL-2950).
    if (report === lastReport) return;
    lastReport = report;
    reports[method] += 1;
    deps.recordFailure?.(method, code);
  }

  async function endSession(operation: () => Promise<void>, action: 'sign-out' | 'delete-account'): Promise<OnlookActionResult> {
    if (active === 'account') return { ok: false, code: 'busy' };
    active = 'account';
    generation += 1;
    deps.supersede();
    let result: OnlookActionResult;
    try {
      await operation();
      deps.clear();
      result = { ok: true };
    } catch (error) {
      result = refusal(error).result;
    } finally {
      active = null;
    }
    deps.record?.(action, result);
    return result;
  }

  return {
    /** Reported as an event of its own and attributed to no press: the door names a method and a code, never an attempt, so which press it belongs to is not knowable here (ONL-2950). */
    noteSignInFailure(method: OnlookSignInMethod, code: SignInFailureCode): void {
      // `superseded` is the user choosing another method and `teardown` is quitting: neither is a failure they experienced (ONL-2950).
      if (code === 'superseded' || code === 'teardown') return;
      reportFailure(method, code);
    },

    async signIn(method: OnlookSignInMethod): Promise<OnlookActionResult> {
      if (active === 'account') {
        // Past the collapse on purpose: two presses refused while an account action runs are two refusals the user made.
        deps.recordFailure?.(method, 'busy');
        return { ok: false, code: 'busy' };
      }
      const replacing = active === 'sign-in';
      active = 'sign-in';
      const ownGeneration = ++generation;
      const reportsBefore = reports[method];
      // A press of its own: the provider may raise for it what it already raised for the last one.
      lastReport = undefined;
      if (replacing) deps.supersede();
      let result: OnlookActionResult;
      let failure: SignInFailureCode | undefined;
      try {
        await deps.signIn(method);
        result = ownGeneration === generation ? { ok: true } : { ok: false, code: 'superseded' };
      } catch (error) {
        if (ownGeneration === generation) ({ result, failure } = refusal(error));
        else result = { ok: false, code: 'superseded' };
      } finally {
        if (ownGeneration === generation) active = null;
      }
      // A completion is a session, not a resolved promise: a provider that absorbed its own failure can resolve the press anyway (ONL-2950).
      if (result.ok && !deps.hasSession()) {
        result = { ok: false, code: 'failed' };
        // Only when nothing was reported for this method while the press was open; otherwise the cause is already reported, with its code (ONL-2950).
        if (reports[method] === reportsBefore) failure = 'failed';
      }
      deps.record?.('sign-in', result, method);
      if (result.ok) deps.recordCompletion?.(method);
      if (failure !== undefined && failure !== 'superseded' && failure !== 'teardown') reportFailure(method, failure);
      return result;
    },
    signOut: () => endSession(deps.signOut, 'sign-out'),
    deleteAccount: () => endSession(deps.deleteAccount, 'delete-account'),
  };
}
