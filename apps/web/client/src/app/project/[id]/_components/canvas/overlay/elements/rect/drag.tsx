import type { RectDimensions } from '@onlook/models';
import React from 'react';
import { BaseRect } from './base';

interface DragElementProps {
    rect: RectDimensions;
    styles: Record<string, string>;
    isComponent?: boolean;
}

export const DragElement: React.FC<DragElementProps> = ({ rect, styles, isComponent }) => {
    // Create style object for the drag element
    const customStyles = {
        opacity: styles.backgroundColor ? '0.7' : '0.5',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.05s ease-out',
    };

    // Get cursor position from the styles
    const cursorX = parseFloat(styles.cursorX ?? rect.left.toString());
    const cursorY = parseFloat(styles.cursorY ?? rect.top.toString());

    return (
        <>
            {/* Dragged element outline */}
            <div
                style={{
                    position: 'absolute',
                    top: `${rect.top}px`,
                    left: `${rect.left}px`,
                    width: `${rect.width}px`,
                    height: `${rect.height}px`,
                    background: styles.backgroundColor ?? 'rgba(51, 153, 255, 0.3)',
                    border: '2px solid rgba(51, 153, 255, 0.8)',
                    borderRadius: '3px',
                    pointerEvents: 'none',
                    ...customStyles
                }}
            />
            
            {/* Cursor position indicator - exactly at mouse position */}
            <div
                style={{
                    position: 'absolute',
                    top: `${cursorY}px`,
                    left: `${cursorX}px`,
                    width: '12px',
                    height: '12px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: '2px solid rgba(0, 120, 255, 1)',
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    boxShadow: '0 0 4px rgba(0, 0, 0, 0.5)',
                    zIndex: 1001
                }}
            />
        </>
    );
};

// Memoized version for better performance
export const MemoizedDragElement = React.memo(DragElement); 