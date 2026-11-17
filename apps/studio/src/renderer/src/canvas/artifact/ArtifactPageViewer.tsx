import {useEffect, useRef} from 'react';
import {createPortal} from 'react-dom';
import { Button } from '@astryxdesign/core/Button';
import { HStack, Layout, LayoutContent, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { artifactSummaryPages, type ArtifactSummary } from '@studio/events';
import { t } from '@studio/i18n';
import { ArtifactLivePage } from './ArtifactLivePage.js';
import { LAYER } from '../../overlay/layers.js';
import { useModal } from '../../overlay/modalStack.js';

export function ArtifactPageViewer({ artifact, pagePath, onNavigate, onClose }: {
  artifact: ArtifactSummary;
  pagePath: string;
  onNavigate(path: string): void;
  onClose(): void;
}): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  useModal(true, 'viewer');
  useEffect(() => {
    const previous = document.activeElement;
    const application = document.getElementById('root');
    const wasInert = application?.inert;
    if (application) application.inert = true;
    root.current?.querySelector<HTMLElement>('[data-testid="artifact-detail-close"]')?.focus();
    const escape = (event: KeyboardEvent) => {if (event.key === 'Escape' && !event.defaultPrevented) {event.preventDefault(); onClose();}};
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('keydown', escape);
      if (application) application.inert = wasInert ?? false;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [onClose]);
  const page = artifactSummaryPages(artifact).find((candidate) => candidate.path === pagePath);
  const content = <div ref={root} className="artifact-page-viewer" data-testid="artifact-page-viewer" role="region" aria-label={artifact.title} tabIndex={-1} style={{position: 'fixed', inset: 0, zIndex: LAYER.viewer, background: 'var(--color-background-body)', padding: 'var(--spacing-4)', overflow: 'auto'}}>
      <Layout header={<HStack width="100%" vAlign="center" hAlign="between" style={{maxWidth: 1040, marginInline: 'auto', paddingInline: 'var(--spacing-4)', paddingBlockEnd: 'var(--spacing-4)', boxSizing: 'border-box'}}>
        <Text size="base" weight="medium">{artifact.title}</Text>
        <Button data-testid="artifact-detail-close" label={t('artifact.dialog.close')} variant="secondary" onClick={onClose} />
      </HStack>} content={<LayoutContent style={{width: '100%', maxWidth: 1040, marginInline: 'auto'}}>
        <VStack gap={3}>
          {page ? <ArtifactLivePage key={page.path} artifact={artifact} pagePath={page.path} onNavigate={onNavigate} /> : <Text role="status" size="sm">{t('artifact.preview.missing')}</Text>}
        </VStack>
      </LayoutContent>} />
    </div>;
  return typeof document === 'undefined' ? content : createPortal(content, document.body);
}
