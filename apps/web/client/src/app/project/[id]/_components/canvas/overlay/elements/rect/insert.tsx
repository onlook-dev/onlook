import type { RectDimensions } from '@onlook/models/editor';
import React from 'react';
import { BaseRect } from './base';

interface InsertRectProps {
    rect: RectDimensions | null;
}

export const InsertRect: React.FC<InsertRectProps> = ({ rect }) => {
    if (!rect) {
        return null;
    }
    return <BaseRect {...rect} />;
};
