import { isCredentialRejected, isSignInFixable, type AgentConnection, type SessionState } from '@studio/events';

import { isComposerConnected } from './composerSubmission.js';

export type ConnectionSurface = 'card' | 'banner' | 'none';

export type SignInPlacement = 'band' | 'transcript';

/** A refused credential shows the card only when main ruled it a sign-in away, so the card answers that turn in place (ONL-2903). */
export function signInPlacement(state: Pick<SessionState, 'failedTurn'>): SignInPlacement {
  const code = state.failedTurn?.code;
  return isSignInFixable(code) || isCredentialRejected(code) ? 'transcript' : 'band';
}

export function connectionVerdict(connection: AgentConnection): string {
  return `${connection.harness ?? 'claude'}:${connection.status}`;
}

// Codex excluded: the card drives Claude's sign-in only; codex's banner carries its own (ONL-2187, ONL-2114).
export function isSignInShaped(connection: AgentConnection): boolean {
  return connection.status === 'unauthenticated' && connection.harness !== 'codex';
}

export function connectionSurface(
  connection: AgentConnection,
  hasSignInSlot: boolean,
  dismissedVerdict: string | undefined,
  remedyBusy = false,
): ConnectionSurface {
  if (remedyBusy) return 'banner';
  if (isComposerConnected(connection.status)) return 'none';
  if (isSignInShaped(connection) && hasSignInSlot) return 'card';
  return dismissedVerdict === connectionVerdict(connection) ? 'none' : 'banner';
}
