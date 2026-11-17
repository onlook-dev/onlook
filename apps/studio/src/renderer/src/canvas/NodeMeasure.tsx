import { useStore as useFlowStore, ViewportPortal, type InternalNode } from '@xyflow/react';
import {
  measureBetween,
  measureLineBox,
  MEASURE_TAG_STYLE,
  type MeasureBox,
  type MeasureSegment,
} from '@studio/events';

import { frameRingScale } from './frame/geometry.js';
import { armedNodeId, useCanvasStore } from './store.js';
import { useAltHeld } from './useAltHeld.js';
import { LAYER } from '../overlay/layers.js';

/** ⌥ with one node armed: the gaps to the hovered node, in canvas units, for any node kind. Numeric content only, so no `strings.ts` key. */
export function NodeMeasure(): React.JSX.Element | null {
  const isAltHeld = useAltHeld();
  const hoveredId = useCanvasStore((state) => state.hoveredNodeId);
  const armedId = useCanvasStore(armedNodeId);
  // Boxes from React Flow's lookup: absolute under any parent, and sized for every kind it renders.
  const pair = useFlowStore((state) => {
    if (!isAltHeld || hoveredId === null || armedId === null || armedId === hoveredId) return null;
    const armed = state.nodeLookup.get(armedId);
    const hovered = state.nodeLookup.get(hoveredId);
    if (armed === undefined || hovered === undefined) return null;
    return boxKey(armed, hovered);
  });
  const zoom = useFlowStore((state) => state.transform[2]);
  if (pair === null) return null;
  const [from, to] = parseBoxKey(pair);
  const scale = frameRingScale(zoom);
  return (
    <ViewportPortal>
      <div
        data-testid="canvas-node-measure"
        style={{ position: 'absolute', left: 0, top: 0, zIndex: LAYER.canvasOverlay, pointerEvents: 'none' }}
      >
        {measureBetween(from, to).map((measurement) => {
          const { line, support, value } = measurement;
          const key = `${String(line.x1)}-${String(line.y1)}-${String(line.x2)}-${String(line.y2)}`;
          return (
            <div key={key}>
              <Line segment={line} scale={scale} isDashed={false} />
              {support === undefined ? null : <Line segment={support} scale={scale} isDashed />}
              <div
                style={{
                  ...MEASURE_TAG_STYLE,
                  position: 'absolute',
                  left: (line.x1 + line.x2) / 2,
                  top: (line.y1 + line.y2) / 2,
                  transform: `translate(-50%, -50%) scale(${String(scale)})`,
                }}
              >
                {String(Math.round(value))}
              </div>
            </div>
          );
        })}
      </div>
    </ViewportPortal>
  );
}

function boxOf(node: InternalNode): MeasureBox {
  const { x, y } = node.internals.positionAbsolute;
  const width = node.measured.width ?? node.width ?? 0;
  const height = node.measured.height ?? node.height ?? 0;
  return { left: x, top: y, right: x + width, bottom: y + height };
}

/** A string, so the selector compares by value: a store change that moves neither box skips the render. */
function boxKey(from: InternalNode, to: InternalNode): string {
  const a = boxOf(from);
  const b = boxOf(to);
  return [a.left, a.top, a.right, a.bottom, b.left, b.top, b.right, b.bottom].join(' ');
}

function parseBoxKey(key: string): [MeasureBox, MeasureBox] {
  const [l1 = 0, t1 = 0, r1 = 0, b1 = 0, l2 = 0, t2 = 0, r2 = 0, b2 = 0] = key.split(' ').map(Number);
  return [
    { left: l1, top: t1, right: r1, bottom: b1 },
    { left: l2, top: t2, right: r2, bottom: b2 },
  ];
}

function Line({
  segment,
  scale,
  isDashed,
}: {
  segment: MeasureSegment;
  scale: number;
  isDashed: boolean;
}): React.JSX.Element {
  return <div style={{ position: 'absolute', ...measureLineBox(segment, scale, isDashed) }} />;
}
