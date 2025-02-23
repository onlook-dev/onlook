import { useEditorEngine } from '@/components/Context';
import type { ClickRectState } from '@/lib/editor/engine/overlay/state';
import { EditorMode } from '@/lib/models';
import { EditorAttributes } from '@onlook/models/constants';
import { observer } from 'mobx-react-lite';
import { memo, useMemo } from 'react';
import { OverlayChat } from './Chat';
import { ClickRect } from './ClickRect';
import { HoverRect } from './HoverRect';
import { InsertRect } from './InsertRect';
import { TextEditor } from './TextEditor';
import { MeasurementOverlay } from './MeasurementOverlay';

// Memoize child components
const MemoizedInsertRect = memo(InsertRect);
const MemoizedClickRect = memo(ClickRect);
const MemoizedTextEditor = memo(TextEditor);
const MemoizedChat = memo(OverlayChat);
const MemoizedMeasurementOverlay = memo(MeasurementOverlay);

const Overlay = observer(({ children }: { children: React.ReactNode }) => {
    const editorEngine = useEditorEngine();

    // Memoize overlay state values
    const overlayState = editorEngine.overlay.state;
    const isInteractMode = editorEngine.mode === EditorMode.INTERACT;
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
            visibility: isInteractMode ? 'hidden' : 'visible',
        }),
        [isInteractMode],
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
                {overlayState.hoverRect && (
                    <HoverRect
                        rect={overlayState.hoverRect.rect}
                        isComponent={overlayState.hoverRect.isComponent}
                    />
                )}
                {overlayState.insertRect && <MemoizedInsertRect rect={overlayState.insertRect} />}
                {clickRectsElements}
                {overlayState.textEditor && (
                    <MemoizedTextEditor
                        rect={overlayState.textEditor.rect}
                        content={overlayState.textEditor.content}
                        styles={overlayState.textEditor.styles}
                        onChange={overlayState.textEditor.onChange}
                        onStop={overlayState.textEditor.onStop}
                        isComponent={overlayState.textEditor.isComponent}
                    />
                )}
                {overlayState.measurement && (
                    <MemoizedMeasurementOverlay
                        fromRect={overlayState.measurement.fromRect}
                        toRect={overlayState.measurement.toRect}
                    />
                )}
                {
                    <MemoizedChat
                        elementId={editorEngine.elements.selected[0]?.domId}
                        selectedEl={overlayState.clickRects[0]}
                    />
                }
            </div>
        </>
    );
});

export default Overlay;
