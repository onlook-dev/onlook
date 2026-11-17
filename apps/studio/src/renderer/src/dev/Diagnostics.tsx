import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { RuntimeCheck } from '../diagnostics/RuntimeCheck.js';
import { t } from '@studio/i18n';

export function Diagnostics(): React.JSX.Element {
  return (
    <VStack gap={4} padding={6}>
      <Text weight="medium">{t('diag.title')}</Text>
      <HStack gap={2} vAlign="center">
        <RuntimeCheck />
      </HStack>
    </VStack>
  );
}
