import { expect, test } from 'bun:test';
import type { ProviderIdentity } from '../identity/provider-shape.js';
import type { SessionChange } from './client.js';
import * as entry from './provider-fake.js';
import { createFakeProvider } from './provider-fake.js';

test('the fake signs in, absorbs or rejects a press as told, and records what it was asked', async () => {
  const provider = createFakeProvider();
  const handed: ProviderIdentity[] = [];
  const client = provider.module.createOnlookClient({ url: 'http://127.0.0.1:1', onIdentity: (identity) => { handed.push(identity); } });
  await client.signIn('email');
  expect(provider.module.identity.hasSession()).toBe(false);
  provider.signInResult = new Error('denied');
  await expect(client.signIn('email')).rejects.toThrow('denied');
  const account: ProviderIdentity = { email: 'wren@example.com', source: 'provider', subject: 'user_01TEST', previousSubject: 'user_00TEST' };
  provider.signInResult = account;
  await client.signIn('email');
  expect(handed).toEqual([account]);
  expect(provider.module.identity.hasSession()).toBe(true);
  provider.failures.signOut = new Error('offline');
  await expect(client.signOut()).rejects.toThrow('offline');
  await client.deleteAccount();
  expect(provider.calls).toEqual(['createOnlookClient', 'client.signIn', 'hasSession', 'client.signIn', 'signIn', 'client.signIn', 'signIn', 'hasSession', 'signOut', 'deleteAccount']);
});

test('the fake reports each session change to its listeners and publishes the account the server names', async () => {
  const provider = createFakeProvider({ session: true });
  const changes: (SessionChange | undefined)[] = [];
  const stop = provider.module.identity.onSessionChanged((change) => { changes.push(change); });
  await provider.module.identity.refreshSession();
  provider.setSession(false, 'unreadable');
  provider.setSession(true);
  provider.module.identity.clearSession();
  provider.failures.refreshSession = new Error('offline');
  await expect(provider.module.identity.refreshSession()).rejects.toThrow('offline');
  stop();
  provider.setSession(true);
  expect(changes).toEqual([undefined, 'unreadable', undefined, undefined]);
  provider.nameAccount('user_01TEST');
  expect(provider.publisher.snapshot()).toMatchObject({ connection: 'connected', me: { user: { subject: 'user_01TEST', email: 'user_01TEST@example.com' } } });
  provider.nameAccount(null);
  expect(provider.publisher.snapshot()).toMatchObject({ connection: 'offline', me: null });
});

test('the file fills the provider slot by itself, with no launch-session check unless one is given', () => {
  expect(Object.keys(entry).sort()).toEqual(['capabilities', 'createFakeProvider', 'createOnlookClient', 'flag', 'identity']);
  expect(entry.capabilities).toEqual({ account: true });
  expect(entry.identity.checkLaunchSession).toBeUndefined();
  expect(createFakeProvider({ checkLaunchSession: async () => ({ status: 'valid' }) }).module.identity.checkLaunchSession).toBeDefined();
});
