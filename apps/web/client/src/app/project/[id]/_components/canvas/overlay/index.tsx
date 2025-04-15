import { useEditorEngine } from '@/components/store';
import type { ClickRectState } from '@/components/store/editor/engine/overlay/state';
import { EditorAttributes } from '@onlook/models/constants';
import { EditorMode } from '@onlook/models/editor';
import { observer } from 'mobx-react-lite';
import { memo, useMemo } from 'react';
import { OverlayChat } from './elements/chat';
import { MeasurementOverlay } from './elements/measurement';
import { ClickRect } from './elements/rect/click';
import { HoverRect } from './elements/rect/hover';
import { InsertRect } from './elements/rect/insert';
import { TextEditor } from './elements/text';

// Memoize child components
const MemoizedInsertRect = memo(InsertRect);
const MemoizedClickRect = memo(ClickRect);
const MemoizedTextEditor = memo(TextEditor);
const MemoizedChat = memo(OverlayChat);
const MemoizedMeasurementOverlay = memo(MeasurementOverlay);

export const Overlay = observer(({ children }: { children: React.ReactNode }) => {
    const editorEngine = useEditorEngine();

    // Memoize overlay state values
    const overlayState = editorEngine.overlay.state;
    const isPreviewMode = editorEngine.state.editorMode === EditorMode.PREVIEW;
    const isSingleSelection = editorEngine.elements.selected.length === 1;

    // Memoize the container style object
    const containerStyle = useMemo(
        () => ({
            position: 'absolute',
            height: 0,
            width: 0,
            top: 0,
            left: 0,
            pointerEvents: 'none',
            visibility: isPreviewMode ? 'hidden' : 'visible',
        }),
        [isPreviewMode],
    );

    // Memoize the clickRects rendering
    const clickRectsElements = useMemo(
        () =>
            overlayState.clickRects.map((rectState: ClickRectState) => (
                <MemoizedClickRect
                    key={rectState.id}
                    width={rectState.width}
                    height={rectState.height}
                    top={rectState.top}
                    left={rectState.left}
                    isComponent={rectState.isComponent}
                    styles={rectState.styles ?? {}}
                    shouldShowResizeHandles={isSingleSelection}
                />
            )),
        [overlayState.clickRects, isSingleSelection],
    );

    return (
        <>
            {children}
            <div
                style={containerStyle as React.CSSProperties}
                id={EditorAttributes.OVERLAY_CONTAINER_ID}
            >
                {
                    overlayState.hoverRect && (
                        <HoverRect
                            rect={overlayState.hoverRect.rect}
                            isComponent={overlayState.hoverRect.isComponent}
                        />
                    )}
                {overlayState.insertRect && <MemoizedInsertRect rect={overlayState.insertRect} />}
                {clickRectsElements}
                {
                    overlayState.textEditor && (
                        <MemoizedTextEditor
                            rect={overlayState.textEditor.rect}
                            content={overlayState.textEditor.content}
                            styles={overlayState.textEditor.styles}
                            onChange={overlayState.textEditor.onChange}
                            onStop={overlayState.textEditor.onStop}
                            isComponent={overlayState.textEditor.isComponent}
                        />
                    )
                }
                {
                    overlayState.measurement && (
                        <MemoizedMeasurementOverlay
                            fromRect={overlayState.measurement.fromRect}
                            toRect={overlayState.measurement.toRect}
                        />
                    )
                }
                {/*
                 <MemoizedChat
                        elementId={editorEngine.elements.selected[0]?.domId ?? ''}
                        selectedEl={overlayState.clickRects[0]}
                    /> 
                */}
            </div>
        </>
    );
});
