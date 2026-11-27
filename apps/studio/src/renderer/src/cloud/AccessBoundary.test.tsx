import '../testing/dom.js';
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ChromeSlots, ChromeSlotsPush, OnlookActionResult, OnlookState } from '@studio/events';
import { deferred, installBridge } from '../testing/bridge.js';
import { takeComplaints } from '../testing/dom.js';
import { t } from '@studio/i18n';
import AccessBoundary from './AccessBoundary.js';
import Account from './Account.js';
import type { SignInMethod } from './useAccountAction.js';

mock.module('../tabIdentity.js', () => ({ TAB_ID: 'account-tab', isTabView: true }));
const { useFillWindowBar } = await import('../topbar/slots.js');

const PRODUCT_SLOTS: ChromeSlots = { showFolder: true, rails: { left: true, right: false } };
const UPDATED_SLOTS: ChromeSlots = { showFolder: true, rails: { left: false, right: true } };
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
  expect(takeComplaints()).toEqual([]);
});

function fixture() {
  const snapshot = deferred<OnlookState>();
  const signIn = deferred<OnlookActionResult>();
  const signOut = deferred<OnlookActionResult>();
  const methods: SignInMethod[] = [];
  const slots: ChromeSlotsPush[] = [];
  let publish: (state: OnlookState) => void = () => {};
  let subscriptions = 0;
  let signOutCalls = 0;
  installBridge({
    onOnlookState: (listener) => { subscriptions += 1; publish = listener; return () => {}; },
    onlookState: () => snapshot.promise,
    onlookSignIn: (method) => { methods.push(method); return signIn.promise; },
    onlookSignOut: () => { signOutCalls += 1; return signOut.promise; },
    chromeSlots: (push) => { slots.push(push); },
    // The sign-in page shows the running version and the star count; these tests never read them.
    appInfo: () => new Promise<never>(() => {}),
    githubStars: () => new Promise<never>(() => {}),
  });
  return { snapshot, signIn, signOut, methods, slots, signOutCalls: () => signOutCalls, subscriptions: () => subscriptions, publish: (state: OnlookState) => { publish(state); } };
}

async function mount(children: React.ReactNode, requiresSession = false): Promise<HTMLDivElement> {
  takeComplaints();
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container!);
    root.render(<AccessBoundary requiresSession={requiresSession}>{children}</AccessBoundary>);
  });
  return container;
}

describe('account access gate', () => {
  it('explains an ended session without presenting a first-launch sign-in, and removes the notice after sign-in', async () => {
    const cloud = fixture();
    const node = await mount(<div>Projects</div>);
    await act(async () => { cloud.snapshot.settle({ ...SIGNED_OUT, sessionEnded: true }); });
    expect(node.querySelector('[data-testid="session-ended-notice"]')?.textContent).toBe(t('account.sessionEnded'));
    await act(async () => { cloud.publish({ ...SIGNED_IN, sessionEnded: false }); });
    expect(node.querySelector('[data-testid="session-ended-notice"]')).toBeNull();
    expect(node.querySelector('[data-testid="account-access-gate"]')).toBeNull();
  });

  it('does not claim a session ended on a first launch', async () => {
    const cloud = fixture();
    const node = await mount(<div />);
    await act(async () => { cloud.snapshot.settle(SIGNED_OUT); });
    expect(node.querySelector('[data-testid="session-ended-notice"]')).toBeNull();
  });

  it.each(['email-verification', 'browser'] as const)('shows the hosted %s step without resetting the pending sign-in or hiding Cancel', async (step) => {
    const cloud = fixture();
    const node = await mount(<div />);
    await act(async () => { cloud.snapshot.settle(SIGNED_OUT); });
    await act(async () => { node.querySelector<HTMLButtonElement>('[data-testid="account-continue-github"]')!.click(); });
    await act(async () => { cloud.publish({ ...SIGNED_OUT, revision: 2, signInStep: step }); });
    const text = t(step === 'email-verification' ? 'account.emailVerification' : 'account.hostedSignIn');
    expect(node.textContent).toContain(text);
    expect(node.querySelector<HTMLButtonElement>('[data-testid="account-cancel-sign-in"]')?.disabled).toBe(false);
    await act(async () => { cloud.publish({ ...SIGNED_IN, revision: 3 }); cloud.signIn.settle({ ok: true }); });
    expect(node.querySelector('[data-testid="account-access-gate"]')).toBeNull();
    expect(node.textContent).not.toContain(text);
  });

  it.each([
    ['team_only', 'account.signInDenied'],
    ['email_verification_required', 'account.signInGithubFailed'],
    ['mfa_enrollment', 'account.mfaSetupRequired'],
    ['mfa_challenge', 'account.mfaRequired'],
    ['mfa_verification', 'account.mfaFailed'],
    ['organization_selection_required', 'account.organizationRequired'],
    ['sso_required', 'account.ssoRequired'],
    ['invalid_grant', 'account.signInGithubFailed'],
  ] as const)('names GitHub in the %s result returned by sign-in, unless WorkOS reported a cause (ONL-2948)', async (code, key) => {
    const cloud = fixture();
    const node = await mount(<div />);
    await act(async () => { cloud.snapshot.settle(SIGNED_OUT); });
    await act(async () => { node.querySelector<HTMLButtonElement>('[data-testid="account-continue-github"]')!.click(); });
    await act(async () => { cloud.signIn.settle({ ok: false, code }); });
    expect(node.querySelector('[role="alert"]')?.textContent).toBe(t(key));
  });

  it.each(['google', 'email'] as const)('names %s when that button started the failed sign-in', async (method) => {
    const cloud = fixture();
    const node = await mount(<div />);
    await act(async () => { cloud.snapshot.settle(SIGNED_OUT); });
    await act(async () => { node.querySelector<HTMLButtonElement>(`[data-testid="account-continue-${method}"]`)!.click(); });
    await act(async () => { cloud.signIn.settle({ ok: false, code: 'invalid_grant' }); });
    expect(node.querySelector('[role="alert"]')?.textContent).toBe(t(method === 'google' ? 'account.signInGoogleFailed' : 'account.signInEmailFailed'));
  });

  // The bridge fixture reuses one settled promise, so this pins the method the second failure names, not the cleared moment between them.
  it('names the newly pressed method, never the one from the previous attempt', async () => {
    const cloud = fixture();
    const node = await mount(<div />);
    await act(async () => { cloud.snapshot.settle(SIGNED_OUT); });
    await act(async () => { node.querySelector<HTMLButtonElement>('[data-testid="account-continue-github"]')!.click(); });
    await act(async () => { cloud.signIn.settle({ ok: false, code: 'invalid_grant' }); });
    expect(node.querySelector('[role="alert"]')?.textContent).toBe(t('account.signInGithubFailed'));
    await act(async () => { node.querySelector<HTMLButtonElement>('[data-testid="account-continue-google"]')!.click(); });
    expect(node.querySelector('[role="alert"]')?.textContent).toBe(t('account.signInGoogleFailed'));
  });
  it('blends the separate chrome view while loading even without a child slot publisher', async () => {
    const cloud = fixture();
    await mount(<div />, true);
    expect(cloud.slots.at(-1)).toEqual({ tabId: 'account-tab', slots: { blendsIntoScreen: true } });
    await act(async () => { cloud.snapshot.settle(SIGNED_IN); });
    expect(cloud.slots.at(-1)).toEqual({ tabId: 'account-tab', slots: {} });
  });

  it('leaves a build without the login flag ungated and interactive through an unknown then local snapshot', async () => {
    const cloud = fixture();
    let presses = 0;
    const node = await mount(<button type="button" data-testid="legacy-login" onClick={() => { presses += 1; }}>{t('account.gallery.default')}</button>);
    const login = node.querySelector<HTMLButtonElement>('[data-testid="legacy-login"]')!;
    expect(login.closest('[hidden]')).toBeNull();
    expect(login.closest('[inert]')).toBeNull();
    expect(node.querySelector('[data-testid="account-access-gate"]')).toBeNull();
    expect(node.querySelector('[role="status"]')).toBeNull();
    expect(cloud.slots).toEqual([]);
    await act(async () => { login.click(); });
    expect(presses).toBe(1);
    await act(async () => { cloud.snapshot.settle(LOCAL); });
    expect(login.closest('[hidden]')).toBeNull();
    expect(node.querySelector('[data-testid="account-access-gate"]')).toBeNull();
    expect(cloud.slots).toEqual([]);
  });

  it('ignores a refused state read in a build without the login flag', async () => {
    const cloud = fixture();
    const node = await mount(<div data-testid="legacy-login" />);
    await act(async () => { cloud.snapshot.refuse(new Error('unavailable')); });
    expect(node.querySelector('[data-testid="account-access-gate"]')).toBeNull();
    expect(node.querySelector('[role="alert"]')).toBeNull();
    expect(node.querySelector('[data-testid="legacy-login"]')?.closest('[hidden]')).toBeNull();
    expect(cloud.slots).toEqual([]);
  });

  it('suppresses and restores mounted editor slots without clearing unsaved state', async () => {
    const cloud = fixture();
    let mounts = 0;
    function Editor(): React.JSX.Element {
      const [draft, setDraft] = useState(() => { mounts += 1; return ''; });
      useFillWindowBar(draft === '' ? PRODUCT_SLOTS : UPDATED_SLOTS);
      return <button type="button" onClick={() => { setDraft('unsaved'); }}>{t('account.gallery.default')}</button>;
    }
    const node = await mount(<Editor />, true);
    expect(cloud.slots.every((push) => push.slots.blendsIntoScreen === true)).toBe(true);
    await act(async () => { cloud.snapshot.settle(SIGNED_IN); });
    expect(cloud.slots.at(-1)?.slots).toEqual(PRODUCT_SLOTS);
    const button = node.querySelector<HTMLButtonElement>('button')!;
    await act(async () => { button.click(); });
    expect(cloud.slots.at(-1)?.slots).toEqual(UPDATED_SLOTS);
    cloud.slots.length = 0;
    await act(async () => { cloud.publish({ ...SIGNED_OUT, revision: 3 }); });
    expect(cloud.slots.length).toBeGreaterThan(0);
    expect(cloud.slots.every((push) => push.slots.blendsIntoScreen === true)).toBe(true);
    await act(async () => { cloud.publish({ ...SIGNED_IN, revision: 4 }); });
    expect(cloud.slots.at(-1)?.slots).toEqual(UPDATED_SLOTS);
    expect(node.querySelector('button')).toBe(button);
    expect(mounts).toBe(1);
  });

  it('keeps late publishers and their cleanup blended until unblock', async () => {
    const cloud = fixture();
    function Publisher(): null {
      useFillWindowBar(PRODUCT_SLOTS);
      return null;
    }
    await mount(null);
    await act(async () => { cloud.snapshot.settle(SIGNED_OUT); });
    cloud.slots.length = 0;
    await act(async () => { root!.render(<AccessBoundary><Publisher /></AccessBoundary>); });
    expect(cloud.slots).toEqual([{ tabId: 'account-tab', slots: { blendsIntoScreen: true } }]);
    cloud.slots.length = 0;
    await act(async () => { root!.render(<AccessBoundary>{null}</AccessBoundary>); });
    expect(cloud.slots).toEqual([{ tabId: 'account-tab', slots: { blendsIntoScreen: true } }]);
    await act(async () => { cloud.publish(SIGNED_IN); });
    expect(cloud.slots.at(-1)?.slots).toEqual({});
  });

  it('holds the product inert behind the gate while the required session is still unknown', async () => {
    const cloud = fixture();
    let presses = 0;
    const node = await mount(<button type="button" data-testid="legacy-login" onClick={() => { presses += 1; }}>{t('account.gallery.default')}</button>, true);
    const login = node.querySelector<HTMLButtonElement>('[data-testid="legacy-login"]')!;
    expect(login.closest('[hidden]')).not.toBeNull();
    expect(login.closest('[inert]')).not.toBeNull();
    expect(node.querySelector('[data-testid="account-access-gate"]')).not.toBeNull();
    expect(node.querySelector('[role="progressbar"]')?.getAttribute('aria-label')).toBe(t('account.loading'));
    await act(async () => { cloud.snapshot.settle(SIGNED_IN); });
    expect(login.closest('[hidden]')).toBeNull();
    expect(login.closest('[inert]')).toBeNull();
    expect(node.querySelector('[data-testid="account-access-gate"]')).toBeNull();
    await act(async () => { login.click(); });
    expect(presses).toBe(1);
  });

  it('keeps the editor hidden but offers recovery through main’s initial or misconfigured local session', async () => {
    const cloud = fixture();
    const node = await mount(<div data-testid="editor" />, true);
    await act(async () => { cloud.snapshot.settle(LOCAL); });
    expect(node.querySelector('[data-testid="editor"]')?.closest('[hidden]')).not.toBeNull();
    expect(node.querySelector('[data-testid="getting-started"]')).not.toBeNull();
    await act(async () => { node.querySelector<HTMLButtonElement>('[data-testid="account-continue-email"]')!.click(); });
    await act(async () => { cloud.signIn.settle({ ok: false, code: 'not_configured' }); });
    expect(node.querySelector('[role="alert"]')?.textContent).toBe(t('account.notConfigured'));
    await act(async () => { cloud.publish(SIGNED_OUT); });
    expect(node.querySelector('[data-testid="getting-started"]')).not.toBeNull();
  });

  it('preserves editor state across local initialization, cross-tab sign-out and browser return', async () => {
    const cloud = fixture();
    let mounts = 0;
    function Editor(): React.JSX.Element {
      const [draft, setDraft] = useState(() => { mounts += 1; return ''; });
      return <>
        <button type="button" onClick={() => { setDraft('unsaved design'); }}>{t('account.gallery.default')}</button>
        <input aria-label={t('account.gallery.default')} value={draft} readOnly />
      </>;
    }
    const node = await mount(<Editor />);
    await act(async () => { cloud.snapshot.settle(LOCAL); });
    const input = node.querySelector('input')!;
    await act(async () => { node.querySelector<HTMLButtonElement>('button')!.click(); });
    input.focus();
    await act(async () => { cloud.publish(SIGNED_OUT); });
    expect(input.closest('[inert]')).not.toBeNull();
    expect(node.querySelector('[data-testid="getting-started"]')).not.toBeNull();
    await act(async () => { cloud.publish(SIGNED_IN); });
    expect(node.querySelector('input')).toBe(input);
    expect(input.value).toBe('unsaved design');
    expect(mounts).toBe(1);
    expect(document.activeElement).toBe(input);
  });

  it('shares the gate and account row subscription', async () => {
    const cloud = fixture();
    await mount(<Account variant="row" />);
    expect(cloud.subscriptions()).toBe(1);
    await act(async () => { cloud.snapshot.settle(SIGNED_OUT); });
  });

  it('suppresses dialogs opened by commands in the hidden root without letting them steal focus', async () => {
    const cloud = fixture();
    const node = await mount(<dialog data-testid="background-dialog"><button type="button">{t('account.gallery.default')}</button></dialog>);
    await act(async () => { cloud.snapshot.settle(SIGNED_OUT); });
    const dialog = node.querySelector<HTMLDialogElement>('[data-testid="background-dialog"]')!;
    await act(async () => { dialog.showModal(); });
    expect(dialog.open).toBe(false);
    expect(node.querySelector('[data-testid="account-access-gate"]')?.contains(document.activeElement)).toBe(true);
  });

  for (const method of ['google', 'github', 'email'] as const) {
    it(`opens ${method} in the browser once and waits for authenticated state rather than trusting action success`, async () => {
      const cloud = fixture();
      const node = await mount(<div />);
      await act(async () => { cloud.snapshot.settle(SIGNED_OUT); });
      const button = node.querySelector<HTMLButtonElement>(`[data-testid="account-continue-${method}"]`)!;
      await act(async () => { button.click(); button.click(); });
      expect(cloud.methods).toEqual([method]);
      expect(node.querySelectorAll('[data-testid^="account-continue-"]')).toHaveLength(0);
      expect(node.querySelector('[role="status"]')?.textContent).toBe(t(method === 'email' ? 'account.hostedSignIn' : 'account.browserPending'));
      expect(node.querySelector('[data-testid="account-cancel-sign-in"]')).not.toBeNull();
      await act(async () => { cloud.signIn.settle({ ok: true }); });
      expect(node.querySelector('[data-testid="getting-started"]')).not.toBeNull();
      await act(async () => { cloud.publish(SIGNED_IN); });
      expect(node.querySelector('[data-testid="getting-started"]')).toBeNull();
    });
  }

  it('ignores an old browser refusal after another tab signs in', async () => {
    const cloud = fixture();
    const node = await mount(<div />);
    await act(async () => { cloud.snapshot.settle(SIGNED_OUT); });
    await act(async () => { node.querySelector<HTMLButtonElement>('[data-testid="account-continue-google"]')!.click(); });
    await act(async () => { cloud.publish(SIGNED_IN); });
    await act(async () => { cloud.signIn.settle({ ok: false, code: 'failed' }); });
    await act(async () => { cloud.publish({ ...SIGNED_OUT, revision: 3 }); });
    expect(node.querySelector('[role="alert"]')).toBeNull();
  });

  it('cancels browser sign-in through sign-out once, rejects overlapping actions and suppresses the old result', async () => {
    const cloud = fixture();
    const node = await mount(<div />);
    await act(async () => { cloud.snapshot.settle(SIGNED_OUT); });
    const signIn = node.querySelector<HTMLButtonElement>('[data-testid="account-continue-google"]')!;
    await act(async () => { signIn.click(); });
    const cancel = node.querySelector<HTMLButtonElement>('[data-testid="account-cancel-sign-in"]')!;
    expect(cancel.disabled).toBe(false);
    await act(async () => { cancel.click(); cancel.click(); signIn.click(); });
    expect(cloud.signOutCalls()).toBe(1);
    expect(cloud.methods).toEqual(['google']);
    expect(cancel.disabled).toBe(true);
    await act(async () => { cloud.signOut.settle({ ok: true }); });
    expect(signIn.disabled).toBe(false);
    expect(node.querySelector('[data-testid="account-cancel-sign-in"]')).toBeNull();
    await act(async () => { cloud.signIn.settle({ ok: false, code: 'superseded' }); });
    expect(node.querySelector('[role="alert"]')).toBeNull();
    expect(node.querySelector('[data-testid="getting-started"]')).not.toBeNull();
  });

  it('offers retry without exposing local login on an initial snapshot failure', async () => {
    const cloud = fixture();
    const node = await mount(<div data-testid="legacy-login" />, true);
    await act(async () => { cloud.snapshot.refuse(new Error('unavailable')); });
    expect(node.querySelector('[role="alert"]')?.textContent).toBe(t('account.stateFailed'));
    expect(node.querySelector('[data-testid="legacy-login"]')?.closest('[hidden]')).not.toBeNull();
    window.studio.onlookState = async () => SIGNED_OUT;
    await act(async () => { node.querySelector<HTMLButtonElement>('button')!.click(); });
    expect(node.querySelector('[data-testid="getting-started"]')).not.toBeNull();
  });
});
