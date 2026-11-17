import { Button } from '@astryxdesign/core/Button';
import { VStack } from '@astryxdesign/core/Layout';
import { useMemo } from 'react';
import type { ArtifactSummary } from '@studio/events';
import { ArtifactList } from '../canvas/artifact/ArtifactList.js';
import { refreshArtifactListing } from '../canvas/artifact/listing.js';
import { t } from '@studio/i18n';
import { recentArtifacts } from '../canvas/artifact/catalogDisplay.js';

export function ArtifactsPage({ records, error }: { records: ArtifactSummary[] | null; error: boolean }): React.JSX.Element {
  const shown = useMemo(() => records === null ? null : recentArtifacts(records), [records]);
  return <VStack gap={6} data-testid="projects-artifacts-page">
    <ArtifactList records={shown} error={error} isProjectsView deferControls />
    {error && <Button label={t('artifact.library.retry')} variant="secondary" onClick={() => { void refreshArtifactListing(); }} />}
  </VStack>;
}
