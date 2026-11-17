import { claudeDetailNeedsSignIn, type AgentConnection, type ClaudeSetupDetail, type ClaudeSetupStatus } from '@studio/events';

export function sameConnection(a: AgentConnection, b: AgentConnection): boolean {
  return a.status === b.status && a.detail === b.detail && a.harness === b.harness;
}

/** `undefined` means "no write": the machine has no verdict yet, or the probe's own verdict stands. */
export function deriveClaudeConnection(
  probe: AgentConnection | undefined,
  setup: ClaudeSetupStatus,
  detail?: ClaudeSetupDetail,
): AgentConnection | undefined {
  if (probe !== undefined && (probe.status === 'cli_missing' || probe.status === 'error')) {
    return { ...probe, harness: 'claude' };
  }
  switch (setup) {
    case 'failed':
      return detail === 'spawn' ? { status: 'cli_missing', harness: 'claude' } : undefined;
    case 'signed-in':
      return { status: 'ok', harness: 'claude' };
    case 'signed-out':
      return { status: 'unauthenticated', harness: 'claude' };
    // A proven-broken Claude is not connected; only the auth family is a sign-in away (ONL-2496).
    case 'verification-failed':
      return { status: claudeDetailNeedsSignIn(detail) ? 'unauthenticated' : 'error', harness: 'claude' };
    case 'idle':
    case 'checking':
    case 'verifying':
    case 'signing-in':
    case 'awaiting-code':
      return undefined;
  }
}

/** A running SDK child does not see a credential written after it started; `previous` is the last verdict, not the in-flight statuses between. */
export function marksSessionsStale(
  previous: ClaudeSetupStatus,
  next: ClaudeSetupStatus,
  afterLogin: boolean,
): boolean {
  return afterLogin && next === 'signed-in' && previous !== 'signed-in';
}
