import { expect, it } from 'bun:test';
import type { GithubConnection } from '@studio/events';
import { createGithubConnectionWatch } from './connection-watch.js';

const CONNECTED: GithubConnection = { status: 'connected', scopes: [], expiresAt: null };
const UNAVAILABLE = { status: 'unavailable', reason: 'provider_unavailable' } as const;

it('seeds the first answer after launch without reporting a change', () => {
  const changed = createGithubConnectionWatch();
  expect(changed('account', CONNECTED, { status: 'connected', account: 'first-login' })).toBe(false);
  expect(changed('account', CONNECTED, { status: 'connected', account: 'second-login' })).toBe(true);
});

it('invalidates an account replacement even when its status is unavailable', () => {
  const changed = createGithubConnectionWatch();
  expect(changed('first', CONNECTED, { status: 'connected', account: 'first-login' })).toBe(false);
  expect(changed('second', UNAVAILABLE)).toBe(true);
  expect(changed('second', UNAVAILABLE)).toBe(false);
});

it('detects connected-to-connected GitHub identity changes', () => {
  const changed = createGithubConnectionWatch();
  expect(changed('account', CONNECTED, { status: 'connected', account: 'first-login' })).toBe(false);
  expect(changed('account', CONNECTED, { status: 'connected', account: 'first-login' })).toBe(false);
  expect(changed('account', CONNECTED, { status: 'connected', account: 'second-login' })).toBe(true);
  expect(changed('account', CONNECTED, UNAVAILABLE)).toBe(false);
});

it('remeasures after reconnecting the same account and does not remeasure while waiting', () => {
  const changed = createGithubConnectionWatch();
  expect(changed('account', CONNECTED)).toBe(false);
  expect(changed('account', { status: 'connecting' })).toBe(false);
  expect(changed('account', CONNECTED)).toBe(true);
  expect(changed('account', { status: 'disconnected' })).toBe(true);
});
