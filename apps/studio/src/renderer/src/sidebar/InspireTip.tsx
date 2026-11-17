import { useEffect, useRef } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { startInspiration } from '../canvas/inspire/run.js';
import { sendTelemetry } from '../canvas/telemetry.js';
import { t } from '@studio/i18n';
import { AddInspirationGlyph } from '../icons/glyphs.js';
import { TIP_PADDING } from '../panels/rowGeometry.js';
import { telemetryProjectFields } from '../workspace/store.js';
import { claimTipHome } from '../tips/early.js';
import { beginTipLeaving, spendTip, type InspireTipPhase } from './footSeat.js';
import { armScrollTip } from './scrollTipStore.js';
import { TipActions } from './TipActions.js';

export function InspireTipCard({
  onAdd,
  onLater,
  tipRef,
}: {
  onAdd: () => void;
  onLater: () => void;
  tipRef?: React.Ref<HTMLDivElement>;
}): React.JSX.Element {
  return (
    <div ref={tipRef} data-testid="inspire-tip" style={{ padding: TIP_PADDING, transformOrigin: 'bottom center' }}>
      <Card padding={3} variant="muted" width="100%">
        <VStack gap={3}>
          <VStack gap={1}>
            <HStack gap={1.5} vAlign="center">
              <Icon icon={AddInspirationGlyph} size="sm" color="secondary" />
              <Text type="supporting" color="secondary">{t('firstRun.tip.label')}</Text>
            </HStack>
            <Text type="large" color="primary">{t('firstRun.tip.inspire.hook')}</Text>
            <Text type="supporting" color="secondary">{t('firstRun.tip.inspire.body')}</Text>
          </VStack>
          <TipActions
            action={<Button label={t('firstRun.tip.inspire.add')} variant="secondary" size="sm" width="100%" onClick={onAdd} data-testid="inspire-tip-add" />}
            dismiss={<Button label={t('firstRun.tip.later')} variant="ghost" size="sm" width="100%" onClick={onLater} data-testid="inspire-tip-later" />}
          />
        </VStack>
      </Card>
    </div>
  );
}

const shownThisLaunch = new Set<string>();

export function InspireTipFoot({ path, phase }: { path: string; phase: InspireTipPhase }): React.JSX.Element {
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    claimTipHome('inspire', path);
    if (shownThisLaunch.has(path)) return;
    shownThisLaunch.add(path);
    sendTelemetry({ event: 'first_run_shown', properties: { ...telemetryProjectFields(), surface: 'inspire_tip' } });
  }, [path]);

  const acted = (action: 'add' | 'not_now') =>
    sendTelemetry({ event: 'first_run_acted', properties: { ...telemetryProjectFields(), surface: 'inspire_tip', action } });
  return (
    <div>
      <InspireTipCard
        tipRef={tipRef}
        onAdd={() => {
          if (phase !== 'open') return;
          acted('add');
          beginTipLeaving(path);
          const frameId = startInspiration({ tip: tipRef.current, onTipGone: () => spendTip(path) });
          if (frameId !== null) armScrollTip(path, frameId);
        }}
        onLater={() => {
          if (phase !== 'open') return;
          acted('not_now');
          spendTip(path);
        }}
      />
    </div>
  );
}
