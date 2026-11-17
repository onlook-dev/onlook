import { expect, test } from 'bun:test';
import { createSessionEpoch } from './session-epoch.js';

test('account epochs reject an old confirmation while remaining stable across refresh and reconnect', () => {
  const current = createSessionEpoch();
  const first = { email: 'first@onlook.test', subject: 'account-a' };
  const second = { email: 'second@onlook.test', subject: 'account-b' };
  const original = current('signed-in', first);
  expect(current('signed-in', first)).toBe(original);
  expect(current('signed-out', null)).not.toBe(original);
  const replacement = current('signed-in', second);
  expect(replacement).not.toBe(original);
  expect(current('signed-in', second)).toBe(replacement);
  expect(current('signed-in', first)).not.toBe(replacement);
});

test('legacy email-to-ID backfill preserves the epoch', () => {
  const current = createSessionEpoch();
  const legacy = { email: 'designer@onlook.test' };
  const original = current('signed-in', legacy);
  expect(current('signed-in', { ...legacy, subject: 'account-a' })).toBe(original);
});

test('different known WorkOS IDs invalidate the epoch even with the same email', () => {
  const current = createSessionEpoch();
  const original = current('signed-in', { email: 'designer@onlook.test', subject: 'account-a' });
  expect(current('signed-in', { email: 'designer@onlook.test', subject: 'account-b' })).not.toBe(original);
});

test('email changes preserve the epoch when the known WorkOS ID is unchanged', () => {
  const current = createSessionEpoch();
  const original = current('signed-in', { email: 'designer@onlook.test', subject: 'account-a' });
  expect(current('signed-in', { email: 'renamed@onlook.test', subject: 'account-a' })).toBe(original);
});

test('temporary ID omission does not forget the previously known WorkOS ID', () => {
  const current = createSessionEpoch();
  const original = current('signed-in', { email: 'designer@onlook.test', subject: 'account-a' });
  expect(current('signed-in', { email: 'designer@onlook.test' })).toBe(original);
  expect(current('signed-in', { email: 'designer@onlook.test', subject: 'account-b' })).not.toBe(original);
});

test('an unverified email replacement is not treated as identity enrichment', () => {
  const current = createSessionEpoch();
  const original = current('signed-in', { email: 'first@onlook.test' });
  expect(current('signed-in', { email: 'second@onlook.test', subject: 'account-b' })).not.toBe(original);
});
