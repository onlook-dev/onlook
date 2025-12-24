'use client';

import { useEditorEngine } from '@/components/store/editor';
import { EditorAttributes } from '@onlook/constants';
import { EditorMode } from '@onlook/models';
import { throttle } from 'lodash';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Frames } from './frames';
import { HotkeysArea } from './hotkeys';
import { Overlay } from './overlay';
import { DragSelectOverlay } from './overlay/drag-select';
import { PanOverlay } from './overlay/pan';
import { RecenterCanvasButton } from './recenter-canvas-button';
import { getFramesInSelection, getSelectedFrameData } from './selection-utils';

const ZOOM_SENSITIVITY = 0.006;
const PAN_SENSITIVITY = 0.52;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const MAX_X = 10000;
const MAX_Y = 10000;
const MIN_X = -5000;
const MIN_Y = -5000;

export const Canvas = observer(() => {
    const editorEngine = useEditorEngine();
    const containerRef = useRef<HTMLDivElement>(null);
    const scale = editorEngine.canvas.scale;
    const position = editorEngine.canvas.position;
    const [isDragSelecting, setIsDragSelecting] = useState(false);
    const [dragSelectStart, setDragSelectStart] = useState({ x: 0, y: 0 });
    const [dragSelectEnd, setDragSelectEnd] = useState({ x: 0, y: 0 });
    const [framesInSelection, setFramesInSelection] = useState<Set<string>>(new Set());

    const handleCanvasMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target !== containerRef.current) {
            return;
        }

        // Start drag selection only in design mode and left mouse button
        if (event.button !== 0) {
            return;
        }

        // Switch to chat mode when clicking on empty canvas space during code editing
        if (editorEngine.state.editorMode === EditorMode.CODE) {
            editorEngine.state.editorMode = EditorMode.DESIGN;
            return
        }
        if (editorEngine.state.editorMode === EditorMode.DESIGN) {
            const rect = containerRef.current.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            setIsDragSelecting(true);
            setDragSelectStart({ x, y });
            setDragSelectEnd({ x, y });
            setFramesInSelection(new Set());

            // Set a flag in the editor engine to suppress hover effects
            editorEngine.state.isDragSelecting = true;

            // Clear existing selections if not shift-clicking
            if (!event.shiftKey) {
                editorEngine.clearUI();
                editorEngine.frames.deselectAll();
            }

        } else {
            // Only clear UI for left clicks that don't start drag selection
            editorEngine.clearUI();
        }
    };

    const updateFramesInSelection = useCallback((start: { x: number; y: number }, end: { x: number; y: number }) => {
        const intersectingFrameIds = getFramesInSelection(
            editorEngine,
            start,
            end,
            position,
            scale
        );
        setFramesInSelection(new Set(intersectingFrameIds));
    }, [position, scale, editorEngine]);

    const handleCanvasMouseMove = useCallback(
        throttle((event: React.MouseEvent<HTMLDivElement>) => {
            if (!isDragSelecting || !containerRef.current) {
                return;
            }

            const rect = containerRef.current.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            setDragSelectEnd({ x, y });

            // Update frames in selection for visual feedback
            updateFramesInSelection(dragSelectStart, { x, y });
        }, 16), // ~60fps
        [isDragSelecting, dragSelectStart, updateFramesInSelection]
    );

    const handleCanvasMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
        // Mouse up is now handled by the global listener in useEffect
        // This function is kept for consistency but the logic is in the global handler
    };

    const handleZoom = useCallback(
        (event: WheelEvent) => {
            if (!containerRef.current) {
                return;
            }
            event.preventDefault();
            const zoomFactor = -event.deltaY * ZOOM_SENSITIVITY;
            const rect = containerRef.current.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            const newScale = scale * (1 + zoomFactor);
            const lintedScale = clampZoom(newScale);

            const deltaX = (x - position.x) * zoomFactor;
            const deltaY = (y - position.y) * zoomFactor;

            // Add slight Y offset to compensate for drift
            const yOffset = zoomFactor * -32; // TODO: Debug where this offset is coming from

            editorEngine.canvas.scale = lintedScale;

            if (newScale < MIN_ZOOM || newScale > MAX_ZOOM) {
                return;
            }
            const newPosition = clampPosition(
                {
                    x: position.x - deltaX,
                    y: position.y - deltaY - yOffset,
                },
                lintedScale,
            );
            editorEngine.canvas.position = newPosition;
        },
        [scale, position, editorEngine.canvas],
    );

    function clampZoom(scale: number) {
        return Math.min(Math.max(scale, MIN_ZOOM), MAX_ZOOM);
    }

    function clampPosition(position: { x: number; y: number }, scale: number) {
        const effectiveMaxX = MAX_X * scale;
        const effectiveMaxY = MAX_Y * scale;
        const effectiveMinX = MIN_X * scale;
        const effectiveMinY = MIN_Y * scale;

        return {
            x: Math.min(Math.max(position.x, effectiveMinX), effectiveMaxX),
            y: Math.min(Math.max(position.y, effectiveMinY), effectiveMaxY),
        };
    }

    const handlePan = useCallback(
        (event: WheelEvent) => {
            const deltaX = (event.deltaX + (event.shiftKey ? event.deltaY : 0)) * PAN_SENSITIVITY;
            const deltaY = (event.shiftKey ? 0 : event.deltaY) * PAN_SENSITIVITY;

            const newPosition = clampPosition(
                {
                    x: position.x - deltaX,
                    y: position.y - deltaY,
                },
                scale,
            );
            editorEngine.canvas.position = newPosition;
        },
        [scale, position, editorEngine.canvas],
    );

    const handleWheel = useCallback(
        (event: WheelEvent) => {
            // This is a workaround to prevent the canvas from scrolling when textarea in Chat with AI is focused.
            if (event.target instanceof HTMLTextAreaElement) {
                return;
            }
            editorEngine.state.canvasScrolling = true;
            if (event.ctrlKey || event.metaKey) {
                handleZoom(event);
            } else {
                handlePan(event);
            }
        },
        [handleZoom, handlePan, editorEngine.state],
    );

    const middleMouseButtonDown = useCallback((e: MouseEvent) => {
        if (e.button === 1) {
            editorEngine.state.editorMode = EditorMode.PAN;
            editorEngine.state.canvasPanning = true;
            e.preventDefault();
            e.stopPropagation();
        }
    }, []);

    const middleMouseButtonUp = useCallback((e: MouseEvent) => {
        if (e.button === 1) {
            editorEngine.state.editorMode = EditorMode.DESIGN;
            editorEngine.state.canvasPanning = false;
            e.preventDefault();
            e.stopPropagation();
        }
    }, []);

    const transformStyle = useMemo(
        () => ({
            transition: 'transform ease',
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: '0 0',
        }),
        [position.x, position.y, scale],
    );

    useEffect(() => {
        const div = containerRef.current;
        if (div) {
            div.addEventListener('wheel', handleWheel, { passive: false });
            div.addEventListener('mousedown', middleMouseButtonDown);
            div.addEventListener('mouseup', middleMouseButtonUp);
            return () => {
                div.removeEventListener('wheel', handleWheel);
                div.removeEventListener('mousedown', middleMouseButtonDown);
                div.removeEventListener('mouseup', middleMouseButtonUp);
                handleCanvasMouseMove.cancel?.(); // Clean up throttled function
            };
        }
    }, [handleWheel, middleMouseButtonDown, middleMouseButtonUp, handleCanvasMouseMove]);

    // Global mouseup listener to handle drag termination outside canvas
    useEffect(() => {
        if (isDragSelecting) {
            const handleGlobalMouseUp = (event: MouseEvent) => {
                try {
                    // Get frames that intersect with the selection rectangle
                    const selectedFrames = getSelectedFrameData(
                        editorEngine,
                        dragSelectStart,
                        dragSelectEnd,
                        position,
                        scale
                    );

                    // Select the frames if any were found in the selection
                    if (selectedFrames.length > 0) {
                        editorEngine.frames.select(
                            selectedFrames.map(fd => fd.frame),
                            event.shiftKey // multiselect if shift is held
                        );
                    }
                } catch (error) {
                    console.warn('Error during drag selection:', error);
                } finally {
                    // Always clean up drag selection state, even if selection fails
                    setIsDragSelecting(false);
                    setFramesInSelection(new Set());
                    editorEngine.state.isDragSelecting = false;
                }
            };

            window.addEventListener('mouseup', handleGlobalMouseUp);
            return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
        }
    }, [isDragSelecting, dragSelectStart, dragSelectEnd, position, scale, editorEngine]);

    return (
        <HotkeysArea>
            <div
                ref={containerRef}
                className="overflow-hidden bg-background-onlook flex flex-grow relative"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={(e) => {
                    // Only terminate drag if no mouse button is pressed
                    // Note: The global mouseup listener will handle the actual cleanup
                    // This is just an additional safety check for when mouse leaves without buttons pressed
                    if (e.buttons === 0 && isDragSelecting) {
                        setIsDragSelecting(false);
                        setFramesInSelection(new Set());
                        editorEngine.state.isDragSelecting = false;
                    }
                }}
            >
                <div id={EditorAttributes.CANVAS_CONTAINER_ID} style={transformStyle}>
                    <Frames framesInDragSelection={framesInSelection} />
                </div>
                <RecenterCanvasButton />
                <DragSelectOverlay
                    startX={dragSelectStart.x}
                    startY={dragSelectStart.y}
                    endX={dragSelectEnd.x}
                    endY={dragSelectEnd.y}
                    isSelecting={isDragSelecting}
                />
                <Overlay />
                <PanOverlay
                    clampPosition={(position: { x: number; y: number }) =>
                        clampPosition(position, scale)
                    }
                />
            </div>
        </HotkeysArea>
    );
});
