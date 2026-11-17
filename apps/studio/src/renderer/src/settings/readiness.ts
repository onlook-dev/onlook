import { type ClaudeSetupDetail, type ClaudeSetupStatus, claudeDetailNeedsSignIn, type CodexSetupStatus, type HarnessId } from '@studio/events';

export type Readiness = 'ready' | 'not-installed' | 'not-signed-in' | 'sign-in-incomplete' | 'needs-attention' | 'checking';

export const READINESS = [
  'ready',
  'not-installed',
  'not-signed-in',
  'sign-in-incomplete',
  'needs-attention',
  'checking',
] as const satisfies readonly Readiness[];

/** A status the union does not name is in flight, never ready. */
function unknownStatus(_status: never): Readiness {
  return 'checking';
}

export function claudeReadiness(status: ClaudeSetupStatus, detail?: ClaudeSetupDetail): Readiness {
  switch (status) {
    // Nothing confirmed, and a stopped check can land here with no detection behind it, so the control stays offered (ONL-2496).
    case 'idle':
      return 'needs-attention';
    case 'checking':
    case 'verifying':
      return 'checking';
    case 'signing-in':
    case 'awaiting-code':
      return 'sign-in-incomplete';
    case 'signed-out':
      return 'not-signed-in';
    // A turn that failed is a Claude the user has to act on, never a missing install; only the auth family is a sign-in (ONL-2496).
    case 'verification-failed':
      return claudeDetailNeedsSignIn(detail) ? 'not-signed-in' : 'needs-attention';
    case 'signed-in':
      return 'ready';
    case 'failed':
      return 'not-installed';
    default:
      return unknownStatus(status);
  }
}

export function codexReadiness(status: CodexSetupStatus): Readiness {
  switch (status) {
    case 'checking':
    case 'downloading':
    case 'validating':
    case 'signing-in':
      return 'checking';
    case 'signed-out':
      return 'not-signed-in';
    case 'ready':
      return 'ready';
    // `idle` is nothing confirmed: not-installed, so Set up stays offered on the machine that needs it.
    case 'idle':
    case 'unsupported':
    case 'broken':
    case 'outdated':
    case 'failed':
      return 'not-installed';
    default:
      return unknownStatus(status);
  }
}

export function readinessByHarness(
  claude: ClaudeSetupStatus,
  codex: CodexSetupStatus,
  claudeDetail?: ClaudeSetupDetail,
): Record<HarnessId, Readiness> {
  return { claude: claudeReadiness(claude, claudeDetail), codex: codexReadiness(codex) };
}

export function offersSetUp(readiness: Readiness): boolean {
  return readiness === 'not-installed' || readiness === 'not-signed-in' || readiness === 'sign-in-incomplete' || readiness === 'needs-attention';
}
