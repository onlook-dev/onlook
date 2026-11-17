import { Button } from '@astryxdesign/core/Button';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { t } from '@studio/i18n';
import { useSetupFailure } from '../canvas/useSetupFailureCard.js';
import { askFromSetupFailureCard } from '../canvas/failureCentre.js';
import { shownRunNotice, type RunNotice } from './runFeedback.js';
import { runFeedback, useRunFeedbackStore } from './runFeedbackStore.js';

const noticeKeys = {
  'start-waiting': 'appRun.start-waiting',
  'start-failed': 'appRun.start-failed',
  'stop-waiting': 'appRun.stop-waiting',
  'stop-failed': 'appRun.stop-failed',
} as const;

export function RunNoticeCard({ notice, onDismiss, repair }: { notice: RunNotice; onDismiss: () => void; repair?: { reason: string; onAsk: () => void; isDisabled?: boolean; error?: string } }): React.JSX.Element {
  return <VStack gap={2} padding={3} style={{ width: '100%', boxSizing: 'border-box', border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-container)', flexShrink: 0 }} data-testid="app-run-notice" data-state={notice}>
    <Text type="supporting" role="status">{t(noticeKeys[notice])}</Text>
    {repair && <Text type="supporting" color="secondary" data-testid="app-run-notice-reason">{repair.reason}</Text>}
    {repair?.error && <Text type="supporting" role="status">{repair.error}</Text>}
    <HStack gap={2} style={{ flexWrap: 'wrap' }}>
      {repair && <Button label={t('canvas.setupFailure.ask')} size="sm" variant="secondary" onClick={repair.onAsk} isDisabled={repair.isDisabled} data-testid="app-run-notice-repair" />}
      <Button label={t('appRun.dismiss')} size="sm" variant="ghost" onClick={onDismiss} data-testid="app-run-notice-dismiss" />
    </HStack>
  </VStack>;
}

export function AppRunNotice(): React.JSX.Element | null {
  const { card, canvasCard, isShown, failure, workspacePath } = useSetupFailure();
  const isFailureCardHeld = canvasCard !== null;
  const [dismissed, setDismissed] = useState<{ workspacePath: string | undefined; failure: ProjectSetupFailure | null }>();
  const [askError, setAskError] = useState<{ workspacePath: string; failure: ProjectSetupFailure } | null>(null);
  const notice = shownRunNotice(useRunFeedbackStore((state) => state.notice), { isFailureCardHeld });
  const isDismissed = dismissed?.workspacePath === workspacePath && isSameSetupFailure(dismissed?.failure ?? null, failure);
  if (!isFailureCardHeld && card !== null) {
    if (!isShown || isDismissed || failure === null) return null;
    const onAsk = (): void => {
      if (workspacePath === undefined) return;
      setAskError(null);
      if (useRunFeedbackStore.getState().notice === 'start-failed') runFeedback.dismiss();
      void askFromSetupFailureCard(workspacePath, failure).then((result) => { if (!result.ok) setAskError({ workspacePath, failure }); });
    };
    return <RunNoticeCard notice="start-failed" repair={{ reason: failure.reason, onAsk, isDisabled: workspacePath === undefined, ...(askError?.workspacePath === workspacePath && isSameSetupFailure(askError?.failure ?? null, failure) ? { error: t('appRun.repair-unavailable') } : {}) }} onDismiss={() => { setDismissed({ workspacePath, failure }); runFeedback.dismiss(); }} />;
  }
  return notice === undefined ? null : <RunNoticeCard notice={notice} onDismiss={runFeedback.dismiss} />;
}
import { useState } from 'react';
import { isSameSetupFailure, type ProjectSetupFailure } from '@studio/events';
