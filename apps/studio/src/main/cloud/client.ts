import type { AuthSignInStep, OnlookProfile, OnlookSignInMethod, SignInFailureCode, StudioCapabilities, TeamCommand, TeamResult, ReportProviderRequest, ReportFiled, SurveyAnswer } from '@studio/events';
import type { ProviderIdentity, ProviderState } from '../identity/provider-shape.js';

/** `unreadable` says the stored session could not be read, so nothing is known about the account behind it; unsaid is an ordinary change (ONL-2882). */
export type SessionChange = 'session' | 'unreadable' | 'signed-out';

export type SessionEndReason = 'expired' | 'revoked' | 'ended';
export type LaunchSessionResult = { status: 'valid' } | { status: 'unavailable' } | { status: 'ended'; reason: SessionEndReason };

/** A provider module's optional `capabilities` export: a constant, since main reads it once, before any view loads. A name left out is a capability the provider lacks. */
export type ProviderCapabilities = Partial<StudioCapabilities>;

export interface CloudIdentity {
  enabled(): boolean;
  configured(): boolean;
  prepareSession(): { url?: string } | null;
  hasSession(): boolean;
  signIn(method?: OnlookSignInMethod): Promise<ProviderIdentity>;
  supersedeSignIn(): void;
  clearSession(): void;
  refreshSession(): Promise<void>;
  checkLaunchSession?(signal: AbortSignal): Promise<LaunchSessionResult>;
  dispose(): void;
  signInStep(): AuthSignInStep | null;
  onSignInProgress(listener: () => void): () => void;
  onSessionChanged(listener: (change?: SessionChange) => void): () => void;
}

export interface OnlookClientOptions {
  url: string;
  build?: number;
  onIdentity?(identity: ProviderIdentity): void;
  /** A sign-in failure the provider absorbed rather than rejecting. It names no attempt, so main bounds both arguments, reports it as its own event, and decides what a press meant from the session instead (ONL-2950). */
  onSignInFailure?(method: OnlookSignInMethod, code: SignInFailureCode): void;
}

export class ReportSubmissionError extends Error {
  readonly reason: 'send-failed' | 'delivery-unknown' | 'too-many' | 'disabled';

  constructor(reason: ReportSubmissionError['reason']) {
    super('Report submission failed');
    this.reason = reason;
  }
}

export interface OnlookClient {
  github?: import('../github-import/backend.js').GithubBackend;
  submitReport?(request: ReportProviderRequest): Promise<ReportFiled>;
  start(): void;
  setSession(signedIn: boolean): void;
  setProfile(profile: OnlookProfile | null): void;
  snapshot(): ProviderState;
  subscribe(listener: (state: ProviderState) => void): () => void;
  /** Resolves only once the session it opened reads `signed-in`: main treats a press that resolved on any other session as a failed one, whatever it absorbed (ONL-2950). */
  signIn(method: OnlookSignInMethod): Promise<void>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
  answerSurvey?(answer: SurveyAnswer): Promise<void>;
  teamCommand(command: TeamCommand): Promise<TeamResult>;
  close(): Promise<void>;
}

function sameProfile(a: OnlookProfile | null, b: OnlookProfile | null): boolean {
  if (a === null || b === null) return a === b;
  return a.name === b.name && a.email === b.email && a.picture === b.picture;
}

export function statePublisher(initial: ProviderState) {
  let state = initial;
  const listeners = new Set<(state: ProviderState) => void>();
  return {
    snapshot: () => state,
    publish(next: Partial<Omit<ProviderState, 'revision'>>) {
      const merged = { ...state, ...next };
      // By value, not by reference: a profile is rebuilt per publish and would never match (ONL-2701).
      if (merged.session === state.session && merged.connection === state.connection
        && merged.me === state.me && merged.updateRequired === state.updateRequired
        && merged.teams === state.teams && sameProfile(merged.profile, state.profile)) return;
      state = { ...merged, revision: state.revision + 1 };
      for (const listener of listeners) listener(state);
    },
    subscribe(listener: (state: ProviderState) => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
