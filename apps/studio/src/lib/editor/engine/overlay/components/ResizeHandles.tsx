import { colors } from '@onlook/ui/tokens';
import React from 'react';

interface ResizeHandleProps {
    x: number;
    y: number;
    color: string;
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

interface BaseHandleProps {
    x: number;
    y: number;
    color: string;
    position: ResizeHandleProps['position'];
}

const EdgeHandle: React.FC<BaseHandleProps> = ({ x, y, position, color }) => {
    const size = 8;
    const halfSize = size / 2;
    const isVertical = position === 'left' || position === 'right';

    return (
        <rect
            x={isVertical ? x - halfSize : 0}
            y={isVertical ? 0 : y - halfSize}
            width={isVertical ? size : '100%'}
            height={isVertical ? '100%' : size}
            fill="transparent"
            style={{ cursor: getCursorStyle('edge', position), pointerEvents: 'auto' }}
        />
    );
};

const CornerHandle: React.FC<BaseHandleProps> = ({ x, y, position, color }) => {
    const size = 8;
    const halfSize = size / 2;
    const hitAreaSize = 20;
    const hitAreaHalfSize = hitAreaSize / 2;

    return (
        <g
            style={{ pointerEvents: 'auto' }}
            transform={`translate(${x - halfSize}, ${y - halfSize})`}
        >
            {/* Invisible larger circle for hit area */}
            <circle
                cx={halfSize}
                cy={halfSize}
                r={hitAreaHalfSize}
                fill="transparent"
                style={{ cursor: getCursorStyle('corner', position) }}
            />
            {/* Visible handle */}
            <circle
                cx={halfSize}
                cy={halfSize}
                r={halfSize}
                fill="white"
                stroke={color}
                strokeWidth={1}
                style={{ cursor: getCursorStyle('corner', position) }}
            />
        </g>
    );
};

const RadiusHandle: React.FC<BaseHandleProps> = ({ x, y, position, color }) => {
    const size = 8;
    const halfSize = size / 2;

    return (
        <g
            style={{ pointerEvents: 'auto' }}
            transform={`translate(${x - halfSize}, ${y - halfSize})`}
        >
            <circle
                cx={halfSize}
                cy={halfSize}
                r={halfSize}
                fill="white"
                stroke={color}
                strokeWidth={1}
                style={{ cursor: getCursorStyle('radius', position) }}
            />
            <circle cx={halfSize} cy={halfSize} r={1.5} fill={color} />
        </g>
    );
};

interface ResizeHandlesProps {
    width: number;
    height: number;
    isComponent?: boolean;
}

export const ResizeHandles: React.FC<ResizeHandlesProps> = ({ width, height, isComponent }) => {
    const color = isComponent ? colors.purple[500] : colors.red[500];

    // Calculate radius handle position (20px or 25% of width/height, whichever is smaller)
    const radiusOffset = Math.min(20, width * 0.25, height * 0.25);
    const showRadius = width >= 10 && height >= 10;

    return (
        <>
            {/* Edge handles */}
            <EdgeHandle color={color} x={width / 2} y={0} position="top" />
            <EdgeHandle color={color} x={width} y={height / 2} position="right" />
            <EdgeHandle color={color} x={width / 2} y={height} position="bottom" />
            <EdgeHandle color={color} x={0} y={height / 2} position="left" />

            {/* Corner handles */}
            <CornerHandle color={color} x={0} y={0} position="top-left" />
            <CornerHandle color={color} x={width} y={0} position="top-right" />
            <CornerHandle color={color} x={width} y={height} position="bottom-right" />
            <CornerHandle color={color} x={0} y={height} position="bottom-left" />

            {showRadius && (
                <RadiusHandle color={color} x={radiusOffset} y={radiusOffset} position="top-left" />
            )}
        </>
    );
};
