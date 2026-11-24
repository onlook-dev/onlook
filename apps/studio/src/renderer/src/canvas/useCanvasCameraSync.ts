import { useEffect } from 'react';
import type { CanvasCamera, CanvasZoomAction } from '@studio/events';
import { cameraRevealingNode, type CameraControls } from './camera.js';
import type { PanelCover } from './panelCover.js';
import type { CanvasFlowNode } from './model.js';
import { setCanvasCenterSource, setCanvasZoomSource } from './gestures.js';
import { useCanvasStore } from './store.js';
import { studio } from '../bridge.js';

interface ZoomCommandControls {
  zoomIn: () => void;
  zoomOut: () => void;
  zoomActual: () => void;
  fitAll: () => void;
  fitSelection: () => void;
}

export function runCanvasZoomAction(
  action: CanvasZoomAction,
  controls: ZoomCommandControls,
): void {
  if (action === 'in') controls.zoomIn();
  else if (action === 'out') controls.zoomOut();
  else if (action === 'reset') controls.zoomActual();
  else if (action === 'fit') controls.fitAll();
  else controls.fitSelection();
}

export function canvasFlyToCenter(
  request: { id: string; seq: number } | null,
  nodes: readonly CanvasFlowNode[],
): { x: number; y: number } | null {
  if (!request) return null;
  const node = nodes.find((candidate) => candidate.id === request.id);
  if (!node) return null;
  return {
    x: node.position.x + (node.width ?? 0) / 2,
    y: node.position.y + (node.height ?? 0) / 2,
  };
}

const REVEAL_MARGIN = 0.8;
const FLY_MS = 400;

/** The current zoom, or less if the box would not fit the pane (ONL-2593). */
function revealZoom(zoom: number, pane: { width: number; height: number }, width: number, height: number): number {
  if (width <= 0 || height <= 0 || pane.width <= 0 || pane.height <= 0) return zoom;
  return Math.min(zoom, (pane.width * REVEAL_MARGIN) / width, (pane.height * REVEAL_MARGIN) / height);
}

export function useCanvasCameraSync(options: {
  nodes: readonly CanvasFlowNode[];
  flyTo: { id: string; seq: number; reveal?: boolean; panOnly?: true } | null;
  cover: PanelCover;
  fitRequest: { seq: number; animate?: true } | null;
  viewportRequest: { camera: CanvasCamera; seq: number } | null;
  getViewport: () => { x: number; y: number; zoom: number };
  setCenter: (x: number, y: number, options: { zoom: number; duration: number }) => unknown;
  setViewport: (camera: CanvasCamera, options: { duration: number }) => unknown;
  zoomIn: (options: { duration: number }) => unknown;
  zoomOut: (options: { duration: number }) => unknown;
  zoomTo: (zoom: number, options: { duration: number }) => unknown;
  camera: CameraControls;
}): void {
  const {
    nodes,
    flyTo,
    cover: { start: coverStart, end: coverEnd },
    fitRequest,
    viewportRequest,
    getViewport,
    setCenter,
    setViewport,
    zoomIn,
    zoomOut,
    zoomTo,
    camera: { fitAll, placeOnOpen, fitSelection },
  } = options;

  useEffect(() => {
    setCanvasZoomSource(() => getViewport().zoom);
    return () => setCanvasZoomSource(null);
  }, [getViewport]);

  useEffect(() => {
    setCanvasCenterSource(() => {
      const pane = document.querySelector('.react-flow');
      if (pane === null) return null;
      const { width, height } = pane.getBoundingClientRect();
      const { x, y, zoom } = getViewport();
      return { x: (width / 2 - x) / zoom, y: (height / 2 - y) / zoom };
    });
    return () => setCanvasCenterSource(null);
  }, [getViewport]);

  // Nodes are a dependency, not a guard read once: the request is raised with the document that carries them, and the placement reads their boxes.
  useEffect(() => {
    if (fitRequest === null || nodes.length === 0) return;
    placeOnOpen(nodes, { duration: fitRequest.animate === true ? FLY_MS : 0 });
    useCanvasStore.getState().noteFitted();
  }, [fitRequest, nodes, placeOnOpen]);

  // Zero duration: a page switch restores where the user was, and an animated pan there reads as the app moving on its own (ONL-2488).
  useEffect(() => {
    if (viewportRequest === null) return;
    void setViewport(viewportRequest.camera, { duration: 0 });
    useCanvasStore.getState().noteViewportSet();
  }, [viewportRequest, setViewport]);

  useEffect(() => {
    const center = canvasFlyToCenter(flyTo, nodes);
    if (!center) return;
    if (flyTo?.panOnly === true) {
      const target = nodes.find((candidate) => candidate.id === flyTo.id);
      const pane = document.querySelector('.react-flow')?.getBoundingClientRect();
      if (!target || !pane) return;
      const current = getViewport();
      const next = cameraRevealingNode(current, {
        ...target.position, width: target.width ?? 0, height: target.height ?? 0,
      }, pane, { start: coverStart, end: coverEnd });
      if (next.x !== current.x || next.y !== current.y) void setViewport(next, { duration: 0 });
      useCanvasStore.getState().noteFlownTo();
      return;
    }
    const zoom = getViewport().zoom;
    const node = flyTo?.reveal === true ? nodes.find((candidate) => candidate.id === flyTo.id) : undefined;
    const pane = node === undefined ? null : document.querySelector('.react-flow')?.getBoundingClientRect();
    void setCenter(center.x, center.y, {
      zoom: node === undefined || pane == null ? zoom : revealZoom(zoom, pane, node.width ?? 0, node.height ?? 0),
      duration: FLY_MS,
    });
    useCanvasStore.getState().noteFlownTo();
  }, [flyTo, nodes, setCenter, getViewport, setViewport, coverStart, coverEnd]);

  useEffect(
    () =>
      studio().onCanvasZoom(({ action }) => {
        const commandOptions = { duration: 150 };
        runCanvasZoomAction(action, {
          zoomIn: () => void zoomIn(commandOptions),
          zoomOut: () => void zoomOut(commandOptions),
          zoomActual: () => void zoomTo(1, commandOptions),
          fitAll,
          fitSelection,
        });
      }),
    [zoomIn, zoomOut, zoomTo, fitAll, fitSelection],
  );
}
