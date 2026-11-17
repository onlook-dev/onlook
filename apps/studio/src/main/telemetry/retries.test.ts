import { describe, expect, it } from 'bun:test';
import type { StudioEvent } from '@studio/events';
import { retryTelemetry } from './retries.js';

const retry = (status: number | null, kind?: string): StudioEvent => ({
  type: 'session.retrying', sessionId: 'session', eventId: 'retry', seq: 1, ts: 1, status,
  ...(kind === undefined ? {} : { kind }),
});

describe('retryTelemetry', () => {
  it('counts Claude notifications, not the provider attempt ordinal, and retains null response status', () => {
    expect(retryTelemetry([retry(503, 'overloaded'), retry(null)], true)).toEqual({
      retry_attempts: 2, retry_observed_count: 2, retry_last_status: null, retry_error_kind: 'overloaded',
    });
  });

  it('never substitutes zero for unavailable Codex attempt counts', () => {
    expect(retryTelemetry([], false)).toEqual({
      retry_attempts: null, retry_observed_count: 0, retry_last_status: null, retry_error_kind: null,
    });
    expect(retryTelemetry([retry(429, 'rate_limit')], false)).toMatchObject({
      retry_attempts: null, retry_observed_count: 1, retry_last_status: 429,
    });
  });

  it('stops at the previous result and refuses arbitrary provider text', () => {
    const ended: StudioEvent = { type: 'turn.ended', sessionId: 'session', eventId: 'end', seq: 2, ts: 2, turnId: 'previous' };
    expect(retryTelemetry([retry(401, 'authentication_failed'), ended, retry(900, '/private/account')], true)).toEqual({
      retry_attempts: 1, retry_observed_count: 1, retry_last_status: null, retry_error_kind: null,
    });
  });
});
