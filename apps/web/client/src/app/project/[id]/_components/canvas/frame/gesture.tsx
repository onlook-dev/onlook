import { useEditorEngine } from '@/components/store/editor';
import type { FrameData } from '@/components/store/editor/frames';
import { getRelativeMousePositionToWebview } from '@/components/store/editor/overlay/utils';
import type { DomElement, ElementPosition, WebFrame } from '@onlook/models';
import { EditorMode, MouseAction } from '@onlook/models';
import { cn } from '@onlook/ui/utils';
import throttle from 'lodash/throttle';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo } from 'react';
import { RightClickMenu } from './right-click';

export const GestureScreen = observer(({ frame }: { frame: WebFrame }) => {
    const editorEngine = useEditorEngine();
    const isResizing = false;

    const getFrameData: () => FrameData | undefined = useCallback(() => {
        return editorEngine.frames.get(frame.id);
    }, [editorEngine.frames, frame.id]);

    const getRelativeMousePosition = useCallback(
        (e: React.MouseEvent<HTMLDivElement>): ElementPosition => {
            const frameData = getFrameData();
            if (!frameData) {
                return { x: 0, y: 0 };
            }
            return getRelativeMousePositionToWebview(e, frameData.view);
        },
        [getFrameData],
    );

    const handleMouseEvent = useCallback(
        async (e: React.MouseEvent<HTMLDivElement>, action: MouseAction) => {
            const frameData = getFrameData();
            if (!frameData) {
                console.error('Frame data not found');
                return;
            }
            const pos = getRelativeMousePosition(e);
            const shouldGetStyle = [MouseAction.MOUSE_DOWN, MouseAction.DOUBLE_CLICK].includes(
                action,
            );
            const el: DomElement = await frameData.view.getElementAtLoc(
                pos.x,
                pos.y,
                shouldGetStyle,
            );
            if (!el) {
                console.log('No element found');
                return;
            }

            switch (action) {
                case MouseAction.MOVE:
                    editorEngine.elements.mouseover(el);
                    if (e.altKey) {
                        editorEngine.overlay.showMeasurement();
                    } else {
                        editorEngine.overlay.removeMeasurement();
                    }
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
                    if (editorEngine.text.isEditing) {
                        await editorEngine.text.end();
                    }
                    if (e.shiftKey) {
                        editorEngine.elements.shiftClick(el);
                    } else {
                        editorEngine.elements.click([el]);
                        await editorEngine.move.start(el, pos, frameData);
                    }
                    break;
                case MouseAction.DOUBLE_CLICK:
                    editorEngine.text.start(el, frameData.view);
                    break;
            }
        },
        [getRelativeMousePosition, editorEngine],
    );

    const throttledMouseMove = useMemo(
        () =>
            throttle(async (e: React.MouseEvent<HTMLDivElement>) => {
                // await handleMouseEvent(e, MouseAction.MOVE);

                if (editorEngine.move.isDragging) {
                    await editorEngine.move.drag(e, getRelativeMousePosition);
                } else if (
                    editorEngine.state.editorMode === EditorMode.DESIGN ||
                    ((editorEngine.state.editorMode === EditorMode.INSERT_DIV ||
                        editorEngine.state.editorMode === EditorMode.INSERT_TEXT ||
                        editorEngine.state.editorMode === EditorMode.INSERT_IMAGE) &&
                        !editorEngine.insert.isDrawing)
                ) {
                    await handleMouseEvent(e, MouseAction.MOVE);
                } else if (editorEngine.insert.isDrawing) {
                    editorEngine.insert.draw(e);
                }
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
            editorEngine.frames.deselectAll();
            editorEngine.frames.select(frame);
        },
        [editorEngine.frames],
    );

    async function handleDoubleClick(e: React.MouseEvent<HTMLDivElement>) {
        if (editorEngine.state.editorMode !== EditorMode.DESIGN) {
            return;
        }
        await handleMouseEvent(e, MouseAction.DOUBLE_CLICK);
    }

    async function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
        if (editorEngine.state.editorMode === EditorMode.DESIGN) {
            await handleMouseEvent(e, MouseAction.MOUSE_DOWN);
        } else if (
            editorEngine.state.editorMode === EditorMode.INSERT_DIV ||
            editorEngine.state.editorMode === EditorMode.INSERT_TEXT ||
            editorEngine.state.editorMode === EditorMode.INSERT_IMAGE
        ) {
            editorEngine.insert.start(e);
        }
    }

    async function handleMouseUp(e: React.MouseEvent<HTMLDivElement>) {
        const frameData = getFrameData();
        if (!frameData) {
            return;
        }

        await editorEngine.insert.end(e, frameData.view);
        if (editorEngine.move.isDragging) {
            await editorEngine.move.end(e);
        }
    }

    const handleDragOver = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        await handleMouseEvent(e, MouseAction.MOVE);
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
        //         const frameView = getWebview();
        //         const dropPosition = getRelativeMousePosition(e);
        //         await editorEngine.insert.insertDroppedImage(frameView, dropPosition, properties);
        //     } else {
        //         const frameView = getWebview();
        //         const dropPosition = getRelativeMousePosition(e);
        //         await editorEngine.insert.insertDroppedElement(frameView, dropPosition, properties);
        //     }

        //     editorEngine.state.editorMode = EditorMode.DESIGN;
        // } catch (error) {
        //     console.error('drop operation failed:', error);
        // }
    };

    const gestureScreenClassName = useMemo(() => {
        return cn(
            'absolute inset-0 bg-transparent',
            editorEngine.state.editorMode === EditorMode.PREVIEW && !isResizing
                ? 'hidden'
                : 'visible',
            editorEngine.state.editorMode === EditorMode.INSERT_DIV && 'cursor-crosshair',
            editorEngine.state.editorMode === EditorMode.INSERT_TEXT && 'cursor-text',
        );
    }, [editorEngine.state.editorMode, isResizing]);

    const handleMouseOut = () => {
        editorEngine.elements.clearHoveredElement();
        editorEngine.overlay.state.removeHoverRect();
    };

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
