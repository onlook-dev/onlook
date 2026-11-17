import { Button } from '@astryxdesign/core/Button';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { useMemo, useRef, useState } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { t } from '@studio/i18n';
import { HAIRLINE, SURFACE } from '../../panels/rowGeometry.js';
import { ArtifactList } from './ArtifactList.js';
import { ArtifactSearchEmpty } from './ArtifactSearchEmpty.js';
import { useArtifactListing, refreshArtifactListing } from './listing.js';
import { placeLibraryArtifact, dragLibraryArtifact } from './libraryPlacement.js';
import { recentArtifacts } from './catalogDisplay.js';
import { GlyphCross, GlyphSearch, PlusIcon } from '../../icons/glyphs.js';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { CANVAS_ARTIFACT_DEFAULT_BOX } from '@studio/events';
import { canvasViewCenter } from '../gestures.js';
import { useCanvasStore } from '../store.js';
import { useArtifactSearch } from './useArtifactSearch.js';
import './gallery.css';

export function ArtifactSidebar(): React.JSX.Element {
  const { records, error } = useArtifactListing();
  const [query, setQuery] = useState('');
  const search = useRef<HTMLInputElement>(null);
  const matches = useArtifactSearch(query, records);
  const searching = query.trim() !== '';
  const shown = useMemo(() => records === null ? null : recentArtifacts(records, query, matches.ranks), [records, query, matches.ranks]);
  return <VStack gap={0} height="100%" data-testid="artifact-sidebar" style={{ flex: '1 1 auto', minWidth: 0, ...SURFACE, borderRight: HAIRLINE }}>
    <HStack align="center" justify="between" style={{padding: 'var(--spacing-3)', paddingBlockEnd: 0}}>
      <Text type="supporting" weight="medium" color="primary">{t('rail.artifacts')}</Text>
      <IconButton
        label={t('artifact.library.new')}
        tooltip={t('artifact.library.new')}
        variant="ghost"
        size="sm"
        icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
        // Zero layout height, as the Pages header's add (ONL-2593).
        style={{ marginBlock: -14 }}
        data-testid="artifact-sidebar-new"
        onClick={() => {
          const center = canvasViewCenter();
          void useCanvasStore.getState().addArtifact(center === null ? undefined : {
            x: center.x - CANVAS_ARTIFACT_DEFAULT_BOX.width / 2,
            y: center.y - CANVAS_ARTIFACT_DEFAULT_BOX.height / 2,
          });
        }}
      />
    </HStack>
    <HStack align="center" gap={0.5} className="code-files-search-toolbar" style={{flexShrink: 0, margin: 'var(--spacing-3)', marginBlockEnd: 'var(--spacing-2)'}}>
      <HStack align="center" gap={1.5} className="code-files-search-field">
        <span aria-hidden="true" style={{display: 'flex', flex: '0 0 auto', color: 'var(--color-text-disabled)'}}><GlyphSearch size={16} /></span>
        <input ref={search} type="text" value={query} maxLength={200} onChange={(event) => setQuery(event.target.value)} placeholder={t('artifact.library.search')} aria-label={t('artifact.library.search')} data-testid="artifact-sidebar-search" onKeyDown={(event) => {if (event.key !== 'Escape') return; event.preventDefault(); event.stopPropagation(); if (query !== '') setQuery(''); else event.currentTarget.blur();}} style={{flex: '1 1 auto', minWidth: 0, background: 'transparent', border: 0, outline: 'none', color: 'var(--color-text-primary)', font: 'inherit', fontSize: 'var(--text-supporting-size)', padding: 0, boxSizing: 'border-box'}} />
        {query !== '' && <button type="button" className="search-clear" aria-label={t('artifact.library.clearSearch')} title={t('artifact.library.clearSearch')} onClick={() => {setQuery(''); search.current?.focus({preventScroll: true});}}><GlyphCross size={18} /></button>}
      </HStack>
    </HStack>
    <div className="artifact-scroller" style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-3)', paddingBlockStart: 'var(--spacing-2)', minHeight: 0 }}>
      {searching && matches.error && <Text size="sm" color="secondary" role="status">{t('artifact.search.unavailable')}</Text>}
      {searching && !matches.loading && !matches.error && shown !== null && shown.length === 0
        ? <ArtifactSearchEmpty query={query} />
        : <ArtifactList records={shown} error={error || matches.error} onPlace={placeLibraryArtifact} onDrag={dragLibraryArtifact} emptyMessage={searching ? '' : undefined} deferControls />}
      {error && <Button label={t('artifact.library.retry')} variant="secondary" onClick={() => { void refreshArtifactListing(); }} />}
    </div>
  </VStack>;
}
