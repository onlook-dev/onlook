import { Grid } from '@astryxdesign/core/Grid';
import { GUTTER, RESPONSIVE_COLUMNS } from '../../projects/gridTrack.js';
import { Button } from '@astryxdesign/core/Button';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { artifactSummaryPages, artifactTitleLabels, type ArtifactSummary } from '@studio/events';
import { PlusIcon } from '../../icons/glyphs.js';
import { t } from '@studio/i18n';
import { ArtifactPagePreview } from './ArtifactPagePreview.js';
import { ArtifactPageViewer } from './ArtifactPageViewer.js';
import { MarqueeText } from './MarqueeText.js';
import { ArtifactExportMenu, ArtifactExportStatus, useArtifactExport } from './ArtifactExportMenu.js';
import { ArtifactTitle } from './ArtifactTitle.js';
import { DeleteArtifactDialog } from './DeleteArtifactDialog.js';
import { observeArtifactControls } from './deferredControls.js';
import { deleteListedArtifact, useArtifactListing } from './listing.js';
import './gallery.css';

export interface ArtifactListProps {
  records: ArtifactSummary[] | null;
  error?: boolean;
  onPlace?(artifact: ArtifactSummary): void;
  onDrag?(event: React.DragEvent, artifact: ArtifactSummary): void;
  isProjectsView?: boolean;
  emptyMessage?: string;
  deferControls?: boolean;
}

/** Drags a copy of the preview alone, in the card's corners: no actions, no panel ground (ONL-2593). */
function dragPreviewOnly(event: React.DragEvent<HTMLElement>): void {
  const frame = event.currentTarget.querySelector<HTMLElement>('.artifact-page-image');
  if (frame === null) return;
  const bounds = frame.getBoundingClientRect();
  const ghost = frame.cloneNode(true) as HTMLElement;
  ghost.querySelectorAll('.artifact-page-actions').forEach((node) => node.remove());
  Object.assign(ghost.style, { position: 'fixed', top: '-10000px', left: '-10000px', width: `${String(bounds.width)}px`, height: `${String(bounds.height)}px`, pointerEvents: 'none' });
  document.body.appendChild(ghost);
  event.dataTransfer.setDragImage(ghost, event.clientX - bounds.left, event.clientY - bounds.top);
  requestAnimationFrame(() => ghost.remove());
}

const ArtifactCard = memo(function ArtifactCard({artifact: record, pagePath, pageName, label, onPlace, onDrag, onInspect, deferControls}: {artifact: ArtifactSummary; pagePath: string; pageName: string; label: string; onPlace?: ArtifactListProps['onPlace']; onDrag?: ArtifactListProps['onDrag']; onInspect(artifactId: string, pagePath: string): void; deferControls: boolean}): React.JSX.Element {
  const artifact = useMemo(() => (record.pages?.length ?? 1) > 1 ? {...record, readOnly: true} : record, [record]);
  const page = useMemo(() => ({path: pagePath, name: pageName}), [pagePath, pageName]);
  const root = useRef<HTMLDivElement>(null);
  const [controlsReady, setControlsReady] = useState(!deferControls);
  useEffect(() => {
    if (controlsReady || root.current === null) return;
    return observeArtifactControls(root.current, () => setControlsReady(true));
  }, [controlsReady]);
  const {exporting, result, save} = useArtifactExport(artifact);
  const legacy = (artifact.pages?.length ?? 1) > 1 || (artifact.blockedDocuments ?? 0) > 0;
  const [deleting, setDeleting] = useState(false);
  const [askDelete, setAskDelete] = useState<ArtifactSummary | null>(null);
  const [hasOpenedDelete, setHasOpenedDelete] = useState(false);
  const deleteFailed = useArtifactListing((state) => state.deleteFailures.includes(artifact.id));
  const [renameRequest, setRenameRequest] = useState(0);
  const remove = async (): Promise<void> => {
    const target = askDelete;
    if (deleting || !target || target.readOnly || target.id !== artifact.id) return;
    setAskDelete(null);
    setDeleting(true);
    try {await deleteListedArtifact(target.id, target.updatedAt);}
    finally {setDeleting(false);}
  };
  const stop = {onPointerDown: (event: React.PointerEvent) => event.stopPropagation(), onDragStart: (event: React.DragEvent) => {event.preventDefault(); event.stopPropagation();}};
  const actions = <div className={onPlace ? 'artifact-page-actions artifact-page-row' : 'artifact-page-actions artifact-page-corner'} data-testid="artifact-page-actions" {...stop}>
    {onPlace && <Button label={t('artifact.library.copy')} icon={<PlusIcon />} size="sm" variant="ghost" className="artifact-page-add" isDisabled={artifact.readOnly} onClick={() => onPlace(artifact)} />}
    <ArtifactExportMenu artifact={artifact} exporting={exporting} deleting={deleting} onSave={(format) => {void save(format);}} onDelete={() => {setHasOpenedDelete(true); setAskDelete(artifact);}} onRename={() => setRenameRequest((n) => n + 1)} />
  </div>;
  const title = <HStack gap={2} vAlign="center">
      <span style={{minWidth: 0, flex: 1}}><MarqueeText><Text size="sm" weight="normal"><ArtifactTitle artifact={artifact} label={label} renameRequest={renameRequest} /></Text></MarqueeText></span>
    </HStack>;
  return <VStack ref={root} gap={0.5} onPointerEnter={() => setControlsReady(true)} onFocusCapture={() => setControlsReady(true)} draggable={!artifact.readOnly && onDrag !== undefined} onDragStart={(event) => {dragPreviewOnly(event); onDrag?.(event, artifact);}} data-testid="artifact-library-record" data-artifact-id={artifact.id} style={{minWidth: 0}}>
    <ArtifactPagePreview artifact={artifact} page={page} onInspect={() => onInspect(artifact.id, page.path)} actions={controlsReady ? actions : undefined} showName={legacy} />
    {title}
    {legacy && <Text size="2xs" color="secondary">{t('artifact.library.legacy')}</Text>}
    {artifact.blockedDocuments !== undefined && <Text size="2xs" color="secondary">{t('artifact.library.legacyExtra', {count: artifact.blockedDocuments})}</Text>}
    <ArtifactExportStatus exporting={exporting} result={result} />
    {deleteFailed && <Text size="2xs" role="alert">{t('artifact.delete.failed')}</Text>}
    {deleting && <Text size="2xs" role="status">{t('artifact.delete.pending')}</Text>}
    {hasOpenedDelete && <DeleteArtifactDialog isOpen={askDelete !== null} title={label} onOpenChange={(open) => {if (!open) setAskDelete(null);}} onConfirm={() => {void remove();}} />}
    {artifact.readOnly && !legacy && <Text size="2xs">{t('artifact.library.readOnly')}</Text>}
  </VStack>;
});

export function ArtifactList({ records, error = false, onPlace, onDrag, isProjectsView = false, emptyMessage, deferControls = false }: ArtifactListProps): React.JSX.Element {
  const labels = useMemo(() => artifactTitleLabels(records ?? []), [records]);
  const [inspection, setInspection] = useState<{ artifactId: string; pagePath: string } | null>(null);
  const inspect = useCallback((artifactId: string, pagePath: string) => setInspection({artifactId, pagePath}), []);
  const closeInspection = useCallback(() => setInspection(null), []);
  const inspected = (records ?? []).find((artifact) => artifact.id === inspection?.artifactId);
  const cards = records === null || records.length === 0 ? [] : records.flatMap((artifact) => artifactSummaryPages(artifact).map((page) => <ArtifactCard key={`${artifact.id}:${page.path}`} artifact={artifact} pagePath={page.path} pageName={page.name} label={labels.get(artifact.id) ?? artifact.title} onPlace={isProjectsView ? undefined : onPlace} onDrag={onDrag} deferControls={deferControls} onInspect={inspect} />));
  const notice = error ? <Text size="sm" role="alert">{t('artifact.library.unavailable')}</Text>
    : records === null ? <Text size="sm" role="status">{t('artifact.library.loading')}</Text>
      : records.length === 0 ? <Text size="sm" color="secondary" role="status">{emptyMessage ?? t('artifact.library.empty')}</Text> : null;
  const viewer = inspected && inspection && <ArtifactPageViewer artifact={inspected} pagePath={inspection.pagePath} onNavigate={(pagePath) => setInspection({ artifactId: inspected.id, pagePath })} onClose={closeInspection} />;
  // The Projects page lays artifacts on the project cards' own grid, so the two pages share widths and gutters (ONL-2593).
  if (isProjectsView) {
    return <VStack gap={3} data-testid="artifact-library-list" style={{width: '100%'}}>
      {notice}
      {cards.length > 0 && <Grid columns={RESPONSIVE_COLUMNS} gap={GUTTER}>{cards}</Grid>}
      {viewer}
    </VStack>;
  }
  return <VStack gap={3} data-testid="artifact-library-list" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 140px), 1fr))', alignItems: 'start', width: '100%'}}>
    {notice}
    {cards}
    {viewer}
  </VStack>;
}
