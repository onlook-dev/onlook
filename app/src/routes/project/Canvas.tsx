import { ReactNode, useEffect, useRef, useState } from 'react';
import { useEditorEngine } from '.';

function Canvas({ children }: { children: ReactNode }) {
    const [position, setPosition] = useState({ x: 20, y: 20 });
    const [scale, setScale] = useState(0.5);

    const editor = useEditorEngine();
    const containerRef = useRef<HTMLDivElement>(null);
    const zoomSensitivity = 0.006;
    const panSensitivity = 0.52;

    const handleWheel = (event: WheelEvent) => {
        if (event.ctrlKey) {
            handleZoom(event);
        } else {
            handlePan(event);
        }
    };

    const handleZoom = (event: WheelEvent) => {
        if (!containerRef.current) return;
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
        const deltaX = (event.deltaX + (event.shiftKey ? event.deltaY : 0)) * panSensitivity; // Apply pan sensitivity
        const deltaY = (event.shiftKey ? 0 : event.deltaY) * panSensitivity;
        setPosition((prevPosition) => ({
            x: prevPosition.x - deltaX,
            y: prevPosition.y - deltaY,
        }));
    };

    const canvasClicked = (event: React.MouseEvent<HTMLDivElement>) => {
        editor.webviews.deselectAll();
        editor.webviews.notify();
        editor.clear();
    };

    useEffect(() => {
        const div = containerRef.current;
        if (div) {
            div.addEventListener('wheel', handleWheel, { passive: false });
            return () => div.removeEventListener('wheel', handleWheel);
        }
    }, [handleWheel]);

    return (
        <div ref={containerRef} className="overflow-hidden bg-stone-800" onClick={canvasClicked}>
            <div
                style={{
                    transition: 'transform ease',
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transformOrigin: '0 0',
                }}
            >
                {children}
            </div>
        </div>
    );
}

export default Canvas;
