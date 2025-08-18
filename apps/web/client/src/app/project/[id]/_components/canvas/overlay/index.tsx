import { useEditorEngine } from '@/components/store/editor';
import type { ClickRectState } from '@/components/store/editor/overlay/state';
import { EditorAttributes } from '@onlook/constants';
import { EditorMode } from '@onlook/models';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useMemo } from 'react';
import { OverlayButtons } from './elements/buttons';
import { MeasurementOverlay } from './elements/measurement';
import { ClickRect } from './elements/rect/click';
import { HoverRect } from './elements/rect/hover';
import { InsertRect } from './elements/rect/insert';
import { TextEditor } from './elements/text';

export const Overlay = observer(() => {
    const editorEngine = useEditorEngine();
    const overlayState = editorEngine.overlay.state;
    const isSingleSelection = editorEngine.elements.selected.length === 1;
    const isTextEditing = editorEngine.text.isEditing;

    const clickRectsElements = useMemo(
        () =>
            overlayState.clickRects.map((rectState: ClickRectState) => (
                <ClickRect
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
                'absolute top-0 left-0 h-0 w-0 pointer-events-none',
                editorEngine.state.shouldHideOverlay ? 'opacity-0' : 'opacity-100 transition-opacity duration-150',
                editorEngine.state.editorMode === EditorMode.PREVIEW && 'hidden',
            )}
        >
            {!isTextEditing && overlayState.hoverRect && (
                <HoverRect
                    rect={overlayState.hoverRect.rect}
                    isComponent={overlayState.hoverRect.isComponent}
                />
            )}
            {overlayState.insertRect && (
                <InsertRect rect={overlayState.insertRect} />
            )}
            {!isTextEditing && clickRectsElements}
            {isTextEditing && overlayState.textEditor && (
                <TextEditor
                    rect={overlayState.textEditor.rect}
                    content={overlayState.textEditor.content}
                    styles={overlayState.textEditor.styles}
                    onChange={overlayState.textEditor.onChange}
                    onStop={overlayState.textEditor.onStop}
                    isComponent={overlayState.textEditor.isComponent}
                />
            )}
            {overlayState.measurement && (
                <MeasurementOverlay
                    fromRect={overlayState.measurement.fromRect}
                    toRect={overlayState.measurement.toRect}
                />
            )}
            {overlayState.clickRects.length > 0 && (
                <OverlayButtons />
            )}
        </div>
    );
});
