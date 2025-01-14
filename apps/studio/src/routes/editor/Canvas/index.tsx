import { useEditorEngine } from '@/components/Context';
import { EditorMode } from '@/lib/models';
import { EditorAttributes } from '@onlook/models/constants';
import { observer } from 'mobx-react-lite';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import HotkeysArea from './Hotkeys';
import Overlay from './Overlay';
import PanOverlay from './PanOverlay';

const Canvas = observer(({ children }: { children: ReactNode }) => {
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
    const scale = editorEngine.canvas.scale;
    const position = editorEngine.canvas.position;

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

        editorEngine.canvas.scale = lintedScale;

        if (newScale < MIN_ZOOM || newScale > MAX_ZOOM) {
            return;
        }
        const newPosition = clampPosition(
            {
                x: position.x - deltaX,
                y: position.y - deltaY,
            },
            lintedScale,
        );
        editorEngine.canvas.position = newPosition;
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

        const newPosition = clampPosition(
            {
                x: position.x - deltaX,
                y: position.y - deltaY,
            },
            scale,
        );
        editorEngine.canvas.position = newPosition;
    };

    const handleCanvasMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
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
        <HotkeysArea>
            <div
                ref={containerRef}
                className="overflow-hidden bg-background-onlook flex flex-grow relative"
                onMouseDown={handleCanvasMouseDown}
            >
                <Overlay>
                    <div
                        id={EditorAttributes.CANVAS_CONTAINER_ID}
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
                    clampPosition={(position) => clampPosition(position, scale)}
                    isPanning={isPanning}
                    setIsPanning={setIsPanning}
                />
            </div>
        </HotkeysArea>
    );
});

export default Canvas;
