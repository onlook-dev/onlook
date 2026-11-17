import { useState } from 'react';
import { useReactFlow, useStore as useFlowStore, type NodeProps } from '@xyflow/react';
import { t } from '@studio/i18n';
import { RenameField } from '../sidebar/RenameField.jsx';
import { NodeResizeHandles } from './NodeResizeHandles.jsx';
import { CanvasNodeMenu } from './menu/CanvasNodeMenu.jsx';
import { canvasNodeLabelText } from '../nodeLabel.js';
import type { SectionFlowNode } from './model.js';
import { frameRingScale } from './frame/geometry.js';
import { windowViewRect } from './placement.js';
import { isLoneSelectedNode, useCanvasStore } from './store.js';
import './canvas.css';

/** A step up from the Canvas ground: `--color-background-surface` is 85% black, which resolves to near-black over it and reads as a hole (ONL-2661). */
export const SECTION_FILL = 'var(--color-background-gray)';

function SectionSurface({ name, isSelected, zoom = 1 }: {
  name: string;
  isSelected: boolean;
  zoom?: number;
}): React.JSX.Element {
  return <div data-testid="canvas-section-surface" style={{
    position: 'absolute', inset: 0, borderRadius: 8,
    background: SECTION_FILL,
    boxShadow: `inset 0 0 0 ${String(frameRingScale(zoom))}px ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
    pointerEvents: 'none',
  }} aria-label={name} />;
}

export function SectionNode({ id, data, selected }: NodeProps<SectionFlowNode>): React.JSX.Element {
  const zoom = useFlowStore((state) => state.transform[2]);
  const { screenToFlowPosition } = useReactFlow();
  const isArmed = useCanvasStore((state) => isLoneSelectedNode(state, id));
  const drawnWidth = useCanvasStore((state) => state.gesture[id]?.width ?? state.doc?.nodes[id]?.width);
  const drawnHeight = useCanvasStore((state) => state.gesture[id]?.height ?? state.doc?.nodes[id]?.height);
  const [isRenaming, setIsRenaming] = useState(false);
  const name = canvasNodeLabelText({ kind: 'section', name: data.name.trim() }, t);
  return (
    <CanvasNodeMenu nodeId={id} readViewRect={() => windowViewRect(screenToFlowPosition, window)} readZoom={() => zoom}>
      <div data-testid="canvas-section" style={{ position: 'relative', width: drawnWidth, height: drawnHeight, pointerEvents: 'none' }}>
        <SectionSurface name={name} isSelected={selected} zoom={zoom} />
        <div className="canvas-section-title" style={{
          position: 'absolute', bottom: '100%', left: 0,
          transform: `scale(${String(frameRingScale(zoom))})`, transformOrigin: 'bottom left',
          minWidth: 120, maxWidth: 320, paddingBottom: 8, pointerEvents: 'auto',
          color: selected ? 'var(--color-accent)' : 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-sm)', fontWeight: 500,
        }}>
          {isRenaming ? <div className="nodrag nopan">
            <RenameField name={data.name} label={t('canvas.section.rename')} testId="canvas-section-rename"
              onCommit={(value) => { useCanvasStore.getState().renameFrame(id, value); setIsRenaming(false); }}
              onCancel={() => setIsRenaming(false)} />
          </div> : <button type="button" className="canvas-section-name" data-testid="canvas-section-name"
            onDoubleClick={() => setIsRenaming(true)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.stopPropagation(); setIsRenaming(true); } }}
            style={{ border: 0, padding: '4px 0', background: 'transparent', color: 'inherit', font: 'inherit', cursor: 'grab', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </button>}
        </div>
        {isArmed && <div style={{ pointerEvents: 'auto' }}><NodeResizeHandles id={id} testId="canvas-section-resize-handle"
          scale={frameRingScale(zoom)} bounds={{ minWidth: 160, minHeight: 120, maxWidth: 32768, maxHeight: 32768 }} /></div>}
      </div>
    </CanvasNodeMenu>
  );
}
