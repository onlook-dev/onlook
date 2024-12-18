import React from 'react';
import { BaseRect } from './BaseRect';
import type { RectDimensions } from './BaseRect';

interface InsertRectProps {
    rect: RectDimensions | null;
}

export const InsertRect: React.FC<InsertRectProps> = ({ rect }) => {
    if (!rect) {
        return null;
    }
    return <BaseRect {...rect} />;
};
