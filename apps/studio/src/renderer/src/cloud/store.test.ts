import '../testing/dom.js';
import { describe, expect, it } from 'bun:test';
import type { OnlookState } from '@studio/events';
import { deferred, installBridge } from '../testing/bridge.js';
import { createOnlookStore } from './store.js';

const SIGNED_IN: OnlookState = { revision: 2, session: 'signed-in', connection: 'connected', me: null, profile: null };
const SIGNED_OUT: OnlookState = { revision: 3, session: 'signed-out', connection: 'idle', me: null, profile: null };

function fixture() {
  const snapshot = deferred<OnlookState>();
  const order: string[] = [];
  const publishes: ((state: OnlookState) => void)[] = [];
  let unsubscribed = 0;
  installBridge({
    onOnlookState: (listener) => { order.push('subscribe'); publishes.push(listener); return () => { unsubscribed += 1; }; },
    onlookState: () => { order.push('snapshot'); return snapshot.promise; },
  });
  const store = createOnlookStore();
  return { store, snapshot, order, publishes, unsubscribed: () => unsubscribed };
}

describe('shared Onlook state', () => {
  it('invalidates confirmations when main reports a replacement account without a visible signed-out snapshot', () => {
    const { store, publishes } = fixture();
    const unsubscribe = store.subscribe(() => {});
    publishes[0]!({ ...SIGNED_IN, sessionEpoch: 1 });
    expect(store.getSnapshot().sessionRevision).toBe(1);
    publishes[0]!({ ...SIGNED_IN, revision: 3, connection: 'offline', sessionEpoch: 1 });
    expect(store.getSnapshot().sessionRevision).toBe(1);
    publishes[0]!({ ...SIGNED_IN, revision: 4, sessionEpoch: 2 });
    expect(store.getSnapshot().sessionRevision).toBe(2);
    unsubscribe();
  });
  it('shares a single subscribe-before-snapshot connection and accepts only increasing revisions', async () => {
    const { store, snapshot, order, publishes } = fixture();
    const first = store.subscribe(() => {});
    const second = store.subscribe(() => {});
    expect(order).toEqual(['subscribe', 'snapshot']);
    publishes[0]!(SIGNED_OUT);
    snapshot.settle(SIGNED_IN);
    await snapshot.promise;
    publishes[0]!({ ...SIGNED_IN, revision: 3 });
    expect(store.getSnapshot().state).toEqual(SIGNED_OUT);
    publishes[0]!({ ...SIGNED_IN, revision: 4 });
    expect(store.getSnapshot().state?.session).toBe('signed-in');
    first();
    second();
  });

  it('keeps the connection until its last subscriber leaves and ignores all late answers', async () => {
    const { store, snapshot, publishes, unsubscribed } = fixture();
    const first = store.subscribe(() => {});
    const second = store.subscribe(() => {});
    first();
    expect(unsubscribed()).toBe(0);
    second();
    expect(unsubscribed()).toBe(1);
    snapshot.settle(SIGNED_IN);
    await snapshot.promise;
    publishes[0]!(SIGNED_OUT);
    expect(store.getSnapshot()).toEqual({ state: null, failed: false, sessionRevision: 0 });
  });

  it('exposes initial read failure, retries and rejects the previous connection’s push', async () => {
    const { store, snapshot, publishes } = fixture();
    const unsubscribe = store.subscribe(() => {});
    snapshot.refuse(new Error('unavailable'));
    await snapshot.promise.catch(() => {});
    expect(store.getSnapshot().failed).toBe(true);
    const retry = deferred<OnlookState>();
    window.studio.onlookState = () => retry.promise;
    store.retry();
    publishes[0]!(SIGNED_OUT);
    expect(store.getSnapshot().state).toBeNull();
    retry.settle(SIGNED_IN);
    await retry.promise;
    expect(store.getSnapshot()).toEqual({ state: SIGNED_IN, failed: false, sessionRevision: 1 });
    unsubscribe();
  });

  it('tracks session transitions even when sign-out and sign-in are batched, without treating reconnect as a new session', () => {
    const { store, publishes } = fixture();
    const unsubscribe = store.subscribe(() => {});
    publishes[0]!(SIGNED_IN);
    expect(store.getSnapshot().sessionRevision).toBe(1);
    publishes[0]!({ ...SIGNED_IN, revision: 3, connection: 'offline' });
    expect(store.getSnapshot().sessionRevision).toBe(1);
    publishes[0]!({ ...SIGNED_OUT, revision: 4 });
    publishes[0]!({ ...SIGNED_IN, revision: 5 });
    expect(store.getSnapshot().sessionRevision).toBe(3);
    unsubscribe();
  });
});
