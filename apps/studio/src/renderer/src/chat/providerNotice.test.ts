import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChatPanel } from '@studio/chat-ui';
import {
  emptyState,
  foldSessionState,
  STALL_NOTICE_MS,
  type ProviderNotice,
  type SessionState,
  type StudioEvent,
  type TranscriptItem,
} from '@studio/events';
import { CHAT_FIXTURE_STRINGS } from '../dev/ChatFixture.js';
import { ForwardIcon } from '../icons/glyphs.js';
import { t } from '@studio/i18n';
import { providerNotice, providerNoticeDueAt, RETRY_NOTICE_MS } from './providerNotice.js';

const NOW = 1_800_000_000_000;

const AGENT = t('agent.name.claude');

function retryLine(words: string, detail: string): NonNullable<ProviderNotice['line']> {
  return { words, doing: t('chat.retryLine.doing'), detail };
}

const OVERLOADED_SECOND_ATTEMPT = retryLine(
  t('chat.retryLine.overloaded', { agent: AGENT, status: 529 }),
  t('chat.retryLine.overloadedAttempt', { agent: AGENT, status: 529, attempt: 2 }),
);

function live(over: Partial<SessionState> = {}): SessionState {
  return { ...emptyState, isStreaming: true, turnStartedAt: NOW - 1_000, ...over };
}

describe('providerNotice — the retry line (ONL-2491)', () => {
  it('recovers quietly and gives the next interruption its own grace period (ONL-2880)', () => {
    const events: StudioEvent[] = [
      { type: 'turn.started', turnId: 't1', sessionId: 's1', eventId: 'e1', seq: 1, ts: NOW },
      { type: 'session.retrying', status: 503, sessionId: 's1', eventId: 'e2', seq: 2, ts: NOW + 1_000 },
    ];
    expect(providerNotice(foldSessionState(events), NOW + 2_000)).toBeUndefined();
    events.push({ type: 'text.start', blockId: 'b1', sessionId: 's1', eventId: 'e3', seq: 3, ts: NOW + 3_000 });
    expect(providerNoticeDueAt(foldSessionState(events))).toBeUndefined();
    expect(providerNotice(foldSessionState(events), NOW + 12_000)).toBeUndefined();
    events.push({ type: 'session.retrying', status: 503, sessionId: 's1', eventId: 'e4', seq: 4, ts: NOW + 15_000 });
    expect(providerNotice(foldSessionState(events), NOW + 16_000)).toBeUndefined();
    expect(providerNotice(foldSessionState(events), NOW + 25_000)?.state).toBe('retrying');
    events.push({ type: 'turn.ended', turnId: 't1', sessionId: 's1', eventId: 'e5', seq: 5, ts: NOW + 26_000 });
    expect(providerNotice(foldSessionState(events), NOW + 30_000)).toBeUndefined();
    expect(providerNoticeDueAt(foldSessionState(events))).toBeUndefined();
  });

  it('schedules the first notice crossing even without another event (ONL-2880)', () => {
    expect(providerNoticeDueAt(live({ retrying: { status: null }, retryingSince: NOW }))).toBe(NOW + RETRY_NOTICE_MS);
    expect(providerNoticeDueAt(live({ silentSince: NOW }))).toBe(NOW + STALL_NOTICE_MS);
    expect(providerNoticeDueAt(live({ retrying: { status: null }, retryingSince: NOW, silentSince: NOW }))).toBe(NOW + RETRY_NOTICE_MS);
    expect(providerNoticeDueAt(live({ retrying: { status: null }, retryingSince: NOW + STALL_NOTICE_MS, silentSince: NOW }))).toBe(NOW + STALL_NOTICE_MS);
    expect(providerNoticeDueAt(live())).toBeUndefined();
    expect(providerNoticeDueAt(live({ isStreaming: false, retryingSince: NOW }))).toBeUndefined();
    expect(providerNoticeDueAt(live({ retryingSince: NOW }))).toBeUndefined();
    expect(providerNoticeDueAt(live({ retrying: { status: 403, kind: 'cloud_credential_error' }, retryingSince: NOW }))).toBeUndefined();
  });

  it('keeps brief provider retries quiet, then shows the latest attempt at the deadline (ONL-2880)', () => {
    const state = live({ retrying: { attempt: 1, status: 529 }, retryingSince: NOW });
    expect(providerNotice(state, NOW)).toBeUndefined();
    expect(providerNotice(state, NOW + 9_999)).toBeUndefined();
    expect(providerNotice({ ...state, retrying: { attempt: 2, status: 529 } }, NOW + 10_000)).toEqual({
      state: 'retrying', text: t('chat.notice.retryAttempt', { attempt: 2 }), line: OVERLOADED_SECOND_ATTEMPT,
    });
  });

  it('gives uncounted retries the same grace period (ONL-2880)', () => {
    const state = live({ retrying: { status: null }, retryingSince: NOW });
    expect(providerNotice(state, NOW + 9_999)).toBeUndefined();
    expect(providerNotice(state, NOW + 10_000)?.text).toBe(t('chat.notice.retryPlain'));
  });

  it('does not delay credential refusals (ONL-2880)', () => {
    for (const retrying of [
      { status: null, kind: 'cloud_credential_error' },
      { status: 401, kind: 'authentication_failed' },
      { status: 403, kind: 'authentication_failed' },
    ]) {
      expect(providerNotice(live({ retrying, retryingSince: NOW }), NOW)?.text).toBe(t('chat.notice.credentialPlain'));
    }
  });

  it('keeps an already due silence notice visible during the retry grace (ONL-2880)', () => {
    const state = live({ retrying: { status: null }, retryingSince: NOW, silentSince: NOW - STALL_NOTICE_MS });
    expect(providerNotice(state, NOW)?.state).toBe('silent');
    expect(providerNotice(state, NOW + 10_000)?.state).toBe('retrying');
  });

  it('names the attempt the backend counted', () => {
    const notice = providerNotice(live({ retrying: { attempt: 2, status: 529 } }), NOW);

    expect(notice).toEqual({
      state: 'retrying', text: t('chat.notice.retryAttempt', { attempt: 2 }), line: OVERLOADED_SECOND_ATTEMPT,
    });
    expect(notice?.text).toContain('2');
  });

  it('drops the count rather than an unfilled placeholder when no backend counted', () => {
    const notice = providerNotice(live({ retrying: { status: null } }), NOW);

    expect(notice).toEqual({
      state: 'retrying',
      text: t('chat.notice.retryPlain'),
      line: retryLine(t('chat.retryLine.provider', { agent: t('agent.name.claude') }), t('chat.notice.retryPlain')),
    });
    expect(notice?.text).not.toContain('{');
  });

  it('a cloud credential error reads as a refused credential, never as a silent endpoint (ONL-2491)', () => {
    const counted = providerNotice(live({ retrying: { attempt: 3, status: 403, kind: 'cloud_credential_error' } }), NOW);
    expect(counted).toEqual({
      state: 'retrying',
      text: t('chat.notice.credentialAttempt', { attempt: 3 }),
      line: retryLine(t('chat.retryLine.credential'), t('chat.notice.credentialAttempt', { attempt: 3 })),
    });

    // Any status, including none at all: the kind alone is the refusal.
    const uncounted = providerNotice(live({ retrying: { status: null, kind: 'cloud_credential_error' } }), NOW);
    expect(uncounted).toEqual({
      state: 'retrying',
      text: t('chat.notice.credentialPlain'),
      line: retryLine(t('chat.retryLine.credential'), t('chat.notice.credentialPlain')),
    });
  });

  it('an authentication failure is a refused credential at 401 and 403, and nothing else', () => {
    for (const status of [401, 403]) {
      expect(providerNotice(live({ retrying: { attempt: 1, status, kind: 'authentication_failed' } }), NOW)?.text).toBe(
        t('chat.notice.credentialAttempt', { attempt: 1 }),
      );
    }

    // A 500 under the same kind is the provider failing, not the credential.
    expect(
      providerNotice(live({ retrying: { attempt: 1, status: 500, kind: 'authentication_failed' } }), NOW)?.text,
    ).toBe(t('chat.notice.retryAttempt', { attempt: 1 }));
  });

  it('a kind the rule does not name stays the not-responding line', () => {
    expect(providerNotice(live({ retrying: { attempt: 4, status: 529, kind: 'overloaded' } }), NOW)?.text).toBe(
      t('chat.notice.retryAttempt', { attempt: 4 }),
    );
  });

  it('carries no denominator: a no-response retry caps itself (ONL-2491)', () => {
    const notice = providerNotice(live({ retrying: { attempt: 2, status: 529 } }), NOW);
    expect(notice?.text).not.toContain('/');
    expect(notice?.text).not.toContain(' of ');
  });
});

describe('providerNotice — the silence line (ONL-2491)', () => {
  it('shows once the elapsed silence passes the threshold', () => {
    const notice = providerNotice(live({ silentSince: NOW - STALL_NOTICE_MS }), NOW, 'Claude');

    expect(notice).toMatchObject({ state: 'silent', seconds: STALL_NOTICE_MS / 1000 });
  });

  it('stays away below the threshold', () => {
    expect(providerNotice(live({ silentSince: NOW - (STALL_NOTICE_MS - 1) }), NOW)).toBeUndefined();
  });

  it('counts the whole seconds the agent has been silent, so the line can say how long (ONL-2903)', () => {
    const notice = providerNotice(live({ silentSince: NOW - 40_900 }), NOW, 'Claude');

    expect(notice?.seconds).toBe(40);
    expect(notice?.text).not.toContain('{');
  });

  it('a turn that has heard nothing and has no silence stamp shows nothing', () => {
    expect(providerNotice(live(), NOW)).toBeUndefined();
  });
});

describe('providerNotice — which notice wins, and when neither does (ONL-2491)', () => {
  it('the retry wins over the silence, because it names a cause (ONL-2491)', () => {
    const notice = providerNotice(
      live({ retrying: { attempt: 2, status: 529 }, silentSince: NOW - STALL_NOTICE_MS * 2 }),
      NOW,
    );

    expect(notice).toEqual({
      state: 'retrying', text: t('chat.notice.retryAttempt', { attempt: 2 }), line: OVERLOADED_SECOND_ATTEMPT,
    });
  });

  it('a settled session shows nothing, whatever the fields hold', () => {
    const idle: SessionState = {
      ...emptyState,
      isStreaming: false,
      retrying: { attempt: 2, status: 529 },
      silentSince: NOW - STALL_NOTICE_MS * 2,
    };

    expect(providerNotice(idle, NOW)).toBeUndefined();
  });

  it('a restored session carrying a days-old turn start shows nothing (the stale-notice pin)', () => {
    const restored: SessionState = {
      ...emptyState,
      isStreaming: false,
      silentSince: NOW - 3 * 24 * 60 * 60 * 1000,
    };

    expect(providerNotice(restored, NOW)).toBeUndefined();
  });
});

const PROMPT: TranscriptItem = { kind: 'user', id: 'u1', text: 'Make the hero two columns.' };

function panel(notice?: ProviderNotice, onStopAndResend?: () => void): string {
  return renderToStaticMarkup(
    createElement(ChatPanel, {
      state: live({ items: [PROMPT] }),
      ...(notice ? { notice } : {}),
      ...(onStopAndResend ? { onStopAndResend } : {}),
      connection: { status: 'ok' },
      strings: CHAT_FIXTURE_STRINGS,
      composerValue: '',
      onComposerChange: () => undefined,
      onSend: () => undefined,
      onInterrupt: () => undefined,
      onRespond: () => undefined,
      onCopy: () => undefined,
      chevronIcon: ForwardIcon,
    }),
  );
}

/** The row's own markup: a `data-notice` on the transcript must not answer for the row. */
function noticeRow(markup: string): string {
  const at = markup.indexOf('data-testid="chat-provider-notice"');
  expect(at).toBeGreaterThan(-1);
  const next = markup.indexOf('data-testid="', at + 1);
  return markup.slice(markup.lastIndexOf('<', at), next === -1 ? markup.length : next);
}

function tagAt(markup: string, testid: string): string {
  const at = markup.indexOf(`data-testid="${testid}"`);
  expect(at).toBeGreaterThan(-1);
  return markup.slice(markup.lastIndexOf('<', at), markup.indexOf('>', at) + 1);
}

describe('the notice in a rendered panel (ONL-2491)', () => {
  it('publishes its state on the row and on the transcript, with Stop still in reach (ONL-2491)', () => {
    const text = t('chat.notice.retryAttempt', { attempt: 2 });
    const markup = panel({ state: 'retrying', text });

    expect(noticeRow(markup)).toContain('data-notice="retrying"');
    expect(noticeRow(markup)).toContain(text);
    expect(tagAt(markup, 'chat-transcript')).toContain('data-notice="retrying"');
    // The one button, carrying Astryx's stop label while the turn runs.
    expect(tagAt(markup, 'chat-send')).toContain('aria-label="Stop"');
  });

  it('the silence state reads on the same attribute, one row and one test id (ONL-2491)', () => {
    const markup = panel({ state: 'silent', text: t('chat.notice.silent', { agent: 'Claude', seconds: 30 }) });

    expect(noticeRow(markup)).toContain('data-notice="silent"');
    expect(markup.split('data-testid="chat-provider-notice"')).toHaveLength(2);
    expect(tagAt(markup, 'chat-transcript')).toContain('data-notice="silent"');
  });

  it('offers Stop and send again on silence alone, and only where the host can do it (ONL-2903)', () => {
    const silent = { state: 'silent' as const, text: 'quiet' };
    expect(panel(silent, () => undefined)).toContain('data-testid="chat-notice-stop-and-resend"');
    expect(panel(silent)).not.toContain('chat-notice-stop-and-resend');
    expect(panel({ state: 'retrying', text: 'retrying' }, () => undefined)).not.toContain('chat-notice-stop-and-resend');
  });

  it('with no notice the transcript still publishes the state, as none (ONL-2491)', () => {
    const markup = panel();

    expect(markup).not.toContain('chat-provider-notice');
    expect(tagAt(markup, 'chat-transcript')).toContain('data-notice="none"');
  });

  it('the sentence is announced from its own live region, and the clock is outside it', () => {
    const text = t('chat.notice.silent');
    const markup = panel({ state: 'silent', text });
    const row = noticeRow(markup);

    // Scoped to the row: every Astryx button carries an empty `role="status"`, so a
    // bare lookup reads "" and passes with no notice on screen at all.
    expect(row).toContain('role="status"');
    expect(row.indexOf('role="status"')).toBeLessThan(row.indexOf(text));
    // The turn timer is a sibling row ahead of the notice, never inside the region.
    expect(markup.indexOf('data-testid="chat-turn-timer"')).toBeLessThan(
      markup.indexOf('data-testid="chat-provider-notice"'),
    );
  });
});

describe('a retry as one line (ONL-2973)', () => {
  it('names the overloaded service and its status, with the attempt kept for hover', () => {
    const line = providerNotice(live({ retrying: { attempt: 3, status: 529 }, retryingSince: NOW - RETRY_NOTICE_MS }), NOW, 'Claude')?.line;
    expect(line?.words).toContain('529');
    expect(line?.detail).toContain('3');
    expect(line?.doing).not.toBe('');
  });

  it('keeps the retry wording for a failure that is not an overload', () => {
    const notice = providerNotice(live({ retrying: { attempt: 2, status: 503 }, retryingSince: NOW - RETRY_NOTICE_MS }), NOW);
    expect(notice?.line?.detail).toBe(notice?.text);
  });

  it('hides the turn clock while the retry line shows, and only then', () => {
    const notice = providerNotice(live({ retrying: { attempt: 3, status: 529 }, retryingSince: NOW - RETRY_NOTICE_MS }), NOW, 'Claude')!;
    const markup = panel(notice);
    expect(markup).toContain('data-testid="chat-retry-line"');
    expect(markup).not.toContain('data-testid="chat-turn-timer"');
    expect(panel(providerNotice(live({ silentSince: NOW - STALL_NOTICE_MS }), NOW))).toContain('data-testid="chat-turn-timer"');
  });
});
