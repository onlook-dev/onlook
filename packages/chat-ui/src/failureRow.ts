import {
  isClaudeSubscriptionPlan,
  isCredentialRejected,
  isLimitShaped,
  type HarnessId,
  type RetryPrompt,
  type TranscriptItem,
} from '@studio/events';
import { fill } from './fill.js';
import type { ChatErrorReasonStrings, ChatFailureStrings, ChatStrings } from './strings.js';

export type ErrorItem = Extract<TranscriptItem, { kind: 'error' }>;

export type FailAction =
  | { kind: 'retry'; prompt: RetryPrompt }
  /** Disabled until `at` (epoch ms): a Retry before the reset can only fail again. */
  | { kind: 'retry-at'; prompt: RetryPrompt; at: number }
  /** Labelled Use either way; `ready: false` runs setup first. `prompt` is the failed message the new chat's composer gets back. */
  | { kind: 'switch-agent'; harness: HarnessId; ready: boolean; prompt?: RetryPrompt }
  | { kind: 'open-billing' };

export type FailureCause =
  | 'limit-reset'
  | 'limit-weekly'
  | 'limit-unknown'
  | 'too-many'
  | 'billing'
  | 'credential'
  | 'service'
  | 'crash'
  | 'failed-silent'
  | 'reason';

export interface FailureRowView {
  cause: FailureCause;
  title: string;
  body?: string;
  /** `body` without the sentences that point at an action, each kept apart so it shows only beside its action (ONL-2973). */
  parts?: { reason: string; retry?: string; switch?: string };
  /** The shorter wording; `provider` is the provider's own words, kept out of the notice (ONL-2973). */
  short?: { reason: string; provider?: string; switch?: string };
  /** At most two; the last is the primary. */
  actions: FailAction[];
}

export interface FailureContext {
  harness: HarnessId;
  /** The Claude account's plan; a subscription's refused credential is the sign-in card's, not a row. */
  plan?: string;
  /** The other agent, offered only when the host can act on it. */
  other?: { ready: boolean };
  hasBillingLink: boolean;
  now: number;
}

/** `api_error` is excluded: its title depends on the status, so it is read before this set. */
const PLAIN_REASON_CODES = [
  'prompt_too_long',
  'rate_limited',
  'max_turns',
  'max_budget',
  'tool_use_failed',
  'turn_setup_failed',
  'model_error',
  'image_error',
  'hook_stopped',
] as const satisfies readonly (keyof ChatErrorReasonStrings)[];

/** `undefined` for a code that names no reason, which keeps the titles that were there before (ONL-2495). */
function reasonTitle(item: ErrorItem, reasons: ChatErrorReasonStrings): string | undefined {
  if (item.code === 'api_error') {
    return item.apiErrorStatus === undefined
      ? reasons.api_error
      : fill(reasons.api_error_status, { status: item.apiErrorStatus });
  }
  const plain = PLAIN_REASON_CODES.find((code) => code === item.code);
  return plain === undefined ? undefined : reasons[plain];
}

function otherHarness(harness: HarnessId): HarnessId {
  return harness === 'claude' ? 'codex' : 'claude';
}

function isServiceStatus(status: number | undefined): boolean {
  return status === undefined || (status >= 500 && status <= 599);
}

type RowStrings = Pick<ChatStrings, 'errorTitle' | 'errorCutOffTitle' | 'errorReason'> & { failure: ChatFailureStrings };

/** `undefined` hides the row: a subscription's refused sign-in is the sign-in card's to show (ONL-2903). */
export function failureRow(item: ErrorItem, ctx: FailureContext, strings: RowStrings): FailureRowView | undefined {
  const copy = strings.failure;
  const retry = item.retry;
  const switchAction = ctx.other === undefined ? [] : [{ kind: 'switch-agent', harness: otherHarness(ctx.harness), ready: ctx.other.ready, ...(retry === undefined ? {} : { prompt: retry }) } as const];
  const switchSentence = ctx.other?.ready === true ? ` ${copy.limitSwitch}` : '';
  const switchPart = switchSentence === '' ? {} : { switch: copy.limitSwitch };
  const shortSwitch = switchSentence === '' ? {} : { switch: copy.line.noticeSwitch };
  const retryNow = retry === undefined ? [] : [{ kind: 'retry', prompt: retry } as const];

  if (isCredentialRejected(item.code)) {
    if (ctx.harness === 'claude' && isClaudeSubscriptionPlan(ctx.plan)) return undefined;
    return { cause: 'credential', title: copy.keyTitle, body: copy.keyBody, actions: [] };
  }

  if (item.code === 'billing_error') {
    return {
      cause: 'billing',
      title: copy.billingTitle,
      body: copy.billingBody,
      short: { reason: copy.line.noticeBilling },
      actions: ctx.hasBillingLink ? [{ kind: 'open-billing' }] : [],
    };
  }

  if (isLimitShaped(item.code, item.apiErrorStatus)) {
    const provider = (item.code === 'usage_limit_exceeded' || (item.code === 'api_error' && item.apiErrorStatus === 429)) ? item.message.trim() : '';
    const reason = provider === '' ? '' : ` ${provider}`;
    const short = (text: string) => ({ reason: text, ...(provider === '' ? {} : { provider }), ...shortSwitch });
    const at = item.limit?.resetsAt === undefined ? undefined : item.limit.resetsAt * 1000;
    if (at !== undefined && at > ctx.now && item.limit?.window === 'weekly') {
      const when = copy.formatWhen(at, ctx.now, true);
      const fallback = switchAction.length === 0 && retry !== undefined ? [{ kind: 'retry-at', prompt: retry, at } as const] : [];
      const because = fill(copy.limitWeekly, { when }) + reason;
      return { cause: 'limit-weekly', title: copy.limitTitle, body: because + switchSentence, parts: { reason: because, ...switchPart }, short: short(fill(copy.line.noticeLimitWeekly, { when })), actions: [...switchAction, ...fallback] };
    }
    if (at !== undefined && at > ctx.now) {
      const when = copy.formatWhen(at, ctx.now, false);
      const because = fill(item.limit?.window === 'session' ? copy.limitSession : copy.limitUntil, { when }) + reason;
      return {
        cause: 'limit-reset',
        title: copy.limitTitle,
        body: because + switchSentence,
        parts: { reason: because, ...switchPart },
        short: short(fill(item.limit?.window === 'session' ? copy.line.noticeLimitSession : copy.line.noticeLimitUntil, { when })),
        actions: [...switchAction, ...(retry === undefined ? [] : [{ kind: 'retry-at', prompt: retry, at } as const])],
      };
    }
    if (item.code === 'usage_limit_exceeded') {
      const because = copy.limitUnknown + reason;
      return { cause: 'limit-unknown', title: copy.limitTitle, body: because + switchSentence, parts: { reason: because, ...switchPart }, short: short(copy.line.noticeLimitUnknown), actions: [...switchAction, ...retryNow] };
    }
    const body = provider || (item.apiErrorStatus === undefined ? copy.tooManyBody : fill(copy.tooManyStatus, { status: item.apiErrorStatus }));
    const shortBody = provider || (item.apiErrorStatus === undefined ? copy.line.tooMany : fill(copy.line.tooManyStatus, { status: item.apiErrorStatus }));
    return { cause: 'too-many', title: copy.tooManyTitle, body, parts: { reason: body }, short: { reason: shortBody }, actions: [...switchAction, ...retryNow] };
  }

  if (item.code === 'api_error' && isServiceStatus(item.apiErrorStatus)) {
    const body = item.apiErrorStatus === 529 ? fill(copy.serviceStatus, { status: 529 }) : copy.serviceBody;
    return { cause: 'service', title: copy.serviceTitle, body, actions: [...switchAction, ...retryNow] };
  }

  if (item.code === 'spawn_failed') {
    return { cause: 'crash', title: copy.crashTitle, body: copy.crashBody, parts: { reason: copy.line.crashReason, retry: copy.line.crashRetry }, actions: retryNow };
  }

  if (item.code === 'unknown' && item.message === '') {
    return { cause: 'failed-silent', title: copy.failedTitle, body: copy.failedBody, parts: { reason: copy.line.failedReason, retry: copy.line.failedRetry }, actions: [...switchAction, ...retryNow] };
  }

  const reason = reasonTitle(item, strings.errorReason);
  return {
    cause: 'reason',
    title: reason ?? (retry ? strings.errorCutOffTitle : strings.errorTitle),
    ...(item.message === '' ? {} : { body: item.message }),
    actions: retryNow,
  };
}
