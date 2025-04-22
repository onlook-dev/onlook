import { cn } from '@onlook/ui/utils';
import React, { useCallback, useEffect, useRef, useState } from 'react';

export function useResizable({
    defaultWidth = 240,
    minWidth = 200,
    maxWidth = 600,
    side = 'left',
    forceWidth,
}: {
    defaultWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    side?: 'left' | 'right';
    forceWidth?: number;
}) {
    const [width, setWidth] = useState(defaultWidth);
    const [isAnimating, setIsAnimating] = useState(false);
    const isDragging = useRef(false);
    const startPos = useRef(0);
    const startWidth = useRef(0);

    // Effect to handle forced width changes
    useEffect(() => {
        if (forceWidth !== undefined) {
            setIsAnimating(true);
            setWidth(forceWidth);
            // Reset animating after transition completes
            const timer = setTimeout(() => setIsAnimating(false), 300);
            return () => clearTimeout(timer);
        }
    }, [forceWidth]);

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
            if (!isDragging.current) return;

            const delta = e.clientX - startPos.current;
            let newWidth =
                side === 'left' ? startWidth.current + delta : startWidth.current - delta;
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

    return { width, handleMouseDown, isAnimating };
}

// Simplified component using the hook
interface ResizablePanelProps {
    children: React.ReactNode;
    side?: 'left' | 'right';
    defaultWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    forceWidth?: number;
    className?: string;
    [key: string]: any;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
    children,
    side = 'left',
    defaultWidth = 240,
    minWidth = 200,
    maxWidth = 600,
    forceWidth,
    className,
    ...props
}) => {
    const { width, handleMouseDown, isAnimating } = useResizable({
        defaultWidth,
        minWidth,
        maxWidth,
        side,
        forceWidth,
    });

    return (
        <div
            style={{ width: `${width}px` }}
            className={cn(
                'h-full relative',
                isAnimating && 'transition-[width] duration-300 ease-in-out',
                side === 'left' ? 'left-0' : 'right-0',
                className,
            )}
            {...props}
        >
            <div className="h-full">{children}</div>
            <div
                className={cn(
                    'absolute top-0 h-full w-1 cursor-col-resize transition-all',
                    side === 'left' ? 'right-0' : 'left-0',
                )}
                onMouseDown={handleMouseDown}
            />
        </div>
    );
};
