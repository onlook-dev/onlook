import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Switch } from '@astryxdesign/core/Switch';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@astryxdesign/core/Toast';
import { notificationInvitationAsks, type NotificationAction, type NotificationPreference, type TabNotice } from '@studio/events';
import { SettingsRow } from '../settings/rows.js';
import { useSettingsStore } from '../settings/store.js';
import { t } from '@studio/i18n';
import { notificationLine } from '@studio/i18n/notifications';
import { RepositoryAvatar } from '../github-import/RepositoryAvatar.js';
import { studio } from '../bridge.js';

export interface NotificationControls {
  preference: NotificationPreference;
  onAction: (action: NotificationAction) => void;
  isSaving?: boolean;
  error?: string;
}

export function NotificationSettingsRow({ preference, onAction, isSaving = false, error }: NotificationControls): React.JSX.Element {
  const detail = error ?? (preference.delivery === 'failed' ? t('notifications.failed') : preference.enabled && preference.delivery === 'unconfirmed' ? t('notifications.unconfirmed') : t('notifications.description'));
  return <VStack gap={0} data-testid="notification-settings">
    <SettingsRow label={t('notifications.title')} description={detail} control={<Switch label={t('notifications.title')} isLabelHidden value={preference.enabled} isDisabled={isSaving} onChange={(enabled) => onAction({ kind: enabled ? 'enable' : 'disable' })} data-testid="notification-toggle" />} />
    <HStack paddingInline={5} style={{ paddingBottom: 'var(--spacing-3)' }}><Button label={t('notifications.systemSettings')} size="sm" variant="ghost" isDisabled={isSaving} onClick={() => onAction({ kind: 'open-settings' })} data-testid="notification-system-settings" /></HStack>
  </VStack>;
}

export function NotificationInvitation({ preference, onAction, isSaving = false, error, isHidden = false }: NotificationControls & { isHidden?: boolean }): React.JSX.Element | null {
  const [dismissedHere, setDismissedHere] = useState(false);
  if (isHidden || preference.enabled) return null;
  if (!notificationInvitationAsks(preference) && !(preference.invitation === 'dismissed' && dismissedHere)) return null;
  return <VStack gap={2} padding={3} style={{ border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-container)' }} data-testid="notification-invitation" data-state={preference.invitation}>
    {preference.invitation === 'dismissed' ? <Text type="supporting">{t('notifications.dismissed')}</Text> : <>
      <Text type="body">{t('notifications.invitation.title')}</Text>
      <Text type="supporting">{t('notifications.invitation.body')}</Text>
      <Button label={t('notifications.enable')} size="sm" variant="primary" isDisabled={isSaving} onClick={() => onAction({ kind: 'enable' })} data-testid="notification-enable" />
      <HStack gap={2} style={{ flexWrap: 'wrap' }}>
        <Button label={t('notifications.snooze')} size="sm" variant="secondary" isDisabled={isSaving} onClick={() => onAction({ kind: 'snooze' })} data-testid="notification-snooze" />
        <Button label={t('notifications.dismiss')} size="sm" variant="ghost" isDisabled={isSaving} onClick={() => { setDismissedHere(true); onAction({ kind: 'dismiss' }); }} data-testid="notification-dismiss" />
      </HStack>
    </>}
    {error !== undefined && <Text type="supporting" style={{ color: 'var(--color-error)' }} role="alert">{error}</Text>}
  </VStack>;
}

export function useNotificationControls(): NotificationControls {
  const preference = useSettingsStore((state) => state.notifications);
  const action = useSettingsStore((state) => state.notificationAction);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const pending = useRef(false);
  const onAction = useCallback((request: NotificationAction): void => {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setError(undefined);
    void action(request).catch(() => setError(t('notifications.saveFailed'))).finally(() => {
      pending.current = false;
      setSaving(false);
    });
  }, [action]);
  return { preference, onAction, isSaving, ...(error === undefined ? {} : { error }) };
}

export function noticeBody(notice: Pick<TabNotice, 'kind' | 'name' | 'repository'>): React.ReactNode {
  const line = notificationLine(notice.kind, notice.repository ?? notice.name);
  if (notice.repository === undefined) return line;
  return <HStack align="center" gap={2} data-testid="notification-toast-repository"><RepositoryAvatar fullName={notice.repository} /><span>{line}</span></HStack>;
}

export function useTabNotices(): void {
  const showToast = useToast();
  useEffect(() => studio().onTabNotice((notice) => {
    showToast({ body: noticeBody(notice), type: 'info', uniqueID: notice.id, collisionBehavior: 'ignore', endContent: <Button label={t('notifications.open')} variant="ghost" size="sm" data-testid="notification-toast-open" onClick={() => {
      void studio().notificationAction({ kind: 'open', id: notice.id }).catch(() => showToast({ body: t('notifications.saveFailed'), type: 'error' }));
    }} /> });
  }), [showToast]);
}
