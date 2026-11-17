import {
  CLAUDE_API_KEY_PLAN,
  CLAUDE_BEDROCK_PLAN,
  CLAUDE_CUSTOM_ENDPOINT_PLAN,
  CODEX_API_KEY_PLAN,
  claudeDetailNeedsSignIn,
  type ClaudeSetupDetail,
  type ClaudeSetupState,
  type ClaudeSetupStatus,
  type ClaudeTurnFacts,
  type ClaudeVerificationDetail,
  type CodexSetupState,
  type CodexSetupStatus,
  type HarnessId,
} from '@studio/events';
import { fill } from '@studio/chat-ui';
import {
  markFor,
  type CannotConnectCause,
  type ChatGptSetupStateId,
  type OtherAgentOffer,
  type SheetCopy,
  type ClaudeSetupStateId,
  type HarnessTileState,
  type SetupState,
  type TileMark,
} from '@studio/onboarding-ui/state';
import { accountLink } from './accountLinks.js';

export type ClaudePlanId = 'max' | 'pro' | 'team' | 'enterprise' | 'api-key' | 'bedrock' | 'custom-endpoint' | 'unknown';

/** The verification verdicts with a sheet of their own; the rest render their sentence (ONL-2903). */
type ClaudeTurnFailure = Exclude<ClaudeVerificationDetail, 'turn-signed-out' | 'turn-sign-in-rejected'>;
type ClaudeDetailWithSentence = Exclude<ClaudeSetupDetail, ClaudeTurnFailure>;

const CAUSE_BY_TURN = {
  'turn-usage-limit': 'usage-limit',
  'turn-rate-limited': 'rate-limited',
  'turn-billing': 'billing',
  'turn-no-answer': 'no-answer',
  'turn-service-error': 'service-error',
  'turn-agent-error': 'agent-error',
  'turn-provider-refused': 'agent-error',
} as const satisfies Record<ClaudeTurnFailure, CannotConnectCause>;

/** No card where the fix is a minute away on this agent's own side (ONL-2903). */
const OFFERS_OTHER: Record<CannotConnectCause, boolean> = {
  'usage-limit': true,
  'rate-limited': true,
  billing: true,
  'no-answer': true,
  'service-error': false,
  'agent-error': true,
  unreachable: true,
};

interface ClaudeSheetStrings {
  usageLimit: SheetCopy;
  /** `{when}` templates, by the window that ran out. */
  usageLimitUntil: { session: string; weekly: string; unknown: string };
  rateLimited: SheetCopy;
  billing: SheetCopy;
  noAnswer: SheetCopy;
  serviceError: SheetCopy;
  agentError: SheetCopy;
  agentErrorSilent: string;
  signInRejected: SheetCopy;
  /** `{when}` template. */
  checkAgainAt: string;
  /** `{status}` template. */
  diagnosticStatus: string;
}

export interface AgentSetupStrings {
  claudeDetail: Record<ClaudeDetailWithSentence, string>;
  claudeSheet: ClaudeSheetStrings;
  /** A reset instant for this person's clock; `weekday` when it is days away. */
  formatWhen: (epochMs: number, now: number, weekday: boolean) => string;
  claudePlan: Record<ClaudePlanId, string>;
  /** `{plan}` template. */
  claudePlanLine: string;
  codexPlan: string;
  /** `{plan}` template. */
  codexPlanLine: string;
  codexApiKeyPlan: string;
}

export interface MappedSetup {
  state: SetupState;
  busy: boolean;
}

/** Only `idle` is `null` — nothing has been asked yet. Every check draws its own sheet rather than redrawing the last verdict (ONL-2496). */
const CLAUDE_TABLE = {
  idle: null,
  checking: 'checking',
  'signed-out': 'not-signed-in',
  'signing-in': 'signing-in',
  'awaiting-code': 'paste-code',
  verifying: 'checking',
  'signed-in': 'signed-in',
  'verification-failed': 'cannot-connect',
  failed: 'fallback',
} satisfies Record<ClaudeSetupStatus, ClaudeSetupStateId | null>;

/** `validating` and `unsupported` collapse onto designed sheets; `unsupported`'s remedy cannot help (design call open). */
const CODEX_TABLE = {
  idle: 'not-set-up',
  checking: 'checking',
  downloading: 'downloading',
  validating: 'checking',
  ready: 'connected',
  failed: 'setup-failed',
  broken: 'wont-start',
  outdated: 'out-of-date',
  'signed-out': 'not-signed-in',
  'signing-in': 'signing-in',
  unsupported: 'setup-failed',
} satisfies Record<CodexSetupStatus, ChatGptSetupStateId>;

export const CODEX_DEVICE_AUTH_COMMAND = 'codex login --device-auth';

/** A key account has no tier: capitalising it into the plan line reads "ChatGPT Api-key plan" (ONL-2186). */
function codexPlanLabel(plan: string, strings: AgentSetupStrings): string {
  if (plan === CODEX_API_KEY_PLAN) return strings.codexApiKeyPlan;
  const trimmed = plan.trim();
  if (trimmed === '') return strings.codexPlan;
  return fill(strings.codexPlanLine, { plan: trimmed.charAt(0).toUpperCase() + trimmed.slice(1) });
}

export function claudePlanId(plan: string | undefined): ClaudePlanId {
  if (plan === CLAUDE_API_KEY_PLAN) return 'api-key';
  if (plan === CLAUDE_BEDROCK_PLAN) return 'bedrock';
  if (plan === CLAUDE_CUSTOM_ENDPOINT_PLAN) return 'custom-endpoint';
  switch (plan) {
    case 'max':
    case 'pro':
    case 'team':
    case 'enterprise':
      return plan;
    default:
      return 'unknown';
  }
}

export interface ClaudeMappingOptions {
  code?: string;
  busy?: boolean;
  previous?: ClaudeSetupState;
  /** Whether the other agent is already set up; absent, a failed sheet offers no card. */
  otherReady?: boolean;
  now?: number;
}

function isTurnFailure(detail: ClaudeSetupDetail | undefined): detail is ClaudeTurnFailure {
  return detail !== undefined && detail in CAUSE_BY_TURN;
}

function sentenceFor(detail: ClaudeSetupDetail | undefined, strings: AgentSetupStrings): { detail?: string } {
  return detail === undefined || isTurnFailure(detail) ? {} : { detail: strings.claudeDetail[detail] };
}

function diagnosticLine(diagnostic: ClaudeTurnFacts['diagnostic'], strings: Pick<ClaudeSheetStrings, 'diagnosticStatus'>): string | undefined {
  if (diagnostic === undefined) return undefined;
  const status = diagnostic.status === undefined ? undefined : fill(strings.diagnosticStatus, { status: diagnostic.status });
  const line = [status, diagnostic.kind].filter((part) => part !== undefined).join(' ');
  return line === '' ? undefined : line;
}

type CannotConnectState = Extract<SetupState, { state: 'cannot-connect' }>;

/** One sheet per cause: the provider's words or status in the box, never Studio's own sentence (ONL-2903). */
function cannotConnectState(state: Extract<ClaudeSetupState, { status: 'verification-failed' }>, strings: AgentSetupStrings, opts: ClaudeMappingOptions): CannotConnectState {
  if (!isTurnFailure(state.detail)) {
    return { harness: 'claude', state: 'cannot-connect', detail: sentenceFor(state.detail, strings).detail ?? '', cause: 'unreachable', ...otherOffer('unreachable', opts) };
  }
  const cause = CAUSE_BY_TURN[state.detail];
  const sheet = strings.claudeSheet;
  const turn = state.turn ?? {};
  const status = diagnosticLine(turn.diagnostic, sheet);
  const base = { harness: 'claude', state: 'cannot-connect', detail: '', cause, ...otherOffer(cause, opts) } as const;
  switch (cause) {
    case 'usage-limit': {
      const now = opts.now ?? Date.now();
      const at = turn.limit?.resetsAt === undefined ? undefined : turn.limit.resetsAt * 1000;
      if (at === undefined || at <= now) {
        return { ...base, copy: sheet.usageLimit, hasAccountLink: accountLink('claude', 'usage', state.plan) !== undefined };
      }
      const weekly = turn.limit?.window === 'weekly';
      const when = strings.formatWhen(at, now, weekly);
      const window = turn.limit?.window === 'session' || weekly ? (turn.limit?.window as 'session' | 'weekly') : 'unknown';
      return {
        ...base,
        copy: { title: sheet.usageLimit.title, body: fill(sheet.usageLimitUntil[window], { when }) },
        retryAt: at,
        retryLabel: fill(sheet.checkAgainAt, { when }),
      };
    }
    case 'rate-limited':
      return { ...base, copy: sheet.rateLimited, ...(status === undefined ? {} : { diagnostic: status }) };
    case 'billing':
      return { ...base, copy: sheet.billing, hasAccountLink: accountLink('claude', 'billing', state.plan) !== undefined };
    case 'no-answer':
      return { ...base, copy: sheet.noAnswer };
    case 'service-error':
      return { ...base, copy: sheet.serviceError, ...(status === undefined ? {} : { diagnostic: status }) };
    case 'agent-error': {
      const said = turn.sentence ?? status;
      return said === undefined
        ? { ...base, copy: { title: sheet.agentError.title, body: sheet.agentErrorSilent } }
        : { ...base, copy: sheet.agentError, diagnostic: said };
    }
  }
}

function otherOffer(cause: CannotConnectCause, opts: Pick<ClaudeMappingOptions, 'otherReady'>): { other?: OtherAgentOffer } {
  return opts.otherReady === undefined || !OFFERS_OTHER[cause] ? {} : { other: { harness: 'codex', ready: opts.otherReady } };
}

export function claudeBillingLabel(plan: string | undefined, strings: AgentSetupStrings): string {
  return fill(strings.claudePlanLine, { plan: strings.claudePlan[claudePlanId(plan)] });
}

/** `null` only for `idle`. A failed verification a sign-in can fix is the sign-in sheet, so the tile and the sheet agree (ONL-2496). */
function claudeSetupId(state: ClaudeSetupState): ClaudeSetupStateId | null {
  if (state.status === 'failed' && state.detail === 'spawn') return 'cannot-connect';
  if (state.status === 'verification-failed' && claudeDetailNeedsSignIn(state.detail)) return 'not-signed-in';
  return CLAUDE_TABLE[state.status];
}

export function claudeSetupState(state: ClaudeSetupState, strings: AgentSetupStrings, opts: ClaudeMappingOptions = {}): MappedSetup {
  if (state.status === 'idle') {
    const previous = opts.previous;
    const settled: SetupState =
      previous !== undefined && claudeSetupId(previous) !== null
        ? claudeSetupState(previous, strings, { ...(opts.code === undefined ? {} : { code: opts.code }) }).state
        : { harness: 'claude', state: 'not-signed-in' };
    return { state: settled, busy: true };
  }
  const busy = opts.busy ?? false;
  const detail = sentenceFor(state.detail, strings);
  switch (state.status) {
    case 'signed-out':
      return { state: { harness: 'claude', state: 'not-signed-in', ...detail }, busy };
    case 'verification-failed': {
      if (!claudeDetailNeedsSignIn(state.detail)) return { state: cannotConnectState(state, strings, opts), busy };
      if (state.detail !== 'turn-sign-in-rejected') return { state: { harness: 'claude', state: 'not-signed-in', ...detail }, busy };
      const diagnostic = diagnosticLine(state.turn?.diagnostic, strings.claudeSheet);
      return {
        state: { harness: 'claude', state: 'not-signed-in', ...detail, copy: strings.claudeSheet.signInRejected, ...(diagnostic === undefined ? {} : { diagnostic }) },
        busy,
      };
    }
    case 'checking':
    case 'verifying':
      return { state: { harness: 'claude', state: 'checking' }, busy };
    case 'signing-in':
      return { state: { harness: 'claude', state: 'signing-in' }, busy };
    case 'awaiting-code':
      return { state: { harness: 'claude', state: 'paste-code', ...(opts.code === undefined ? {} : { code: opts.code }), ...detail }, busy };
    case 'signed-in':
      return {
        state: {
          harness: 'claude',
          state: 'signed-in',
          ...(state.email === undefined ? {} : { email: state.email }),
          plan: claudeBillingLabel(state.plan, strings),
        },
        busy,
      };
    case 'failed':
      if (state.detail === 'spawn') return { state: { harness: 'claude', state: 'cannot-connect', detail: '', runtimeUnavailable: true }, busy };
      return { state: { harness: 'claude', state: 'fallback', command: state.command, ...detail }, busy };
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

export interface CodexMappingOptions {
  /** After a sign-in, `signed-out` with a message is the fallback, not a fresh not-signed-in. */
  attemptedSignIn?: boolean;
  busy?: boolean;
  /** Whether Claude is already set up; absent, a failed sheet offers no card. */
  otherReady?: boolean;
}

function codexSetupId(state: CodexSetupState, opts: CodexMappingOptions = {}): ChatGptSetupStateId {
  if (state.status === 'signed-out' && opts.attemptedSignIn === true && state.message !== undefined) return 'fallback';
  return CODEX_TABLE[state.status];
}

export function chatGptSetupState(state: CodexSetupState, strings: AgentSetupStrings, opts: CodexMappingOptions = {}): MappedSetup {
  const busy = opts.busy ?? false;
  switch (state.status) {
    case 'idle':
      return { state: { harness: 'codex', state: 'not-set-up' }, busy };
    case 'checking':
    case 'validating':
      return { state: { harness: 'codex', state: 'checking' }, busy };
    case 'signing-in':
      return { state: { harness: 'codex', state: 'signing-in' }, busy };
    case 'signed-out':
      if (opts.attemptedSignIn === true && state.message !== undefined) {
        return { state: { harness: 'codex', state: 'fallback', command: state.command ?? CODEX_DEVICE_AUTH_COMMAND, detail: state.message }, busy };
      }
      return { state: { harness: 'codex', state: 'not-signed-in', ...(state.message === undefined ? {} : { detail: state.message }) }, busy };
    case 'downloading':
      return { state: { harness: 'codex', state: 'downloading', percent: state.percent ?? 0 }, busy };
    case 'ready':
      return {
        state: {
          harness: 'codex',
          state: 'connected',
          ...(state.email === undefined ? {} : { email: state.email }),
          plan: state.plan === undefined ? strings.codexPlan : codexPlanLabel(state.plan, strings),
        },
        busy,
      };
    case 'failed':
    case 'unsupported':
    case 'broken':
      return {
        state: {
          harness: 'codex',
          state: state.status === 'broken' ? 'wont-start' : 'setup-failed',
          detail: state.message ?? '',
          ...(opts.otherReady === undefined ? {} : { other: { harness: 'claude', ready: opts.otherReady } }),
        },
        busy,
      };
    case 'outdated':
      return { state: { harness: 'codex', state: 'out-of-date', detail: state.message }, busy };
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

export function isClaudeConnected(state: ClaudeSetupState): boolean {
  return state.status === 'signed-in';
}

export function isCodexConnected(state: CodexSetupState): boolean {
  return state.status === 'ready';
}

export interface SetupFacts {
  claude: ClaudeSetupState;
  claudeSettled?: ClaudeSetupState | undefined;
  codex: CodexSetupState;
  codexSignInAttempted?: boolean;
  touched: Record<HarnessId, boolean>;
}

export function isConnected(facts: Pick<SetupFacts, 'claude' | 'codex'>, harness: HarnessId): boolean {
  return harness === 'claude' ? isClaudeConnected(facts.claude) : isCodexConnected(facts.codex);
}

/** `idle` before a tap whatever the machine knows: a boot-found credential paints nothing (ONL-2186). */
export function claudeTileState(facts: Pick<SetupFacts, 'claude' | 'claudeSettled' | 'touched'>): HarnessTileState {
  if (!facts.touched.claude) return { kind: 'harness', harness: 'claude', state: 'idle' };
  const id = claudeSetupId(facts.claude) ?? (facts.claudeSettled === undefined ? null : claudeSetupId(facts.claudeSettled));
  return { kind: 'harness', harness: 'claude', state: id ?? 'idle' };
}

export function codexTileState(facts: Pick<SetupFacts, 'codex' | 'codexSignInAttempted' | 'touched'>): HarnessTileState {
  if (!facts.touched.codex) return { kind: 'harness', harness: 'codex', state: 'idle' };
  const id = codexSetupId(facts.codex, { attemptedSignIn: facts.codexSignInAttempted ?? false });
  if (id === 'downloading') return { kind: 'harness', harness: 'codex', state: 'downloading', percent: facts.codex.percent ?? 0 };
  return { kind: 'harness', harness: 'codex', state: id };
}

export function claudeMark(facts: Pick<SetupFacts, 'claude' | 'claudeSettled' | 'touched'>): TileMark | undefined {
  return markFor(claudeTileState(facts));
}

export function codexMark(facts: Pick<SetupFacts, 'codex' | 'codexSignInAttempted' | 'touched'>): TileMark | undefined {
  return markFor(codexTileState(facts));
}
