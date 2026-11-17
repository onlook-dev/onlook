import '../testing/dom.js';
import { afterEach, expect, it, mock } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { OnlookState } from '@studio/events';
import { deferred, installBridge } from '../testing/bridge.js';
import { takeComplaints } from '../testing/dom.js';
import { Dialog } from '../overlay/Dialog.js';
import { modalsBesides, openModals } from '../overlay/modalStack.js';
import AccessBoundary from './AccessBoundary.js';

mock.module('../tabIdentity.js', () => ({ TAB_ID: 'account-tab', isTabView: true }));

const LOCAL: OnlookState = { revision: 0, session: 'local', connection: 'idle', me: null, profile: null };
const SIGNED_OUT: OnlookState = { ...LOCAL, revision: 1, session: 'signed-out' };
const SIGNED_IN: OnlookState = { ...LOCAL, revision: 2, session: 'signed-in', connection: 'connected' };
let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  root = undefined;
  container?.remove();
  container = undefined;
  takeComplaints();
  expect(openModals()).toEqual([]);
});

it('the gate can ask which modals are open besides itself, and the dialog it shut is still counted', async () => {
  const snapshot = deferred<OnlookState>();
  let publish: (state: OnlookState) => void = () => {};
  installBridge({
    onOnlookState: (listener) => { publish = listener; return () => {}; },
    onlookState: () => snapshot.promise,
    chromeSlots: () => {},
    appInfo: () => new Promise<never>(() => {}),
    githubStars: () => new Promise<never>(() => {}),
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container!);
    root.render(<AccessBoundary><Dialog isOpen onOpenChange={() => {}} aria-label="Settings" data-testid="under-gate">body</Dialog></AccessBoundary>);
  });
  await act(async () => { snapshot.settle(LOCAL); });
  expect(openModals().map((entry) => entry.kind)).toEqual(['dialog']);
  expect(modalsBesides('gate')).toHaveLength(1);

  await act(async () => { publish(SIGNED_OUT); });
  expect(container.querySelector('[data-testid="account-access-gate"]')).not.toBeNull();
  expect(container.querySelector<HTMLDialogElement>('[data-testid="under-gate"]')!.open).toBe(false);
  expect(openModals().map((entry) => entry.kind)).toEqual(['dialog', 'gate']);
  expect(modalsBesides('gate').map((entry) => entry.kind)).toEqual(['dialog']);

  await act(async () => { publish(SIGNED_IN); });
  expect(container.querySelector('[data-testid="account-access-gate"]')).toBeNull();
  expect(openModals().map((entry) => entry.kind)).toEqual(['dialog']);
});
