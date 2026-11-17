import { describe, expect, it } from 'bun:test';
import { formatReset, planLimits, limitCardReport, limitCardReports, nextLimitReset, recordLiveError, NO_LIVE_ERRORS, type LiveErrors } from './limitCopy.js';
import { failureRow } from '@studio/chat-ui';
import { foldSessionState, type HarnessId, type StudioEvent, type TranscriptItem } from '@studio/events';
import { CHAT_FIXTURE_STRINGS } from '../dev/ChatFixture.js';
import { failureStrings } from './failureStrings.js';

describe('limit copy uses provider seconds and the designer’s clock', () => {
  it('counts exactly the live limit and billing cards rendered for either agent', () => {
    const strings = { ...CHAT_FIXTURE_STRINGS, failure: failureStrings('Claude', 'ChatGPT') };
    const errors: Partial<Extract<TranscriptItem, { kind: 'error' }>>[] = [
      { code: 'api_error', apiErrorStatus: 429 },
      { code: 'api_error', apiErrorStatus: 400 },
      { code: 'api_error', apiErrorStatus: 401 },
      { code: 'api_error', apiErrorStatus: 500 },
      { code: 'api_error' },
      { code: 'usage_limit_exceeded' },
      { code: 'rate_limited' },
      { code: 'billing_error' },
      { code: 'credential_rejected' },
      { code: 'unknown' },
    ];
    for (const agent of ['claude', 'codex'] satisfies HarnessId[]) {
      for (const error of errors) {
        for (const limit of [undefined, { window: 'session' as const, resetsAt: 2_000 }, { window: 'weekly' as const, resetsAt: 2_000 }]) {
          const item = { kind: 'error' as const, id: 'live', message: 'private provider reason', ...error, limit };
          const view = failureRow(item, { harness: agent, hasBillingLink: true, now: 1_000 }, strings);
          const isCard = view !== undefined && ['limit-reset', 'limit-weekly', 'limit-unknown', 'too-many', 'billing'].includes(view.cause);
          const report = limitCardReport(item, agent, new Set(['live']));
          expect(report !== undefined).toBe(isCard);
          if (isCard) expect(report).toEqual({ agent, window_kind: limit?.window ?? (item.code === 'billing_error' ? 'credits' : 'unknown') });
          expect(limitCardReport(item, agent, new Set())).toBeUndefined();
        }
      }
    }
  });
  it('reports credits and plan cards, never other errors or provider prose', () => {
    const liveIds = new Set(['e1', 'e2', 'e3']);
    expect(limitCardReport({ kind: 'error', id: 'e1', code: 'billing_error', message: 'private message' }, 'claude', liveIds)).toEqual({ agent: 'claude', window_kind: 'credits' });
    expect(limitCardReport({ kind: 'error', id: 'e2', code: 'rate_limited', message: 'private message', limit: { window: 'weekly' } }, 'codex', liveIds)).toEqual({ agent: 'codex', window_kind: 'weekly' });
    expect(limitCardReport({ kind: 'error', id: 'e3', code: 'api_error', message: 'private message' }, 'claude', liveIds)).toBeUndefined();
  });
  it('does not report restored cards after a mount or relaunch', () => {
    const restored = { kind: 'error' as const, id: 'old', code: 'billing_error' as const, message: 'private message' };
    expect(limitCardReport(restored, 'claude', new Set())).toBeUndefined();
    expect(limitCardReport(restored, 'claude', new Set(['new']))).toBeUndefined();
  });
  const now = new Date(2026, 9, 13, 14, 0).getTime();
  const reset = new Date(2026, 9, 13, 16, 10).getTime();
  it('names the next day after midnight', () => {
    expect(formatReset(new Date(2026, 9, 14, 0, 10).getTime(), now, 'en-US')).toContain('Wed');
  });
  it('shows every reported row without inventing absent usage or a clock', () => {
    const rows = planLimits([{ kind: 'five_hour', usedPercent: 0, resetsAt: reset / 1000 }, { kind: 'seven_day' }, { kind: 'new_window', label: 'Extra allowance', usedPercent: 42 }], now, 'en-US');
    expect(rows).toHaveLength(3);
    expect(rows[0]?.percentLabel).toBe('0%');
    expect(rows[0]?.resetLabel).toContain('4:10 PM');
    expect(rows[1]?.percent).toBeUndefined();
    expect(rows[1]?.percentLabel).toBe('');
    expect(rows[1]?.resetLabel).toBe('');
    expect(rows[2]?.label).toBe('Extra allowance');
  });
  it('omits expired window readings and clocks until the provider refreshes them', () => {
    const rows = planLimits([
      { kind: 'five_hour', usedPercent: 100, resetsAt: now / 1000 },
      { kind: 'seven_day', usedPercent: 30, resetsAt: reset / 1000 },
      { kind: 'overage', usedPercent: 42 },
    ], now, 'en-US');
    expect(rows.map((row) => row.id)).toEqual(['seven_day', 'overage']);
    expect(rows[0]?.percent).toBe(30);
    expect(rows[0]?.resetLabel).toContain('4:10 PM');
  });
  it('schedules only the next future reset, then advances without polling', () => {
    const windows = [{ kind: 'five_hour', resetsAt: reset / 1000 }, { kind: 'seven_day', resetsAt: reset / 1000 + 86400 }, { kind: 'overage' }];
    expect(nextLimitReset(windows, now)).toBe(reset);
    expect(nextLimitReset(windows, reset)).toBe(reset + 86400000);
    expect(nextLimitReset(windows, reset + 86400000)).toBeUndefined();
  });
});

describe('a limit card is counted once, when its error happens with the chat open', () => {
  const event = (sessionId: string, eventId: string, ts: number, extra: object): StudioEvent =>
    ({ sessionId, cwd: '/w', eventId, seq: Number(eventId.slice(1)), ts, ...extra }) as unknown as StudioEvent;
  const limitError = { type: 'session.error', message: '', code: 'rate_limited' };

  function hear(events: readonly StudioEvent[], openedAt: number, live: LiveErrors = NO_LIVE_ERRORS) {
    for (const heard of events) live = recordLiveError(live, heard, openedAt);
    return { items: foldSessionState(events).items, live };
  }

  it('skips a limit error a resumed session restores on the live stream, and counts a new one', () => {
    const openedAt = 1_000;
    const { items, live } = hear([
      event('s1', 'e1', 10, { type: 'turn.started', turnId: 't1' }),
      event('s1', 'e2', 10, { ...limitError, turnId: 't1' }),
      event('s1', 'e3', 10, { type: 'turn.ended', turnId: 't1' }),
      event('s1', 'e4', openedAt + 5, { type: 'turn.started', turnId: 't2' }),
      event('s1', 'e5', openedAt + 5, { ...limitError, turnId: 't2' }),
    ], openedAt);
    const reported = new Set<string>();
    expect(items.filter((item) => item.kind === 'error')).toHaveLength(2);
    expect(limitCardReports(items, 'claude', 's1', live, reported)).toHaveLength(1);
    expect(limitCardReports(items, 'claude', 's1', live, reported)).toHaveLength(0);
  });

  it('counts a new session\'s limit error even when its event id repeats an earlier session\'s', () => {
    const openedAt = 1_000;
    const reported = new Set<string>();
    const first = hear([event('s1', 'e1', openedAt, limitError)], openedAt);
    expect(limitCardReports(first.items, 'claude', 's1', first.live, reported)).toHaveLength(1);
    const second = hear([event('s2', 'e1', openedAt + 1, limitError)], openedAt, first.live);
    expect(limitCardReports(second.items, 'claude', 's2', second.live, reported)).toHaveLength(1);
  });
});
