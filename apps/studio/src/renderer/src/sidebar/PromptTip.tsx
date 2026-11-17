import { useEffect } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { sendTelemetry } from '../canvas/telemetry.js';
import { t } from '@studio/i18n';
import { PromptsTipGlyph } from '../icons/glyphs.js';
import { TIP_LIFETIME_MS, watchTipLifetime } from '../tips/lifetime.js';
import { endTipMoment } from '../tips/moment.js';
import { openTips, setTipsTab, setTipsView } from '../tips/store.js';
import { telemetryProjectFields } from '../workspace/store.js';
import { useFootTipSeen } from './footSeat.js';
import { endPromptTip, markPromptTipShown, promptTipWasShown, usePromptTipStore } from './promptTipStore.js';
import { TIP_PADDING } from '../panels/rowGeometry.js';
import { TipActions } from './TipActions.js';

export function PromptTipCard({ onShow, onLater }: { onShow: () => void; onLater: () => void }): React.JSX.Element {
  return (
    <div data-testid="prompt-tip" style={{ padding: TIP_PADDING }}>
      <Card padding={3} variant="muted" width="100%">
        <VStack gap={3}>
          <VStack gap={1}>
            <HStack gap={1.5} vAlign="center">
              <Icon icon={PromptsTipGlyph} size="sm" color="secondary" />
              <Text type="supporting" color="secondary">{t('firstRun.tip.label')}</Text>
            </HStack>
            <Text type="large" color="primary">{t('firstRun.tip.prompt.hook')}</Text>
            <Text type="supporting" color="secondary">{t('firstRun.tip.prompt.body')}</Text>
          </VStack>
          <TipActions
            action={<Button label={t('firstRun.tip.prompt.show')} variant="secondary" size="sm" width="100%" onClick={onShow} data-testid="prompt-tip-show" />}
            dismiss={<Button label={t('firstRun.tip.prompt.dismiss')} variant="ghost" size="sm" width="100%" onClick={onLater} data-testid="prompt-tip-later" />}
          />
        </VStack>
      </Card>
    </div>
  );
}

function openTipsOnPrompts(): void {
  setTipsView('prompts');
  setTipsTab('featured');
  openTips('rail_tip');
}

export function PromptTipFoot({ path }: { path: string }): React.JSX.Element {
  const isSeen = useFootTipSeen('prompt');
  const offeredAt = usePromptTipStore((state) => state.offeredAt);

  useEffect(() => {
    if (!isSeen || promptTipWasShown(usePromptTipStore.getState(), path)) return;
    markPromptTipShown(path);
    sendTelemetry({ event: 'first_run_shown', properties: { ...telemetryProjectFields(), surface: 'prompt_tip', ...(offeredAt === null ? {} : { delay_ms: Date.now() - offeredAt }) } });
  }, [isSeen, path, offeredAt]);

  const acted = (action: 'show_prompts' | 'not_now' | 'timed_out') =>
    sendTelemetry({ event: 'first_run_acted', properties: { ...telemetryProjectFields(), surface: 'prompt_tip', action } });

  useEffect(() => {
    if (!isSeen) return;
    return watchTipLifetime(`prompt\n${path}`, TIP_LIFETIME_MS, () => {
      acted('timed_out');
      endPromptTip(path);
    });
  }, [isSeen, path]);

  return (
    <PromptTipCard
      onShow={() => {
        acted('show_prompts');
        endPromptTip(path);
        openTipsOnPrompts();
      }}
      onLater={() => {
        acted('not_now');
        endPromptTip(path);
        endTipMoment(path);
      }}
    />
  );
}
