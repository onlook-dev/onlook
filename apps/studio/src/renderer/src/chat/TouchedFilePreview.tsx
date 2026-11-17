import { Button } from '@astryxdesign/core/Button';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Dialog } from '../overlay/Dialog.js';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import type { CodeReadResult } from '@studio/events';
import { ImagePreview } from '../code/ImagePreview.js';
import { codeRefusalKey } from '../code/refusalCopy.js';
import { t } from '@studio/i18n';

export interface TouchedFilePreviewProps {
  path: string | null;
  result: CodeReadResult | null;
  onClose: () => void;
  isInline?: boolean;
}

function PreviewContent({ path, result }: { path: string; result: CodeReadResult | null }): React.JSX.Element {
  if (result === null) return <Text type="supporting" color="secondary" role="status">{t('chat.files.loading')}</Text>;
  if (!result.ok) return <Text type="supporting" color="secondary" role="status">{t(codeRefusalKey(result.code))}</Text>;
  if (result.image !== undefined) return <ImagePreview key={path} path={path} dataUrl={result.image.dataUrl} bytes={result.snapshot.size} />;
  return <CodeBlock code={result.text} language="plaintext" width="100%" maxHeight="60vh" size="sm" container="section" hasCopyButton={false} />;
}

export function TouchedFilePreview({ path, result, onClose, isInline }: TouchedFilePreviewProps): React.JSX.Element {
  const current = result?.ok && result.path !== path ? null : result;
  return (
    <Dialog
      isOpen={path !== null}
      {...(isInline === undefined ? {} : { isInline })}
      onOpenChange={(open) => { if (!open) onClose(); }}
      purpose="info"
      width="min(760px, 92vw)"
      maxHeight="86vh"
      padding={4}
      aria-label={path ?? undefined}
      data-testid="touched-file-preview"
    >
      {path === null ? null : <VStack gap={3} style={{ minWidth: 0 }}>
        <Text weight="medium" style={{ overflowWrap: 'anywhere' }}>{path}</Text>
        <div data-testid="touched-file-preview-content" aria-busy={current === null} style={{ minHeight: 120, maxHeight: '60vh', overflow: 'auto' }}>
          <PreviewContent path={path} result={current} />
        </div>
        <HStack hAlign="end">
          <Button label={t('chat.files.close')} variant="secondary" onClick={onClose} data-testid="touched-file-preview-close" />
        </HStack>
      </VStack>}
    </Dialog>
  );
}
