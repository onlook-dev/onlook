import { useEffect } from 'react';
import { useSettingsStore } from '../settings/store.js';
import type { CodeMapping, CodeOpenConfidence, CodeOpenMethod, CodeOpenTarget, ElementEvidence } from '@studio/events';

import { isRailHidden, useCanvasStore, type CanvasState } from '../canvas/store.js';
import { log } from '../log.js';
import { telemetryProjectFields } from '../workspace/store.js';
import { mappingIsStale } from './mappingCertainty.js';
import { isDirty, useCodeStore, type CodeTab } from './store.js';
import type { LineSpan } from './tintRange.js';
import { studio } from '../bridge.js';

export function noteCodeOpened(
  method: CodeOpenMethod,
  target: CodeOpenTarget,
  confidence: CodeOpenConfidence,
): void {
  studio().telemetryEvent({
    event: 'code_opened',
    properties: { ...telemetryProjectFields(), method, target, confidence },
  });
}

/** Paths whose buffer has moved under any mapping, which is what softens a grade in main. */
export function movedPaths(tabs: readonly CodeTab[]): string[] {
  const moved: string[] = [];
  for (const tab of tabs) {
    const onDiskMoved =
      tab.onDisk !== null && tab.snapshot !== null && tab.onDisk.hash !== tab.snapshot.hash;
    if (isDirty(tab) || onDiskMoved) moved.push(tab.path);
  }
  return moved;
}

/** The rail stays mounted while hidden, and a hidden panel needs no source lookups (ONL-2605). */
export function isCodePanelVisible(state: CanvasState): boolean {
  return useSettingsStore.getState().experimentalCodePanel && state.leftPanelView === 'code' && !isRailHidden(state, 'left');
}

/** A selection only follows its source while the Code panel is visible. */
export async function showMapping(mapping: CodeMapping, evidenceId: string): Promise<void> {
  const canvas = useCanvasStore.getState();
  if (!isCodePanelVisible(canvas)) return;
  if (mapping.via !== 'owner-stack' && mapping.via !== 'component-stack') return;
  if (useCodeStore.getState().followedEvidenceId === evidenceId) return;
  const selection = canvas.elementSelections.find(item => item.evidence.id === evidenceId);
  const generation = selection === undefined ? 0 : (canvas.overlay[selection.frameNodeId]?.sourceGeneration ?? 0);
  useCodeStore.setState({ followedEvidenceId: evidenceId });
  await useCodeStore.getState().followSelection(mapping.path, false);
  if (useCodeStore.getState().followedEvidenceId !== evidenceId || useCodeStore.getState().activePath !== mapping.path) return;
  if (selection !== undefined && !sourceRequestIsCurrent(selection.evidence, selection.frameNodeId, generation, true)) return;
  if (!isCodePanelVisible(useCanvasStore.getState())) {
    useCodeStore.setState({ followedEvidenceId: null });
    return;
  }
  useCodeStore.getState().focusAt(mapping.path, mapping.line);
}

export function sourceRequestIsCurrent(evidence: ElementEvidence, frameNodeId: string, generation: number, allowHidden = false): boolean {
  const current = useCanvasStore.getState();
  const held = current.elementSelections.find((item) => item.evidence.id === evidence.id);
  const frame = current.overlay[frameNodeId];
  return useSettingsStore.getState().experimentalCodePanel && (allowHidden || isCodePanelVisible(current)) && held?.evidence === evidence && (frame?.sourceGeneration ?? 0) === generation
    && frame?.health !== 'loading' && frame?.health !== 'unreachable';
}

/** An explicit demand is for an open context menu; ordinary picks follow Code visibility. */
export function useSelectionMappingRequest(isRequested?: boolean): void {
  const codeEnabled = useSettingsStore((state) => state.experimentalCodePanel);
  const isVisible = useCanvasStore(isCodePanelVisible);
  const isEnabled = codeEnabled && (isRequested ?? isVisible);
  const selection = useCanvasStore((state) => isEnabled ? (state.elementSelections[0] ?? null) : null);
  const health = useCanvasStore((state) => selection === null ? null : state.overlay[selection.frameNodeId]?.health);
  const generation = useCanvasStore((state) => selection === null ? 0 : (state.overlay[selection.frameNodeId]?.sourceGeneration ?? 0));
  const mappings = useCanvasStore((state) => isEnabled ? state.elementMappings : null);
  const setElementMapping = useCanvasStore((state) => state.setElementMapping);
  const docId = useCanvasStore((state) => state.doc?.docId ?? null);

  const evidenceId = selection?.evidence.id ?? null;
  // A decline is stored as `null` rather than left absent: the round trip takes an exclusive debugger.
  const asked = evidenceId !== null && mappings !== null && evidenceId in mappings;

  useEffect(() => {
    if (!isEnabled || selection === null || docId === null || asked || health === 'loading' || health === 'unreachable') return;
    let live = true;
    void studio()
      .codeMap({
        docId,
        frameId: selection.frameNodeId,
        domPath: selection.evidence.domPath,
        evidenceId: selection.evidence.id,
        movedPaths: movedPaths(useCodeStore.getState().tabs),
      })
      .then(
        async (answer) => {
          if (!live || !sourceRequestIsCurrent(selection.evidence, selection.frameNodeId, generation, isRequested === true)) return;
          setElementMapping(selection.evidence.id, answer.ok ? answer.mapping : null);
          noteCodeOpened(
            'selection',
            'element',
            answer.ok ? (answer.mapping.grade as CodeOpenConfidence) : 'declined',
          );
          if (!answer.ok) return;
          await showMapping(answer.mapping, selection.evidence.id);
        },
        (error: unknown) => {
          log('code').warn('mapping refused', { error });
        },
      );
    return () => {
      live = false;
    };
  }, [isEnabled, isRequested, selection, docId, asked, health, generation, setElementMapping]);
}

export interface SelectionMapping {
  /** True whenever an element is picked, whether or not it could be placed. */
  hasSelection: boolean;
  /** The round trip is still out. Saying "could not place it" before the answer lands would be a lie. */
  isAsking: boolean;
  mapping: CodeMapping | null;
  /** Studio can no longer stand behind the mapping: the element went, or the buffer moved under it. */
  isStale: boolean;
  /** Null unless the mapping is for the file the panel is showing. */
  tint: LineSpan | null;
}

/** Shows the held pick's file once the panel is opened, which the pick itself deliberately did not. */
export function useFollowHeldMapping(): void {
  const selection = useCanvasStore((state) => state.elementSelections[0] ?? null);
  const mappings = useCanvasStore((state) => state.elementMappings);
  const evidenceId = selection?.evidence.id ?? null;
  const mapping = evidenceId === null ? null : (mappings[evidenceId] ?? null);

  useEffect(() => {
    if (mapping === null || evidenceId === null) return;
    void showMapping(mapping, evidenceId);
  }, [mapping, evidenceId]);
}

/** What the panel draws from. Read-only: `useSelectionMappingRequest` is the one asker (ONL-2563). */
export function useSelectionMapping(activePath: string | null): SelectionMapping {
  const selection = useCanvasStore((state) => state.elementSelections[0] ?? null);
  const health = useCanvasStore((state) => selection === null ? null : state.overlay[selection.frameNodeId]?.health);
  const mappings = useCanvasStore((state) => state.elementMappings);
  const tabs = useCodeStore((state) => state.tabs);

  const evidenceId = selection?.evidence.id ?? null;
  const mapping = evidenceId === null ? null : (mappings[evidenceId] ?? null);
  const mapped = mapping === null ? undefined : tabs.find((tab) => tab.path === mapping.path);

  return {
    hasSelection: selection !== null,
    // The same test the request hook makes: a decline is STORED as null, so an absent key is unasked.
    isAsking: evidenceId !== null && !(evidenceId in mappings) && health !== 'unreachable',
    mapping,
    isStale: mappingIsStale({
      isSelectionStale: selection?.stale ?? false,
      tab:
        mapped === undefined
          ? null
          : {
              isDirty: isDirty(mapped),
              snapshotHash: mapped.snapshot?.hash ?? null,
              onDiskHash: mapped.onDisk?.hash ?? null,
            },
    }),
    // A mapping describes one file; the panel may be showing another one.
    tint:
      mapping === null || mapping.path !== activePath || (mapping.via !== 'owner-stack' && mapping.via !== 'component-stack')
        ? null
        : { start: mapping.line, end: mapping.line },
  };
}
