'use client';

import { observer } from 'mobx-react-lite';

interface DragSelectOverlayProps {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    isSelecting: boolean;
}

export const DragSelectOverlay = observer(({ startX, startY, endX, endY, isSelecting }: DragSelectOverlayProps) => {
    if (!isSelecting) {
        return null;
    }

    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    return (
        <div
            className="absolute border border-blue-500 bg-blue-500/10 pointer-events-none"
            style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${width}px`,
                height: `${height}px`,
            }}
        />
    );
});