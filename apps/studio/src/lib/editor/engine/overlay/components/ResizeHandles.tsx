import { colors } from '@onlook/ui/tokens';
import React from 'react';

interface ResizeHandleProps {
    x: number;
    y: number;
    type: 'corner' | 'edge' | 'radius';
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ x, y, type }) => {
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
                style={{ cursor: type === 'radius' ? 'pointer' : 'nw-resize' }}
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
            <ResizeHandle x={0} y={0} type="corner" />
            <ResizeHandle x={width} y={0} type="corner" />
            <ResizeHandle x={width} y={height} type="corner" />
            <ResizeHandle x={0} y={height} type="corner" />

            {/* Edge handles */}
            <ResizeHandle x={width / 2} y={0} type="edge" />
            <ResizeHandle x={width} y={height / 2} type="edge" />
            <ResizeHandle x={width / 2} y={height} type="edge" />
            <ResizeHandle x={0} y={height / 2} type="edge" />

            {/* Radius handle (top-left inset) */}
            <ResizeHandle x={20} y={20} type="radius" />
        </>
    );
};
