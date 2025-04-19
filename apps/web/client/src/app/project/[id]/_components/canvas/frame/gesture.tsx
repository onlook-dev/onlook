import { useEditorEngine } from '@/components/store';
import type { FrameData } from '@/components/store/editor/engine/frames';
import { getRelativeMousePositionToWebview } from '@/components/store/editor/engine/overlay/utils';
import { EditorMode, MouseAction } from '@onlook/models/editor';
import type { DomElement, ElementPosition } from '@onlook/models/element';
import type { WebFrame } from '@onlook/models/frame';
import { cn } from '@onlook/ui/utils';
import throttle from 'lodash/throttle';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo } from 'react';
import { RightClickMenu } from './right-click';

export const GestureScreen = observer(({ frame }: { frame: WebFrame }) => {
    const editorEngine = useEditorEngine();
    const isResizing = false;

    const getFrameData: () => FrameData | undefined = () => {
        return editorEngine.frames.get(frame.id);
    }

    const getRelativeMousePosition = (e: React.MouseEvent<HTMLDivElement>): ElementPosition => {
        const frameData = getFrameData();
        if (!frameData) {
            return { x: 0, y: 0 };
        }
        const { view } = frameData;
        return getRelativeMousePositionToWebview(e, view);
    }

    const handleMouseEvent = useCallback(
        async (e: React.MouseEvent<HTMLDivElement>, action: MouseAction) => {
            const frameData = getFrameData();
            if (!frameData) {
                console.error('Frame data not found');
                return;
            }
            const pos = getRelativeMousePosition(e);
            const shouldGetStyle = [MouseAction.MOUSE_DOWN, MouseAction.DOUBLE_CLICK].includes(action);
            const el: DomElement = await frameData.view.getElementAtLoc(pos.x, pos.y, shouldGetStyle);
            if (!el) {
                console.log('No element found');
                return;
            }

            switch (action) {
                case MouseAction.MOVE:
                    editorEngine.elements.mouseover(el, frameData);
                    // if (e.altKey) {
                    //     editorEngine.elements.showMeasurement();
                    // } else {
                    //     editorEngine.overlay.removeMeasurement();
                    // }
                    break;
                case MouseAction.MOUSE_DOWN:
                    if (el.tagName.toLocaleLowerCase() === 'body') {
                        editorEngine.frames.select(frame);
                        return;
                    }
                    // Ignore right-clicks
                    if (e.button == 2) {
                        break;
                    }
                    // if (editorEngine.text.isEditing) {
                    //     editorEngine.text.end();
                    // }
                    if (e.shiftKey) {
                        editorEngine.elements.shiftClick(el, frameData);
                    } else {
                        // editorEngine.move.start(el, pos, webview);
                        editorEngine.elements.click([el], frameData);
                    }
                    break;
                case MouseAction.DOUBLE_CLICK:
                    // editorEngine.text.start(el, webview);
                    break;
            }
        },
        [getRelativeMousePosition, editorEngine],
    );

    const throttledMouseMove = useMemo(
        () =>
            throttle((e: React.MouseEvent<HTMLDivElement>) => {
                handleMouseEvent(e, MouseAction.MOVE);

                // if (editorEngine.move.isDragging) {
                //     editorEngine.move.drag(e, getRelativeMousePosition);
                // } else if (
                //     editorEngine.state.editorMode === EditorMode.DESIGN ||
                //     ((editorEngine.state.editorMode === EditorMode.INSERT_DIV ||
                //         editorEngine.state.editorMode === EditorMode.INSERT_TEXT ||
                //         editorEngine.state.editorMode === EditorMode.INSERT_IMAGE) &&
                //         !editorEngine.insert.isDrawing)
                // ) {
                //     handleMouseEvent(e, MouseAction.MOVE);
                // } else if (editorEngine.insert.isDrawing) {
                //     editorEngine.insert.draw(e);
                // }
            }, 16),
        [editorEngine, getRelativeMousePosition, handleMouseEvent],
    );

    useEffect(() => {
        return () => {
            throttledMouseMove.cancel();
        };
    }, [throttledMouseMove]);

    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            // const webview = getWebview();
            // editorEngine.webview.deselectAll();
            editorEngine.frames.select(frame);
        },
        [editorEngine.frames],
    );

    function handleDoubleClick(e: React.MouseEvent<HTMLDivElement>) {
        // if (editorEngine.state.editorMode !== EditorMode.DESIGN) {
        //     return;
        // }
        // handleMouseEvent(e, MouseAction.DOUBLE_CLICK);
    }

    function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
        if (editorEngine.state.editorMode === EditorMode.DESIGN) {
            handleMouseEvent(e, MouseAction.MOUSE_DOWN);
        } else if (
            editorEngine.state.editorMode === EditorMode.INSERT_DIV ||
            editorEngine.state.editorMode === EditorMode.INSERT_TEXT ||
            editorEngine.state.editorMode === EditorMode.INSERT_IMAGE
        ) {
            // editorEngine.insert.start(e);
        }
    }

    async function handleMouseUp(e: React.MouseEvent<HTMLDivElement>) {
        // editorEngine.insert.end(e, webviewRef.current);
        // editorEngine.move.end(e);
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        // e.preventDefault();
        // e.stopPropagation();
        // handleMouseEvent(e, MouseAction.MOVE);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        // try {
        //     const propertiesData = e.dataTransfer.getData('application/json');
        //     if (!propertiesData) {
        //         console.error('No element properties in drag data');
        //         return;
        //     }

        //     const properties = JSON.parse(propertiesData);

        //     if (properties.type === 'image') {
        //         const webview = getWebview();
        //         const dropPosition = getRelativeMousePosition(e);
        //         await editorEngine.insert.insertDroppedImage(webview, dropPosition, properties);
        //     } else {
        //         const webview = getWebview();
        //         const dropPosition = getRelativeMousePosition(e);
        //         await editorEngine.insert.insertDroppedElement(webview, dropPosition, properties);
        //     }

        //     editorEngine.state.editorMode = EditorMode.DESIGN;
        // } catch (error) {
        //     console.error('drop operation failed:', error);
        // }
    };

    const gestureScreenClassName = useMemo(() => {
        return cn(
            'absolute inset-0 bg-transparent',
            editorEngine.state.editorMode === EditorMode.PREVIEW && !isResizing ? 'hidden' : 'visible',
            editorEngine.state.editorMode === EditorMode.INSERT_DIV && 'cursor-crosshair',
            editorEngine.state.editorMode === EditorMode.INSERT_TEXT && 'cursor-text',
        );
    }, [editorEngine.state.editorMode, isResizing]);

    const handleMouseOut = () => {
        editorEngine.elements.clearHoveredElement();
        editorEngine.overlay.state.removeHoverRect();
    }

    return (
        <RightClickMenu>
            <div
                className={gestureScreenClassName}
                onClick={handleClick}
                onMouseOut={handleMouseOut}
                onMouseLeave={handleMouseUp}
                onMouseMove={throttledMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onDoubleClick={handleDoubleClick}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            ></div>
        </RightClickMenu>
    );
});
