import { useEffect } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { sendTelemetry } from '../canvas/telemetry.js';
import { t } from '@studio/i18n';
import { BellIcon } from '../icons/glyphs.js';
import { useFootTipSeen } from '../sidebar/footSeat.js';
import { TIP_PADDING } from '../panels/rowGeometry.js';
import { telemetryProjectFields } from '../workspace/store.js';
import { useNotificationControls, type NotificationControls } from './NotificationSurfaces.js';
import { TipActions } from '../sidebar/TipActions.js';

export function InviteTipCard({ onAction, isSaving = false, error }: Omit<NotificationControls, 'preference'>): React.JSX.Element {
  return (
    <div data-testid="invite-tip" style={{ padding: TIP_PADDING }}>
      <Card padding={3} variant="muted" width="100%">
        <VStack gap={3}>
          <VStack gap={1}>
            <HStack gap={1.5} vAlign="center">
              <Icon icon={BellIcon} size="sm" color="secondary" />
              <Text type="supporting" color="secondary">{t('notifications.title')}</Text>
            </HStack>
            <Text type="large" color="primary">{t('notifications.invitation.title')}</Text>
            <Text type="supporting" color="secondary">{t('notifications.invitation.body')}</Text>
          </VStack>
          <TipActions
            action={<Button label={t('notifications.enable')} variant="secondary" size="sm" width="100%" isDisabled={isSaving} onClick={() => onAction({ kind: 'enable' })} data-testid="invite-tip-enable" />}
            dismiss={<Button label={t('notifications.dismiss')} variant="ghost" size="sm" width="100%" isDisabled={isSaving} onClick={() => onAction({ kind: 'dismiss' })} data-testid="invite-tip-dismiss" />}
          />
          {error !== undefined && <Text type="supporting" style={{ color: 'var(--color-error)' }} role="alert">{error}</Text>}
        </VStack>
      </Card>
    </div>
  );
}

let shownThisLaunch = false;

export function InviteTipFoot(): React.JSX.Element {
  const { onAction, isSaving, error } = useNotificationControls();
  const isSeen = useFootTipSeen('invite');

  useEffect(() => {
    if (!isSeen || shownThisLaunch) return;
    shownThisLaunch = true;
    sendTelemetry({ event: 'notification_invite_shown', properties: { ...telemetryProjectFields(), surface: 'rail_tip' } });
  }, [isSeen]);

  return (
    <InviteTipCard
      isSaving={isSaving ?? false}
      {...(error === undefined ? {} : { error })}
      onAction={(action) => {
        if (action.kind === 'enable' || action.kind === 'dismiss') {
          sendTelemetry({ event: 'notification_invite_acted', properties: { ...telemetryProjectFields(), surface: 'rail_tip', action: action.kind } });
        }
        onAction(action);
      }}
    />
  );
}
