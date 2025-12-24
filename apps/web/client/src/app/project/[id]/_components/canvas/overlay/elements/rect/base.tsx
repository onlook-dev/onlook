import { EditorAttributes } from '@onlook/constants';
import type { RectDimensions } from '@onlook/models';
import { colors } from '@onlook/ui/tokens';
import React from 'react';

export interface RectProps extends RectDimensions {
    isComponent?: boolean;
    className?: string;
    children?: React.ReactNode;
    strokeWidth?: number;
}

export const BaseRect: React.FC<RectProps> = ({
    width,
    height,
    top,
    left,
    isComponent,
    className,
    children,
    strokeWidth = 2,
}) => {
    if (width === undefined || height === undefined || top === undefined || left === undefined) {
        return null;
    }

    return (
        <div
            style={{
                position: 'absolute',
                top: `${top}px`,
                left: `${left}px`,
                pointerEvents: 'none',
            }}
            className={className}
            data-onlook-ignore="true"
            id={EditorAttributes.ONLOOK_RECT_ID}
        >
            <svg
                overflow="visible"
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
            >
                <rect
                    width={width}
                    height={height}
                    fill="none"
                    stroke={isComponent ? colors.purple[500] : colors.red[500]}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                {children}
            </svg>
        </div>
    );
};
