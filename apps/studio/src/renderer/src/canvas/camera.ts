// The ⌘ zoom chords are main's (`main/zoomChords.ts`, over `canvas:zoom`), the only seat that hears a focused guest; a ⌘ binding here fires twice (ONL-1989).

import { useCallback, useEffect, useRef } from 'react';
import { useReactFlow, useStoreApi } from '@xyflow/react';

import type { PanelsState, Rect } from '@studio/events';

import { REGION } from '../layout.js';
import { usePanelsStore } from '../panels/store.js';
import { leftOverlayWidth, type LeftPanelView } from '../rail/leftPanel.js';
import type { CanvasFlowNode } from './model.js';
import { pageOpenCamera } from './mountFit.js';
import { useCanvasStore } from './store.js';
import type { PanelCover } from './panelCover.js';

// The canvas places itself only for what a document opens with, and for a frame arriving on an empty one; `mountFit.ts` holds both rules (ONL-2486).
const FIT_MARGIN = 48;
// A bare number in `padding` is a fraction of the viewport: `left: 259` once asked for 259 viewports and pinned the fit at minimum zoom.
const px = (n: number): `${number}px` => `${String(n)}px` as `${number}px`;

/** The left inset is the RAIL plus the open panel: without the rail every fit and every centre-on-selection rests a rail's width under it (ONL-2563). */
export const restingInsets = (rest: { view: LeftPanelView; panels: PanelsState }) => ({
  left: leftOverlayWidth(rest.view, rest.panels) + FIT_MARGIN,
  right: rest.panels.end + FIT_MARGIN,
  top: REGION.topBar + REGION.modeBand + FIT_MARGIN,
  bottom: FIT_MARGIN,
});

export const restingFitOptions = (rest: { view: LeftPanelView; panels: PanelsState }) => {
  const inset = restingInsets(rest);
  return {
    // 0.9 by eye.
    maxZoom: 0.9,
    padding: { left: px(inset.left), right: px(inset.right), top: px(inset.top), bottom: px(inset.bottom) },
  };
};

const restingNow = () => ({ view: useCanvasStore.getState().leftPanelView, panels: usePanelsStore.getState() });

/** Read at fire time: captured at render they go stale under a panel drag or a view switch. */
export const restingFitNow = (): ReturnType<typeof restingFitOptions> => restingFitOptions(restingNow());
export const restingInsetsNow = (): ReturnType<typeof restingInsets> => restingInsets(restingNow());

const MOVE_MS = 250;

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export function cameraRevealingNode(
  camera: Camera,
  node: Rect,
  pane: { width: number; height: number },
  cover: PanelCover,
): Camera {
  const shift = (start: number, size: number, min: number, max: number): number => {
    if (max <= min) return 0;
    const end = start + size;
    if (size > max - min) {
      if (start > min) return min - start;
      if (end < max) return max - end;
    } else {
      if (start < min) return min - start;
      if (end > max) return max - end;
    }
    return 0;
  };
  return {
    ...camera,
    x: camera.x + shift(camera.x + node.x * camera.zoom, node.width * camera.zoom,
      cover.start + FIT_MARGIN, pane.width - cover.end - FIT_MARGIN),
    y: camera.y + shift(camera.y + node.y * camera.zoom, node.height * camera.zoom,
      REGION.topBar + REGION.modeBand + FIT_MARGIN, pane.height - FIT_MARGIN),
  };
}

// The full cover delta preserves the frame's left-edge clearance (ONL-2563).
export function cameraFollowingCover(camera: Camera, moved: number): Camera {
  return { ...camera, x: camera.x + moved };
}

// Panel visibility changes do not move the camera (ONL-2563).
export function useCameraFollowsLeftPanel(): void {
  const { getViewport, setViewport } = useReactFlow();
  const view = useCanvasStore((state) => state.leftPanelView);
  const panels = usePanelsStore();
  const cover = leftOverlayWidth(view, panels);
  const drawn = useRef(cover);

  useEffect(() => {
    const moved = cover - drawn.current;
    drawn.current = cover;
    if (moved === 0) return;
    void setViewport(cameraFollowingCover(getViewport(), moved), { duration: 0 });
  }, [cover, getViewport, setViewport]);
}

export interface CameraControls {
  fitAll: () => void;
  /** The canvas placing itself over the nodes: instant as a document or a page opens, because a fly-in there reads as the app moving on its own (ONL-2486), and flown for the agent's first object (ONL-2960). Takes the nodes it is placing over, which `fitView` would have to have measured first (ONL-2488). */
  placeOnOpen: (nodes: readonly CanvasFlowNode[], options?: { duration: number }) => void;
  fitSelection: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomActual: () => void;
}

export function useCameraControls(): CameraControls {
  const { fitView, setViewport, zoomIn, zoomOut, zoomTo } = useReactFlow();
  const storeApi = useStoreApi();

  const fitTo = useCallback(
    (duration: number) => {
      void fitView({ ...restingFitNow(), duration });
    },
    [fitView],
  );
  const fitAll = useCallback(() => fitTo(MOVE_MS), [fitTo]);
  const placeOnOpen = useCallback(
    (nodes: readonly CanvasFlowNode[], { duration }: { duration: number } = { duration: 0 }) => {
      const { width, height, minZoom } = storeApi.getState();
      const options = restingFitNow();
      const camera = pageOpenCamera({
        boxes: nodes.map((node) => ({
          x: node.position.x,
          y: node.position.y,
          width: node.width ?? 0,
          height: node.height ?? 0,
        })),
        viewport: { width, height },
        zoom: { min: minZoom, max: options.maxZoom },
        padding: options.padding,
      });
      // Nothing placeable — no pane yet, or boxes with no area. The library's own fit is the better answer.
      if (camera === null) {
        fitTo(duration);
        return;
      }
      void setViewport(camera, { duration });
    },
    [fitTo, setViewport, storeApi],
  );

  const fitSelection = useCallback(() => {
    const selected = storeApi.getState().nodes.filter((node) => node.selected);
    void fitView({
      ...restingFitNow(),
      duration: MOVE_MS,
      ...(selected.length > 0 ? { nodes: selected } : {}),
    });
  }, [fitView, storeApi]);

  return {
    fitAll,
    placeOnOpen,
    fitSelection,
    zoomIn: useCallback(() => {
      void zoomIn({ duration: MOVE_MS });
    }, [zoomIn]),
    zoomOut: useCallback(() => {
      void zoomOut({ duration: MOVE_MS });
    }, [zoomOut]),
    zoomActual: useCallback(() => {
      void zoomTo(1, { duration: MOVE_MS });
    }, [zoomTo]),
  };
}
