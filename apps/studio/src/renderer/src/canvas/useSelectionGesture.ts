import { useEffect } from 'react';
import { useStoreApi, type ReactFlowState } from '@xyflow/react';
import type { CanvasMode, CanvasTool } from './store.js';

export interface SelectionGesture {
  selectionOnDrag: boolean;
  selectionKeyCode: 'Shift' | null;
}

type SelectionGestureState = Pick<
  ReactFlowState,
  'nodesSelectionActive' | 'userSelectionActive' | 'userSelectionRect'
>;

const RELEASED: SelectionGestureState = {
  nodesSelectionActive: false,
  userSelectionActive: false,
  userSelectionRect: null,
};

/** Interact leaves every page unshielded: a box released over one loses its pointerup, and the group box sits over the pages (ONL-2489, ONL-2490). */
export function selectionGesture(tool: CanvasTool, mode: CanvasMode): SelectionGesture {
  if (mode === 'interact') return { selectionOnDrag: false, selectionKeyCode: null };
  // A held Shift lays the box's pane over the nodes: a shift-click would box nothing and clear the selection.
  return { selectionOnDrag: tool === 'select', selectionKeyCode: tool === 'pan' ? 'Shift' : null };
}

export function selectionGestureRelease(mode: CanvasMode): SelectionGestureState | null {
  return mode === 'interact' ? RELEASED : null;
}

export function useSelectionGesture(tool: CanvasTool, mode: CanvasMode): SelectionGesture {
  const storeApi = useStoreApi();
  useEffect(() => {
    const release = selectionGestureRelease(mode);
    if (release !== null) storeApi.setState(release);
  }, [storeApi, mode]);
  return selectionGesture(tool, mode);
}
