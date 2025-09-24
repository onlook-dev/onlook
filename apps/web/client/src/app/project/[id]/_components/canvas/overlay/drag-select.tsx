'use client';

import { observer } from 'mobx-react-lite';

import { colors } from '@onlook/ui/tokens';

interface DragSelectOverlayProps {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    isSelecting: boolean;
}

export const DragSelectOverlay = observer(
    ({ startX, startY, endX, endY, isSelecting }: DragSelectOverlayProps) => {
        if (!isSelecting) {
            return null;
        }

        const left = Math.min(startX, endX);
        const top = Math.min(startY, endY);
        const width = Math.abs(endX - startX);
        const height = Math.abs(endY - startY);

        return (
            <div
                className="pointer-events-none absolute"
                style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                    border: `1px solid ${colors.teal[300]}`,
                    backgroundColor: `${colors.teal[300]}1A`, // 10% opacity (1A in hex)
                }}
            />
        );
    },
);
