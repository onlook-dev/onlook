import { useEditorEngine } from '@/components/store/editor';
import type { FrameData } from '@/components/store/editor/frames';
import { getRelativeMousePositionToFrameView } from '@/components/store/editor/overlay/utils';
import type { DomElement, ElementPosition, Frame } from '@onlook/models';
import { EditorMode, InsertMode, MouseAction } from '@onlook/models';
import { toast } from '@onlook/ui/sonner';
import { cn } from '@onlook/ui/utils';
import throttle from 'lodash/throttle';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo } from 'react';
import { RightClickMenu } from '../../right-click-menu';

export const GestureScreen = observer(({ frame, isResizing }: { frame: Frame, isResizing: boolean }) => {
    const editorEngine = useEditorEngine();

    const getFrameData: () => FrameData | null = useCallback(() => {
        return editorEngine.frames.get(frame.id);
    }, [editorEngine.frames, frame.id]);

    const getRelativeMousePosition = useCallback(
        (e: React.MouseEvent<HTMLDivElement>): ElementPosition => {
            const frameData = getFrameData();
            if (!frameData?.view) {
                return { x: 0, y: 0 };
            }
            return getRelativeMousePositionToFrameView(e, frameData.view);
        },
        [getFrameData],
    );

    const handleMouseEvent = useCallback(
        async (e: React.MouseEvent<HTMLDivElement>, action: MouseAction) => {
            try {
                const frameData = getFrameData();
                if (!frameData?.view) {
                    throw new Error('Frame view not found');
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
                    throw new Error('No element found');
                }

                switch (action) {
                    case MouseAction.MOVE:
                        editorEngine.elements.mouseover(el);
                        if (e.altKey) {
                            if (editorEngine.state.insertMode !== InsertMode.INSERT_IMAGE) {
                                editorEngine.overlay.showMeasurement();
                            }
                        } else {
                            editorEngine.overlay.removeMeasurement();
                        }
                        break;
                    case MouseAction.MOUSE_DOWN:
                        if (el.tagName.toLocaleLowerCase() === 'body') {
                            editorEngine.frames.select([frame], e.shiftKey);
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
                        }
                        break;
                    case MouseAction.DOUBLE_CLICK:
                        if (el.oid) {
                            editorEngine.ide.openCodeBlock(el.oid);
                        } else {
                            toast.error('Cannot find element in code panel');
                            return;
                        }
                        break;
                }
            } catch (error) {
                console.error('Error handling mouse event:', error);
                return;
            }
        },
        [getRelativeMousePosition, editorEngine],
    );

    const throttledMouseMove = useMemo(() =>
        throttle(async (e: React.MouseEvent<HTMLDivElement>) => {
            // Skip hover events during drag selection
            if (editorEngine.state.isDragSelecting) {
                return;
            }
            if (
                editorEngine.state.editorMode === EditorMode.DESIGN ||
                editorEngine.state.editorMode === EditorMode.CODE ||
                ((editorEngine.state.insertMode === InsertMode.INSERT_DIV ||
                    editorEngine.state.insertMode === InsertMode.INSERT_TEXT ||
                    editorEngine.state.insertMode === InsertMode.INSERT_IMAGE) &&
                    !editorEngine.insert.isDrawing)
            ) {
                await handleMouseEvent(e, MouseAction.MOVE);
            } else if (editorEngine.insert.isDrawing) {
                editorEngine.insert.draw(e);
            }
        }, 16),
        [editorEngine.state.isDragSelecting, editorEngine.state.editorMode, editorEngine.insert.isDrawing, getRelativeMousePosition, handleMouseEvent],
    );

    useEffect(() => {
        return () => {
            throttledMouseMove.cancel();
        };
    }, [throttledMouseMove]);

    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            editorEngine.frames.select([frame]);
        },
        [editorEngine.frames],
    );

    async function handleDoubleClick(e: React.MouseEvent<HTMLDivElement>) {
        if (editorEngine.state.editorMode === EditorMode.PREVIEW) {
            return;
        }
        await handleMouseEvent(e, MouseAction.DOUBLE_CLICK);
    }

    async function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
        if (editorEngine.state.editorMode === EditorMode.DESIGN || editorEngine.state.editorMode === EditorMode.CODE) {
            await handleMouseEvent(e, MouseAction.MOUSE_DOWN);
        } else if (
            editorEngine.state.insertMode === InsertMode.INSERT_DIV ||
            editorEngine.state.insertMode === InsertMode.INSERT_TEXT ||
            editorEngine.state.insertMode === InsertMode.INSERT_IMAGE
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
    }

    const handleDragOver = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        await handleMouseEvent(e, MouseAction.MOVE);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            const propertiesData = e.dataTransfer.getData('application/json');
            if (!propertiesData) {
                throw new Error('No element properties in drag data');
            }

            const properties = JSON.parse(propertiesData);

            if (properties.type === 'image') {
                const frameData = editorEngine.frames.get(frame.id);
                if (!frameData) {
                    throw new Error('Frame data not found');
                }
                const dropPosition = getRelativeMousePosition(e);
                await editorEngine.insert.insertDroppedImage(frameData, dropPosition, properties, e.altKey);
            } else {
                const frameData = editorEngine.frames.get(frame.id);
                if (!frameData) {
                    throw new Error('Frame data not found');
                }
                const dropPosition = getRelativeMousePosition(e);
                await editorEngine.insert.insertDroppedElement(frameData, dropPosition, properties);
            }

            editorEngine.state.editorMode = EditorMode.DESIGN;
            editorEngine.state.insertMode = null;
        } catch (error) {
            console.error('drop operation failed:', error);
            toast.error('Failed to drop element', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    };

    const gestureScreenClassName = useMemo(() => {
        return cn(
            'absolute inset-0 bg-transparent',
            editorEngine.state.editorMode === EditorMode.PREVIEW && !isResizing
                ? 'hidden'
                : 'visible',
            editorEngine.state.insertMode === InsertMode.INSERT_DIV && 'cursor-crosshair',
            editorEngine.state.insertMode === InsertMode.INSERT_TEXT && 'cursor-text',
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