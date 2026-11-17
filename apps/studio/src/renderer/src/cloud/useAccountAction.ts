import { useEffect, useRef, useState } from 'react';
import type { OnlookActionResult, OnlookSignInMethod, OnlookState } from '@studio/events';
import { t, type StringKey } from '@studio/i18n';
import { onlookSessionRevision } from './store.js';
import { studio } from '../bridge.js';

export type SignInMethod = OnlookSignInMethod;
export type AccountAction = SignInMethod | 'sign-out' | 'delete';
export type AccountError = Extract<OnlookActionResult, { ok: false }>['code'];

const ERROR_KEYS: Record<AccountError, StringKey> = {
  denied: 'account.actionDenied',
  team_only: 'account.signInDenied',
  email_verification_required: 'account.signInFailed',
  mfa_enrollment: 'account.signInFailed',
  mfa_challenge: 'account.signInFailed',
  mfa_verification: 'account.signInFailed',
  organization_selection_required: 'account.signInFailed',
  sso_required: 'account.signInFailed',
  radar_email_challenge: 'account.signInFailed',
  radar_sms_challenge: 'account.signInFailed',
  invalid_grant: 'account.signInFailed',
  authentication_denied: 'account.signInFailed',
  access_denied: 'account.actionDenied',
  last_admin: 'account.lastAdmin',
  failed: 'account.actionFailed',
  busy: 'account.actionBusy',
  not_configured: 'account.notConfigured',
  superseded: 'account.actionSuperseded',
};

// The two sentences that name no cause; a code mapped to either names the method instead, when one is known (ONL-2948).
const GENERIC_KEYS = new Set<StringKey>(['account.signInFailed', 'account.actionFailed']);

const METHOD_KEYS: Record<SignInMethod, StringKey> = {
  google: 'account.signInGoogleFailed',
  github: 'account.signInGithubFailed',
  email: 'account.signInEmailFailed',
};

// Callers pass a method only where the person chose one: the account menu signs in with email behind a
// plain "Sign in to Onlook", so naming email there would name a choice they never made (ONL-2948).
export function accountErrorText(error: AccountError, method: SignInMethod | null = null): string {
  const key = ERROR_KEYS[error];
  return t(method !== null && GENERIC_KEYS.has(key) ? METHOD_KEYS[method] : key);
}

function methodOf(action: AccountAction): SignInMethod | null {
  return action === 'sign-out' || action === 'delete' ? null : action;
}

export function useAccountAction(state: OnlookState | null, sessionRevision: number) {
  const [busy, setBusy] = useState<AccountAction | null>(null);
  // One value, so a method can never outlive the error it belongs to.
  const [failure, setFailure] = useState<{ code: AccountError; method: SignInMethod | null } | undefined>();
  const flight = useRef(0);
  const pending = useRef<AccountAction | null>(null);

  useEffect(() => {
    flight.current += 1;
    pending.current = null;
    setBusy(null);
    setFailure(undefined);
    return () => { flight.current += 1; };
  }, [state?.session, sessionRevision]);

  const run = async (action: AccountAction): Promise<void> => {
    const interruptsSignIn = action === 'sign-out' && pending.current !== null && pending.current !== 'sign-out' && pending.current !== 'delete';
    if (pending.current !== null && !interruptsSignIn) return;
    pending.current = action;
    const current = ++flight.current;
    setBusy(action);
    setFailure(undefined);
    try {
      const result = action === 'sign-out' ? await studio().onlookSignOut()
        : action === 'delete' ? await studio().onlookDeleteAccount(state?.sessionEpoch ?? -1)
          : await studio().onlookSignIn(action);
      if (flight.current === current && sessionRevision === onlookSessionRevision() && !result.ok) setFailure({ code: result.code, method: methodOf(action) });
    } catch {
      if (flight.current === current && sessionRevision === onlookSessionRevision()) setFailure({ code: 'failed', method: methodOf(action) });
    } finally {
      if (flight.current === current) {
        pending.current = null;
        setBusy(null);
      }
    }
  };

  return { busy, error: failure?.code, errorMethod: failure?.method ?? null, run, clearError: () => { setFailure(undefined); } };
}
