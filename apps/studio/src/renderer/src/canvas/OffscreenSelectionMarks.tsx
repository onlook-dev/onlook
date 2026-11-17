import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStoreApi, type ReactFlowState } from '@xyflow/react';

import { ARTIFACT_ACCENT_ATTRS } from './artifactAccent.js';
import { offscreenMarks, type MarkRect, type ScreenBox } from './offscreenMarks.js';
import { isArtifactFlowNode, type CanvasFlowNode } from './model.js';
import { useCanvasStore } from './store.js';
import { LAYER } from '../overlay/layers.js';

const PANEL_SELECTORS = { left: '[data-testid="sidebar"]', right: '[data-testid="chat-region"]' } as const;

interface Frame {
  pane: ScreenBox;
  view: ScreenBox;
}

/* Only on a ResizeObserver tick, never per frame: a layout read here would run on every pan frame. */
function readFrame(paneEl: HTMLElement): Frame {
  const pane = paneEl.getBoundingClientRect();
  const panel = (selector: string): DOMRect | null => {
    const rect = document.querySelector(selector)?.getBoundingClientRect();
    return rect === undefined || rect.width === 0 ? null : rect;
  };
  const left = panel(PANEL_SELECTORS.left);
  const right = panel(PANEL_SELECTORS.right);
  return {
    pane: { left: pane.left, top: pane.top, right: pane.right, bottom: pane.bottom },
    view: { left: left?.right ?? pane.left, top: pane.top, right: right?.left ?? pane.right, bottom: pane.bottom },
  };
}

interface NodeMark extends MarkRect {
  isArtifact: boolean;
}

/* Per node, never one box around them: a gap between selected nodes stays a gap on the rim. */
function marksFor(state: ReactFlowState, ids: readonly string[], frame: Frame): NodeMark[] {
  const [tx, ty, zoom] = state.transform;
  const ox = frame.pane.left + tx;
  const oy = frame.pane.top + ty;
  const marks: NodeMark[] = [];
  for (const id of ids) {
    const node = state.nodeLookup.get(id);
    if (node === undefined) continue;
    const { x, y } = node.internals.positionAbsolute;
    const width = node.measured.width ?? node.width ?? 0;
    const height = node.measured.height ?? node.height ?? 0;
    const flowNode = node.internals.userNode as CanvasFlowNode;
    const isArtifact = isArtifactFlowNode(flowNode);
    const box = { left: ox + x * zoom, top: oy + y * zoom, right: ox + (x + width) * zoom, bottom: oy + (y + height) * zoom };
    for (const rect of offscreenMarks(box, frame.view)) marks.push({ ...rect, isArtifact });
  }
  return marks;
}

const sameMarks = (a: NodeMark[], b: NodeMark[]): boolean =>
  a.length === b.length &&
  a.every((m, i) => {
    const n = b[i];
    return n !== undefined && m.x === n.x && m.y === n.y && m.width === n.width && m.height === n.height && m.isArtifact === n.isArtifact;
  });

/** Above the frosted band: its top edge is the window's, whatever the band's height. */
export function OffscreenSelectionMarks(): React.JSX.Element | null {
  const storeApi = useStoreApi();
  const isInteract = useCanvasStore((state) => state.mode === 'interact');
  const selectedIds = useCanvasStore((state) => state.selectedNodeIds);
  const [marks, setMarks] = useState<NodeMark[]>([]);

  useEffect(() => {
    const paneEl = storeApi.getState().domNode;
    if (isInteract || selectedIds.length === 0 || paneEl === null) {
      setMarks((previous) => (previous.length === 0 ? previous : []));
      return;
    }
    let frame = readFrame(paneEl);
    let rafId: number | null = null;
    const evaluate = (): void => {
      rafId = null;
      const next = marksFor(storeApi.getState(), selectedIds, frame);
      setMarks((previous) => (sameMarks(previous, next) ? previous : next));
    };
    const schedule = (): void => {
      if (rafId === null) rafId = requestAnimationFrame(evaluate);
    };
    const remeasure = (): void => {
      frame = readFrame(paneEl);
      schedule();
    };
    evaluate();
    const unsubscribe = storeApi.subscribe(schedule);
    const observer = new ResizeObserver(remeasure);
    observer.observe(paneEl);
    for (const selector of Object.values(PANEL_SELECTORS)) {
      const panel = document.querySelector(selector);
      if (panel !== null) observer.observe(panel);
    }
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      unsubscribe();
      observer.disconnect();
    };
  }, [storeApi, isInteract, selectedIds]);

  if (marks.length === 0) return null;
  return createPortal(
    <div
      aria-hidden="true"
      data-testid="offscreen-selection-marks"
      data-accent="canvas"
      style={MARKS}
    >
      {marks.map((mark, index) => (
        <div
          key={index}
          {...(mark.isArtifact ? ARTIFACT_ACCENT_ATTRS : {})}
          style={{ ...MARK, left: mark.x, top: mark.y, width: mark.width, height: mark.height }}
        />
      ))}
    </div>,
    document.body,
  );
}

const MARKS: React.CSSProperties = { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: LAYER.top };
const MARK: React.CSSProperties = { position: 'absolute', backgroundColor: 'var(--color-accent)' };
