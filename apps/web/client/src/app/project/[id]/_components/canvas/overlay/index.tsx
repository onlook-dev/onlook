import { useEditorEngine } from '@/components/store';
import type { ClickRectState } from '@/components/store/editor/engine/overlay/state';
import { EditorAttributes } from '@onlook/constants';
import { EditorMode } from '@onlook/models';
import { cn } from '@onlook/ui/utils';
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

export const Overlay = observer(() => {
    const editorEngine = useEditorEngine();
    const overlayState = editorEngine.overlay.state;
    const isSingleSelection = editorEngine.elements.selected.length === 1;

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
                    styles={rectState.styles}
                    shouldShowResizeHandles={isSingleSelection}
                />
            )),
        [overlayState.clickRects, isSingleSelection],
    );

    return (
        <div
            id={EditorAttributes.OVERLAY_CONTAINER_ID}
            className={cn(
                'opacity-100 transition-opacity duration-150 absolute top-0 left-0 h-0 w-0 pointer-events-none',
                editorEngine.state.shouldHideOverlay && 'opacity-0',
                editorEngine.state.editorMode === EditorMode.PREVIEW && 'hidden'
            )}
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
    );
});
