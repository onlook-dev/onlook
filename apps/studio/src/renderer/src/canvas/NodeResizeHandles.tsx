import { useCallback, useRef } from 'react';
import {
  NodeResizeControl,
  ResizeControlVariant,
  type ResizeDragEvent,
  type ResizeParams,
} from '@xyflow/react';

import { installResizeWindowSeat, useWindowEventSeat } from './gestureWindowSeats.js';
import { useCanvasStore } from './store.js';
import { LAYER } from '../overlay/layers.js';

const CORNER_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
const EDGE_POSITIONS = ['top', 'right', 'bottom', 'left'] as const;

/** Screen px, counter-scaled at every use: unscaled it shrinks to nothing zoomed out, where an edge is hardest to hit. */
const HANDLE_GRAB = 7;

/** Smaller than the outward reach: inside the edge every pixel is one the user cannot click into the page. */
const HANDLE_GRAB_INNER = 3;

/** The accent is only the border, so a 1px one read as a dark square on the dark canvas. */
const HANDLE_BORDER_WEIGHT = 1.25;

function grabInset(position: string, scale: number): string {
  const out = HANDLE_GRAB * scale;
  const inward = HANDLE_GRAB_INNER * scale;
  const top = position.startsWith('top') ? out : position.startsWith('bottom') ? inward : out;
  const bottom = position.startsWith('bottom') ? out : position.startsWith('top') ? inward : out;
  const left = position.endsWith('left') ? out : position.endsWith('right') ? inward : out;
  const right = position.endsWith('right') ? out : position.endsWith('left') ? inward : out;
  return `${String(-top)}px ${String(-right)}px ${String(-bottom)}px ${String(-left)}px`;
}

/** `9` is the painted extent: the design's 7 is stroked outside and React Flow's handle is border-box. `zIndex: 1` keeps the viewport outline off the handle's interior. */
function handleStyle(scale: number): React.CSSProperties {
  return {
    width: 9 * scale,
    height: 9 * scale,
    // White, not the canvas's own dark: a dark fill left only the 1px border to find the handle by.
    backgroundColor: 'var(--color-on-dark)',
    borderColor: 'var(--color-accent)',
    // 1px, not `--border-width`: a selection handle is not a hairline.
    borderWidth: `calc(1px * ${String(HANDLE_BORDER_WEIGHT * scale)})`,
    borderRadius: 'var(--radius-none)',
    zIndex: LAYER.raised,
  };
}

/** A child, not a prop: `ResizeControl` spreads no rest, so a `data-testid` on it is dropped; the negative inset grows the grab past the mark, and events bubble to the control's drag. */
function ResizeHandleTarget({
  testId,
  position,
  scale,
  onPointerDown,
}: {
  testId: string;
  position: string;
  scale: number;
  onPointerDown: React.PointerEventHandler<HTMLSpanElement>;
}): React.JSX.Element {
  return (
    <span
      data-testid={testId}
      data-position={position}
      onPointerDown={onPointerDown}
      style={{
        display: 'block',
        position: 'absolute',
        inset: grabInset(position, scale),
      }}
    />
  );
}

export interface NodeResizeBounds {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
}

/** The store owns the gesture: the settle authors ONE `resize` op from the held box, never one per pointer move. */
function useNodeResizeGesture(id: string, measureHeight?: (width: number) => number): {
  noteResizePointer: React.PointerEventHandler<HTMLSpanElement>;
  startResize: (event: ResizeDragEvent) => void;
  endResize: (event: ResizeDragEvent, params: ResizeParams) => void;
} {
  const settleResize = useCanvasStore((state) => state.settleResize);
  const beginResize = useCanvasStore((state) => state.beginResize);
  const resizePointerIdRef = useRef<number | null>(null);
  const resizePositionRef = useRef<string | null>(null);
  const resizeSeat = useWindowEventSeat(() => {
    if (useCanvasStore.getState().resizeInFlightId === id) {
      useCanvasStore.getState().cancelResize();
    }
  });

  const noteResizePointer = useCallback((event: React.PointerEvent<HTMLSpanElement>) => {
    resizePointerIdRef.current = event.pointerId;
    resizePositionRef.current = event.currentTarget.dataset.position ?? null;
  }, []);
  // Stable identities: `NodeResizeControl` rebinds its d3-drag when they change, killing the gesture as it starts.
  const startResize = useCallback(
    (_event: ResizeDragEvent) => {
      const pointerId = resizePointerIdRef.current;
      resizeSeat.replace(
        installResizeWindowSeat(window, pointerId, () => {
          useCanvasStore.getState().cancelResize();
        }),
      );
      beginResize(id, pointerId ?? undefined, measureHeight === undefined ? undefined : {
        anchorBottom: resizePositionRef.current?.startsWith('top') === true,
        measureHeight,
      });
      resizePointerIdRef.current = null;
      resizePositionRef.current = null;
    },
    [beginResize, id, measureHeight, resizeSeat],
  );
  const endResize = useCallback(
    (_event: ResizeDragEvent, params: ResizeParams) => {
      resizeSeat.finish();
      settleResize(id, {
        x: params.x,
        y: params.y,
        width: params.width,
        height: params.height,
      });
    },
    [id, resizeSeat, settleResize],
  );

  return { noteResizePointer, startResize, endResize };
}

/** No `keepAspectRatio`, and `bounds` from the settled box: both sit in `ResizeControl`'s effect deps, whose cleanup destroys the live d3-drag mid-gesture (ONL-2486). */
export function NodeResizeHandles({
  id,
  testId,
  scale,
  bounds,
  cornersOnly = false,
  measureHeight,
}: {
  id: string;
  testId: string;
  scale: number;
  bounds: NodeResizeBounds;
  cornersOnly?: boolean;
  measureHeight?: (width: number) => number;
}): React.JSX.Element {
  const { noteResizePointer, startResize, endResize } = useNodeResizeGesture(id, measureHeight);
  return (
    <>
      {CORNER_POSITIONS.map((position) => (
        <NodeResizeControl
          key={position}
          position={position}
          minWidth={bounds.minWidth}
          minHeight={bounds.minHeight}
          maxWidth={bounds.maxWidth}
          maxHeight={bounds.maxHeight}
          // The library's autoScale clamps at `max(1/zoom, 1)` and balloons zoomed in; off, so `handleStyle`'s factor is the only scaling.
          autoScale={false}
          style={handleStyle(scale)}
          onResizeStart={startResize}
          onResizeEnd={endResize}
        >
          <ResizeHandleTarget
            testId={testId}
            position={position}
            scale={scale}
            onPointerDown={noteResizePointer}
          />
        </NodeResizeControl>
      ))}
      {!cornersOnly && EDGE_POSITIONS.map((position) => (
        <NodeResizeControl
          key={position}
          position={position}
          variant={ResizeControlVariant.Line}
          minWidth={bounds.minWidth}
          minHeight={bounds.minHeight}
          maxWidth={bounds.maxWidth}
          maxHeight={bounds.maxHeight}
          style={{ borderColor: 'transparent' }}
          onResizeStart={startResize}
          onResizeEnd={endResize}
        >
          <ResizeHandleTarget
            testId={testId}
            position={position}
            scale={scale}
            onPointerDown={noteResizePointer}
          />
        </NodeResizeControl>
      ))}
    </>
  );
}
