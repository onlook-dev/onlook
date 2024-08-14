import { EditorMode } from '@/lib/models';
import { isMetaKey } from '@/lib/utils';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useEditorEngine } from '..';
import PanOverlay from './PanOverlay';

const Canvas = ({ children }: { children: ReactNode }) => {
    const [position, setPosition] = useState({ x: 300, y: 50 });
    const [scale, setScale] = useState(0.6);
    const [isPanning, setIsPanning] = useState(false);

    const editorEngine = useEditorEngine();
    const containerRef = useRef<HTMLDivElement>(null);
    const zoomSensitivity = 0.006;
    const panSensitivity = 0.52;

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
        const zoomFactor = -event.deltaY * zoomSensitivity;
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
        const deltaX = (event.deltaX + (event.shiftKey ? event.deltaY : 0)) * panSensitivity;
        const deltaY = (event.shiftKey ? 0 : event.deltaY) * panSensitivity;
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

    const handleZoomShortcut = (event: KeyboardEvent) => {
        if (!isMetaKey(event)) {
            return;
        }
        let shouldPreventDefault = true;
        switch (event.key) {
            case '0':
                setScale(1);
                break;
            case '=':
                setScale(scale * 1.2);
                break;
            case '-':
                setScale(scale * 0.8);
                break;
            default:
                shouldPreventDefault = false;
        }

        if (shouldPreventDefault) {
            event.preventDefault();
        }
    };

    const spaceBarDown = (e: KeyboardEvent) => {
        if (e.key === ' ') {
            editorEngine.mode = EditorMode.PAN;
        }
    };

    const spaceBarUp = useCallback((e: KeyboardEvent) => {
        if (e.key === ' ') {
            editorEngine.mode = EditorMode.DESIGN;
        }
    }, []);

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
        window.addEventListener('keydown', handleZoomShortcut);
        window.addEventListener('keydown', spaceBarDown);
        window.addEventListener('keyup', spaceBarUp);
        return () => {
            window.removeEventListener('keydown', handleZoomShortcut);
            window.removeEventListener('keydown', spaceBarDown);
            window.removeEventListener('keyup', spaceBarUp);
        };
    }, [handleZoomShortcut]);

    useEffect(() => {
        editorEngine.scale = scale;
    }, [position, scale]);

    return (
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
    );
};

export default Canvas;
