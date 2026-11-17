import { useState } from 'react';
import { VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { intlLocale, t } from '@studio/i18n';
import { fileName } from './breadcrumb.js';
import './code.css';

export function ImagePreview({ path, dataUrl, bytes }: { path: string; dataUrl: string; bytes: number }): React.JSX.Element {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [hasError, setError] = useState(false);
  const size = new Intl.NumberFormat(intlLocale(), { style: 'unit', unit: 'kilobyte', maximumFractionDigits: 1 }).format(bytes / 1024);
  return (
    <VStack data-testid="code-image-preview" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}>
      <div className="code-image-stage">
        {hasError ? <Text type="supporting" color="secondary">{t('code.image.unreadable')}</Text> : (
          <img src={dataUrl} alt={fileName(path)} className="code-image-content"
            onLoad={(event) => setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
            onError={() => setError(true)} />
        )}
      </div>
      {!hasError && (
        <Text type="supporting" color="secondary" style={{ padding: 'var(--spacing-2)', textAlign: 'center', flexShrink: 0 }}>
          {dimensions === null ? size : t('code.image.details', { width: dimensions.width, height: dimensions.height, size })}
        </Text>
      )}
    </VStack>
  );
}
