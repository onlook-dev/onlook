import { useState } from 'react';
import type { OnlookState } from '@studio/events';
import { AccountSettingsDialog } from '../../cloud/AccountSettings.js';
import { AccountPending, GettingStarted } from '../../cloud/GettingStarted.js';
import { accountErrorText, type AccountAction, type AccountError, type SignInMethod } from '../../cloud/useAccountAction.js';
import { t, type StringKey } from '@studio/i18n';
import { noop, type Gallery, type Story } from './Showroom.js';
import { TopBarView } from '../../chrome/TopBar.js';

const LIGHT_SURFACE = {
  colorScheme: 'light', color: '#171717', '--studio-ground': '#f1f1f1',
  '--color-background-body': '#f1f1f1', '--color-text-primary': '#171717', '--color-text-secondary': '#737373',
  '--color-background-gray': '#e5e5e5', '--color-background-inverted': '#262626', '--color-on-light': '#ffffff',
  '--color-icon-primary': '#171717', '--color-icon-secondary': '#737373',
  '--color-accent': '#262626', '--color-on-accent': '#ffffff', '--color-neutral': '#0000000F',
  '--color-overlay-hover': '#0000000D', '--color-overlay-pressed': '#0000001A', '--color-error': '#89001a',
} as React.CSSProperties;

function AccountBand(): React.JSX.Element {
  return <TopBarView update={null} tabs={[{ id: 'project', name: 'Website' }]} activeTabId="project" canCreate isHome={false}
    slots={{ blendsIntoScreen: true, tabsHidden: true }} windowControls="leading" onSelectTab={noop} onCloseTab={noop}
    onNewTab={noop} onRenameTab={noop} onReloadTab={noop} onFolder={noop} onToggleRail={noop} onGitAction={noop} onGitPick={noop} />;
}

const SIGNED_IN: OnlookState = {
  revision: 1, session: 'signed-in', connection: 'connected',
  profile: { name: 'Alex Designer', email: 'alex@example.com', picture: null },
  me: null,
};

function SettingsStill({ confirming = false, busy = null, error, longEmail = false }: {
  confirming?: boolean;
  busy?: AccountAction | null;
  error?: AccountError;
  longEmail?: boolean;
}): React.JSX.Element {
  const [confirmation, setConfirmation] = useState(confirming);
  const state = longEmail ? { ...SIGNED_IN, profile: { name: 'Alex Designer', email: 'alex.design-and-development-with-a-very-long-address@a-very-long-company-domain.example.com', picture: null } } : SIGNED_IN;
  return <AccountSettingsDialog state={state} isOpen isInline confirming={confirmation} busy={busy} error={error}
    onClose={noop} onSignOut={noop} onDelete={noop}
    onRequestDelete={() => { setConfirmation(true); }} onCancelDelete={() => { setConfirmation(false); }} />;
}

function frame(children: React.ReactNode, still: string, light = false): React.JSX.Element {
  return <div data-account-access-still={still} data-appearance={light ? 'light' : 'dark'}
    style={{ ...(light ? LIGHT_SURFACE : {}), width: 'min(900px, 100%)', height: 680, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
    {still.startsWith('start-') ? <AccountBand /> : null}{children}
  </div>;
}

const LABELS: Record<string, StringKey> = {
  default: 'account.gallery.default', hover: 'account.gallery.hover', focus: 'account.gallery.focus',
  google: 'account.continue.google', github: 'account.continue.github', email: 'account.continue.email',
  confirmation: 'account.deleteConfirmTitle', deleting: 'account.deleting', signout: 'account.signingOut',
  long: 'account.gallery.longEmail',
  cancelling: 'account.cancellingSignIn',
};

const CAUSES = ['mfa_enrollment', 'mfa_challenge', 'mfa_verification', 'organization_selection_required', 'sso_required'] as const;

export function accountAccessGallery(): Gallery {
  const started = (id: string, props: { busy?: SignInMethod | 'sign-out'; error?: AccountError; errorMethod?: SignInMethod | null; step?: OnlookState['signInStep'] } = {}, light = false): Story => ({
    id: `account-access-start-${id.replaceAll('_', '-')}${light ? '-light' : ''}`, title: id === 'verification' ? t('account.emailVerification') : id === 'browser' ? t('account.hostedSignIn') : props.error === undefined ? t(LABELS[id]!) : accountErrorText(props.error, props.errorMethod ?? null), wide: true,
    render: () => frame(<GettingStarted {...props} onSignIn={noop} onCancel={noop} />, `start-${id}`, light),
  });
  const settings = (id: string, props: Parameters<typeof SettingsStill>[0] = {}): Story => ({
    id: `account-access-settings-${id.replaceAll('_', '-')}`, title: props.error === undefined ? t(LABELS[id]!) : accountErrorText(props.error), wide: true,
    render: () => frame(<SettingsStill {...props} />, `settings-${id}`),
  });
  return {
    id: 'account-access', title: t('account.gallery.title'),
    frame: (children) => <>
      <style>{`
        [data-account-access-still='start-hover'] [data-testid^='account-continue-'],
        [data-account-access-still='settings-hover'] [data-testid='account-settings-sign-out'] { background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover)); }
        [data-account-access-still='start-focus'] [data-testid^='account-continue-'],
        [data-account-access-still='settings-focus'] [data-testid='account-settings-sign-out'] { outline: 2px solid var(--color-accent); outline-offset: var(--button-focus-offset); }
        [data-account-access-still='loading-reduced-motion'] .account-startup-progress > div { animation: none; margin-inline: auto; }
        [data-account-access-still='load-error-hover'] button { background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover)); }
        [data-account-access-still='load-error-focus'] button { outline: 2px solid var(--color-accent); outline-offset: var(--button-focus-offset); }
      `}</style>
      {children}
    </>,
    categories: [
      { id: 'initializing', title: t('account.loading'), stories: [
        { id: 'account-access-loading', title: t('account.loading'), wide: true, render: () => frame(<AccountPending onRetry={noop} />, 'loading') },
        { id: 'account-access-loading-reduced-motion', title: t('account.loading'), wide: true, render: () => frame(<AccountPending onRetry={noop} />, 'loading-reduced-motion') },
        { id: 'account-access-load-error', title: t('account.stateFailed'), wide: true, render: () => frame(<AccountPending failed onRetry={noop} />, 'load-error') },
        { id: 'account-access-load-error-hover', title: t('account.stateFailed'), wide: true, render: () => frame(<AccountPending failed onRetry={noop} />, 'load-error-hover') },
        { id: 'account-access-load-error-focus', title: t('account.stateFailed'), wide: true, render: () => frame(<AccountPending failed onRetry={noop} />, 'load-error-focus') },
      ] },
      { id: 'getting-started', title: t('account.getStarted'), stories: [
        { id: 'account-access-start-session-ended', title: t('account.sessionEnded'), wide: true, render: () => frame(<GettingStarted sessionEnded onSignIn={noop} onCancel={noop} />, 'start-session-ended') },
        started('default'), started('hover'), started('focus'),
        started('verification', { busy: 'github', step: 'email-verification' }),
        started('browser', { busy: 'google', step: 'browser' }),
        ...(['google', 'github', 'email'] as const).map((method) => started(`${method}_failed`, { error: 'invalid_grant', errorMethod: method })),
        ...CAUSES.map((error) => started(error, { error, errorMethod: 'github' })),
        started('team_only', { error: 'team_only' }),
        ...(['google', 'github', 'email'] as const).map((busy) => started(busy, { busy })),
        started('cancelling', { busy: 'sign-out' }),
        ...(['failed', 'denied', 'busy', 'not_configured', 'superseded'] as const).map((error) => started(error, { error })),
      ] },
      { id: 'getting-started-light', title: t('account.getStarted'), stories: [
        started('default', {}, true), started('hover', {}, true), started('focus', {}, true),
        started('verification', { busy: 'github', step: 'email-verification' }, true),
        started('browser', { busy: 'google', step: 'browser' }, true),
        ...(['google', 'github', 'email'] as const).map((method) => started(`${method}_failed`, { error: 'invalid_grant', errorMethod: method }, true)),
        ...CAUSES.map((error) => started(error, { error, errorMethod: 'github' }, true)),
        started('team_only', { error: 'team_only' }, true),
        ...(['google', 'github', 'email'] as const).map((busy) => started(busy, { busy }, true)),
        started('cancelling', { busy: 'sign-out' }, true),
        ...(['failed', 'denied', 'busy', 'not_configured', 'superseded'] as const).map((error) => started(error, { error }, true)),
      ] },
      { id: 'settings', title: t('account.settingsTitle'), stories: [
        settings('default'), settings('hover'), settings('focus'), settings('long', { longEmail: true }),
        settings('signout', { busy: 'sign-out' }), settings('failed', { error: 'failed' }),
        settings('confirmation', { confirming: true }), settings('deleting', { confirming: true, busy: 'delete' }),
        settings('last_admin', { confirming: true, error: 'last_admin' }),
        settings('denied', { confirming: true, error: 'denied' }),
        settings('busy', { confirming: true, error: 'busy' }),
        settings('superseded', { confirming: true, error: 'superseded' }),
        settings('not_configured', { error: 'not_configured' }),
      ] },
    ],
  };
}
