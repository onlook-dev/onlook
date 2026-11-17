import { Icon } from '@astryxdesign/core/Icon';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { ShimmerText } from '@studio/chat-ui';
import { SETUP_STEP_IDS, type SetupStepId } from '@studio/events';

import { FAILED_STEP_NAME } from '../setupStepNames.js';
import { t, type StringKey } from '@studio/i18n';
import { ExclamationCircleIcon } from '../icons/glyphs.js';
import type { ShownSetupProgress } from './footSeat.js';

const STEP_LABEL: Record<SetupStepId, StringKey> = {
  find: 'sidebar.setup.step.find',
  install: 'sidebar.setup.step.install',
  start: 'sidebar.setup.step.start',
  canvas: 'sidebar.setup.step.canvas',
};

const FAILED_LABEL: Record<2 | 3, StringKey> = { 2: FAILED_STEP_NAME.install, 3: FAILED_STEP_NAME.start };

const SEGMENT: React.CSSProperties = { height: 2, borderRadius: 'var(--radius-full)' };
const ICON_CELL: React.CSSProperties = { width: 14, height: '1lh', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-supporting-size)', lineHeight: 'var(--text-supporting-leading)' };

function StepLine({ lit }: { lit: number }): React.JSX.Element {
  const count = SETUP_STEP_IDS.length;
  return (
    <div aria-hidden style={{ display: 'grid', gridTemplateColumns: `repeat(${String(count)}, 1fr)`, columnGap: 3 }}>
      {lit > 0 ? <span data-segment="lit" style={{ ...SEGMENT, gridColumn: `span ${String(lit)}`, background: 'var(--color-text-primary)' }} /> : null}
      {Array.from({ length: count - lit }, (_, i) => <span key={i} data-segment="ahead" style={{ ...SEGMENT, background: 'var(--color-border)' }} />)}
    </div>
  );
}

export function SetupStepBar({ progress }: { progress: ShownSetupProgress }): React.JSX.Element {
  const failed = progress.state === 'failed';
  const count = SETUP_STEP_IDS.length;
  return (
    <VStack
      gap={2}
      role="status"
      data-testid="setup-step-bar"
      data-state={progress.state}
      data-at={progress.at}
      style={{ flexShrink: 0, paddingInline: 'var(--spacing-3)', paddingBlock: 'var(--spacing-3)' }}
    >
      <HStack gap={1.5} vAlign="center" style={{ minWidth: 0 }}>
        {failed ? (
          <span aria-hidden style={ICON_CELL}>
            <Icon icon={ExclamationCircleIcon} size="sm" color="inherit" style={{ width: 14, height: 14, color: 'var(--color-text-primary)' }} />
          </span>
        ) : null}
        <div style={{ flex: 1, minWidth: 0, display: 'flex' }}>
          {failed ? (
            <Text type="supporting" color="primary" maxLines={1} style={{ minWidth: 0 }}>{t(FAILED_LABEL[progress.at])}</Text>
          ) : (
            <ShimmerText isActive type="supporting" weight="normal" base="var(--color-text-secondary)" crest="var(--color-text-primary)" hasGlow={false} sweepMs={2600} style={{ whiteSpace: 'nowrap' }}>
              {t(STEP_LABEL[SETUP_STEP_IDS[progress.at - 1]!])}
            </ShimmerText>
          )}
        </div>
        {failed ? null : (
          <Text type="supporting" color="disabled" style={{ flexShrink: 0 }}>{t('sidebar.setup.position', { at: progress.at, count })}</Text>
        )}
      </HStack>
      <StepLine lit={failed ? progress.at - 1 : progress.at} />
    </VStack>
  );
}
