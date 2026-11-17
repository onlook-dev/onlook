import { expect, test } from 'bun:test';
import { createLaunchSessionCheck } from './launch-session.js';
import type { LaunchSessionResult } from './client.js';

function fixture(check: (signal: AbortSignal) => Promise<LaunchSessionResult>) {
  const ended: string[] = [];
  const retries: (() => void)[] = [];
  const owner = createLaunchSessionCheck({
    check,
    ended: (reason) => { ended.push(reason); },
    retry: (run) => { retries.push(run); return () => { retries.splice(retries.indexOf(run), 1); }; },
  });
  return { owner, ended, retries };
}

test('a transient launch failure preserves the session and retries', async () => {
  let calls = 0;
  const { owner, ended, retries } = fixture(async () => {
    calls += 1;
    if (calls === 1) throw new Error('Network unavailable');
    return { status: 'valid' };
  });
  await owner.start();
  expect(owner.phase()).toBe('retry-wait');
  expect(ended).toEqual([]);
  retries.shift()?.();
  await Promise.resolve();
  await Promise.resolve();
  expect(calls).toBe(2);
  expect(owner.phase()).toBe('settled');
  expect(ended).toEqual([]);
});

test('a real launch expiry clears once with the bounded provider reason', async () => {
  const { owner, ended } = fixture(async () => ({ status: 'ended', reason: 'expired' }));
  await owner.start();
  await owner.start();
  expect(ended).toEqual(['expired']);
  expect(owner.phase()).toBe('settled');
});

test('a late expiry cannot end a session after the person signs in again', async () => {
  let finish!: (result: LaunchSessionResult) => void;
  let signal!: AbortSignal;
  const { owner, ended } = fixture((next) => {
    signal = next;
    return new Promise((resolve) => { finish = resolve; });
  });
  const pending = owner.start();
  owner.supersede();
  finish({ status: 'ended', reason: 'revoked' });
  await pending;
  expect(signal.aborted).toBe(true);
  expect(ended).toEqual([]);
  expect(owner.phase()).toBe('settled');
});

test('overlapping launch checks join one operation', async () => {
  let finish!: (result: LaunchSessionResult) => void;
  let calls = 0;
  const { owner } = fixture(() => {
    calls += 1;
    return new Promise((resolve) => { finish = resolve; });
  });
  const first = owner.start();
  const second = owner.start();
  expect(calls).toBe(1);
  finish({ status: 'valid' });
  await Promise.all([first, second]);
});

test('a valid launch session stays signed in without retrying or clearing', async () => {
  const { owner, ended, retries } = fixture(async () => ({ status: 'valid' }));
  await owner.start();
  expect(owner.phase()).toBe('settled');
  expect(ended).toEqual([]);
  expect(retries).toEqual([]);
});

test('a launch timeout retries without clearing identity', async () => {
  let expired = false;
  let retries = 0;
  const owner = createLaunchSessionCheck({
    timeoutMs: 1,
    check: () => new Promise(() => {}),
    ended: () => { expired = true; },
    retry: () => { retries += 1; return () => {}; },
  });
  await owner.start();
  expect(owner.phase()).toBe('retry-wait');
  expect(expired).toBe(false);
  expect(retries).toBe(1);
  owner.dispose();
});

test('an unrecognized or malformed provider result never clears the session', async () => {
  for (const result of [null, { status: 'ended', reason: 'provider payload' }, { status: 'unavailable' }]) {
    const { owner, ended } = fixture(async () => result as LaunchSessionResult);
    await owner.start();
    expect(ended).toEqual([]);
    expect(owner.phase()).toBe('retry-wait');
    owner.dispose();
  }
});

test('disposing cancels retries and ignores a pending terminal answer', async () => {
  let finish!: (result: LaunchSessionResult) => void;
  const { owner, ended, retries } = fixture(() => new Promise((resolve) => { finish = resolve; }));
  const pending = owner.start();
  owner.dispose();
  finish({ status: 'ended', reason: 'ended' });
  await pending;
  expect(owner.phase()).toBe('disposed');
  expect(ended).toEqual([]);
  expect(retries).toEqual([]);
});

test('superseding releases the launch operation even when a provider ignores abort', async () => {
  const { owner } = fixture(() => new Promise(() => {}));
  const pending = owner.start();
  owner.supersede();
  await pending;
  expect(owner.phase()).toBe('settled');
});
