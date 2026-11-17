import type { ComponentType, ReactNode, SVGProps } from 'react';
import { VStack, HStack, Card } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { ShimmerText } from '@studio/chat-ui';
import { t } from '@studio/i18n';

type AgentCardState = 'default' | 'connected' | 'comingSoon';

/** Rendered as an element, never handed to an `icon` slot prop: `renderIconSlot` throws on the family's `React.memo` glyphs. */
type Mark = ComponentType<SVGProps<SVGSVGElement> & { size?: string | number }>;

export interface AgentCardProps {
  state: AgentCardState;
  icon: Mark;
  /** Already translated: the agent's name is data. */
  label: string;
  status?: string;
  isStatusBusy?: boolean;
  /** Ignored on a `comingSoon` card; the chip owns that corner. */
  corner?: ReactNode;
  /** `data-status` for specs: rendered text is off limits to them. */
  statusId?: string;
  /** Out of reach while something else holds the screen: muted, and announced as unavailable. */
  isDisabled?: boolean;
  onSelect?: () => void;
  testId?: string;
}

const CARD_HEIGHT = 120;

export function AgentCard({
  state,
  icon: Mark,
  label,
  status,
  isStatusBusy = false,
  corner,
  statusId,
  isDisabled = false,
  onSelect,
  testId = 'agent-card',
}: AgentCardProps): React.JSX.Element {
  const isComingSoon = state === 'comingSoon';

  // One token per state, measured off the design's per-state rasters.
  const markColor = {
    default: 'var(--color-icon-primary)',
    connected: 'var(--color-icon-secondary)',
    comingSoon: 'var(--color-icon-disabled)',
  }[state];

  const shell = {
    padding: 4,
    height: CARD_HEIGHT,
    style: { flex: '1 0 0', minWidth: 0 },
    'data-testid': testId,
    'data-state': state,
    ...(statusId === undefined ? {} : { 'data-status': statusId }),
  } as const;

  const body = (
    <VStack height="100%" justify="between" align="start">
      <HStack width="100%" justify="between" align="center">
        <Mark size={24} style={{ color: markColor, flexShrink: 0 }} />
        {isComingSoon ? (
          <Text type="supporting" weight="medium" color="disabled" style={{ whiteSpace: 'nowrap' }}>
            {t('agent.card.comingSoon')}
          </Text>
        ) : (
          corner
        )}
      </HStack>

      {status !== undefined ? (
        <VStack gap={0.5} align="start" width="100%">
          <Text type="body" weight="medium" color="secondary">
            {label}
          </Text>
          {isStatusBusy ? (
            <ShimmerText isActive type="body" weight="medium" hasGlow={false}>
              {status}
            </ShimmerText>
          ) : (
            <Text type="body" weight="medium" color="primary">
              {status}
            </Text>
          )}
        </VStack>
      ) : (
        <Text type="body" weight="medium" color={isComingSoon ? 'disabled' : 'primary'}>
          {label}
        </Text>
      )}
    </VStack>
  );

  // A plain `Card`, not a disabled `ClickableCard`: the tokens already mute it and `disabled` would halve the label's contrast again.
  if (isComingSoon) {
    return (
      <Card variant="muted" {...shell}>
        {body}
      </Card>
    );
  }

  return (
    <ClickableCard
      label={[label, status].filter(Boolean).join(', ')}
      variant="gray"
      isDisabled={isDisabled}
      onClick={onSelect}
      {...shell}
    >
      {body}
    </ClickableCard>
  );
}
