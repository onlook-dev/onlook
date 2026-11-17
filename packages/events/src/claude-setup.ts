import type { UsageLimitHit } from './events.js';

export const SETUP_ENTRY_POINTS = ['onboarding', 'editor', 'settings'] as const;
export type SetupEntryPoint = (typeof SETUP_ENTRY_POINTS)[number];

/** `verifying` is the real turn behind a found credential; `signed-in` means that turn answered (ONL-2496). */
export type ClaudeSetupStatus = ClaudeSetupState['status'];

export const CLAUDE_SETUP_STATUSES = [
  'idle',
  'checking',
  'signed-out',
  'signing-in',
  'awaiting-code',
  'verifying',
  'signed-in',
  'verification-failed',
  'failed',
] as const satisfies readonly ClaudeSetupStatus[];

const CLAUDE_IN_FLIGHT: ReadonlySet<ClaudeSetupStatus> = new Set(['checking', 'signing-in', 'awaiting-code', 'verifying']);

/** A verdict the board can be left holding; restoring an in-flight status strands it with nothing running behind it (ONL-2496). */
export function claudeStatusIsSettled(status: ClaudeSetupStatus): boolean {
  return !CLAUDE_IN_FLIGHT.has(status);
}

/** The `turn-` details are a verification verdict; the rest come from the credential read or the login child. */
export type ClaudeSetupDetail =
  | 'invalid-code'
  | 'server-rejected'
  | 'spawn'
  | 'did-not-answer'
  | 'took-too-long'
  | 'exited'
  | 'turn-signed-out'
  | 'turn-sign-in-rejected'
  | 'turn-provider-refused'
  | 'turn-usage-limit'
  | 'turn-rate-limited'
  | 'turn-service-error'
  | 'turn-billing'
  | 'turn-agent-error'
  | 'turn-no-answer';

export type ClaudeLoginDetail = Exclude<ClaudeSetupDetail, `turn-${string}`>;
export type ClaudeVerificationDetail = Extract<ClaudeSetupDetail, `turn-${string}`>;

export const CLAUDE_SETUP_DETAILS = [
  'invalid-code',
  'server-rejected',
  'spawn',
  'did-not-answer',
  'took-too-long',
  'exited',
  'turn-signed-out',
  'turn-sign-in-rejected',
  'turn-provider-refused',
  'turn-usage-limit',
  'turn-rate-limited',
  'turn-service-error',
  'turn-billing',
  'turn-agent-error',
  'turn-no-answer',
] as const satisfies readonly ClaudeSetupDetail[];

export function claudeDetailNeedsSignIn(detail: ClaudeSetupDetail | undefined): boolean {
  return detail === 'turn-signed-out' || detail === 'turn-sign-in-rejected';
}

/** A key, Bedrock or a custom endpoint is fixed where it was configured; a sign-in cannot replace it (ONL-2903). */
export function isClaudeSubscriptionPlan(plan: string | undefined): boolean {
  return plan !== CLAUDE_API_KEY_PLAN && plan !== CLAUDE_BEDROCK_PLAN && plan !== CLAUDE_CUSTOM_ENDPOINT_PLAN;
}

/** What the verification turn heard, for the person's own screen only: `sentence` is the provider's words and never reaches telemetry or the exported log (ONL-2903). */
export interface ClaudeTurnFacts {
  limit?: UsageLimitHit;
  diagnostic?: { kind?: string; status?: number };
  sentence?: string;
}

export const CLAUDE_API_KEY_PLAN = 'api-key';
export const CLAUDE_BEDROCK_PLAN = 'bedrock';
export const CLAUDE_CUSTOM_ENDPOINT_PLAN = 'custom-endpoint';

export const CLAUDE_LOGIN_COMMAND = 'claude auth login';

export const CODE_MAX_LENGTH = 512;

export function sanitizeCode(raw: string): string | undefined {
  const code = raw.replace(/\p{Cc}/gu, '').trim();
  return code.length === 0 || code.length > CODE_MAX_LENGTH ? undefined : code;
}

/** No URL field: the login page carries a single-use PKCE challenge and stays in main (ONL-2186). */
export interface ClaudeBrowser {
  id: string;
  name: string;
  isDefault: boolean;
}

type NoClaudePayload = { email?: never; plan?: never; detail?: never; turn?: never };

export type ClaudeSetupVerdict =
  | (({ status: 'idle' } | { status: 'checking' } | { status: 'signing-in' } | { status: 'verifying' }) & NoClaudePayload)
  | { status: 'signed-out'; detail?: 'exited'; email?: never; plan?: never; turn?: never }
  | { status: 'awaiting-code'; detail?: 'invalid-code'; email?: never; plan?: never; turn?: never }
  | { status: 'signed-in'; email?: string; plan?: string; detail?: never; turn?: never }
  | { status: 'failed'; detail: ClaudeLoginDetail; email?: never; plan?: never; turn?: never }
  | { status: 'verification-failed'; detail: ClaudeVerificationDetail; turn?: ClaudeTurnFacts; plan?: string; email?: never };

export type ClaudeSetupState = ClaudeSetupVerdict & {
  command: string;
  browsers?: ClaudeBrowser[];
};

export type ClaudeSettledSetupState = Extract<ClaudeSetupState, { status: 'idle' | 'signed-out' | 'signed-in' | 'failed' | 'verification-failed' }>;

export function claudeStateIsSettled(state: ClaudeSetupState): state is ClaudeSettledSetupState {
  return claudeStatusIsSettled(state.status);
}

export const IDLE_CLAUDE_SETUP_STATE = { status: 'idle', command: CLAUDE_LOGIN_COMMAND } satisfies ClaudeSetupState;

export interface ClaudeStatusRequest {
  /** Re-run `auth status`; an in-flight detection is joined, not doubled. */
  fresh?: boolean;
  entryPoint?: SetupEntryPoint;
}
