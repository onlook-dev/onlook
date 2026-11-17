import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Icon } from '@astryxdesign/core/Icon';
import { VStack } from '@astryxdesign/core/VStack';
import { Text } from '@astryxdesign/core/Text';
import { CloseIcon, StarIcon } from '../icons/glyphs.js';
import { t } from '@studio/i18n';

export const ONLOOK_REPOSITORY_URL = 'https://github.com/onlook-dev/onlook';

/* Muted is darker than the rail; use its ground and row radius instead (ONL-2443). */
const CARD = {
  position: 'relative',
  borderRadius: 'var(--radius-element)',
  border: '0.5px solid var(--color-border)',
} as const;

const DISMISS = { position: 'absolute', top: 6, right: 6 } as const;

export interface DiscoverCardProps {
  onStar: (url: string) => void;
  onDismiss: () => void;
}

export function DiscoverCard({ onStar, onDismiss }: DiscoverCardProps): React.JSX.Element {
  return (
    <Card variant="transparent" padding={3} style={CARD} data-testid="projects-discover">
      <VStack gap={2} align="stretch">
        <VStack gap={0.5} align="start">
          <Text size="base" weight="medium" style={{ paddingInlineEnd: 24 }}>
            {t('projects.discover.title')}
          </Text>
          <Text size="sm" color="secondary">
            {t('projects.discover.body')}
          </Text>
        </VStack>
        <Button
          label={t('projects.discover.star')}
          icon={<Icon icon={StarIcon} size="sm" />}
          variant="secondary"
          size="sm"
          onClick={() => {
            onStar(ONLOOK_REPOSITORY_URL);
          }}
          style={{ width: '100%' }}
          data-testid="projects-discover-star"
        />
      </VStack>
      <Button
        label={t('projects.discover.dismiss')}
        isIconOnly
        icon={<Icon icon={CloseIcon} size="sm" />}
        variant="ghost"
        size="sm"
        style={DISMISS}
        onClick={onDismiss}
        data-testid="projects-discover-dismiss"
      />
    </Card>
  );
}
