import { create } from 'zustand';
import type { ArtifactExportFormat, ArtifactSummary } from '@studio/events';
import { isRailHidden, useCanvasStore, type CanvasState } from '../store.js';
import { dismissInlineChat } from '../useInlineElementChat.js';
import { studio } from '../../bridge.js';

export const IMAGE_FORMATS: readonly ArtifactExportFormat[] = ['png', 'jpeg'];
export const EXPORT_FORMATS: readonly ArtifactExportFormat[] = ['html', 'pdf', ...IMAGE_FORMATS];
const FIRST_EXPORT: readonly ArtifactExportFormat[] = ['html'];

export function compatibleExportFormats(formats: readonly ArtifactExportFormat[], allowed: readonly ArtifactExportFormat[]): readonly ArtifactExportFormat[] {
  const compatible = formats.filter(format => allowed.includes(format));
  return compatible.length === 0 && formats.length > 0 ? ['png'] : compatible;
}

export interface ExportTarget { nodeId: string; title: string; artifact: ArtifactSummary | undefined }

export function exportOperations(targets: readonly ExportTarget[], formats: readonly ArtifactExportFormat[]) {
  const seen = new Set<string>();
  const supported = formats.filter((format): format is Exclude<ArtifactExportFormat, 'png-2x'> => format !== 'png-2x');
  return targets.flatMap(target => supported.flatMap(format => {
    const key = `${format}:${format === 'html' || format === 'pdf' ? target.artifact?.id : target.nodeId}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ target, format }];
  }));
}

export const useExportPanel = create<{ isOpen: boolean; formats: readonly ArtifactExportFormat[] }>()(() => ({ isOpen: false, formats: FIRST_EXPORT }));

/** What a selection holds that cannot be exported yet; empty when nothing else is selected (ONL-2744). */
export type UnexportableKind = 'text' | 'image' | 'mixed';

export function selectedUnexportableKind(state: Pick<CanvasState, 'selectedNodeIds' | 'doc'>): UnexportableKind | null {
  const kinds = new Set(state.selectedNodeIds.flatMap((id) => {
    const kind = state.doc?.nodes[id]?.kind;
    return kind === undefined || kind === 'artifact' || kind === 'browser' ? [] : [kind];
  }));
  if (kinds.size === 0) return null;
  if (kinds.size > 1) return 'mixed';
  const [only] = kinds;
  return only === 'text' || only === 'image' ? only : 'mixed';
}

export function selectedExportNodes(state: Pick<CanvasState, 'selectedNodeIds' | 'doc'>) {
  return state.selectedNodeIds.flatMap(id => {
    const node = state.doc?.nodes[id];
    return node?.kind === 'artifact' || node?.kind === 'browser' ? [node] : [];
  });
}

function selectedArtifactIds(state: Pick<CanvasState, 'selectedNodeIds' | 'doc'>): string[] {
  const ids = state.selectedNodeIds.flatMap((id) => {
    const node = state.doc?.nodes[id];
    return node?.kind === 'artifact' ? [node.content.artifactId] : [];
  });
  return [...new Set(ids)];
}

export function openExportPanel(): void {
  const canvas = useCanvasStore.getState();
  if (isRailHidden(canvas, 'right')) canvas.toggleRail('right');
  if (canvas.inlineChat !== null) dismissInlineChat('mode-switch');
  useCanvasStore.setState({ isExportMode: true });
  const hasBrowser = selectedExportNodes(canvas).some(node => node.kind === 'browser');
  useExportPanel.setState(state => ({ isOpen: true, formats: hasBrowser ? compatibleExportFormats(state.formats, IMAGE_FORMATS) : state.formats }));
  studio().telemetryEvent({ event: 'artifact_export_panel_opened', properties: { selected_count: selectedArtifactIds(useCanvasStore.getState()).length } });
}

export function addExportFormat(allowed: readonly ArtifactExportFormat[] = EXPORT_FORMATS): void {
  useExportPanel.setState((state) => {
    const formats = compatibleExportFormats(state.formats, allowed);
    const unused = allowed.find((format) => !formats.includes(format));
    return unused === undefined ? state : { formats: [...formats, unused] };
  });
}

export function replaceExportFormat(from: ArtifactExportFormat, to: ArtifactExportFormat, allowed: readonly ArtifactExportFormat[] = EXPORT_FORMATS): void {
  useExportPanel.setState((state) => {
    const formats = compatibleExportFormats(state.formats, allowed);
    return formats.includes(to) ? state : { formats: formats.map(format => format === from ? to : format) };
  });
}

export function removeExportFormat(format: ArtifactExportFormat, allowed: readonly ArtifactExportFormat[] = EXPORT_FORMATS): void {
  useExportPanel.setState((state) => ({ formats: compatibleExportFormats(state.formats, allowed).filter(existing => existing !== format) }));
}

/** Bumped on every close, so an export run still awaiting a save sheet knows to stop (ONL-2593). */
export let exportPanelEpoch = 0;

export function closeExportPanel(): void {
  exportPanelEpoch += 1;
  useCanvasStore.setState({ isExportMode: false });
  useExportPanel.setState({ isOpen: false, formats: FIRST_EXPORT });
}
