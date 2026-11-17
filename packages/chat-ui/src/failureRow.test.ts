import { describe, expect, test } from 'bun:test';
import type { HarnessId, TranscriptItem } from '@studio/events';
import { failureRow, type FailureContext } from './failureRow.js';
import type { ChatFailureStrings } from './strings.js';

const FAILURE: ChatFailureStrings = {
  limitTitle: 't', limitSession: '{when}', limitUntil: '{when}', limitWeekly: '{when}', limitUnknown: 'Reset time unavailable.', limitSwitch: 'switch', retryAt: '{when}',
  tooManyTitle: 't', tooManyBody: 'b', tooManyStatus: '{status}', billingTitle: 't', billingBody: 'b', billingOpen: 'o',
  keyTitle: 't', keyBody: 'b', serviceTitle: 't', serviceStatus: '{status}', serviceBody: 'b', crashTitle: 't', crashBody: 'b',
  failedTitle: 't', failedBody: 'b', useOther: 'u', formatWhen: (at) => String(at),
  line: {
    overloaded: 'overloaded {status}', serviceStatus: 'service {status}', service: 'service', stoppedStatus: 'stopped {status}', stopped: 'stopped',
    lostOverloaded: 'lost {status}', lostStatus: 'lost {status}', lost: 'lost', partOverloaded: 'part {status} {file}', partStatus: 'part {status} {file}', part: 'part {file}',
    landedFile: 'landed {file}', landedChange: 'landed', continueHint: 'continue hint', retryHint: 'retry hint',
    cutOff: 'cut', continue: 'continue', stoppedHere: 'here {reason}', notNow: 'not now',
    crashReason: 'crash reason', crashRetry: 'crash retry', failedReason: 'failed reason', failedRetry: 'failed retry',
    signedOut: 'signed out', signInRejected: 'rejected', signedOutDetail: 'signed out detail', signIn: 'Sign in',
    noticeBilling: 'short billing', noticeLimitSession: 'short {when}', noticeLimitUntil: 'short {when}', noticeLimitWeekly: 'short {when}', noticeLimitUnknown: 'short unknown', noticeSwitch: 'short switch',
    tooMany: 'short wait', tooManyStatus: 'short {status}',
  },
};
const REASONS = {
  api_error: 'a', api_error_status: '{status}', prompt_too_long: 'p', rate_limited: 'r', max_turns: 'm', max_budget: 'b',
  tool_use_failed: 'tf', turn_setup_failed: 'ts', model_error: 'me', image_error: 'ie', hook_stopped: 'hs',
};
const STRINGS = { errorTitle: 'e', errorCutOffTitle: 'c', errorReason: REASONS, failure: FAILURE };
const NOW = 1_000_000_000;
const prompt = { text: 'Make the hero headline warmer' };

type Row = Extract<TranscriptItem, { kind: 'error' }>;
const row = (over: Partial<Row>): Row => ({ kind: 'error', id: 'e1', message: 'provider words', retry: prompt, ...over });
const ctx = (over: Partial<FailureContext> = {}): FailureContext => ({ harness: 'claude', plan: 'max', hasBillingLink: true, now: NOW, ...over });
const shape = (item: Row, context: FailureContext) => {
  const view = failureRow(item, context, STRINGS);
  return view === undefined ? 'hidden' : [view.cause, view.actions.map((action) => action.kind === 'switch-agent' ? `switch:${action.harness}:${action.ready ? 'use' : 'set-up'}` : action.kind)];
};

const soon = (NOW + 3_600_000) / 1000;
const ready = { ready: true };

describe('an account failure names its cause and offers only what can work (ONL-2903)', () => {
  test.each([undefined, { window: 'session' as const, resetsAt: soon }, { window: 'weekly' as const, resetsAt: soon }])('a Claude 429 preserves the provider reason with limit snapshot %j', (limit) => {
    const message = 'Usage credits are required for long context requests';
    const view = failureRow(row({ code: 'api_error', apiErrorStatus: 429, message, limit }), ctx({ other: ready }), STRINGS);
    expect(view?.body).toContain(message);
    expect(view?.body).not.toContain(FAILURE.tooManyStatus.replace('{status}', '429'));
    if (limit === undefined) expect(view?.body).toBe(message);
  });

  test('an empty Claude 429 reason keeps the generic fallback', () => {
    const view = failureRow(row({ code: 'api_error', apiErrorStatus: 429, message: '  ' }), ctx(), STRINGS);
    expect(view?.body).toBe('429');
  });

  test.each([NOW / 1000, NOW / 1000 - 1])('a Claude 429 keeps its reason after reset %s', (resetsAt) => {
    const message = 'Usage credits are required for long context requests';
    const view = failureRow(row({ code: 'api_error', apiErrorStatus: 429, message, limit: { window: 'session', resetsAt } }), ctx(), STRINGS);
    expect(view?.body).toBe(message);
    expect(view?.actions).toEqual([{ kind: 'retry', prompt }]);
  });

  test.each(['session', 'weekly'] as const)('an empty Claude 429 reason leaves the %s reset intact', (window) => {
    const view = failureRow(row({ code: 'api_error', apiErrorStatus: 429, message: '  ', limit: { window, resetsAt: soon } }), ctx(), STRINGS);
    expect(view?.body).toBe(String(soon * 1000));
    expect(view?.actions).toEqual([{ kind: 'retry-at', prompt, at: soon * 1000 }]);
  });

  test('a used-up ChatGPT plan without a snapshot preserves the reason, not a short-wait promise', () => {
    const view = failureRow(row({ code: 'usage_limit_exceeded', message: 'You have hit your usage limit. Try again on Friday.' }), ctx({ harness: 'codex', other: ready }), STRINGS);
    expect(view?.cause).toBe('limit-unknown');
    expect(view?.title).toBe(FAILURE.limitTitle);
    expect(view?.body).toContain('You have hit your usage limit. Try again on Friday.');
    expect(view?.body).not.toBe(FAILURE.tooManyBody);
  });

  test('a used-up plan shows the reset and provider reason together', () => {
    const view = failureRow(row({ code: 'usage_limit_exceeded', limit: { window: 'weekly', resetsAt: soon } }), ctx({ harness: 'codex' }), STRINGS);
    expect(view?.cause).toBe('limit-weekly');
    expect(view?.body).toContain(String(soon * 1000));
    expect(view?.body).toContain('provider words');
    expect(view?.actions).toEqual([{ kind: 'retry-at', prompt, at: soon * 1000 }]);
  });

  test('an expired weekly reset does not keep retry disabled', () => {
    const view = failureRow(row({ code: 'usage_limit_exceeded', limit: { window: 'weekly', resetsAt: (NOW - 1) / 1000 } }), ctx({ harness: 'codex' }), STRINGS);
    expect(view?.cause).toBe('limit-unknown');
    expect(view?.actions).toEqual([{ kind: 'retry', prompt }]);
  });

  test('a real short rate limit without a window keeps the short-wait copy', () => {
    const view = failureRow(row({ code: 'rate_limited' }), ctx({ harness: 'codex' }), STRINGS);
    expect(view?.cause).toBe('too-many');
    expect(view?.body).toBe(FAILURE.tooManyBody);
  });

  test.each([
    ['a plan limit with a reset waits for it, beside the other agent', row({ code: 'rate_limited', limit: { window: 'session', resetsAt: soon } }), ctx({ other: ready }), ['limit-reset', ['switch:codex:use', 'retry-at']]],
    ['a 429 whose window ran out reads as the plan limit', row({ code: 'api_error', apiErrorStatus: 429, limit: { window: 'session', resetsAt: soon } }), ctx({ other: ready }), ['limit-reset', ['switch:codex:use', 'retry-at']]],
    ['a weekly limit offers the other agent alone', row({ code: 'rate_limited', limit: { window: 'weekly', resetsAt: soon } }), ctx({ other: ready }), ['limit-weekly', ['switch:codex:use']]],
    ['a weekly limit with nothing to switch to still waits for the reset', row({ code: 'rate_limited', limit: { window: 'weekly', resetsAt: soon } }), ctx(), ['limit-weekly', ['retry-at']]],
    ['a limit with no reset says so and keeps Retry', row({ code: 'rate_limited', limit: { window: 'unknown' } }), ctx({ other: ready }), ['too-many', ['switch:codex:use', 'retry']]],
    ['a 429 with no window ran out is the same', row({ code: 'api_error', apiErrorStatus: 429 }), ctx(), ['too-many', ['retry']]],
    ['a reset already passed is a plain Retry', row({ code: 'rate_limited', limit: { window: 'session', resetsAt: (NOW - 1) / 1000 } }), ctx(), ['too-many', ['retry']]],
    ['billing opens the account page and offers no Retry', row({ code: 'billing_error' }), ctx(), ['billing', ['open-billing']]],
    ['billing with no page for the plan offers nothing', row({ code: 'billing_error' }), ctx({ hasBillingLink: false }), ['billing', []]],
    ["a subscription's refused sign-in is the card's, not a row", row({ code: 'credential_rejected' }), ctx(), 'hidden'],
    ['a refused key is named, with no Retry into the same refusal', row({ code: 'credential_rejected' }), ctx({ plan: 'api-key' }), ['credential', []]],
    ['a service error retries', row({ code: 'api_error', apiErrorStatus: 529 }), ctx(), ['service', ['retry']]],
    ['a statusless API failure is the service', row({ code: 'api_error' }), ctx(), ['service', ['retry']]],
    ['a 503 offers the ready alternative before Retry', row({ code: 'api_error', apiErrorStatus: 503 }), ctx({ other: ready }), ['service', ['switch:codex:use', 'retry']]],
    ['a statusless service failure offers setup before Retry', row({ code: 'api_error' }), ctx({ other: { ready: false } }), ['service', ['switch:codex:set-up', 'retry']]],
    ['a ChatGPT 500 offers Claude', row({ code: 'api_error', apiErrorStatus: 500 }), ctx({ harness: 'codex', other: ready }), ['service', ['switch:claude:use', 'retry']]],
    ['a 599 still offers an alternative', row({ code: 'api_error', apiErrorStatus: 599 }), ctx({ other: ready }), ['service', ['switch:codex:use', 'retry']]],
    ['a 400 never suggests switching', row({ code: 'api_error', apiErrorStatus: 400 }), ctx({ other: ready }), ['reason', ['retry']]],
    ['a 600 never suggests switching', row({ code: 'api_error', apiErrorStatus: 600 }), ctx({ other: ready }), ['reason', ['retry']]],
    ['a crash retries, which starts the agent again', row({ code: 'spawn_failed', message: '' }), ctx({ harness: 'codex' }), ['crash', ['retry']]],
    ['a ChatGPT turn that failed silently offers Claude and Retry', row({ code: 'unknown', message: '' }), ctx({ harness: 'codex', other: { ready: false } }), ['failed-silent', ['switch:claude:set-up', 'retry']]],
    ['an unrecognised error keeps its reason row and Retry', row({ code: 'unknown' }), ctx(), ['reason', ['retry']]],
    ['an API 4xx keeps its reason row', row({ code: 'api_error', apiErrorStatus: 400 }), ctx(), ['reason', ['retry']]],
  ] as const)('%s', (_name, item, context, expected) => {
    expect(shape(item, context)).toEqual(expected as unknown as ReturnType<typeof shape>);
  });

  test('service fallback forwards the row payload without requiring one to exist', () => {
    const payload = { text: prompt.text, attachments: [{ id: 'image-1', mediaType: 'image/png' as const, name: 'hero.png' }], context: 'private model context' };
    const view = failureRow(row({ code: 'api_error', apiErrorStatus: 503, retry: payload }), ctx({ other: ready }), STRINGS);
    expect(view?.actions[0]).toEqual({ kind: 'switch-agent', harness: 'codex', ready: true, prompt: payload });
    const without = failureRow(row({ code: 'api_error', apiErrorStatus: 503, retry: undefined }), ctx({ other: ready }), STRINGS);
    expect(without?.actions.map((action) => action.kind)).toEqual(['switch-agent']);
  });

  test('the mirror rows name the other agent for whichever agent failed', () => {
    for (const [harness, other] of [['claude', 'codex'], ['codex', 'claude']] as const satisfies readonly [HarnessId, HarnessId][]) {
      expect(shape(row({ code: 'rate_limited', limit: { window: 'session', resetsAt: soon } }), ctx({ harness, other: ready })), harness).toEqual(['limit-reset', [`switch:${other}:use`, 'retry-at']]);
      expect(shape(row({ code: 'billing_error' }), ctx({ harness })), harness).toEqual(['billing', ['open-billing']]);
    }
  });

  test('the switch carries the failed message, so the new chat can hold it unsent', () => {
    const switched = failureRow(row({ code: 'rate_limited', limit: { window: 'unknown' } }), ctx({ other: ready }), STRINGS)?.actions.find((action) => action.kind === 'switch-agent');
    expect(switched?.kind === 'switch-agent' ? switched.prompt : undefined).toEqual(prompt);
  });

  test("an unrecognised error shows the provider's own words", () => {
    expect(failureRow(row({ code: 'unknown', message: 'Your organization has disabled access.' }), ctx(), STRINGS)?.body).toBe('Your organization has disabled access.');
  });

  test('Retry waits for the reset it names', () => {
    const view = failureRow(row({ code: 'rate_limited', limit: { window: 'session', resetsAt: soon } }), ctx(), STRINGS);
    expect(view?.actions.at(-1)).toEqual({ kind: 'retry-at', prompt, at: soon * 1000 });
  });

  test('a failure with no prompt behind it offers no Retry', () => {
    expect(shape(row({ code: 'api_error', apiErrorStatus: 529, retry: undefined }), ctx())).toEqual(['service', []]);
  });
});
