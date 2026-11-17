import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  useReactFlow,
  useStore as useFlowStore,
  ViewportPortal,
  type NodeProps,
} from '@xyflow/react';
import {
  CANVAS_TEXT_FONT_SIZES,
  CANVAS_TEXT_LINE_HEIGHT,
  CANVAS_TEXT_WRAP_WIDTH,
  defaultTextBox,
  type CanvasTextSize,
} from '@studio/events';

import { t } from '@studio/i18n';
import { frameRingScale } from '../frame/geometry.js';
import { CanvasNodeMenu } from '../menu/CanvasNodeMenu.jsx';
import type { TextFlowNode } from '../model.js';
import { NodeResizeHandles } from '../NodeResizeHandles.jsx';
import { windowViewRect } from '../placement.js';
import { drawnTextBox, isLoneSelectedNode, useCanvasStore } from '../store.js';
import {
  caretText,
  DEFAULT_CANVAS_TEXT_SIZE,
  keepsTextEditOpen,
  measuredTextBox,
} from './placement.js';
import { LAYER } from '../../overlay/layers.js';

/** Selected and editing alike; the frame's own emphasis weight. */
const OUTLINE_WEIGHT = 1.75;
const HOVER_UNDERLINE_WEIGHT = 2;

export interface TextNodeSurfaceProps {
  /** Rides the surface, not its wrapper: a draft's wrapper holds an absolutely-positioned child and so has no box (ONL-2486). */
  testId?: string;
  text: string;
  size: CanvasTextSize;
  wrapWidth?: number;
  children?: React.ReactNode;
  isSelected: boolean;
  isEditing: boolean;
  isHovered?: boolean;
  zoom?: number;
  boxRef?: React.Ref<HTMLDivElement>;
  editableRef?: React.Ref<HTMLDivElement>;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLDivElement>) => void;
  onDoubleClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

// The editable's children are the COMMITTED value and move only across a commit, so React never reconciles the DOM the caret is writing into.
export function TextNodeSurface({
  testId = 'canvas-text-node',
  text,
  size,
  wrapWidth,
  children,
  isSelected,
  isEditing,
  isHovered = false,
  zoom = 1,
  boxRef,
  editableRef,
  onKeyDown,
  onBlur,
  onDoubleClick,
}: TextNodeSurfaceProps): React.JSX.Element {
  const scale = frameRingScale(zoom);
  const isEmphasised = isSelected || isEditing;
  const isUnderlined = isHovered && !isEmphasised;
  // The shared default box's own height, so an empty node's floor and its stored box are the same number.
  const lineHeight = defaultTextBox(size).height;
  return (
    <div
      ref={boxRef}
      data-testid={testId}
      data-text-size={size}
      data-text-editing={isEditing ? 'true' : undefined}
      data-hovered={isUnderlined ? 'true' : undefined}
      style={{
        // Out of the wrapper's flow: the stored box lags the content between a keystroke and its commit, and a caret must never be clipped to it.
        position: 'absolute',
        top: 0,
        left: 0,
        width: wrapWidth ?? 'max-content',
        maxWidth: wrapWidth === undefined ? CANVAS_TEXT_WRAP_WIDTH : undefined,
        ...(isEmphasised
          ? { outline: `${String(OUTLINE_WEIGHT * scale)}px solid var(--color-accent)` }
          : {}),
      }}
    >
      <div
        ref={editableRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        role="textbox"
        aria-label={t('canvas.text.editor.label')}
        aria-multiline
        // A double-click is what makes it writable; until then the role is honest about not being.
        aria-readonly={!isEditing}
        // No tabIndex on purpose: `isInteractiveTarget` reads this role, so a focusable resting label would eat Delete and every canvas shortcut (ONL-2486).
        // `nokey` and `contenteditable` both stop React Flow's Delete; the drag and pan classes let a pointer select text instead of moving the node.
        {...(isEditing ? { className: 'nodrag nopan nokey' } : {})}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        onDoubleClick={onDoubleClick}
        style={{
          fontSize: CANVAS_TEXT_FONT_SIZES[size],
          lineHeight: CANVAS_TEXT_LINE_HEIGHT,
          color: 'var(--color-text-primary)',
          // The wrap is the layout: `pre-wrap` keeps the typed line breaks, and a single long word still breaks inside the width.
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          outline: 'none',
          // An empty node is a caret in the box, never ghost text.
          minWidth: '1ch',
          minHeight: lineHeight,
          cursor: isEditing ? 'text' : 'default',
          // The draft draws inside React Flow's viewport portal, which inherits `user-select: none` onto the caret's own region.
          userSelect: isEditing ? 'text' : 'none',
          ...(isUnderlined
            ? {
                textDecorationLine: 'underline',
                textDecorationColor: 'var(--color-accent)',
                textDecorationThickness: `${String(HOVER_UNDERLINE_WEIGHT * scale)}px`,
                textUnderlineOffset: `${String(2 * scale)}px`,
                textDecorationSkipInk: 'none',
              }
            : {}),
        }}
      >
        {text}
      </div>
      {children}
    </div>
  );
}

/** Focus and measurement, beside the node rather than in the canvas shell. */
function useTextEditing({
  id,
  text,
  size,
  isEditing,
  wrapWidth,
  layoutText = text,
  isResizePending = false,
}: {
  id: string;
  text: string;
  size: CanvasTextSize;
  isEditing: boolean;
  wrapWidth?: number;
  layoutText?: string;
  isResizePending?: boolean;
}): Pick<TextNodeSurfaceProps, 'boxRef' | 'editableRef' | 'onKeyDown' | 'onBlur' | 'onDoubleClick'> & {
  measureHeight: (width: number) => number;
} {
  // A callback ref, not a ref object: the draft's box mounts after this hook's first layout, and a `[]` effect would never observe it.
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const editableRef = useRef<HTMLDivElement | null>(null);
  const [measured, setMeasured] = useState<{
    box: { width: number; height: number };
    size: CanvasTextSize;
    text: string;
    wrapWidth?: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (box === null) return;
    const read = (): void => {
      const next = {
        box: measuredTextBox({ width: box.offsetWidth, height: box.offsetHeight }, size, wrapWidth),
        size,
        text: layoutText,
        wrapWidth,
      };
      setMeasured((previous) =>
        previous?.box.width === next.box.width && previous.box.height === next.box.height &&
        previous.size === next.size && previous.text === next.text && previous.wrapWidth === next.wrapWidth
          ? previous
          : next,
      );
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(box);
    return () => {
      observer.disconnect();
    };
  }, [box, size, wrapWidth, layoutText, text, isEditing]);

  // The stored box follows the measured one; the caret's own edit carries its box on the commit instead.
  useEffect(() => {
    if (measured === null || isEditing) return;
    useCanvasStore.getState().noteTextMeasured(id, measured.box, measured.size, measured);
  }, [id, isEditing, measured, isResizePending]);

  useEffect(() => {
    const editable = editableRef.current;
    if (!isEditing || editable === null) return;
    editable.focus({ preventScroll: true });
    const selection = window.getSelection();
    if (selection === null) return;
    const range = document.createRange();
    range.selectNodeContents(editable);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }, [isEditing]);

  const commit = useCallback(() => {
    const editable = editableRef.current;
    if (editable === null) return;
    // Read off the DOM, not the measured state: the last keystroke's layout has not reached a render yet.
    useCanvasStore
      .getState()
      .commitTextEdit(
        editable.innerText,
        measuredTextBox({ width: box?.offsetWidth ?? 0, height: box?.offsetHeight ?? 0 }, size, wrapWidth),
      );
  }, [box, size, wrapWidth]);

  const measureHeight = useCallback((width: number): number => {
    if (box === null) return defaultTextBox(size).height;
    const previousWidth = box.style.width;
    const previousMaxWidth = box.style.maxWidth;
    box.style.width = `${String(width)}px`;
    box.style.maxWidth = 'none';
    const height = measuredTextBox({ width, height: box.offsetHeight }, size, width).height;
    box.style.width = previousWidth;
    box.style.maxWidth = previousMaxWidth;
    return height;
  }, [box, size]);

  return {
    measureHeight,
    boxRef: setBox,
    editableRef,
    onKeyDown: useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Escape') return;
        // Commit, never revert. Claimed here because `useEscape` declines an editable target.
        event.preventDefault();
        event.stopPropagation();
        commit();
      },
      [commit],
    ),
    onBlur: useCallback(
      (event: React.FocusEvent<HTMLDivElement>) => {
        // Pressing one of the canvas's own overlays is not leaving the edit; committing there would delete an untouched node.
        if (keepsTextEditOpen(event.relatedTarget)) return;
        commit();
      },
      [commit],
    ),
    onDoubleClick: useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        // Never reaches the canvas: the pane's own double-click zooms.
        event.stopPropagation();
        useCanvasStore.getState().beginTextEdit(id);
      },
      [id],
    ),
  };
}

export function TextNode({
  id,
  data,
  selected,
}: NodeProps<TextFlowNode>): React.JSX.Element {
  const zoom = useFlowStore((state) => state.transform[2]);
  const isEditing = useCanvasStore((state) => state.textEditId === id);
  const isHovered = useCanvasStore((state) => state.hoveredNodeId === id);
  const editedText = useCanvasStore((state) => caretText(state.doc?.nodes, state.textEditId, id));
  const layoutText = useCanvasStore((state) => {
    const node = state.doc?.nodes[id];
    return node?.kind === 'text' ? node.content.text : data.text;
  });
  const width = useCanvasStore((state) => drawnTextBox(state, id)?.width);
  const height = useCanvasStore((state) => drawnTextBox(state, id)?.height);
  const wrapWidth = useCanvasStore((state) => drawnTextBox(state, id)?.wrapWidth);
  const isArmed = useCanvasStore((state) => isLoneSelectedNode(state, id) && state.textEditId !== id);
  const isResizePending = useCanvasStore((state) => state.resizeInFlightId === id || state.gesture[id]?.isSettling === true);
  // The caret edits the stored string, never the drawn one: committing the truncation would delete the rest (ONL-2486).
  const text = editedText ?? data.text;
  const { screenToFlowPosition } = useReactFlow();
  const { measureHeight, ...editing } = useTextEditing({ id, text, size: data.size, isEditing, wrapWidth, layoutText, isResizePending });
  return (
    <CanvasNodeMenu
      nodeId={id}
      readViewRect={() => windowViewRect(screenToFlowPosition, window)}
      readZoom={() => zoom}
    >
      {/* Sized in px: Astryx's right-click wrapper hugs its content, so a `height: 100%` child collapses inside it. */}
      <div style={{ position: 'relative', width: width ?? '100%', height: height ?? '100%' }}>
        <TextNodeSurface
          text={text}
          size={data.size}
          wrapWidth={wrapWidth}
          isSelected={selected}
          isEditing={isEditing}
          isHovered={isHovered}
          zoom={zoom}
          {...editing}
        >
          {isArmed && <NodeResizeHandles
            id={id}
            testId="canvas-text-resize-handle"
            scale={frameRingScale(zoom)}
            cornersOnly
            measureHeight={measureHeight}
            bounds={{ minWidth: 1, minHeight: 1, maxWidth: Infinity, maxHeight: Infinity }}
          />}
        </TextNodeSurface>
      </div>
    </CanvasNodeMenu>
  );
}

/** The placement being typed into, drawn from the store rather than from a node: no node exists until the caret leaves with a value. */
export function TextDraftNode(): React.JSX.Element | null {
  const draft = useCanvasStore((state) => state.textDraft);
  const isEditing = useCanvasStore((state) => state.textEditId === state.textDraft?.id);
  const zoom = useFlowStore((state) => state.transform[2]);
  const { measureHeight: _measureHeight, ...editing } = useTextEditing({
    id: draft?.id ?? '',
    text: draft?.text ?? '',
    size: draft?.size ?? DEFAULT_CANVAS_TEXT_SIZE,
    isEditing,
  });
  if (draft === null) return null;
  return (
    <ViewportPortal>
      <div
        style={{
          position: 'absolute',
          left: draft.x,
          top: draft.y,
          zIndex: LAYER.canvasOverlay,
          // `.react-flow__viewport` sets `pointer-events: none` and it inherits: without this the caret cannot be clicked into the draft (ONL-2486).
          pointerEvents: 'auto',
        }}
      >
        <TextNodeSurface
          testId="canvas-text-draft"
          text={draft.text}
          size={draft.size}
          isSelected
          isEditing={isEditing}
          zoom={zoom}
          {...editing}
        />
      </div>
    </ViewportPortal>
  );
}
