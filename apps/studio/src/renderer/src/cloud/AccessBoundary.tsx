import { useEffect, useRef, type ReactNode } from 'react';
import { Dialog } from '../overlay/Dialog.js';
import { t } from '@studio/i18n';
import { oneLine } from '@studio/i18n/lines';
import { BlendedWindowBar, BlockedWindowBarContext } from '../topbar/slots.js';
import { AccountPending, GettingStarted } from './GettingStarted.js';
import { retryOnlookState, useOnlookState } from './store.js';
import { LoginAside } from '../login/LoginAside.js';
import { useAccountAction } from './useAccountAction.js';

export default function AccessBoundary({ children, requiresSession = false }: { children: ReactNode; requiresSession?: boolean }): React.JSX.Element {
  const { state, failed, sessionRevision } = useOnlookState();
  const action = useAccountAction(state, sessionRevision);
  /** A required session gates an unknown or refused state too; a build that requires none has no session to wait for (ONL-2780). */
  const blocked = requiresSession ? state?.session !== 'signed-in' : state?.session === 'signed-out';
  const content = useRef<HTMLDivElement>(null);
  const gate = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (blocked) {
      gate.current?.focus();
    } else if (previousFocus.current?.isConnected) {
      previousFocus.current.focus({ preventScroll: true });
      previousFocus.current = null;
    }
  }, [blocked]);

  useEffect(() => {
    const hidden = content.current;
    if (!blocked || hidden === null) return;
    const dialogs = new Set<HTMLDialogElement>();
    const suppressElement = (element: Element): void => {
      if (element instanceof HTMLDialogElement && element.open) {
        dialogs.add(element);
        element.close();
      }
      if (element instanceof HTMLElement && element.hasAttribute('popover') && element.matches(':popover-open')) element.hidePopover();
    };
    const suppress = (root: Element): void => {
      suppressElement(root);
      for (const element of root.querySelectorAll('dialog[open], [popover]')) {
        suppressElement(element);
      }
      if (document.activeElement !== null && hidden.contains(document.activeElement)) gate.current?.focus();
    };
    const preventOpening = (event: Event): void => {
      if ((event as ToggleEvent).newState !== 'open') return;
      if (event.target instanceof HTMLDialogElement) dialogs.add(event.target);
      event.preventDefault();
    };
    const keepFocus = (event: FocusEvent): void => {
      if (!(event.target instanceof Node) || !hidden.contains(event.target)) return;
      suppress(hidden);
      gate.current?.focus();
    };
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'attributes' && record.target instanceof Element) suppress(record.target);
        for (const added of record.addedNodes) {
          if (added instanceof Element) suppress(added);
        }
      }
    });
    observer.observe(hidden, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
    hidden.addEventListener('beforetoggle', preventOpening, true);
    document.addEventListener('focusin', keepFocus, true);
    suppress(hidden);
    return () => {
      observer.disconnect();
      hidden.removeEventListener('beforetoggle', preventOpening, true);
      document.removeEventListener('focusin', keepFocus, true);
      for (const dialog of dialogs) {
        if (dialog.isConnected && !dialog.open && getComputedStyle(dialog).display !== 'none') dialog.showModal();
      }
    };
  }, [blocked]);

  return <>
    <BlockedWindowBarContext value={blocked}>
      <div ref={content} hidden={blocked} inert={blocked} data-account-blocked={blocked || undefined} style={{ display: blocked ? 'none' : 'contents' }}
        onFocusCapture={(event) => { if (!blocked && event.target instanceof HTMLElement) previousFocus.current = event.target; }}>
        {children}
      </div>
    </BlockedWindowBarContext>
    {blocked ? <BlendedWindowBar /> : null}
    {blocked ? <Dialog modal="gate" isOpen purpose="required" variant="fullscreen" padding={0} onOpenChange={() => {}}
      aria-label={oneLine(t('account.getStarted'))} style={{ background: 'var(--studio-ground)', animation: 'none', borderRadius: 0, boxShadow: 'none' }}>
      <div ref={gate} tabIndex={-1} data-testid="account-access-gate" style={{ width: '100%', height: '100%', outline: 'none' }}>
      <style>{`[data-account-blocked] dialog, [data-account-blocked] [popover] { display: none !important; }`}</style>
      {state !== null ? <GettingStarted sessionEnded={state.sessionEnded} busy={action.busy === 'delete' ? null : action.busy} step={state.signInStep}
        error={action.error} errorMethod={action.errorMethod} onSignIn={(method) => { void action.run(method); }} onCancel={() => { void action.run('sign-out'); }}
        aside={<LoginAside />} />
        : <AccountPending failed={failed} onRetry={retryOnlookState} />}
      </div>
    </Dialog> : null}
  </>;
}
