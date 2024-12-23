import { useEditorEngine } from '@/components/Context';
import { EditorMode } from '@/lib/models';
import { observer } from 'mobx-react-lite';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import HotkeysArea from './Hotkeys';
import Overlay from './Overlay';
import PanOverlay from './PanOverlay';

const Canvas = observer(
    ({
        children,
        scale,
        position,
        onPositionChange,
        onScaleChange,
    }: {
        children: ReactNode;
        scale: number;
        position: { x: number; y: number };
        onPositionChange: (position: any) => void;
        onScaleChange: (scale: number) => void;
    }) => {
        const ZOOM_SENSITIVITY = 0.006;
        const PAN_SENSITIVITY = 0.52;
        const MIN_ZOOM = 0.1;
        const MAX_ZOOM = 3;
        const MAX_X = 10000;
        const MAX_Y = 10000;
        const MIN_X = -5000;
        const MIN_Y = -5000;

        const editorEngine = useEditorEngine();
        const containerRef = useRef<HTMLDivElement>(null);
        const [isPanning, setIsPanning] = useState(false);

        const handleWheel = (event: WheelEvent) => {
            if (event.ctrlKey || event.metaKey) {
                handleZoom(event);
            } else {
                handlePan(event);
            }
        };

        const handleZoom = (event: WheelEvent) => {
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

            onScaleChange(lintedScale);

            if (newScale < MIN_ZOOM || newScale > MAX_ZOOM) {
                return;
            }
            onPositionChange((prevPosition: { x: number; y: number }) =>
                clampPosition(
                    {
                        x: prevPosition.x - deltaX,
                        y: prevPosition.y - deltaY,
                    },
                    scale,
                ),
            );
        };

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

        const handlePan = (event: WheelEvent) => {
            const deltaX = (event.deltaX + (event.shiftKey ? event.deltaY : 0)) * PAN_SENSITIVITY;
            const deltaY = (event.shiftKey ? 0 : event.deltaY) * PAN_SENSITIVITY;
            onPositionChange((prevPosition: { x: number; y: number }) =>
                clampPosition(
                    {
                        x: prevPosition.x - deltaX,
                        y: prevPosition.y - deltaY,
                    },
                    scale,
                ),
            );
        };

        const handleCanvasClicked = (event: React.MouseEvent<HTMLDivElement>) => {
            if (event.target !== containerRef.current) {
                return;
            }
            editorEngine.webviews.deselectAll();
            editorEngine.clear();
        };

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
                };
            }
        }, [handleWheel]);

        const middleMouseButtonDown = (e: MouseEvent) => {
            if (e.button === 1) {
                editorEngine.mode = EditorMode.PAN;
                setIsPanning(true);
                e.preventDefault();
                e.stopPropagation();
            }
        };

        const middleMouseButtonUp = (e: MouseEvent) => {
            if (e.button === 1) {
                editorEngine.mode = EditorMode.DESIGN;
                setIsPanning(false);
                e.preventDefault();
                e.stopPropagation();
            }
        };

        return (
            <HotkeysArea scale={scale} setScale={onScaleChange} setPosition={onPositionChange}>
                <div
                    ref={containerRef}
                    className="overflow-hidden bg-background-onlook flex flex-grow relative"
                    onClick={handleCanvasClicked}
                >
                    <Overlay>
                        <div
                            id="canvas-container"
                            style={{
                                transition: 'transform ease',
                                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                                transformOrigin: '0 0',
                            }}
                        >
                            {children}
                        </div>
                    </Overlay>
                    <PanOverlay
                        setPosition={onPositionChange}
                        clampPosition={(position) => clampPosition(position, scale)}
                        isPanning={isPanning}
                        setIsPanning={setIsPanning}
                    />
                </div>
            </HotkeysArea>
        );
    },
);

export default Canvas;
