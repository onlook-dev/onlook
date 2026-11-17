import { useEffect, useState } from 'react';
import { useReactFlow, useStore as useFlowStore, type NodeProps } from '@xyflow/react';
import { Center } from '@astryxdesign/core/Center';
import { Text } from '@astryxdesign/core/Text';

import { peekImage, resolveImage } from '../../chat/imageCache.js';
import { t } from '@studio/i18n';
import { frameRingScale } from '../frame/geometry.js';
import { CanvasNodeMenu } from '../menu/CanvasNodeMenu.jsx';
import {
  MAX_FRAME_SIZE,
  MIN_IMAGE_SIZE,
  resizeCeiling,
  resizeFloor,
  type ImageFlowNode,
} from '../model.js';
import { NodeResizeHandles } from '../NodeResizeHandles.jsx';
import { windowViewRect } from '../placement.js';
import { drawnImageBox, isLoneSelectedNode, useCanvasStore } from '../store.js';

/** Selection's own emphasis weight. */
const OUTLINE_WEIGHT = 1.75;
const LABEL_GAP = 6;

/** `reading` is the reserved box: only a resolved absence becomes the named placeholder (ONL-2486). */
export type ImageReadState = 'reading' | 'resolved' | 'missing';

const MUTED_BOX = {
  backgroundColor: 'var(--color-background-muted)',
  borderRadius: 'var(--radius-element)',
} as const;

export interface ImageNodeSurfaceProps {
  name: string;
  alt?: string;
  state: ImageReadState;
  /** Present exactly when `state` is `resolved`. */
  url?: string;
  isSelected: boolean;
  isHovered?: boolean;
  zoom?: number;
}

export function ImageNodeSurface({
  name,
  alt,
  state,
  url,
  isSelected,
  isHovered = false,
  zoom = 1,
}: ImageNodeSurfaceProps): React.JSX.Element {
  const scale = frameRingScale(zoom);
  return (
    <div
      data-testid="canvas-image-node"
      data-image-state={state}
      style={{
        position: 'absolute',
        inset: 0,
        ...MUTED_BOX,
        ...(isSelected
          ? {
              // The band is an `outline` and takes the element's radius, so the surface squares with it (ONL-2501).
              borderRadius: 'var(--radius-none)',
              outline: `${String(OUTLINE_WEIGHT * scale)}px solid var(--color-accent)`,
            }
          : {}),
      }}
    >
      {(isSelected || isHovered) && (
        // The node's left edge, counter-scaled so it keeps its screen weight; plain text, no pill.
        <div
          data-testid="canvas-image-label"
          style={{
            position: 'absolute',
            left: 0,
            bottom: `calc(100% + ${String(LABEL_GAP * scale)}px)`,
            transform: `scale(${String(scale)})`,
            transformOrigin: 'bottom left',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <Text size="sm" color="secondary">
            {name}
          </Text>
        </div>
      )}

      {state === 'resolved' && url !== undefined ? (
        <img
          src={url}
          alt={alt ?? name}
          draggable={false}
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
        />
      ) : null}

      {/* Never an `<img>` with a src that cannot load: a broken-image glyph reads as a bug, not as a missing asset. */}
      {state === 'missing' ? (
        <Center style={{ position: 'absolute', inset: 0, padding: 'var(--spacing-2)' }}>
          <Text size="sm" color="secondary" data-testid="canvas-image-missing">
            {t('canvas.image.missing', { name })}
          </Text>
        </Center>
      ) : null}
    </div>
  );
}

/** A read that has not landed for THIS id is `reading`, never `missing`: otherwise every project open flashes what looks like data loss (ONL-2486). */
export function imageReadState(
  imageId: string,
  read: { id: string; url: string | null } | null,
): { state: ImageReadState; url?: string } {
  if (read === null || read.id !== imageId) return { state: 'reading' };
  return read.url === null ? { state: 'missing' } : { state: 'resolved', url: read.url };
}

/** Memoized per id by the app's one image cache; an id that changes shows the reserved box again, never the previous pixels. */
function useImageRead(imageId: string): { state: ImageReadState; url?: string } {
  // Seeded, or a remount's first render is an empty box on a picture already in hand (ONL-2488).
  const [read, setRead] = useState<{ id: string; url: string | null } | null>(() => {
    const held = peekImage({ id: imageId });
    return held === undefined ? null : { id: imageId, url: held };
  });

  useEffect(() => {
    let isLive = true;
    void resolveImage({ id: imageId }).then((url) => {
      if (isLive) setRead({ id: imageId, url });
    });
    return () => {
      isLive = false;
    };
  }, [imageId]);

  return imageReadState(imageId, read);
}

export function ImageNode({
  id,
  data,
  selected,
  width,
  height,
}: NodeProps<ImageFlowNode>): React.JSX.Element {
  const zoom = useFlowStore((state) => state.transform[2]);
  const isHovered = useCanvasStore((state) => state.hoveredNodeId === id);
  const isArmed = useCanvasStore((state) => isLoneSelectedNode(state, id));
  const { screenToFlowPosition } = useReactFlow();
  const read = useImageRead(data.imageId);
  // Bounds from the settled size: from the live box they ratchet mid-gesture, and they rebind the control's drag.
  const settledWidth = useCanvasStore((state) => state.doc?.nodes[id]?.width);
  const settledHeight = useCanvasStore((state) => state.doc?.nodes[id]?.height);
  const drawnWidth = useCanvasStore((state) => drawnImageBox(state, id)?.width);
  const drawnHeight = useCanvasStore((state) => drawnImageBox(state, id)?.height);
  const resizeBounds = {
    minWidth: resizeFloor(MIN_IMAGE_SIZE.width, settledWidth ?? width),
    minHeight: resizeFloor(MIN_IMAGE_SIZE.height, settledHeight ?? height),
    maxWidth: resizeCeiling(MAX_FRAME_SIZE.width, settledWidth ?? width),
    maxHeight: resizeCeiling(MAX_FRAME_SIZE.height, settledHeight ?? height),
  };
  return (
    <CanvasNodeMenu
      nodeId={id}
      readViewRect={() => windowViewRect(screenToFlowPosition, window)}
      readZoom={() => zoom}
    >
      {/* Sized in px: Astryx's right-click wrapper hugs its content, so a `height: 100%` child collapses inside it. */}
      <div
        style={{
          position: 'relative',
          width: drawnWidth ?? width ?? '100%',
          height: drawnHeight ?? height ?? '100%',
        }}
      >
        <ImageNodeSurface
          name={data.name}
          {...(data.alt === undefined ? {} : { alt: data.alt })}
          state={read.state}
          {...(read.url === undefined ? {} : { url: read.url })}
          isSelected={selected}
          isHovered={isHovered}
          zoom={zoom}
        />
        {/* Keyed on armed, not selected: handles on one member of a group read as singling it out. */}
        {isArmed && (
          <NodeResizeHandles
            id={id}
            testId="canvas-image-resize-handle"
            scale={frameRingScale(zoom)}
            bounds={resizeBounds}
          />
        )}
      </div>
    </CanvasNodeMenu>
  );
}
