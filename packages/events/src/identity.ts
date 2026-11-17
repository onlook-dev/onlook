export interface StudioIdentity {
  email: string;
  name?: string;
  /** Provenance only; a `manual` record is self-asserted and gates nothing. */
  source: 'provider' | 'manual';
  /** The provider's own id for the account. Absent on `provider` records older than the field. */
  subject?: string;
  /** Set only for seed-created users; read by the one-time person merge alone. */
  previousSubject?: string;
  /** Written at sign-in only; nothing refreshes it (ONL-2701). */
  pictureUrl?: string;
}

/** The trust gate main's telemetry and the renderer's replay mirror share. */
export function verifiedSubject(identity: StudioIdentity | null): string | undefined {
  return identity?.source === 'provider' ? identity.subject : undefined;
}

export interface AuthState {
  identity: StudioIdentity | null;
}

/** The whole of what an `onlook:sign-in` refusal carries; no token, authorization code or callback URL crosses with them. */
export const AUTH_PROVIDER_ERROR_CODES = [
  'email_verification_required',
  'organization_selection_required',
  'mfa_enrollment',
  'mfa_challenge',
  'mfa_verification',
  'radar_email_challenge',
  'radar_sms_challenge',
  'sso_required',
  'invalid_grant',
  'access_denied',
  'authentication_denied',
] as const;

export type AuthProviderErrorCode = (typeof AUTH_PROVIDER_ERROR_CODES)[number];
export type AuthSignInStep = 'email-verification' | 'browser';

export const AUTH_SIGN_IN_ERROR_CODES = [
  ...AUTH_PROVIDER_ERROR_CODES,
  'not_configured',
  'superseded',
  'timeout',
  'denied',
  'team_only',
  'exchange_failed',
  'persist_failed',
  'listener_failed',
  'teardown',
] as const;

export type AuthSignInErrorCode = (typeof AUTH_SIGN_IN_ERROR_CODES)[number];

/** The whole vocabulary `sign_in_failed.code` may carry, checked where it enters telemetry (ONL-2950). */
export const SIGN_IN_FAILURE_CODES = [
  ...AUTH_SIGN_IN_ERROR_CODES,
  'busy',
  'failed',
] as const;

export type SignInFailureCode = (typeof SIGN_IN_FAILURE_CODES)[number];
