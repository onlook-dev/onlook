import type { RectDimensions } from '@/lib/editor/engine/overlay/rect';
import React from 'react';

interface InsertRectProps {
    rect: RectDimensions | null;
}

export const InsertRect: React.FC<InsertRectProps> = ({ rect }) => {
    if (!rect) {
        return null;
    }
    return (
        <div
            style={{
                position: 'absolute',
                top: `${rect.top}px`,
                left: `${rect.left}px`,
                pointerEvents: 'none',
            }}
        >
            <svg
                overflow="visible"
                width={rect.width}
                height={rect.height}
                viewBox={`0 0 ${rect.width} ${rect.height}`}
            >
                <rect
                    width={rect.width}
                    height={rect.height}
                    fill="none"
                    stroke="purple"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </div>
    );
};
