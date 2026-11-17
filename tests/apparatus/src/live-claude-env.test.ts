import { expect, test } from 'bun:test';
import { liveClaudeEnv } from './live-claude-env.js';

test('isolates live transcripts without changing the default Keychain login identity', () => {
  const loginEnv = { PATH: '/bin' };
  expect(liveClaudeEnv('/scratch/sessions', loginEnv)).toEqual({
    PATH: '/bin',
    CLAUDE_CONFIG_DIR: '/scratch/sessions',
    CLAUDE_SECURESTORAGE_CONFIG_DIR: '',
  });
  expect(loginEnv).toEqual({ PATH: '/bin' });
});

test('keeps a custom login identity while preserving the query environment', () => {
  expect(liveClaudeEnv('/scratch/sessions', { CLAUDE_CONFIG_DIR: '/owner/config', PATH: '/bin' }, {
    CLAUDE_CONFIG_DIR: '/other/config', SDK_OPTION: 'retained',
  })).toEqual({
    PATH: '/bin',
    SDK_OPTION: 'retained',
    CLAUDE_CONFIG_DIR: '/scratch/sessions',
    CLAUDE_SECURESTORAGE_CONFIG_DIR: '/owner/config',
  });
});

test('preserves an explicitly selected or default secure storage identity', () => {
  for (const identity of ['/owner/keychain', '']) {
    expect(liveClaudeEnv('/scratch/sessions', {
      CLAUDE_CONFIG_DIR: '/owner/config', CLAUDE_SECURESTORAGE_CONFIG_DIR: identity,
    }).CLAUDE_SECURESTORAGE_CONFIG_DIR).toBe(identity);
  }
});
