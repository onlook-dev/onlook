import { useMemo } from 'react';
import { useStore as useFlowStore, ViewportPortal } from '@xyflow/react';
import { useShallow } from 'zustand/react/shallow';
import { ToggleButton, ToggleButtonGroup } from '@astryxdesign/core/ToggleButton';
import { CANVAS_TEXT_SIZES, isCanvasTextSize, type CanvasTextSize } from '@studio/events';

import { t, type StringKey } from '@studio/i18n';
import { SURFACE as BLURRED_SURFACE } from '../../panels/rowGeometry.js';
import { inlineAnchorPoint } from '../inlinePlacement.js';
import { safeScale } from '../frame/geometry.js';
import { boundingBox } from '../snapping.js';
import { useCanvasStore } from '../store.js';
import { textSizeBar } from './actions.js';
import { LAYER } from '../../overlay/layers.js';

const CANVAS_INERT = 'nodrag nopan nowheel';

const SURFACE = {
  display: 'flex',
  pointerEvents: 'auto',
  ...BLURRED_SURFACE,
  border: '0.5px solid var(--color-border)',
  borderRadius: 'var(--radius-container)',
  boxShadow: 'var(--shadow-med)',
  padding: 'var(--spacing-1)',
} as const;

const SIZE_LABELS: Readonly<Record<CanvasTextSize, StringKey>> = {
  small: 'canvas.text.size.small',
  medium: 'canvas.text.size.medium',
  large: 'canvas.text.size.large',
};

export function TextSizeBarSurface({
  size,
  onPick,
}: {
  /** `null` is a selection holding more than one size: nothing is pressed. */
  size: CanvasTextSize | null;
  onPick: (size: CanvasTextSize) => void;
}): React.JSX.Element {
  return (
    <div
      // A press here must never commit the caret, which would remove a node nobody typed into:
      // the marker makes a blur into this no commit, and the prevented mousedown moves no focus (ONL-2486).
      data-canvas-overlay
      data-testid="canvas-text-size-bar"
      role="toolbar"
      aria-label={t('canvas.text.size.label')}
      tabIndex={-1}
      className={CANVAS_INERT}
      style={SURFACE}
      /* Without the stop the press also reaches the pane, which clears the selection. */
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
    >
      <ToggleButtonGroup
        label={t('canvas.text.size.label')}
        type="single"
        size="sm"
        value={size}
        onChange={(value) => {
          // The group reports a press on the pressed size as null, which changes nothing.
          if (!isCanvasTextSize(value)) return;
          onPick(value);
        }}
      >
        {CANVAS_TEXT_SIZES.map((candidate) => (
          <ToggleButton
            key={candidate}
            value={candidate}
            label={t(SIZE_LABELS[candidate])}
            data-size={candidate}
          />
        ))}
      </ToggleButtonGroup>
    </div>
  );
}

/** On top of the inline bubble's gap: the bar sits taller over the text and read as touching it. */
const SIZE_BAR_EXTRA_GAP = 6;

/** Above a text-only selection, and nowhere else: a size has no answer for a frame or a picture (ONL-2486). */
export function TextSizeBar(): React.JSX.Element | null {
  const ids = useCanvasStore(useShallow((state) => textSizeBar(state).ids));
  const size = useCanvasStore((state) => textSizeBar(state).size);
  const nodes = useCanvasStore((state) => state.nodes);
  const setSelectedTextSize = useCanvasStore((state) => state.setSelectedTextSize);
  const zoom = useFlowStore((state) => state.transform[2]);

  const box = useMemo(() => {
    const held = new Set(ids);
    return boundingBox(
      nodes.flatMap((node) =>
        held.has(node.id)
          ? [
              {
                x: node.position.x,
                y: node.position.y,
                width: node.width ?? 0,
                height: node.height ?? 0,
              },
            ]
          : [],
      ),
    );
  }, [ids, nodes]);

  if (box === null) return null;
  const scale = safeScale(zoom);
  const point = inlineAnchorPoint(box, 'above', zoom);
  // Canvas content, never the top layer: the toolbar and the Right Rail paint over it as they do over a node (ONL-2521).
  return (
    <ViewportPortal>
      <div
        data-testid="canvas-text-size-anchor"
        className={CANVAS_INERT}
        style={{
          position: 'absolute',
          left: point.left,
          top: point.top - SIZE_BAR_EXTRA_GAP / scale,
          zIndex: LAYER.canvasOverlay,
          transform: `scale(${String(1 / scale)}) translate(-50%, -100%)`,
          transformOrigin: '0 0',
        }}
      >
        <TextSizeBarSurface size={size} onPick={setSelectedTextSize} />
      </div>
    </ViewportPortal>
  );
}
