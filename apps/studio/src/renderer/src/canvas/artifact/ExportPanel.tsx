import { useEffect, useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { DropdownMenu, DropdownMenuItem } from '@astryxdesign/core/DropdownMenu';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import type { ArtifactExportBatchOutcome, ArtifactExportFormat, ArtifactSummary } from '@studio/events';
import { FannedPreview } from '../../fan/FannedPreview.js';
import { t } from '@studio/i18n';
import { CloseIcon, MinusIcon, PlusIcon } from '../../icons/glyphs.js';
import { MENU_SURFACE } from '../../menu/surface.js';
import { REGION } from '../../layout.js';
import { HAIRLINE, SURFACE } from '../../panels/rowGeometry.js';
import { useShallow } from 'zustand/react/shallow';
import { useLatestRef } from '../../useLatestRef.js';
import { isRailHidden, useCanvasStore } from '../store.js';
import { addExportFormat, closeExportPanel, compatibleExportFormats, exportOperations, EXPORT_FORMATS, IMAGE_FORMATS, exportPanelEpoch, removeExportFormat, replaceExportFormat, selectedExportNodes, selectedUnexportableKind, useExportPanel, type ExportTarget, type UnexportableKind } from './exportPanelState.js';
import { useArtifactListing } from './listing.js';
import { artifactPreviewDemand, type PreviewState } from './previewDemand.js';
import './gallery.css';
import { studio } from '../../bridge.js';
import { LAYER } from '../../overlay/layers.js';
import '../../fan/fan.css';

const FORMAT_LABEL = {
  html: 'artifact.export.panel.html',
  pdf: 'artifact.export.pdf',
  png: 'canvas.export.png',
  'png-2x': 'canvas.export.png2x',
  jpeg: 'canvas.export.jpeg',
} as const;

function PreviewImage({ artifact }: { artifact: ArtifactSummary }): React.JSX.Element {
  const [preview, setPreview] = useState<PreviewState>(() => artifactPreviewDemand.peek({ artifactId: artifact.id, pagePath: artifact.pagePath, updatedAt: artifact.updatedAt }));
  useEffect(() => {
    const request = { artifactId: artifact.id, pagePath: artifact.pagePath, updatedAt: artifact.updatedAt };
    setPreview(artifactPreviewDemand.peek(request));
    const unwatch = artifactPreviewDemand.watch(request, setPreview);
    return () => {
      unwatch();
    };
  }, [artifact.id, artifact.pagePath, artifact.updatedAt]);
  return preview.image !== undefined
    ? <img src={preview.image} alt="" draggable={false} />
    : preview.outcome === 'reading'
      ? <div className="artifact-page-loading" aria-hidden="true" />
      : <Text size="2xs" color="secondary">{t('artifact.preview.unavailable')}</Text>;
}

function FormatDropdown({ format, options, onChoose }: { format: ArtifactExportFormat; options: readonly ArtifactExportFormat[]; onChoose: (format: ArtifactExportFormat) => void }): React.JSX.Element {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(160);
  useEffect(() => {
    const element = box.current;
    if (element === null) return () => {};
    const measure = (): void => setWidth(Math.round(element.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);
  return (
    <div ref={box} className="artifact-export-format">
      <DropdownMenu
        button={{ label: t(FORMAT_LABEL[format]), variant: 'secondary', size: 'sm', isDisabled: options.length === 0 }}
        menuWidth={width}
        // `menuWidth` is only a floor (ONL-2593).
        style={{ ...MENU_SURFACE, width, maxWidth: width }}
        data-testid="artifact-export-format"
      >
        {options.map((next) => (
          <DropdownMenuItem key={next} label={t(FORMAT_LABEL[next])} onClick={() => onChoose(next)} />
        ))}
      </DropdownMenu>
    </div>
  );
}

function ArtifactGlyphIllustration({ size }: { size: number }): React.JSX.Element {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="artifact-export-empty-ink" gradientUnits="userSpaceOnUse" x1="0" y1="3.5" x2="0" y2="20.5">
          <stop offset="0" style={{ stopColor: 'rgba(255, 255, 255, 0.58)' }} />
          <stop offset="1" style={{ stopColor: 'rgba(255, 255, 255, 0.2)' }} />
        </linearGradient>
      </defs>
      <g style={{ stroke: 'url(#artifact-export-empty-ink)' }} strokeWidth="1.6" strokeLinejoin="round">
        <path d="M17.1055 17.1577C17.1055 18.8656 15.7195 20.25 14.0098 20.25C12.3001 20.25 10.9141 18.8656 10.9141 17.1577C10.9141 15.4499 12.3001 14.0654 14.0098 14.0654C15.7195 14.0654 17.1055 15.4499 17.1055 17.1577Z" />
        <path d="M4.99145 6.98596L10.4681 11.5764L3.75 14.0188L4.99145 6.98596Z" />
        <path d="M14.0115 4.46532C14.1545 3.9321 14.7026 3.61567 15.2359 3.75841L19.2844 4.842C19.8181 4.98485 20.1348 5.53345 19.9917 6.06708L18.9074 10.1093C18.7643 10.6425 18.2163 10.9589 17.683 10.8162L13.6345 9.73258C13.1008 9.58973 12.7841 9.04113 12.9272 8.50749L14.0115 4.46532Z" />
      </g>
    </svg>
  );
}

function Filetypes({ formats, allowed, isDisabled = false }: { formats: readonly ArtifactExportFormat[]; allowed: readonly ArtifactExportFormat[]; isDisabled?: boolean }): React.JSX.Element {
  const unused = allowed.filter((format) => !formats.includes(format));
  return (
    <VStack gap={2} data-testid="artifact-export-filetypes">
      <HStack align="center" justify="between" style={{ height: 'var(--size-element-sm)' }}>
        <Text size="sm" weight="medium" color="secondary">{t('artifact.export.panel.filetype')}</Text>
        {/* Hidden, not removed: it holds the row's height (ONL-2593). */}
        <IconButton
          label={t('artifact.export.panel.add')}
          variant="ghost"
          size="sm"
          icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
          isDisabled={isDisabled || unused.length === 0}
          onClick={() => addExportFormat(allowed)}
          style={unused.length === 0 ? { visibility: 'hidden' } : undefined}
          data-testid="artifact-export-add"
        />
      </HStack>
      {formats.map((format) => (
        <HStack key={format} align="center" gap={2} data-testid="artifact-export-row">
          <FormatDropdown format={format} options={isDisabled ? [] : unused} onChoose={(next) => replaceExportFormat(format, next, allowed)} />
          <IconButton
            label={t('artifact.export.panel.remove', { format: t(FORMAT_LABEL[format]) })}
            variant="ghost"
            size="sm"
            icon={<Icon icon={MinusIcon} size="sm" color="inherit" />}
            isDisabled={isDisabled}
            onClick={() => removeExportFormat(format, allowed)}
            data-testid="artifact-export-remove"
          />
        </HStack>
      ))}
    </VStack>
  );
}

export function ExportPanel(): React.JSX.Element | null {
  const isOpen = useExportPanel((state) => state.isOpen);
  const chosenFormats = useExportPanel((state) => state.formats);
  const selectedNodes = useCanvasStore(useShallow(selectedExportNodes));
  const unexportable = useCanvasStore(selectedUnexportableKind);
  const allowed = selectedNodes.some(node => node.kind === 'browser') ? IMAGE_FORMATS : EXPORT_FORMATS;
  const formats = compatibleExportFormats(chosenFormats, allowed);
  const records = useArtifactListing((state) => state.records);
  const isExportMode = useCanvasStore((state) => state.isExportMode);
  const isRightRailHidden = useCanvasStore((state) => isRailHidden(state, 'right'));
  const [isExporting, setIsExporting] = useState(false);
  const running = useRef(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [savedName, setSavedName] = useState<string | null>(null);
  const latestSelection = useLatestRef(selectedNodes);
  const targets = selectedNodes.flatMap<ExportTarget>((node) => {
    if (node.kind === 'browser') return [{ nodeId: node.id, title: node.name || t('sidebar.frame.untitled'), artifact: undefined }];
    const artifact = records?.find((record) => record.id === node.content.artifactId);
    return artifact === undefined ? [] : [{ nodeId: node.id, title: artifact.title, artifact }];
  });
  const operations = exportOperations(targets, formats);

  useEffect(() => {
    setRefusal(null);
    setSavedName(null);
  }, [selectedNodes, isOpen]);

  // Leaving the project or hiding the rail ends export mode too, or picking stays off with no panel to explain it (ONL-2593).
  useEffect(() => {
    if (isOpen && (!isExportMode || isRightRailHidden)) closeExportPanel();
  }, [isOpen, isExportMode, isRightRailHidden]);

  useEffect(() => closeExportPanel, []);

  useEffect(() => {
    if (!isOpen) return () => {};
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, textarea, [contenteditable="true"], [role="menu"], [role="dialog"]')) return;
      closeExportPanel();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const exportAll = async (): Promise<void> => {
    if (running.current) return;
    running.current = true;
    const epoch = exportPanelEpoch;
    const current = (): boolean => epoch === exportPanelEpoch && latestSelection.current === selectedNodes;
    const report = (outcome: ArtifactExportBatchOutcome): void => {
      studio().telemetryEvent({ event: 'artifact_export_batch', properties: { outcome, artifact_count: targets.length, format_count: formats.length } });
    };
    setIsExporting(true);
    setRefusal(null);
    setSavedName(null);
    try {
      for (const { target, format } of operations) {
          if (!current()) return report('closed');
          const result = format === 'html' || format === 'pdf'
            ? await studio().artifactExport({ artifactId: target.artifact!.id, format })
            : await studio().canvasExportImage({ nodeId: target.nodeId, format });
          if (!current()) return report('closed');
          if (result.outcome === 'refused') {
            setRefusal(result.reason);
            return report('refused');
          }
          if (result.outcome === 'cancelled') return report('cancelled');
          setSavedName(result.name);
      }
      report('saved');
    } catch {
      report('failed');
      if (current()) setRefusal(t('artifact.export.writeFailed'));
    } finally {
      running.current = false;
      setIsExporting(false);
    }
  };

  return <ExportPanelSurface targets={targets} formats={formats} allowed={allowed} isExporting={isExporting} refusal={refusal} savedName={savedName} unexportable={unexportable} onExport={() => { void exportAll(); }} onClose={closeExportPanel} />;
}

export function ExportPanelSurface({ targets, formats, allowed, isExporting, refusal, savedName, unexportable, onExport, onClose }: {
  targets: readonly ExportTarget[];
  formats: readonly ArtifactExportFormat[];
  allowed: readonly ArtifactExportFormat[];
  isExporting: boolean;
  refusal: string | null;
  savedName: string | null;
  unexportable: UnexportableKind | null;
  onExport(): void;
  onClose(): void;
}): React.JSX.Element {
  const count = exportOperations(targets, formats).length;
  const action = count === 1 && targets[0] !== undefined
    ? t('artifact.export.panel.action', { name: targets[0].title })
    : count === 0 ? t('artifact.export.panel.title') : t('artifact.export.panel.actionMany', { count: String(count) });

  return (
    <VStack gap={0} data-testid="artifact-export-panel" style={{ position: 'absolute', inset: 0, zIndex: LAYER.over, ...SURFACE, borderLeft: HAIRLINE }}>
      <HStack align="center" justify="between" style={{ flexShrink: 0, height: REGION.panelHeader, paddingInlineStart: 'var(--spacing-4)', paddingInlineEnd: 'var(--spacing-2)', borderBottom: HAIRLINE }}>
        {/* The chat header's own band and edge, so swapping the two never moves the divider (ONL-2744). */}
        <Text type="body" weight="medium" color="primary">{t('artifact.export.panel.title')}</Text>
        <IconButton label={t('artifact.export.panel.close')} variant="ghost" size="sm" icon={<Icon icon={CloseIcon} size="sm" color="inherit" />} onClick={onClose} data-testid="artifact-export-close" />
      </HStack>
      <VStack gap={4} style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: 'var(--spacing-4)' }}>
        {targets.length === 0 ? <EmptyPreview unexportable={unexportable} /> : (
          <FannedPreview cards={targets.map((target) => ({ id: target.nodeId, label: target.title, content: target.artifact ? <PreviewImage artifact={target.artifact} /> : <Text size="sm" color="secondary">{target.title}</Text> }))} />
        )}
        <Filetypes formats={formats} allowed={allowed} isDisabled={isExporting || targets.length === 0} />
        <div aria-hidden="true" style={{ borderTop: HAIRLINE }} />
        <Button label={action} variant="secondary" isDisabled={isExporting || count === 0} onClick={onExport} style={{ width: '100%' }} data-testid="artifact-export-run" />
        {refusal !== null && <Text size="sm" color="secondary" role="alert">{refusal}</Text>}
        {savedName !== null && <Text size="sm" color="secondary" role="status">{t('artifact.export.saved', { name: savedName })}</Text>}
      </VStack>
    </VStack>
  );
}

const UNEXPORTABLE_TITLE = {
  text: 'artifact.export.panel.unexportable.text',
  image: 'artifact.export.panel.unexportable.image',
  mixed: 'artifact.export.panel.unexportable.mixed',
} as const;

function EmptyPreview({ unexportable }: { unexportable: UnexportableKind | null }): React.JSX.Element {
  return (
    <div className="preview-fan" data-testid="artifact-export-empty">
      <div className="preview-fan-card artifact-export-placeholder" role="status">
        <VStack gap={3} align="center">
          <ArtifactGlyphIllustration size={44} />
          <VStack gap={1} align="center" style={{ paddingInline: 'var(--spacing-4)' }}>
            <Text size="sm" weight="medium" color="primary" style={{ textAlign: 'center' }}>{t(unexportable === null ? 'artifact.export.panel.empty' : UNEXPORTABLE_TITLE[unexportable])}</Text>
            <Text size="sm" color="secondary" style={{ textAlign: 'center', textWrap: 'pretty' }}>{t(unexportable === null ? 'artifact.export.panel.emptyBody' : 'artifact.export.panel.unexportable.body')}</Text>
          </VStack>
        </VStack>
      </div>
    </div>
  );
}
