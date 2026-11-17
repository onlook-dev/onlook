import { describe, expect, it } from 'bun:test';
import { loadFailureCopy } from './loadFailure.js';

describe('loadFailureCopy', () => {
  it('names an https hop on an http dev server', () => {
    const copy = loadFailureCopy(
      { url: 'https://localhost:5173/dashboard', code: -107, description: 'ERR_SSL_PROTOCOL_ERROR' },
      'http://localhost:5173/',
    );
    expect(copy.key).toBe('frame.health.failed.https');
    expect(copy.params).toMatchObject({ url: 'localhost:5173/dashboard', home: 'localhost:5173' });
  });

  it("carries Chromium's reason for any other failure", () => {
    const copy = loadFailureCopy(
      { url: 'http://localhost:5173/login', code: -102, description: 'ERR_CONNECTION_REFUSED' },
      'http://localhost:5173/',
    );
    expect(copy).toEqual({
      key: 'frame.health.failed.page',
      params: { url: 'localhost:5173/login', home: 'localhost:5173', reason: 'ERR_CONNECTION_REFUSED' },
    });
  });

  it('does not call a hop to another host an https mismatch', () => {
    const copy = loadFailureCopy(
      { url: 'https://auth.example.test/login', code: -105, description: 'ERR_NAME_NOT_RESOLVED' },
      'http://localhost:5173/',
    );
    expect(copy.key).toBe('frame.health.failed.page');
  });

  it('names the error code as the reason when Chromium gives no description', () => {
    const copy = loadFailureCopy({ url: 'http://localhost:5173/x', code: -6, description: '' }, 'http://localhost:5173/');
    expect(copy.params['reason']).toContain('-6');
  });
});
