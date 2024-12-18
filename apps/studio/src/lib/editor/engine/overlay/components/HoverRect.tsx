import React from 'react';
import type { RectDimensions } from './BaseRect';
import { BaseRect } from './BaseRect';

interface HoverRectProps {
    rect: RectDimensions | null;
    isComponent?: boolean;
}

export const HoverRect: React.FC<HoverRectProps> = ({ rect, isComponent }) => {
    if (!rect) {
        return null;
    }
    return <BaseRect {...rect} isComponent={isComponent} strokeWidth={1} />;
};
