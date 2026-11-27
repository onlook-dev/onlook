import { useId, type ReactNode } from 'react';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack, Layout, LayoutContent, LayoutFooter, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { t } from '@studio/i18n';

export interface FailureDialogBodyProps {
  title: string;
  body: string;
  /** A diagnosis in the product's own words, read before the machine's report. `pre-wrap`, so it can be more than one paragraph (ONL-3111); it breaks lines between words, and inside one only when that word alone overflows (ONL-3395). */
  explanation?: string;
  detail?: string;
  actions: ReactNode;
  titleId?: string;
  descriptionId?: string;
  'data-testid': string;
  'data-stage'?: string;
  explanationTestId?: string;
  detailTestId?: string;
}

export function FailureDialogBody({ title, body, explanation, detail, actions, titleId, descriptionId, explanationTestId, detailTestId, ...attributes }: FailureDialogBodyProps): React.JSX.Element {
  const fallbackTitleId = useId();
  const fallbackDescriptionId = useId();
  return (
    <Layout
      content={
        <LayoutContent>
          <VStack gap={3} {...attributes}>
            <VStack gap={1}>
              <Heading level={2} id={titleId ?? fallbackTitleId} tabIndex={-1} data-autofocus="" style={{ outline: 'none' }}>
                {title}
              </Heading>
              <Text type="supporting" color="secondary" id={descriptionId ?? fallbackDescriptionId}>
                {body}
              </Text>
            </VStack>
            {explanation === undefined ? null : (
              <Text type="body" style={{ lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }} data-testid={explanationTestId}>
                {explanation}
              </Text>
            )}
            {detail !== undefined && (
              <CodeBlock
                code={detail}
                language="plaintext"
                title={t('blank.create.failed.detailLabel')}
                width="100%"
                isWrapped
                maxHeight={220}
                size="sm"
                container="section"
                data-testid={detailTestId}
              />
            )}
          </VStack>
        </LayoutContent>
      }
      footer={
        <LayoutFooter hasDivider>
          <HStack gap={2} hAlign="end">{actions}</HStack>
        </LayoutFooter>
      }
    />
  );
}
