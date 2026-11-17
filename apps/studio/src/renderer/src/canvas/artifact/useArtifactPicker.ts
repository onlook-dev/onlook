import { useEffect, useRef, type RefObject } from 'react';
import type { WebviewTag } from 'electron';
import type { AnchorRect, ArtifactPickResult } from '@studio/events';
import { useSettingsStore } from '../../settings/store.js';
import { useCanvasStore, type CanvasState } from '../store.js';
import { focusedFrameId } from '../elementPicking.js';
import { isPickerLive } from '../frame/geometry.js';
import { isGestureInFlight } from '../frame/useFramePicker.js';
import { expandInlineChat, releaseFieldFocus, refuseGather } from '../useInlineElementChat.js';
import { ignoreRefusal } from '../../refusal.js';
import { studio } from '../../bridge.js';

export function isArtifactPickerLive(state: Pick<CanvasState, 'mode' | 'tool' | 'isExportMode' | 'selectedNodeIds' | 'elementSelections'>, nodeId: string): boolean {
  return isPickerLive(state) && (state.selectedNodeIds.includes(nodeId) || focusedFrameId(state) === nodeId);
}

export function applyArtifactPick(result: ArtifactPickResult, nodeId: string, shiftHeld: boolean): void {
  const state = useCanvasStore.getState();
  if (result.outcome === 'none') {
    if (!shiftHeld) state.clearElementSelections('selection-changed');
    state.selectFrame(nodeId, shiftHeld);
  } else if (result.outcome === 'selected') {
    state.deselectFrames();
    const outcome = state.addElementSelection(result.evidence, nodeId, shiftHeld);
    if (outcome === 'already-held') state.refreshElementSelection(result.evidence);
    if (outcome === 'added' || outcome === 'already-held') state.setElementAnchorRect(result.evidence.id, result.rect);
    else refuseGather(outcome);
    if (outcome === 'added') void useSettingsStore.getState().dismissTipsPill('selection').catch(ignoreRefusal('canvas', 'tips pill dismissal'));
  }
}

export function useArtifactPicker(nodeId: string, ref: RefObject<WebviewTag | null>, url: string | undefined, updatedAt: string | undefined, revision: string | undefined, onHover?: (rect: AnchorRect | null) => void, onEditText?: (point: { x: number; y: number }) => void) {
  const mode = useCanvasStore((state) => state.mode);
  const live = useCanvasStore((state) => isArtifactPickerLive(state, nodeId));
  const epoch = useRef(0);
  const press = useRef<{ x: number; y: number; suppressed: boolean } | null>(null);
  // One hover lookup in flight; the newest point waits for it rather than queueing behind it (ONL-2593).
  const hoverInFlight = useRef(false);
  const hoverNext = useRef<{ x: number; y: number } | null>(null);
  const hoverEpoch = useRef(0);
  const askHover = (point: { x: number; y: number }): void => {
    const guest = ref.current;
    if (!guest || !url || updatedAt === undefined || !onHover || !isArtifactPickerLive(useCanvasStore.getState(), nodeId)) return;
    if (hoverInFlight.current) { hoverNext.current = point; return; }
    hoverInFlight.current = true;
    const token = hoverEpoch.current;
    let guestId: number;
    try { guestId = guest.getWebContentsId(); } catch { hoverInFlight.current = false; return; }
    void studio().artifactPick({ nodeId, guestId, updatedAt, point }).then((result) => {
      if (hoverEpoch.current !== token || ref.current !== guest || !isArtifactPickerLive(useCanvasStore.getState(), nodeId)) return;
      onHover(result.outcome === 'selected' ? result.rect : null);
    }).catch(ignoreRefusal('canvas', 'artifactHover')).finally(() => {
      hoverInFlight.current = false;
      const next = hoverNext.current;
      hoverNext.current = null;
      if (next !== null && hoverEpoch.current === token) askHover(next);
    });
  };
  const clearHover = (): void => {
    hoverEpoch.current += 1;
    hoverNext.current = null;
    onHover?.(null);
  };
  useEffect(() => {
    hoverEpoch.current += 1;
    hoverNext.current = null;
    onHover?.(null);
  }, [live, url, revision, onHover]);
  useEffect(() => {
    epoch.current += 1;
    const state = useCanvasStore.getState();
    for (const selection of state.elementSelections) {
      if (selection.frameNodeId === nodeId) state.setElementStale(selection.evidence.id, true);
    }
    return () => { epoch.current += 1; };
  }, [url, mode, nodeId, revision]);
  return {
    onPointerMove: !live ? undefined : (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.buttons !== 0 || isGestureInFlight() || !isArtifactPickerLive(useCanvasStore.getState(), nodeId)) { clearHover(); return; }
      const bounds = event.currentTarget.getBoundingClientRect();
      askHover({ x: (event.clientX - bounds.left) * event.currentTarget.clientWidth / bounds.width, y: (event.clientY - bounds.top) * event.currentTarget.clientHeight / bounds.height });
    },
    onPointerLeave: clearHover,
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => { clearHover(); press.current = { x: event.clientX, y: event.clientY, suppressed: !isArtifactPickerLive(useCanvasStore.getState(), nodeId) || isGestureInFlight() }; },
    onClick: !live ? undefined : (event: React.MouseEvent<HTMLDivElement>) => {
      const before = press.current;
      press.current = null;
      if (!before || before.suppressed || Math.hypot(event.clientX - before.x, event.clientY - before.y) > 4 || isGestureInFlight() || !isArtifactPickerLive(useCanvasStore.getState(), nodeId)) return;
      const guest = ref.current;
      if (!guest || !url || updatedAt === undefined) return;
      event.stopPropagation();
      const bounds = event.currentTarget.getBoundingClientRect();
      const point = { x: (event.clientX - bounds.left) * event.currentTarget.clientWidth / bounds.width, y: (event.clientY - bounds.top) * event.currentTarget.clientHeight / bounds.height };
      const token = ++epoch.current;
      const shiftHeld = event.shiftKey;
      const expand = event.detail >= 2 && !shiftHeld;
      if (expand && onEditText && !useCanvasStore.getState().isPicking) { onEditText(point); return; }
      if (!useCanvasStore.getState().isPicking) releaseFieldFocus();
      try {
        const guestId = guest.getWebContentsId();
        void studio().artifactPick({ nodeId, guestId, updatedAt, point }).then((result) => {
          if (epoch.current !== token || ref.current !== guest || !isArtifactPickerLive(useCanvasStore.getState(), nodeId) || isGestureInFlight()) return;
          applyArtifactPick(result, nodeId, shiftHeld);
          if (expand && result.outcome === 'selected') expandInlineChat();
        }).catch(ignoreRefusal('canvas', 'artifactPick'));
      } catch { return; }
    },
  };
}
