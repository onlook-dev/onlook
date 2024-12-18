import { colors } from '@onlook/ui/tokens';
import React from 'react';

interface ResizeHandleProps {
    x: number;
    y: number;
    type: 'corner' | 'edge' | 'radius';
    position:
        | 'top'
        | 'right'
        | 'bottom'
        | 'left'
        | 'top-left'
        | 'top-right'
        | 'bottom-right'
        | 'bottom-left';
}

const getCursorStyle = (
    type: ResizeHandleProps['type'],
    position: ResizeHandleProps['position'],
): string => {
    if (type === 'radius') {
        return 'pointer';
    }

    switch (position) {
        case 'top':
        case 'bottom':
            return 'ns-resize';
        case 'left':
        case 'right':
            return 'ew-resize';
        case 'top-left':
        case 'bottom-right':
            return 'nwse-resize';
        case 'top-right':
        case 'bottom-left':
            return 'nesw-resize';
        default:
            return 'pointer';
    }
};

const ResizeHandle: React.FC<ResizeHandleProps> = ({ x, y, type, position }) => {
    const size = 8;
    const halfSize = size / 2;

    return (
        <g transform={`translate(${x - halfSize}, ${y - halfSize})`}>
            <circle
                cx={halfSize}
                cy={halfSize}
                r={halfSize}
                fill="white"
                stroke={colors.purple[500]}
                strokeWidth={1}
                style={{ cursor: getCursorStyle(type, position) }}
            />
            {type === 'radius' && (
                <circle cx={halfSize} cy={halfSize} r={1.5} fill={colors.purple[500]} />
            )}
        </g>
    );
};

interface ResizeHandlesProps {
    width: number;
    height: number;
    isComponent?: boolean;
}

export const ResizeHandles: React.FC<ResizeHandlesProps> = ({ width, height, isComponent }) => {
    const handleColor = isComponent ? colors.purple[500] : colors.red[500];

    return (
        <>
            {/* Corner handles */}
            <ResizeHandle x={0} y={0} type="corner" position="top-left" />
            <ResizeHandle x={width} y={0} type="corner" position="top-right" />
            <ResizeHandle x={width} y={height} type="corner" position="bottom-right" />
            <ResizeHandle x={0} y={height} type="corner" position="bottom-left" />

            {/* Edge handles */}
            <ResizeHandle x={width / 2} y={0} type="edge" position="top" />
            <ResizeHandle x={width} y={height / 2} type="edge" position="right" />
            <ResizeHandle x={width / 2} y={height} type="edge" position="bottom" />
            <ResizeHandle x={0} y={height / 2} type="edge" position="left" />

            {/* Radius handle (top-left inset) */}
            <ResizeHandle x={20} y={20} type="radius" position="top-left" />
        </>
    );
};
