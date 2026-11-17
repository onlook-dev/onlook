import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

const { peekLinesForTesting, recordLinesForTesting, resetLogForTesting } = await import('../log/index.js');
const { reportUpdateFailure, updateFailureOwner, updateFailureReason } = await import('./check.js');

const READ_ONLY = 'Cannot update while running on a read-only volume. The application is on a disk image.';

const updaterLines = () => peekLinesForTesting().filter((line) => line['subsystem'] === 'updater');

beforeEach(() => recordLinesForTesting());
afterEach(() => resetLogForTesting());

describe('what an update failure is owned by', () => {
  it('network and read-only failures are environmental, non-network failures stay ours', () => {
    expect(updateFailureOwner(new Error('net::ERR_INTERNET_DISCONNECTED'))).toBe('environment');
    expect(updateFailureOwner(new Error('net::ERR_CERT_DATE_INVALID'))).toBe('environment');
    expect(updateFailureOwner(new Error(READ_ONLY))).toBe('environment');
    expect(updateFailureOwner(new Error('net::ERR_INVALID_URL'))).toBe('environment');
    expect(updateFailureOwner(new TypeError('updater state is missing'))).toBe('ours');
    expect(updateFailureOwner(new Error('HttpError: 404 Not Found'))).toBe('ours');
    expect(updateFailureOwner('net::ERR_TIMED_OUT')).toBe('environment');
  });

  it.each([
    'ERR_NETWORK_IO_SUSPENDED',
    'ERR_SSL_PROTOCOL_ERROR',
    'ERR_EMPTY_RESPONSE',
    'ERR_CONTENT_LENGTH_MISMATCH',
    'ERR_FUTURE_NETWORK_FAILURE',
  ])('treats update network code %s as environmental without a shared allowlist', (code) => {
    expect(updateFailureOwner(new Error(`net::${code} (-1)`))).toBe('environment');
    expect(updateFailureOwner(`net::${code}`)).toBe('environment');
    expect(updateFailureReason(new Error(`net::${code} (-1)`))).toBe(code);
  });

  it('the analytics reason is the bare network code, never the message', () => {
    expect(updateFailureReason(new Error('net::ERR_NAME_NOT_RESOLVED (-105)'))).toBe('ERR_NAME_NOT_RESOLVED');
    expect(updateFailureReason(new Error(READ_ONLY))).toBe('other');
  });

  it('keeps filtered feeds and macOS signature rejection out of Triage, but not missing feeds', () => {
    for (const message of [
      '403 Forbidden\n"method: GET url: https://updates.example/latest-mac.yml"',
      'HttpError: 403 Forbidden',
      'Code signature at URL file:///Applications/Onlook.app did not pass validation: code failed',
      'No space left on device',
    ]) expect(updateFailureOwner(new Error(message))).toBe('environment');
    expect(updateFailureOwner(Object.assign(new Error('blocked'), { statusCode: 403 }))).toBe('environment');
    expect(updateFailureOwner(new Error('404 Not Found'))).toBe('ours');
    expect(updateFailureOwner(new Error('500 Internal Server Error'))).toBe('ours');
    expect(updateFailureOwner(new Error('sha512 checksum mismatch'))).toBe('ours');
  });
});

describe('failure reporting', () => {
  it('reports an offline check as the environment', () => {
    reportUpdateFailure('check', new Error('net::ERR_NAME_NOT_RESOLVED'));
    expect(updaterLines()).toMatchObject([{ owner: 'environment', msg: 'net::ERR_NAME_NOT_RESOLVED' }]);
  });

  it('reports a read-only installation as the environment', () => {
    reportUpdateFailure('install', new Error(READ_ONLY));
    expect(updaterLines()).toMatchObject([{ owner: 'environment', level: 'warn' }]);
  });
});
