import '../testing/dom.js';
import { afterEach, describe, expect, it } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { OnlookState, StudioBridge } from '@studio/events';
import { deferred, installBridge } from '../testing/bridge.js';
import { takeComplaints } from '../testing/dom.js';
import Account from './Account.js';
import { t } from '@studio/i18n';

const SIGNED_IN: OnlookState = {
  revision: 3, sessionEpoch: 1, session: 'signed-in', connection: 'connected',
  profile: { name: 'Alex Designer', email: 'designer@example.com', picture: null },
  me: { user: { id: 'user-1', subject: 'workos-1', email: 'designer@example.com', createdAt: 0 }, orgId: 'org_verified', role: 'designer' },
};
const SIGNED_OUT: OnlookState = { revision: 4, session: 'signed-out', connection: 'idle', me: null, profile: null };
let root: Root | undefined;
let container: HTMLDivElement | undefined;

async function mount(): Promise<HTMLDivElement> {
  takeComplaints();
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container!);
    root.render(<Account variant="row" />);
  });
  return container;
}

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  root = undefined;
  container?.remove();
  container = undefined;
  expect(takeComplaints()).toEqual([]);
});

function account(node: HTMLElement): HTMLElement {
  return node.querySelector<HTMLElement>('[data-testid="onlook-account"]')!;
}

async function openMenu(node: HTMLElement): Promise<HTMLElement> {
  const trigger = node.querySelector<HTMLButtonElement>('button')!;
  await act(async () => { trigger.click(); });
  // The popover focuses its first row from a frame, so the rows arrive a frame after the press.
  await act(async () => { await new Promise((resolve) => { requestAnimationFrame(() => { resolve(undefined); }); }); });
  return node.querySelector<HTMLElement>('[data-testid="onlook-sign-out"]')!;
}

function bridge() {
  const snapshot = deferred<OnlookState>();
  const signIn = deferred<Awaited<ReturnType<StudioBridge['onlookSignIn']>>>();
  const signOut = deferred<Awaited<ReturnType<StudioBridge['onlookSignOut']>>>();
  const deletion = deferred<Awaited<ReturnType<StudioBridge['onlookDeleteAccount']>>>();
  const order: string[] = [];
  let publish: (state: OnlookState) => void = () => { throw new Error('account did not subscribe'); };
  const calls = { signIn: 0, signOut: 0, deletion: 0, unsubscribe: 0, settings: 0 };
  installBridge({
    runAppCommand: (request) => { if (request.command === 'settings') calls.settings += 1; },
    onOnlookState: (listener) => {
      order.push('subscribe');
      publish = listener;
      return () => { calls.unsubscribe += 1; };
    },
    onlookState: () => { order.push('snapshot'); return snapshot.promise; },
    onlookSignIn: (method) => { expect(method).toBe('email'); calls.signIn += 1; return signIn.promise; },
    onlookSignOut: () => { calls.signOut += 1; return signOut.promise; },
    onlookDeleteAccount: (sessionEpoch) => { expect(sessionEpoch).toBe(SIGNED_IN.sessionEpoch!); calls.deletion += 1; return deletion.promise; },
  });
  return { snapshot, signIn, signOut, deletion, calls, order, publish: (state: OnlookState) => publish(state) };
}

describe('live account subscription', () => {
  it('hides Teams by default, restores its dialog when enabled, and removes an open dialog when disabled', async () => {
    const fixture = bridge();
    const node = await mount();
    await act(async () => { fixture.snapshot.settle(SIGNED_IN); });
    await openMenu(node);
    expect(node.querySelector('[data-testid="onlook-account-teams"]')).toBeNull();
    await act(async () => { fixture.publish({ ...SIGNED_IN, revision: 4, teamsEnabled: true }); });
    const teams = node.querySelector<HTMLButtonElement>('[data-testid="onlook-account-teams"]');
    expect(teams).not.toBeNull();
    await act(async () => { teams!.click(); });
    expect(node.querySelector('[data-testid="teams-dialog"]')).not.toBeNull();
    await act(async () => { fixture.publish({ ...SIGNED_IN, revision: 5, teamsEnabled: false }); });
    expect(node.querySelector('[data-testid="teams-dialog"]')).toBeNull();
    expect(account(node).getAttribute('data-session')).toBe('signed-in');
    await act(async () => { fixture.publish({ ...SIGNED_IN, revision: 6, teamsEnabled: true }); });
    expect(node.querySelector('[data-testid="teams-dialog"]')).toBeNull();
  });

  it('subscribes before the snapshot and refuses stale snapshot, stale events and equal revisions', async () => {
    const fixture = bridge();
    const node = await mount();
    expect(fixture.order).toEqual(['subscribe', 'snapshot']);
    await act(async () => { fixture.publish(SIGNED_OUT); });
    await act(async () => { fixture.snapshot.settle(SIGNED_IN); });
    await act(async () => {
      fixture.publish({ ...SIGNED_IN, revision: 2 });
      fixture.publish({ ...SIGNED_IN, revision: SIGNED_OUT.revision });
    });
    expect(node.querySelector('[data-testid="onlook-sign-in"]')).not.toBeNull();
    await act(async () => { fixture.publish({ ...SIGNED_IN, revision: 5 }); });
    expect(account(node).getAttribute('data-session')).toBe('signed-in');
  });

  it('updates the connection in place and hides the surface when the session becomes local', async () => {
    const fixture = bridge();
    const node = await mount();
    await act(async () => { fixture.snapshot.settle({ ...SIGNED_IN, connection: 'offline' }); });
    expect(account(node).getAttribute('data-connection')).toBe('offline');
    await act(async () => { fixture.publish({ ...SIGNED_IN, revision: 4 }); });
    expect(account(node).getAttribute('data-connection')).toBe('connected');
    await act(async () => { fixture.publish({ revision: 5, session: 'local', connection: 'idle', me: null, profile: null }); });
    expect(node.innerHTML).toBe('');
  });

  it('unsubscribes and ignores an outstanding snapshot and event after unmount', async () => {
    const fixture = bridge();
    await mount();
    await act(async () => { root?.unmount(); });
    root = undefined;
    expect(fixture.calls.unsubscribe).toBe(1);
    await act(async () => {
      fixture.snapshot.settle(SIGNED_IN);
      fixture.publish(SIGNED_OUT);
    });
    expect(container!.innerHTML).toBe('');
  });
});

describe('account actions', () => {
  it('signs out once from the menu, disables the pending item and leaves identity to the state stream', async () => {
    const fixture = bridge();
    const node = await mount();
    await act(async () => { fixture.snapshot.settle(SIGNED_IN); });
    const item = await openMenu(node);
    await act(async () => { item.click(); item.click(); });
    expect(fixture.calls.signOut).toBe(1);
    expect(account(node).getAttribute('aria-busy')).toBe('true');
    await act(async () => { fixture.signOut.settle({ ok: true }); });
    expect(account(node).getAttribute('data-session')).toBe('signed-in');
    await act(async () => { fixture.publish(SIGNED_OUT); });
    expect(node.querySelector('[data-testid="onlook-sign-in"]')).not.toBeNull();
  });

  it('uses neutral browser email sign-in and does not fabricate account state from its result', async () => {
    const fixture = bridge();
    const node = await mount();
    await act(async () => { fixture.snapshot.settle(SIGNED_OUT); });
    const button = node.querySelector<HTMLButtonElement>('[data-testid="onlook-sign-in"]')!;
    await act(async () => { button.click(); });
    expect(fixture.calls.signIn).toBe(1);
    expect(button.disabled).toBe(true);
    await act(async () => { fixture.signIn.settle({ ok: true }); });
    expect(button.disabled).toBe(false);
    expect(account(node).getAttribute('data-session')).toBe('signed-out');
  });

  it('shows a rejected sign-out in the menu it was pressed from, and announces it', async () => {
    const fixture = bridge();
    const node = await mount();
    await act(async () => { fixture.snapshot.settle(SIGNED_IN); });
    const item = await openMenu(node);
    await act(async () => { item.click(); });
    await act(async () => { fixture.signOut.refuse(new Error('unavailable')); });
    expect(node.querySelector('[role="alert"]')?.textContent).toBe(t('account.actionFailed'));
    expect(node.querySelector('[data-testid="onlook-account-announcement"]')?.textContent).toBe(t('account.actionFailed'));
    expect(account(node).getAttribute('data-session')).toBe('signed-in');
  });

  it('opens account settings rather than global settings', async () => {
    const fixture = bridge();
    const node = await mount();
    await act(async () => { fixture.snapshot.settle(SIGNED_IN); });
    await openMenu(node);
    await act(async () => { node.querySelector<HTMLElement>('[data-testid="onlook-account-settings"]')!.click(); });
    expect(fixture.calls.settings).toBe(0);
    expect(node.querySelector<HTMLDialogElement>('[data-testid="account-settings-dialog"]')?.open).toBe(true);
    expect(node.querySelector('[data-testid="account-settings"]')).not.toBeNull();
    expect(node.querySelector('[data-testid="account-settings-email"]')?.textContent).toBe('designer@example.com');
  });

  it('requires confirmation to delete and keeps the signed-in account on last-admin refusal', async () => {
    const fixture = bridge();
    const node = await mount();
    await act(async () => { fixture.snapshot.settle(SIGNED_IN); });
    await openMenu(node);
    await act(async () => { node.querySelector<HTMLElement>('[data-testid="onlook-account-settings"]')!.click(); });
    expect(node.querySelector('[data-testid="account-delete-confirm"]')).toBeNull();
    await act(async () => { node.querySelector<HTMLElement>('[data-testid="account-delete-request"]')!.click(); });
    expect(fixture.calls.deletion).toBe(0);
    const confirm = node.querySelector<HTMLButtonElement>('[data-testid="account-delete-confirm"]')!;
    await act(async () => { confirm.click(); confirm.click(); });
    expect(fixture.calls.deletion).toBe(1);
    expect(confirm.disabled).toBe(true);
    await act(async () => { fixture.deletion.settle({ ok: false, code: 'last_admin' }); });
    expect(node.querySelector('[data-testid="account-settings"] [role="alert"]')?.textContent).toBe(t('account.lastAdmin'));
    expect(account(node).getAttribute('data-session')).toBe('signed-in');
    expect(confirm.disabled).toBe(true);
  });

  it('closes deletion confirmation on cross-tab sign-out and ignores the old action result', async () => {
    const fixture = bridge();
    const node = await mount();
    await act(async () => { fixture.snapshot.settle(SIGNED_IN); });
    await openMenu(node);
    await act(async () => { node.querySelector<HTMLElement>('[data-testid="onlook-account-settings"]')!.click(); });
    await act(async () => { node.querySelector<HTMLElement>('[data-testid="account-delete-request"]')!.click(); });
    await act(async () => { node.querySelector<HTMLElement>('[data-testid="account-delete-confirm"]')!.click(); });
    await act(async () => { fixture.publish(SIGNED_OUT); });
    await act(async () => { fixture.publish({ ...SIGNED_IN, revision: 5 }); });
    await act(async () => { fixture.deletion.settle({ ok: false, code: 'failed' }); });
    expect(node.querySelector<HTMLDialogElement>('[data-testid="account-settings-dialog"]')?.open).toBe(false);
    expect(node.querySelector('[role="alert"]')).toBeNull();
  });

  it('closes a confirmation when its main-issued account epoch changes', async () => {
    const fixture = bridge();
    const node = await mount();
    await act(async () => { fixture.snapshot.settle(SIGNED_IN); });
    await openMenu(node);
    await act(async () => { node.querySelector<HTMLElement>('[data-testid="onlook-account-settings"]')!.click(); });
    await act(async () => { node.querySelector<HTMLElement>('[data-testid="account-delete-request"]')!.click(); });
    await act(async () => { fixture.publish({ ...SIGNED_IN, revision: 5, sessionEpoch: 2 }); });
    expect(node.querySelector<HTMLDialogElement>('[data-testid="account-settings-dialog"]')?.open).toBe(false);
    expect(fixture.calls.deletion).toBe(0);
  });

  it('ignores a rejected action after the account unmounts', async () => {
    const fixture = bridge();
    const node = await mount();
    await act(async () => { fixture.snapshot.settle(SIGNED_IN); });
    const item = await openMenu(node);
    await act(async () => { item.click(); });
    await act(async () => { root?.unmount(); });
    root = undefined;
    await act(async () => { fixture.signOut.refuse(new Error('late refusal')); });
    expect(node.innerHTML).toBe('');
  });
});
