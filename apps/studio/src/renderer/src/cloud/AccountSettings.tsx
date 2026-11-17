import { useEffect, useRef } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Dialog } from '../overlay/Dialog.js';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import type { OnlookState } from '@studio/events';
import { t } from '@studio/i18n';
import { CloseIcon } from '../icons/glyphs.js';
import { PANEL_HREF, PANEL_RULES } from '../panel/panelStyles.js';
import { accountErrorText, type AccountAction, type AccountError } from './useAccountAction.js';

export interface AccountSettingsProps {
  state: OnlookState;
  confirming?: boolean;
  busy?: AccountAction | null;
  error?: AccountError | undefined;
  onSignOut: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}

export function AccountSettings({ state, confirming = false, busy = null, error, onSignOut, onRequestDelete, onCancelDelete, onDelete }: AccountSettingsProps): React.JSX.Element {
  const email = state.profile?.email ?? state.me?.user?.email;
  return <VStack gap={6} align="stretch" data-testid="account-settings" aria-busy={busy !== null}>
    <VStack gap={2} align="start">
      <Text type="large">{t('account.signedInAs')}</Text>
      {state.profile?.name ? <Text style={{ overflowWrap: 'anywhere' }}>{state.profile.name}</Text> : null}
      <Text color="secondary" style={{ overflowWrap: 'anywhere', maxWidth: '100%' }} data-testid="account-settings-email">{email ?? t('account.profileUnavailable')}</Text>
    </VStack>
    <VStack gap={2} align="start">
      <Text color="secondary">{t('account.signOutDescription')}</Text>
      <Button label={t(busy === 'sign-out' ? 'account.signingOut' : 'account.signOut')} variant="secondary" isDisabled={busy !== null}
        onClick={onSignOut} style={{ minHeight: 40 }} data-testid="account-settings-sign-out" />
    </VStack>
    <VStack gap={3} align="start" style={{ paddingTop: 24, boxShadow: '0 -1px 0 var(--panel-line)' }}>
      <Text type="large">{t(confirming ? 'account.deleteConfirmTitle' : 'account.deleteTitle')}</Text>
      <Text color="secondary">{t(confirming ? 'account.deleteConfirmDescription' : 'account.deleteDescription')}</Text>
      {confirming ? <HStack gap={2} style={{ flexWrap: 'wrap' }}>
        <Button label={t('account.cancelDelete')} variant="secondary" isDisabled={busy !== null} onClick={onCancelDelete}
          style={{ minHeight: 40 }} data-testid="account-delete-cancel" />
        <Button label={t(busy === 'delete' ? 'account.deleting' : 'account.deleteConfirm')} variant="destructive" isDisabled={busy !== null || error === 'last_admin'}
          onClick={onDelete} style={{ minHeight: 40 }} data-testid="account-delete-confirm" />
      </HStack> : <Button label={t('account.deleteTitle')} variant="ghost" isDisabled={busy !== null} onClick={onRequestDelete}
        style={{ minHeight: 40, color: 'var(--color-error)' }} data-testid="account-delete-request" />}
    </VStack>
    {busy !== null ? <Text type="supporting" role="status">{t(busy === 'delete' ? 'account.deleting' : 'account.signingOut')}</Text> : null}
    {error !== undefined ? <Text type="supporting" role="alert" style={{ color: 'var(--color-error)' }}>{accountErrorText(error)}</Text> : null}
  </VStack>;
}

export interface AccountSettingsDialogProps extends AccountSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  isInline?: boolean;
}

export function AccountSettingsDialog({ isOpen, onClose, isInline, ...props }: AccountSettingsDialogProps): React.JSX.Element {
  const shell = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const target = props.confirming ? shell.current?.querySelector<HTMLElement>('[data-testid="account-delete-cancel"]') : shell.current;
    target?.focus({ preventScroll: true });
  }, [isOpen, props.confirming]);
  return <Dialog isOpen={isOpen} onOpenChange={(open) => { if (!open && !props.busy) onClose(); }}
    {...(isInline === undefined ? {} : { isInline })} width="min(640px, 88vw)" maxHeight="86vh" padding={0}
    aria-label={t('account.settingsTitle')} data-testid="account-settings-dialog">
    <style href={PANEL_HREF} precedence="medium">{PANEL_RULES}</style>
    <div ref={shell} className="panel-shell" tabIndex={-1} style={{ display: 'flex', height: 'auto', maxHeight: '86vh' }}>
      <div className="panel-main" style={{ width: '100%' }}>
        <div className="panel-head">
          <h1 className="panel-title">{t('account.settingsTitle')}</h1>
          <IconButton label={t('account.closeSettings')} icon={<Icon icon={CloseIcon} color="inherit" />} variant="ghost" size="sm"
            isDisabled={props.busy !== undefined && props.busy !== null} onClick={onClose} style={{ minWidth: 40, minHeight: 40 }} data-testid="account-settings-close" />
        </div>
        <div className="panel-content" style={{ paddingTop: 12 }}><AccountSettings {...props} /></div>
      </div>
    </div>
  </Dialog>;
}
