import { useEffect, useRef, useState } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import type { ArtifactPage, ArtifactSummary } from '@studio/events';
import { t } from '@studio/i18n';
import { subscribeArtifact } from './artifactCache.js';
import { artifactPreviewDemand, type PreviewState } from './previewDemand.js';
import './gallery.css';

export function ArtifactPagePreview({ artifact, page, onInspect, actions, showName = true }: { artifact: ArtifactSummary; page: ArtifactPage; onInspect?: () => void; actions?: React.ReactNode; showName?: boolean }): React.JSX.Element {
  const root = useRef<HTMLElement>(null);
  const [state, setState] = useState<PreviewState>(() => artifactPreviewDemand.peek({ artifactId: artifact.id, pagePath: page.path, updatedAt: artifact.updatedAt }));
  const image = state.image;
  useEffect(() => {
    const request = { artifactId: artifact.id, pagePath: page.path, updatedAt: artifact.updatedAt };
    setState(artifactPreviewDemand.peek(request));
    let visible = false;
    let release: (() => void) | undefined;
    const acquire = () => {
      release?.();
      release = visible ? artifactPreviewDemand.watch(request, setState) : undefined;
    };
    const forget = subscribeArtifact(artifact.id, () => {
      setState(artifactPreviewDemand.peek(request));
      acquire();
    });
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting === true;
      acquire();
    }, { rootMargin: '0px' });
    if (root.current !== null) observer.observe(root.current);
    return () => { observer.disconnect(); forget(); release?.(); };
  }, [artifact.id, artifact.updatedAt, page.path]);

  const surface = <div className="artifact-page-image">
      {image !== undefined
        ? <img src={image} alt={page.name} draggable={false} onError={() => setState({ outcome: 'unavailable' })} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }} />
        : state.outcome === 'reading'
          ? <div className="artifact-page-loading" role="status" aria-label={t('artifact.preview.loading')} />
          : <Text size="2xs" color="secondary" role="status">{t(state.outcome === 'missing' ? 'artifact.preview.missing' : 'artifact.preview.unavailable')}</Text>}
    </div>;
  return <figure ref={root} data-testid="artifact-page-preview" data-page-path={page.path} style={{ margin: 0, minWidth: 0, width: '100%' }}>
    <div className="artifact-page-shell">
      {onInspect ? <button type="button" className="artifact-page-card" aria-label={t('artifact.preview.inspect', { name: page.name })} onClick={onInspect}>{surface}</button> : surface}
      {state.outcome !== 'reading' && state.outcome !== 'ready' && <div className="artifact-preview-retry"><Button label={t('artifact.preview.retry')} size="sm" variant="secondary" onClick={() => artifactPreviewDemand.retry({ artifactId: artifact.id, pagePath: page.path, updatedAt: artifact.updatedAt })} /></div>}
      {actions}
    </div>
    {showName && <figcaption style={{ paddingBlockStart: 'var(--spacing-2)', overflowWrap: 'anywhere' }}><Text size="sm" color="secondary">{page.name}</Text></figcaption>}
  </figure>;
}
