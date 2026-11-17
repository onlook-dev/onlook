import { describe, expect, test } from 'bun:test';
import { SUGGEST_NEXT_TASKS_TOOL, type ToolCallView, type TranscriptItem } from '@studio/events';
import { failedTurnFacts, failureLine, type FailureLineView } from './failureLine.js';
import type { FailureContext } from './failureRow.js';
import type { ChatFailureStrings } from './strings.js';

const FAILURE: ChatFailureStrings = {
  limitTitle: 'limit', limitSession: '{when}', limitUntil: '{when}', limitWeekly: '{when}', limitUnknown: 'unknown', limitSwitch: 'switch', retryAt: '{when}',
  tooManyTitle: 'Too many', tooManyBody: 'wait', tooManyStatus: '{status}', billingTitle: 'billing', billingBody: 'b', billingOpen: 'o',
  keyTitle: 'Key refused', keyBody: 'fix it', serviceTitle: 'service', serviceStatus: '{status}', serviceBody: 'b', crashTitle: 'Crashed', crashBody: 'restart',
  failedTitle: 'failed', failedBody: 'b', useOther: 'u', formatWhen: (at) => String(at),
  line: {
    overloaded: 'Overloaded ({status}).', serviceStatus: 'Service error ({status}).', service: 'Service error.', stoppedStatus: 'Stopped ({status}).', stopped: 'Stopped.',
    lostOverloaded: 'lost {status} overloaded', lostStatus: 'lost {status}', lost: 'lost', partOverloaded: 'part {status} overloaded', partStatus: 'part {status}', part: 'part',
    landedFile: 'landed {file}', landedChange: 'landed', continueHint: 'continue hint', retryHint: 'retry hint',
    cutOff: 'Cut off.', continue: 'Continue', stoppedHere: 'Stopped here: {reason}.', notNow: 'Not now',
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
const STRINGS = { errorTitle: 'Something went wrong', errorCutOffTitle: 'Cut off. Retry sends it again.', errorReason: REASONS, failure: FAILURE };
const NOW = 1_000_000_000;
const prompt = { text: 'Make the Order ahead button stand out more' };
const ctx: FailureContext = { harness: 'claude', plan: 'max', other: { ready: true }, hasBillingLink: true, now: NOW };

type ErrorRow = Extract<TranscriptItem, { kind: 'error' }>;
const error = (over: Partial<ErrorRow> = {}): ErrorRow => ({ kind: 'error', id: 'x', message: 'API Error: 529', code: 'api_error', apiErrorStatus: 529, retry: prompt, ...over });
const call = (id: string, kind: ToolCallView['kind'], target: string, status: ToolCallView['status'] = 'completed', name = 'Edit'): ToolCallView =>
  ({ toolCallId: id, name, kind, title: name, target, status, displayStatus: status, startedAt: 0 });
const user: TranscriptItem = { kind: 'user', id: 'u', text: prompt.text };
const reads: TranscriptItem = { kind: 'tools', id: 'r', calls: [call('r1', 'read', 'src/OrderButton.tsx', 'completed', 'Read')] };
const edit: TranscriptItem = { kind: 'tools', id: 'e', calls: [call('e1', 'edit', 'src/components/OrderButton.tsx')] };

const primary = (line: FailureLineView) => line.actions.at(-1);
const offersSwitch = (line: { actions: readonly { kind: string }[] }) => line.actions.find((action) => action.kind === 'switch-agent')?.kind;

function read(items: TranscriptItem[], over: Partial<ErrorRow> = {}, context = ctx) {
  const all = [...items, error(over)];
  return failureLine(error(over), context, failedTurnFacts(all, all.length - 1), STRINGS);
}

describe('a failed turn reads as one line (ONL-2973)', () => {
  test('a service failure before anything changed offers Retry with its prompt', () => {
    const line = read([user, reads]);
    expect(line.kind).toBe('line');
    expect(line.kind === 'line' ? primary(line.line) : undefined).toEqual({ kind: 'retry', prompt });
  });

  test('a service failure after an edit landed offers Continue, never Retry, and names the file on hover', () => {
    const line = read([user, reads, edit]);
    expect(line.kind === 'line' ? primary(line.line) : undefined).toEqual({ kind: 'continue' });
    expect(line.kind === 'line' ? line.line.detail : undefined).toContain('OrderButton.tsx');
  });

  test('the hover names the last change that went through, since nothing after it ran', () => {
    const second: TranscriptItem = { kind: 'tools', id: 'e2', calls: [call('e2', 'edit', 'src/styles/tokens.css')] };
    const line = read([user, edit, second]);
    expect(line.kind === 'line' ? line.line.detail : undefined).toContain('tokens.css');
  });

  test('an edit that never completed has not landed', () => {
    const line = read([user, { kind: 'tools', id: 'e', calls: [call('e1', 'edit', 'a.tsx', 'failed')] }]);
    expect(line.kind === 'line' ? primary(line.line)?.kind : undefined).toBe('retry');
  });

  test('an edit from an earlier turn does not make this one partly landed', () => {
    const line = read([user, edit, { kind: 'assistant-text', id: 'a', text: 'Done.', isStreaming: false }, { ...user, id: 'u2' }, reads]);
    expect(line.kind === 'line' ? primary(line.line)?.kind : undefined).toBe('retry');
  });

  test('a crash after an edit landed still offers Retry: Continue is for service failures alone', () => {
    const line = read([user, edit], { code: 'spawn_failed', message: '', apiErrorStatus: undefined });
    expect(line.kind === 'line' ? primary(line.line)?.kind : undefined).toBe('retry');
  });

  test('a failure after the turn offered next tasks still draws its line and its actions', () => {
    const offer: TranscriptItem = { kind: 'tools', id: 'n', calls: [call('n1', 'other', '', 'completed', SUGGEST_NEXT_TASKS_TOOL)] };
    const line = read([user, reads, offer]);
    expect(line.kind === 'line' ? line.line.actions : 'gone').toEqual([{ kind: 'switch-agent', harness: 'codex', ready: true, prompt }, { kind: 'retry', prompt }]);
  });

  test('the action leaves once a later turn has started', () => {
    const items = [user, reads, error(), { ...user, id: 'u2' }];
    const facts = failedTurnFacts(items, 2);
    expect(facts.isLatest).toBe(false);
    const line = failureLine(error(), ctx, facts, STRINGS);
    expect(line.kind === 'line' ? primary(line.line) : 'gone').toBeUndefined();
  });

  test('a limit or billing failure is a notice, not a line', () => {
    expect(read([user], { code: 'rate_limited', limit: { window: 'session', resetsAt: NOW / 1000 + 3600 } }).kind).toBe('notice');
    expect(read([user], { code: 'billing_error' }).kind).toBe('notice');
    expect(read([user], { code: 'usage_limit_exceeded', apiErrorStatus: undefined }).kind).toBe('notice');
  });

  test('a refused key is a line with nothing to press', () => {
    const line = read([user], { code: 'credential_rejected', apiErrorStatus: undefined }, { ...ctx, plan: 'api-key' });
    expect(line.kind).toBe('line');
    expect(line.kind === 'line' ? primary(line.line) : 'gone').toBeUndefined();
  });

  test("a subscription's refused sign-in stays the sign-in card's", () => {
    expect(failureLine(error({ code: 'credential_rejected' }), { ...ctx, plan: 'max' }, failedTurnFacts([error()], 0), STRINGS).kind).toBe('none');
  });

  test('a change that names no file is told on hover without naming a tool', () => {
    const rename: ToolCallView = { toolCallId: 'm1', name: 'mcp__studio__rename', kind: 'edit', title: 'rename project', status: 'completed', displayStatus: 'completed', startedAt: 0 };
    const line = read([user, { kind: 'tools', id: 'm', calls: [rename] }]);
    expect(line.kind === 'line' ? primary(line.line) : undefined).toEqual({ kind: 'continue' });
    expect(line.kind === 'line' ? line.line.detail : undefined).toBe('part 529 overloaded landed continue hint');
  });

  test('once the action has gone, the hover no longer offers it', () => {
    const later = (items: TranscriptItem[]) => {
      const all = [...items, error(), { ...user, id: 'u2' }];
      const line = failureLine(error(), ctx, failedTurnFacts(all, items.length), STRINGS);
      return line.kind === 'line' ? line.line.detail : undefined;
    };
    expect(later([user, reads, edit])).toBe('part 529 overloaded landed OrderButton.tsx');
    expect(later([user, reads])).toBe('lost 529 overloaded');
    const now = read([user, reads]);
    expect(now.kind === 'line' ? now.line.detail : undefined).toBe('lost 529 overloaded retry hint');
  });

  test("a limit notice leaves a line naming why, offering the notice's action and no Retry before the reset", () => {
    const at = NOW + 3_600_000;
    const limit = read([user], { code: 'rate_limited', limit: { window: 'session', resetsAt: at / 1000 } });
    expect(limit.kind).toBe('notice');
    if (limit.kind !== 'notice') return;
    expect(limit.line.lead).toBe('Stopped here: limit.');
    expect(limit.actions).toEqual([{ kind: 'switch-agent', harness: 'codex', ready: true, prompt }]);
    expect(limit.line.actions).toEqual([{ kind: 'switch-agent', harness: 'codex', ready: true, prompt }]);
  });

  test('once the reset has passed, the limit line offers Retry', () => {
    const at = NOW + 3_600_000;
    const over = { code: 'rate_limited', limit: { window: 'session', resetsAt: at / 1000 } } as const;
    const all = [user, error(over)];
    const later = failureLine(error(over), { ...ctx, now: at + 1 }, failedTurnFacts(all, 1), STRINGS);
    expect(later.kind === 'line' || later.kind === 'notice' ? later.line.actions.map((action) => action.kind) : 'gone').toContain('retry');
  });

  test('a limit with no reset time offers Retry on its line beside the switch', () => {
    const limit = read([user], { code: 'usage_limit_exceeded', message: '', apiErrorStatus: undefined });
    expect(limit.kind === 'notice' ? limit.line.actions.map((action) => action.kind) : 'not a notice').toEqual(['switch-agent', 'retry']);
  });

  test('a weekly limit with no other agent offers nothing on its line until the reset', () => {
    const at = NOW + 3 * 86_400_000;
    const limit = read([user], { code: 'rate_limited', limit: { window: 'weekly', resetsAt: at / 1000 } }, { ...ctx, other: undefined } as FailureContext);
    expect(limit.kind === 'notice' ? limit.line.actions : 'not a notice').toEqual([]);
    expect(limit.kind === 'notice' ? limit.line.detail : undefined).toContain(String(at));
  });

  test('a notice offers nothing once a later turn has started', () => {
    const items = [user, error({ code: 'billing_error' }), { ...user, id: 'u2' }];
    const notice = failureLine(error({ code: 'billing_error' }), ctx, failedTurnFacts(items, 1), STRINGS);
    expect(notice.kind === 'notice' ? [notice.actions, notice.line.actions] : 'not a notice').toEqual([[], []]);
  });

  test("a crash's or a silent failure's hover promises Retry only while Retry is offered", () => {
    const hover = (over: Partial<ErrorRow>, later: boolean) => {
      const all = [user, error(over), ...(later ? [{ ...user, id: 'u2' }] : [])];
      const line = failureLine(error(over), ctx, failedTurnFacts(all, 1), STRINGS);
      return line.kind === 'line' ? line.line.detail : undefined;
    };
    const crash = { code: 'spawn_failed', message: '', apiErrorStatus: undefined } as const;
    const silent = { code: 'unknown', message: '', apiErrorStatus: undefined } as const;
    expect(hover(crash, false)).toBe('crash reason crash retry');
    expect(hover(crash, true)).toBe('crash reason');
    expect(hover(silent, false)).toBe('failed reason failed retry');
    expect(hover(silent, true)).toBe('failed reason');
  });

  test("a limit notice's line names the switch only while the switch is offered", () => {
    const over = { code: 'usage_limit_exceeded', message: '', apiErrorStatus: undefined } as const;
    const now = read([user], over);
    expect(now.kind === 'notice' ? now.line.detail : undefined).toBe('short unknown short switch');
    const items = [user, error(over), { ...user, id: 'u2' }];
    const later = failureLine(error(over), ctx, failedTurnFacts(items, 1), STRINGS);
    expect(later.kind === 'notice' ? later.line.detail : undefined).toBe('short unknown');
  });

  test("the provider's own words about a limit stay out of the notice and ride only in its line's hover", () => {
    const over = { code: 'usage_limit_exceeded', message: 'Monthly cap hit.', apiErrorStatus: undefined } as const;
    const notice = read([user], over);
    expect(notice.kind === 'notice' ? [notice.body, notice.line.detail] : 'not a notice').toEqual(['short unknown short switch', 'short unknown Monthly cap hit. short switch']);
  });

  test("Claude's own reason for turning a request away replaces the wait promise in its line's hover (ONL-3042)", () => {
    const line = read([user], { code: 'api_error', apiErrorStatus: 429, message: 'Usage credits are required for long context requests' });
    expect(line.kind === 'line' ? line.line.detail : 'not a line').toBe('Usage credits are required for long context requests');
    const silent = read([user], { code: 'api_error', apiErrorStatus: 429, message: '  ' });
    expect(silent.kind === 'line' ? silent.line.detail : 'not a line').toBe('short 429');
  });

  test("Claude's reason beside a known reset rides in the limit line's hover, not the notice (ONL-3042)", () => {
    const notice = read([user], { code: 'api_error', apiErrorStatus: 429, message: 'Usage credits are required for long context requests', limit: { window: 'session', resetsAt: (NOW + 3_600_000) / 1000 } });
    expect(notice.kind === 'notice' ? [notice.body, notice.line.detail] : 'not a notice').toEqual([`short ${NOW + 3_600_000} short switch`, `short ${NOW + 3_600_000} Usage credits are required for long context requests short switch`]);
  });

  test('a failure with no prompt behind it offers no Retry', () => {
    const line = read([user, reads], { retry: undefined });
    expect(line.kind === 'line' ? line.line.actions.some((action) => action.kind === 'retry') : 'gone').toBe(false);
  });
});

describe('a failed line offers the other agent where the card did (ONL-2958)', () => {
  test('on a service failure, too many requests and a silent failure, and nowhere else', () => {
    const offers = (over: Partial<ErrorRow>) => {
      const reading = read([user], over);
      return reading.kind === 'line' ? offersSwitch(reading.line) : undefined;
    };
    expect(offers({})).toBe('switch-agent');
    expect(offers({ code: 'api_error', apiErrorStatus: 429, message: '' })).toBe('switch-agent');
    expect(offers({ code: 'unknown', message: '' })).toBe('switch-agent');
    expect(offers({ code: 'spawn_failed', message: '' })).toBeUndefined();
  });

  test('only while the failed turn is the latest', () => {
    const items: TranscriptItem[] = [user, error(), { kind: 'user', id: 'u2', text: 'again' }];
    const reading = failureLine(error(), ctx, failedTurnFacts(items, 1), STRINGS);
    expect(reading.kind === 'line' ? offersSwitch(reading.line) : 'not a line').toBeUndefined();
  });
});
