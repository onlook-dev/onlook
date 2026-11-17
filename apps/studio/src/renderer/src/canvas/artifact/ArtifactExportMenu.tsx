import { Divider } from '@astryxdesign/core/Divider';
import { useRef, useState } from 'react';
import { DropdownMenu, DropdownMenuItem } from '@astryxdesign/core/DropdownMenu';
import { Text } from '@astryxdesign/core/Text';
import type { ArtifactExportFormat, ArtifactExportResult, ArtifactSummary } from '@studio/events';
import { t } from '@studio/i18n';
import { MENU_DIVIDER, MENU_SURFACE } from '../../menu/surface.js';
import { MoreIcon } from '../../icons/glyphs.js';
import { studio } from '../../bridge.js';
import './gallery.css';

export function useArtifactExport(artifact: ArtifactSummary) {
  const busy = useRef(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<ArtifactExportResult | null>(null);
  const save = async (format: ArtifactExportFormat): Promise<void> => {
    if (busy.current || artifact.readOnly) return;
    busy.current = true;
    setExporting(true);
    setResult(null);
    try { setResult(await studio().artifactExport({ artifactId: artifact.id, format })); }
    catch { setResult({ outcome: 'refused', reason: t('artifact.export.writeFailed') }); }
    finally { busy.current = false; setExporting(false); }
  };
  return {exporting, result, save};
}

/** The card's ⋯: export and delete, in the upper-right corner (ONL-2593). */
export function ArtifactExportMenu({ artifact, exporting, deleting = false, onSave, onDelete, onRename }: {artifact: ArtifactSummary; exporting: boolean; deleting?: boolean; onSave(format: ArtifactExportFormat): void; onDelete?(): void; onRename?(): void}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  return <div data-testid="artifact-export-menu" data-menu-open={open}>
    <DropdownMenu isMenuOpen={open} button={{ label: t('artifact.card.menu'), icon: <MoreIcon />, isIconOnly: true, size: 'sm', variant: 'ghost', isDisabled: artifact.readOnly }} placement="end" menuWidth={180} style={{...MENU_SURFACE, pointerEvents: 'auto'}} onOpenChange={(next) => {setOpen(next); if (next) setHasOpened(true);}}>
      {hasOpened && <>
      {onRename && <DropdownMenuItem label={t('artifact.rename.label')} isDisabled={artifact.readOnly} onClick={onRename} />}
      <DropdownMenuItem label={t('artifact.export.saveHtml')} isDisabled={artifact.readOnly || exporting} onClick={() => onSave('html')} />
      <DropdownMenuItem label={t('artifact.export.savePdf')} isDisabled={artifact.readOnly || exporting} onClick={() => onSave('pdf')} />
      <DropdownMenuItem label={t('canvas.export.savePng')} isDisabled={artifact.readOnly || exporting} onClick={() => onSave('png')} />
      <DropdownMenuItem label={t('canvas.export.savePng2x')} isDisabled={artifact.readOnly || exporting} onClick={() => onSave('png-2x')} />
      <DropdownMenuItem label={t('canvas.export.saveJpeg')} isDisabled={artifact.readOnly || exporting} onClick={() => onSave('jpeg')} />
      {onDelete && <Divider isFullBleed style={MENU_DIVIDER} />}
      {onDelete && <DropdownMenuItem label={t('canvas.artifact.delete')} className="artifact-menu-delete" isDisabled={artifact.readOnly || deleting} onClick={onDelete} />}
      </>}
    </DropdownMenu>
  </div>;
}

export function ArtifactExportStatus({exporting, result}: {exporting: boolean; result: ArtifactExportResult | null}): React.JSX.Element | null {
  return (exporting || result) ? <Text size="2xs" role={result?.outcome === 'refused' ? 'alert' : 'status'} data-testid="artifact-export-status">
      {exporting ? t('artifact.export.preparing') : result?.outcome === 'saved' ? t('artifact.export.saved', { name: result.name }) : result?.outcome === 'cancelled' ? t('artifact.export.cancelled') : result?.outcome === 'refused' ? result.reason : ''}
    </Text> : null;
}
