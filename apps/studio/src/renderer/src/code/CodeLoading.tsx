import { VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { t } from '@studio/i18n';

export function CodeLoading(): React.JSX.Element {
  return (
    <VStack align="center" justify="center" role="status" data-testid="code-panel-loading"
      style={{ flex: '1 1 auto', minHeight: 0, padding: 'var(--spacing-4)' }}>
      <Text type="supporting" color="secondary">{t('code.panel.loading')}</Text>
    </VStack>
  );
}
