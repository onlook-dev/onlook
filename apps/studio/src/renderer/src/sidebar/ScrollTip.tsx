import { useEffect } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { sendTelemetry } from '../canvas/telemetry.js';
import { t } from '@studio/i18n';
import { ScrollKeyGlyph } from '../icons/glyphs.js';
import { openTipsOnKeys } from '../tips/store.js';
import { telemetryProjectFields } from '../workspace/store.js';
import { useFootTipSeen } from './footSeat.js';
import { TIP_PADDING } from '../panels/rowGeometry.js';
import { spendScrollTip } from './scrollTipStore.js';
import { endTipMoment } from '../tips/moment.js';
import { TIP_LIFETIME_MS, watchTipLifetime } from '../tips/lifetime.js';
import { TipActions } from './TipActions.js';

export function ScrollTipCard({ onShow, onLater }: { onShow: () => void; onLater: () => void }): React.JSX.Element {
  return (
    <div data-testid="scroll-tip" style={{ padding: TIP_PADDING }}>
      <Card padding={3} variant="muted" width="100%">
        <VStack gap={3}>
          <VStack gap={1}>
            <HStack gap={1.5} vAlign="center">
              <Icon icon={ScrollKeyGlyph} size="sm" color="secondary" />
              <Text type="supporting" color="secondary">{t('firstRun.tip.label')}</Text>
            </HStack>
            <Text type="large" color="primary">{t('firstRun.tip.scroll.hook')}</Text>
            <Text type="supporting" color="secondary">{t('firstRun.tip.scroll.body')}</Text>
          </VStack>
          <TipActions
            action={<Button label={t('firstRun.tip.scroll.show')} variant="secondary" size="sm" width="100%" onClick={onShow} data-testid="scroll-tip-show" />}
            dismiss={<Button label={t('firstRun.tip.scroll.dismiss')} variant="ghost" size="sm" width="100%" onClick={onLater} data-testid="scroll-tip-later" />}
          />
        </VStack>
      </Card>
    </div>
  );
}

const shownThisLaunch = new Set<string>();

export function ScrollTipFoot({ path }: { path: string }): React.JSX.Element {
  const isSeen = useFootTipSeen('scroll');

  useEffect(() => {
    if (!isSeen || shownThisLaunch.has(path)) return;
    shownThisLaunch.add(path);
    sendTelemetry({ event: 'first_run_shown', properties: { ...telemetryProjectFields(), surface: 'scroll_tip' } });
  }, [isSeen, path]);

  const acted = (action: 'show_shortcuts' | 'not_now' | 'timed_out') =>
    sendTelemetry({ event: 'first_run_acted', properties: { ...telemetryProjectFields(), surface: 'scroll_tip', action } });

  useEffect(() => {
    if (!isSeen) return;
    return watchTipLifetime(`scroll\n${path}`, TIP_LIFETIME_MS, () => {
      acted('timed_out');
      spendScrollTip(path);
    });
  }, [isSeen, path]);
  return (
    <ScrollTipCard
      onShow={() => {
        acted('show_shortcuts');
        spendScrollTip(path);
        openTipsOnKeys('rail_tip');
      }}
      onLater={() => {
        acted('not_now');
        spendScrollTip(path);
        endTipMoment(path);
      }}
    />
  );
}
