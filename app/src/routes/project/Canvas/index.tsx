import { EditorMode } from '@/lib/models';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { useEditorEngine } from '..';
import HotkeysArea from './HotkeysArea';
import PanOverlay from './PanOverlay';

const Canvas = ({ children }: { children: ReactNode }) => {
    const ZOOM_SENSITIVITY = 0.006;
    const PAN_SENSITIVITY = 0.52;
    const DEFAULT_SCALE = 0.6;

    const editorEngine = useEditorEngine();
    const containerRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 300, y: 50 });
    const [isPanning, setIsPanning] = useState(false);
    const [scale, setScale] = useState(DEFAULT_SCALE);

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
        const deltaX = (x - position.x) * zoomFactor;
        const deltaY = (y - position.y) * zoomFactor;

        setScale(newScale);
        setPosition((prevPosition) => ({
            x: prevPosition.x - deltaX,
            y: prevPosition.y - deltaY,
        }));
    };

    const handlePan = (event: WheelEvent) => {
        const deltaX = (event.deltaX + (event.shiftKey ? event.deltaY : 0)) * PAN_SENSITIVITY;
        const deltaY = (event.shiftKey ? 0 : event.deltaY) * PAN_SENSITIVITY;
        setPosition((prevPosition) => ({
            x: prevPosition.x - deltaX,
            y: prevPosition.y - deltaY,
        }));
    };

    const handleCanvasClicked = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target !== containerRef.current) {
            return;
        }
        editorEngine.webviews.deselectAll();
        editorEngine.webviews.notify();
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

    useEffect(() => {
        editorEngine.scale = scale;
    }, [position, scale]);

    return (
        <HotkeysArea scale={scale} setScale={setScale} DEFAULT_SCALE={DEFAULT_SCALE}>
            <div
                ref={containerRef}
                className="overflow-hidden bg-bg flex flex-grow relative"
                onClick={handleCanvasClicked}
            >
                <div
                    style={{
                        transition: 'transform ease',
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transformOrigin: '0 0',
                    }}
                >
                    {children}
                </div>
                <PanOverlay
                    setPosition={setPosition}
                    isPanning={isPanning}
                    setIsPanning={setIsPanning}
                />
            </div>
        </HotkeysArea>
    );
};

export default Canvas;
