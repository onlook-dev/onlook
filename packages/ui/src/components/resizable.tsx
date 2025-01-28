import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ResizablePanelProps {
    children: React.ReactNode;
    side?: 'left' | 'right';
    defaultWidth?: number;
    minWidth?: number;
    maxWidth?: number;
}

const ResizablePanel: React.FC<ResizablePanelProps> = ({
    children,
    side = 'left',
    defaultWidth = 240,
    minWidth = 200,
    maxWidth = 600,
}) => {
    const [width, setWidth] = useState(defaultWidth);
    const panelRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const startPos = useRef(0);
    const startWidth = useRef(0);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            isDragging.current = true;
            startPos.current = e.clientX;
            startWidth.current = width;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        },
        [width],
    );

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isDragging.current) {
                return;
            }

            const delta = e.clientX - startPos.current;
            let newWidth =
                side === 'left' ? startWidth.current + delta : startWidth.current - delta;

            // Constrain width between min and max
            newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
            setWidth(newWidth);
        },
        [side, minWidth, maxWidth],
    );

    const handleMouseUp = useCallback(() => {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    return (
        <div
            ref={panelRef}
            style={{ width: `${width}px` }}
            className={`h-full relative ${side === 'left' ? 'left-0' : 'right-0'}`}
        >
            <div className="h-full">{children}</div>
            <div
                className={`absolute top-0 ${side === 'left' ? 'right-0' : 'left-0'} h-full w-1 cursor-col-resize transition-all`}
                onMouseDown={handleMouseDown}
            />
        </div>
    );
};

export default ResizablePanel;
