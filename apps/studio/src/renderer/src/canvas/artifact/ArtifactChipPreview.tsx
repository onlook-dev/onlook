import { useEffect, useState, type ReactNode } from 'react';
import { ImagePreview } from '@studio/chat-ui';
import { t } from '@studio/i18n';
import { useArtifactListing } from './listing.js';
import { artifactPreviewDemand, type PreviewState } from './previewDemand.js';

/** A sent artifact chip's hover card: the artifact's own rendered page, read only while the card could show (ONL-2593). */
export function ArtifactChipPreview({ artifactId, pagePath, title, children }: { artifactId: string; pagePath?: string; title: string; children: ReactNode }): React.JSX.Element {
  const record = useArtifactListing((state) => state.records?.find((artifact) => artifact.id === artifactId));
  const path = pagePath ?? record?.pagePath;
  const updatedAt = record?.updatedAt;
  const [state, setState] = useState<PreviewState>(() => path === undefined || updatedAt === undefined
    ? { outcome: 'reading' }
    : artifactPreviewDemand.peek({ artifactId, pagePath: path, updatedAt }));
  useEffect(() => {
    if (path === undefined || updatedAt === undefined) {
      setState({ outcome: 'missing' });
      return () => {};
    }
    const request = { artifactId, pagePath: path, updatedAt };
    setState(artifactPreviewDemand.peek(request));
    const unwatch = artifactPreviewDemand.watch(request, setState);
    return () => {
      unwatch();
    };
  }, [artifactId, path, updatedAt]);
  return (
    <ImagePreview alignment="center" url={state.image} alt={title} unavailableLabel={t('artifact.preview.unavailable')}>
      {children}
    </ImagePreview>
  );
}
