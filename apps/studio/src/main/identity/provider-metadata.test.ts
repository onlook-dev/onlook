import { afterAll, beforeEach, expect, mock, test } from 'bun:test';
import { app } from 'electron';
import type { StudioIdentity } from '@studio/events';

let persisted: StudioIdentity | null = null;
let refuseWrite = false;
let resets = 0;
const announced: StudioIdentity[] = [];
const focus = mock(() => {});
const originalFocus = app.focus;
app.focus = focus;
afterAll(() => { app.focus = originalFocus; });
mock.module('../telemetry/index.js', () => ({ identifyPerson: () => {}, resetTelemetryIdentity: () => { resets += 1; } }));
mock.module('../tabs/sender.js', () => ({ requireStudioTabSender: () => {} }));
mock.module('../window/host.js', () => ({ everyRenderer: () => [], restoreAllMinimized: () => {} }));
mock.module('../tabs/broadcast.js', () => ({ broadcastToRenderers: (_channel: string, identity: StudioIdentity) => {
  expect(persisted).toEqual(identity);
  announced.push(identity);
} }));
mock.module('@onlook/cloud-provider', () => ({ identity: { configured: () => false } }));
// The real one: what a provider hands over is turned into Studio's names before the store below is asked to keep it.
const { neutralIdentity } = await import('./store.js');
mock.module('./store.js', () => ({
  neutralIdentity,
  readIdentity: () => persisted,
  writeIdentity: (identity: StudioIdentity) => {
    if (refuseWrite) throw new Error('identity_version_unsupported');
    persisted = identity;
    return identity;
  },
  clearIdentity: () => { persisted = null; },
}));
const { clearAccountIdentity, completeBrowserSignIn, authState } = await import('./ipc.js');
const person: StudioIdentity = { email: 'designer@onlook.test', source: 'provider' };

beforeEach(() => {
  persisted = null;
  refuseWrite = false;
  resets = 0;
  announced.length = 0;
  focus.mockClear();
});

test('provider metadata is persisted before Studio announces a completed sign-in', () => {
  expect(completeBrowserSignIn(person)).toEqual(person);
  expect(authState().identity).toEqual(person);
  expect(announced).toEqual([person]);
});

test('a provider still on the vendor\'s names is persisted and announced in the neutral ones', () => {
  expect(completeBrowserSignIn({ email: 'designer@onlook.test', source: 'workos', workosUserId: 'user_1', workosExternalId: 'seed_1' }))
    .toEqual({ email: 'designer@onlook.test', source: 'provider', subject: 'user_1', previousSubject: 'seed_1' });
  expect(persisted).toEqual({ email: 'designer@onlook.test', source: 'provider', subject: 'user_1', previousSubject: 'seed_1' });
  expect(announced).toEqual([persisted!]);
});

test('a lost session drops the metadata and the telemetry identity together', () => {
  completeBrowserSignIn(person);
  clearAccountIdentity();
  expect(authState().identity).toBeNull();
  expect(resets).toBe(1);
});

test('a rejected metadata write never announces or focuses a completed sign-in', () => {
  refuseWrite = true;
  const count = focus.mock.calls.length;
  expect(() => completeBrowserSignIn(person)).toThrow('identity_version_unsupported');
  expect(announced).toEqual([]);
  expect(focus.mock.calls.length).toBe(count);
});
