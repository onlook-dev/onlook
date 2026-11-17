import { describe, expect, it } from 'bun:test';
import { failureOwner, isResizeObserverNotice } from './error-classification.js';

describe('bounded error classification', () => {
  it('matches exact browser notices, not arbitrary ResizeObserver failures', () => {
    expect(isResizeObserverNotice('ResizeObserver loop completed with undelivered notifications.')).toBe(true);
    expect(isResizeObserverNotice('ResizeObserver loop limit exceeded')).toBe(true);
    expect(isResizeObserverNotice('ResizeObserver loop failed unexpectedly')).toBe(false);
  });

  it('recognizes connection failures, not broken request construction or arbitrary messages', () => {
    for (const code of ['ERR_CONNECTION_RESET', 'ERR_NAME_NOT_RESOLVED', 'ERR_INTERNET_DISCONNECTED', 'ERR_NETWORK_CHANGED', 'ERR_TIMED_OUT', 'ERR_CERT_DATE_INVALID', 'ERR_CONNECTION_REFUSED']) {
      expect(failureOwner(new Error(`net::${code} (-101)`))).toBe('environment');
    }
    for (const message of ['net::ERR_INVALID_URL', 'net::ERR_FAILED', 'net::ERR_UNKNOWN', 'failed because net::ERR_CONNECTION_RESET', 'net::ERR_CONNECTION_RESET_EXTRA', 'Cannot read properties of undefined']) {
      expect(failureOwner(new Error(message))).toBe('ours');
    }
    expect(failureOwner('net::ERR_TIMED_OUT')).toBe('environment');
  });

  it('recognizes concrete permission/storage causes without swallowing unrelated filesystem bugs', () => {
    expect(failureOwner(new Error('Unable to install: No space left on device (28)'))).toBe('environment');
    expect(failureOwner('No space left on device')).toBe('environment');
    for (const code of ['EACCES', 'EPERM', 'EROFS', 'ENOSPC', 'EDQUOT']) {
      expect(failureOwner(Object.assign(new Error('cannot save'), { code }))).toBe('environment');
      expect(failureOwner(`${code}: failed to write`)).toBe('environment');
    }
    expect(failureOwner(Object.assign(new Error('missing code'), { code: 'ENOENT' }))).toBe('ours');
    expect(failureOwner(new TypeError('a user wrote ENOSPC'))).toBe('ours');
    expect(failureOwner(Object.create(null))).toBe('ours');
    const hostile = Object.defineProperty({}, 'code', { get() { throw new Error('getter'); } });
    expect(failureOwner(hostile)).toBe('ours');
  });
});
